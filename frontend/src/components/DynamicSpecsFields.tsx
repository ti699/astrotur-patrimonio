import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FieldGroup } from "@/lib/categorias";
import { SUBCATEGORIA_FIELDS } from "@/lib/categorias";

type Props = {
  subcategoria?: string | null;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
};

export function DynamicSpecsFields({ subcategoria, values, onChange }: Props) {
  const groups: FieldGroup[] = subcategoria ? SUBCATEGORIA_FIELDS[subcategoria] ?? [] : [];
  if (groups.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.title} className="space-y-3 rounded-md border border-border bg-background/40 p-4">
          <h4 className="text-xs uppercase tracking-wider text-primary font-semibold">{g.title}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.fields.map((f) => {
              const v = values[f.key];
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  {f.type === "text" && (
                    <Input value={v ?? ""} placeholder={f.placeholder} onChange={(e) => onChange(f.key, e.target.value)} />
                  )}
                  {f.type === "number" && (
                    <Input type="number" value={v ?? ""} placeholder={f.placeholder} onChange={(e) => onChange(f.key, e.target.value === "" ? null : Number(e.target.value))} />
                  )}
                  {f.type === "date" && (
                    <Input type="date" value={v ?? ""} onChange={(e) => onChange(f.key, e.target.value)} />
                  )}
                  {f.type === "select" && (
                    <Select value={v ?? ""} onValueChange={(val) => onChange(f.key, val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {f.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {f.type === "boolean" && (
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={!!v} onCheckedChange={(c) => onChange(f.key, c)} />
                      <span className="text-sm text-muted-foreground">{v ? "Sim" : "Não"}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
