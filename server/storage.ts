import { 
  users, 
  orders, 
  orderPieces,
  transfers, 
  orderHistory, 
  notifications,
  repositions,
  repositionPieces,
  repositionProducts,
  repositionContrastFabrics,
  repositionTimers,
  repositionTransfers,
  repositionHistory,
  repositionMaterials,
  adminPasswords,
  agendaEvents,
  type User, 
  type InsertUser,
  type Order,
  type InsertOrder,
  type Transfer,
  type InsertTransfer,
  type OrderHistory,
  type Notification,
  type InsertNotification,
  type Reposition,
  type InsertReposition,
  type RepositionPiece,
  type InsertRepositionPiece,
  type RepositionTimer as SharedRepositionTimer,
  type InsertRepositionTimer,
  type RepositionTransfer,
  type InsertRepositionTransfer,
  type RepositionHistory,
  type AdminPassword,
  type InsertAdminPassword,
  type AgendaEvent,
  type InsertAgendaEvent,
  type Area,
  type RepositionType,
  type RepositionStatus,
  documents
} from "@shared/schema";
import { db } from './db';
import { eq, and, or, desc, asc, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Función para enviar notificaciones por WebSocket
function broadcastNotification(notification: any) {
  const wss = (global as any).wss;
  if (wss) {
    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'notification',
          data: notification
        }));
      }
    });
    console.log('Notificación enviada por WebSocket:', notification.title);
  } else {
    console.log('WebSocket no disponible para enviar notificación');
  }
}

export interface IStorage {

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAdminUser(): Promise<User | undefined>;
  resetUserPassword(userId: number, hashedPassword: string): Promise<void>;


  createOrder(order: InsertOrder, createdBy: number): Promise<Order>;
  getOrders(area?: Area): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByFolio(folio: string): Promise<Order | undefined>;
  completeOrder(orderId: number): Promise<void>;
  deleteOrder(orderId: number): Promise<void>;

  getOrderPieces(orderId: number): Promise<any[]>;
  updateOrderPieces(orderId: number, area: Area, pieces: number): Promise<void>;

  createTransfer(transfer: InsertTransfer, createdBy: number): Promise<Transfer>;
  getTransfersByArea(area: Area): Promise<Transfer[]>;
  getPendingTransfersForUser(userId: number): Promise<Transfer[]>;
  acceptTransfer(transferId: number, processedBy: number): Promise<void>;
  rejectTransfer(transferId: number, processedBy: number): Promise<void>;

  addOrderHistory(orderId: number, action: string, description: string, userId: number, options?: {
    fromArea?: Area;
    toArea?: Area;
    pieces?: number;
  }): Promise<void>;
  getOrderHistory(orderId: number): Promise<OrderHistory[]>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(notificationId: number): Promise<void>;

  sessionStore: any;

  createReposition(reposition: InsertReposition & { folio: string }, pieces: InsertRepositionPiece[], createdBy: number): Promise<Reposition>;
  getRepositions(area?: Area, userArea?: Area): Promise<Reposition[]>;
  getRepositionsByArea(area: Area, userId?: number): Promise<Reposition[]>;
  getRepositionById(id: number): Promise<Reposition | undefined>;
  getNextRepositionCounter(): Promise<number>;
  approveReposition(repositionId: number, action: RepositionStatus, userId: number, notes?: string): Promise<Reposition>;

  createRepositionTransfer(transfer: InsertRepositionTransfer, createdBy: number): Promise<RepositionTransfer>;
  processRepositionTransfer(transferId: number, action: 'accepted' | 'rejected', userId: number): Promise<RepositionTransfer>;
  getRepositionHistory(repositionId: number): Promise<RepositionHistory[]>;
  getRepositionTracking(repositionId: number): Promise<any>;

  deleteReposition(repositionId: number, userId: number, reason?: string): Promise<void>;
  completeReposition(repositionId: number, userId: number, notes?: string): Promise<void>;
  requestCompletionApproval(repositionId: number, userId: number, notes?: string): Promise<void>;
  getAllRepositions(includeDeleted?: boolean): Promise<Reposition[]>;
  getRecentOrders(area?: Area, limit?: number): Promise<Order[]>;
  getRecentRepositions(area?: Area, limit?: number): Promise<Reposition[]>;

  getReportData(type: string, startDate: string, endDate: string, filters: any): Promise<any>;
  generateReport(type: string, format: string, startDate: string, endDate: string, filters: any): Promise<Buffer>;
  saveReportToOneDrive(type: string, startDate: string, endDate: string, filters: any): Promise<any>;

  createAdminPassword(password: string, createdBy: number): Promise<AdminPassword>;
  verifyAdminPassword(password: string): Promise<boolean>;

  // Agenda Events
  getUserAgendaEvents(userId: number): Promise<any[]>;
  createAgendaEvent(eventData: {
    userId: number;
    title: string;
    description: string;
    date: string;
    time: string;
    priority: 'alta' | 'media' | 'baja';
    status: 'pendiente' | 'completado' | 'cancelado';
  }): Promise<any>;
  updateAgendaEvent(
    eventId: number, 
    userId: number, 
    eventData: {
      title: string;
      description: string;
      date: string;
      time: string;
      priority: 'alta' | 'media' | 'baja';
      status: 'pendiente' | 'completado' | 'cancelado';
    }
  ): Promise<any>;
  deleteAgendaEvent(eventId: number, userId: number): Promise<void>;

  exportHistoryToExcel(orders: any[]): Promise<Buffer>;
  getPendingRepositionTransfers(userArea: Area): Promise<RepositionTransfer[]>;

  // Timer methods
  startRepositionTimer(repositionId: number, area: Area, userId: number): Promise<SharedRepositionTimer>;
  stopRepositionTimer(repositionId: number, area: Area, userId: number): Promise<{ elapsedTime: string }>;
  getRepositionTimers(repositionId: number): Promise<LocalRepositionTimer[]>;
  setManualRepositionTime(repositionId: number, area: Area, userId: number, startTime: string, endTime: string, date: string): Promise<SharedRepositionTimer>;
  getRepositionTimer(repositionId: number, area: Area): Promise<SharedRepositionTimer | null>;

}

export interface LocalRepositionTimer {
  id: number;
  repositionId: number;
  userId: number;
  area: Area;
  startTime: Date;
  endTime: Date | null;
  elapsedTime: string;
}

export class DatabaseStorage implements IStorage {


  async getAllUsers(): Promise<User[]> {
  return await db.select().from(users).orderBy(asc(users.id));
  }

