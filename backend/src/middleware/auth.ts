import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET não definido');
}
export const JWT_SECRET: string = secret;

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
