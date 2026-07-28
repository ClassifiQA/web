import {
  AppwriteException,
  Client,
  Query,
  TablesDB,
  Users,
} from "node-appwrite"

const DATABASE_ID = "6a6272e50037ef590f10"
const GRADES_TABLE_ID = "grades"
const OWNERSHIP_TABLE_ID = "grade-ownerships"
const REPORTS_TABLE_ID = "content-reports"
const APPWRITE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/

const createClient = () =>
  new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)

const ignoreMissing = (cause) => {
  if (cause instanceof AppwriteException && cause.code === 404) return
  throw cause
}

const eraseGrades = async (tablesDB, userId) => {
  let deleted = 0

  while (true) {
    const ownerships = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: OWNERSHIP_TABLE_ID,
      queries: [
        Query.equal("user_id", userId),
        Query.limit(100),
        Query.select(["$id", "grade_id"]),
      ],
      total: false,
    })
    if (ownerships.rows.length === 0) return deleted

    for (const ownership of ownerships.rows) {
      await tablesDB
        .deleteRow({
          databaseId: DATABASE_ID,
          tableId: GRADES_TABLE_ID,
          rowId: ownership.grade_id,
        })
        .catch(ignoreMissing)
      await tablesDB
        .deleteRow({
          databaseId: DATABASE_ID,
          tableId: OWNERSHIP_TABLE_ID,
          rowId: ownership.$id,
        })
        .catch(ignoreMissing)
      deleted += 1
    }
  }
}

const anonymizeReports = async (tablesDB, userId) => {
  let anonymized = 0

  while (true) {
    const reports = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: REPORTS_TABLE_ID,
      queries: [
        Query.equal("reporter_user_id", userId),
        Query.limit(100),
        Query.select(["$id"]),
      ],
      total: false,
    })
    if (reports.rows.length === 0) return anonymized

    for (const report of reports.rows) {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: REPORTS_TABLE_ID,
        rowId: report.$id,
        data: {
          reporter_user_id: null,
          reporter_name: null,
          reporter_email: null,
        },
      })
      anonymized += 1
    }
  }
}

export default async ({ req, res, error }) => {
  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed." }, 405)
  }
  if (req.bodyJson?.confirmation !== "ELIMINAR") {
    return res.json({ error: "Confirma a eliminação da conta." }, 400)
  }

  const userId = req.headers["x-appwrite-user-id"]
  if (typeof userId !== "string" || !APPWRITE_ID.test(userId)) {
    return res.json({ error: "Authentication required." }, 401)
  }

  try {
    const executionKey = req.headers["x-appwrite-key"]
    if (!executionKey) throw new Error("Missing function execution key.")

    const client = createClient().setKey(executionKey)
    const users = new Users(client)
    await users.get({ userId })

    const tablesDB = new TablesDB(client)
    const deletedGrades = await eraseGrades(tablesDB, userId)
    const anonymizedReports = await anonymizeReports(tablesDB, userId)
    await users.delete({ userId })

    return res.json({
      deleted: true,
      deletedGrades,
      anonymizedReports,
    })
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.type === "user_not_found") {
      return res.json({ error: "Authentication required." }, 401)
    }
    error(
      cause instanceof Error
        ? `Account erasure failed: ${cause.message}`
        : "Account erasure failed."
    )
    return res.json(
      {
        error:
          "Não foi possível concluir a eliminação. Alguns dados associados podem já ter sido apagados; tenta novamente ou contacta o canal jurídico.",
      },
      500
    )
  }
}
