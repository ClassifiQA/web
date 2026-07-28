import { Button } from "@/components/ui/button"
import { legalDetails } from "@/config/legal"
import {
  type ContentReportReceipt,
  type ContentReportType,
  useClientReports,
} from "@/lib/hooks/backend/client/services/reports"
import { useClientAuth } from "@/lib/hooks/backend/client/services/auth"
import { useAuthStore } from "@/lib/store/auth"
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
} from "lucide-react"
import { useEffect, useId, useState, type SubmitEvent } from "react"

const REPORT_TYPES: { value: ContentReportType; label: string }[] = [
  { value: "comment", label: "Comentário ou classificação" },
  { value: "member", label: "Página de titular de cargo" },
  { value: "account", label: "Conta ou comportamento de utilizador" },
  { value: "other", label: "Outro conteúdo" },
]

export const ContentReportForm = () => {
  const { currentUser, isLoading } = useAuthStore()
  const { getCurrentUser } = useClientAuth()
  const { submitContentReport } = useClientReports()
  const contentUrlId = useId()
  const reasonId = useId()
  const detailsId = useId()
  const websiteId = useId()
  const [contentType, setContentType] = useState<ContentReportType>("comment")
  const [contentUrl, setContentUrl] = useState("")
  const [reason, setReason] = useState("")
  const [locationDetails, setLocationDetails] = useState("")
  const [goodFaith, setGoodFaith] = useState(false)
  const [website, setWebsite] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ContentReportReceipt | null>(null)

  useEffect(() => {
    void getCurrentUser()
    const params = new URLSearchParams(window.location.search)
    const requestedUrl = params.get("url")
    const requestedType = params.get("tipo")
    if (requestedUrl) setContentUrl(requestedUrl)
    if (
      requestedType === "comment" ||
      requestedType === "member" ||
      requestedType === "account" ||
      requestedType === "other"
    ) {
      setContentType(requestedType)
    }
  }, [getCurrentUser])

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await submitContentReport({
      contentType,
      contentUrl,
      reason,
      locationDetails: locationDetails || undefined,
      goodFaith,
      website,
    })

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }
    setReceipt(result)
  }

  if (isLoading) {
    return (
      <div
        className="grid min-h-64 place-items-center rounded-3xl border"
        aria-busy="true">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />A
          verificar a sessão…
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="grid gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex gap-3">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-accent"
            aria-hidden
          />
          <div>
            <h2 className="text-lg font-semibold">Identidade verificada</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              A denúncia estruturada exige uma conta com e-mail confirmado para
              reduzir abuso e permitir comunicar a decisão.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/perfil">Iniciar sessão</Button>
          <Button
            variant="outline"
            href={`mailto:${legalDetails.legalEmail}?subject=Den%C3%BAncia%20de%20conte%C3%BAdo%20ilegal`}>
            Denunciar por e-mail
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          O canal por e-mail está disponível sem conta, incluindo nas exceções
          legais em que o denunciante não tenha de se identificar.
        </p>
      </div>
    )
  }

  if (!currentUser.emailVerification) {
    return (
      <div className="grid gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex gap-3">
          <MailCheck
            className="mt-0.5 size-5 shrink-0 text-accent"
            aria-hidden
          />
          <div>
            <h2 className="text-lg font-semibold">Confirma o teu e-mail</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Confirma {currentUser.email} no perfil antes de enviares a
              denúncia estruturada.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/perfil">Ir para o perfil</Button>
          <Button
            variant="outline"
            href={`mailto:${legalDetails.legalEmail}?subject=Den%C3%BAncia%20de%20conte%C3%BAdo%20ilegal`}>
            Denunciar por e-mail
          </Button>
        </div>
      </div>
    )
  }

  if (receipt) {
    return (
      <div
        className="grid gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8"
        role="status">
        <CheckCircle2 className="size-9 text-accent" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">Denúncia recebida</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Será analisada por uma pessoa. A decisão e as vias de contestação
            serão comunicadas para {currentUser.email}.
          </p>
        </div>
        <div className="rounded-2xl border bg-muted/40 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Referência
          </p>
          <p className="mt-1 font-mono text-sm font-semibold break-all">
            {receipt.reference}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setReceipt(null)
            setReason("")
            setLocationDetails("")
            setGoodFaith(false)
            setWebsite("")
          }}>
          Fazer outra denúncia
        </Button>
      </div>
    )
  }

  return (
    <form
      className="grid gap-5 rounded-3xl border bg-card p-5 shadow-sm sm:p-8"
      onSubmit={handleSubmit}>
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={websiteId}>Website</label>
        <input
          id={websiteId}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
        <p className="font-medium">Denunciante verificado</p>
        <p className="mt-1 text-muted-foreground">
          {currentUser.name || "Utilizador ClassifiQA"} · {currentUser.email}
        </p>
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Tipo de conteúdo</span>
        <select
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          value={contentType}
          disabled={isSubmitting}
          onChange={(event) =>
            setContentType(event.target.value as ContentReportType)
          }>
          {REPORT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5" htmlFor={contentUrlId}>
        <span className="text-sm font-medium">Endereço exato do conteúdo</span>
        <input
          id={contentUrlId}
          type="text"
          inputMode="url"
          required
          maxLength={2048}
          disabled={isSubmitting}
          placeholder="https://classifiqa.pt/classificacoes/…"
          value={contentUrl}
          onChange={(event) => setContentUrl(event.target.value)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>

      <label className="grid gap-1.5" htmlFor={reasonId}>
        <span className="text-sm font-medium">
          Porque consideras o conteúdo ilegal?
        </span>
        <textarea
          id={reasonId}
          required
          minLength={30}
          maxLength={4000}
          rows={7}
          disabled={isSubmitting}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Explica os factos e, se souberes, a regra ou lei aplicável."
        />
        <span className="text-xs text-muted-foreground">
          {reason.length}/4000 · mínimo de 30 caracteres
        </span>
      </label>

      <label className="grid gap-1.5" htmlFor={detailsId}>
        <span className="text-sm font-medium">
          Como localizar o conteúdo?{" "}
          <span className="font-normal">(opcional)</span>
        </span>
        <textarea
          id={detailsId}
          maxLength={2000}
          rows={3}
          disabled={isSubmitting}
          value={locationDetails}
          onChange={(event) => setLocationDetails(event.target.value)}
          className="resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Por exemplo: comentário publicado em determinada data."
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border p-4">
        <input
          className="mt-0.5 size-4 shrink-0 accent-accent"
          type="checkbox"
          required
          disabled={isSubmitting}
          checked={goodFaith}
          onChange={(event) => setGoodFaith(event.target.checked)}
        />
        <span className="text-sm leading-relaxed">
          Declaro de boa-fé que a informação fornecida é exata e completa.
        </span>
      </label>

      {error ? (
        <div
          className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          href={`mailto:${legalDetails.legalEmail}?subject=Den%C3%BAncia%20de%20conte%C3%BAdo%20ilegal`}>
          Usar e-mail
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !goodFaith || reason.trim().length < 30}>
          {isSubmitting ? "A enviar…" : "Enviar denúncia"}
        </Button>
      </div>
    </form>
  )
}
