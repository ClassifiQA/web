import type { Models } from "appwrite"
import { create } from "zustand"

type User = Models.User<Models.Preferences>

type AuthStore = {
  currentUser: User | null
  isLoading: boolean
  setCurrentUser: (user: User | null) => void
  setIsLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState = {
  currentUser: null,
  isLoading: true,
} satisfies Pick<AuthStore, "currentUser" | "isLoading">

/**
 * auth store
 *
 * keeps track of the current Appwrite user while the client resolves the existing session
 */
export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setCurrentUser: (currentUser) => set({ currentUser }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () => set(initialState),
}))
