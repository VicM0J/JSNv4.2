import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertOrderSchema, insertTransferSchema, insertRepositionSchema, insertRepositionPieceSchema, insertRepositionTransferSchema, insertAdminPasswordSchema, type Area, type RepositionType } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { eq, desc, and, or, ne, isNotNull, isNull, count } from 'drizzle-orm';
import { authenticateToken } from './auth';
import { upload, handleMulterError } from './upload';
import path from 'path';
import fs from 'fs';


export function registerRoutes(app: Express): Server {
  setupAuth(app);

  registerOrderRoutes(app);
  registerTransferRoutes(app);
  registerNotificationRoutes(app);
  registerRepositionRoutes(app);
  registerAdminRoutes(app);
  registerDashboardRoutes(app);
  registerReportsRoutes(app);
  registerHistoryRoutes(app);
  registerAgendaRoutes(app);
  registerAlmacenRoutes(app);

  const httpServer = configureWebSocket(app);
  return httpServer;
}

function registerOrderRoutes(app: Express) {
  const router = Router();

  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'corte' && user.area !== 'admin' && user.area !== 'envios') {
        return res.status(403).json({ message: "Área restringida" });
      }

      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData, user.id);
      res.status(201).json(order);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(400).json({ message: "Datos de orden incorrectos" });
    }
  });

  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const area = req.query.area as Area;
      const orders = await storage.getOrders(area);
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: "Error al cargar órdenes" });
    }
  });

  router.get("/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const order = await storage.getOrderById(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "Orden no encontrada" });
      res.json(order);
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ message: "Error al cargar orden" });
    }
  });

  router.get("/:id/pieces", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const orderId = parseInt(req.params.id);
      const pieces = await storage.getOrderPieces(orderId);
      res.json(pieces);
    } catch (error) {
      console.error('Get order pieces error:', error);
      res.status(500).json({ message: "Error al cargar piezas" });
    }
  });

  router.get("/:id/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const history = await storage.getOrderHistory(parseInt(req.params.id));
      res.json(history);
    } catch (error) {
      console.error('Get order history error:', error);
      res.status(500).json({ message: "Error al cargar historial" });
    }
  });

  router.post("/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'envios') {
        return res.status(403).json({ message: "Solo el área de envíos puede completar la orden" });
      }

      const orderId = parseInt(req.params.id);
      await storage.completeOrder(orderId);
      await storage.addOrderHistory(orderId, 'completed', 'Pedido finalizado', user.id);
      res.json({ message: "Orden completada" });
    } catch (error) {
      console.error('Complete order error:', error);
      res.status(500).json({ message: "Error al completar orden" });
    }
  });

  app.use("/api/orders", router);
}

function registerTransferRoutes(app: Express) {
  const router = Router();

  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const { orderId, toArea, pieces, notes } = req.body;

      const orderPieces = await storage.getOrderPieces(orderId);
      const userAreaPieces = orderPieces.find((p: any) => p.area === user.area);

      if (!userAreaPieces || userAreaPieces.pieces < pieces) {
        return res.status(400).json({ 
          message: `No hay suficientes piezas disponibles en ${user.area}. Disponibles: ${userAreaPieces?.pieces || 0}` 
        });
      }

      const validatedData = insertTransferSchema.parse({
        orderId,
        fromArea: user.area,
        toArea,
        pieces: parseInt(pieces),
        notes
      });

      const transfer = await storage.createTransfer(validatedData, user.id);
      res.status(201).json(transfer);
    } catch (error) {
      console.error('Create transfer error:', error);
      res.status(400).json({ message: "Error al crear transferencia" });
    }
  });

  router.get("/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const transfers = await storage.getPendingTransfersForUser(user.id);
      res.json(transfers);
    } catch (error) {
      console.error('Get pending transfers error:', error);
      res.status(500).json({ message: "Error al obtener transferencias pendientes" });
    }
  });

  router.post("/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      await storage.acceptTransfer(parseInt(req.params.id), user.id);
      res.json({ message: "Transferencia aceptada correctamente" });
    } catch (error) {
      console.error('Accept transfer error:', error);
      res.status(500).json({ message: "Error al aceptar la transferencia" });
    }
  });

  router.post("/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      await storage.rejectTransfer(parseInt(req.params.id), user.id);
      res.json({ message: "Transferencia rechazada correctamente" });
    } catch (error) {
      console.error('Reject transfer error:', error);
      res.status(500).json({ message: "Error al rechazar la transferencia" });
    }
  });

  app.use("/api/transfers", router);
}

