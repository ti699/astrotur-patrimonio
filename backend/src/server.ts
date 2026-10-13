import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path'; // <--- Importado para manipular os caminhos de arquivos
import authRoutes from './routes/auth';
import patrimoniosRoutes from './routes/patrimonios';
import setoresRoutes from './routes/setores';
import responsaveisRoutes from './routes/responsaveis';
import movimentacoesRoutes from './routes/movimentacoes';
import historicoRoutes from './routes/historico';
import manutencoesRoutes from './routes/manutencoes';
import inventariosRoutes from './routes/inventarios';
import adminRoutes from './routes/admin';
import documentosRoutes from './routes/documentos';
import uploadRoutes from './routes/upload'; // <--- Rota de upload criada com Multer
import { authenticate, authenticateCookie } from './middleware/auth';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definido');
}

const app = express();

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:80,http://localhost')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Servir os arquivos de imagem estaticamente para o navegador conseguir carregar
// Acesso às fotos exige o cookie de sessão definido no login
app.use('/uploads', authenticateCookie, express.static(path.join(__dirname, '../uploads'), { index: false, dotfiles: 'deny' }));

// Registar Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/patrimonios', authenticate, patrimoniosRoutes);
app.use('/api/setores', authenticate, setoresRoutes);
app.use('/api/responsaveis', authenticate, responsaveisRoutes);
app.use('/api/movimentacoes', authenticate, movimentacoesRoutes);
app.use('/api/historico', authenticate, historicoRoutes);
app.use('/api/manutencoes', authenticate, manutencoesRoutes);
app.use('/api/inventarios', authenticate, inventariosRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/documentos', authenticate, documentosRoutes);
app.use('/api/upload', authenticate, uploadRoutes); // <--- Endpoint para upload de arquivos/imagens

// Rota de teste para ver se a API está online
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Node.js a rodar perfeitamente!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend a rodar na porta ${PORT}`);
});