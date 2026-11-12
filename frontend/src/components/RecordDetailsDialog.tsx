import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RecordDetail = {
  label: string;
  value: ReactNode;
};

type RecordDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  details: RecordDetail[];
};

export function RecordDetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
}: RecordDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <dl className="grid gap-4 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="min-w-0 space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {detail.label}
              </dt>
              <dd className="break-words whitespace-pre-wrap text-sm">{detail.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