function registerNotificationRoutes(app: Express) {
  const router = Router();

  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const notifications = await storage.getUserNotifications(user.id);
      console.log(`Fetched ${notifications.length} notifications for user ${user.id} (${user.area})`);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: "Error al obtener notificaciones" });
    }
  });

  router.post("/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ message: "Notificación marcada como leída" });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: "Error al marcar la notificación" });
    }
  });

  app.use("/api/notifications", router);
}

function registerAdminRoutes(app: Express) {
  const router = Router();

  router.use((req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    const user = req.user!;
    if (user.area !== 'admin') return res.status(403).json({ message: "Se requiere acceso de administrador" });

    next();
  });

  router.get("/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });

  router.delete("/users/:id", async (req, res) => {
    try {
      const result = await storage.deleteUserById(req.params.id);
      if (result) {
        return res.status(200).json({ message: "Usuario eliminado correctamente" });
      } else {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error al eliminar el usuario" });
    }
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) return res.status(400).json({ message: "Faltan campos requeridos" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.resetUserPassword(userId, hashedPassword);
      res.json({ message: "Contraseña restablecida correctamente" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Error al restablecer la contraseña" });
    }
  });

  app.use("/api/admin", router);
}


function registerDashboardRoutes(app: Express) {
  app.get("/api/dashboard/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const allOrders = await storage.getOrders();
      const userAreaOrders = await storage.getOrders(user.area);
      const pendingTransfers = await storage.getPendingTransfersForUser(user.id);
      const repositions = await storage.getRepositions(user.area, user.area);

      const stats = {
        activeOrders: allOrders.filter(o => o.status === 'active').length,
        myAreaOrders: userAreaOrders.length,
        pendingTransfers: pendingTransfers.length,
        activeRepositions: repositions.filter(r => r.status !== 'completado' && r.status !== 'eliminado').length,
        completedToday: allOrders.filter(o =>
          o.status === 'completed' &&
          o.completedAt &&
          new Date(o.completedAt).toDateString() === new Date().toDateString()
        ).length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: "Error al obtener estadísticas del tablero" });
    }
  });

  app.get("/api/dashboard/recent-activity", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const recentOrders = await storage.getRecentOrders(user.area, 5);
      const recentRepositions = await storage.getRecentRepositions(user.area, 5);

      res.json({
        orders: recentOrders,
        repositions: recentRepositions
      });
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({ message: "Error al obtener actividad reciente" });
    }
  });
}


function configureWebSocket(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Función para enviar notificaciones a todos los clientes conectados
  const broadcastToAll = (notification: any) => {
    console.log('Enviando notificación a todos los usuarios conectados:', notification);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({
            type: 'notification',
            data: notification
          }));
        } catch (error) {
          console.error('Error al enviar notificación WebSocket:', error);
        }
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('Nueva conexión WebSocket establecida');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensaje WebSocket recibido:', data);

        // Retransmitir mensaje a todos los clientes conectados
        broadcastToAll(data);
      } catch (error) {
        console.error('Error al procesar mensaje WebSocket:', error);
      }
    });

    ws.on('close', () => {
      console.log('Conexión WebSocket cerrada');
    });

    ws.on('error', (error) => {
      console.error('Error en conexión WebSocket:', error);
    });

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
      type: 'connection',
      data: { message: 'Conectado exitosamente al sistema de notificaciones' }
    }));
  });

  // Exponer función de broadcast
  (httpServer as any).wss = wss;
  (httpServer as any).broadcast = broadcastToAll;
  return httpServer;
}


