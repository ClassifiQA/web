export const CLASSIFIQA_DATABASE_ID = "6a6272e50037ef590f10"
export const MEMBERS_TABLE_ID = "govt-members"

export type MemberSource = "governo-portugal" | "parlamento-ar"

export type Member = {
  $id: string
  $createdAt: string
  $updatedAt: string
  name: string
  position: string
  party?: string | null
  party_name?: string | null
  image_url?: string | null
  active: boolean
  source: MemberSource
  external_id: string
  source_updated_at?: string | null
}

export const memberSourceLabel = (source: MemberSource) =>
  source === "governo-portugal"
    ? "Governo de Portugal"
    : "Assembleia da República"

export const memberHref = (memberId: string) =>
  `/classificacoes/${encodeURIComponent(memberId)}`

export const memberInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-PT")
