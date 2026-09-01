// Utilitários para Controle de Garantias

export type GarantiaStatus = "ativa" | "vencendo_30" | "vencendo_60" | "vencida" | "sem_garantia";

export function getGarantiaFim(item: any): string | null {
  return item?.data_fim_garantia ?? item?.garantia_ate ?? null;
}

export function diasParaVencer(item: any): number | null {
  const fim = getGarantiaFim(item);
  if (!fim) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const f = new Date(fim + "T00:00:00");
  return Math.ceil((f.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function garantiaStatus(item: any): GarantiaStatus {
  const d = diasParaVencer(item);
  if (d === null) return "sem_garantia";
  if (d < 0) return "vencida";
  if (d <= 30) return "vencendo_30";
  if (d <= 60) return "vencendo_60";
  return "ativa";
}

export const garantiaLabel: Record<GarantiaStatus, string> = {
  ativa: "Garantia ativa",
  vencendo_30: "Vence em até 30 dias",
  vencendo_60: "Vence em até 60 dias",
  vencida: "Garantia vencida",
  sem_garantia: "Sem garantia",
};

export const garantiaBadgeClass: Record<GarantiaStatus, string> = {
  ativa: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  vencendo_30: "bg-destructive/15 text-destructive border-destructive/30",
  vencendo_60: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  vencida: "bg-destructive/20 text-destructive border-destructive/40",
  sem_garantia: "bg-muted/40 text-muted-foreground border-border",
};
