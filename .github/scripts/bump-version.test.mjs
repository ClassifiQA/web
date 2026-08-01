import assert from "node:assert/strict"
import test from "node:test"

import { incrementVersion, releaseTypeFor } from "./bump-version.mjs"

test("breaking changes cause a major release", () => {
  assert.equal(
    releaseTypeFor("feat(api)!: replace the response format"),
    "major"
  )
  assert.equal(
    releaseTypeFor("fix: keep compatibility\n\nBREAKING CHANGE: remove v1"),
    "major"
  )
})

test("features cause a minor release", () => {
  assert.equal(
    releaseTypeFor("fix: typo\n\nfeat(home): add dashboard"),
    "minor"
  )
})

test("all other updates cause a patch release", () => {
  assert.equal(releaseTypeFor("docs: improve setup instructions"), "patch")
})

test("increments stable semantic versions", () => {
  assert.equal(incrementVersion("1.4.1", "major"), "2.0.0")
  assert.equal(incrementVersion("1.4.1", "minor"), "1.5.0")
  assert.equal(incrementVersion("1.4.1", "patch"), "1.4.2")
})

test("promotes a prerelease on a patch update", () => {
  assert.equal(incrementVersion("1.4.2-beta.3", "patch"), "1.4.2")
  assert.equal(incrementVersion("2.0.0-beta.1", "major"), "2.0.0")
})

test("rejects versions that are not valid SemVer", () => {
  assert.throws(
    () => incrementVersion("v1.4", "patch"),
    /invalid semantic version/
  )
  assert.throws(
    () => incrementVersion("1.4.2-beta.03", "patch"),
    /invalid semantic version/
  )
})
