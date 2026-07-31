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
      <article className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-card shadow-sm sm:rounded-4xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-1">
        <section className="shrink-0 p-3 sm:p-6 lg:p-10">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-left sm:gap-6 lg:grid-cols-1 lg:justify-items-start">
            <MemberAvatar
              member={member}
              className="size-20 text-lg sm:size-36 sm:text-2xl lg:size-40"
              eager
            />

            <div className="min-w-0 self-center">
              <p className="text-sm font-semibold text-accent">
                {memberSourceLabel(member.source)}
              </p>
              <h1 className="mt-1 text-xl leading-tight font-bold tracking-tight sm:text-4xl">
                {member.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-3 sm:text-base">
                {member.position}
              </p>
              {member.party ? (
                <div className="mt-2 flex flex-row items-center gap-2 py-1 text-sm sm:mt-3">
                  <p className="font-semibold">Partido:</p>
                  <MemberParty
                    abbreviation={member.party}
                    name={member.party_name}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
            <Button
              variant="outline"
              size="sm"
              href="/classificacoes"
              leadingIcon={ArrowLeft}>
              Voltar à lista
            </Button>
            <Button
              variant="ghost"
              size="sm"
              href={sourceUrl(member)}
              hrefTarget="_blank"
              trailingIcon={ExternalLink}>
              Fonte oficial
            </Button>
          </div>

          <section
            aria-labelledby="grading"
            className="mt-3 rounded-2xl border bg-muted/30 p-3 sm:mt-8 sm:rounded-4xl sm:p-6">
            <div className="flex items-center justify-between gap-3 sm:gap-5">
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Nota Média
                </p>
                <h2
                  id="grading"
                  className="mt-1 text-base font-semibold sm:text-xl">
                  Classificado{" "}
                  <span className="text-accent">{gradeCountLabel}</span>
                </h2>
              </div>
              <MemberGrade grade={averageGrade} radius={28} />
            </div>
            <Button
              className="mt-3 w-full sm:mt-5"
              variant="outline"
              size="sm"
              disabled={isCheckingMyGrade || Boolean(myGradeError)}
              aria-busy={isCheckingMyGrade}
              title={myGradeError ?? undefined}
              onClick={() => setGradeDialogOpen(true)}>
              {gradeButtonLabel}
            </Button>
          </section>
        </section>

        <aside className="min-h-0 overflow-hidden border-t bg-muted/20 p-3 sm:p-6 lg:border-t-0 lg:border-l lg:p-10">
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
