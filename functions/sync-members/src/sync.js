import { createHash } from "node:crypto"
import { ID, Query } from "node-appwrite"

const PAGE_SIZE = 100

function rowId(source, externalId) {
  return createHash("sha256")
    .update(`${source}:${externalId}`)
    .digest("hex")
    .slice(0, 32)
}

async function listSourceRows(tablesDB, databaseId, tableId, source) {
  const rows = []
  let cursor

  do {
    const page = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [
        Query.equal("source", source),
        Query.orderAsc("$id"),
        Query.limit(PAGE_SIZE),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    })

    rows.push(...page.rows)
    cursor = page.rows.length === PAGE_SIZE ? page.rows.at(-1).$id : null
  } while (cursor)

  return rows
}

function rowData(member) {
  return {
    source: member.source,
    external_id: member.external_id,
    name: member.name,
    position: member.position,
    party: member.party,
    party_name: member.party_name,
    image_url: member.image_url,
    active: member.active,
    source_updated_at: member.source_updated_at,
  }
}

function hasChanged(row, member) {
  const data = rowData(member)
  return Object.entries(data).some(([key, value]) => {
    if (value === null) {
      return row[key] != null
    }

    if (key === "source_updated_at") {
      return new Date(row[key]).getTime() !== new Date(value).getTime()
    }

    return row[key] !== value
  })
}

export async function syncSource({
  tablesDB,
  databaseId,
  tableId,
  members,
  dryRun = false,
}) {
  const source = members[0]?.source

  if (!source || members.some((member) => member.source !== source)) {
    throw new Error("A sync batch must contain exactly one source")
  }

  const existing = await listSourceRows(tablesDB, databaseId, tableId, source)
  const existingByExternalId = new Map(
    existing.map((row) => [row.external_id, row])
  )
  const incomingIds = new Set(members.map((member) => member.external_id))
  const result = {
    source,
    created: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
  }

  for (const member of members) {
    const row = existingByExternalId.get(member.external_id)

    if (!row) {
      result.created += 1

      if (!dryRun) {
        await tablesDB.createRow({
          databaseId,
          tableId,
          rowId: rowId(member.source, member.external_id) || ID.unique(),
          data: rowData(member),
        })
      }

      continue
    }

    if (!hasChanged(row, member)) {
      result.unchanged += 1
      continue
    }

    result.updated += 1

    if (!dryRun) {
      await tablesDB.updateRow({
        databaseId,
        tableId,
        rowId: row.$id,
        data: rowData(member),
      })
    }
  }

  for (const row of existing) {
    if (incomingIds.has(row.external_id) || row.active === false) {
      continue
    }

    result.deactivated += 1

    if (!dryRun) {
      await tablesDB.updateRow({
        databaseId,
        tableId,
        rowId: row.$id,
        data: {
          active: false,
          source_updated_at: new Date().toISOString(),
        },
      })
    }
  }

  return result
}
