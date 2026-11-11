import { CalendarClock, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type PatrimonioTimelineEvent = {
  id: string;
  date: string;
  type: "movimentacao" | "manutencao" | "status" | "descarte" | "historico";
  title: string;
  description?: string | null;
  responsible?: string | null;
};

type PatrimonioTimelineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: { codigo?: string; nome: string } | null;
  events: PatrimonioTimelineEvent[];
  loading?: boolean;
  error?: string | null;
};

const eventStyles: Record<PatrimonioTimelineEvent["type"], string> = {
  movimentacao:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  manutencao:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  status:
    "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200",
  descarte:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  historico:
    "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

const eventLabels: Record<PatrimonioTimelineEvent["type"], string> = {
  movimentacao: "Troca de posse",
  manutencao: "Manutenção",
  status: "Mudança de status",
  descarte: "Descarte / baixa",
  historico: "Histórico",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleString("pt-BR");
}

export function PatrimonioTimelineDialog({
  open,
  onOpenChange,
  item,
  events,
  loading = false,
  error,
}: PatrimonioTimelineDialogProps) {
  const chronologicalEvents = [...events].sort(
    (first, second) => new Date(first.date).getTime() - new Date(second.date).getTime(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico do patrimônio
          </DialogTitle>
          <DialogDescription>
            {item
              ? `${item.codigo ? `${item.codigo} — ` : ""}${item.nome}`
              : "Linha do tempo do item"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando histórico...</p>
        ) : error ? (
          <p role="alert" className="py-8 text-center text-sm text-destructive">
            {error}
          </p>
        ) : chronologicalEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum evento registrado para este item.
          </p>
        ) : (
          <ol className="relative ml-2 space-y-6 border-l border-border py-2">
            {chronologicalEvents.map((event) => (
              <li key={event.id} className="relative pl-6">
                <span className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={eventStyles[event.type]}>
                    {eventLabels[event.type]}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDate(event.date)}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold">{event.title}</h3>
                {event.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {event.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Responsável: {event.responsible?.trim() || "Não informado"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
