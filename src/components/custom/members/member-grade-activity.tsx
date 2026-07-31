import type { MemberGrade } from "@/lib/data/members"
import { Flag, Clock3, MessageCircle, ShieldCheck } from "lucide-react"

const formatGradeDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Data indisponível"

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const GradeTime = ({ grade }: { grade: MemberGrade }) => (
  <time
    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
    dateTime={grade.$createdAt}>
    <Clock3 aria-hidden className="size-3" />
    {formatGradeDate(grade.$createdAt)}
  </time>
)

export const MemberGradeActivity = ({
  grades,
  memberId,
}: {
  grades: MemberGrade[]
  memberId: string
}) => {
  const orderedGrades = [...grades].sort(
    (a, b) =>
      new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
  )
  const comments = orderedGrades.filter((grade) => grade.comment?.trim())

  if (comments.length > 0) {
    return (
      <section
        aria-labelledby="member-comments"
        className="flex h-full min-h-0 flex-col gap-3 sm:gap-5">
        <header className="shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle aria-hidden className="size-5 text-accent" />
            <h2 id="member-comments" className="text-xl font-semibold">
              Comentários
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Opiniões partilhadas anonimamente por quem classificou este membro.
          </p>
        </header>

        <div className="grid min-h-0 flex-1 [scrollbar-gutter:stable] content-start gap-3 overflow-y-auto overscroll-contain pr-1">
          {comments.map((grade) => (
            <article
              key={grade.$id}
              id={`comentario-${grade.$id}`}
              className="rounded-3xl border bg-background/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
                  {grade.grade} / 20
                </span>
                <GradeTime grade={grade} />
              </div>
              <p className="mt-4 leading-relaxed wrap-break-word whitespace-pre-wrap">
                {grade.comment}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck aria-hidden className="size-3.5 text-accent" />
                  Classificação anónima
                </span>
                <a
                  className="inline-flex items-center gap-1.5 font-medium hover:text-foreground hover:underline"
                  href={`/denunciar?tipo=comment&url=${encodeURIComponent(
                    `/classificacoes/${memberId}#comentario-${grade.$id}`
                  )}`}>
                  <Flag aria-hidden className="size-3.5" />
                  Denunciar
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="grade-timeline" className="grid gap-5">
      <header>
        <div className="flex items-center gap-2">
          <Clock3 aria-hidden className="size-5 text-accent" />
          <h2 id="grade-timeline" className="text-xl font-semibold">
            Histórico de notas
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A cronologia não inclui nomes, perfis ou qualquer outro dado de quem
          classificou.
        </p>
      </header>

      {orderedGrades.length > 0 ? (
        <ol className="relative ml-2 border-l border-border">
          {orderedGrades.map((grade) => (
            <li key={grade.$id} className="relative pb-6 pl-6 last:pb-0">
              <span
                aria-hidden
                className="absolute top-1 -left-1.5 size-3 rounded-full border-2 border-card bg-accent"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">Nota {grade.grade}/20</p>
                <GradeTime grade={grade} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Publicada anonimamente
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid min-h-48 place-items-center rounded-3xl border border-dashed bg-background/40 p-6 text-center">
          <div>
            <p className="font-medium">Ainda não existem classificações.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A primeira nota aparecerá aqui sem identificar o seu autor.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
