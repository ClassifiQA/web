import { Bell, Mail } from "lucide-react"

import type { NotificationPreferences } from "@/lib/store/auth"

import { PreferenceToggle, ProfileButton } from "./profile-controls"
import { profilePanelClassName } from "./profile-model"

type NotificationsPanelProps = {
  email: string
  preferences: NotificationPreferences
  error: string | null
  isDirty: boolean
  isSaving: boolean
  onChange: (preference: keyof NotificationPreferences, value: boolean) => void
  onReset: () => void
  onSave: () => void
}

export const NotificationsPanel = ({
  email,
  preferences,
  error,
  isDirty,
  isSaving,
  onChange,
  onReset,
  onSave,
}: NotificationsPanelProps) => {
  // ui
  return (
    <section
      id="profile-panel-notifications"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="profile-tab-notifications"
      className={profilePanelClassName}>
      {/* header */}
      <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-xl font-semibold">Notificações</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Escolhe quando e como queres receber alertas.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {/* email notifications */}
        <div className="mb-2 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
            <Mail className="size-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">E-mail</h3>
            <p className="truncate text-sm text-muted-foreground">
              Preferências para mensagens enviadas para {email}.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <PreferenceToggle
            label="Avaliações e respostas"
            description="Recebe um aviso quando há atividade nas tuas avaliações."
            checked={preferences.replies}
            disabled={isSaving}
            onChange={(checked) => onChange("replies", checked)}
          />
        </div>

        {/* in-app notifications */}
        <div className="mt-3 mb-1 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Bell className="size-4.5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Na plataforma</h3>
            <p className="text-sm text-muted-foreground">
              Preferências guardadas na tua conta e sincronizadas entre
              dispositivos.
            </p>
          </div>
        </div>

        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="md:pr-5">
            <PreferenceToggle
              label="Alertas de segurança"
              description="Atividade importante relacionada com a conta."
              checked={preferences.security}
              disabled={isSaving}
              onChange={(checked) => onChange("security", checked)}
            />
          </div>
          <div className="md:pl-5">
            <PreferenceToggle
              label="Notificações no navegador"
              description="Preferência da conta para alertas em navegadores compatíveis."
              checked={preferences.browser}
              disabled={isSaving}
              onChange={(checked) => onChange("browser", checked)}
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Estas preferências ficam guardadas na conta; o envio depende dos
          canais de notificação configurados pelo ClassifiQA. Os alertas
          essenciais do serviço de autenticação podem continuar ativos por
          segurança.
        </p>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {/* actions */}
      <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-muted/50 px-5 py-3 sm:px-6">
        <ProfileButton
          variant="secondary"
          disabled={!isDirty || isSaving}
          onClick={onReset}>
          Repor
        </ProfileButton>
        <ProfileButton disabled={!isDirty || isSaving} onClick={onSave}>
          {isSaving ? "A guardar…" : "Guardar preferências"}
        </ProfileButton>
      </div>
    </section>
  )
}

// props
