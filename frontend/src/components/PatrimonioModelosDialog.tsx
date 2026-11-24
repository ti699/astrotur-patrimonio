import { useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS, type Categoria } from "@/lib/categorias";
import type { PatrimonioModelo } from "@/lib/patrimonioModelos";
import { toast } from "sonner";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";

type Props = {
  modelos: PatrimonioModelo[];
  onModelosChange: (modelos: PatrimonioModelo[]) => void;
};

export function PatrimonioModelosDialog({ modelos, onModelosChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PatrimonioModelo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const persistirModelos = async (novosModelos: PatrimonioModelo[]) => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/settings", { patrimonio_modelos: novosModelos });
      onModelosChange(data.patrimonio_modelos ?? novosModelos);
      toast.success("Modelos padrão salvos.");
      return true;
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : error instanceof Error ? error.message : undefined;
      toast.error(message ?? "Erro ao salvar os modelos.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const novoModelo = () => {
    setDeletingId(null);
    setDraft({
      id: crypto.randomUUID(),
      nome: "",
      categoria: "TI",
      subcategoria: "Notebooks",
      marca: "",
      modelo: "",
      specs: {},
    });
  };

  const salvarModelo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const nome = draft.nome.trim();
    if (!nome || !draft.categoria || !draft.subcategoria) {
      toast.error("Informe o nome, a categoria e a subcategoria do modelo.");
      return;
    }
    if (modelos.some((modelo) => modelo.id !== draft.id && modelo.nome.trim().toLocaleLowerCase() === nome.toLocaleLowerCase())) {
      toast.error("Já existe um modelo padrão com esse nome.");
      return;
    }

    const modeloSalvo = { ...draft, nome };
    const novosModelos = modelos.some((modelo) => modelo.id === draft.id)
      ? modelos.map((modelo) => modelo.id === draft.id ? modeloSalvo : modelo)
      : [...modelos, modeloSalvo];
    if (await persistirModelos(novosModelos)) setDraft(null);
  };

  const excluirModelo = async (id: string) => {
    const novosModelos = modelos.filter((modelo) => modelo.id !== id);
    if (await persistirModelos(novosModelos)) {
      if (draft?.id === id) setDraft(null);
      setDeletingId(null);
    }
  };

  const updateDraft = (key: keyof PatrimonioModelo, value: string) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const updateSpec = (key: keyof PatrimonioModelo["specs"], value: string | number | null) => {
    setDraft((current) => current
      ? { ...current, specs: { ...current.specs, [key]: value } }
      : current);
  };

  const subcategorias = draft && draft.categoria in CATEGORIAS
    ? CATEGORIAS[draft.categoria as Categoria]
    : [];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setDraft(null);
        setDeletingId(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">Gerenciar modelos</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modelos padrão de patrimônio</DialogTitle>
          <DialogDescription>
            Os modelos são compartilhados. Ao aplicá-los, os campos comuns são preenchidos e continuam editáveis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-3">
            <Button type="button" size="sm" onClick={novoModelo} disabled={saving}>
              <Plus className="h-4 w-4" /> Novo modelo
            </Button>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {modelos.map((modelo) => (
                <Card key={modelo.id} className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{modelo.nome}</p>
                      <p className="text-xs text-muted-foreground">{modelo.categoria} · {modelo.subcategoria}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Editar ${modelo.nome}`}
                        onClick={() => {
                          setDeletingId(null);
                          setDraft({ ...modelo, specs: { ...modelo.specs } });
                        }}
                        disabled={saving}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir ${modelo.nome}`}
                        onClick={() => {
                          setDraft(null);
                          setDeletingId((current) => current === modelo.id ? null : modelo.id);
                        }}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {deletingId === modelo.id && (
                    <div className="flex items-center justify-between gap-2 border-t pt-2">
                      <span className="text-xs text-muted-foreground">Excluir este modelo?</span>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => excluirModelo(modelo.id)} disabled={saving}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              {modelos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>}
            </div>
          </div>

          {draft && (
            <form onSubmit={salvarModelo} className="space-y-4 rounded-md border p-4">
              <h3 className="text-sm font-semibold">{modelos.some((modelo) => modelo.id === draft.id) ? "Editar modelo" : "Novo modelo"}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome do modelo *</Label>
                  <Input value={draft.nome} onChange={(event) => updateDraft("nome", event.target.value)} maxLength={100} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria *</Label>
                  <Select
                    value={draft.categoria}
                    onValueChange={(value) => setDraft((current) => current
                      ? { ...current, categoria: value, subcategoria: "" }
                      : current)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(CATEGORIAS).map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subcategoria *</Label>
                  <Select value={draft.subcategoria} onValueChange={(value) => updateDraft("subcategoria", value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {subcategorias.map((subcategoria) => (
                        <SelectItem key={subcategoria} value={subcategoria}>{subcategoria}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Marca</Label>
                  <Input value={draft.marca} onChange={(event) => updateDraft("marca", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <Input value={draft.modelo} onChange={(event) => updateDraft("modelo", event.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Processador</Label>
                  <Input value={draft.specs.processador ?? ""} onChange={(event) => updateSpec("processador", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>RAM (GB)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draft.specs.ram_gb ?? ""}
                    onChange={(event) => updateSpec("ram_gb", event.target.value === "" ? null : Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de RAM</Label>
                  <Select value={draft.specs.ram_tipo || ""} onValueChange={(value) => updateSpec("ram_tipo", value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {["DDR3", "DDR4", "DDR5"].map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Armazenamento</Label>
                  <Select value={draft.specs.armaz_tipo || ""} onValueChange={(value) => updateSpec("armaz_tipo", value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {["HD", "SSD SATA", "SSD NVMe"].map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Capacidade (GB)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draft.specs.armaz_gb ?? ""}
                    onChange={(event) => updateSpec("armaz_gb", event.target.value === "" ? null : Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Sistema operacional</Label>
                  <Input value={draft.specs.so ?? ""} onChange={(event) => updateSpec("so", event.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={saving}>Cancelar</Button>
                <Button type="submit" disabled={saving || !draft.nome.trim() || !draft.subcategoria}>
                  <Save className="h-4 w-4" /> Salvar modelo
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
