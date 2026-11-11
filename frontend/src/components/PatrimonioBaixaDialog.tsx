import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type PatrimonioBaixaDialogProps = {
  itemName: string;
  disabled?: boolean;
  pending?: boolean;
  onConfirm: (reason: string) => Promise<void>;
};

export function PatrimonioBaixaDialog({
  itemName,
  disabled = false,
  pending = false,
  onConfirm,
}: PatrimonioBaixaDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setReason("");
      setValidationError("");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setValidationError("Informe a justificativa para realizar a baixa.");
      return;
    }

    setValidationError("");
    try {
      await onConfirm(trimmedReason);
      setReason("");
      setOpen(false);
    } catch {
      setValidationError("Não foi possível registrar a baixa. Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Registrar descarte/baixa de ${itemName}`}
          title={disabled ? "Este patrimônio já foi descartado" : "Registrar descarte/baixa"}
          disabled={disabled || pending}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <AlertTriangle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirmar descarte / baixa</DialogTitle>
            <DialogDescription>
              O patrimônio “{itemName}” será marcado como descartado. Esta ação deve ser
              justificada.
            </DialogDescription>
          </DialogHeader>
          <div className="my-5 space-y-2">
            <label htmlFor="baixa-motivo" className="text-sm font-medium">
              Justificativa / motivo <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="baixa-motivo"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Descreva o motivo do descarte ou da baixa..."
              required
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "baixa-motivo-erro" : undefined}
              minLength={1}
              disabled={pending}
              className="min-h-28"
            />
            {validationError && (
              <p id="baixa-motivo-erro" role="alert" className="text-sm text-destructive">
                {validationError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
              {pending ? "Registrando..." : "Confirmar baixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
