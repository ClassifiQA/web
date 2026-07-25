import { readFileSync } from "node:fs"
import { Agent } from "node:https"
import { rootCertificates } from "node:tls"
import fetch from "node-fetch"

const USER_AGENT =
  "ClassifiQA member sync/1.0 (+https://github.com/danfq/classifiqa)"

const PARLIAMENT_ROOT_CA = readFileSync(
  new URL(
    "../certs/sectigo-public-server-authentication-root-r46.pem",
    import.meta.url,
  ),
  "utf8",
)

const HTTPS_AGENT = new Agent({
  ca: [...rootCertificates, PARLIAMENT_ROOT_CA],
})

export async function fetchText(url, options = {}) {
  const {
    attempts = 3,
    timeoutMs = 45_000,
    headers = {},
  } = options

  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        agent: HTTPS_AGENT,
        headers: {
          "user-agent": USER_AGENT,
          ...headers,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`)
      }

      return {
        body: await response.text(),
        headers: response.headers,
      }
    } catch (cause) {
      lastError = cause

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750))
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(`Could not fetch ${url}`, { cause: lastError })
}

export async function fetchJson(url, options) {
  const response = await fetchText(url, options)

  try {
    return {
      ...response,
      body: JSON.parse(response.body),
    }
  } catch (cause) {
    throw new Error(`Invalid JSON from ${url}`, { cause })
  }
}