   async deleteUserById(userId: string): Promise<boolean> {
    const result = await db.delete(users)
      .where(eq(users.id, Number(userId)))
      .returning()
      .catch(() => []);
    return result.length > 0;
  }

  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAdminUser(): Promise<User | undefined> {
    const [admin] = await db.select().from(users).where(eq(users.area, 'admin')).limit(1);
    return admin || undefined;
  }

  async resetUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async createOrder(order: InsertOrder, createdBy: number): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, createdBy })
      .returning();

    await db.insert(orderPieces).values({
      orderId: newOrder.id,
      area: 'corte',
      pieces: order.totalPiezas,
    });

    console.log(`Created order ${newOrder.id} with ${order.totalPiezas} pieces in corte area`);

    await this.addOrderHistory(
      newOrder.id,
      'created',
      `Pedido creado con ${order.totalPiezas} piezas`,
      createdBy
    );

    return newOrder;
  }

  async getOrders(area?: Area): Promise<Order[]> {
    if (area) {
      return await db.select().from(orders)
        .where(eq(orders.currentArea, area))
        .orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByFolio(folio: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.folio, folio));
    return order || undefined;
  }

  async completeOrder(orderId: number): Promise<void> {
    await db.update(orders)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(orders.id, orderId));
  }

  async deleteOrder(orderId: number): Promise<void> {
    await db.delete(orderPieces).where(eq(orderPieces.orderId, orderId));
    await db.delete(transfers).where(eq(transfers.orderId, orderId));
    await db.delete(orderHistory).where(eq(orderHistory.orderId, orderId));
    await db.delete(notifications).where(eq(notifications.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }

  async getOrderPieces(orderId: number): Promise<any[]> {
    const pieces = await db.select().from(orderPieces)
      .where(eq(orderPieces.orderId, orderId))
      .orderBy(asc(orderPieces.area));

    console.log(`Order pieces for order ${orderId}:`, pieces);
    return pieces;
  }

  async updateOrderPieces(orderId: number, area: Area, pieces: number): Promise<void> {
    const existing = await db.select().from(orderPieces)
      .where(and(
        eq(orderPieces.orderId, orderId),
        eq(orderPieces.area, area)
      ));

    if (existing.length > 0) {
      await db.update(orderPieces)
        .set({ pieces, updatedAt: new Date() })
        .where(and(
          eq(orderPieces.orderId, orderId),
          eq(orderPieces.area, area)
        ));
    } else {
      await db.insert(orderPieces).values({
        orderId,
        area,
        pieces,
      });
    }
  }

  async createTransfer(transfer: InsertTransfer, createdBy: number): Promise<Transfer> {
    const [newTransfer] = await db
      .insert(transfers)
      .values({ ...transfer, createdBy })
      .returning();

    await this.addOrderHistory(
      transfer.orderId,
      'transfer_created',
      `${transfer.pieces} piezas enviadas a ${transfer.toArea}`,
      createdBy,
      {
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        pieces: transfer.pieces
      }
    );

    return newTransfer;
  }

  async getTransfersByArea(area: Area): Promise<Transfer[]> {
    return await db.select().from(transfers)
      .where(or(
        eq(transfers.fromArea, area),
        eq(transfers.toArea, area)
      ))
      .orderBy(desc(transfers.createdAt));
  }

  async getPendingTransfersForUser(userId: number): Promise<Transfer[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    return await db.select().from(transfers)
      .where(and(
        eq(transfers.toArea, user.area),
        eq(transfers.status, 'pending')
      ))
      .orderBy(desc(transfers.createdAt));
  }

  async acceptTransfer(transferId: number, processedBy: number): Promise<void> {
    const [transfer] = await db.select().from(transfers)
      .where(eq(transfers.id, transferId));

    if (!transfer) return;

    await db.update(transfers)
      .set({
        status: 'accepted',
        processedBy,
        processedAt: new Date()
      })
      .where(eq(transfers.id, transferId));

    const fromAreaPieces = await db.select().from(orderPieces)
      .where(and(
        eq(orderPieces.orderId, transfer.orderId),
        eq(orderPieces.area, transfer.fromArea)
      ));

    if (fromAreaPieces.length > 0) {
      const currentPieces = fromAreaPieces[0].pieces;
      const remainingPieces = currentPieces - transfer.pieces;

      if (remainingPieces > 0) {
        await db.update(orderPieces)
          .set({ pieces: remainingPieces, updatedAt: new Date() })
          .where(and(
            eq(orderPieces.orderId, transfer.orderId),
            eq(orderPieces.area, transfer.fromArea)
          ));
      } else {
        await db.delete(orderPieces)
          .where(and(
            eq(orderPieces.orderId, transfer.orderId),
            eq(orderPieces.area, transfer.fromArea)
          ));
      }
    }

    const toAreaPieces = await db.select().from(orderPieces)
      .where(and(
        eq(orderPieces.orderId, transfer.orderId),
        eq(orderPieces.area, transfer.toArea)
      ));

    if (toAreaPieces.length > 0) {
      await db.update(orderPieces)
        .set({ 
          pieces: toAreaPieces[0].pieces + transfer.pieces, 
          updatedAt: new Date() 
        })
        .where(and(
          eq(orderPieces.orderId, transfer.orderId),
          eq(orderPieces.area, transfer.toArea)
        ));
    } else {
      await db.insert(orderPieces).values({
        orderId: transfer.orderId,
        area: transfer.toArea,
        pieces: transfer.pieces,
      });
    }

    const allOrderPieces = await db.select().from(orderPieces)
      .where(eq(orderPieces.orderId, transfer.orderId));

    if (allOrderPieces.length === 1 && allOrderPieces[0].area === transfer.toArea) {
      await db.update(orders)
        .set({ currentArea: transfer.toArea })
        .where(eq(orders.id, transfer.orderId));
    }

    await this.addOrderHistory(
      transfer.orderId,
      'transfer_accepted',
      `Transferencia aceptada - ${transfer.pieces} piezas movidas de ${transfer.fromArea} a ${transfer.toArea}`,
      processedBy,
      {
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        pieces: transfer.pieces
      }
    );
  }

  async rejectTransfer(transferId: number, processedBy: number): Promise<void> {
    const [transfer] = await db.select().from(transfers)
      .where(eq(transfers.id, transferId));

    if (!transfer) return;

    await db.update(transfers)
      .set({
        status: 'rejected',
        processedBy,
        processedAt: new Date()
      })
      .where(eq(transfers.id, transferId));

    await this.addOrderHistory(
      transfer.orderId,
      'transfer_rejected',
      `Transferencia rechazada - ${transfer.pieces} piezas devueltas a ${transfer.fromArea}`,
      processedBy,
      {
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        pieces: transfer.pieces
      }
    );
  }

  async addOrderHistory(
    orderId: number, 
    action: string, 
    description: string, 
    userId: number,
    options?: {
      fromArea?: Area;
      toArea?: Area;
      pieces?: number;
    }
  ): Promise<void> {
    await db.insert(orderHistory).values({
      orderId,
      action,
      description,
      userId,
      fromArea: options?.fromArea,
      toArea: options?.toArea,
      pieces: options?.pieces,
    });
  }

  async getOrderHistory(orderId: number): Promise<OrderHistory[]> {
    return await db.select().from(orderHistory)
      .where(eq(orderHistory.orderId, orderId))
      .orderBy(asc(orderHistory.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();

      broadcastNotification({
        ...newNotification,
        userId: newNotification.userId
      });

    return newNotification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    const notifications = await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

      console.log(`getUserNotifications: Found ${notifications.length} notifications for user ${userId}`);

    return notifications;
  }

  async markNotificationRead(notificationId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  async createReposition(repositionData: InsertReposition & { folio: string, productos?: any[], telaContraste?: any }, pieces: InsertRepositionPiece[], createdBy: number): Promise<Reposition> {
    const { productos, telaContraste, ...mainRepositionData } = repositionData;

    const [reposition] = await db.insert(repositions)
      .values({
        ...mainRepositionData,
        createdBy,
      })
      .returning();

    if (pieces.length > 0) {
      await db.insert(repositionPieces)
        .values(pieces.map(piece => ({
          ...piece,
          repositionId: reposition.id
        })));
    }

    // Guardar productos adicionales si existen
    if (productos && productos.length > 0) {
      await db.insert(repositionProducts)
        .values(productos.map(producto => ({
          repositionId: reposition.id,
          modeloPrenda: producto.modeloPrenda,
          tela: producto.tela,
          color: producto.color,
          tipoPieza: producto.tipoPieza,
          consumoTela: producto.consumoTela || 0
        })));
    }

    // Guardar tela contraste si existe
    if (telaContraste) {
      await db.insert(repositionContrastFabrics)
        .values({
          repositionId: reposition.id,
          tela: telaContraste.tela,
          color: telaContraste.color,
          consumo: telaContraste.consumo
        });

      // Guardar piezas de tela contraste si existen
      if (telaContraste.pieces && telaContraste.pieces.length > 0) {
        // Crear entradas separadas para las piezas de contraste
        // Esto puede requerir una tabla adicional o manejo especial
      }
    }

    await db.insert(repositionHistory)
      .values({
        repositionId: reposition.id,
        action: 'created',
        description: `Reposition ${reposition.type} created`,
        userId: createdBy,
      });

    // Notificar a admin y operaciones sobre nueva reposición
    const adminUsers = await db.select().from(users)
      .where(or(eq(users.area, 'admin'), eq(users.area, 'operaciones')));

    for (const admin of adminUsers) {
      await this.createNotification({
        userId: admin.id,
        type: 'new_reposition',
        title: 'Nueva Solicitud de Reposición',
        message: `Se ha creado una nueva solicitud de ${reposition.type}: ${reposition.folio}`,
        repositionId: reposition.id,
      });
    }

    return reposition;
  }

  async getRepositions(area?: Area, userArea?: Area | 'admin' | 'envios' | 'diseño'): Promise<Reposition[]> {
    let query = db.select().from(repositions);

    if (userArea === 'diseño') {
      // Diseño puede ver todas las reposiciones aprobadas
      query = (query as any).where(
        and(
          eq(repositions.status, 'aprobado' as RepositionStatus),
          ne(repositions.status, 'eliminado' as RepositionStatus)
        )
      );
    } else if (userArea !== 'admin' && userArea !== 'envios') {
        query = (query as any).where(
          and(
            ne(repositions.status, 'eliminado' as RepositionStatus),
            ne(repositions.status, 'completado' as RepositionStatus)
          )
        );
    }

    return await (query as any).orderBy(desc(repositions.createdAt));
  }

  async getRepositionsByArea(area: Area, userId?: number): Promise<Reposition[]> {
    let whereCondition;

    if (userId) {
      // Si se proporciona userId, mostrar reposiciones del área actual O creadas por el usuario
      whereCondition = and(
        or(
          eq(repositions.currentArea, area),
          eq(repositions.createdBy, userId)
        ),
        ne(repositions.status, 'eliminado' as RepositionStatus),
        ne(repositions.status, 'completado' as RepositionStatus)
      );
    } else {
      // Sin userId, solo mostrar del área actual
      whereCondition = and(
        eq(repositions.currentArea, area),
        ne(repositions.status, 'eliminado' as RepositionStatus),
        ne(repositions.status, 'completado' as RepositionStatus)
      );
    }

    return await db.select().from(repositions)
      .where(whereCondition)
      .orderBy(desc(repositions.createdAt));
  }

  async getRepositionById(id: number): Promise<Reposition | undefined> {
    const [reposition] = await db.select().from(repositions).where(eq(repositions.id, id));
    return reposition || undefined;
  }

  async getNextRepositionCounter(): Promise<number> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const yearStr = year.toString();
    const monthStr = String(month).padStart(2, '0');
    const folioPrefix = `JN-REQ-${monthStr}-${yearStr.slice(-2)}-`;

    const result = await db.select().from(repositions);
    const thisMonthCount = result.filter(r => r.folio.startsWith(folioPrefix)).length;

    return thisMonthCount + 1;
  }

  async approveReposition(repositionId: number, action: RepositionStatus, userId: number, notes?: string): Promise<Reposition> {
    const [reposition] = await db.update(repositions)
      .set({
        status: action,
        approvedBy: userId,
        approvedAt: new Date(),
        // NO cambiar área automáticamente, mantener en área actual
      })
      .where(eq(repositions.id, repositionId))
      .returning();

    await db.insert(repositionHistory)
      .values({
        repositionId,
        action: action === 'aprobado' ? 'approved' : 'rejected',
        description: `Reposición ${action === 'aprobado' ? 'aprobada' : 'rechazada'}${notes ? `: ${notes}` : ''}`,
        userId,
      });

    // Notificar al solicitante original
    await this.createNotification({
      userId: reposition.createdBy,
      type: action === 'aprobado' ? 'transfer_accepted' : 'transfer_rejected',
      title: action === 'aprobado' ? 'Reposición Aprobada' : 'Reposición Rechazada',
      message: `Tu reposición ${reposition.folio} ha sido ${action === 'aprobado' ? 'aprobada' : 'rechazada'}${notes ? `: ${notes}` : ''}`,
      repositionId: repositionId,
    });

    return reposition;
  }

  async createRepositionTransfer(transfer: InsertRepositionTransfer, createdBy: number): Promise<RepositionTransfer> {
    const [repositionTransfer] = await db.insert(repositionTransfers)
      .values({
        ...transfer,
        createdBy,
      })
      .returning();

    await db.insert(repositionHistory)
      .values({
        repositionId: transfer.repositionId,
        action: 'transfer_requested',
        description: `Transfer requested from ${transfer.fromArea} to ${transfer.toArea}`,
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        userId: createdBy,
      });

    // Obtener la reposición para el folio
    const reposition = await this.getRepositionById(transfer.repositionId);

    // Notificar a usuarios del área de destino
    const targetAreaUsers = await db.select().from(users)
      .where(eq(users.area, transfer.toArea));

    for (const user of targetAreaUsers) {
      await this.createNotification({
        userId: user.id,
        type: 'reposition_transfer',
        title: 'Nueva Transferencia de Reposición',
        message: `Se ha solicitado transferir la reposición ${reposition?.folio} de ${transfer.fromArea} a ${transfer.toArea}`,
        repositionId: transfer.repositionId,
      });
    }

    return repositionTransfer;
  }

  async processRepositionTransfer(transferId: number, action: 'accepted' | 'rejected', userId: number): Promise<RepositionTransfer> {
    const [transfer] = await db.update(repositionTransfers)
      .set({
        status: action,
        processedBy: userId,
        processedAt: new Date(),
      })
      .where(eq(repositionTransfers.id, transferId))
      .returning();

    if (action === 'accepted') {
      await db.update(repositions)
        .set({ currentArea: transfer.toArea })
        .where(eq(repositions.id, transfer.repositionId));
    }

    await db.insert(repositionHistory)
      .values({
        repositionId: transfer.repositionId,
        action: `transfer_${action}`,
        description: `Transfer ${action} from ${transfer.fromArea} to ${transfer.toArea}`,
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        userId,
      });

    // Obtener la reposición para el folio
    const reposition = await this.getRepositionById(transfer.repositionId);

    // Notificar al solicitante original
    await this.createNotification({
      userId: transfer.createdBy,
      type: 'transfer_processed',
      title: `Transferencia ${action === 'accepted' ? 'Aceptada' : 'Rechazada'}`,
      message: `La transferencia de la reposición ${reposition?.folio} ha sido ${action === 'accepted' ? 'aceptada' : 'rechazada'}`,
      repositionId: transfer.repositionId,
    });

    // Si fue aceptada, notificar a usuarios del área de destino
    if (action === 'accepted') {
      const targetAreaUsers = await db.select().from(users)
        .where(eq(users.area, transfer.toArea));

      for (const user of targetAreaUsers) {
        if (user.id !== userId) { // No notificar al que procesó
          await this.createNotification({
            userId: user.id,
            type: 'reposition_received',
            title: 'Nueva Reposición Recibida',
            message: `La reposición ${reposition?.folio} ha llegado a tu área`,
            repositionId: transfer.repositionId,
          });
        }
      }
    }

    return transfer;
  }

  async getRepositionHistory(repositionId: number): Promise<RepositionHistory[]> {
    return await db.select().from(repositionHistory)
      .where(eq(repositionHistory.repositionId, repositionId))
      .orderBy(asc(repositionHistory.createdAt));
  }

  async createAdminPassword(password: string, createdBy: number): Promise<AdminPassword> {
    const [adminPassword] = await db.insert(adminPasswords)
      .values({
        password,
        createdBy,
      })
      .returning();

    return adminPassword;
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    const [adminPassword] = await db.select().from(adminPasswords)
      .where(and(eq(adminPasswords.password, password), eq(adminPasswords.isActive, true)))
      .orderBy(desc(adminPasswords.createdAt));

    return !!adminPassword;
  }

  async updateRepositionConsumo(repositionId: number, consumoTela: number): Promise<void> {
    await db.update(repositions)
      .set({ consumoTela })
      .where(eq(repositions.id, repositionId));
  }

  async deleteReposition(repositionId: number, userId: number, reason: string): Promise<void> {
    console.log('Deleting reposition:', repositionId, 'by user:', userId, 'reason:', reason);

    // Obtener la reposición antes de eliminarla
    const reposition = await this.getRepositionById(repositionId);
    if (!reposition) {
      throw new Error('Reposición no encontrada');
    }

    console.log('Found reposition:', reposition.folio);

    await db.update(repositions)
      .set({
        status: 'eliminado' as RepositionStatus,
        completedAt: new Date(),
      })
      .where(eq(repositions.id, repositionId));

    console.log('Updated reposition status to eliminado');

    await db.insert(repositionHistory)
      .values({
        repositionId,
        action: 'deleted',
        description: `Reposición eliminada. Motivo: ${reason}`,
        userId,
      });

    console.log('Added history entry');

    // Crear notificación para el solicitante
    if (reposition.createdBy !== userId) {
      await this.createNotification({
        userId: reposition.createdBy,
        type: 'reposition_deleted',
        title: 'Reposición Eliminada',
        message: `La reposición ${reposition.folio} ha sido eliminada. Motivo: ${reason}`,
        repositionId: repositionId,
      });
      console.log('Created notification for user:', reposition.createdBy);
    }
  }

  async completeReposition(repositionId: number, userId: number, notes?: string): Promise<void> {
    await db.update(repositions)
      .set({
        status: 'completado' as RepositionStatus,
        completedAt: new Date(),
        approvedBy: userId,
      })
      .where(eq(repositions.id, repositionId));

    await db.insert(repositionHistory)
      .values({
        repositionId,
        action: 'completed',
        description: `Reposición finalizada${notes ? `: ${notes}` : ''}`,
        userId,
      });

    // Crear notificación para el solicitante
    const reposition = await this.getRepositionById(repositionId);
    if (reposition) {
      await this.createNotification({
        userId: reposition.createdBy,
        type: 'reposition_completed',
        title: 'Reposición Completada',
        message: `La reposición ${reposition.folio} ha sido completada${notes ? `: ${notes}` : ''}`,
        repositionId: repositionId,
      });
    }
  }

  async requestCompletionApproval(repositionId: number, userId: number, notes?: string): Promise<void> {
    await db.insert(repositionHistory)
        .values({
            repositionId,
            action: 'completion_requested',
            description: `Solicitud de finalización enviada${notes ? `: ${notes}` : ''}`,
            userId,
        });

    // Crear notificaciones para admin, envíos y operaciones
    const adminUsers = await db.select().from(users)
      .where(eq(users.area, 'admin'));

    const enviosUsers = await db.select().from(users)
      .where(eq(users.area, 'envios'));

    const operacionesUsers = await db.select().from(users)
      .where(eq(users.area, 'operaciones'));

    const allTargetUsers = [...adminUsers, ...enviosUsers, ...operacionesUsers];

    const reposition = await this.getRepositionById(repositionId);
    if (reposition) {
        for (const targetUser of allTargetUsers) {
            await this.createNotification({
                userId: targetUser.id,
                type: 'completion_approval_needed',
                title: 'Solicitud de Finalización',
                message: `Se solicita aprobación para finalizar la reposición ${reposition.folio}${notes ? `: ${notes}` : ''}`,
                repositionId: repositionId,
            });
        }
    }
}

  async getPendingRepositionsCount(): Promise<number> {
    const repositions = await this.getAllRepositions(false);
    return repositions.filter(r => r.status === 'pendiente').length;
  }

  async getAllRepositions(includeDeleted: boolean = false): Promise<Reposition[]> {
    let query;

    if (!includeDeleted) {
      query = db.select().from(repositions).where(ne(repositions.status, 'eliminado' as RepositionStatus));
    } else {
      query = db.select().from(repositions);
    }

    return await query.orderBy(desc(repositions.createdAt));
  }

  async getRecentOrders(area?: Area, limit: number = 10): Promise<Order[]> {
    let query;

    if (area && area !== 'admin') {
      query = db.select().from(orders).where(eq(orders.currentArea, area));
    } else {
      query = db.select().from(orders);
    }

    return await query
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getRecentRepositions(area?: Area, limit: number = 10): Promise<Reposition[]> {
    let whereCondition: any = ne(repositions.status, 'eliminado' as RepositionStatus);

    if (area && area !== 'admin') {
      whereCondition = and(
        ne(repositions.status, 'eliminado' as RepositionStatus),
        eq(repositions.currentArea, area)
      );
    }

    return await db.select().from(repositions)
      .where(whereCondition)
      .orderBy(desc(repositions.createdAt))
      .limit(limit);
  }

async getRepositionTracking(repositionId: number): Promise<any> {
    console.log('Getting tracking for reposition ID:', repositionId);

    const reposition = await this.getRepositionById(repositionId);
    if (!reposition) {
      console.log('Reposition not found for ID:', repositionId);
      throw new Error('Reposition not found');
    }

    console.log('Found reposition:', reposition.folio);
    const history = await this.getRepositionHistory(repositionId);
    console.log('History entries:', history.length);

    // Obtener tiempos por área
    const timers = await db.select().from(repositionTimers)
      .where(eq(repositionTimers.repositionId, repositionId));

    console.log('Timers found:', timers.length);

    // Definir las áreas en orden
    const areas = ['patronaje', 'corte', 'bordado', 'ensamble', 'plancha', 'calidad'];
    const currentAreaIndex = areas.indexOf(reposition.currentArea);

    // Crear pasos del proceso
    const steps = areas.map((area, index) => {
      const areaTimer = timers.find(t => t.area === area);
      let status: 'completed' | 'current' | 'pending' = 'pending';

      if (index < currentAreaIndex || reposition.status === 'completado') {
        status = 'completed';
      } else if (index === currentAreaIndex && reposition.status !== 'completado') {
        status = 'current';
      }

      let timeSpent = undefined;
      let timeInMinutes = 0;

      if (areaTimer && areaTimer.manualStartTime && areaTimer.manualEndTime) {
        const startTime = new Date(areaTimer.manualStartTime);
        const endTime = new Date(areaTimer.manualEndTime);
        timeInMinutes = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60);
        const hours = Math.floor(timeInMinutes / 60);
        const minutes = Math.round(timeInMinutes % 60);
        timeSpent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }

      // Buscar el evento de historia más reciente para esta área
      const areaHistory = history.find(h => h.toArea === area || (area === 'patronaje' && h.action === 'created'));

      return {
        id: index + 1,
        area,
        status,
        timestamp: areaHistory?.timestamp,
        user: areaHistory?.userName,
        timeSpent,
        timeInMinutes
      };
    });

    // Calcular tiempos por área - inicializar con objeto vacío
    const areaTimes: Record<string, number> = {};

    // Asegurar que todas las áreas tengan al menos 0 minutos
    areas.forEach(area => {
      areaTimes[area] = 0;
    });

    // Llenar con los tiempos reales si existen
    timers.forEach(timer => {
      if (timer.manualStartTime && timer.manualEndTime) {
        const startTime = new Date(timer.manualStartTime);
        const endTime = new Date(timer.manualEndTime);
        const timeInMinutes = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60);
        areaTimes[timer.area] = timeInMinutes;
      }
    });

    console.log('Area times calculated:', areaTimes);

    // Calcular tiempo total
    const totalMinutes = Object.values(areaTimes).reduce((sum, minutes) => sum + minutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.round(totalMinutes % 60);
    const totalTimeFormatted = totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${remainingMinutes}m`;

    // Calcular progreso
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedSteps / areas.length) * 100);

    const result = {
      reposition: {
        folio: reposition.folio,
        status: reposition.status,
        currentArea: reposition.currentArea,
        progress
      },
      steps,
      history,
      totalTime: {
        formatted: totalTimeFormatted,
        minutes: totalMinutes
      },
      areaTimes
    };

    console.log('Returning tracking data:', JSON.stringify(result, null, 2));
    return result;
  }



  async getPendingRepositionTransfers(userArea: Area): Promise<RepositionTransfer[]> {
    return await db.select().from(repositionTransfers)
      .where(and(
        eq(repositionTransfers.toArea, userArea),
        eq(repositionTransfers.status, 'pending')
      ))
      .orderBy(desc(repositionTransfers.createdAt));
  }

  // Agenda Events
  async getAgendaEvents(user: any): Promise<any[]> {
    // Admin y Envíos ven todas las tareas, otras áreas solo las asignadas a ellas
    if (user.area === 'admin' || user.area === 'envios') {
      return await db.select({
        id: agendaEvents.id,
        createdBy: agendaEvents.createdBy,
        assignedToArea: agendaEvents.assignedToArea,
        title: agendaEvents.title,
        description: agendaEvents.description,
        date: agendaEvents.date,
        time: agendaEvents.time,
        priority: agendaEvents.priority,
        status: agendaEvents.status,
        createdAt: agendaEvents.createdAt,
        updatedAt: agendaEvents.updatedAt,
        creatorName: users.name
      })
      .from(agendaEvents)
      .leftJoin(users, eq(agendaEvents.createdBy, users.id))
      .orderBy(asc(agendaEvents.date), asc(agendaEvents.time));
    } else {
      return await db.select({
        id: agendaEvents.id,
        createdBy: agendaEvents.createdBy,
        assignedToArea: agendaEvents.assignedToArea,
        title: agendaEvents.title,
        description: agendaEvents.description,
        date: agendaEvents.date,
        time: agendaEvents.time,
        priority: agendaEvents.priority,
        status: agendaEvents.status,
        createdAt: agendaEvents.createdAt,
        updatedAt: agendaEvents.updatedAt,
        creatorName: users.name
      })
      .from(agendaEvents)
      .leftJoin(users, eq(agendaEvents.createdBy, users.id))
      .where(eq(agendaEvents.assignedToArea, user.area as Area))
      .orderBy(asc(agendaEvents.date), asc(agendaEvents.time));
    }
  }

  async createAgendaEvent(eventData: any): Promise<any> {
    const [event] = await db
      .insert(agendaEvents)
      .values(eventData)
      .returning();

    return event;
  }

  async updateAgendaEvent(eventId: number, eventData: any): Promise<any> {
    const [event] = await db
      .update(agendaEvents)
      .set(eventData)
      .where(eq(agendaEvents.id, eventId))
      .returning();

    if (!event) {
      throw new Error("Tarea no encontrada");
    }

    return event;
  }

  async updateTaskStatus(eventId: number, userArea: string, status: string): Promise<any> {
    const [event] = await db.update(agendaEvents)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(agendaEvents.id, eventId), 
        eq(agendaEvents.assignedToArea, userArea)
      ))
      .returning();

    if (!event) {
      throw new Error("Tarea no encontrada o no asignada a tu área");
    }

    return event;
  }

  async deleteAgendaEvent(eventId: number): Promise<void> {
    const result = await db
      .delete(agendaEvents)
      .where(eq(agendaEvents.id, eventId));

    if (result.rowCount === 0) {
      throw new Error("Tarea no encontrada");
    }
  }

  async exportHistoryToExcel(orders: any[]): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Historial de Pedidos');

    // Configurar encabezados
    worksheet.columns = [
      { header: 'Folio', key: 'folio', width: 15 },
      { header: 'Cliente/Hotel', key: 'clienteHotel', width: 20 },
      { header: 'Modelo', key: 'modelo', width: 15 },
      { header: 'Tipo Prenda', key: 'tipoPrenda', width: 15 },
      { header: 'Color', key: 'color', width: 12 },
      { header: 'Tela', key: 'tela', width: 15 },
      { header: 'Total Piezas', key: 'totalPiezas', width: 12 },
      { header: 'No. Solicitud', key: 'noSolicitud', width: 15 },
      { header: 'Área Actual', key: 'currentArea', width: 15 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Fecha Creación', key: 'createdAt', width: 18 },
      { header: 'Fecha Finalización', key: 'completedAt', width: 18 }
    ];

    // Estilo para encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Función para obtener nombre de área en español
    const getAreaDisplayName = (area: string) => {
      const names: Record<string, string> = {
        corte: 'Corte',
        bordado: 'Bordado',
        ensamble: 'Ensamble',
        plancha: 'Plancha/Empaque',
        calidad: 'Calidad',
        envios: 'Envíos',
        admin: 'Admin'
      };
      return names[area] || area;
    };

    // Agregar datos
    orders.forEach(order => {
      worksheet.addRow({
        folio: order.folio,
        clienteHotel: order.clienteHotel,
        modelo: order.modelo,
        tipoPrenda: order.tipoPrenda,
        color: order.color,
        tela: order.tela,
        totalPiezas: order.totalPiezas,
        noSolicitud: order.noSolicitud,
        currentArea: getAreaDisplayName(order.currentArea),
        status: order.status === 'completed' ? 'Finalizado' : 'En Proceso',
        createdAt: new Date(order.createdAt).toLocaleString('es-ES'),
        completedAt: order.completedAt ? new Date(order.completedAt).toLocaleString('es-ES') : ''
      });
    });

    // Aplicar bordes a todas las celdas
    worksheet.eachRow((row: typeof ExcelJS.Row, rowNumber: number) => {
      row.eachCell((cell: typeof ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generar buffer
    return await workbook.xlsx.writeBuffer();
  }

  async generateReport(
    type: string,
    format: string,
    startDate: string,
    endDate: string,
    filters: { area?: string; status?: string; urgency?: string }
  ): Promise<Buffer> {
    throw new Error("Method not implemented.");
  }
  async saveReportToOneDrive(type: string, startDate: string, endDate: string, filters: any): Promise<any> {
    throw new Error("Method not implemented.");
  }

async startRepositionTimer(repositionId: number, userId: number, area: Area): Promise<SharedRepositionTimer> {
    // Check if there's already a running timer for this reposition and area
    const existingTimer = await db.select().from(repositionTimers)
      .where(and(
        eq(repositionTimers.repositionId, repositionId),
        eq(repositionTimers.area, area),
        eq(repositionTimers.isRunning, true)
      )).limit(1);

    if (existingTimer.length > 0) {
      throw new Error('Ya existe un timer activo para esta reposición en esta área');
    }

    const [timer] = await db.insert(repositionTimers)
      .values({
        repositionId,
        area,
        userId,
        startTime: new Date(),
        isRunning: true,
      })
      .returning();

    return timer;
  }

  async stopRepositionTimer(repositionId: number, area: Area, userId: number): Promise<{ elapsedTime: string }> {
        // Buscar el timer activo para esta reposición
    const [activeTimer] = await db.select().from(repositionTimers)
      .where(and(
        eq(repositionTimers.repositionId, repositionId),
        eq(repositionTimers.isRunning, true)
      ))
      .orderBy(desc(repositionTimers.startTime));

    if (!activeTimer) {
      throw new Error('No hay cronómetro activo para esta reposición');
    }

    const endTime = new Date();
    const startTime = new Date(activeTimer.startTime!);
    const elapsedMilliseconds = endTime.getTime() - startTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMilliseconds / (1000 * 60));

    // Formatear tiempo transcurrido
    const hours = Math.floor(elapsedMinutes / 60);
    const minutes = elapsedMinutes % 60;
    const elapsedTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

    // Actualizar el timer
    await db.update(repositionTimers)
      .set({
        endTime,
        elapsedMinutes,
        isRunning: false,
      })
      .where(eq(repositionTimers.id, activeTimer.id));

        // Obtener información del usuario
    const user = await this.getUser(userId);

    // Registrar en el historial
    await db.insert(repositionHistory).values({
      repositionId,
      action: 'timer_stopped',
      description: `Cronómetro detenido por ${user?.name || 'Usuario'} en área ${area}. Tiempo transcurrido: ${elapsedTimeFormatted}`,
      userId,
    });

    console.log(`Timer stopped for reposition ${repositionId} by user ${userId} in area ${area}. Elapsed: ${elapsedTimeFormatted}`);

    return { elapsedTime: elapsedTimeFormatted };
  }

  async getRepositionTimers(repositionId: number): Promise<LocalRepositionTimer[]> {
    // Implement timer retrieval logic here
    console.log(`Retrieving timers for reposition ${repositionId}`);
    const timers = await db.select().from(repositionTimers)
      .where(eq(repositionTimers.repositionId, repositionId));

    const localTimers: LocalRepositionTimer[] = timers.map(timer => {
      const startTime = timer.startTime ? new Date(timer.startTime) : null;
      const endTime = timer.endTime ? new Date(timer.endTime) : null;

      let elapsedMinutes = timer.elapsedMinutes || 0;
      if (startTime && endTime) {
        elapsedMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      }
      const hours = Math.floor(elapsedMinutes / 60);
      const minutes = Math.floor(elapsedMinutes % 60);
      const elapsedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      return {
        id: timer.id,
        repositionId: timer.repositionId,
        userId: timer.userId,
        area: timer.area,
        startTime: startTime!,
        endTime: endTime,
        elapsedTime,
      };
    });
    return localTimers;
  }

  async getReportData(type: string, startDate: string, endDate: string, filters: any): Promise<any> {
    // Implement report data retrieval logic here
    throw new Error("Method not implemented.");
  }

  async getUserAgendaEvents(userId: number): Promise<any[]> {
    // Implement user agenda events retrieval logic here
    throw new Error("Method not implemented.");
  }

  async setManualRepositionTime(repositionId: number, area: Area, userId: number, startTime: string, endTime: string, date: string): Promise<SharedRepositionTimer> {
    // Validar formato de tiempo (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw new Error('Formato de tiempo inválido. Use HH:MM');
    }

    // Validar formato de fecha (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    // Calcular minutos transcurridos
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    let elapsedMinutes = endTotalMinutes - startTotalMinutes;
    if (elapsedMinutes < 0) {
      elapsedMinutes += 24 * 60; // Asume que el trabajo cruzó la medianoche
    }

    // Verificar si ya existe un timer para esta reposición y área
    const existingTimer = await db.select().from(repositionTimers)
      .where(and(
        eq(repositionTimers.repositionId, repositionId),
        eq(repositionTimers.area, area)
      )).limit(1);

    if (existingTimer.length > 0) {
      // Actualizar timer existente
      const [updatedTimer] = await db.update(repositionTimers)
        .set({
          manualStartTime: startTime,
          manualEndTime: endTime,
          manualDate: date,
          elapsedMinutes,
          isRunning: false,
        })
        .where(eq(repositionTimers.id, existingTimer[0].id))
        .returning();

      return updatedTimer;
    } else {
      // Crear nuevo timer
      const [timer] = await db.insert(repositionTimers)
        .values({
          repositionId,
          area,
          userId,
          manualStartTime: startTime,
          manualEndTime: endTime,
          manualDate: date,
          elapsedMinutes,
          isRunning: false,
        })
        .returning();

      return timer;
    }
  }

  async getRepositionTimer(repositionId: number, area: Area): Promise<SharedRepositionTimer | null> {
    const [timer] = await db.select().from(repositionTimers)
      .where(and(
        eq(repositionTimers.repositionId, repositionId),
        eq(repositionTimers.area, area)
      )).limit(1);

    return timer || null;
  }

  // Funciones para gestión de materiales
  async updateRepositionMaterialStatus(repositionId: number, materialStatus: string, missingMaterials?: string, notes?: string): Promise<void> {
    const existingMaterial = await db.select().from(repositionMaterials)
      .where(eq(repositionMaterials.repositionId, repositionId))
      .limit(1);

    if (existingMaterial.length > 0) {
      await db.update(repositionMaterials)
        .set({
          materialStatus: materialStatus as any,
          missingMaterials,
          notes,
          updatedAt: new Date()
        })
        .where(eq(repositionMaterials.repositionId, repositionId));
    } else {
      await db.insert(repositionMaterials).values({
        repositionId,
        materialStatus: materialStatus as any,
        missingMaterials,
        notes
      });
    }

    // Registrar en historial
    await db.insert(repositionHistory).values({
      repositionId,
      action: 'material_status_updated',
      description: `Estado de materiales actualizado: ${materialStatus}${missingMaterials ? ` - Faltantes: ${missingMaterials}` : ''}`,
      userId: 1 // Esto debería ser el ID del usuario actual
    });
  }

  async pauseReposition(repositionId: number, reason: string, userId: number): Promise<void> {
    const existingMaterial = await db.select().from(repositionMaterials)
      .where(eq(repositionMaterials.repositionId, repositionId))
      .limit(1);

    if (existingMaterial.length > 0) {
      await db.update(repositionMaterials)
        .set({
          isPaused: true,
          pauseReason: reason,
          pausedBy: userId,
          pausedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(repositionMaterials.repositionId, repositionId));
    } else {
      await db.insert(repositionMaterials).values({
        repositionId,
        isPaused: true,
        pauseReason: reason,
        pausedBy: userId,
        pausedAt: new Date()
      });
    }

    // Registrar en historial
    await db.insert(repositionHistory).values({
      repositionId,
      action: 'paused',
      description: `Reposición pausada por almacén. Motivo: ${reason}`,
      userId
    });

    // Notificar a áreas relevantes
    const areaUsers = await db.select().from(users)
      .where(or(
        eq(users.area, 'admin'),
        eq(users.area, 'operaciones'),
        eq(users.area, 'envios')
      ));


    for (const user of areaUsers) {
      await this.createNotification({
        userId: user.id,
        type: 'reposition_paused',
        title: 'Reposición Pausada',
        message: `La reposición ha sido pausada por almacén. Motivo: ${reason}`,
        repositionId
      });
    }
  }

  async resumeReposition(repositionId: number, userId: number): Promise<void> {
    await db.update(repositionMaterials)
      .set({
        isPaused: false,
        resumedBy: userId,
        resumedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(repositionMaterials.repositionId, repositionId));

    // Registrar en historial
    await db.insert(repositionHistory).values({
      repositionId,
      action: 'resumed',
      description: 'Reposición reanudada por almacén',
      userId
    });
  }

  async getRepositionMaterialStatus(repositionId: number): Promise<any> {
    const material = await db.select().from(repositionMaterials)
      .where(eq(repositionMaterials.repositionId, repositionId))
      .limit(1);

    return material[0] || null;
  }

  async saveRepositionDocument(documentData: {
    repositionId: number;
    filename: string;
    originalName: string;
    size: number;
    path: string;
    uploadedBy: number;
  }): Promise<any> {
      const allowedExtensions = ['.pdf', '.xml', '.jpg', '.jpeg', '.png'];
      const fileExtension = documentData.originalName.toLowerCase().split('.').pop();

      if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
          throw new Error('Tipo de archivo no permitido. Solo se permiten archivos PDF, XML, JPG, PNG y JPEG.');
      }

    const [document] = await db.insert(documents)
      .values({
        filename: documentData.filename,
        originalName: documentData.originalName,
        size: documentData.size,
        path: documentData.path,
        repositionId: documentData.repositionId,
        uploadedBy: documentData.uploadedBy,
      })
      .returning();

    return document;
  }

  async getRepositionDocuments(repositionId: number): Promise<any[]> {
    const docs = await db.select({
      id: documents.id,
      filename: documents.filename,
      originalName: documents.originalName,
      size: documents.size,
      uploadedBy: documents.uploadedBy,
      createdAt: documents.createdAt,
      uploaderName: users.name
    })
    .from(documents)
    .leftJoin(users, eq(documents.uploadedBy, users.id))
    .where(eq(documents.repositionId, repositionId))
    .orderBy(documents.createdAt);

    return docs;
  }

  async getAllRepositionsForAlmacen(): Promise<any[]> {
    const result = await db.select({
      id: repositions.id,
      folio: repositions.folio,
      type: repositions.type,
      solicitanteNombre: repositions.solicitanteNombre,
      solicitanteArea: repositions.solicitanteArea,
      modeloPrenda: repositions.modeloPrenda,
      tela: repositions.tela,
      color: repositions.color,
      tipoPieza: repositions.tipoPieza,
      consumoTela: repositions.consumoTela,
      urgencia: repositions.urgencia,
      currentArea: repositions.currentArea,
      status: repositions.status,
      createdAt: repositions.createdAt,
      isPaused: repositionMaterials.isPaused,
      pauseReason: repositionMaterials.pauseReason
    })
    .from(repositions)
    .leftJoin(repositionMaterials, eq(repositions.id, repositionMaterials.repositionId))
    .where(and(
      ne(repositions.status, 'eliminado' as RepositionStatus),
      ne(repositions.status, 'completado' as RepositionStatus)
    ))
    .orderBy(desc(repositions.createdAt));

    return result;
  }

  async createReposition(data: InsertReposition & { folio: string, productos?: any[], telaContraste?: any, volverHacer?:string, materialesImplicados?:string, observaciones?: string }, pieces: InsertRepositionPiece[], createdBy: number): Promise<Reposition> {
    const { productos, telaContraste, volverHacer, materialesImplicados, observaciones, ...mainRepositionData } = data;

    const [reposition] = await db.insert(repositions)
      .values({
        ...mainRepositionData,
        createdBy,
        volverHacer: volverHacer,
        descripcionSuceso: data.descripcionSuceso,
        materialesImplicados: materialesImplicados,
        observaciones: observaciones
      })
      .returning();

    if (pieces.length > 0) {
      await db.insert(repositionPieces)
        .values(pieces.map(piece => ({
          ...piece,
          repositionId: reposition.id
        })));
    }

    // Guardar productos adicionales si existen
    if (productos && productos.length > 0) {
      await db.insert(repositionProducts)
        .values(productos.map(producto => ({
          repositionId: reposition.id,
          modeloPrenda: producto.modeloPrenda,
          tela: producto.tela,
          color: producto.color,
          tipoPieza: producto.tipoPieza,
          consumoTela: producto.consumoTela || 0
        })));
    }

    // Guardar tela contraste si existe
    if (telaContraste) {
      await db.insert(repositionContrastFabrics)
        .values({
          repositionId: reposition.id,
          tela: telaContraste.tela,
          color: telaContraste.color,
          consumo: telaContraste.consumo
        });

      // Guardar piezas de tela contraste si existen
      if (telaContraste.pieces && telaContraste.pieces.length > 0) {
        // Crear entradas separadas para las piezas de contraste
        // Esto puede requerir una tabla adicional o manejo especial
      }
    }

    await db.insert(repositionHistory)
      .values({
        repositionId: reposition.id,
        action: 'created',
        description: `Reposition ${reposition.type} created`,
        userId: createdBy,
      });

    // Notificar a admin, operaciones y envíos sobre nueva reposición
    const adminUsers = await db.select().from(users)
      .where(eq(users.area, 'admin'));

    const operacionesUsers = await db.select().from(users)
      .where(eq(users.area, 'operaciones'));

    const enviosUsers = await db.select().from(users)
      .where(eq(users.area, 'envios'));

    const allTargetUsers = [...adminUsers, ...operacionesUsers, ...enviosUsers];

    for (const targetUser of allTargetUsers) {
      await this.createNotification({
        userId: targetUser.id,
        type: 'new_reposition',
        title: 'Nueva Solicitud de Reposición',
        message: `Se ha creado una nueva solicitud de ${data.type}: ${data.folio}`,
        repositionId: reposition.id,
      });
    }

    return reposition;
  }


  async getRepositionById(id: number): Promise<any | undefined> {
    const [reposition] = await db.select().from(repositions).where(eq(repositions.id, id));
    if (!reposition) return undefined;

    return {
      id: reposition.id,
      folio: reposition.folio,
      type: reposition.type,
      solicitanteNombre: reposition.solicitanteNombre,
      solicitanteArea: reposition.solicitanteArea,
      fechaSolicitud: reposition.fechaSolicitud,
      noSolicitud: reposition.noSolicitud,
      noHoja: reposition.noHoja,
      fechaCorte: reposition.fechaCorte,
      causanteDano: reposition.causanteDano,
      descripcionSuceso: reposition.descripcionSuceso,
      modeloPrenda: reposition.modeloPrenda,
      tela: reposition.tela,
      color: reposition.color,
      tipoPieza: reposition.tipoPieza,
      urgencia: reposition.urgencia,
      observaciones: reposition.observaciones,
      currentArea: reposition.currentArea,
      status: reposition.status,
      createdAt: reposition.createdAt,
      approvedAt: reposition.approvedAt,
      consumoTela: reposition.consumoTela,
      tipoAccidente: reposition.tipoAccidente,
      otroAccidente: reposition.otroAccidente,
      volverHacer: reposition.volverHacer,
      materialesImplicados: reposition.materialesImplicados
    };
  }
}

export const storage = new DatabaseStorage();