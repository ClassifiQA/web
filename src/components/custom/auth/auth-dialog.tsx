import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type SignInMfaChallenge,
  useClientAuth,
} from "@/lib/hooks/backend/client/services/auth"
import { type AuthUser, useAuthStore } from "@/lib/store/auth"
import { AuthenticationFactor } from "appwrite"
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type SubmitEvent,
} from "react"

// props
type AuthDialogProps = {
  open: boolean
  onOpenChange: (state: boolean) => void
  onSignOutSuccess?: () => void
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
  const [isBusy, setIsBusy] = useState(false)
  const [busyAuthType, setBusyAuthType] = useState<AuthType | null>(null)
  const [busyUserLabel, setBusyUserLabel] = useState<string | null>(null)
  const resolvedAuthType: AuthType = currentUser ? "sign-out" : guestAuthType
  const authType = busyAuthType ?? resolvedAuthType
  const copy = authCopy[authType]
  const signOutUserLabel =
    currentUser?.name || currentUser?.email || busyUserLabel

  const handleBusyChange = (busy: boolean) => {
    if (busy) {
      setBusyAuthType(authType)
      if (authType === "sign-out" && currentUser) {
        setBusyUserLabel(currentUser.name || currentUser.email)
      }
    } else {
      setBusyAuthType(null)
      setBusyUserLabel(null)
    }

    setIsBusy(busy)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && isBusy) return
    props.onOpenChange(open)
  }

  // ui
  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {authType === "sign-in" && (
          <SignInForm
            onSuccess={() => props.onOpenChange(false)}
            onSignUp={() => setGuestAuthType("sign-up")}
            onBusyChange={handleBusyChange}
          />
        )}
        {authType === "sign-up" && (
          <SignUpForm
            onSuccess={() => props.onOpenChange(false)}
            onSignIn={() => setGuestAuthType("sign-in")}
            onBusyChange={handleBusyChange}
          />
        )}
        {authType === "sign-out" && signOutUserLabel && (
          <SignOutForm
            userLabel={signOutUserLabel}
            onCancel={() => props.onOpenChange(false)}
            onSuccess={() => {
              props.onOpenChange(false)
              props.onSignOutSuccess?.()
            }}
            onBusyChange={handleBusyChange}
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
  onBusyChange,
  onSuccess,
  onSignUp,
}: AuthFormProps & {
  onBusyChange: (isBusy: boolean) => void
  onSignUp: () => void
}) => {
  const { cancelMfaSignIn, signIn } = useClientAuth()
  const { setCurrentUser, setIsLoading } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaChallenge, setMfaChallenge] = useState<SignInMfaChallenge | null>(
    null
  )
  const hasPendingMfa = useRef(false)
  const completedMfa = useRef(false)

  const setSubmitting = (isSubmitting: boolean) => {
    setIsSubmitting(isSubmitting)
    onBusyChange(isSubmitting)
  }

  // discard a partial session when the dialog closes
  useEffect(() => {
    return () => {
      if (hasPendingMfa.current && !completedMfa.current) {
        void cancelMfaSignIn()
      }
    }
  }, [cancelMfaSignIn])

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const data = new FormData(event.currentTarget)
    const result = await signIn(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? "")
    )

    setSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    if ("type" in result && result.type === "mfa-challenge") {
      hasPendingMfa.current = true
      setMfaChallenge(result)
      return
    }

    onSuccess()
  }

  if (mfaChallenge) {
    return (
      <MfaSignInForm
        challenge={mfaChallenge}
        onChallengeChange={setMfaChallenge}
        onBack={() => {
          hasPendingMfa.current = false
          setMfaChallenge(null)
        }}
        onBusyChange={onBusyChange}
        onSuccess={(user) => {
          completedMfa.current = true
          setCurrentUser(user)
          setIsLoading(false)
          onSuccess()
        }}
      />
    )
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
      <Button
        type="button"
        variant="link"
        disabled={isSubmitting}
        onClick={onSignUp}>
        Ainda não tens conta? Criar conta
      </Button>
    </form>
  )
}

const mfaFactorCopy: Record<
  AuthenticationFactor,
  { label: string; description: string }
> = {
  [AuthenticationFactor.Totp]: {
    label: "Código da aplicação",
    description:
      "Introduz o código apresentado na tua aplicação autenticadora.",
  },
  [AuthenticationFactor.Email]: {
    label: "Código recebido por e-mail",
    description: "Enviámos um código de confirmação para o teu e-mail.",
  },
  [AuthenticationFactor.Phone]: {
    label: "Código recebido por SMS",
    description: "Enviámos um código de confirmação para o teu telemóvel.",
  },
  [AuthenticationFactor.Recoverycode]: {
    label: "Código de recuperação",
    description: "Introduz um dos códigos de recuperação que guardaste.",
  },
}

