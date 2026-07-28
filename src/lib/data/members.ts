export const CLASSIFIQA_DATABASE_ID = import.meta.env.PUBLIC_DB_ID
export const MEMBERS_TABLE_ID = "govt-members"
export const GRADES_TABLE_ID = "grades"
export const GRADE_OWNERSHIP_FUNCTION_ID = "grade-ownership"
export const CONTENT_REPORTS_FUNCTION_ID = "content-reports"
export const ACCOUNT_ERASURE_FUNCTION_ID = "account-erasure"

export type MemberSource = "governo-portugal" | "parlamento-ar"

export type MemberGrade = {
  $id: string
  $createdAt: string
  grade: number
  comment?: string | null
}

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
  grades: MemberGrade[]
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
