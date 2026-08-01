import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ProfileButton } from "./profile-controls"

type DeactivateAccountDialogProps = {
  open: boolean
  error: string | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const DeactivateAccountDialog = ({
  open,
  error,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: DeactivateAccountDialogProps) => {
  const [confirmation, setConfirmation] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    onOpenChange(nextOpen)
  }

  // ui
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Eliminar conta</DialogTitle>
          <DialogDescription>
            Esta ação elimina permanentemente a conta, as classificações e os
            comentários associados. As denúncias são anonimizadas e conservadas
            apenas segundo os prazos legais aplicáveis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              Escreve <strong>ELIMINAR</strong> para confirmar
            </span>
            <input
              value={confirmation}
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20"
            />
          </label>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ProfileButton
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}>
              Cancelar
            </ProfileButton>
            <ProfileButton
              variant="danger"
              disabled={confirmation !== "ELIMINAR" || isSubmitting}
              onClick={onConfirm}>
              {isSubmitting ? "A eliminar…" : "Eliminar permanentemente"}
            </ProfileButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