const mfaFactorAction: Record<AuthenticationFactor, string> = {
  [AuthenticationFactor.Totp]: "Usar aplicação autenticadora",
  [AuthenticationFactor.Email]: "Receber código por e-mail",
  [AuthenticationFactor.Phone]: "Receber código por SMS",
  [AuthenticationFactor.Recoverycode]: "Usar código de recuperação",
}

// props
type MfaSignInFormProps = Omit<AuthFormProps, "onSuccess"> & {
  challenge: SignInMfaChallenge
  onBack: () => void
  onBusyChange: (isBusy: boolean) => void
  onChallengeChange: (challenge: SignInMfaChallenge) => void
  onSuccess: (user: AuthUser) => void
}

const MfaSignInForm = ({
  challenge,
  onBack,
  onBusyChange,
  onChallengeChange,
  onSuccess,
}: MfaSignInFormProps) => {
  const { cancelMfaSignIn, completeMfaSignIn, createMfaChallenge } =
    useClientAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = mfaFactorCopy[challenge.factor]

  const setSubmitting = (isSubmitting: boolean) => {
    setIsSubmitting(isSubmitting)
    onBusyChange(isSubmitting)
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const data = new FormData(event.currentTarget)
    const result = await completeMfaSignIn(
      challenge.challengeId,
      String(data.get("otp") ?? "")
    )

    setSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onSuccess(result)
  }

  const switchFactor = async (factor: AuthenticationFactor) => {
    setError(null)
    setSubmitting(true)

    const result = await createMfaChallenge(factor)

    setSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onChallengeChange(result)
  }

  const goBack = async () => {
    setError(null)
    setSubmitting(true)

    const result = await cancelMfaSignIn()

    setSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onBack()
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-medium">{copy.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <AuthField
        label="Código"
        name="otp"
        autoComplete="one-time-code"
        inputMode={
          challenge.factor === AuthenticationFactor.Recoverycode
            ? "text"
            : "numeric"
        }
        disabled={isSubmitting}
      />
      <FormError message={error} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "A verificar…" : "Verificar"}
      </Button>
      {challenge.availableFactors
        .filter((factor) => factor !== challenge.factor)
        .map((factor) => (
          <Button
            key={factor}
            type="button"
            variant="link"
            disabled={isSubmitting}
            onClick={() => switchFactor(factor)}>
            {mfaFactorAction[factor]}
          </Button>
        ))}
      <Button
        type="button"
        variant="link"
        disabled={isSubmitting}
        onClick={goBack}>
        Voltar
      </Button>
    </form>
  )
}

const SignUpForm = ({
  onBusyChange,
  onSuccess,
  onSignIn,
}: AuthFormProps & {
  onBusyChange: (isBusy: boolean) => void
  onSignIn: () => void
}) => {
  const { signUp } = useClientAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setSubmitting = (isSubmitting: boolean) => {
    setIsSubmitting(isSubmitting)
    onBusyChange(isSubmitting)
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const data = new FormData(event.currentTarget)
    const result = await signUp({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    })

    setSubmitting(false)
    if (result instanceof Error) {
      setError(result.message)
      return
    }

    onSuccess()
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <AuthField
        label="Nome de utilizador"
        name="name"
        autoComplete="username"
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
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input
          className="mt-1 size-4 shrink-0 accent-accent"
          name="terms"
          type="checkbox"
          required
          disabled={isSubmitting}
        />
        <span>
          Confirmo que tenho pelo menos 13 anos, que li e aceito os{" "}
          <a
            className="font-semibold text-accent underline underline-offset-2"
            href="/legal/termos"
            target="_blank"
            rel="noreferrer">
            Termos e Condições
          </a>{" "}
          e que tomei conhecimento da{" "}
          <a
            className="font-semibold text-accent underline underline-offset-2"
            href="/legal/privacidade"
            target="_blank"
            rel="noreferrer">
            Política de Privacidade
          </a>
          . Se for menor, confirmo que tenho autorização do meu representante
          legal quando exigida.
        </span>
      </label>
      <FormError message={error} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "A criar conta…" : "Criar Conta"}
      </Button>
      <Button
        type="button"
        variant="link"
        disabled={isSubmitting}
        onClick={onSignIn}>
        Já tens conta? Iniciar sessão
      </Button>
    </form>
  )
}

const SignOutForm = ({
  onCancel,
  onBusyChange,
  userLabel,
  onSuccess,
}: AuthFormProps & {
  onCancel: () => void
  onBusyChange: (isBusy: boolean) => void
  userLabel: string
}) => {
  const { signOut } = useClientAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setSubmitting = (isSubmitting: boolean) => {
    setIsSubmitting(isSubmitting)
    onBusyChange(isSubmitting)
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signOut()

    setSubmitting(false)
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
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" disabled={isSubmitting}>
          {isSubmitting ? "A terminar sessão…" : "Terminar Sessão"}
        </Button>
      </div>
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
