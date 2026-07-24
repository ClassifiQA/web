import { createServerAppwrite } from "@/lib/hooks/backend/server/appwrite"
import { parseError } from "@/lib/utils"

/**
 * server-side authentication operations
 */
export const createServerAuth = () => {
  // auth
  const { auth } = createServerAppwrite()

  /**
   * update verification status
   *
   * @param userId user to be updated
   * @param secret verification secret
   *
   * @returns whether the user was verified or not
   */
  const updateVerification = async ({
    userId,
    secret,
  }: {
    userId: string
    secret: string
  }) => {
    // validate input
    if (!userId || !secret) return Error("all fields are required")

    // attempt to update verification
    try {
      // trigger update
      const token = await auth.updateEmailVerification({ userId, secret })

      // return status
      if (token) return true
      else return false
    } catch (error) {
      return Error(parseError(error))
    }
  }

  // return methods
  return { updateVerification }
}
