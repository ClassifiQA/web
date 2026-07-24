import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useClientAuth } from "@/lib/hooks/backend/client/services/auth"
import { useAuthStore } from "@/lib/store/auth"
import { useState, type ComponentProps, type SubmitEvent } from "react"

// props
type AuthDialogProps = {
  open: boolean
  onOpenChange: (state: boolean) => void
}

type GuestAuthType = "sign-in" | "sign-up"
type AuthType = GuestAuthType | "sign-out"

const authCopy: Record<AuthType, { title: string; description: string }> = {
  "sign-in": {
    title: "Iniciar Sessão",
    description: "Inicia sessão na tua conta.",
  },
  "sign-up": {
    title: "Criar Conta",
    description: "Cria uma conta para começar.",
  },
  "sign-out": {
    title: "Terminar Sessão",
    description: "Queres terminar a sessão nesta conta?",
  },
}

export const AuthDialog = (props: AuthDialogProps) => {
  // auth
  const { currentUser } = useAuthStore()
  const [guestAuthType, setGuestAuthType] = useState<GuestAuthType>("sign-in")
  const authType: AuthType = currentUser ? "sign-out" : guestAuthType
  const copy = authCopy[authType]

  // ui
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {authType === "sign-in" && (
          <SignInForm
            onSuccess={() => props.onOpenChange(false)}
            onSignUp={() => setGuestAuthType("sign-up")}
          />
        )}
        {authType === "sign-up" && (
          <SignUpForm
            onSuccess={() => props.onOpenChange(false)}
            onSignIn={() => setGuestAuthType("sign-in")}
          />
        )}
        {authType === "sign-out" && currentUser && (
          <SignOutForm
            userLabel={currentUser.name || currentUser.email}
            onSuccess={() => props.onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type AuthFormProps = {
  onSuccess: () => void
}

const fieldClassName =
  "h-10 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none transition-[color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

const SignInForm = ({
  onSuccess,
  onSignUp,
}: AuthFormProps & { onSignUp: () => void }) => {
  const { signIn } = useClientAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const data = new FormData(event.currentTarget)
    const result = await signIn(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? "")
    )

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onSuccess()
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <AuthField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        disabled={isSubmitting}
      />
      <AuthField
        label="Palavra-passe"
        name="password"
        type="password"
        autoComplete="current-password"
        disabled={isSubmitting}
      />
      <FormError message={error} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "A iniciar sessão…" : "Iniciar Sessão"}
      </Button>
      <Button type="button" variant="link" onClick={onSignUp}>
        Ainda não tens conta? Criar conta
      </Button>
    </form>
  )
}

const SignUpForm = ({
  onSuccess,
  onSignIn,
}: AuthFormProps & { onSignIn: () => void }) => {
  const { signUp } = useClientAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const data = new FormData(event.currentTarget)
    const result = await signUp({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    })

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onSuccess()
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <AuthField
        label="Nome"
        name="name"
        autoComplete="name"
        disabled={isSubmitting}
      />
      <AuthField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        disabled={isSubmitting}
      />
      <AuthField
        label="Palavra-passe"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        disabled={isSubmitting}
      />
      <FormError message={error} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "A criar conta…" : "Criar Conta"}
      </Button>
      <Button type="button" variant="link" onClick={onSignIn}>
        Já tens conta? Iniciar sessão
      </Button>
    </form>
  )
}

const SignOutForm = ({
  userLabel,
  onSuccess,
}: AuthFormProps & { userLabel: string }) => {
  const { signOut } = useClientAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await signOut()

    setIsSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onSuccess()
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        Sessão iniciada como{" "}
        <strong className="text-foreground">{userLabel}</strong>.
      </p>
      <FormError message={error} />
      <Button type="submit" variant="destructive" disabled={isSubmitting}>
        {isSubmitting ? "A terminar sessão…" : "Terminar Sessão"}
      </Button>
    </form>
  )
}

type AuthFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string
  name: string
}

const AuthField = ({ label, name, ...props }: AuthFieldProps) => (
  <div className="grid gap-1.5">
    <label className="text-sm font-medium" htmlFor={`auth-${name}`}>
      {label}
    </label>
    <input
      id={`auth-${name}`}
      name={name}
      className={fieldClassName}
      required
      {...props}
    />
  </div>
)

const FormError = ({ message }: { message: string | null }) =>
  message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null
