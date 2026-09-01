/* =====================================================================
   ASTROTUR – CATEGORIAS, SUBCATEGORIAS E CAMPOS DINÂMICOS POR SUBCATEGORIA
   ===================================================================== */

export const CATEGORIAS = {
  "TI": [
    "Computadores", "Notebooks", "Monitores", "Impressoras", "Servidores",
    "Switches", "Roteadores", "Access Points", "Nobreaks", "Telefones IP",
    "Periféricos", "Tablets", "Outros de TI",
  ],
  "Equipamentos Eletrônicos": [
    "TVs", "Projetores", "Ar-condicionado", "Câmeras", "Telefones",
    "Micro-ondas", "Geladeiras", "Outros Eletrônicos",
  ],
  "Mobiliário": [
    "Mesas", "Cadeiras", "Armários", "Estantes", "Sofás", "Gaveteiros", "Outros Móveis",
  ],
} as const;

export type Categoria = keyof typeof CATEGORIAS;

/* ----------------------------- ESTADOS / STATUS ----------------------------- */
export const ESTADOS = ["Ótimo", "Bom", "Regular", "Ruim", "Sucateado"] as const;
export type Estado = (typeof ESTADOS)[number];

export const STATUS = ["Em uso", "Em manutenção", "Reserva", "Descartado"] as const;
export type Status = (typeof STATUS)[number];

export const estadoColor: Record<Estado, string> = {
  "Ótimo": "bg-green-600",
  "Bom": "bg-emerald-500",
  "Regular": "bg-yellow-500",
  "Ruim": "bg-orange-500",
  "Sucateado": "bg-red-700",
};

export const statusColor: Record<Status, string> = {
  "Em uso": "bg-emerald-600",
  "Em manutenção": "bg-yellow-600",
  "Reserva": "bg-blue-600",
  "Descartado": "bg-red-700",
};

/* --------------------------------- SETORES --------------------------------- */
export const SETORES_PADRAO = [
  "Tráfego", "RH", "DP", "Financeiro", "Jurídico", "Diretoria", "TI", "Operações",
  "Marketing", "Compras", "Almoxarifado", "CCO", "Manutenção", "Qualidade",
  "Portaria", "Obras", "Comercial", "Fretamento/Turismo",
];

/* --------------------------------- HELPERS --------------------------------- */
export const formatBRL = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const categoriaPrefixo = (c?: string | null) => {
  if (c === "TI") return "10xxx";
  if (c === "Mobiliário") return "20xxx";
  if (c === "Equipamentos Eletrônicos") return "30xxx";
  return "—";
};

/* =====================================================================
   CAMPOS DINÂMICOS POR SUBCATEGORIA
   ===================================================================== */

export type FieldType = "text" | "number" | "select" | "boolean" | "date";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
};

export type FieldGroup = { title: string; fields: FieldDef[] };

const COMPUTADOR_CORE: FieldGroup = {
  title: "Hardware",
  fields: [
    { key: "processador", label: "Processador", type: "text", placeholder: "Ex: Intel Core i7" },
    { key: "geracao_proc", label: "Geração do processador", type: "text", placeholder: "Ex: 13ª" },
    { key: "nucleos", label: "Núcleos", type: "number" },
    { key: "threads", label: "Threads", type: "number" },
    { key: "ram_gb", label: "Memória RAM (GB)", type: "number" },
    { key: "ram_tipo", label: "Tipo de RAM", type: "select", options: ["DDR3", "DDR4", "DDR5"] },
    { key: "ram_slots", label: "Slots de RAM", type: "number" },
    { key: "armaz_tipo", label: "Armazenamento principal", type: "select", options: ["HD", "SSD SATA", "SSD NVMe"] },
    { key: "armaz_gb", label: "Capacidade (GB)", type: "number" },
    { key: "armaz_sec", label: "Armazenamento secundário?", type: "boolean" },
    { key: "gpu", label: "Placa de vídeo", type: "text" },
    { key: "gpu_vram", label: "Memória de vídeo (GB)", type: "number" },
    { key: "tela", label: "Tamanho da tela", type: "text", placeholder: "15.6\"" },
    { key: "resolucao", label: "Resolução", type: "text", placeholder: "1920x1080" },
    { key: "so", label: "Sistema operacional", type: "text", placeholder: "Windows 11 Pro" },
  ],
};