function registerRepositionRoutes(app: Express) {
  const router = Router();

  router.post("/", authenticateToken, upload.array('documents', 5), handleMulterError, async (req, res) => {
    try {
      const user = (req as any).user;
      let repositionData;

      // Parse repositionData from form
      if (req.body.repositionData) {
        repositionData = JSON.parse(req.body.repositionData);
      } else {
        repositionData = req.body;
      }

      const { pieces, productos, telaContraste, ...mainData } = repositionData;
      
      // Validar datos según el tipo
      if (mainData.type === 'reproceso') {
        if (!mainData.volverHacer || !mainData.materialesImplicados) {
          return res.status(400).json({ message: "Los campos 'volverHacer' y 'materialesImplicados' son requeridos para reprocesos" });
        }
      }
      const files = req.files as Express.Multer.File[];

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const counter = await storage.getNextRepositionCounter();
      const folio = `JN-REQ-${month}-${year}-${String(counter).padStart(3, '0')}`;

      // Create reposition with documents
      const reposition = await storage.createReposition({
        ...mainData,
        folio,
        currentArea: user.area,
        solicitanteArea: user.area,
        productos,
        telaContraste
      }, pieces || [], user.id);

      // Save documents if any
      if (files && files.length > 0) {
        for (const file of files) {
          await storage.saveRepositionDocument({
            repositionId: reposition.id,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            path: file.path,
            uploadedBy: user.id
          });
        }
      }

      res.status(201).json(reposition);
    } catch (error) {
      console.error('Create reposition error:', error);
      res.status(400).json({ message: "Error al crear la solicitud de reposición" });
    }
  });

  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const area = req.query.area as string;

      let repositions;


      if ((user.area === 'admin' || user.area === 'envios') && (!area || area === 'all')) {
        repositions = await storage.getAllRepositions(false);
      } 

      else if (user.area === 'diseño') {
        // Diseño puede ver todas las reposiciones aprobadas
        repositions = await storage.getRepositions(undefined, 'diseño');
      }

      else if (area && area !== 'all') {
        repositions = await storage.getRepositionsByArea(area, user.id);
      } 

      else {
        repositions = await storage.getRepositionsByArea(user.area, user.id);
      }

      res.json(repositions);
    } catch (error) {
      console.error('Get repositions error:', error);
      res.status(500).json({ message: "Error al cargar las reposiciones" });
    }
  });

  router.get("/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }
      const reposition = await storage.getRepositionById(id);
      if (!reposition) {
        return res.status(404).json({ message: "Reposición no encontrada" });
      }

      res.json(reposition);
    } catch (error) {
      console.error('Get reposition error:', error);
      res.status(500).json({ message: "Error al obtener la reposición" });
    }
  });

  router.post("/:id/transfer", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }
      const { toArea, notes, consumoTela } = req.body;

      // Verificar que la reposición existe y está en estado válido
      const reposition = await storage.getRepositionById(repositionId);
      if (!reposition) {
        return res.status(404).json({ message: "Reposición no encontrada" });
      }

      if (reposition.status !== 'aprobado') {
        return res.status(400).json({ message: "Solo se pueden transferir reposiciones aprobadas" });
      }

      if (reposition.status === 'eliminado') {
        return res.status(400).json({ message: "No se puede transferir una reposición eliminada" });
      }

      // Si viene desde Corte y hay consumo de tela, actualizar la reposición
      if (user.area === 'corte' && consumoTela !== undefined) {
        await storage.updateRepositionConsumo(repositionId, consumoTela);
      }

      const transfer = await storage.createRepositionTransfer({
        repositionId,
        fromArea: user.area,
        toArea,
        notes
      }, user.id);

      res.status(201).json(transfer);
    } catch (error) {
      console.error('Transfer reposition error:', error);
      res.status(400).json({ message: "Error al crear transferencia de reposición" });
    }
  });

  router.post("/:id/approval", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'operaciones' && user.area !== 'admin' && user.area !== 'envios') {
        return res.status(403).json({ message: "Solo Operaciones, Administración o Envíos pueden aprobar o rechazar" });
      }

      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }
      const { action, notes } = req.body;

      const result = await storage.approveReposition(repositionId, action, user.id, notes);
      res.json(result);
    } catch (error) {
      console.error('Approve reposition error:', error);
      res.status(400).json({ message: "Error al procesar la aprobación" });
    }
  });

  router.post("/transfers/:id/process", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const transferId = parseInt(req.params.id);
      if (isNaN(transferId)) {
        return res.status(400).json({ message: "ID de transferencia inválido" });
      }
      const { action } = req.body;

      const result = await storage.processRepositionTransfer(transferId, action, user.id);
      res.json(result);
    } catch (error) {
      console.error('Process transfer error:', error);
      res.status(400).json({ message: "Error al procesar la transferencia" });
    }
  });

  router.get("/:id/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }
      const history = await storage.getRepositionHistory(repositionId);
      res.json(history);
    } catch (error) {
      console.error('Get reposition history error:', error);
      res.status(500).json({ message: "Error al obtener historial de la reposición" });
    }
  });

  router.get("/:id/tracking", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const repositionId = parseInt(req.params.id);
      console.log('Tracking request for reposition ID:', repositionId);
      
      if (isNaN(repositionId)) {
        console.log('Invalid reposition ID:', req.params.id);
        return res.status(400).json({ message: "ID de reposición inválido" });
      }
      
      console.log('Getting tracking data for reposition:', repositionId);
      const tracking = await storage.getRepositionTracking(repositionId);
      console.log('Tracking data retrieved:', tracking);
      
      res.json(tracking);
    } catch (error) {
      console.error('Get reposition tracking error:', error);
      res.status(500).json({ message: "Error al obtener seguimiento de la reposición", error: error.message });
    }
  });

  router.delete("/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      console.log('Delete request from user:', user.area, 'for reposition:', req.params.id);

      if (user.area !== 'admin' && user.area !== 'envios') {
        return res.status(403).json({ message: "Solo Admin o Envíos pueden eliminar reposiciones" });
      }

      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }
      const { reason } = req.body;

      console.log('Delete request data:', { repositionId, reason });

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "El motivo de eliminación es obligatorio" });
      }

      if (reason.trim().length < 10) {
        return res.status(400).json({ message: "El motivo debe tener al menos 10 caracteres" });
      }

      await storage.deleteReposition(repositionId, user.id, reason.trim());
      console.log('Reposition deleted successfully:', repositionId);
      res.json({ message: "Reposición eliminada correctamente" });
    } catch (error) {
      console.error('Delete reposition error:', error);
      res.status(500).json({ message: "Error al eliminar reposición" });
    }
  });

  router.post("/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }
      const { notes } = req.body;

      if (user.area === 'admin' || user.area === 'envios') {
        // Admin y Envíos pueden finalizar directamente
        await storage.completeReposition(repositionId, user.id, notes);
        res.json({ message: "Reposición finalizada correctamente" });
      } else {
        // Otras áreas necesitan solicitar aprobación para finalizar
        await storage.requestCompletionApproval(repositionId, user.id, notes);
        res.json({ message: "Solicitud de finalización enviada a administración" });
      }
    } catch (error) {
      console.error('Complete reposition error:', error);
      res.status(500).json({ message: "Error al procesar solicitud de finalización" });
    }
  });

  router.get("/all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'admin' && user.area !== 'envios') {
        return res.status(403).json({ message: "Solo administradores o envíos pueden ver el historial completo" });
      }

      const { includeDeleted } = req.query;
      const repositions = await storage.getAllRepositions(includeDeleted === 'true');
      res.json(repositions);
    } catch (error) {
      console.error('Get all repositions error:', error);
      res.status(500).json({ message: "Error al obtener historial de reposiciones" });
    }
  });

  router.get("/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const notifications = await storage.getUserNotifications(user.id);

      // Filtrar solo notificaciones de reposiciones no leídas
      const repositionNotifications = notifications.filter(n => 
        !n.read && (
          n.type?.includes('reposition') || 
          n.type?.includes('completion') ||
          n.type === 'new_reposition' ||
          n.type === 'reposition_transfer' ||
          n.type === 'reposition_approved' ||
          n.type === 'reposition_rejected' ||
          n.type === 'reposition_completed' ||
          n.type === 'reposition_deleted' ||
          n.type === 'completion_approval_needed'
        )
      );

      res.json(repositionNotifications);
    } catch (error) {
      console.error('Get reposition notifications error:', error);
      res.status(500).json({ message: "Error al obtener notificaciones de reposición" });
    }
  });

  router.get("/pending-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      
      // Solo admin, envíos y operaciones pueden ver reposiciones pendientes
      if (user.area !== 'admin' && user.area !== 'envios' && user.area !== 'operaciones') {
        return res.json({ count: 0, repositions: [] });
      }

      const repositions = await storage.getAllRepositions(false);
      const pendingRepositions = repositions.filter(r => r.status === 'pendiente');
      
      console.log('Pending repositions found:', pendingRepositions.length);
      
      res.json({ 
        count: pendingRepositions.length,
        repositions: pendingRepositions 
      });
    } catch (error) {
      console.error('Get pending repositions count error:', error);
      res.status(500).json({ message: "Error al obtener conteo de reposiciones pendientes" });
    }
  });

  router.post("/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const notificationId = parseInt(req.params.id);
      if (!notificationId) {
        return res.status(400).json({ message: "ID de notificación inválido" });
      }

      await storage.markNotificationRead(notificationId);
      res.json({ message: "Notificación marcada como leída" });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: "Error al marcar notificación como leída" });
    }
  });

  router.get("/transfers/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const transfers = await storage.getPendingRepositionTransfers(user.area);
      res.json(transfers);
    } catch (error) {
      console.error('Get pending reposition transfers error:', error);
      res.status(500).json({ message: "Error al obtener transferencias pendientes" });
    }
  });

  router.post("/:id/timer/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      const { area } = req.body;

      console.log('Timer start request:', { repositionId, userId: user.id, area, userArea: user.area });

      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      if (!area) {
        return res.status(400).json({ message: "Área requerida" });
      }

      await storage.startRepositionTimer(repositionId, user.id, area);
      res.json({ 
        message: "Cronómetro iniciado correctamente", 
        repositionId,
        area 
      });
    } catch (error) {
      console.error('Start timer error:', error);
      const errorMessage = error instanceof Error ? error.message : "Error al iniciar cronómetro";
      res.status(500).json({ message: errorMessage });
    }
  });

  router.post("/:id/timer/stop", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      const timer = await storage.stopRepositionTimer(repositionId, user.area, user.id);
      res.json(timer);
    } catch (error) {
      console.error('Stop timer error:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  router.post("/:id/timer/manual", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      const { startTime, endTime, date } = req.body;
      if (!startTime || !endTime || !date) {
        return res.status(400).json({ message: "Hora de inicio, fin y fecha son requeridas" });
      }

      const timer = await storage.setManualRepositionTime(repositionId, user.area, user.id, startTime, endTime, date);
      res.json(timer);
    } catch (error) {
      console.error('Set manual time error:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  router.get("/:id/timer", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      const timer = await storage.getRepositionTimer(repositionId, user.area);
      res.json(timer);
    } catch (error) {
      console.error('Get timer error:', error);
      res.status(500).json({ message: "Error al obtener el timer" });
    }
  });

  // Upload documents to existing reposition
  router.post("/:id/documents", authenticateToken, upload.array('documents', 5), handleMulterError, async (req, res) => {
    try {
      const user = (req as any).user;
      const repositionId = parseInt(req.params.id);
      const files = req.files as Express.Multer.File[];

      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No se han seleccionado archivos" });
      }

      // Verify reposition exists
      const reposition = await storage.getRepositionById(repositionId);
      if (!reposition) {
        return res.status(404).json({ message: "Reposición no encontrada" });
      }

      // Save documents
      const savedDocuments = [];
      for (const file of files) {
        const document = await storage.saveRepositionDocument({
          repositionId: repositionId,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          path: file.path,
          uploadedBy: user.id
        });
        savedDocuments.push(document);
      }

      res.json({ 
        message: `${savedDocuments.length} documento(s) añadido(s) correctamente`,
        documents: savedDocuments 
      });
    } catch (error) {
      console.error('Upload documents error:', error);
      res.status(500).json({ message: "Error al subir documentos" });
    }
  });

  // Get documents for a reposition
  router.get("/:id/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });
    try {
      const repositionId = parseInt(req.params.id);

      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      const documents = await storage.getRepositionDocuments(repositionId);
      res.json(documents);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ message: "Error al obtener documentos" });
    }
  });

  app.use("/api/repositions", router);
}

