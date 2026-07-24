import {
  Bell,
  Check,
  CircleAlert,
  Copy,
  KeyRound,
  Laptop,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type SubmitEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { AuthenticationFactor, type Models } from "appwrite"

import { AuthDialog } from "@/components/custom/dialogs/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  type MfaConfirmationResult,
  type MfaSetupResult,
  type SignInMfaChallenge,
  useClientAuth,
} from "@/lib/hooks/backend/client/services/auth"
import {
  type AuthUser,
  type NotificationPreferences,
  useAuthStore,
} from "@/lib/store/auth"
import { cn } from "@/lib/utils"

type PanelId = "profile" | "security" | "notifications"

type ProfileForm = {
  name: string
  email: string
  role: string
  school: string
}

type Feedback = {
  type: "success" | "error"
  message: string
}

type MfaSetup = Extract<MfaSetupResult, { type: "setup" }>
type MfaProtectedAction = "reuse" | "recovery" | "reconfigure"

const defaultNotifications: NotificationPreferences = {
  replies: true,
  weekly: true,
  product: false,
  security: true,
  browser: false,
}

// profile panels
const panelNavigation: {
  id: PanelId
  label: string
  icon: typeof UserRound
}[] = [
  { id: "profile", label: "Dados pessoais", icon: UserRound },
  { id: "security", label: "Segurança", icon: LockKeyhole },
  { id: "notifications", label: "Notificações", icon: Bell },
]

// keep tab semantics aligned with the responsive navigation
const subscribeToDesktopLayout = (onChange: () => void) => {
  const media = window.matchMedia("(min-width: 64rem)")
  media.addEventListener("change", onChange)

  return () => media.removeEventListener("change", onChange)
}

const getDesktopLayout = () => {
  return window.matchMedia("(min-width: 64rem)").matches
}

// map an Appwrite user to the editable form
const getProfileForm = (user: AuthUser): ProfileForm => {
  return {
    name: user.name,
    email: user.email,
    role: user.prefs.profile?.role ?? "",
    school: user.prefs.profile?.school ?? "",
  }
}

// derive initials from the account name
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}

// format a session date in European Portuguese
const formatSessionDate = (value: string) => {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

// props
type ProfileFieldProps = {
  label: string
  name: keyof ProfileForm
  type?: InputHTMLAttributes<HTMLInputElement>["type"]
  form: ProfileForm
  editing: boolean
  onChange: (name: keyof ProfileForm, value: string) => void
}

const ProfileField = ({
  label,
  name,
  type = "text",
  form,
  editing,
  onChange,
}: ProfileFieldProps) => {
  // ui
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <input
        type={type}
        value={form[name]}
        disabled={!editing}
        required={name === "name" || name === "email"}
        maxLength={name === "name" ? 128 : name === "email" ? 320 : 256}
        onChange={(event) => onChange(name, event.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-default disabled:bg-muted disabled:text-muted-foreground"
      />
    </label>
  )
}

// props
type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

const PasswordField = ({ label, ...props }: PasswordFieldProps) => {
  // ui
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <input
        type="password"
        maxLength={256}
        className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </label>
  )
}

// props
type ProfileButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger"
}

const ProfileButton = ({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ProfileButtonProps) => {
  // ui
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-accent text-accent-foreground hover:bg-accent/80",
        variant === "secondary" &&
          "border border-border bg-background text-foreground hover:bg-muted",
        variant === "danger" &&
          "border border-destructive/20 bg-background text-destructive hover:bg-destructive/10",
        className
      )}
      {...props}>
      {children}
    </button>
  )
}

// props
type PreferenceToggleProps = {
  checked: boolean
  description: string
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}

const PreferenceToggle = ({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: PreferenceToggleProps) => {
  const descriptionId = useId()

  // ui
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={descriptionId}
        aria-label={label}
        disabled={disabled}
      />
    </div>
  )
}

