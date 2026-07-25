import { useEffect, useState } from "react"
import { LogOut, User } from "lucide-react"
import { AuthDialog } from "./auth-dialog"
import { Button } from "@/components/ui/button"
import { useClientAuth } from "@/lib/hooks/backend/client/services/auth"
import { useAuthStore } from "@/lib/store/auth"

// props
type AuthControlProps = {
  isProfilePage?: boolean
}

export const AuthControl = ({ isProfilePage = false }: AuthControlProps) => {
  // auth
  const { authError, currentUser, isLoading } = useAuthStore()
  const { getCurrentUser } = useClientAuth()

  // dialog state
  const [open, setOpen] = useState(false)

  // restore session
  useEffect(() => {
    void getCurrentUser()
  }, [getCurrentUser])

  // handle control click
  const handleClick = async () => {
    if (authError && !currentUser) {
      await getCurrentUser()
      return
    }

    if (!currentUser) {
      setOpen(true)
      return
    }

    if (!isProfilePage) {
      window.location.assign("/perfil")
      return
    }

    setOpen(true)
  }

  const buttonLabel = isLoading
    ? "A verificar…"
    : authError && !currentUser
      ? "Tentar novamente"
      : isProfilePage && currentUser
        ? "Terminar Sessão"
        : "A Minha Conta"

  // ui
  return (
    <>
      {/* auth control */}
      <Button
        variant="outline"
        className="px-2 sm:px-4"
        disabled={isLoading}
        aria-label={buttonLabel}
        aria-busy={isLoading}
        title={authError ?? undefined}
        onClick={handleClick}>
        {isProfilePage && currentUser ? <LogOut /> : <User />}
        <span className="hidden sm:inline">{buttonLabel}</span>
      </Button>

      {/* auth dialog */}
      <AuthDialog
        open={open}
        onOpenChange={setOpen}
        onSignOutSuccess={() => window.location.assign("/")}
      />
    </>
  )
}
