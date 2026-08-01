import { CircleAlert, Pencil } from "lucide-react"
import type { SubmitEvent } from "react"

import type { AuthUser } from "@/lib/store/auth"

import { PasswordField, ProfileButton, ProfileField } from "./profile-controls"
import {
  getInitials,
  profilePanelClassName,
  type ProfileForm,
} from "./profile-model"

type PersonalPanelProps = {
  user: AuthUser
  editing: boolean
  form: ProfileForm
  emailPassword: string
  error: string | null
  isSaving: boolean
  isSendingVerification: boolean
  onEditingChange: (editing: boolean) => void
  onEmailPasswordChange: (password: string) => void
  onFieldChange: (name: keyof ProfileForm, value: string) => void
  onCancel: () => void
  onSave: (event: SubmitEvent<HTMLFormElement>) => void
  onSendVerification: () => void
  onDeactivate: () => void
}

export const PersonalPanel = ({
  user,
  editing,
  form,
  emailPassword,
  error,
  isSaving,
  isSendingVerification,
  onEditingChange,
  onEmailPasswordChange,
  onFieldChange,
  onCancel,
  onSave,
  onSendVerification,
  onDeactivate,
}: PersonalPanelProps) => {
  const emailChanged = user.email !== form.email.trim()

  // ui
  return (
    <section
      id="profile-panel-profile"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="profile-tab-profile"
      className={profilePanelClassName}>
      {/* header */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:items-center sm:gap-4 sm:px-6">
        <div>
          <h2 className="text-xl font-semibold">Dados pessoais</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Informação visível apenas para ti.
          </p>
        </div>
        {!editing ? (
          <ProfileButton
            variant="secondary"
            className="px-3"
            onClick={() => onEditingChange(true)}>
            <Pencil className="size-4" aria-hidden />
            <span className="hidden min-[390px]:inline">Editar perfil</span>
            <span className="min-[390px]:hidden">Editar</span>
          </ProfileButton>
        ) : null}
      </div>

      {!user.emailVerification ? (
        <div className="flex flex-col gap-3 border-b border-amber-500/20 bg-amber-500/10 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            Confirma o teu endereço de e-mail para poderes ativar a proteção
            adicional da conta.
          </div>
          <button
            type="button"
            disabled={isSendingVerification}
            onClick={onSendVerification}
            className="shrink-0 text-left font-semibold text-amber-800 hover:underline disabled:opacity-50 dark:text-amber-200">
            {isSendingVerification ? "A enviar…" : "Reenviar confirmação"}
          </button>
        </div>
      ) : null}

      {/* profile form */}
      <form onSubmit={onSave} className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          {/* avatar */}
          <div className="mb-5 flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-accent/10 text-xl font-bold text-accent">
              {getInitials(form.name)}
            </div>
            <div>
              <p className="text-sm font-semibold">Identificação da conta</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                As iniciais são geradas automaticamente a partir do teu nome de
                utilizador.
              </p>
            </div>
          </div>

          {/* fields */}
          <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
            <ProfileField
              label="Nome de utilizador"
              name="name"
              form={form}
              editing={editing}
              onChange={onFieldChange}
            />
            <ProfileField
              label="E-mail"
              name="email"
              type="email"
              form={form}
              editing={editing}
              onChange={onFieldChange}
            />
            <ProfileField
              label="Função"
              name="role"
              form={form}
              editing={editing}
              onChange={onFieldChange}
            />
            <ProfileField
              label="Escola ou instituição"
              name="school"
              form={form}
              editing={editing}
              onChange={onFieldChange}
            />
          </div>

          {editing && emailChanged ? (
            <div className="mt-4 max-w-md rounded-lg border border-border bg-muted/40 p-4">
              <PasswordField
                label="Palavra-passe atual"
                autoComplete="current-password"
                required
                disabled={isSaving}
                value={emailPassword}
                onChange={(event) => onEmailPasswordChange(event.target.value)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                É necessária para alterar o e-mail. O novo endereço terá de ser
                confirmado.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {editing ? (
          /* form actions */
          <div className="grid grid-cols-2 gap-3 border-t border-border bg-muted/50 px-4 py-3 sm:flex sm:items-center sm:justify-end sm:px-6">
            <ProfileButton
              variant="secondary"
              disabled={isSaving}
              onClick={onCancel}>
              Cancelar
            </ProfileButton>
            <ProfileButton type="submit" disabled={isSaving}>
              {isSaving ? "A guardar…" : "Guardar"}
            </ProfileButton>
          </div>
        ) : null}
      </form>

      {/* danger zone */}
      <div className="flex shrink-0 flex-col gap-4 border-t border-destructive/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-4 text-destructive" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold">Eliminar conta</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Elimina a conta, as classificações e os comentários associados.
            </p>
          </div>
        </div>
        <ProfileButton
          variant="danger"
          className="w-full shrink-0 sm:w-auto"
          onClick={onDeactivate}>
          Eliminar conta
        </ProfileButton>
      </div>
    </section>
  )
}