export const ProfilePage = () => {
  // auth
  const { authError, currentUser, isLoading } = useAuthStore()
  const {
    activatePreparedMfa,
    beginMfaActionChallenge,
    beginMfaSetup,
    cancelMfaSetup,
    completeMfaActionChallenge,
    confirmMfaSetup,
    createMfaChallenge,
    deactivateAccount,
    disableMfa,
    endOtherSessions,
    endSession,
    getCurrentUser,
    getSessions,
    prepareMfaReconfiguration,
    reactivateMfa,
    regenerateMfaRecoveryCodes,
    updateNotificationPreferences,
    updatePassword,
    updateProfile,
    verify,
  } = useClientAuth()

  // panel state
  const [activePanel, setActivePanel] = useState<PanelId>("profile")

  // profile state
  const [editing, setEditing] = useState(false)
  const [formDraft, setFormDraft] = useState<ProfileForm | null>(null)
  const [emailPassword, setEmailPassword] = useState("")
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)

  // security state
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirmation: "",
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [sessions, setSessions] = useState<Models.Session[]>([])
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null)
  const [isEndingOtherSessions, setIsEndingOtherSessions] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [isChangingMfa, setIsChangingMfa] = useState(false)
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null)
  const [mfaActivation, setMfaActivation] =
    useState<MfaConfirmationResult | null>(null)
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false)
  const [mfaDisableDialogOpen, setMfaDisableDialogOpen] = useState(false)
  const [mfaProtectedAction, setMfaProtectedAction] =
    useState<MfaProtectedAction | null>(null)

  // notification state
  const [notificationDraft, setNotificationDraft] =
    useState<NotificationPreferences | null>(null)
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  )
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)

  // account state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  // feedback state
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionsRequest = useRef(0)

  // saved values
  const savedForm = currentUser
    ? getProfileForm(currentUser)
    : { name: "", email: "", role: "", school: "" }
  const form = formDraft ?? savedForm
  const savedNotifications: NotificationPreferences = {
    ...defaultNotifications,
    ...currentUser?.prefs.notifications,
  }
  const notifications = notificationDraft ?? savedNotifications
  const notificationsDirty = (
    Object.keys(defaultNotifications) as (keyof NotificationPreferences)[]
  ).some(
    (preference) => notifications[preference] !== savedNotifications[preference]
  )
  const isDesktopLayout = useSyncExternalStore(
    subscribeToDesktopLayout,
    getDesktopLayout,
    () => false
  )

  // clear pending feedback
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current)
      }
    }
  }, [])

  // show feedback
  const showFeedback = (type: Feedback["type"], message: string) => {
    setFeedback({ type, message })

    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current)
    }

    feedbackTimer.current = setTimeout(() => setFeedback(null), 3200)
  }

  // load active sessions
  const loadSessions = useCallback(async () => {
    const requestId = ++sessionsRequest.current
    setSessionsError(null)
    setIsLoadingSessions(true)

    const result = await getSessions()

    if (requestId !== sessionsRequest.current) return

    setIsLoadingSessions(false)
    if (result instanceof Error) {
      setSessionsError(result.message)
      return
    }

    setSessions(result)
  }, [getSessions])

  // activate account panel
  const activatePanel = (panel: PanelId) => {
    if (panel === activePanel) return

    if (activePanel === "profile") {
      setEmailPassword("")
      setProfileError(null)
    }

    if (activePanel === "security") {
      setPasswords({ current: "", next: "", confirmation: "" })
      setPasswordError(null)
    }

    setActivePanel(panel)

    if (panel === "security") {
      void loadSessions()
    }
  }

  // update profile field
  const updateField = (name: keyof ProfileForm, value: string) => {
    setFormDraft((current) => ({
      ...(current ?? savedForm),
      [name]: value,
    }))
  }

  // cancel profile changes
  const cancelEditing = () => {
    setFormDraft(null)
    setEmailPassword("")
    setProfileError(null)
    setEditing(false)
  }

  // save profile
  const saveProfile = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentUser) return

    setProfileError(null)
    setIsSavingProfile(true)

    const nextForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role.trim(),
      school: form.school.trim(),
    }
    const emailChanged = currentUser.email !== nextForm.email

    if (emailChanged && !emailPassword) {
      setProfileError(
        "Confirma a palavra-passe atual para alterar o endereço de e-mail."
      )
      setIsSavingProfile(false)
      return
    }

    const result = await updateProfile({
      ...nextForm,
      password: emailChanged ? emailPassword : undefined,
    })

    if (result instanceof Error) {
      setProfileError(result.message)
      setIsSavingProfile(false)
      return
    }

    setFormDraft(null)
    setEmailPassword("")
    setEditing(false)

    if (emailChanged) {
      const verificationResult = await verify()
      setIsSavingProfile(false)

      if (verificationResult instanceof Error) {
        showFeedback(
          "error",
          "Dados guardados, mas não foi possível enviar a confirmação do e-mail."
        )
        return
      }

      showFeedback(
        "success",
        "Dados guardados. Enviámos uma confirmação para o novo e-mail."
      )
      return
    }

    setIsSavingProfile(false)
    showFeedback("success", "Alterações guardadas")
  }

  // send e-mail verification
  const sendVerification = async () => {
    setProfileError(null)
    setIsSendingVerification(true)

    const result = await verify()

    setIsSendingVerification(false)
    if (result instanceof Error) {
      setProfileError(result.message)
      return
    }

    showFeedback("success", "E-mail de confirmação enviado")
  }

  // save password
  const savePassword = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)

    if (passwords.next.length < 8) {
      setPasswordError("A nova palavra-passe deve ter pelo menos 8 caracteres.")
      return
    }

    if (passwords.next !== passwords.confirmation) {
      setPasswordError("As novas palavras-passe não coincidem.")
      return
    }

    setIsSavingPassword(true)
    const result = await updatePassword(passwords.current, passwords.next)

    setIsSavingPassword(false)
    if (result instanceof Error) {
      setPasswordError(result.message)
      return
    }

    setPasswords({ current: "", next: "", confirmation: "" })
    showFeedback("success", "Palavra-passe atualizada")
  }

  // change MFA state
  const changeMfa = async (enabled: boolean) => {
    setMfaError(null)

    if (!enabled) {
      setMfaDisableDialogOpen(true)
      return
    }

    setIsChangingMfa(true)
    const result = await beginMfaSetup()
    setIsChangingMfa(false)

    if (result instanceof Error) {
      setMfaError(result.message)
      return
    }

    if (result.type === "existing") {
      setMfaSetup(null)
      setMfaActivation(null)
      setMfaProtectedAction("reuse")
      return
    }

    setMfaActivation(null)
    setMfaSetup(result)
    setMfaDialogOpen(true)
  }

  // confirm disabling MFA without deleting its factors
  const confirmMfaDisable = async () => {
    setMfaError(null)
    setIsChangingMfa(true)

    const result = await disableMfa()

    setIsChangingMfa(false)
    if (result instanceof Error) {
      setMfaError(result.message)
      return result
    }

    setMfaDisableDialogOpen(false)
    showFeedback("success", "Autenticação de dois fatores desativada")
    return true as const
  }

  // confirm MFA setup
  const completeMfaSetup = async (otp: string) => {
    const result = await confirmMfaSetup(otp, mfaSetup?.replaceRecoveryCodes)

    if (!(result instanceof Error) && result.enabled) {
      showFeedback("success", "Autenticação de dois fatores ativada")
    }

    return result
  }

  // finish a prepared MFA setup
  const retryMfaActivation = async () => {
    const result = await activatePreparedMfa()

    if (!(result instanceof Error) && result.enabled) {
      showFeedback("success", "Autenticação de dois fatores ativada")
    }

    return result
  }

  // cancel MFA setup
  const cancelCurrentMfaSetup = async () => {
    const result = await cancelMfaSetup()
    setMfaSetup(null)
    return result
  }

  // run an MFA account action after its recent challenge
  const runMfaProtectedAction = async (action: MfaProtectedAction) => {
    if (action === "reconfigure") {
      const setup = await prepareMfaReconfiguration()

      if (setup instanceof Error) return setup
      if (setup.type !== "setup") {
        return Error("não foi possível preparar a nova aplicação")
      }

      setMfaProtectedAction(null)
      setMfaActivation(null)
      setMfaSetup(setup)
      setMfaDialogOpen(true)
      return true as const
    }

    const result =
      action === "reuse"
        ? await reactivateMfa()
        : await regenerateMfaRecoveryCodes()

    if (result instanceof Error) return result

    setMfaProtectedAction(null)
    setMfaSetup(null)
    setMfaActivation(result)
    setMfaDialogOpen(true)

    if (action === "reuse" && result.enabled) {
      showFeedback("success", "Autenticação de dois fatores ativada")
    }

    return true as const
  }

  // end one session
  const endOneSession = async (sessionId: string) => {
    setSessionsError(null)
    setEndingSessionId(sessionId)

    const result = await endSession(sessionId)

    if (result instanceof Error) {
      setSessionsError(result.message)
      setEndingSessionId(null)
      return
    }

    await loadSessions()
    setEndingSessionId(null)
    showFeedback("success", "Sessão terminada")
  }

  // end every other session
  const endAllOtherSessions = async () => {
    setSessionsError(null)
    setIsEndingOtherSessions(true)

    const result = await endOtherSessions()

    if (result instanceof Error) {
      const message = result.message
      await loadSessions()
      setSessionsError(message)
      setIsEndingOtherSessions(false)
      return
    }

    await loadSessions()
    setIsEndingOtherSessions(false)
    showFeedback(
      "success",
      result === 1
        ? "1 outra sessão terminada"
        : `${result} outras sessões terminadas`
    )
  }

  // update notification preference
  const updateNotification = (
    preference: keyof NotificationPreferences,
    value: boolean
  ) => {
    setNotificationDraft((current) => ({
      ...(current ?? savedNotifications),
      [preference]: value,
    }))
  }

  // save notification preferences
  const saveNotifications = async () => {
    if (!notificationsDirty) return

    setNotificationsError(null)
    setIsSavingNotifications(true)

    const result = await updateNotificationPreferences(notifications)

    setIsSavingNotifications(false)
    if (result instanceof Error) {
      setNotificationsError(result.message)
      return
    }

    setNotificationDraft(null)
    showFeedback("success", "Preferências de notificação guardadas")
  }

  // discard unsaved notification preferences
  const resetNotifications = () => {
    setNotificationDraft(null)
    setNotificationsError(null)
  }

  // deactivate account
  const confirmDeactivation = async () => {
    setDeactivateError(null)
    setIsDeactivating(true)

    const result = await deactivateAccount()

    if (result instanceof Error) {
      setDeactivateError(result.message)
      setIsDeactivating(false)
      return
    }

    window.location.assign("/")
  }

  // change active tab with the keyboard
  const changeTabWithKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentId: PanelId
  ) => {
    const currentIndex = panelNavigation.findIndex(({ id }) => id === currentId)
    let nextIndex: number

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % panelNavigation.length
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + panelNavigation.length) % panelNavigation.length
    } else if (event.key === "Home") {
      nextIndex = 0
    } else if (event.key === "End") {
      nextIndex = panelNavigation.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextId = panelNavigation[nextIndex].id
    activatePanel(nextId)
    document.getElementById(`profile-tab-${nextId}`)?.focus()
  }

  if (isLoading) {
    return <ProfileLoading />
  }

  if (authError && !currentUser) {
    return (
      <ProfileAuthError
        message={authError}
        onRetry={() => void getCurrentUser()}
      />
    )
  }

  if (!currentUser) {
    return <ProfileSignIn />
  }

  // ui
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto text-foreground">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col px-5 py-4 sm:px-8">
        {/* title & feedback */}
        <div className="mb-5 flex shrink-0 items-end justify-between gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-accent">
              A MINHA CONTA
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
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

        <div className="grid flex-1 items-start gap-6 lg:grid-cols-[240px_1fr]">
          {/* navigation */}
          <aside>
            <nav
              role="tablist"
              className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1"
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
                      "flex h-12 items-center gap-3 rounded-lg px-3.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                      isActive
                        ? "bg-accent/10 font-semibold text-accent"
                        : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                    <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                    {label}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* active panel */}
          <div className="min-w-0">
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

