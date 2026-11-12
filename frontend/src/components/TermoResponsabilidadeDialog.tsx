import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import { imprimirPDF } from "@/lib/relatorios";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

type TermModel = "smartphone" | "notebook";

type Witness = {
  nome: string;
  rg: string;
  cpf: string;
};

type TermForm = {
  modeloEquipamento: string;
  numeroSerie: string;
  imei2: string;
  responsavel: string;
  cpf: string;
  acessorios: string;
  data: string;
  testemunha1: Witness;
  testemunha2: Witness;
};

type TermItem = {
  id: string;
  codigo?: string | null;
  nome?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  responsavel?: { nome?: string | null } | null;
};

type Props = {
  item: TermItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmitted: (event: Record<string, any>) => void;
};

const clauses: Record<TermModel, string[]> = {
  smartphone: [
    "Se o equipamento for danificado ou inutilizado por emprego inadequado, mau uso, negligência ou extravio a empresa me fornecerá novo equipamento e se reserva no direito de cobrar o valor de reparo do equipamento ou de um aparelho novo, se for o caso, da mesma marca e modelo ou equivalente ao da praça.",
    "Em caso de dano, inutilização ou extravio do equipamento deverei comunicar imediatamente ao setor competente e realizar a abertura de um Boletim de Ocorrência na delegacia mais próxima.",
    "Terminando os serviços ou no caso de rescisão do contrato de trabalho, o equipamento deve ser devolvido com seus respectivos acessórios e em perfeito estado de conservação, considerando-se o tempo do uso deste, ao setor competente.",
    "Estando o equipamento em minha posse, estarei sujeito a inspeções sem prévio aviso.",
    "Estou ciente que poderei usar o equipamento apenas no exercício da atividade profissional, dentro do horário previamente estabelecido.",
    "Nenhum aplicativo poderá ser baixado ou adicionado ao equipamento sem prévia ou expressa autorização da Empresa.",
    "Devo manter em sigilo e confidencialidade arquivos de uso profissional, sendo minha inteira responsabilidade quanto ao manuseio do equipamento seja que finalidade for.",
    "Não é permitido copiar, resumir, imprimir em todo ou em parte, qualquer documento, programa de computação, arquivos de configuração, ou ainda, qualquer documento de propriedade da Empregadora, ainda que estes não sejam considerados informação confidencial, exceto quando estes procedimentos sejam requisitos essenciais para o desenvolvimento do cargo, em cujo caso cada cópia ou resumo será propriedade da Empregadora.",
    "A utilização de rede de internet móvel está restrita às condições e limites disponibilizados pela Empresa.",
    "Os downloads de áudio, imagem ou vídeo são terminantemente proibidos, bem como a baixa de aplicativos não condizentes ou autorizados pela Empresa.",
    "É proibido criar e/ou remover arquivos fora da área alocada ao usuário e/ou que venham a comprometer o desempenho e funcionamento do sistema ou do equipamento.",
    "É proibido o uso de softwares de comunicação e mensagens instantâneas e afins, ou outros aplicativos que permitem baixar e armazenar arquivos de áudio, vídeos, fotos etc.",
    "Incorre em falta grave, passível de demissão, aquele que desrespeitar qualquer dos itens anteriores.",
  ],
  notebook: [
    "Caso o notebook seja danificado ou inutilizado em razão de uso inadequado, mau uso, negligência ou extravio, a Empresa poderá fornecer outro equipamento, reservando-se o direito de cobrar o valor correspondente ao reparo ou à substituição por um equipamento novo da mesma marca e modelo, ou equivalente disponível no mercado.",
    "Em caso de dano, inutilização, furto, roubo ou extravio do notebook ou do carregador, deverei comunicar imediatamente ao setor competente da Empresa. Nos casos de furto, roubo ou extravio, também deverei registrar um Boletim de Ocorrência e apresentar uma cópia à Empresa.",
    "Ao término da prestação dos serviços ou em caso de rescisão do contrato de trabalho, o notebook deverá ser devolvido ao setor competente juntamente com o carregador, em bom estado de conservação, considerando-se apenas o desgaste natural decorrente do tempo e do uso adequado.",
    "Enquanto o notebook estiver sob minha responsabilidade, o equipamento poderá ser submetido a inspeções, verificações, manutenções e atualizações realizadas pelo setor competente da Empresa, quando necessário.",
    "Estou ciente de que o notebook deverá ser utilizado exclusivamente para o exercício das minhas atividades profissionais e de acordo com as normas e horários estabelecidos pela Empresa.",
    "Nenhum programa, aplicativo, extensão, driver ou software poderá ser instalado, removido ou alterado sem autorização prévia e expressa do setor competente da Empresa.",
    "Deverei manter o sigilo e a confidencialidade de todos os arquivos, documentos, senhas, dados e informações profissionais armazenados ou acessados por meio do notebook, sendo de minha responsabilidade o correto manuseio e utilização do equipamento.",
    "Não é permitido copiar, compartilhar, enviar, resumir, imprimir ou reproduzir, total ou parcialmente, documentos, programas, arquivos de configuração ou quaisquer outros materiais de propriedade da Empresa, exceto quando tais procedimentos forem necessários para o exercício das atividades profissionais e estiverem devidamente autorizados.",
    "A utilização de redes de internet, Wi-Fi, VPN, dados móveis, armazenamento em nuvem e demais recursos de conexão deverá respeitar as condições, os limites e as políticas de segurança estabelecidas pela Empresa.",
    "É proibido realizar downloads de arquivos, áudios, imagens, vídeos, jogos, programas ou outros conteúdos que não estejam relacionados às atividades profissionais ou que não tenham sido previamente autorizados pela Empresa.",
    "É proibido criar, modificar, mover ou excluir arquivos, pastas, configurações ou componentes do sistema fora da área destinada ao usuário, especialmente quando essas ações puderem comprometer a segurança, o desempenho ou o funcionamento do notebook e dos sistemas da Empresa.",
    "É proibida a utilização de programas de comunicação, mensagens instantâneas, compartilhamento de arquivos ou armazenamento pessoal que não tenham sido autorizados pela Empresa.",
    "O usuário não deverá emprestar, ceder ou permitir que terceiros utilizem o notebook, o carregador, suas senhas ou credenciais de acesso, salvo mediante autorização expressa da Empresa.",
  ],
};

