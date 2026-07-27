import { MemberGrade } from "./grade"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CurrentUserGrade } from "@/lib/hooks/backend/client/services/grades"
import { ShieldCheck } from "lucide-react"
import { useId, useState, type SubmitEvent } from "react"

const MAX_COMMENT_LENGTH = 1000

const formatGradeDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}

type GradeDialogProps = {
  open: boolean
  memberName: string
  currentGrade: CurrentUserGrade | null
  isAuthenticated: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: {
    grade: number
    comment?: string
  }) => Promise<true | Error>
}

export const GradeDialog = ({
  open,
  memberName,
  currentGrade,
  isAuthenticated,
  onOpenChange,
  onSubmit,
}: GradeDialogProps) => {
  const gradeId = useId()
  const commentId = useId()
  const [grade, setGrade] = useState(10)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    setError(null)
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await onSubmit({
      grade,
      comment: comment.trim() || undefined,
    })

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    setComment("")
    onOpenChange(false)
  }

  const currentGradeDate = currentGrade
    ? formatGradeDate(currentGrade.$createdAt)
    : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton={!isSubmitting}>
        {!isAuthenticated ? (
          <>
            <DialogHeader>
              <DialogTitle>Inicia sessão para dar nota</DialogTitle>
              <DialogDescription>
                Precisas de uma conta para garantir que cada pessoa classifica
                este membro apenas uma vez.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-3xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              Podes iniciar sessão através de “A Minha Conta” e voltar a esta
              página para classificar {memberName}.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : currentGrade ? (
          <>
            <DialogHeader>
              <DialogTitle>A minha nota</DialogTitle>
              <DialogDescription>
                Esta é a classificação que deste a {memberName}. Cada membro só
                pode ser classificado uma vez por conta.
              </DialogDescription>
            </DialogHeader>

            <div className="grid justify-items-center gap-4 rounded-3xl border bg-muted/30 p-6 text-center">
              <MemberGrade
                grade={currentGrade.grade}
                radius={42}
                tooltipLabel="A tua nota"
              />
              {currentGrade.comment ? (
                <blockquote className="max-w-sm text-sm leading-relaxed text-foreground">
                  “{currentGrade.comment}”
                </blockquote>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Não adicionaste um comentário.
                </p>
              )}
              {currentGradeDate ? (
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={currentGrade.$createdAt}>
                  {currentGradeDate}
                </time>
              ) : null}
            </div>

            <AnonymityNotice />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Dar nota a {memberName}</DialogTitle>
              <DialogDescription>
                Escolhe uma nota entre 0 e 20. O comentário é opcional.
              </DialogDescription>
            </DialogHeader>

            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid justify-items-center gap-4 rounded-3xl border bg-muted/30 p-5">
                <MemberGrade
                  grade={grade}
                  radius={42}
                  tooltipLabel="Nota selecionada"
                />
                <label className="w-full text-sm font-medium" htmlFor={gradeId}>
                  Nota
                </label>
                <input
                  id={gradeId}
                  className="h-2 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={grade}
                  disabled={isSubmitting}
                  onChange={(event) => setGrade(Number(event.target.value))}
                />
                <div
                  aria-hidden
                  className="flex w-full justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                </div>
              </div>

              <label className="grid gap-2" htmlFor={commentId}>
                <span className="flex items-center justify-between gap-3 text-sm font-medium">
                  Comentário
                  <span className="font-normal text-muted-foreground">
                    Opcional
                  </span>
                </span>
                <textarea
                  id={commentId}
                  className="min-h-28 resize-y rounded-3xl border border-transparent bg-input/50 px-4 py-3 text-sm transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength={MAX_COMMENT_LENGTH}
                  placeholder="Partilha o motivo da tua nota, sem incluir informação pessoal."
                  value={comment}
                  disabled={isSubmitting}
                  onChange={(event) => setComment(event.target.value)}
                />
                <span className="text-right text-xs text-muted-foreground">
                  {comment.length}/{MAX_COMMENT_LENGTH}
                </span>
              </label>

              <AnonymityNotice />

              {error ? (
                <p
                  className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert">
                  {error}
                </p>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "A guardar…" : "Publicar nota"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

const AnonymityNotice = () => (
  <div className="flex gap-3 rounded-3xl bg-accent/10 p-4 text-sm text-muted-foreground">
    <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
    <p>
      A classificação é pública, mas a tua identidade nunca é apresentada nem
      enviada para outros utilizadores.
    </p>
  </div>
)
