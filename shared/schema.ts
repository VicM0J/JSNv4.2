import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, varchar, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const areaEnum = pgEnum("area", ["patronaje", "corte", "bordado", "ensamble", "plancha", "calidad", "operaciones", "admin", "almacen", "diseño"]);
export const repositionTypeEnum = pgEnum("reposition_type", ["repocision", "reproceso"]);
export const urgencyEnum = pgEnum("urgency", ["urgente", "intermedio", "poco_urgente"]);
export const repositionStatusEnum = pgEnum("reposition_status", ["pendiente", "aprobado", "rechazado", "completado", "eliminado"]);
export const orderStatusEnum = pgEnum("order_status", ["active", "completed"]);
export const transferStatusEnum = pgEnum("transfer_status", ["pending", "accepted", "rejected"]);
export const notificationTypeEnum = pgEnum("notification_type", ["transfer_request", "transfer_accepted", "transfer_rejected", "order_completed"]);
export const materialStatusEnum = pgEnum("material_status", ["disponible", "falta_parcial", "no_disponible"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  area: areaEnum("area").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  folio: text("folio").notNull().unique(),
  clienteHotel: text("cliente_hotel").notNull(),
  noSolicitud: text("no_solicitud").notNull(),
  noHoja: text("no_hoja"),
  modelo: text("modelo").notNull(),
  tipoPrenda: text("tipo_prenda").notNull(),
  color: text("color").notNull(),
  tela: text("tela").notNull(),
  totalPiezas: integer("total_piezas").notNull(),
  currentArea: areaEnum("current_area").notNull().default("corte"),
  status: orderStatusEnum("status").notNull().default("active"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const orderPieces = pgTable("order_pieces", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  area: areaEnum("area").notNull(),
  pieces: integer("pieces").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  fromArea: areaEnum("from_area").notNull(),
  toArea: areaEnum("to_area").notNull(),
  pieces: integer("pieces").notNull(),
  status: transferStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  processedBy: integer("processed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  fromArea: areaEnum("from_area"),
  toArea: areaEnum("to_area"),
  pieces: integer("pieces"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  transferId: integer("transfer_id"),
  orderId: integer("order_id"),
  repositionId: integer("reposition_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositions = pgTable("repositions", {
  id: serial("id").primaryKey(),
  folio: text("folio").notNull().unique(),
  type: repositionTypeEnum("type").notNull(),

  solicitanteNombre: text("solicitante_nombre").notNull(),
  solicitanteArea: areaEnum("solicitante_area").notNull(),
  fechaSolicitud: timestamp("fecha_solicitud").defaultNow().notNull(),

  noSolicitud: text("no_solicitud").notNull(),
  noHoja: text("no_hoja"),
  fechaCorte: text("fecha_corte"),

  causanteDano: text("causante_dano").notNull(),
  tipoAccidente: text("tipo_accidente").notNull(),
  otroAccidente: text("otro_accidente"),
  descripcionSuceso: text("descripcion_suceso").notNull(),

  modeloPrenda: text("modelo_prenda").notNull(),
  tela: text("tela").notNull(),
  color: text("color").notNull(),
  tipoPieza: text("tipo_pieza").notNull(),
  consumoTela: real("consumo_tela"),

  urgencia: urgencyEnum("urgencia").notNull(),
  observaciones: text("observaciones"),
  volverHacer: text("volver_hacer"),
  materialesImplicados: text("materiales_implicados"),

  currentArea: areaEnum("current_area").notNull(),
  status: repositionStatusEnum("status").notNull().default("pendiente"),

  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
});

export const repositionPieces = pgTable("reposition_pieces", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  talla: text("talla").notNull(),
  cantidad: integer("cantidad").notNull(),
  folioOriginal: text("folio_original"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositionProducts = pgTable("reposition_products", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  modeloPrenda: text("modelo_prenda").notNull(),
  tela: text("tela").notNull(),
  color: text("color").notNull(),
  tipoPieza: text("tipo_pieza").notNull(),
  consumoTela: real("consumo_tela"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositionContrastFabrics = pgTable("reposition_contrast_fabrics", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  tela: text("tela").notNull(),
  color: text("color").notNull(),
  consumo: real("consumo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositionTimers = pgTable("reposition_timers", {
    id: serial("id").primaryKey(),
    repositionId: integer("reposition_id").notNull(),
    area: areaEnum("area").notNull(),
    userId: integer("user_id").notNull(),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    elapsedMinutes: real("elapsed_minutes"),
    isRunning: boolean("is_running").default(false),
    manualStartTime: varchar("manual_start_time", { length: 5 }), // HH:MM format
    manualEndTime: varchar("manual_end_time", { length: 5 }), // HH:MM format
    manualDate: varchar("manual_date", { length: 10 }), // YYYY-MM-DD format
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositionTransfers = pgTable("reposition_transfers", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  fromArea: areaEnum("from_area").notNull(),
  toArea: areaEnum("to_area").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  processedBy: integer("processed_by"),
  status: transferStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const repositionHistory = pgTable("reposition_history", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  fromArea: areaEnum("from_area"),
  toArea: areaEnum("to_area"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminPasswords = pgTable("admin_passwords", {
  id: serial("id").primaryKey(),
  password: text("password").notNull(),
  createdBy: integer("created_by").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositionMaterials = pgTable("reposition_materials", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  materialStatus: materialStatusEnum("material_status").notNull().default("disponible"),
  missingMaterials: text("missing_materials"),
  notes: text("notes"),
  isPaused: boolean("is_paused").notNull().default(false),
  pauseReason: text("pause_reason"),
  pausedBy: integer("paused_by"),
  pausedAt: timestamp("paused_at"),
  resumedBy: integer("resumed_by"),
  resumedAt: timestamp("resumed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  orderId: integer("order_id"),
  repositionId: integer("reposition_id"),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const ordersRelations = relations(orders, ({ one, many }) => ({
  creator: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  pieces: many(orderPieces),
  transfers: many(transfers),
  history: many(orderHistory),
}));

export const orderPiecesRelations = relations(orderPieces, ({ one }) => ({
  order: one(orders, {
    fields: [orderPieces.orderId],
    references: [orders.id],
  }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  order: one(orders, {
    fields: [transfers.orderId],
    references: [orders.id],
  }),
  creator: one(users, {
    fields: [transfers.createdBy],
    references: [users.id],
  }),
  processor: one(users, {
    fields: [transfers.processedBy],
    references: [users.id],
  }),
}));

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderHistory.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [orderHistory.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdOrders: many(orders),
  transfers: many(transfers),
  notifications: many(notifications),
  orderHistory: many(orderHistory),
  createdRepositions: many(repositions, { relationName: "creator" }),
  approvedRepositions: many(repositions, { relationName: "approver" }),
  repositionTransfers: many(repositionTransfers, { relationName: "transferCreator" }),
  repositionHistory: many(repositionHistory),
  adminPasswords: many(adminPasswords),
}));

export const repositionsRelations = relations(repositions, ({ one, many }) => ({
  creator: one(users, {
    fields: [repositions.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  approver: one(users, {
    fields: [repositions.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
  pieces: many(repositionPieces),
  transfers: many(repositionTransfers),
  history: many(repositionHistory),
}));

export const repositionPiecesRelations = relations(repositionPieces, ({ one }) => ({
  reposition: one(repositions, {
    fields: [repositionPieces.repositionId],
    references: [repositions.id],
  }),
}));

export const repositionTransfersRelations = relations(repositionTransfers, ({ one }) => ({
  reposition: one(repositions, {
    fields: [repositionTransfers.repositionId],
    references: [repositions.id],
  }),
  creator: one(users, {
    fields: [repositionTransfers.createdBy],
    references: [users.id],
    relationName: "transferCreator",
  }),
  processor: one(users, {
    fields: [repositionTransfers.processedBy],
    references: [users.id],
    relationName: "transferProcessor",
  }),
}));

export const repositionHistoryRelations = relations(repositionHistory, ({ one }) => ({
  reposition: one(repositions, {
    fields: [repositionHistory.repositionId],
    references: [repositions.id],
  }),
  user: one(users, {
    fields: [repositionHistory.userId],
    references: [users.id],
  }),
}));

export const adminPasswordsRelations = relations(adminPasswords, ({ one }) => ({
  creator: one(users, {
    fields: [adminPasswords.createdBy],
    references: [users.id],
  }),
}));

export const repositionMaterialsRelations = relations(repositionMaterials, ({ one }) => ({
  reposition: one(repositions, {
    fields: [repositionMaterials.repositionId],
    references: [repositions.id],
  }),
  pausedByUser: one(users, {
    fields: [repositionMaterials.pausedBy],
    references: [users.id],
  }),
  resumedByUser: one(users, {
    fields: [repositionMaterials.resumedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  transfer: one(transfers, {
    fields: [notifications.transferId],
    references: [transfers.id],
  }),
  order: one(orders, {
    fields: [notifications.orderId],
    references: [orders.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  area: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  completedAt: true,
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  status: true,
  createdBy: true,
  processedBy: true,
  createdAt: true,
  processedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  createdAt: true,
});

export const insertRepositionSchema = createInsertSchema(repositions).omit({
  id: true,
  folio: true,
  createdBy: true,
  approvedBy: true,
  createdAt: true,
  approvedAt: true,
  completedAt: true,
});

export const insertRepositionPieceSchema = createInsertSchema(repositionPieces).omit({
  id: true,
  createdAt: true,
});

export const insertRepositionTransferSchema = createInsertSchema(repositionTransfers).omit({
  id: true,
  status: true,
  createdBy: true,
  processedBy: true,
  createdAt: true,
  processedAt: true,
});

export const insertAdminPasswordSchema = createInsertSchema(adminPasswords).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderPieces = typeof orderPieces.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type OrderHistory = typeof orderHistory.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Reposition = typeof repositions.$inferSelect;
export type InsertReposition = z.infer<typeof insertRepositionSchema>;
export type RepositionPiece = typeof repositionPieces.$inferSelect;
export type InsertRepositionPiece = z.infer<typeof insertRepositionPieceSchema>;
export type InsertRepositionTransfer = z.infer<typeof insertRepositionTransferSchema>;
export type RepositionHistory = typeof repositionHistory.$inferSelect;
export type AdminPassword = typeof adminPasswords.$inferSelect;
export type InsertAdminPassword = z.infer<typeof insertAdminPasswordSchema>;
export type RepositionContrastFabric = InferSelectModel<typeof repositionContrastFabrics>;
export type InsertRepositionContrastFabric = InferInsertModel<typeof repositionContrastFabrics>;

export type RepositionTimer = InferSelectModel<typeof repositionTimers>;
export type InsertRepositionTimer = InferInsertModel<typeof repositionTimers>;

export type RepositionTransfer = InferSelectModel<typeof repositionTransfers>;

// Agenda Events - Sistema de Asignación de Tareas
export const agendaEvents = pgTable("agenda_events", {
  id: serial("id").primaryKey(),
  createdBy: integer("created_by").notNull().references(() => users.id), // Quién creó la tarea (Admin/Envíos)
  assignedToArea: areaEnum("assigned_to_area").notNull(), // Área a la que se asigna la tarea
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  time: varchar("time", { length: 5 }).notNull(), // HH:MM format
  priority: varchar("priority", { length: 10 }).notNull().default('media'), // alta, media, baja
  status: varchar("status", { length: 15 }).notNull().default('pendiente'), // pendiente, completado, cancelado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AgendaEvent = typeof agendaEvents.$inferSelect;
export type InsertAgendaEvent = typeof agendaEvents.$inferInsert;

export const insertAgendaEventSchema = createInsertSchema(agendaEvents);
export type InsertAgendaEventSchema = z.infer<typeof insertAgendaEventSchema>;

export const areas = ['corte', 'bordado', 'ensamble', 'plancha', 'calidad', 'envios', 'almacen', 'admin', 'diseño'] as const;
export type Area = "patronaje" | "corte" | "bordado" | "ensamble" | "plancha" | "calidad" | "operaciones" | "admin" | "almacen" | "diseño";
export type MaterialStatus = "disponible" | "falta_parcial" | "no_disponible";
export type RepositionMaterial = InferSelectModel<typeof repositionMaterials>;
export type InsertRepositionMaterial = InferInsertModel<typeof repositionMaterials>;
export type RepositionType = "repocision" | "reproceso";
export type Urgency = "urgente" | "intermedio" | "poco_urgente";
export type RepositionStatus = "pendiente" | "aprobado" | "rechazado" | "completado" | "eliminado";