import express, { type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, 'dist');
const indexHtmlPath = path.join(distPath, 'index.html');

const CAPABILITY_SEED = '202730';
const OPERATOR_UID = 'operator-pin-bpbpk-ntb';

function deriveFirestoreGrantKey(): string {
  return crypto
    .createHash('sha256')
    .update(`simpra-bpbpk-ntb-capability-v1::${CAPABILITY_SEED}`, 'utf8')
    .digest('hex');
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  const isDevContainer = Boolean(process.env.CONTROL_PLANE_PORT || process.env.NGINX_PORT);
  const isProduction =
    !isDevContainer &&
    (process.env.NODE_ENV === 'production' ||
      (fs.existsSync(indexHtmlPath) && process.env.NODE_ENV !== 'development'));

  const port = isDevContainer
    ? Number(process.env.DEFAULT_APP_PORT) || 3000
    : Number(process.env.PORT) || 3000;

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  const handleEditorSession = (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      grantKey: deriveFirestoreGrantKey(),
      operatorUid: OPERATOR_UID,
      displayName: 'Pengelola SIMPRA BPBPK NTB',
      unitKerja: 'Tim Sinkronisasi Program BPBPK Nusa Tenggara Barat',
    });
  };

  app.post('/api/auth/verify-pin', handleEditorSession);
  app.get('/api/auth/verify-pin', handleEditorSession);
  app.post('/api/auth/editor-session', handleEditorSession);
  app.get('/api/auth/editor-session', handleEditorSession);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '1h',
      })
    );

    app.use((_req: Request, res: Response) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(503).send('Application build artifacts not found.');
      }
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(
      `Server listening on http://0.0.0.0:${port} (${isProduction ? 'production' : 'development'})`
    );
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
