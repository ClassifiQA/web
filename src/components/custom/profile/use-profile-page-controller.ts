import type { Models } from "appwrite"
import {
  type KeyboardEvent,
  type SubmitEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  type MfaConfirmationResult,
  useClientAuth,
} from "@/lib/hooks/backend/client/services/auth"
import { useMediaQuery } from "@/lib/hooks/mobile"
import { type NotificationPreferences, useAuthStore } from "@/lib/store/auth"

import {
  defaultNotifications,
  type Feedback,
  getProfileForm,
  type MfaProtectedAction,
  type MfaSetup,
  panelNavigation,
  type PanelId,
  type ProfileForm,
} from "./profile-model"

export const useProfilePageController = () => {
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
    deleteAccount,
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
  const isDesktopLayout = useMediaQuery("(min-width: 64rem)")

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

  // delete account and linked participation data
  const confirmDeactivation = async () => {
    setDeactivateError(null)
    setIsDeactivating(true)

    const result = await deleteAccount()

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

  return {
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
    retryAuth: getCurrentUser,
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
  }
}
