import { describe, expect, test } from "bun:test"
import { isDryRun } from "./main.js"

describe("sync request options", () => {
  test("treats an empty scheduled request body as a normal sync", () => {
    expect(isDryRun({ bodyText: "", query: {} })).toBe(false)
    expect(isDryRun({ query: {} })).toBe(false)
  })

  test("accepts dry-run mode through the query or JSON body", () => {
    expect(isDryRun({ bodyText: "", query: { dryRun: "true" } })).toBe(true)
    expect(
      isDryRun({
        bodyText: JSON.stringify({ dryRun: true }),
        query: {},
      })
    ).toBe(true)
  })

  test("rejects malformed non-empty JSON bodies", () => {
    expect(() => isDryRun({ bodyText: "{", query: {} })).toThrow(SyntaxError)
  })
})
