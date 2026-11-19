import { pool } from '../db';

type AuthClaims = {
  id?: string;
  role?: string;
};

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
};

export type PatrimonioAccess = {
  id: string | null;
  email: string | null;
  role: string;
  isAdmin: boolean;
  restrictToOwnAssets: boolean;
};

export async function getPatrimonioAccess(auth: AuthClaims | undefined): Promise<PatrimonioAccess> {
  const result = auth?.id
    ? await pool.query('SELECT id, email, role FROM users WHERE id = $1', [auth.id])
    : { rows: [] };
  const user = result.rows[0];
  const role = typeof user?.role === 'string' ? user.role.trim().toLowerCase() : 'usuario';

  return {
    id: user?.id ?? null,
    email: user?.email ?? null,
    role,
    isAdmin: role === 'admin',
    restrictToOwnAssets: role !== 'admin',
  };
}

export function patrimonioScope(
  access: PatrimonioAccess,
  alias = 'p',
  firstParameter = 1,
) {
  if (!access.restrictToOwnAssets) return { clause: 'TRUE', values: [] as unknown[] };

  return {
    clause: `(
      EXISTS (
        SELECT 1 FROM responsaveis r
        WHERE r.id = ${alias}.responsavel_id
          AND LOWER(BTRIM(COALESCE(NULLIF(BTRIM(r.contato_email), ''), r.email))) =
            LOWER(BTRIM($${firstParameter}))
      )
    )`,
    values: [access.email],
  };
}

export async function patrimonioIsAccessible(
  db: Queryable,
  patrimonioId: string,
  access: PatrimonioAccess,
) {
  if (!access.restrictToOwnAssets) return true;
  const scope = patrimonioScope(access, 'p', 2);
  const result = await db.query(
    `SELECT 1 FROM patrimonios p WHERE p.id = $1 AND ${scope.clause}`,
    [patrimonioId, ...scope.values],
  );
  return result.rows.length > 0;
}

const isFinancialField = (key: string) =>
  /^(valor(?:_|$)|preco(?:_|$)|custo(?:_|$)|price(?:_|$)|cost(?:_|$))/i.test(key);
const isGuaranteeField = (key: string) =>
  /^(garantia(?:_|$)|data_(?:inicio|fim)_garantia$|numero_garantia$)/i.test(key);

export function hasFinancialFields(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value).some(isFinancialField);
}

export function redactFinancialFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactFinancialFields(item)) as T;
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isFinancialField(key) ? null : redactFinancialFields(item),
    ]),
  ) as T;
}

export function redactRestrictedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactRestrictedFields(item)) as T;
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isFinancialField(key) || isGuaranteeField(key)
        ? null
        : redactRestrictedFields(item),
    ]),
  ) as T;
}

export function protectFinancialResponse<T>(value: T, access: PatrimonioAccess): T {
  return access.isAdmin ? value : redactRestrictedFields(value);
}
