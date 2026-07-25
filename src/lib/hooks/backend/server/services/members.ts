import {
  CLASSIFIQA_DATABASE_ID,
  MEMBERS_TABLE_ID,
  type Member,
} from "@/lib/data/members"
import { createServerAppwrite } from "@/lib/hooks/backend/server/appwrite"
import { AppwriteException, Query, type Models } from "node-appwrite"

type MemberRow = Models.Row & Omit<Member, keyof Models.Row>

const MEMBER_SELECTION = [
  "$id",
  "$createdAt",
  "$updatedAt",
  "name",
  "position",
  "party",
  "party_name",
  "image_url",
  "active",
  "source",
  "external_id",
  "source_updated_at",
]

const PAGE_SIZE = 100

const toMember = (row: MemberRow): Member => ({
  $id: row.$id,
  $createdAt: row.$createdAt,
  $updatedAt: row.$updatedAt,
  name: row.name,
  position: row.position.replace(/\u2014/g, "-"),
  party: row.party ?? null,
  party_name: row.party_name ?? null,
  image_url: row.image_url ?? null,
  active: row.active,
  source: row.source,
  external_id: row.external_id,
  source_updated_at: row.source_updated_at ?? null,
})

export const createServerMembers = () => {
  const { tablesDb } = createServerAppwrite()

  const listActiveMembers = async (limit?: number) => {
    const members: Member[] = []
    let cursor: string | undefined

    do {
      const remaining =
        typeof limit === "number"
          ? Math.max(limit - members.length, 0)
          : PAGE_SIZE

      if (remaining === 0) break

      const pageLimit = Math.min(PAGE_SIZE, remaining)
      const result = await tablesDb.listRows<MemberRow>({
        databaseId: CLASSIFIQA_DATABASE_ID,
        tableId: MEMBERS_TABLE_ID,
        queries: [
          Query.equal("active", true),
          Query.orderAsc("$id"),
          Query.limit(pageLimit),
          Query.select(MEMBER_SELECTION),
          ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ],
      })

      members.push(...result.rows.map(toMember))
      cursor =
        result.rows.length === pageLimit ? result.rows.at(-1)?.$id : undefined
    } while (cursor && (limit === undefined || members.length < limit))

    return members
  }

  const getMember = async (memberId: string) => {
    try {
      const row = await tablesDb.getRow<MemberRow>({
        databaseId: CLASSIFIQA_DATABASE_ID,
        tableId: MEMBERS_TABLE_ID,
        rowId: memberId,
        queries: [Query.select(MEMBER_SELECTION)],
      })

      return row.active ? toMember(row) : null
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 404) {
        return null
      }

      throw error
    }
  }

  const listFeaturedGovernmentMembers = async (limit = 3) => {
    const result = await tablesDb.listRows<MemberRow>({
      databaseId: CLASSIFIQA_DATABASE_ID,
      tableId: MEMBERS_TABLE_ID,
      queries: [
        Query.equal("active", true),
        Query.equal("source", "governo-portugal"),
        Query.limit(30),
        Query.select(MEMBER_SELECTION),
      ],
    })
    const members = result.rows
      .map(toMember)
      .filter((member) => Boolean(member.image_url))

    for (let index = members.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[members[index], members[swapIndex]] = [
        members[swapIndex],
        members[index],
      ]
    }

    return members.slice(0, limit)
  }

  return { getMember, listActiveMembers, listFeaturedGovernmentMembers }
}
