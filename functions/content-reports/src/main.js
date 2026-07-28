import {
  AppwriteException,
  Client,
  ID,
  Query,
  TablesDB,
  Users,
} from "node-appwrite"
import {
  MONTH_MS,
  createDedupeKey,
  getReportRateLimit,
  normalizeContentUrl,
  normalizeText,
  validateReportText,
} from "./anti-abuse.js"

const DATABASE_ID = "6a6272e50037ef590f10"
const REPORTS_TABLE_ID = "content-reports"
const CONTENT_TYPES = new Set(["comment", "member", "account", "other"])
const APPWRITE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/

const createClient = () =>
  new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)

const listRecentReportDates = async (tablesDB, userId, now) => {
  const reports = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: REPORTS_TABLE_ID,
    queries: [
      Query.equal("reporter_user_id", userId),
      Query.greaterThanEqual(
        "$createdAt",
        new Date(now - MONTH_MS).toISOString()
      ),
      Query.orderDesc("$createdAt"),
      Query.limit(20),
      Query.select(["$createdAt"]),
    ],
    total: false,
  })
  return reports.rows.map((report) => report.$createdAt)
}

export default async ({ req, res, error }) => {
  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed." }, 405)
  }

  const userId = req.headers["x-appwrite-user-id"]
  if (typeof userId !== "string" || !APPWRITE_ID.test(userId)) {
    return res.json(
      {
        error:
          "Inicia sessão com um e-mail confirmado para enviares a denúncia estruturada.",
      },
      401
    )
  }

  const honeypot = req.bodyJson?.website
  if (typeof honeypot === "string" && honeypot.trim()) {
    return res.json({ error: "Pedido inválido." }, 400)
  }

  const contentType = req.bodyJson?.contentType
  const contentUrl = normalizeContentUrl(req.bodyJson?.contentUrl)
  const rawReason = req.bodyJson?.reason
  const rawLocationDetails = req.bodyJson?.locationDetails

  if (!CONTENT_TYPES.has(contentType)) {
    return res.json({ error: "Seleciona o tipo de conteúdo denunciado." }, 400)
  }
  if (!contentUrl) {
    return res.json(
      { error: "Indica um endereço válido de conteúdo no ClassifiQA." },
      400
    )
  }
  if (
    typeof rawReason !== "string" ||
    (rawLocationDetails != null && typeof rawLocationDetails !== "string")
  ) {
    return res.json({ error: "Preenche os dados obrigatórios." }, 400)
  }
  if (req.bodyJson?.goodFaith !== true) {
    return res.json(
      { error: "Confirma a declaração de exatidão e boa-fé." },
      400
    )
  }

  const reason = normalizeText(rawReason)
  const locationDetails =
    typeof rawLocationDetails === "string"
      ? normalizeText(rawLocationDetails)
      : ""
  const textError = validateReportText(reason, locationDetails)
  if (textError) return res.json({ error: textError }, 400)

  try {
    const executionKey = req.headers["x-appwrite-key"]
    if (!executionKey) throw new Error("Missing function execution key.")

    const client = createClient().setKey(executionKey)
    const users = new Users(client)
    const user = await users.get({ userId })
    if (!user.status) {
      return res.json({ error: "Esta conta não está ativa." }, 403)
    }
    if (!user.emailVerification) {
      return res.json(
        { error: "Confirma o e-mail da tua conta antes de denunciares." },
        403
      )
    }

    const tablesDB = new TablesDB(client)
    const now = Date.now()
    const dates = await listRecentReportDates(tablesDB, userId, now)
    const rateLimit = getReportRateLimit(dates, now)
    if (rateLimit) return res.json(rateLimit, 429)

    const report = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: REPORTS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        reporter_user_id: userId,
        reporter_name: user.name || "Utilizador ClassifiQA",
        reporter_email: user.email,
        content_type: contentType,
        content_url: contentUrl,
        legal_reason: reason,
        ...(locationDetails ? { location_details: locationDetails } : {}),
        good_faith: true,
        dedupe_key: createDedupeKey({ userId, contentUrl, reason }),
        status: "received",
      },
    })

    return res.json(
      {
        reference: report.$id,
        status: "received",
        message: "Denúncia recebida para análise humana.",
      },
      201
    )
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 409) {
      return res.json(
        {
          error:
            "Esta denúncia já foi recebida. Guarda a referência apresentada anteriormente.",
        },
        409
      )
    }
    error(
      cause instanceof Error
        ? `Content report failed: ${cause.message}`
        : "Content report failed."
    )
    return res.json(
      { error: "Não foi possível guardar a denúncia neste momento." },
      500
    )
  }
}
