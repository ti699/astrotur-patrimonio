import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Eye, Trash2, Loader2, File } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = ["Nota Fiscal", "Garantia", "Manual", "Contrato", "Foto", "Outros"] as const;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx";
const MIME_OK = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_MB = 25;

type Doc = {
  id: string;
  patrimonio_id: string;
  nome_arquivo: string;
  tipo: string;
  categoria: string;
  url: string;
  storage_path: string;
  tamanho: number | null;
  data_upload: string;
};

export function DocumentosPatrimonio({ patrimonioId }: { patrimonioId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState<string>("Outros");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("documentos")
      .select("*")
      .eq("patrimonio_id", patrimonioId)
      .order("data_upload", { ascending: false });
    if (error) toast.error("Erro ao carregar documentos");
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [patrimonioId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo excede ${MAX_MB}MB`);
      return;
    }
    if (!MIME_OK.includes(file.type) && !/\.(pdf|jpe?g|png|docx|xlsx)$/i.test(file.name)) {
      toast.error("Tipo de arquivo não permitido");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${patrimonioId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("patrimonio-documentos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("patrimonio-documentos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await (supabase as any).from("documentos").insert({
        patrimonio_id: patrimonioId,
        nome_arquivo: file.name,
        tipo: file.type || ext,
        categoria,
        url: signed?.signedUrl ?? "",
        storage_path: path,
        tamanho: file.size,
        usuario_upload: userData.user?.id ?? null,
      });
      if (insErr) throw insErr;

      toast.success("Documento enviado");
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Excluir "${doc.nome_arquivo}"?`)) return;
    const { error: stErr } = await supabase.storage
      .from("patrimonio-documentos")
      .remove([doc.storage_path]);
    if (stErr) toast.error("Erro ao remover arquivo do storage");
    const { error } = await (supabase as any).from("documentos").delete().eq("id", doc.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Documento excluído");
    setDocs((d) => d.filter((x) => x.id !== doc.id));
  };

  const getSignedUrl = async (doc: Doc) => {
    const { data } = await supabase.storage
      .from("patrimonio-documentos")
      .createSignedUrl(doc.storage_path, 60 * 5);
    return data?.signedUrl;
  };

  const handleView = async (doc: Doc) => {
    const url = await getSignedUrl(doc);
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async (doc: Doc) => {
    const url = await getSignedUrl(doc);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.nome_arquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const fmtSize = (n: number | null) => {
    if (!n) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const catColor: Record<string, string> = {
    "Nota Fiscal": "bg-blue-600",
    "Garantia": "bg-green-600",
    "Manual": "bg-purple-600",
    "Contrato": "bg-yellow-600",
    "Foto": "bg-pink-600",
    "Outros": "bg-zinc-600",
  };

  return (
    <Card className="p-6 bg-card border-border lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" /> Documentos
        </h3>
        <div className="flex items-center gap-2">
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleUpload}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Enviando..." : "Enviar documento"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Tipos aceitos: PDF, JPG, PNG, DOCX, XLSX (máx. {MAX_MB}MB).
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : docs.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
          Nenhum documento anexado a este patrimônio.
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <File className="h-8 w-8 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{d.nome_arquivo}</span>
                  <Badge className={`${catColor[d.categoria] ?? "bg-muted"} text-white border-0`}>
                    {d.categoria}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtSize(d.tamanho)} • {new Date(d.data_upload).toLocaleString("pt-BR")}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleView(d)} title="Visualizar">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDownload(d)} title="Download">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(d)} title="Excluir">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
