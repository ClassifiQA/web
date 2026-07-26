import type { Models } from "appwrite"
import { create } from "zustand"

export type NotificationPreferences = {
  replies: boolean
  security: boolean
  browser: boolean
}

export type UserPreferences = {
  [key: string]: unknown
  profile?: {
    role?: string
    school?: string
  }
  notifications?: Partial<NotificationPreferences>
  legal?: {
    termsVersion?: string
    termsAcceptedAt?: string
    privacyVersionAcknowledged?: string
  }
}

export type AuthUser = Models.User<UserPreferences>

type AuthStore = {
  authError: string | null
  currentUser: AuthUser | null
  isLoading: boolean
  setAuthError: (authError: string | null) => void
  setCurrentUser: (user: AuthUser | null) => void
  setIsLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState = {
  authError: null,
  currentUser: null,
  isLoading: true,
} satisfies Pick<AuthStore, "authError" | "currentUser" | "isLoading">

/**
 * auth store
 *
 * keeps track of the current Appwrite user while the client resolves the existing session
 */
export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setAuthError: (authError) => set({ authError }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () => set(initialState),
}))
