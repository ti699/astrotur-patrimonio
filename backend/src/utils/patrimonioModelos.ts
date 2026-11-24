import { pool } from '../db';

const DEFAULT_PATRIMONIO_MODELOS = JSON.stringify([
  {
    id: 'notebook-padrao-1',
    nome: 'Notebook Padrão 1',
    categoria: 'TI',
    subcategoria: 'Notebooks',
    marca: '',
    modelo: '',
    specs: {},
  },
  {
    id: 'notebook-padrao-2',
    nome: 'Notebook Padrão 2',
    categoria: 'TI',
    subcategoria: 'Notebooks',
    marca: '',
    modelo: '',
    specs: {},
  },
]);

let patrimonioModelosColumnReady: Promise<void> | null = null;

export function ensurePatrimonioModelosColumn() {
  if (!patrimonioModelosColumnReady) {
    patrimonioModelosColumnReady = pool.query(
      `ALTER TABLE app_settings
       ADD COLUMN IF NOT EXISTS patrimonio_modelos JSONB NOT NULL DEFAULT '${DEFAULT_PATRIMONIO_MODELOS}'::jsonb`
    ).then(() => undefined).catch((error) => {
      patrimonioModelosColumnReady = null;
      throw error;
    });
  }
  return patrimonioModelosColumnReady;
}
