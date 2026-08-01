import { CircleAlert, LoaderCircle, LockKeyhole } from "lucide-react"
import { useState } from "react"

import { AuthDialog } from "@/components/custom/auth/auth-dialog"

import { ProfileButton } from "./profile-controls"

export const ProfileLoading = () => {
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

export const ProfileAuthError = ({
  message,
  onRetry,
}: ProfileAuthErrorProps) => {
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

export const ProfileSignIn = () => {
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
