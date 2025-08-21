import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: ["passenger", "driver", "admin"] }).notNull().default("passenger"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const drivers = sqliteTable("drivers", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  licensePlate: text("license_plate").notNull(),
  vehicleModel: text("vehicle_model"),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false),
  rating: real("rating").default(5.0),
  totalRides: integer("total_rides").default(0),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  driverId: text("driver_id").notNull().references(() => drivers.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["trial", "active", "expired", "cancelled"] }).notNull().default("trial"),
  trialEndsAt: integer("trial_ends_at", { mode: "timestamp" }),
  currentPeriodStart: integer("current_period_start", { mode: "timestamp" }),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  monthlyFee: integer("monthly_fee").default(1500), // CVE
});

export const rides = sqliteTable("rides", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  passengerId: text("passenger_id").notNull().references(() => users.id),
  driverId: text("driver_id").references(() => drivers.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  passengerPhone: text("passenger_phone").notNull(),
  notes: text("notes"),
  estimatedPrice: integer("estimated_price").notNull(), // CVE cents
  finalPrice: integer("final_price"), // CVE cents
  status: text("status", { 
    enum: ["pending", "accepted", "started", "completed", "cancelled"] 
  }).notNull().default("pending"),
  requestedAt: integer("requested_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  distance: real("distance"), // km
});

export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  passengerId: text("passenger_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  driverId: text("driver_id").notNull().references(() => drivers.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details"), // JSON
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});

export const insertDriverSchema = createInsertSchema(drivers).omit({ 
  id: true,
  rating: true,
  totalRides: true 
});

export const insertRideSchema = createInsertSchema(rides).omit({ 
  id: true,
  requestedAt: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true 
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ 
  id: true 
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({ 
  id: true,
  createdAt: true 
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
  licensePlate: z.string().optional(),
  vehicleModel: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Ride = typeof rides.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertRide = z.infer<typeof insertRideSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export interface RideWithDetails extends Ride {
  passenger?: User;
  driver?: Driver & { user?: User };
}

export interface UserWithDriver extends User {
  driver?: Driver;
  subscription?: Subscription;
}
