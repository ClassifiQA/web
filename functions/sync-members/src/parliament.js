import { fetchJson, fetchText } from "./http.js"

export const PARLIAMENT_SOURCE = "parlamento-ar"

const BASE_INFORMATION_URL =
  "https://www.parlamento.pt/Cidadania/Paginas/DAInformacaoBase.aspx"

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

function stripHtml(value) {
  return decodeHtml(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  )
}

function extractLinks(html, baseUrl) {
  return [
    ...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi),
  ].map((match) => ({
    href: new URL(decodeHtml(match[1]), baseUrl).href,
    text: stripHtml(match[2]),
  }))
}

function romanNumeralValue(value) {
  const digits = { I: 1, V: 5, X: 10, L: 50, C: 100 }
  let total = 0

  for (let index = 0; index < value.length; index += 1) {
    const current = digits[value[index]] ?? 0
    const next = digits[value[index + 1]] ?? 0
    total += current < next ? -current : current
  }

  return total
}

function latestByDate(entries, startKey) {
  return [...(entries ?? [])]
    .sort((left, right) =>
      String(left[startKey] ?? "").localeCompare(String(right[startKey] ?? ""))
    )
    .at(-1)
}

function currentSituation(deputy) {
  return (deputy.DepSituacao ?? []).find((situation) => !situation.sioDtFim)
}

function isActiveDeputy(deputy) {
  const situation = currentSituation(deputy)
  return /efetivo|temporário|temporario/i.test(situation?.sioDes ?? "")
}

export async function loadDeputies() {
  const index = await fetchText(BASE_INFORMATION_URL)
  const legislatureLinks = extractLinks(index.body, BASE_INFORMATION_URL)
    .map((link) => {
      const match = link.text.match(/^([IVXLCDM]+) Legislatura$/i)
      return match ? { ...link, legislature: match[1].toUpperCase() } : null
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        romanNumeralValue(right.legislature) -
        romanNumeralValue(left.legislature)
    )

  const currentLegislature = legislatureLinks[0]

  if (!currentLegislature) {
    throw new Error("Could not discover the current parliamentary legislature")
  }

  const legislaturePage = await fetchText(currentLegislature.href)
  const jsonLink = extractLinks(
    legislaturePage.body,
    currentLegislature.href
  ).find((link) => /InformacaoBase.*_json\.txt$/i.test(link.text))

  if (!jsonLink) {
    throw new Error(
      `Could not discover the ${currentLegislature.legislature} legislature JSON feed`
    )
  }

  const feed = await fetchJson(jsonLink.href)
  const deputies = feed.body.Deputados
  const groups = feed.body.GruposParlamentares

  if (!Array.isArray(deputies)) {
    throw new Error("The parliamentary feed has no Deputados array")
  }

  const groupNames = new Map(
    Array.isArray(groups)
      ? groups
          .map((group) => [group.sigla?.trim(), group.nome?.trim()])
          .filter(([abbreviation, name]) => abbreviation && name)
      : []
  )

  const members = deputies.filter(isActiveDeputy).map((deputy) => {
    const group = latestByDate(deputy.DepGP, "gpDtInicio")
    const situation = currentSituation(deputy)
    const circle = deputy.DepCPDes?.trim()
    const party = group?.gpSigla?.trim() || null
    const sourceUpdatedAt = [group?.gpDtInicio, situation?.sioDtInicio]
      .filter(Boolean)
      .sort()
      .at(-1)

    return {
      source: PARLIAMENT_SOURCE,
      external_id: String(deputy.DepCadId ?? deputy.DepId),
      name: deputy.DepNomeParlamentar?.trim() || deputy.DepNomeCompleto.trim(),
      position: circle
        ? `Deputado à Assembleia da República - ${circle}`
        : "Deputado à Assembleia da República",
      party,
      party_name: party ? (groupNames.get(party) ?? null) : null,
      image_url: null,
      active: true,
      source_updated_at: sourceUpdatedAt
        ? new Date(sourceUpdatedAt).toISOString()
        : null,
    }
  })

  if (members.length < 200 || members.length > 300) {
    throw new Error(
      `Parliamentary feed returned an implausible active roster (${members.length})`
    )
  }

  return members
}
