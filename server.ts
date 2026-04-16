import express from 'express';
import { createServer as createViteServer } from 'vite';
import session from 'express-session';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'starparks-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      httpOnly: true,
    }
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
