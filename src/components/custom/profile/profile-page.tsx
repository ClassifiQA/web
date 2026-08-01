import { Check, CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

import { DeactivateAccountDialog } from "./deactivate-account-dialog"
import { MfaDisableDialog } from "./mfa-disable-dialog"
import { MfaProtectedActionDialog } from "./mfa-protected-action-dialog"
import { MfaSetupDialog } from "./mfa-setup-dialog"
import { NotificationsPanel } from "./notifications-panel"
import { PersonalPanel } from "./personal-panel"
import { panelNavigation } from "./profile-model"
import {
  ProfileAuthError,
  ProfileLoading,
  ProfileSignIn,
} from "./profile-status"
import { SecurityPanel } from "./security-panel"
import { useProfilePageController } from "./use-profile-page-controller"

export const ProfilePage = () => {
  const {
    activatePanel,
    activePanel,
    authError,
    beginMfaActionChallenge,
    cancelCurrentMfaSetup,
    cancelEditing,
    changeMfa,
    changeTabWithKeyboard,
    completeMfaActionChallenge,
    completeMfaSetup,
    confirmDeactivation,
    confirmMfaDisable,
    createMfaChallenge,
    currentUser,
    deactivateDialogOpen,
    deactivateError,
    editing,
    emailPassword,
    endingSessionId,
    endAllOtherSessions,
    endOneSession,
    feedback,
    form,
    isChangingMfa,
    isDeactivating,
    isDesktopLayout,
    isEndingOtherSessions,
    isLoading,
    isLoadingSessions,
    isSavingNotifications,
    isSavingPassword,
    isSavingProfile,
    isSendingVerification,
    loadSessions,
    mfaActivation,
    mfaDialogOpen,
    mfaDisableDialogOpen,
    mfaError,
    mfaProtectedAction,
    mfaSetup,
    notifications,
    notificationsDirty,
    notificationsError,
    passwordError,
    passwords,
    profileError,
    resetNotifications,
    retryAuth,
    retryMfaActivation,
    runMfaProtectedAction,
    saveNotifications,
    savePassword,
    saveProfile,
    savedForm,
    sendVerification,
    sessions,
    sessionsError,
    setDeactivateDialogOpen,
    setDeactivateError,
    setEditing,
    setEmailPassword,
    setFormDraft,
    setMfaActivation,
    setMfaDialogOpen,
    setMfaDisableDialogOpen,
    setMfaError,
    setMfaProtectedAction,
    setMfaSetup,
    setPasswords,
    setProfileError,
    updateField,
    updateNotification,
  } = useProfilePageController()

  if (isLoading) {
    return <ProfileLoading />
  }

  if (authError && !currentUser) {
    return (
      <ProfileAuthError message={authError} onRetry={() => void retryAuth()} />
    )
  }

  if (!currentUser) {
    return <ProfileSignIn />
  }

  // ui
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto text-foreground">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col px-4 py-4 sm:px-8 lg:h-full lg:min-h-0">
        {/* title & feedback */}
        <div className="mb-4 flex shrink-0 items-end justify-between gap-6 sm:mb-5">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-accent">
              A MINHA CONTA
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Perfil
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere os teus dados pessoais e preferências da conta.
            </p>
          </div>

          <div
            aria-live="polite"
            aria-hidden={!feedback}
            className={cn(
              "hidden min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-opacity sm:flex",
              feedback?.type === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-accent/10 text-accent",
              feedback ? "opacity-100" : "pointer-events-none opacity-0"
            )}>
            {feedback ? (
              feedback.type === "error" ? (
                <CircleAlert className="size-4" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )
            ) : null}
            {feedback?.message ?? ""}
          </div>
        </div>

        {feedback ? (
          <div
            aria-live="polite"
            className={cn(
              "mb-4 flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium sm:hidden",
              feedback.type === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-accent/10 text-accent"
            )}>
            {feedback.type === "error" ? (
              <CircleAlert className="size-4" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            {feedback.message}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 items-start gap-4 sm:gap-6 lg:grid-cols-[240px_1fr] lg:items-stretch">
          {/* navigation */}
          <aside>
            <nav
              role="tablist"
              className="grid grid-cols-3 gap-1 lg:grid-cols-1"
              aria-label="Definições da conta"
              aria-orientation={isDesktopLayout ? "vertical" : "horizontal"}>
              {panelNavigation.map(({ id, label, icon: Icon }) => {
                const isActive = activePanel === id
                return (
                  <button
                    key={id}
                    type="button"
                    id={`profile-tab-${id}`}
                    role="tab"
                    tabIndex={isActive ? 0 : -1}
                    aria-controls={isActive ? `profile-panel-${id}` : undefined}
                    aria-selected={isActive}
                    onClick={() => activatePanel(id)}
                    onKeyDown={(event) => changeTabWithKeyboard(event, id)}
                    className={cn(
                      "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:h-12 sm:flex-row sm:gap-3 sm:px-3.5 sm:py-0 sm:text-left sm:text-sm lg:w-full",
                      isActive
                        ? "bg-accent/10 font-semibold text-accent"
                        : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                    <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* active panel */}
          <div className="h-176 min-h-0 min-w-0 lg:h-140">
            {activePanel === "profile" ? (
              <PersonalPanel
                user={currentUser}
                editing={editing}
                form={form}
                emailPassword={emailPassword}
                error={profileError}
                isSaving={isSavingProfile}
                isSendingVerification={isSendingVerification}
                onEditingChange={(next) => {
                  setProfileError(null)
                  if (next) setFormDraft(savedForm)
                  setEditing(next)
                }}
                onEmailPasswordChange={setEmailPassword}
                onFieldChange={updateField}
                onCancel={cancelEditing}
                onSave={saveProfile}
                onSendVerification={sendVerification}
                onDeactivate={() => setDeactivateDialogOpen(true)}
              />
            ) : null}

            {activePanel === "security" ? (
              <SecurityPanel
                user={currentUser}
                passwords={passwords}
                passwordError={passwordError}
                isSavingPassword={isSavingPassword}
                sessions={sessions}
                sessionsError={sessionsError}
                isLoadingSessions={isLoadingSessions}
                endingSessionId={endingSessionId}
                isEndingOtherSessions={isEndingOtherSessions}
                mfaError={mfaError}
                isChangingMfa={isChangingMfa}
                onPasswordsChange={setPasswords}
                onSavePassword={savePassword}
                onMfaChange={changeMfa}
                onRegenerateMfaCodes={() => setMfaProtectedAction("recovery")}
                onReconfigureMfa={() => setMfaProtectedAction("reconfigure")}
                onRefreshSessions={loadSessions}
                onEndSession={endOneSession}
                onEndOtherSessions={endAllOtherSessions}
              />
            ) : null}

            {activePanel === "notifications" ? (
              <NotificationsPanel
                email={currentUser.email}
                preferences={notifications}
                error={notificationsError}
                isDirty={notificationsDirty}
                isSaving={isSavingNotifications}
                onChange={updateNotification}
                onReset={resetNotifications}
                onSave={saveNotifications}
              />
            ) : null}
          </div>
        </div>
      </div>

      {mfaDialogOpen && (mfaSetup || mfaActivation) ? (
        <MfaSetupDialog
          open
          setup={mfaSetup}
          initialActivation={mfaActivation}
          onOpenChange={(open) => {
            setMfaDialogOpen(open)

            if (!open) {
              setMfaSetup(null)
              setMfaActivation(null)
            }
          }}
          onCancel={cancelCurrentMfaSetup}
          onConfirm={completeMfaSetup}
          onRetry={retryMfaActivation}
        />
      ) : null}

      {mfaDisableDialogOpen ? (
        <MfaDisableDialog
          open
          error={mfaError}
          isSubmitting={isChangingMfa}
          onOpenChange={(open) => {
            if (isChangingMfa) return
            setMfaDisableDialogOpen(open)
            if (!open) setMfaError(null)
          }}
          onConfirm={confirmMfaDisable}
        />
      ) : null}

      {mfaProtectedAction ? (
        <MfaProtectedActionDialog
          open
          action={mfaProtectedAction}
          onOpenChange={(open) => {
            if (!open) setMfaProtectedAction(null)
          }}
          onBegin={beginMfaActionChallenge}
          onSwitchFactor={createMfaChallenge}
          onConfirmChallenge={completeMfaActionChallenge}
          onRunAction={() => runMfaProtectedAction(mfaProtectedAction)}
        />
      ) : null}

      {deactivateDialogOpen ? (
        <DeactivateAccountDialog
          open
          error={deactivateError}
          isSubmitting={isDeactivating}
          onOpenChange={(open) => {
            setDeactivateDialogOpen(open)
            if (!open) setDeactivateError(null)
          }}
          onConfirm={confirmDeactivation}
        />
      ) : null}
    </div>
  )
}
