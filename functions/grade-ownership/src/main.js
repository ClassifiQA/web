import { AppwriteException, Client, ID, Query, TablesDB } from "node-appwrite"

const DATABASE_ID = "6a6272e50037ef590f10"
const GRADES_TABLE_ID = "grades"
const OWNERSHIP_TABLE_ID = "grade-ownerships"
const APPWRITE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/
const MAX_COMMENT_LENGTH = 1000

const createClient = () =>
  new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)

const toCurrentGrade = (grade) => ({
  $createdAt: grade.$createdAt,
  grade: grade.grade,
  comment: grade.comment ?? null,
})

const findCurrentGrade = async (tablesDB, userId, memberId) => {
  const ownerships = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OWNERSHIP_TABLE_ID,
    queries: [
      Query.equal("user_id", userId),
      Query.equal("member_id", memberId),
      Query.limit(1),
      Query.select(["grade_id"]),
    ],
    total: false,
  })
  const ownership = ownerships.rows[0]
  if (!ownership) return null

  const grade = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: GRADES_TABLE_ID,
    rowId: ownership.grade_id,
    queries: [Query.select(["$createdAt", "grade", "comment"])],
  })

  return toCurrentGrade(grade)
}

const createGrade = async ({ tablesDB, userId, memberId, grade, comment }) => {
  const transaction = await tablesDB.createTransaction({ ttl: 60 })
  const gradeId = ID.unique()

  try {
    await tablesDB.createOperations({
      transactionId: transaction.$id,
      operations: [
        {
          action: "create",
          databaseId: DATABASE_ID,
          tableId: OWNERSHIP_TABLE_ID,
          rowId: ID.unique(),
          data: {
            user_id: userId,
            member_id: memberId,
            grade_id: gradeId,
          },
        },
        {
          action: "create",
          databaseId: DATABASE_ID,
          tableId: GRADES_TABLE_ID,
          rowId: gradeId,
          data: {
            member: memberId,
            grade,
            ...(comment ? { comment } : {}),
          },
        },
      ],
    })
    await tablesDB.updateTransaction({
      transactionId: transaction.$id,
      commit: true,
    })
  } catch (cause) {
    await tablesDB
      .updateTransaction({
        transactionId: transaction.$id,
        rollback: true,
      })
      .catch(() => undefined)
    throw cause
  }

  const created = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: GRADES_TABLE_ID,
    rowId: gradeId,
    queries: [Query.select(["$createdAt", "grade", "comment"])],
  })
  return toCurrentGrade(created)
}

export default async ({ req, res, error }) => {
  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed." }, 405)
  }

  const memberId = req.bodyJson?.memberId
  if (typeof memberId !== "string" || !APPWRITE_ID.test(memberId)) {
    return res.json({ error: "Invalid member." }, 400)
  }

  const userId = req.headers["x-appwrite-user-id"]
  if (typeof userId !== "string" || !APPWRITE_ID.test(userId)) {
    return res.json({ error: "Authentication required." }, 401)
  }

  try {
    const executionKey = req.headers["x-appwrite-key"]
    if (!executionKey) {
      throw new Error("Missing function execution key.")
    }

    const serverClient = createClient().setKey(executionKey)
    const tablesDB = new TablesDB(serverClient)
    const action = req.bodyJson?.action ?? "get"

    if (action === "get") {
      const grade = await findCurrentGrade(tablesDB, userId, memberId)
      return res.json({ hasGrade: Boolean(grade), grade })
    }

    if (action !== "create") {
      return res.json({ error: "Invalid action." }, 400)
    }

    const grade = req.bodyJson?.grade
    const rawComment = req.bodyJson?.comment
    const comment = typeof rawComment === "string" ? rawComment.trim() : ""
    if (
      typeof grade !== "number" ||
      !Number.isFinite(grade) ||
      grade < 0 ||
      grade > 20 ||
      Math.round(grade * 2) !== grade * 2
    ) {
      return res.json({ error: "A nota deve estar entre 0 e 20." }, 400)
    }
    if (comment.length > MAX_COMMENT_LENGTH) {
      return res.json(
        { error: "O comentário não pode exceder 1000 caracteres." },
        400
      )
    }

    const currentGrade = await createGrade({
      tablesDB,
      userId,
      memberId,
      grade,
      comment,
    })
    return res.json({ hasGrade: true, grade: currentGrade }, 201)
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 409) {
      return res.json({ error: "Já classificaste este membro." }, 409)
    }
    if (
      cause instanceof AppwriteException &&
      (cause.code === 400 || cause.code === 404)
    ) {
      error(
        `Grade submission validation failed: ${cause.type}: ${cause.message}`
      )
      return res.json({ error: "Membro inválido." }, 400)
    }

    error("Grade ownership lookup failed.")
    return res.json({ error: "Não foi possível guardar a classificação." }, 503)
  }
}
