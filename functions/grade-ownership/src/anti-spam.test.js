import { describe, expect, test } from "bun:test"
import {
  DAILY_SUBMISSION_LIMIT,
  HOURLY_SUBMISSION_LIMIT,
  SUBMISSION_COOLDOWN_MS,
  createOwnershipRowId,
  getCommentValidationError,
  getRateLimit,
  normalizeComment,
} from "./anti-spam.js"

const isoBefore = (now, milliseconds) =>
  new Date(now - milliseconds).toISOString()

describe("comment validation", () => {
  test("normalizes invisible characters and newlines", () => {
    expect(normalizeComment("  Olá\u200B\r\nmundo  ")).toBe("Olá\nmundo")
  })

  test("rejects links and repetitive floods", () => {
    expect(getCommentValidationError("Consulta https://spam.example")).toBe(
      "Não são permitidas ligações nos comentários."
    )
    expect(getCommentValidationError("spam spam spam spam spam spam")).toBe(
      "Evita texto excessivamente repetitivo no comentário."
    )
    expect(getCommentValidationError("!!!!!!!!!!!!")).toBe(
      "Evita texto excessivamente repetitivo no comentário."
    )
  })

  test("accepts ordinary comments and an empty optional comment", () => {
    expect(getCommentValidationError("Discordo das opções apresentadas.")).toBe(
      null
    )
    expect(getCommentValidationError("")).toBe(null)
  })
})

describe("submission limits", () => {
  const now = Date.parse("2026-07-28T12:00:00.000Z")

  test("enforces the short cooldown", () => {
    const result = getRateLimit(
      [isoBefore(now, SUBMISSION_COOLDOWN_MS - 5_000)],
      now
    )

    expect(result?.retryAfterSeconds).toBe(5)
  })

  test("enforces the hourly limit", () => {
    const submissions = Array.from(
      { length: HOURLY_SUBMISSION_LIMIT },
      (_, index) => isoBefore(now, SUBMISSION_COOLDOWN_MS + index * 60_000)
    )

    expect(getRateLimit(submissions, now)?.error).toContain("por hora")
  })

  test("enforces the daily limit", () => {
    const submissions = Array.from(
      { length: DAILY_SUBMISSION_LIMIT },
      (_, index) => isoBefore(now, 2 * 60 * 60 * 1000 + index * 60_000)
    )

    expect(getRateLimit(submissions, now)?.error).toContain("limite diário")
  })

  test("creates stable, per-window ownership IDs", () => {
    const first = createOwnershipRowId("user-1", now)
    expect(createOwnershipRowId("user-1", now + 5_000)).toBe(first)
    expect(createOwnershipRowId("user-2", now)).not.toBe(first)
    expect(
      createOwnershipRowId("user-1", now + SUBMISSION_COOLDOWN_MS)
    ).not.toBe(first)
  })
})
