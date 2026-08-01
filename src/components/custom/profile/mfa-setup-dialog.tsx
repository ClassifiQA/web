import { Copy, KeyRound } from "lucide-react"
import { type SubmitEvent, useState } from "react"

import { type MfaConfirmationResult } from "@/lib/hooks/backend/client/services/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ProfileButton } from "./profile-controls"
import type { MfaSetup } from "./profile-model"

type MfaSetupDialogProps = {
  open: boolean
  setup: MfaSetup | null
  initialActivation: MfaConfirmationResult | null
  onOpenChange: (open: boolean) => void
  onCancel: () => Promise<true | Error>
  onConfirm: (otp: string) => Promise<MfaConfirmationResult | Error>
  onRetry: () => Promise<MfaConfirmationResult | Error>
}

export const MfaSetupDialog = ({
  open,
  setup,
  initialActivation,
  onOpenChange,
  onCancel,
  onConfirm,
  onRetry,
}: MfaSetupDialogProps) => {
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activation, setActivation] = useState<MfaConfirmationResult | null>(
    initialActivation
  )
  const [copied, setCopied] = useState(false)

  const cancelSetup = async () => {
    setError(null)
    setIsSubmitting(true)

    const result = await onCancel()

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return

    // completed setup must be acknowledged explicitly
    if (!nextOpen && activation) return

    if (!nextOpen) {
      void cancelSetup()
      return
    }

    onOpenChange(nextOpen)
  }

  const confirmSetup = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await onConfirm(otp)

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    setActivation(result)
  }

  const retryActivation = async () => {
    setError(null)
    setIsSubmitting(true)

    const result = await onRetry()

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    setActivation((current) => ({
      ...result,
      recoveryCodes: current?.recoveryCodes.length
        ? current.recoveryCodes
        : result.recoveryCodes,
    }))
  }

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(
        activation?.recoveryCodes.join("\n") ?? ""
      )
      setCopied(true)
    } catch {
      setError("Não foi possível copiar os códigos.")
    }
  }

  // ui
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton={!activation && !isSubmitting}>
        <DialogHeader>
          <DialogTitle>Autenticação de dois fatores</DialogTitle>
          <DialogDescription>
            {activation
              ? "Revê o estado da proteção e guarda os códigos disponíveis."
              : "Associa uma aplicação autenticadora à tua conta."}
          </DialogDescription>
        </DialogHeader>

        {setup && !activation ? (
          <form className="grid gap-4" onSubmit={confirmSetup}>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
              <img
                src={setup.qr}
                width={160}
                height={160}
                alt="Código QR para configurar a aplicação autenticadora"
                className="mx-auto rounded-lg border border-border bg-white p-2"
              />
              <div>
                <p className="text-sm font-medium">
                  Lê o código com a tua aplicação autenticadora.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Se não conseguires usar o QR, introduz esta chave manualmente:
                </p>
                <code className="mt-2 block rounded-md bg-muted p-2 text-xs break-all">
                  {setup.secret}
                </code>
              </div>
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Código de 6 dígitos</span>
              <input
                value={otp}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                disabled={isSubmitting}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ProfileButton
                variant="secondary"
                disabled={isSubmitting}
                onClick={cancelSetup}>
                Cancelar
              </ProfileButton>
              <ProfileButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "A verificar…" : "Verificar e ativar"}
              </ProfileButton>
            </div>
          </form>
        ) : null}

        {activation ? (
          <div className="grid gap-4">
            {activation.recoveryCodes.length ? (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
                  <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p className="text-sm">
                    Cada código só pode ser usado uma vez. Guarda-os num local
                    seguro; não voltarão a ser apresentados.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
                  {activation.recoveryCodes.map((code) => (
                    <code key={code}>{code}</code>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
                <KeyRound
                  className="mt-0.5 size-4 shrink-0 text-accent"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Já existem códigos de recuperação associados à conta. Os
                  códigos que guardaste anteriormente continuam válidos.
                </p>
              </div>
            )}

            {activation.error || error ? (
              <p className="text-sm text-destructive" role="alert">
                {error ?? activation.error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {activation.recoveryCodes.length ? (
                <ProfileButton variant="secondary" onClick={copyRecoveryCodes}>
                  <Copy className="size-4" aria-hidden />
                  {copied ? "Copiados" : "Copiar códigos"}
                </ProfileButton>
              ) : null}
              {activation.enabled ? (
                <ProfileButton onClick={() => onOpenChange(false)}>
                  {activation.recoveryCodes.length
                    ? "Já guardei os códigos"
                    : "Concluir"}
                </ProfileButton>
              ) : (
                <>
                  <ProfileButton
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => onOpenChange(false)}>
                    {activation.recoveryCodes.length
                      ? "Já guardei - tentar mais tarde"
                      : "Fechar e tentar mais tarde"}
                  </ProfileButton>
                  <ProfileButton
                    disabled={isSubmitting}
                    onClick={retryActivation}>
                    {isSubmitting ? "A ativar…" : "Tentar ativar novamente"}
                  </ProfileButton>
                </>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// props
