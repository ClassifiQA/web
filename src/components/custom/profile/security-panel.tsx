import {
  Laptop,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import type { SubmitEvent } from "react"
import type { Models } from "appwrite"

import { Switch } from "@/components/ui/switch"
import type { AuthUser } from "@/lib/store/auth"
import { cn } from "@/lib/utils"

import { PasswordField, ProfileButton } from "./profile-controls"
import { formatSessionDate, profilePanelClassName } from "./profile-model"

type Passwords = {
  current: string
  next: string
  confirmation: string
}

// props
type SecurityPanelProps = {
  user: AuthUser
  passwords: Passwords
  passwordError: string | null
  isSavingPassword: boolean
  sessions: Models.Session[]
  sessionsError: string | null
  isLoadingSessions: boolean
  endingSessionId: string | null
  isEndingOtherSessions: boolean
  mfaError: string | null
  isChangingMfa: boolean
  onPasswordsChange: (passwords: Passwords) => void
  onSavePassword: (event: SubmitEvent<HTMLFormElement>) => void
  onMfaChange: (enabled: boolean) => void
  onRegenerateMfaCodes: () => void
  onReconfigureMfa: () => void
  onRefreshSessions: () => void
  onEndSession: (sessionId: string) => void
  onEndOtherSessions: () => void
}

export const SecurityPanel = ({
  user,
  passwords,
  passwordError,
  isSavingPassword,
  sessions,
  sessionsError,
  isLoadingSessions,
  endingSessionId,
  isEndingOtherSessions,
  mfaError,
  isChangingMfa,
  onPasswordsChange,
  onSavePassword,
  onMfaChange,
  onRegenerateMfaCodes,
  onReconfigureMfa,
  onRefreshSessions,
  onEndSession,
  onEndOtherSessions,
}: SecurityPanelProps) => {
  const otherSessions = sessions.filter((session) => !session.current)

  // ui
  return (
    <section
      id="profile-panel-security"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="profile-tab-security"
      className={profilePanelClassName}>
      {/* header */}
      <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-xl font-semibold">Segurança</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Protege o acesso à tua conta e revê as sessões ativas.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 sm:p-6 xl:grid-cols-2 xl:overflow-hidden">
        {/* password */}
        <form
          onSubmit={onSavePassword}
          className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
              <LockKeyhole className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Alterar palavra-passe</h3>
              <p className="text-sm text-muted-foreground">
                Usa pelo menos 8 caracteres.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <PasswordField
              label="Palavra-passe atual"
              autoComplete="current-password"
              required
              disabled={isSavingPassword}
              value={passwords.current}
              onChange={(event) =>
                onPasswordsChange({
                  ...passwords,
                  current: event.target.value,
                })
              }
            />
            <PasswordField
              label="Nova palavra-passe"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isSavingPassword}
              value={passwords.next}
              onChange={(event) =>
                onPasswordsChange({ ...passwords, next: event.target.value })
              }
            />
            <PasswordField
              label="Confirmar nova palavra-passe"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isSavingPassword}
              value={passwords.confirmation}
              onChange={(event) =>
                onPasswordsChange({
                  ...passwords,
                  confirmation: event.target.value,
                })
              }
            />
          </div>

          <div className="mt-4 flex min-h-10 items-center justify-between gap-4">
            <p className="text-xs text-destructive" role="alert">
              {passwordError}
            </p>
            <ProfileButton
              type="submit"
              className="shrink-0"
              disabled={isSavingPassword}>
              {isSavingPassword ? "A atualizar…" : "Atualizar"}
            </ProfileButton>
          </div>
        </form>

        <div className="grid content-start gap-4 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
          {/* two-factor authentication */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <ShieldCheck className="size-4.5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">
                    Autenticação de dois fatores
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Protege a conta com uma aplicação autenticadora e códigos de
                    recuperação.
                  </p>
                </div>
              </div>
              <Switch
                checked={user.mfa}
                onCheckedChange={onMfaChange}
                aria-label="Autenticação de dois fatores"
                aria-describedby="mfa-description"
                disabled={isChangingMfa}
                className="mt-1"
              />
            </div>
            <p
              id="mfa-description"
              className="mt-3 text-xs text-muted-foreground">
              Ao desativar, a aplicação e os códigos associados são mantidos
              para uma futura reativação.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {user.mfa ? (
                <button
                  type="button"
                  disabled={isChangingMfa}
                  onClick={onRegenerateMfaCodes}
                  className="text-xs font-semibold text-accent hover:underline disabled:opacity-50">
                  Gerar novos códigos
                </button>
              ) : null}
              <button
                type="button"
                disabled={isChangingMfa}
                onClick={onReconfigureMfa}
                className="text-xs font-semibold text-accent hover:underline disabled:opacity-50">
                Configurar nova aplicação
              </button>
            </div>
            {mfaError ? (
              <p className="mt-3 text-xs text-destructive" role="alert">
                {mfaError}
              </p>
            ) : null}
          </div>

          {/* active sessions */}
          <div className="rounded-xl border border-border p-4 xl:flex xl:min-h-0 xl:flex-col">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Laptop className="size-4.5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Sessões ativas</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dispositivos com acesso à tua conta.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Atualizar sessões"
                disabled={
                  isLoadingSessions ||
                  isEndingOtherSessions ||
                  Boolean(endingSessionId)
                }
                onClick={onRefreshSessions}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                <RefreshCw
                  className={cn("size-4", isLoadingSessions && "animate-spin")}
                  aria-hidden
                />
              </button>
            </div>

            {isLoadingSessions && !sessions.length ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />A
                carregar sessões…
              </div>
            ) : null}

            <div className="grid max-h-64 min-h-0 flex-1 gap-2 overflow-y-auto overscroll-contain xl:max-h-none">
              {sessions.map((session) => (
                <SessionItem
                  key={session.$id}
                  session={session}
                  disabled={isEndingOtherSessions || Boolean(endingSessionId)}
                  isEnding={endingSessionId === session.$id}
                  onEnd={() => onEndSession(session.$id)}
                />
              ))}
            </div>

            {sessionsError ? (
              <p className="mt-3 text-xs text-destructive" role="alert">
                {sessionsError}
              </p>
            ) : null}

            <ProfileButton
              variant="secondary"
              className="mt-4 w-full shrink-0"
              disabled={
                !otherSessions.length ||
                isEndingOtherSessions ||
                Boolean(endingSessionId)
              }
              onClick={onEndOtherSessions}>
              {isEndingOtherSessions
                ? "A terminar sessões…"
                : otherSessions.length
                  ? "Terminar outras sessões"
                  : "Não existem outras sessões"}
            </ProfileButton>
          </div>
        </div>
      </div>
    </section>
  )
}

// props
type SessionItemProps = {
  session: Models.Session
  disabled: boolean
  isEnding: boolean
  onEnd: () => void
}

const SessionItem = ({
  session,
  disabled,
  isEnding,
  onEnd,
}: SessionItemProps) => {
  const device =
    session.clientName ||
    session.deviceName ||
    session.clientType ||
    "Dispositivo desconhecido"
  const details = [session.osName, session.countryName]
    .filter(Boolean)
    .join(" · ")

  // ui
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{device}</p>
        <p className="truncate text-xs text-muted-foreground">
          {details || "Localização indisponível"} ·{" "}
          {formatSessionDate(session.$updatedAt)}
        </p>
        {session.current ? (
          <p className="mt-0.5 text-xs font-medium text-accent">Esta sessão</p>
        ) : null}
      </div>
      {!session.current ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onEnd}
          className="shrink-0 text-xs font-semibold text-destructive hover:underline disabled:opacity-50">
          {isEnding ? "A terminar…" : "Terminar"}
        </button>
      ) : null}
    </div>
  )
}

// props