const accessoriesFor = (model: TermModel) =>
  model === "smartphone" ? "carregador acompanhado do cabo USB TIPO C" : "carregador";

const localDateValue = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function createForm(item: TermItem, model: TermModel): TermForm {
  return {
    modeloEquipamento: item.modelo || item.nome || "",
    numeroSerie: item.numero_serie || item.codigo || "",
    imei2: "",
    responsavel: item.responsavel?.nome ?? "",
    cpf: "",
    acessorios: accessoriesFor(model),
    data: localDateValue(),
    testemunha1: { nome: "", rg: "", cpf: "" },
    testemunha2: { nome: "", rg: "", cpf: "" },
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTermDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `Recife, ${String(day).padStart(2, "0")} de ${months[month - 1]} de ${year}`;
}

function makeDocument(model: TermModel, form: TermForm, itemCode: string) {
  const title = model === "smartphone"
    ? "TERMO DE RESPONSABILIDADE PELA GUARDA E USO DO EQUIPAMENTO DE TRABALHO - SMARTPHONE DE TRABALHO"
    : "TERMO DE RESPONSABILIDADE PELA GUARDA E USO DO EQUIPAMENTO DE TRABALHO - NOTEBOOK DE TRABALHO";
  const serialLabel = model === "smartphone" ? "Número de Série / IMEI" : "Número de Série";
  const serial = model === "smartphone" && form.imei2.trim()
    ? `${form.numeroSerie} / IMEI 2: ${form.imei2}`
    : form.numeroSerie;
  const witnessBlock = (witness: Witness, number: number) => `
    <div class="signature">
      <div class="line"></div>
      <strong>Testemunha ${number}</strong>
      <div>Nome: ${escapeHtml(witness.nome) || "________________________________"}</div>
      <div>RG: ${escapeHtml(witness.rg) || "________________"} &nbsp; CPF: ${escapeHtml(witness.cpf) || "________________"}</div>
    </div>`;
  const intro = `Recebi da empresa TRANSPORTES E SERVIÇOS ASTRO LTDA (ASTROTUR), inscrita no CNPJ/MF sob o nº 41.070.889/0001-60, com sede à Av. Dr. José Rufino, Nº 151, Estância, Recife/PE, a título de empréstimo, para meu uso exclusivo, conforme determinado na lei, o equipamento especificado neste termo de responsabilidade com os acessórios ${escapeHtml(form.acessorios)}, comprometendo-me a mantê-lo em perfeito estado de conservação, pelo que declaro que:`;

  return `
    <style>
      .term{font-family:Arial,sans-serif;color:#111;font-size:9pt;line-height:1.25}
      .term-header{display:flex;justify-content:space-between;align-items:center;font-size:10px;line-height:1;margin-bottom:4px}
      .term-header .brand{font-weight:700}
      .term-header .brand span{color:#c0392b}
      .term-header .asset-code{font-size:10px;color:#555}
      .term h1{color:#111;border:0;padding:0;text-align:center;font-size:11.5pt;line-height:1.2;margin:0 0 7px}
      .term .identification{border:1px solid #777;padding:5px 7px;margin-bottom:6px;display:grid;grid-template-columns:1fr 1fr;gap:2px 12px}
      .term .intro{text-align:justify;margin:5px 0}
      .term ol{padding-left:20px;margin:5px 0;text-align:justify}
      .term li{padding-left:2px;margin:0 0 2px;break-inside:avoid}
      .term .closing{text-align:justify;margin:6px 0}
      .term .date{text-align:right;margin:6px 0}
      .term .signatures{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin-top:4px;break-inside:avoid}
      .term .signature{font-size:9pt;line-height:1.25;break-inside:avoid;overflow-wrap:anywhere}
      .term .line{height:1px;border-top:1px solid #222;margin:14px 0 3px}
      .term .employee{grid-column:1/-1;width:60%;margin:0 auto 4px;text-align:center}
      .term .employee .line{margin-top:22px}
      @media print{
        .term{font-size:9pt;line-height:1.25;break-inside:avoid;page-break-inside:avoid}
        .term li{font-size:9pt;line-height:1.25;margin-bottom:2px}
        .term .signatures{gap:8px 18px;margin-top:4px}
      }
    </style>
    <main class="term">
      <header class="term-header">
        <span class="brand"><span>ASTRO</span>TUR</span>
        <span class="asset-code">${escapeHtml(itemCode)}</span>
      </header>
      <h1>${title}</h1>
      <section class="identification">
        <div><strong>Nome:</strong> ${escapeHtml(form.responsavel)}</div>
        <div><strong>CPF:</strong> ${escapeHtml(form.cpf)}</div>
        <div><strong>MODELO:</strong> ${escapeHtml(form.modeloEquipamento)}</div>
        <div><strong>${serialLabel}:</strong> ${escapeHtml(serial)}</div>
      </section>
      <p class="intro">${intro}</p>
      <ol>${clauses[model].map((clause) => `<li>${escapeHtml(clause)}</li>`).join("")}</ol>
      <p class="closing">Ciente de toda responsabilidade e condições, firmo o presente termo assinando na presença de duas testemunhas que a tudo acompanharam.</p>
      <p class="date">${formatTermDate(form.data)}</p>
      <section class="signatures">
        <div class="signature employee">
          <div class="line"></div>
          <strong>Funcionário(a)</strong>
          <div>Nome: ${escapeHtml(form.responsavel)}</div>
          <div>CPF: ${escapeHtml(form.cpf)}</div>
        </div>
        ${witnessBlock(form.testemunha1, 1)}
        ${witnessBlock(form.testemunha2, 2)}
      </section>
    </main>`;
}

export function TermoResponsabilidadeDialog({ item, open, onOpenChange, onEmitted }: Props) {
  const [model, setModel] = useState<TermModel>("smartphone");
  const [form, setForm] = useState<TermForm>(() => createForm(item, "smartphone"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setModel("smartphone");
      setForm(createForm(item, "smartphone"));
    }
  }, [open, item]);

  const updateWitness = (witness: "testemunha1" | "testemunha2", field: keyof Witness, value: string) => {
    setForm((current) => ({
      ...current,
      [witness]: { ...current[witness], [field]: value },
    }));
  };

  const changeModel = (value: string) => {
    const nextModel: TermModel = value === "notebook" ? "notebook" : "smartphone";
    setModel(nextModel);
    setForm((current) => ({ ...current, acessorios: accessoriesFor(nextModel), imei2: "" }));
  };

  const emit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.cpf.trim()) {
      toast.error("Informe o CPF do funcionário.");
      return;
    }
    const [year, month, day] = form.data.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.data) ||
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      toast.error("Informe uma data válida para o termo.");
      return;
    }

    setSaving(true);
    try {
      const { data: historyEvent } = await api.post(`/patrimonios/${item.id}/termo-responsabilidade`, {
        modelo: model,
        responsavel: form.responsavel.trim(),
      });
      onEmitted(historyEvent);
      imprimirPDF(
        `Termo de Responsabilidade - ${item.codigo ?? item.nome ?? "Patrimônio"}`,
        makeDocument(model, form, item.codigo ?? ""),
        "A4 portrait",
        "10mm 12mm",
        false,
      );
      toast.success("Termo registrado no histórico. Use a opção Salvar como PDF na janela de impressão.");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao emitir termo de responsabilidade:", error);
      toast.error("Não foi possível registrar a emissão do termo. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Termo de Responsabilidade</DialogTitle>
          <DialogDescription>
            Confira os dados e escolha o modelo. O termo será aberto para impressão ou salvamento em PDF.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={emit} className="space-y-5">
          <div className="space-y-2">
            <Label>Modelo do termo</Label>
            <Select value={model} onValueChange={changeModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="smartphone">Smartphone de Trabalho</SelectItem>
                <SelectItem value="notebook">Notebook de Trabalho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="term-model">Modelo do equipamento</Label>
              <Input id="term-model" value={form.modeloEquipamento} onChange={(e) => setForm({ ...form, modeloEquipamento: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term-serial">{model === "smartphone" ? "Número de Série / IMEI" : "Número de Série"}</Label>
              <Input id="term-serial" value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} />
            </div>
            {model === "smartphone" && (
              <div className="space-y-2">
                <Label htmlFor="term-imei2">IMEI 2 (opcional)</Label>
                <Input id="term-imei2" value={form.imei2} onChange={(e) => setForm({ ...form, imei2: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="term-employee">Nome do funcionário</Label>
              <Input id="term-employee" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term-cpf">CPF do funcionário *</Label>
              <Input id="term-cpf" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term-date">Data do termo</Label>
              <Input id="term-date" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="term-accessories">Acessórios entregues</Label>
              <Input id="term-accessories" value={form.acessorios} onChange={(e) => setForm({ ...form, acessorios: e.target.value })} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(["testemunha1", "testemunha2"] as const).map((witness, index) => (
              <fieldset key={witness} className="space-y-3 rounded-md border border-border p-3">
                <legend className="px-1 text-sm font-medium">Testemunha {index + 1}</legend>
                <div className="space-y-2">
                  <Label htmlFor={`${witness}-nome`}>Nome</Label>
                  <Input id={`${witness}-nome`} value={form[witness].nome} onChange={(e) => updateWitness(witness, "nome", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${witness}-rg`}>RG</Label>
                  <Input id={`${witness}-rg`} value={form[witness].rg} onChange={(e) => updateWitness(witness, "rg", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${witness}-cpf`}>CPF</Label>
                  <Input id={`${witness}-cpf`} value={form[witness].cpf} onChange={(e) => updateWitness(witness, "cpf", e.target.value)} />
                </div>
              </fieldset>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Gerar termo em PDF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
