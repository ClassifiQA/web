import { MemberAvatar } from "./member-avatar"
import { GradeDialog } from "./grade-dialog"
import { MemberGradeActivity } from "./member-grade-activity"
import { MemberParty } from "./member-party"
import { Button } from "@/components/ui/button"
import { memberSourceLabel, type Member } from "@/lib/data/members"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { MemberGrade } from "./grade"
import { mean } from "es-toolkit/math"
import { TooltipProvider } from "radix-ui/tooltip"
import { useEffect, useState } from "react"
import { useClientAuth } from "@/lib/hooks/backend/client/services/auth"
import {
  type CurrentUserGrade,
  useClientGrades,
} from "@/lib/hooks/backend/client/services/grades"
import { useAuthStore } from "@/lib/store/auth"

const sourceUrl = (member: Member) =>
  member.source === "governo-portugal"
    ? "https://portugal.gov.pt/pt/gc25/governo/composicao"
    : "https://www.parlamento.pt/DeputadoGP/Paginas/Deputados.aspx"

type MemberDetailProps = {
  member?: Member
  error?: string
}

type MyGradeLookup = {
  key: string
  grade: CurrentUserGrade | null
  error: string | null
}

export const MemberDetail = ({ member, error }: MemberDetailProps) => {
  const { currentUser, isLoading: isAuthLoading } = useAuthStore()
  const { getCurrentUser } = useClientAuth()
  const { getCurrentUserGrade, submitGrade, subscribeToMemberGrades } =
    useClientGrades()
  const [myGradeLookup, setMyGradeLookup] = useState<MyGradeLookup | null>(null)
  const [myGradeRevision, setMyGradeRevision] = useState(0)
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false)
  const memberId = member?.$id
  const [liveGrades, setLiveGrades] = useState(() => ({
    memberId,
    grades: member?.grades ?? [],
  }))
  const myGradeLookupKey =
    currentUser && memberId ? `${currentUser.$id}:${memberId}` : null

  useEffect(() => {
    if (memberId) void getCurrentUser()
  }, [getCurrentUser, memberId])

  useEffect(() => {
    let cancelled = false

    if (!myGradeLookupKey || !memberId) return

    void getCurrentUserGrade(memberId).then((result) => {
      if (cancelled) return

      if (result instanceof Error) {
        setMyGradeLookup({
          key: myGradeLookupKey,
          grade: null,
          error: result.message,
        })
        return
      }

      setMyGradeLookup({
        key: myGradeLookupKey,
        grade: result,
        error: null,
      })
    })

    return () => {
      cancelled = true
    }
  }, [getCurrentUserGrade, memberId, myGradeLookupKey, myGradeRevision])

  useEffect(() => {
    if (!member || !memberId) return

    let cancelled = false
    let closeSubscription: (() => Promise<void>) | undefined

    void subscribeToMemberGrades(memberId, ({ action, grade }) => {
      setLiveGrades((current) => {
        const grades =
          current.memberId === memberId ? current.grades : member.grades

        if (action === "delete") {
          return {
            memberId,
            grades: grades.filter((item) => item.$id !== grade.$id),
          }
        }

        const exists = grades.some((item) => item.$id === grade.$id)
        return {
          memberId,
          grades: exists
            ? grades.map((item) => (item.$id === grade.$id ? grade : item))
            : [...grades, grade],
        }
      })
      setMyGradeRevision((revision) => revision + 1)
    })
      .then((close) => {
        if (cancelled) {
          void close()
          return
        }

        closeSubscription = close
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      void closeSubscription?.()
    }
  }, [member, memberId, subscribeToMemberGrades])

  // no member
  if (!member) {
    return (
      <div
        role="alert"
        className="grid min-h-80 place-items-center rounded-4xl border border-dashed p-8 text-center">
        <div>
          <p className="text-muted-foreground">{error}</p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              href="/classificacoes"
              leadingIcon={ArrowLeft}>
              Voltar à lista
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // grades
  const allGrades =
    liveGrades.memberId === memberId ? liveGrades.grades : member.grades
  const averageGrade = allGrades.length
    ? Math.round(mean(allGrades.map((grade) => grade.grade)) * 10) / 10
    : 0
  const activeMyGradeLookup =
    myGradeLookup?.key === myGradeLookupKey ? myGradeLookup : null
  const currentGrade = activeMyGradeLookup?.grade ?? null
  const hasMyGrade = Boolean(currentGrade)
  const isMyGradeLoading = Boolean(myGradeLookupKey && !activeMyGradeLookup)
  const myGradeError = activeMyGradeLookup?.error ?? null
  const isCheckingMyGrade =
    isAuthLoading || (Boolean(currentUser) && isMyGradeLoading)
  const gradeButtonLabel = isCheckingMyGrade
    ? "A verificar…"
    : hasMyGrade
      ? "Ver a minha nota"
      : currentUser && !currentUser.emailVerification
        ? "Confirmar e-mail para dar nota"
        : "Dar nota"
  const gradeCountLabel =
    allGrades.length === 1 ? "1 vez" : `${allGrades.length} vezes`

  const handleGradeSubmit = async ({
    grade,
    comment,
    website,
  }: {
    grade: number
    comment?: string
    website?: string
  }) => {
    if (!memberId || !myGradeLookupKey) {
      return Error("Inicia sessão para dar nota.")
    }

    const result = await submitGrade({ memberId, grade, comment, website })
    if (result instanceof Error) return result

    setMyGradeLookup({
      key: myGradeLookupKey,
      grade: result,
      error: null,
    })
    return true as const
  }

  // ui
  return (
    <TooltipProvider>
      <article className="grid overflow-hidden rounded-2xl border bg-card shadow-sm sm:rounded-4xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="p-4 sm:p-8 lg:p-10">
          <div className="grid justify-items-center gap-4 text-center sm:grid-cols-[auto_minmax(0,1fr)] sm:justify-items-start sm:gap-6 sm:text-left lg:grid-cols-1">
            <MemberAvatar
              member={member}
              className="size-28 text-2xl sm:size-36 lg:size-40"
              eager
            />

            <div className="min-w-0 self-center">
              <p className="text-sm font-semibold text-accent">
                {memberSourceLabel(member.source)}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">
                {member.name}
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {member.position}
              </p>
              {member.party ? (
                <div className="mt-3 flex flex-row items-center justify-center gap-2 py-1 text-sm sm:justify-start">
                  <p className="font-semibold">Partido:</p>
                  <MemberParty
                    abbreviation={member.party}
                    name={member.party_name}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="outline"
              href="/classificacoes"
              leadingIcon={ArrowLeft}>
              Voltar à lista
            </Button>
            <Button
              variant="ghost"
              href={sourceUrl(member)}
              hrefTarget="_blank"
              trailingIcon={ExternalLink}>
              Fonte oficial
            </Button>
          </div>

          <section
            aria-labelledby="grading"
            className="mt-6 rounded-2xl border bg-muted/30 p-4 sm:mt-8 sm:rounded-4xl sm:p-6">
            <div className="flex items-center justify-between gap-3 sm:gap-5">
              <div>
                <p className="text-sm text-muted-foreground">Nota Média</p>
                <h2 id="grading" className="mt-1 text-xl font-semibold">
                  Classificado{" "}
                  <span className="text-accent">{gradeCountLabel}</span>
                </h2>
              </div>
              <MemberGrade grade={averageGrade} radius={35} />
            </div>
            <Button
              className="mt-5 w-full"
              variant="outline"
              disabled={isCheckingMyGrade || Boolean(myGradeError)}
              aria-busy={isCheckingMyGrade}
              title={myGradeError ?? undefined}
              onClick={() => setGradeDialogOpen(true)}>
              {gradeButtonLabel}
            </Button>
          </section>
        </section>

        <aside className="border-t bg-muted/20 p-4 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
          <MemberGradeActivity grades={allGrades} memberId={member.$id} />
        </aside>
      </article>

      <GradeDialog
        open={gradeDialogOpen}
        memberName={member.name}
        currentGrade={currentGrade}
        isAuthenticated={Boolean(currentUser)}
        isEmailVerified={Boolean(currentUser?.emailVerification)}
        onOpenChange={setGradeDialogOpen}
        onSubmit={handleGradeSubmit}
      />
    </TooltipProvider>
  )
}
