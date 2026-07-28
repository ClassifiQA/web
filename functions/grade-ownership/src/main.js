import {
  AppwriteException,
  Client,
  ID,
  Query,
  TablesDB,
  Users,
} from "node-appwrite"
import {
  DAILY_SUBMISSION_LIMIT,
  createOwnershipRowId,
  getCommentValidationError,
  getRateLimit,
  normalizeComment,
} from "./anti-spam.js"

const DATABASE_ID = "6a6272e50037ef590f10"
const GRADES_TABLE_ID = "grades"
const OWNERSHIP_TABLE_ID = "grade-ownerships"
const MEMBERS_TABLE_ID = "govt-members"
const APPWRITE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/
const DAY_MS = 24 * 60 * 60 * 1000

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

const listRecentSubmissionDates = async (tablesDB, userId, now) => {
  const ownerships = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OWNERSHIP_TABLE_ID,
    queries: [
      Query.equal("user_id", userId),
      Query.greaterThanEqual(
        "$createdAt",
        new Date(now - DAY_MS).toISOString()
      ),
      Query.orderDesc("$createdAt"),
      Query.limit(DAILY_SUBMISSION_LIMIT),
      Query.select(["$createdAt"]),
    ],
    total: false,
  })

  return ownerships.rows.map((ownership) => ownership.$createdAt)
}

const isActiveMember = async (tablesDB, memberId) => {
  const member = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: MEMBERS_TABLE_ID,
    rowId: memberId,
    queries: [Query.select(["active"])],
  })
  return member.active === true
}

const createGrade = async ({
  tablesDB,
  userId,
  memberId,
  grade,
  comment,
  now,
}) => {
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
          rowId: createOwnershipRowId(userId, now),
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

  let tablesDB

  try {
    const executionKey = req.headers["x-appwrite-key"]
    if (!executionKey) {
      throw new Error("Missing function execution key.")
    }

    const serverClient = createClient().setKey(executionKey)
    tablesDB = new TablesDB(serverClient)
    const action = req.bodyJson?.action ?? "get"

    if (action === "get") {
      const grade = await findCurrentGrade(tablesDB, userId, memberId)
      return res.json({ hasGrade: Boolean(grade), grade })
    }

    if (action !== "create") {
      return res.json({ error: "Invalid action." }, 400)
    }

    const honeypot = req.bodyJson?.website
    if (typeof honeypot === "string" && honeypot.trim()) {
      return res.json({ error: "Pedido inválido." }, 400)
    }

    const users = new Users(serverClient)
    const user = await users.get({ userId })
    if (!user.status) {
      return res.json({ error: "Esta conta não está ativa." }, 403)
    }
    if (!user.emailVerification) {
      return res.json(
        { error: "Confirma o teu e-mail antes de publicares uma nota." },
        403
      )
    }

    if (!(await isActiveMember(tablesDB, memberId))) {
      return res.json(
        { error: "Esta pessoa já não está disponível para classificação." },
        409
      )
    }

    const grade = req.bodyJson?.grade
    const rawComment = req.bodyJson?.comment
    if (rawComment != null && typeof rawComment !== "string") {
      return res.json({ error: "Comentário inválido." }, 400)
    }
    const comment =
      typeof rawComment === "string" ? normalizeComment(rawComment) : ""
    if (
      typeof grade !== "number" ||
      !Number.isFinite(grade) ||
      grade < 0 ||
      grade > 20 ||
      Math.round(grade * 2) !== grade * 2
    ) {
      return res.json({ error: "A nota deve estar entre 0 e 20." }, 400)
    }
    const commentError = getCommentValidationError(comment)
    if (commentError) {
      return res.json({ error: commentError }, 400)
    }

    const now = Date.now()
    const recentSubmissionDates = await listRecentSubmissionDates(
      tablesDB,
      userId,
      now
    )
    const rateLimit = getRateLimit(recentSubmissionDates, now)
    if (rateLimit) {
      return res.json(rateLimit, 429)
    }

    const currentGrade = await createGrade({
      tablesDB,
      userId,
      memberId,
      grade,
      comment,
      now,
    })
    return res.json({ hasGrade: true, grade: currentGrade }, 201)
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.type === "user_not_found") {
      return res.json({ error: "Authentication required." }, 401)
    }
    if (cause instanceof AppwriteException && cause.code === 409) {
      const currentGrade = tablesDB
        ? await findCurrentGrade(tablesDB, userId, memberId).catch(
            () => undefined
          )
        : undefined
      return currentGrade
        ? res.json({ error: "Já classificaste este membro." }, 409)
        : res.json(
            {
              error: "Aguarda alguns segundos antes de enviares outra nota.",
              retryAfterSeconds: 30,
            },
            429
          )
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
