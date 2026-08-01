import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ProfileButton } from "./profile-controls"

type MfaActionDialogProps = {
  open: boolean
  error: string | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const MfaDisableDialog = ({
  open,
  error,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: MfaActionDialogProps) => {
  // ui
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Desativar autenticação de dois fatores?</DialogTitle>
          <DialogDescription>
            A aplicação autenticadora e os códigos de recuperação continuam
            associados à conta. Se reativares a proteção, estes fatores serão
            reutilizados.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          Se já não tens acesso aos fatores guardados, não os reatives sem
          recuperares primeiro os códigos.
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ProfileButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}>
            Cancelar
          </ProfileButton>
          <ProfileButton disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? "A desativar…" : "Desativar e manter fatores"}
          </ProfileButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