const REDE_CORE: FieldGroup = {
  title: "Rede",
  fields: [
    { key: "hostname", label: "Nome na rede", type: "text" },
    { key: "ip", label: "Endereço IP", type: "text", placeholder: "192.168.0.10" },
    { key: "mac", label: "Endereço MAC", type: "text", placeholder: "AA:BB:CC:DD:EE:FF" },
  ],
};

const MONITOR: FieldGroup = {
  title: "Especificações do monitor",
  fields: [
    { key: "polegadas", label: "Polegadas", type: "number" },
    { key: "painel", label: "Tipo de painel", type: "select", options: ["IPS", "VA", "TN", "OLED"] },
    { key: "hz", label: "Taxa de atualização (Hz)", type: "number" },
    { key: "resolucao", label: "Resolução", type: "text" },
    { key: "hdmi", label: "HDMI?", type: "boolean" },
    { key: "displayport", label: "DisplayPort?", type: "boolean" },
    { key: "vga", label: "VGA?", type: "boolean" },
  ],
};

const IMPRESSORA: FieldGroup = {
  title: "Especificações da impressora",
  fields: [
    { key: "tipo", label: "Tipo", type: "select", options: ["Laser", "Jato de tinta", "Térmica"] },
    { key: "colorida", label: "Colorida?", type: "boolean" },
    { key: "wifi", label: "Wi-Fi?", type: "boolean" },
    { key: "rede", label: "Conexão de rede?", type: "boolean" },
    { key: "ip", label: "IP", type: "text" },
    { key: "consumivel", label: "Toner/cartucho", type: "text" },
  ],
};

const SWITCH_ROTEADOR: FieldGroup = {
  title: "Especificações de rede",
  fields: [
    { key: "portas", label: "Quantidade de portas", type: "number" },
    { key: "gerenciavel", label: "Gerenciável?", type: "boolean" },
    { key: "poe", label: "PoE?", type: "boolean" },
    { key: "ip", label: "IP", type: "text" },
    { key: "mac", label: "MAC", type: "text" },
    { key: "rack", label: "Rack / Posição", type: "text" },
    { key: "firmware", label: "Firmware", type: "text" },
  ],
};

const ACCESS_POINT: FieldGroup = {
  title: "Especificações do Access Point",
  fields: [
    { key: "padrao", label: "Padrão Wi-Fi", type: "select", options: ["Wi-Fi 4", "Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"] },
    { key: "bandas", label: "Bandas", type: "select", options: ["2.4GHz", "5GHz", "Dual-band", "Tri-band"] },
    { key: "poe", label: "PoE?", type: "boolean" },
    { key: "ip", label: "IP", type: "text" },
    { key: "mac", label: "MAC", type: "text" },
  ],
};

const NOBREAK: FieldGroup = {
  title: "Especificações do Nobreak",
  fields: [
    { key: "potencia_va", label: "Potência (VA)", type: "number" },
    { key: "tensao_entrada", label: "Tensão de entrada", type: "select", options: ["Bivolt", "110V", "220V"] },
    { key: "saidas", label: "Tomadas de saída", type: "number" },
    { key: "bateria_anos", label: "Idade da bateria (anos)", type: "number" },
  ],
};

const TELEFONE_IP: FieldGroup = {
  title: "Especificações do Telefone IP",
  fields: [
    { key: "ramal", label: "Ramal", type: "text" },
    { key: "ip", label: "IP", type: "text" },
    { key: "mac", label: "MAC", type: "text" },
    { key: "poe", label: "PoE?", type: "boolean" },
  ],
};