const ProfileLoading = () => {
  // ui
  return (
    <div
      className="grid min-h-72 flex-1 place-items-center"
      aria-busy="true"
      aria-label="A carregar perfil">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden />A carregar
        perfil…
      </div>
    </div>
  )
}

// props
type ProfileAuthErrorProps = {
  message: string
  onRetry: () => void
}

const ProfileAuthError = ({ message, onRetry }: ProfileAuthErrorProps) => {
  // ui
  return (
    <div className="grid min-h-72 flex-1 place-items-center px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <CircleAlert className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">
          Não foi possível carregar o perfil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" role="alert">
          {message}
        </p>
        <ProfileButton className="mt-6 w-full" onClick={onRetry}>
          Tentar novamente
        </ProfileButton>
      </div>
    </div>
  )
}

const ProfileSignIn = () => {
  const [open, setOpen] = useState(false)

  // ui
  return (
    <div className="grid min-h-72 flex-1 place-items-center px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-accent/10 text-accent">
          <LockKeyhole className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Inicia sessão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Precisas de iniciar sessão para consultar e gerir o teu perfil.
        </p>
        <ProfileButton className="mt-6 w-full" onClick={() => setOpen(true)}>
          Iniciar Sessão
        </ProfileButton>
      </div>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

// props
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

const PersonalPanel = ({
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
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-xl font-semibold">Dados pessoais</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Informação visível apenas para ti.
          </p>
        </div>
        {!editing ? (
          <ProfileButton
            variant="secondary"
            onClick={() => onEditingChange(true)}>
            <Pencil className="size-4" aria-hidden />
            Editar perfil
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
      <form onSubmit={onSave}>
        <div className="px-5 py-5 sm:px-6">
          {/* avatar */}
          <div className="mb-5 flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-accent/10 text-xl font-bold text-accent">
              {getInitials(form.name)}
            </div>
            <div>
              <p className="text-sm font-semibold">Identificação da conta</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                As iniciais são geradas automaticamente a partir do teu nome.
              </p>
            </div>
          </div>

          {/* fields */}
          <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
            <ProfileField
              label="Nome completo"
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
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/50 px-5 py-3 sm:px-6">
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
      <div className="flex flex-col gap-4 border-t border-destructive/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-4 text-destructive" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold">Desativar conta</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Bloqueia permanentemente o acesso a esta conta.
            </p>
          </div>
        </div>
        <ProfileButton
          variant="danger"
          className="shrink-0"
          onClick={onDeactivate}>
          Desativar conta
        </ProfileButton>
      </div>
    </section>
  )
}

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

const SecurityPanel = ({
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
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* header */}
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-xl font-semibold">Segurança</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Protege o acesso à tua conta e revê as sessões ativas.
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2">
        {/* password */}
        <form onSubmit={onSavePassword} className="min-w-0">
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

        <div className="grid content-start gap-4">
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
          <div className="rounded-xl border border-border p-4">
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

            <div className="grid max-h-64 gap-2 overflow-y-auto">
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
              className="mt-4 w-full"
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

const NotificationsPanel = ({
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
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* header */}
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-xl font-semibold">Notificações</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Escolhe quando e como queres receber novidades.
        </p>
      </div>

      <div className="px-5 py-4 sm:px-6">
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
          <PreferenceToggle
            label="Resumo semanal"
            description="Um resumo dos resultados e tendências da semana."
            checked={preferences.weekly}
            disabled={isSaving}
            onChange={(checked) => onChange("weekly", checked)}
          />
          <PreferenceToggle
            label="Novidades do ClassifiQA"
            description="Atualizações de produto, novas funcionalidades e dicas."
            checked={preferences.product}
            disabled={isSaving}
            onChange={(checked) => onChange("product", checked)}
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
      <div className="flex justify-end gap-3 border-t border-border bg-muted/50 px-5 py-3 sm:px-6">
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
type MfaSetupDialogProps = {
  open: boolean
  setup: MfaSetup | null
  initialActivation: MfaConfirmationResult | null
  onOpenChange: (open: boolean) => void
  onCancel: () => Promise<true | Error>
  onConfirm: (otp: string) => Promise<MfaConfirmationResult | Error>
  onRetry: () => Promise<MfaConfirmationResult | Error>
}

const MfaSetupDialog = ({
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
                      ? "Já guardei — tentar mais tarde"
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
type MfaActionDialogProps = {
  open: boolean
  error: string | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const MfaDisableDialog = ({
  open,
  error,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: MfaActionDialogProps) => {
  // ui
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Desativar autenticação de dois fatores?</DialogTitle>
          <DialogDescription>
            A aplicação autenticadora e os códigos de recuperação continuam
            associados à conta. Se reativares a proteção, estes fatores serão
            reutilizados.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          Se já não tens acesso aos fatores guardados, não os reatives sem
          recuperares primeiro os códigos.
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
          <ProfileButton disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? "A desativar…" : "Desativar e manter fatores"}
          </ProfileButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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

const MfaProtectedActionDialog = ({
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
type DeactivateAccountDialogProps = {
  open: boolean
  error: string | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const DeactivateAccountDialog = ({
  open,
  error,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: DeactivateAccountDialogProps) => {
  const [confirmation, setConfirmation] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    onOpenChange(nextOpen)
  }

  // ui
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Desativar conta</DialogTitle>
          <DialogDescription>
            Esta ação bloqueia permanentemente a conta e termina o teu acesso.
            Os dados associados não são eliminados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              Escreve <strong>DESATIVAR</strong> para confirmar
            </span>
            <input
              value={confirmation}
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20"
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
              onClick={() => handleOpenChange(false)}>
              Cancelar
            </ProfileButton>
            <ProfileButton
              variant="danger"
              disabled={confirmation !== "DESATIVAR" || isSubmitting}
              onClick={onConfirm}>
              {isSubmitting ? "A desativar…" : "Desativar permanentemente"}
            </ProfileButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
