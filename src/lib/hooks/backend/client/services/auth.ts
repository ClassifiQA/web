import { useAppwrite } from "@/lib/hooks/backend/client/appwrite"
import {
  type AuthUser,
  type NotificationPreferences,
  type UserPreferences,
  useAuthStore,
} from "@/lib/store/auth"
import { LEGAL_VERSION } from "@/config/legal"
import { notify, parseError } from "@/lib/utils"
import {
  AppwriteException,
  AuthenticationFactor,
  AuthenticatorType,
  ID,
  type Models,
} from "appwrite"
import { useCallback } from "react"

export type SignInMfaChallenge = {
  type: "mfa-challenge"
  challengeId: string
  factor: AuthenticationFactor
  availableFactors: AuthenticationFactor[]
  recoveryAvailable: boolean
}

export type MfaSetupResult =
  | { type: "existing" }
  | {
      type: "setup"
      qr: string
      secret: string
      uri: string
      replaceRecoveryCodes?: boolean
    }

export type MfaConfirmationResult = {
  user: AuthUser
  recoveryCodes: string[]
  recoveryCodesAlreadyExist: boolean
  enabled: boolean
  error?: string
}

let currentUserRequest: Promise<AuthUser> | null = null

// merge preference namespaces without replacing unrelated values
const mergePreferences = (
  current: UserPreferences,
  update: Partial<UserPreferences>
): UserPreferences => {
  return {
    ...current,
    ...update,
    ...(update.profile
      ? {
          profile: {
            ...current.profile,
            ...update.profile,
          },
        }
      : {}),
    ...(update.notifications
      ? {
          notifications: {
            ...current.notifications,
            ...update.notifications,
          },
        }
      : {}),
  }
}

// check whether Appwrite is waiting for another authentication factor
const requiresMoreFactors = (error: unknown) => {
  return (
    error instanceof AppwriteException &&
    error.type === "user_more_factors_required"
  )
}

// check whether Appwrite already has a session cookie
const sessionAlreadyExists = (error: unknown) => {
  return (
    error instanceof AppwriteException &&
    error.type === "user_session_already_exists"
  )
}

// check whether there is no authenticated Appwrite session
const isUnauthenticated = (error: unknown) => {
  return error instanceof AppwriteException && error.code === 401
}

// list available sign-in factors in preference order
const getAvailableMfaFactors = (factors: Models.MfaFactors) => {
  return [
    ...(factors.totp ? [AuthenticationFactor.Totp] : []),
    ...(factors.email ? [AuthenticationFactor.Email] : []),
    ...(factors.phone ? [AuthenticationFactor.Phone] : []),
    ...(factors.recoveryCode ? [AuthenticationFactor.Recoverycode] : []),
  ]
}

// Appwrite 1.9 expects a camel-cased recovery factor on the wire
const getMfaFactorForRequest = (factor: AuthenticationFactor) => {
  return factor === AuthenticationFactor.Recoverycode
    ? ("recoveryCode" as AuthenticationFactor)
    : factor
}

/**
 * hook for client authentication operations
 */
