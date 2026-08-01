import { readFileSync, writeFileSync } from "node:fs"

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

export function releaseTypeFor(commitMessages) {
  const hasBreakingChange =
    /^[a-z][\w-]*(?:\([^\r\n)]+\))?!:/im.test(commitMessages) ||
    /^BREAKING(?: |-)CHANGE:\s/im.test(commitMessages)

  if (hasBreakingChange) return "major"
  if (/^feat(?:\([^\r\n)]+\))?:/im.test(commitMessages)) return "minor"
  return "patch"
}

export function incrementVersion(version, releaseType) {
  const match = semverPattern.exec(version)

  const prereleaseIdentifiers = match?.[4]?.split(".") ?? []
  const hasInvalidNumericIdentifier = prereleaseIdentifiers.some(
    (identifier) =>
      /^\d+$/.test(identifier) &&
      identifier.length > 1 &&
      identifier.startsWith("0")
  )

  if (!match || hasInvalidNumericIdentifier) {
    throw new Error(
      `package.json contains an invalid semantic version: ${version}`
    )
  }

  let major = BigInt(match[1])
  let minor = BigInt(match[2])
  let patch = BigInt(match[3])
  const isPrerelease = match[4] !== undefined

  if (releaseType === "major") {
    if (!isPrerelease || minor !== 0n || patch !== 0n) major += 1n
    minor = 0n
    patch = 0n
  } else if (releaseType === "minor") {
    if (!isPrerelease || patch !== 0n) minor += 1n
    patch = 0n
  } else if (releaseType === "patch") {
    // The stable form of a prerelease is already its next patch version.
    if (!isPrerelease) patch += 1n
  } else {
    throw new Error(`Unknown release type: ${releaseType}`)
  }

  return `${major}.${minor}.${patch}`
}

function main() {
  const commitMessagesPath = process.argv[2]

  if (!commitMessagesPath) {
    throw new Error("Usage: node bump-version.mjs <commit-messages-file>")
  }

  const packageJsonPath = "package.json"
  const commitMessages = readFileSync(commitMessagesPath, "utf8")
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))
  const releaseType = releaseTypeFor(commitMessages)
  const previousVersion = packageJson.version
  const nextVersion = incrementVersion(previousVersion, releaseType)

  packageJson.version = nextVersion
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `release_type=${releaseType}\nprevious_version=${previousVersion}\nnext_version=${nextVersion}\n`,
      { flag: "a" }
    )
  }

  console.log(`${previousVersion} -> ${nextVersion} (${releaseType})`)
}

if (process.argv[1]?.endsWith("bump-version.mjs")) main()
