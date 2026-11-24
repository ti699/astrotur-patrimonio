export type PatrimonioModelo = {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string;
  marca: string;
  modelo: string;
  specs: {
    processador?: string;
    ram_gb?: number | null;
    ram_tipo?: string;
    armaz_tipo?: string;
    armaz_gb?: number | null;
    so?: string;
  };
};

export const DEFAULT_PATRIMONIO_MODELOS: PatrimonioModelo[] = [
  {
    id: "notebook-padrao-1",
    nome: "Notebook Padrão 1",
    categoria: "TI",
    subcategoria: "Notebooks",
    marca: "",
    modelo: "",
    specs: {},
  },
  {
    id: "notebook-padrao-2",
    nome: "Notebook Padrão 2",
    categoria: "TI",
    subcategoria: "Notebooks",
    marca: "",
    modelo: "",
    specs: {},
  },
];
