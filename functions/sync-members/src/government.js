import { fetchText } from "./http.js"

export const GOVERNMENT_SOURCE = "governo-portugal"

const GOVERNMENT_ORIGIN = "https://portugal.gov.pt"
const SITEMAP_URL = `${GOVERNMENT_ORIGIN}/sitemap.xml`

function nextData(html, url) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  )

  if (!match) {
    throw new Error(`Could not find __NEXT_DATA__ in ${url}`)
  }

  try {
    return JSON.parse(match[1])
  } catch (cause) {
    throw new Error(`Invalid __NEXT_DATA__ in ${url}`, { cause })
  }
}

function isOpenEnded(value) {
  return !value || value.startsWith("0001-01-01")
}

function imageUrl(value) {
  return value ? new URL(value, GOVERNMENT_ORIGIN).href : null
}

function currentHistory(route) {
  const histories = route?.fields?.OfficialsHistory

  if (!Array.isArray(histories)) {
    return null
  }

  return (
    histories.find(
      (history) =>
        isOpenEnded(history.fields?.EndDate?.value) &&
        history.fields?.IsOfficialHidden?.value !== true
    ) ?? null
  )
}

function findOfficialReference(value) {
  if (!value || typeof value !== "object") {
    return null
  }

  if (value.id && value.fields?.FullName?.value) {
    return value
  }

  for (const child of Object.values(value)) {
    const result = findOfficialReference(child)
    if (result) {
      return result
    }
  }

  return null
}

function sitemapEntries(xml) {
  return [
    ...xml.matchAll(
      /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/url>/gi
    ),
  ].map((match) => ({
    url: match[1].replaceAll("&amp;", "&"),
    lastmod: match[2],
  }))
}

async function memberFromMinisterPage(entry) {
  const page = await fetchText(entry.url)
  const data = nextData(page.body, entry.url)
  const sitecore = data.props?.pageProps?.layoutData?.sitecore
  const history = currentHistory(sitecore?.route)
  const official = history?.fields?.Official

  if (!official?.id || !official.fields?.FullName?.value) {
    throw new Error(`Could not find the current minister in ${entry.url}`)
  }

  const role = history.fields?.GovernmentRole?.value || "Ministro"
  const area = sitecore.context?.governmentContext?.governmentAreaTitle

  return {
    source: GOVERNMENT_SOURCE,
    external_id: official.id.toLowerCase(),
    name: official.fields.FullName.value.trim(),
    position: area ? `${role} - ${area}` : role,
    party: null,
    party_name: null,
    image_url: imageUrl(
      history.fields?.CardPhoto?.value?.src ||
        official.fields.CardPhoto?.value?.src
    ),
    active: true,
    source_updated_at: new Date(entry.lastmod).toISOString(),
  }
}

async function memberFromPrimeMinisterPage(entry) {
  const page = await fetchText(entry.url)
  const data = nextData(page.body, entry.url)
  const sitecore = data.props?.pageProps?.layoutData?.sitecore
  const official = findOfficialReference(sitecore?.route)

  if (!official) {
    throw new Error(`Could not find the current prime minister in ${entry.url}`)
  }

  return {
    source: GOVERNMENT_SOURCE,
    external_id: official.id.toLowerCase(),
    name: official.fields.FullName.value.trim(),
    position: "Primeiro-Ministro",
    party: null,
    party_name: null,
    image_url: imageUrl(official.fields.CardPhoto?.value?.src),
    active: true,
    source_updated_at: new Date(entry.lastmod).toISOString(),
  }
}

export async function loadGovernmentMembers() {
  const sitemap = await fetchText(SITEMAP_URL)
  const entries = sitemapEntries(sitemap.body)
  const governmentCodes = entries
    .map((entry) => entry.url.match(/\/gc(\d+)\/governo\/composicao$/)?.[1])
    .filter(Boolean)
    .map(Number)

  const currentCode = Math.max(...governmentCodes)

  if (!Number.isFinite(currentCode)) {
    throw new Error("Could not discover the current constitutional government")
  }

  const prefix = `${GOVERNMENT_ORIGIN}/gc${currentCode}`
  const ministerEntries = entries.filter((entry) =>
    new RegExp(`^${prefix}/area-de-governo/[^/]+/ministro$`).test(entry.url)
  )
  const primeMinisterEntry = entries.find(
    (entry) => entry.url === `${prefix}/primeiro-ministro/acerca`
  )

  if (!primeMinisterEntry) {
    throw new Error("Could not discover the current prime minister page")
  }

  const members = await Promise.all([
    memberFromPrimeMinisterPage(primeMinisterEntry),
    ...ministerEntries.map(memberFromMinisterPage),
  ])

  if (members.length < 10 || members.length > 30) {
    throw new Error(
      `Government source returned an implausible roster (${members.length})`
    )
  }

  return members
}
