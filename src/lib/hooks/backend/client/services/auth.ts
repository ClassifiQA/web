import { useAppwrite } from "@/lib/hooks/backend/client/appwrite"
import { useAuthStore } from "@/lib/store/auth"
import { notify, parseError } from "@/lib/utils"
import { ID } from "appwrite"

/**
 * hook for client authentication operations
 */
export const useClientAuth = () => {
  // auth service
  const { auth } = useAppwrite()
  const { setCurrentUser } = useAuthStore()

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
      const createdAccount = await auth.create({
        userId: ID.unique(),
        name: name,
        email,
        password,
      })

      // validate account creation
      if (!createdAccount) return Error("failed to create account")

      // create session
      const session = await auth.createEmailPasswordSession({ email, password })

      // validate session
      if (!session) return Error("failed to sign in after sign up")

      // set current user
      const currentUser = await auth.get()
      setCurrentUser(currentUser)

      // notify user
      await notify(
        "success",
        "Conta criada!",
        `Bem-vindo(a), ${currentUser.name}!`
      )

      // return session
      return session
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * signs into an account using an e-mail and password
   *
   * @param email user's email
   * @param password user's password
   *
   * @returns user session or error
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

      // set current user
      const currentUser = await auth.get()
      setCurrentUser(currentUser)

      // notify user
      await notify(
        "success",
        "Sessão iniciada!",
        `Bem-vindo(a), ${currentUser.name}!`
      )

      // return session
      return session
    } catch (error) {
      return Error(parseError(error))
    }
  }

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
      setCurrentUser(null)

      // notify user
      await notify(
        "success",
        "Sessão Terminada",
        "Sessão atual terminada com sucesso"
      )

      // return deleted session
      return deletedSession
    } catch (error) {
      return Error(parseError(error))
    }
  }

  /**
   * verify a given account
   */
  const verify = async () => {
    try {
      // current hostname
      const hostname = window.location.hostname

      // trigger verification
      await auth.createEmailVerification({
        url: `${hostname}/api/auth/verify`,
      })
    } catch (error) {
      return Error(parseError(error))
    }
  }

  // return methods
  return { signUp, signIn, signOut, verify }
}
