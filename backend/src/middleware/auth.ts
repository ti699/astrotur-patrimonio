import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET não definido');
}
export const JWT_SECRET: string = secret;

export const COOKIE_NAME = 'astrotur_session';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const secureCookie = process.env.COOKIE_SECURE === 'true';

export const readCookie = (req: any, name: string): string | undefined => {
  const header: string | undefined = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
};

export const setSessionCookie = (res: any, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
};

export const clearSessionCookie = (res: any) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: secureCookie, path: '/' });
};

// Usado em /uploads: o <img> só envia o cookie, não o header Authorization
export const authenticateCookie = (req: any, res: any, next: any) => {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return res.status(401).end();
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).end();
  }
};

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Não autenticado' });

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Não autenticado' });
  }
};
