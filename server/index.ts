import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { camelCaseResponseMiddleware } from './middlewares/camelCaseMiddleware';
import { WebSocketServer } from 'ws';
import 'dotenv/config';

declare global {
  var wss: WebSocketServer | undefined;
  var upgradeListenerAdded: boolean | undefined;
  var serverStarted: boolean | undefined;
}

const app = express();

app.use(express.json());

// ** Configuración CORS para aceptar solicitudes con cookies desde frontend **
app.use(cors({
  origin: "https://easytrackjsn.onrender.com",  // Cambia por la URL de tu frontend en producción
  credentials: true,
}));

// ** Configuración de sesión con cookies **
app.use(session({
  secret: process.env.SESSION_SECRET || "tu-secreto-por-defecto",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // true en producción (requiere HTTPS)
    sameSite: "none", // Necesario para cookies cross-site
    maxAge: 24 * 60 * 60 * 1000, // 1 día, ajusta según tus necesidades
  },
}));

app.use(camelCaseResponseMiddleware);
app.use(express.urlencoded({ extended: false }));

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

if (!global.serverStarted) {
  global.serverStarted = true;

  (async () => {
    const server = await registerRoutes(app);

    // Configuración WebSocket
    if (!global.wss) {
      global.wss = new WebSocketServer({ noServer: true });

      global.wss.on('connection', (ws) => {
        console.log('Nueva conexión WebSocket establecida');

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            console.log('Mensaje WebSocket recibido:', data);
          } catch (error) {
            console.error('Error al procesar mensaje WebSocket:', error);
          }
        });

        ws.on('close', () => {
          console.log('Conexión WebSocket cerrada');
        });

        ws.on('error', (error) => {
          console.error('Error en WebSocket:', error);
        });
      });
    }

    // Manejador de upgrade (WebSocket)
    if (!global.upgradeListenerAdded) {
      server.removeAllListeners('upgrade');

      server.on('upgrade', (req, socket, head) => {
        if (req.url === '/ws') {
          if (!socket.destroyed) {
            global.wss!.handleUpgrade(req, socket, head, (ws) => {
              global.wss!.emit('connection', ws, req);
            });
          }
        } else {
          socket.destroy();
        }
      });
      global.upgradeListenerAdded = true;
    }

    // Configuración Vite para desarrollo o archivos estáticos para producción
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Iniciar servidor
    const port = parseInt(process.env.PORT || "5000");
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`Servidor activo en http://localhost:${port}`);
    });
  })();
} else {
  console.log('Servidor ya está iniciado — No se inicia otra vez');
}