export const useClientAuth = () => {
  // auth service
  const { auth, avatars } = useAppwrite()
  const { setAuthError, setCurrentUser, setIsLoading } = useAuthStore()

  // discard the current session without surfacing cleanup errors
  const discardCurrentSession = useCallback(async () => {
    try {
      await auth.deleteSession({ sessionId: "current" })
    } catch {
      // the session may already be gone
    }
  }, [auth])

  /**
   * resolves the current Appwrite session
   *
   * @returns current user or null
   */
  const getCurrentUser = useCallback(async () => {
    let request = currentUserRequest

    if (!request) {
      setIsLoading(true)
      request = auth.get<UserPreferences>()
      currentUserRequest = request
    }

    try {
      const currentUser = await request
      setAuthError(null)
      setCurrentUser(currentUser)
      return currentUser
    } catch (error) {
      if (requiresMoreFactors(error)) {
        await discardCurrentSession()
        setAuthError(null)
        setCurrentUser(null)
      } else if (isUnauthenticated(error)) {
        setAuthError(null)
        setCurrentUser(null)
      } else {
        setAuthError(parseError(error))
      }

      return null
    } finally {
      if (currentUserRequest === request) {
        currentUserRequest = null
        setIsLoading(false)
      }
    }
  }, [auth, discardCurrentSession, setAuthError, setCurrentUser, setIsLoading])

  /**
   *
   * @param email user's email
   * @param password user's password
   * @param name user's name
   *
   * @returns created user or error
   */
  const signUp = async ({
    email,
    password,
    name,
  }: {
    email: string
    password: string
    name: string
  }) => {
    // validate input
    if (!email || !password || !name) return Error("all fields are required")

    // attempt to sign up
    try {
      const createdAccount = await auth.create<UserPreferences>({
        userId: ID.unique(),
        name,
        email,
        password,
      })

      // validate account creation
      if (!createdAccount) return Error("failed to create account")

      // create session
      const session = await auth.createEmailPasswordSession({ email, password })

      // validate session
      if (!session) return Error("failed to sign in after sign up")

      // retain evidence of the terms accepted during registration
      const currentPreferences = await auth.getPrefs<UserPreferences>()
      await auth.updatePrefs<UserPreferences>({
        prefs: mergePreferences(currentPreferences, {
          legal: {
            termsVersion: LEGAL_VERSION,
            termsAcceptedAt: createdAccount.$createdAt,
            privacyVersionAcknowledged: LEGAL_VERSION,
          },
        }),
      })

      // set current user
      const currentUser = await auth.get<UserPreferences>()
      setAuthError(null)
      setCurrentUser(currentUser)
      setIsLoading(false)

      // send the first e-mail confirmation
      try {
        const url = new URL("/perfil/verificar", window.location.origin)
        await auth.createEmailVerification({ url: url.toString() })
      } catch {
        // the profile page lets the user request a new confirmation
      }

      // notify user
      await notify(
        "success",
        "Conta criada!",
        `Bem-vindo(a), ${currentUser.name}!`
      ).catch(() => undefined)

      // return session
      return session
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * creates an MFA challenge for the current partial session
   */
  const createMfaChallenge = async (factor: AuthenticationFactor) => {
    try {
      const factors = await auth.listMFAFactors()
      const challenge = await auth.createMFAChallenge({
        factor: getMfaFactorForRequest(factor),
      })
      const availableFactors = getAvailableMfaFactors(factors)

      return {
        type: "mfa-challenge",
        challengeId: challenge.$id,
        factor,
        availableFactors,
        recoveryAvailable: factors.recoveryCode,
      } satisfies SignInMfaChallenge
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * starts the most appropriate MFA challenge for the current partial session
   */
  const createDefaultMfaChallenge = async () => {
    try {
      const factors = await auth.listMFAFactors()
      const availableFactors = getAvailableMfaFactors(factors)
      const factor = availableFactors[0]

      if (!factor) {
        await discardCurrentSession()
        return Error("no multi-factor method is available")
      }

      const challenge = await auth.createMFAChallenge({
        factor: getMfaFactorForRequest(factor),
      })

      return {
        type: "mfa-challenge",
        challengeId: challenge.$id,
        factor,
        availableFactors,
        recoveryAvailable: factors.recoveryCode,
      } satisfies SignInMfaChallenge
    } catch (error) {
      await discardCurrentSession()
      return Error(parseError(error))
    }
  }

  /**
   * signs into an account using an e-mail and password
   *
   * @param email user's email
   * @param password user's password
   *
   * @returns user session, MFA challenge or error
   */
  const signIn = async (email: string, password: string) => {
    // validate input
    if (!email || !password) return Error("e-mail and password are required")

    // attempt to sign in
    try {
      // session
      const session = await auth.createEmailPasswordSession({ email, password })

      // validate session
      if (!session) return Error("failed to sign in")

      try {
        // set current user
        const currentUser = await auth.get<UserPreferences>()
        setAuthError(null)
        setCurrentUser(currentUser)
        setIsLoading(false)

        // notify user
        await notify(
          "success",
          "Sessão iniciada!",
          `Bem-vindo(a), ${currentUser.name}!`
        ).catch(() => undefined)

        // return session
        return session
      } catch (error) {
        if (requiresMoreFactors(error)) {
          return createDefaultMfaChallenge()
        }

        throw error
      }
    } catch (error) {
      if (requiresMoreFactors(error)) {
        return createDefaultMfaChallenge()
      }

      if (sessionAlreadyExists(error)) {
        try {
          const currentUser = await auth.get<UserPreferences>()
          setAuthError(null)
          setCurrentUser(currentUser)
          setIsLoading(false)

          await notify(
            "success",
            "Sessão iniciada!",
            `Bem-vindo(a), ${currentUser.name}!`
          ).catch(() => undefined)

          return currentUser
        } catch (sessionError) {
          if (requiresMoreFactors(sessionError)) {
            return createDefaultMfaChallenge()
          }

          await discardCurrentSession()
        }
      }

      return Error(parseError(error))
    }
  }

  /**
   * completes an MFA sign-in challenge
   */
  const completeMfaSignIn = async (challengeId: string, otp: string) => {
    if (!challengeId || !otp) return Error("all fields are required")

    try {
      await auth.updateMFAChallenge({ challengeId, otp })

      const currentUser = await auth.get<UserPreferences>()
      setAuthError(null)

      await notify(
        "success",
        "Sessão iniciada!",
        `Bem-vindo(a), ${currentUser.name}!`
      ).catch(() => undefined)

      return currentUser
    } catch (error) {
      // reconcile an accepted challenge after an interrupted response
      try {
        const currentUser = await auth.get<UserPreferences>()
        setAuthError(null)

        await notify(
          "success",
          "Sessão iniciada!",
          `Bem-vindo(a), ${currentUser.name}!`
        ).catch(() => undefined)

        return currentUser
      } catch {
        // the partial session still needs a valid challenge
      }

      return Error(parseError(error))
    }
  }

  /**
   * cancels an incomplete MFA sign-in
   */
  const cancelMfaSignIn = useCallback(async () => {
    try {
      await auth.deleteSession({ sessionId: "current" })
      setCurrentUser(null)
      return true
    } catch (error) {
      return Error(parseError(error))
    }
  }, [auth, setCurrentUser])

  /**
   * signs out of the current session
   *
   * @returns deleted session or error
   */
  const signOut = async () => {
    try {
      // delete current session
      const deletedSession = await auth.deleteSession({ sessionId: "current" })

      // reset current user
      setAuthError(null)
      setCurrentUser(null)
      setIsLoading(false)

      // notify user
      await notify(
        "success",
        "Sessão Terminada",
        "Sessão atual terminada com sucesso"
      ).catch(() => undefined)

      // return deleted session
      return deletedSession
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * updates the current user's personal information
   */
  const updateProfile = async ({
    name,
    email,
    password,
    role,
    school,
  }: {
    name: string
    email: string
    password?: string
    role: string
    school: string
  }) => {
    if (!name || !email) return Error("name and e-mail are required")

    try {
      const currentUser = await auth.get<UserPreferences>()
      const emailChanged = currentUser.email !== email

      if (emailChanged && !password) {
        return Error("current password is required to update the e-mail")
      }

      // update restricted account fields first
      if (emailChanged) {
        await auth.updateEmail<UserPreferences>({
          email,
          password: password ?? "",
        })
      }

      if (currentUser.name !== name) {
        await auth.updateName<UserPreferences>({ name })
      }

      // preserve the complete preferences map
      const currentPreferences = await auth.getPrefs<UserPreferences>()
      await auth.updatePrefs<UserPreferences>({
        prefs: mergePreferences(currentPreferences, {
          profile: { role, school },
        }),
      })

      const updatedUser = await auth.get<UserPreferences>()
      setCurrentUser(updatedUser)
      return updatedUser
    } catch (error) {
      // refresh the store after any partially completed account update
      try {
        setCurrentUser(await auth.get<UserPreferences>())
      } catch {
        // keep the previous user when the session can no longer be resolved
      }

      return Error(parseError(error))
    }
  }

  /**
   * updates the current user's notification preferences
   */
  const updateNotificationPreferences = async (
    notifications: NotificationPreferences
  ) => {
    try {
      // preserve the complete preferences map
      const currentPreferences = await auth.getPrefs<UserPreferences>()
      const updatedUser = await auth.updatePrefs<UserPreferences>({
        prefs: mergePreferences(currentPreferences, { notifications }),
      })

      setCurrentUser(updatedUser)
      return updatedUser
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * updates the current user's password
   */
  const updatePassword = async (current: string, next: string) => {
    if (!current || !next) return Error("both passwords are required")

    try {
      const updatedUser = await auth.updatePassword<UserPreferences>({
        password: next,
        oldPassword: current,
      })

      setCurrentUser(updatedUser)
      return updatedUser
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * returns every active session for the current user
   */
  const getSessions = useCallback(async () => {
    try {
      const result = await auth.listSessions()
      return result.sessions
    } catch (error) {
      return Error(parseError(error))
    }
  }, [auth])

  /**
   * ends one session by its ID
   */
  const endSession = async (sessionId: string) => {
    if (!sessionId) return Error("session ID is required")

    try {
      await auth.deleteSession({ sessionId })
      return true
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * ends every session except the current one
   */
  const endOtherSessions = async () => {
    try {
      const result = await auth.listSessions()
      const otherSessions = result.sessions.filter(
        (session) => !session.current
      )

      const outcomes = await Promise.allSettled(
        otherSessions.map((session) =>
          auth.deleteSession({ sessionId: session.$id })
        )
      )
      const failed = outcomes.filter(
        (outcome) => outcome.status === "rejected"
      ).length

      if (failed) {
        return Error(
          failed === 1
            ? "não foi possível terminar 1 sessão"
            : `não foi possível terminar ${failed} sessões`
        )
      }

      return otherSessions.length
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * generates missing recovery codes and enables prepared MFA factors
   */
  const activatePreparedMfa = async (replaceRecoveryCodes = false) => {
    try {
      let currentUser = await auth.get<UserPreferences>()
      let factors = await auth.listMFAFactors()

      if (!factors.totp) {
        return Error("configura primeiro a aplicação autenticadora")
      }

      let recoveryCodes: string[] = []
      const recoveryCodesAlreadyExist = factors.recoveryCode

      if (replaceRecoveryCodes && factors.recoveryCode) {
        try {
          const recovery = await auth.updateMFARecoveryCodes()
          recoveryCodes = recovery.recoveryCodes
        } catch (error) {
          // the recent challenge exposes whichever code set remains valid
          try {
            const recovery = await auth.getMFARecoveryCodes()
            recoveryCodes = recovery.recoveryCodes
          } catch {
            return Error(parseError(error))
          }
        }
      } else if (!factors.recoveryCode) {
        try {
          const recovery = await auth.createMFARecoveryCodes()
          recoveryCodes = recovery.recoveryCodes
        } catch (error) {
          // never enable MFA while newly-created codes may be hidden
          factors = await auth.listMFAFactors()

          if (factors.recoveryCode) {
            return Error(
              "não foi possível apresentar os códigos de recuperação; fecha esta janela e volta a ativar a proteção"
            )
          }

          return Error(parseError(error))
        }
      }

      try {
        currentUser = await auth.updateMFA<UserPreferences>({ mfa: true })
      } catch (error) {
        // updateMFA may have succeeded even if its response was interrupted
        try {
          currentUser = await auth.get<UserPreferences>()
        } catch {
          // retain the last resolved user so recovery codes can still be shown
        }

        setCurrentUser(currentUser)

        return {
          user: currentUser,
          recoveryCodes,
          recoveryCodesAlreadyExist,
          enabled: currentUser.mfa,
          ...(currentUser.mfa ? {} : { error: parseError(error) }),
        } satisfies MfaConfirmationResult
      }

      setCurrentUser(currentUser)

      return {
        user: currentUser,
        recoveryCodes,
        recoveryCodesAlreadyExist,
        enabled: true,
      } satisfies MfaConfirmationResult
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * prepares or enables TOTP multi-factor authentication
   */
  const beginMfaSetup = async () => {
    try {
      const currentUser = await auth.get<UserPreferences>()

      if (!currentUser.emailVerification) {
        return Error("confirma primeiro o teu endereço de e-mail")
      }

      const factors = await auth.listMFAFactors()

      // let the user confirm before reusing a verified authenticator
      if (factors.totp) {
        return { type: "existing" } satisfies MfaSetupResult
      }

      const setup = await auth.createMFAAuthenticator({
        type: AuthenticatorType.Totp,
      })

      return {
        type: "setup",
        secret: setup.secret,
        uri: setup.uri,
        qr: avatars.getQR({
          text: setup.uri,
          size: 320,
          margin: 1,
        }),
      } satisfies MfaSetupResult
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * verifies a TOTP authenticator and enables MFA
   */
  const confirmMfaSetup = async (otp: string, replaceRecoveryCodes = false) => {
    if (!otp) return Error("verification code is required")

    try {
      try {
        await auth.updateMFAAuthenticator<UserPreferences>({
          type: AuthenticatorType.Totp,
          otp,
        })
      } catch (error) {
        // restart through a fresh challenge if verification was ambiguous
        const factors = await auth.listMFAFactors()
        if (factors.totp) {
          return Error(
            "a aplicação foi confirmada, mas a resposta não chegou; fecha esta janela e volta a ativar a proteção"
          )
        }

        return Error(parseError(error))
      }

      return activatePreparedMfa(replaceRecoveryCodes)
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * removes an unfinished TOTP authenticator
   */
  const cancelMfaSetup = async () => {
    // Appwrite replaces an abandoned, unverified TOTP on the next setup
    return true as const
  }

  /**
   * disables multi-factor authentication
   */
  const disableMfa = async () => {
    try {
      const updatedUser = await auth.updateMFA<UserPreferences>({ mfa: false })
      setCurrentUser(updatedUser)
      return updatedUser
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * starts a fresh challenge for a protected MFA account action
   */
  const beginMfaActionChallenge = async () => {
    try {
      const factors = await auth.listMFAFactors()
      const availableFactors = getAvailableMfaFactors(factors)
      const factor = availableFactors[0]

      if (!factor) {
        return Error("não existe um fator disponível para confirmar esta ação")
      }

      const challenge = await auth.createMFAChallenge({
        factor: getMfaFactorForRequest(factor),
      })

      return {
        type: "mfa-challenge",
        challengeId: challenge.$id,
        factor,
        availableFactors,
        recoveryAvailable: factors.recoveryCode,
      } satisfies SignInMfaChallenge
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * completes the recent MFA challenge required by protected actions
   */
  const completeMfaActionChallenge = async (
    challengeId: string,
    otp: string
  ) => {
    if (!challengeId || !otp) return Error("introduz o código de confirmação")

    try {
      await auth.updateMFAChallenge({ challengeId, otp })
      return true as const
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * re-enables verified factors after a fresh MFA challenge
   */
  const reactivateMfa = async () => {
    try {
      let currentUser = await auth.get<UserPreferences>()
      const factors = await auth.listMFAFactors()
      let recoveryCodes: string[]

      if (factors.recoveryCode) {
        const recovery = await auth.getMFARecoveryCodes()
        recoveryCodes = recovery.recoveryCodes
      } else {
        try {
          const recovery = await auth.createMFARecoveryCodes()
          recoveryCodes = recovery.recoveryCodes
        } catch (error) {
          // the recent challenge lets us recover an ambiguous create response
          try {
            const recovery = await auth.getMFARecoveryCodes()
            recoveryCodes = recovery.recoveryCodes
          } catch {
            return Error(parseError(error))
          }
        }
      }

      try {
        currentUser = await auth.updateMFA<UserPreferences>({ mfa: true })
      } catch (error) {
        try {
          currentUser = await auth.get<UserPreferences>()
        } catch {
          // keep the resolved user so the current codes can still be shown
        }

        if (!currentUser.mfa) {
          setCurrentUser(currentUser)

          return {
            user: currentUser,
            recoveryCodes,
            recoveryCodesAlreadyExist: true,
            enabled: false,
            error: parseError(error),
          } satisfies MfaConfirmationResult
        }
      }

      setCurrentUser(currentUser)

      return {
        user: currentUser,
        recoveryCodes,
        recoveryCodesAlreadyExist: true,
        enabled: true,
      } satisfies MfaConfirmationResult
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * removes the old TOTP factor and prepares a replacement
   */
  const prepareMfaReconfiguration = async () => {
    try {
      let currentUser = await auth.get<UserPreferences>()

      if (currentUser.mfa) {
        try {
          currentUser = await auth.updateMFA<UserPreferences>({ mfa: false })
        } catch (error) {
          currentUser = await auth.get<UserPreferences>()
          if (currentUser.mfa) return Error(parseError(error))
        }

        setCurrentUser(currentUser)
      }

      const factors = await auth.listMFAFactors()

      if (factors.totp) {
        try {
          await auth.deleteMFAAuthenticator({
            type: AuthenticatorType.Totp,
          })
        } catch (error) {
          const currentFactors = await auth.listMFAFactors()
          if (currentFactors.totp) return Error(parseError(error))
        }
      }

      const setup = await auth.createMFAAuthenticator({
        type: AuthenticatorType.Totp,
      })

      return {
        type: "setup",
        secret: setup.secret,
        uri: setup.uri,
        qr: avatars.getQR({
          text: setup.uri,
          size: 320,
          margin: 1,
        }),
        replaceRecoveryCodes: true,
      } satisfies MfaSetupResult
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * replaces every recovery code with a new one-time set
   */
  const regenerateMfaRecoveryCodes = async () => {
    try {
      const currentUser = await auth.get<UserPreferences>()
      let recovery: Models.MfaRecoveryCodes

      try {
        recovery = await auth.updateMFARecoveryCodes()
      } catch (error) {
        // after a fresh challenge, GET returns whichever set is currently valid
        try {
          recovery = await auth.getMFARecoveryCodes()
        } catch {
          return Error(parseError(error))
        }
      }

      setCurrentUser(currentUser)

      return {
        user: currentUser,
        recoveryCodes: recovery.recoveryCodes,
        recoveryCodesAlreadyExist: true,
        enabled: currentUser.mfa,
      } satisfies MfaConfirmationResult
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * sends a verification link to the current e-mail address
   */
  const verify = async () => {
    try {
      const url = new URL("/perfil/verificar", window.location.origin)
      await auth.createEmailVerification({ url: url.toString() })
      return true
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * confirms an e-mail verification link
   */
  const confirmEmailVerification = useCallback(
    async (userId: string, secret: string) => {
      if (!userId || !secret) return Error("invalid verification link")

      try {
        await auth.updateEmailVerification({ userId, secret })
        return true
      } catch (error) {
        return Error(parseError(error))
      }
    },
    [auth]
  )

  /**
   * permanently blocks the current account
   */
  const deactivateAccount = async () => {
    try {
      const result = await auth.updateStatus<UserPreferences>()
      setCurrentUser(null)
      setIsLoading(false)
      return result
    } catch (error) {
      return Error(parseError(error))
    }
  }

  // stable service surface for consumers and editor inference
  const clientAuth = {
    getCurrentUser,
    signUp,
    signIn,
    createMfaChallenge,
    completeMfaSignIn,
    cancelMfaSignIn,
    signOut,
    updateProfile,
    updateNotificationPreferences,
    updatePassword,
    getSessions,
    endSession,
    endOtherSessions,
    beginMfaSetup,
    confirmMfaSetup,
    activatePreparedMfa,
    cancelMfaSetup,
    disableMfa,
    beginMfaActionChallenge,
    completeMfaActionChallenge,
    reactivateMfa,
    prepareMfaReconfiguration,
    regenerateMfaRecoveryCodes,
    verify,
    confirmEmailVerification,
    deactivateAccount,
  }

  return clientAuth
}
