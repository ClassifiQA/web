import { Client, TablesDB } from "node-appwrite"
import { loadGovernmentMembers } from "./government.js"
import { loadDeputies } from "./parliament.js"
import { syncSource } from "./sync.js"

const DATABASE_ID = "6a6272e50037ef590f10"
const TABLE_ID = "govt-members"

function isDryRun(req) {
  return req.bodyJson?.dryRun === true || req.query?.dryRun === "true"
}

export default async ({ req, res, log, error }) => {
  try {
    const dryRun = isDryRun(req)
    const [governmentMembers, deputies] = await Promise.all([
      loadGovernmentMembers(),
      loadDeputies(),
    ])

    log(
      `Fetched ${governmentMembers.length} Government members and ${deputies.length} deputies`,
    )

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers["x-appwrite-key"])
    const tablesDB = new TablesDB(client)

    const results = []
    for (const members of [governmentMembers, deputies]) {
      results.push(
        await syncSource({
          tablesDB,
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          members,
          dryRun,
        }),
      )
    }

    for (const result of results) {
      log(`${result.source}: ${JSON.stringify(result)}`)
    }

    return res.json({
      ok: true,
      dryRun,
      fetched: {
        government: governmentMembers.length,
        deputies: deputies.length,
      },
      results,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    error(cause instanceof Error ? cause.stack ?? message : message)
    return res.json({ ok: false, error: message }, 500)
  }
}
