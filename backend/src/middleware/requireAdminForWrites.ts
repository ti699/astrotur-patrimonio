import { getPatrimonioAccess } from '../utils/patrimonioAccess';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const access = await getPatrimonioAccess(req.auth);
    if (!access.isAdmin) {
      return res.status(403).json({ message: 'Acesso restrito a administradores' });
    }
    return next();
  } catch (error) {
    console.error('Erro ao validar permissão de administrador:', error);
    return res.status(500).json({ message: 'Erro ao validar permissão de administrador' });
  }
};

export const requireAdminForWrites = async (req: any, res: any, next: any) => {
  if (!WRITE_METHODS.has(req.method)) return next();
  return requireAdmin(req, res, next);
};
