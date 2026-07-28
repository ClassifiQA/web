import { createHash } from "node:crypto"

export const MAX_COMMENT_LENGTH = 1000
export const SUBMISSION_COOLDOWN_MS = 30 * 1000
export const HOURLY_SUBMISSION_LIMIT = 8
export const DAILY_SUBMISSION_LIMIT = 30

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|pt)(?:\/|\b))/iu
const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u
const REPEATED_CHARACTER_PATTERN = /(\S)\1{11,}/u
const REPEATED_WORD_PATTERN = /\b([\p{L}\p{N}]{2,})(?:[\s.,!?;:–—-]+\1){5,}\b/iu

export const normalizeComment = (value) =>
  value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .trim()

export const getCommentValidationError = (comment) => {
  if (comment.length > MAX_COMMENT_LENGTH) {
    return "O comentário não pode exceder 1000 caracteres."
  }
  if (CONTROL_CHARACTER_PATTERN.test(comment)) {
    return "O comentário contém caracteres inválidos."
  }
  if ((comment.match(/\n/g)?.length ?? 0) > 12) {
    return "O comentário contém demasiadas quebras de linha."
  }
  if (URL_PATTERN.test(comment)) {
    return "Não são permitidas ligações nos comentários."
  }
  if (
    REPEATED_CHARACTER_PATTERN.test(comment) ||
    REPEATED_WORD_PATTERN.test(comment)
  ) {
    return "Evita texto excessivamente repetitivo no comentário."
  }

  return null
}

export const getRateLimit = (createdAtValues, now = Date.now()) => {
  const timestamps = createdAtValues
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((left, right) => right - left)
  const latest = timestamps[0]

  if (latest && now - latest < SUBMISSION_COOLDOWN_MS) {
    return {
      error: "Aguarda alguns segundos antes de enviares outra nota.",
      retryAfterSeconds: Math.ceil(
        (SUBMISSION_COOLDOWN_MS - (now - latest)) / 1000
      ),
    }
  }

  const hourlyCount = timestamps.filter(
    (timestamp) => now - timestamp < HOUR_MS
  ).length
  if (hourlyCount >= HOURLY_SUBMISSION_LIMIT) {
    const oldestHourly = timestamps
      .filter((timestamp) => now - timestamp < HOUR_MS)
      .at(-1)
    return {
      error:
        "Atingiste o limite de classificações por hora. Tenta novamente mais tarde.",
      retryAfterSeconds: oldestHourly
        ? Math.max(1, Math.ceil((HOUR_MS - (now - oldestHourly)) / 1000))
        : 60,
    }
  }

  if (timestamps.length >= DAILY_SUBMISSION_LIMIT) {
    const oldestDaily = timestamps.at(-1)
    return {
      error:
        "Atingiste o limite diário de classificações. Tenta novamente mais tarde.",
      retryAfterSeconds: oldestDaily
        ? Math.max(1, Math.ceil((DAY_MS - (now - oldestDaily)) / 1000))
        : 60,
    }
  }

  return null
}

export const createOwnershipRowId = (userId, now = Date.now()) => {
  const cooldownWindow = Math.floor(now / SUBMISSION_COOLDOWN_MS)
  return createHash("sha256")
    .update(`${userId}:${cooldownWindow}`)
    .digest("hex")
    .slice(0, 36)
}
