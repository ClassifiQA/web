import { AuthenticationFactor } from "appwrite"
import { type SubmitEvent, useState } from "react"

import { type SignInMfaChallenge } from "@/lib/hooks/backend/client/services/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ProfileButton } from "./profile-controls"
import type { MfaProtectedAction } from "./profile-model"

const protectedMfaFactorCopy: Record<
  AuthenticationFactor,
  { action: string; description: string; label: string }
> = {
  [AuthenticationFactor.Totp]: {
    action: "Usar aplicação autenticadora",
    description:
      "Introduz o código apresentado na tua aplicação autenticadora.",
    label: "Código da aplicação",
  },
  [AuthenticationFactor.Email]: {
    action: "Receber código por e-mail",
    description: "Enviámos um código de confirmação para o teu e-mail.",
    label: "Código recebido por e-mail",
  },
  [AuthenticationFactor.Phone]: {
    action: "Receber código por SMS",
    description: "Enviámos um código de confirmação para o teu telemóvel.",
    label: "Código recebido por SMS",
  },
  [AuthenticationFactor.Recoverycode]: {
    action: "Usar código de recuperação",
    description: "Introduz um dos códigos de recuperação que guardaste.",
    label: "Código de recuperação",
  },
}

// props
type MfaProtectedActionDialogProps = {
  open: boolean
  action: MfaProtectedAction
  onOpenChange: (open: boolean) => void
  onBegin: () => Promise<SignInMfaChallenge | Error>
  onSwitchFactor: (
    factor: AuthenticationFactor
  ) => Promise<SignInMfaChallenge | Error>
  onConfirmChallenge: (
    challengeId: string,
    otp: string
  ) => Promise<true | Error>
  onRunAction: () => Promise<true | Error>
}

export const MfaProtectedActionDialog = ({
  open,
  action,
  onOpenChange,
  onBegin,
  onSwitchFactor,
  onConfirmChallenge,
  onRunAction,
}: MfaProtectedActionDialogProps) => {
  const [challenge, setChallenge] = useState<SignInMfaChallenge | null>(null)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const copy = challenge ? protectedMfaFactorCopy[challenge.factor] : null
  const isRecoveryCode = challenge?.factor === AuthenticationFactor.Recoverycode

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    onOpenChange(nextOpen)
  }

  const beginChallenge = async () => {
    setError(null)
    setIsSubmitting(true)

    const result = await onBegin()

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    setChallenge(result)
  }

  const switchFactor = async (factor: AuthenticationFactor) => {
    setError(null)
    setOtp("")
    setIsSubmitting(true)

    const result = await onSwitchFactor(factor)

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    setChallenge(result)
  }

  const confirmChallenge = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!challenge) return

    setError(null)
    setIsSubmitting(true)

    const challengeResult = await onConfirmChallenge(challenge.challengeId, otp)

    if (challengeResult instanceof Error) {
      setIsSubmitting(false)
      setError(challengeResult.message)
      return
    }

    const actionResult = await onRunAction()

    if (actionResult instanceof Error) {
      setChallenge(null)
      setOtp("")
      setIsSubmitting(false)
      setError(
        `Identidade confirmada, mas a alteração falhou: ${actionResult.message}. Tenta novamente.`
      )
    }
  }

  // ui
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>
            {action === "reuse"
              ? "Reativar fatores existentes?"
              : action === "reconfigure"
                ? "Configurar uma nova aplicação?"
                : "Gerar novos códigos?"}
          </DialogTitle>
          <DialogDescription>
            {challenge
              ? "Confirma a tua identidade para concluir esta alteração."
              : action === "reuse"
                ? "A aplicação autenticadora e os códigos anteriores serão reutilizados."
                : action === "reconfigure"
                  ? "A aplicação atual será removida e os códigos de recuperação serão substituídos."
                  : "Os códigos atuais deixam de funcionar quando o novo conjunto for criado."}
          </DialogDescription>
        </DialogHeader>

        {!challenge ? (
          <>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              {action === "reuse"
                ? "Continua apenas se ainda tens acesso a um dos fatores associados."
                : action === "reconfigure"
                  ? "A proteção fica temporariamente desativada até confirmares a nova aplicação."
                  : "Terás de guardar os códigos apresentados no passo seguinte."}
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ProfileButton
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}>
                Cancelar
              </ProfileButton>
              <ProfileButton disabled={isSubmitting} onClick={beginChallenge}>
                {isSubmitting ? "A preparar…" : "Confirmar identidade"}
              </ProfileButton>
            </div>
          </>
        ) : null}

        {challenge && copy ? (
          <form className="grid gap-4" onSubmit={confirmChallenge}>
            <div>
              <p className="text-sm font-medium">{copy.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.description}
              </p>
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Código</span>
              <input
                value={otp}
                required
                autoComplete="one-time-code"
                inputMode={isRecoveryCode ? "text" : "numeric"}
                pattern={isRecoveryCode ? undefined : "[0-9]{6}"}
                minLength={isRecoveryCode ? 1 : 6}
                maxLength={isRecoveryCode ? 128 : 6}
                disabled={isSubmitting}
                onChange={(event) =>
                  setOtp(
                    isRecoveryCode
                      ? event.target.value
                      : event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {challenge.availableFactors
              .filter((factor) => factor !== challenge.factor)
              .map((factor) => (
                <button
                  key={factor}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => switchFactor(factor)}
                  className="text-left text-sm font-semibold text-accent hover:underline disabled:opacity-50">
                  {protectedMfaFactorCopy[factor].action}
                </button>
              ))}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ProfileButton
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}>
                Cancelar
              </ProfileButton>
              <ProfileButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "A confirmar…" : "Confirmar e continuar"}
              </ProfileButton>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// props