function registerHistoryRoutes(app: Express) {
  const router = Router();

  router.post("/export", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const { orders } = req.body;
      const buffer = await storage.exportHistoryToExcel(orders);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="historial-pedidos-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error('Export history error:', error);
      res.status(500).json({ message: "Error al exportar historial" });
    }
  });

  app.use("/api/history", router);
}

function registerReportsRoutes(app: Express) {
  const router = Router();

  router.get("/data", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const { type, startDate, endDate, area, status, urgency } = req.query;
      const data = await storage.getReportData(
        type as string,
        startDate as string,
        endDate as string,
        { area: area as string, status: status as string, urgency: urgency as string }
      );
      res.json(data);
    } catch (error) {
      console.error('Get report data error:', error);
      res.status(500).json({ message: "Error al obtener datos del reporte" });
    }
  });

  router.get("/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const { type, format, startDate, endDate, area, status, urgency } = req.query;
      const buffer = await storage.generateReport(
        type as string,
        format as string,
        startDate as string,
        endDate as string,
        { area: area as string, status: status as string, urgency: urgency as string }
      );

      const contentType = format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
      const filename = `reporte-${type}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ message: "Error al generar reporte" });
    }
  });

  router.post("/onedrive", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const { type, startDate, endDate, area, status, urgency } = req.query;
      const result = await storage.saveReportToOneDrive(
        type as string,
        startDate as string,
        endDate as string,
        { area: area as string, status: status as string, urgency: urgency as string }
      );
      res.json(result);
    } catch (error) {
      console.error('Save to OneDrive error:', error);
      res.status(500).json({ message: "Error al guardar en OneDrive" });
    }
  });

  app.use("/api/reports", router);
}

function registerAgendaRoutes(app: Express) {
  const router = Router();

  // Obtener tareas - usuarios ven las de su área, Admin/Envíos ven todas
  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const events = await storage.getAgendaEvents(user);
      res.json(events);
    } catch (error) {
      console.error('Get agenda events error:', error);
      res.status(500).json({ message: "Error al obtener tareas de la agenda" });
    }
  });

  // Crear tarea - solo Admin/Envíos
  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'admin' && user.area !== 'envios') {
        return res.status(403).json({ message: "Solo Admin y Envíos pueden crear tareas" });
      }

      const { assignedToArea, title, description, date, time, priority, status } = req.body;
      const event = await storage.createAgendaEvent({
        createdBy: user.id,
        assignedToArea,
        title,
        description,
        date,
        time,
        priority,
        status
      });
      res.status(201).json(event);
    } catch (error) {
      console.error('Create agenda event error:', error);
      res.status(400).json({ message: "Error al crear tarea de la agenda" });
    }
  });

  // Actualizar tarea - solo Admin/Envíos pueden editar, otras áreas solo pueden cambiar status
  router.put("/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID de tarea inválido" });
      }

      const { assignedToArea, title, description, date, time, priority, status } = req.body;

      if (user.area !== 'admin' && user.area !== 'envios') {
        // Otras áreas solo pueden cambiar el status de sus tareas asignadas
        const event = await storage.updateTaskStatus(eventId, user.area, status);
        res.json(event);
      } else {
        // Admin/Envíos pueden editar completamente
        const event = await storage.updateAgendaEvent(eventId, {
          assignedToArea,
          title,
          description,
          date,
          time,
          priority,
          status
        });
        res.json(event);
      }
    } catch (error) {
      console.error('Update agenda event error:', error);
      res.status(500).json({ message: "Error al actualizar tarea de la agenda" });
    }
  });

  // Eliminar tarea - solo Admin/Envíos
  router.delete("/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'admin' && user.area !== 'envios') {
        return res.status(403).json({ message: "Solo Admin y Envíos pueden eliminar tareas" });
      }

      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID de tarea inválido" });
      }
      await storage.deleteAgendaEvent(eventId);
      res.json({ message: "Tarea eliminada correctamente" });
    } catch (error) {
      console.error('Delete agenda event error:', error);
      res.status(500).json({ message: "Error al eliminar tarea" });
    }
  });

  app.use("/api/agenda", router);
}

function registerAlmacenRoutes(app: Express) {
  const router = Router();

  // Middleware para verificar que el usuario sea de almacén
  router.use((req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    const user = req.user!;
    if (user.area !== 'almacen') return res.status(403).json({ message: "Acceso restringido al área de almacén" });

    next();
  });

  // Obtener todas las reposiciones para almacén
  router.get("/repositions", async (req, res) => {
    try {
      const repositions = await storage.getAllRepositionsForAlmacen();
      res.json(repositions);
    } catch (error) {
      console.error('Get repositions for almacen error:', error);
      res.status(500).json({ message: "Error al obtener reposiciones" });
    }
  });



  // Pausar reposición
  router.post("/repositions/:id/pause", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "El motivo de pausa es obligatorio" });
      }

      await storage.pauseReposition(repositionId, reason.trim(), user.id);

      // Send WebSocket notification
      if ((app as any).wss) {
        const notification = {
          type: 'notification',
          data: {
            type: 'reposition_paused',
            message: `Reposición pausada por almacén`,
            repositionId: repositionId
          }
        };

        (app as any).wss.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify(notification));
          }
        });
      }

      res.json({ message: "Reposición pausada correctamente" });
    } catch (error) {
      console.error('Pause reposition error:', error);
      res.status(500).json({ message: "Error al pausar reposición" });
    }
  });

  // Reanudar reposición
  router.post("/repositions/:id/resume", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);

      if (isNaN(repositionId)) {
        return res.status(400).json({ message: "ID de reposición inválido" });
      }

      await storage.resumeReposition(repositionId, user.id);

      // Send WebSocket notification
      if ((app as any).wss) {
        const notification = {
          type: 'notification',
          data: {
            type: 'reposition_resumed',
            message: `Reposición reanudada por almacén`,
            repositionId: repositionId
          }
        };

        (app as any).wss.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify(notification));
          }
        });
      }

      res.json({ message: "Reposición reanudada correctamente" });
    } catch (error) {
      console.error('Resume reposition error:', error);
      res.status(500).json({ message: "Error al reanudar reposición" });
    }
  });

  app.use("/api/almacen", router);

  // Download file endpoint - moved outside almacen router
  app.get('/api/files/:filename', authenticateToken, async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', filename);

      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      // Enviar el archivo con headers apropiados
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.download(filePath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error al descargar el archivo' });
          }
        }
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  });
}