import { describe, expect, test } from "bun:test"
import {
  createDedupeKey,
  getReportRateLimit,
  normalizeContentUrl,
  normalizeText,
  validateReportText,
} from "./anti-abuse.js"

const now = Date.parse("2026-07-28T12:00:00.000Z")

describe("content report validation", () => {
  test("normalizes ClassifiQA URLs and rejects external hosts", () => {
    expect(normalizeContentUrl("/classificacoes/member#comentario-grade")).toBe(
      "https://classifiqa.pt/classificacoes/member#comentario-grade"
    )
    expect(normalizeContentUrl("https://example.com/content")).toBeNull()
  })

  test("rejects short and repeated explanations", () => {
    expect(validateReportText("curto", "")).toContain("30 caracteres")
    expect(validateReportText(`spam ${"spam ".repeat(10)}`, "")).toContain(
      "repetitivo"
    )
  })

  test("creates stable user-scoped duplicate keys", () => {
    const input = {
      userId: "user",
      contentUrl: "https://classifiqa.pt/item",
      reason: normalizeText("Uma explicação suficientemente detalhada."),
    }
    expect(createDedupeKey(input)).toBe(createDedupeKey(input))
    expect(createDedupeKey({ ...input, userId: "other" })).not.toBe(
      createDedupeKey(input)
    )
  })

  test("enforces cooldown and rolling limits", () => {
    expect(
      getReportRateLimit([new Date(now - 60_000).toISOString()], now)
    ).not.toBeNull()
    expect(
      getReportRateLimit(
        Array.from({ length: 5 }, (_, index) =>
          new Date(now - (index + 1) * 60 * 60 * 1000).toISOString()
        ),
        now
      )?.error
    ).toContain("diário")
  })
})
