import { createHash } from "node:crypto"

export const MIN_REASON_LENGTH = 30
export const MAX_REASON_LENGTH = 4000
export const MAX_LOCATION_DETAILS_LENGTH = 2000
export const REPORT_COOLDOWN_MS = 5 * 60 * 1000
export const DAILY_REPORT_LIMIT = 5
export const MONTHLY_REPORT_LIMIT = 20
export const MONTH_MS = 30 * 24 * 60 * 60 * 1000
const INVISIBLE_PADDING_PATTERN = /[\u200B-\u200F\u2060\uFEFF]/u
const REPEATED_TEXT_PATTERN =
  /(\S)\1{15,}|\b([\p{L}\p{N}]{2,})(?:[\s.,!?;:–—-]+\2){7,}\b/iu
const ALLOWED_HOSTS = new Set(["classifiqa.pt", "www.classifiqa.pt"])

export const normalizeText = (value) =>
  value
    .normalize("NFKC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .trim()

export const normalizeContentUrl = (value) => {
  if (typeof value !== "string" || value.length > 2048) return null

  let url
  try {
    url = new URL(value, "https://classifiqa.pt")
  } catch {
    return null
  }

  if (
    url.protocol !== "https:" ||
    !ALLOWED_HOSTS.has(url.hostname.toLowerCase())
  ) {
    return null
  }

  url.username = ""
  url.password = ""
  url.searchParams.sort()
  return url.toString()
}

export const validateReportText = (reason, locationDetails) => {
  if (reason.length < MIN_REASON_LENGTH) {
    return `Explica o motivo da denúncia em pelo menos ${MIN_REASON_LENGTH} caracteres.`
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return `A explicação não pode exceder ${MAX_REASON_LENGTH} caracteres.`
  }
  if (locationDetails.length > MAX_LOCATION_DETAILS_LENGTH) {
    return `Os detalhes de localização não podem exceder ${MAX_LOCATION_DETAILS_LENGTH} caracteres.`
  }
  if (
    INVISIBLE_PADDING_PATTERN.test(reason) ||
    INVISIBLE_PADDING_PATTERN.test(locationDetails)
  ) {
    return "O texto contém caracteres invisíveis não permitidos."
  }
  if (
    REPEATED_TEXT_PATTERN.test(reason) ||
    REPEATED_TEXT_PATTERN.test(locationDetails)
  ) {
    return "Evita texto excessivamente repetitivo."
  }
  return null
}

export const createDedupeKey = ({ userId, contentUrl, reason }) =>
  createHash("sha256")
    .update(`${userId}\n${contentUrl}\n${reason.toLocaleLowerCase("pt-PT")}`)
    .digest("hex")

export const getReportRateLimit = (dates, now) => {
  const timestamps = dates
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((left, right) => right - left)

  if (timestamps[0] && now - timestamps[0] < REPORT_COOLDOWN_MS) {
    return {
      error: "Aguarda alguns minutos antes de enviares outra denúncia.",
      retryAfterSeconds: Math.ceil(
        (REPORT_COOLDOWN_MS - (now - timestamps[0])) / 1000
      ),
    }
  }

  const daily = timestamps.filter(
    (timestamp) => now - timestamp < 24 * 60 * 60 * 1000
  )
  if (daily.length >= DAILY_REPORT_LIMIT) {
    return {
      error:
        "Atingiste o limite diário de denúncias. Se existir risco imediato, contacta as autoridades competentes.",
      retryAfterSeconds: Math.ceil(
        (24 * 60 * 60 * 1000 - (now - daily.at(-1))) / 1000
      ),
    }
  }

  if (timestamps.length >= MONTHLY_REPORT_LIMIT) {
    return {
      error:
        "Atingiste o limite mensal de denúncias. Contacta o canal jurídico se precisares de assistência.",
      retryAfterSeconds: Math.ceil(
        (MONTH_MS - (now - timestamps.at(-1))) / 1000
      ),
    }
  }

  return null
}