const TV: FieldGroup = {
  title: "Especificações da TV",
  fields: [
    { key: "polegadas", label: "Polegadas", type: "number" },
    { key: "smart", label: "Smart TV?", type: "boolean" },
    { key: "resolucao", label: "Resolução", type: "select", options: ["HD", "Full HD", "4K", "8K"] },
  ],
};

const PROJETOR: FieldGroup = {
  title: "Especificações do projetor",
  fields: [
    { key: "lumens", label: "Lumens", type: "number" },
    { key: "resolucao", label: "Resolução", type: "text" },
    { key: "lampada_horas", label: "Horas da lâmpada", type: "number" },
  ],
};

const AR_COND: FieldGroup = {
  title: "Especificações do ar-condicionado",
  fields: [
    { key: "btus", label: "BTUs", type: "number" },
    { key: "voltagem", label: "Voltagem", type: "select", options: ["110V", "220V", "Bivolt"] },
    { key: "tipo", label: "Tipo", type: "select", options: ["Split", "Janela", "Cassete", "Portátil"] },
    { key: "ultima_manut", label: "Última manutenção", type: "date" },
  ],
};

const CAMERA: FieldGroup = {
  title: "Especificações da câmera",
  fields: [
    { key: "resolucao", label: "Resolução", type: "text", placeholder: "1080p, 4MP, 4K..." },
    { key: "tipo", label: "Tipo", type: "select", options: ["IP", "Analógica", "Dome", "Bullet", "PTZ"] },
    { key: "ip", label: "IP", type: "text" },
    { key: "noturna", label: "Visão noturna?", type: "boolean" },
  ],
};

const MOBILIARIO: FieldGroup = {
  title: "Características do mobiliário",
  fields: [
    { key: "material", label: "Material", type: "text", placeholder: "MDF, Madeira, Aço..." },
    { key: "cor", label: "Cor", type: "text" },
    { key: "dimensoes", label: "Dimensões (L x A x P)", type: "text", placeholder: "120 x 75 x 60 cm" },
  ],
};

const GENERIC_ELET: FieldGroup = {
  title: "Especificações",
  fields: [
    { key: "voltagem", label: "Voltagem", type: "select", options: ["110V", "220V", "Bivolt"] },
    { key: "potencia", label: "Potência", type: "text" },
  ],
};

/** Mapa: subcategoria → grupos de campos específicos */
export const SUBCATEGORIA_FIELDS: Record<string, FieldGroup[]> = {
  // TI
  "Computadores": [COMPUTADOR_CORE, REDE_CORE],
  "Notebooks": [COMPUTADOR_CORE, REDE_CORE],
  "Servidores": [COMPUTADOR_CORE, REDE_CORE],
  "Monitores": [MONITOR],
  "Impressoras": [IMPRESSORA],
  "Switches": [SWITCH_ROTEADOR],
  "Roteadores": [SWITCH_ROTEADOR],
  "Access Points": [ACCESS_POINT],
  "Nobreaks": [NOBREAK],
  "Telefones IP": [TELEFONE_IP],
  "Tablets": [REDE_CORE],
  // Eletrônicos
  "TVs": [TV],
  "Projetores": [PROJETOR],
  "Ar-condicionado": [AR_COND],
  "Câmeras": [CAMERA],
  "Telefones": [GENERIC_ELET],
  "Micro-ondas": [GENERIC_ELET],
  "Geladeiras": [GENERIC_ELET],
  // Mobiliário
  "Mesas": [MOBILIARIO],
  "Cadeiras": [MOBILIARIO],
  "Armários": [MOBILIARIO],
  "Estantes": [MOBILIARIO],
  "Sofás": [MOBILIARIO],
  "Gaveteiros": [MOBILIARIO],
};
