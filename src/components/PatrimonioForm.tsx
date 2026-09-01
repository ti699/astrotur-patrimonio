import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS, ESTADOS, STATUS, categoriaPrefixo, type Categoria } from "@/lib/categorias";
import { DynamicSpecsFields } from "@/components/DynamicSpecsFields";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

type Props = {
  initial?: any;
  onSaved: (id: string) => void;
};

export function PatrimonioForm({ initial, onSaved }: Props) {
  const [form, setForm] = useState<any>({
    nome: "", categoria: "", subcategoria: "", descricao: "",
    numero_serie: "", marca: "", modelo: "", tag_empresa: "", fornecedor: "",
    data_aquisicao: "", garantia_ate: "",
    data_compra: "", data_inicio_garantia: "", data_fim_garantia: "", numero_garantia: "",
    valor_aquisicao: "", valor_atual: "",
    estado_conservacao: "Bom", status: "Em uso",
    responsavel_id: null, setor_id: null,
    localizacao: "", observacoes: "", foto_url: null,
    specs: {},
    ...initial,
  });
  const [setores, setSetores] = useState<any[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.from("setores").select("*").order("nome"),
        supabase.from("responsaveis").select("*").order("nome"),
      ]);
      setSetores(s ?? []);
      setResponsaveis(r ?? []);
    })();
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setSpec = (k: string, v: any) => setForm((f: any) => ({ ...f, specs: { ...(f.specs ?? {}), [k]: v } }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.categoria || !form.estado_conservacao) {
      toast.error("Preencha nome, categoria e estado.");
      return;
    }
    setSaving(true);
    try {
      let foto_url = form.foto_url;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("patrimonio-fotos").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("patrimonio-fotos").getPublicUrl(path);
        foto_url = pub.publicUrl;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        nome: form.nome,
        categoria: form.categoria,
        subcategoria: form.subcategoria || null,
        descricao: form.descricao || null,
        numero_serie: form.numero_serie || null,
        marca: form.marca || null,
        modelo: form.modelo || null,
        tag_empresa: form.tag_empresa || null,
        fornecedor: form.fornecedor || null,
        data_aquisicao: form.data_aquisicao || null,
        garantia_ate: form.garantia_ate || form.data_fim_garantia || null,
        data_compra: form.data_compra || null,
        data_inicio_garantia: form.data_inicio_garantia || null,
        data_fim_garantia: form.data_fim_garantia || null,
        numero_garantia: form.numero_garantia || null,
        valor_aquisicao: form.valor_aquisicao ? Number(form.valor_aquisicao) : 0,
        valor_atual: form.valor_atual ? Number(form.valor_atual) : 0,
        estado_conservacao: form.estado_conservacao,
        status: form.status,
        responsavel_id: form.responsavel_id || null,
        setor_id: form.setor_id || null,
        localizacao: form.localizacao || null,
        observacoes: form.observacoes || null,
        foto_url,
        specs: form.specs ?? {},
      };
      if (initial?.id) {
        const { error } = await supabase.from("patrimonios").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Patrimônio atualizado!");
        onSaved(initial.id);
      } else {
        payload.created_by = user?.id;
        const { data, error } = await supabase.from("patrimonios").insert(payload).select().single();
        if (error) throw error;
        toast.success(`Item cadastrado: ${data.codigo}`);
        onSaved(data.id);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const subcats = form.categoria ? CATEGORIAS[form.categoria as Categoria] ?? [] : [];

  return (
    <Card className="p-6 bg-card border-border">
      <form onSubmit={submit} className="space-y-6">
        <Section title="Identificação">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initial?.codigo ? (
              <Field label="Código (automático)">
                <Input value={initial.codigo} disabled className="font-mono text-primary" />
              </Field>
            ) : form.categoria && (
              <Field label="Próximo código">
                <Input value={`Faixa ${categoriaPrefixo(form.categoria)}`} disabled className="font-mono text-muted-foreground" />
              </Field>
            )}
            <Field label="Nome do item *">
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
            </Field>
            <Field label="Categoria *">
              <Select value={form.categoria} onValueChange={(v) => { set("categoria", v); set("subcategoria", ""); set("specs", {}); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORIAS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subcategoria">
              <Select value={form.subcategoria || ""} onValueChange={(v) => { set("subcategoria", v); set("specs", {}); }} disabled={!form.categoria}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {subcats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Descrição detalhada">
            <Textarea value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} rows={2} />
          </Field>
        </Section>

        <Section title="Identificadores">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={(e) => set("marca", e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={(e) => set("modelo", e.target.value)} /></Field>
            <Field label="Nº de série"><Input value={form.numero_serie ?? ""} onChange={(e) => set("numero_serie", e.target.value)} /></Field>
            <Field label="TAG da empresa"><Input value={form.tag_empresa ?? ""} onChange={(e) => set("tag_empresa", e.target.value)} /></Field>
          </div>
        </Section>

        {form.subcategoria && (
          <Section title="Especificações técnicas">
            <DynamicSpecsFields subcategoria={form.subcategoria} values={form.specs ?? {}} onChange={setSpec} />
          </Section>
        )}

        <Section title="Aquisição e garantia">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <Field label="Fornecedor"><Input value={form.fornecedor ?? ""} onChange={(e) => set("fornecedor", e.target.value)} /></Field>
            <Field label="Data de compra"><Input type="date" value={form.data_compra ?? ""} onChange={(e) => set("data_compra", e.target.value)} /></Field>
            <Field label="Data de aquisição"><Input type="date" value={form.data_aquisicao ?? ""} onChange={(e) => set("data_aquisicao", e.target.value)} /></Field>
            <Field label="Nº da garantia"><Input value={form.numero_garantia ?? ""} onChange={(e) => set("numero_garantia", e.target.value)} placeholder="Ex: NF/Contrato" /></Field>
            <Field label="Início da garantia"><Input type="date" value={form.data_inicio_garantia ?? ""} onChange={(e) => set("data_inicio_garantia", e.target.value)} /></Field>
            <Field label="Fim da garantia"><Input type="date" value={form.data_fim_garantia ?? ""} onChange={(e) => set("data_fim_garantia", e.target.value)} /></Field>
            <Field label="Valor de aquisição (R$)"><Input type="number" step="0.01" value={form.valor_aquisicao ?? ""} onChange={(e) => set("valor_aquisicao", e.target.value)} /></Field>
            <Field label="Valor atual (R$)"><Input type="number" step="0.01" value={form.valor_atual ?? ""} onChange={(e) => set("valor_atual", e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Estado de conservação *">
              <Select value={form.estado_conservacao} onValueChange={(v) => set("estado_conservacao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="Alocação">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Responsável">
              <Select value={form.responsavel_id ?? ""} onValueChange={(v) => set("responsavel_id", v || null)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Setor / Departamento">
              <Select value={form.setor_id ?? ""} onValueChange={(v) => set("setor_id", v || null)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Localização física (sala/andar/bloco)">
            <Input value={form.localizacao ?? ""} onChange={(e) => set("localizacao", e.target.value)} />
          </Field>
          <Field label="Observações">
            <Textarea value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
          </Field>
        </Section>

        <Section title="Foto do item">
          <div className="flex items-center gap-4">
            {(file || form.foto_url) && (
              <div className="relative">
                <img src={file ? URL.createObjectURL(file) : form.foto_url} alt="" className="w-24 h-24 object-cover rounded-md border border-border" />
                <button type="button" onClick={() => { setFile(null); set("foto_url", null); }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent rounded-md text-sm">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Selecionar foto"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </Section>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-wider text-primary font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
