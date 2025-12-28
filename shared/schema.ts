import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, time, date, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "gst", "non_gst", "account", "custom"]);
export const projectTypeEnum = pgEnum("project_type", ["movie", "serial", "web_series", "ad", "teaser", "trilogy"]);
export const roomTypeEnum = pgEnum("room_type", ["sound", "music", "vfx", "client_office", "editing", "dubbing", "mixing"]);
export const editorTypeEnum = pgEnum("editor_type", ["video", "audio", "vfx", "colorist", "di"]);
export const bookingStatusEnum = pgEnum("booking_status", ["planning", "tentative", "confirmed", "cancelled"]);

// Companies
export const companies = pgTable("companies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  address: text("address"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  securityPin: text("security_pin").notNull(),
  role: userRoleEnum("role").notNull().default("non_gst"),
  companyId: integer("company_id").references(() => companies.id),
  fullName: text("full_name"),
  email: text("email"),
  mobile: text("mobile"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customers
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  address: text("address"),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Designations Master
export const designations = pgTable("designations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customer Contacts (multiple per customer)
export const customerContacts = pgTable("customer_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  designation: text("designation"),
  isPrimary: boolean("is_primary").notNull().default(false),
});

// Projects
export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  projectType: projectTypeEnum("project_type").notNull(),
  description: text("description"),
  hasChalanCreated: boolean("has_chalan_created").notNull().default(false),
  hasInvoiceCreated: boolean("has_invoice_created").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rooms
export const rooms = pgTable("rooms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  roomType: roomTypeEnum("room_type").notNull(),
  capacity: integer("capacity").default(1),
  ignoreConflict: boolean("ignore_conflict").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Editors
export const editors = pgTable("editors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  editorType: editorTypeEnum("editor_type").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  joinDate: date("join_date"),
  leaveDate: date("leave_date"),
  isActive: boolean("is_active").notNull().default(true),
  ignoreConflict: boolean("ignore_conflict").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  contactId: integer("contact_id").references(() => customerContacts.id),
  editorId: integer("editor_id").references(() => editors.id),
  bookingDate: date("booking_date").notNull(),
  fromTime: time("from_time").notNull(),
  toTime: time("to_time").notNull(),
  actualFromTime: time("actual_from_time"),
  actualToTime: time("actual_to_time"),
  breakHours: numeric("break_hours").default("0"),
  totalHours: numeric("total_hours"),
  status: bookingStatusEnum("status").notNull().default("planning"),
  cancelReason: text("cancel_reason"),
  cancelledAt: timestamp("cancelled_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Booking Logs (audit trail)
export const bookingLogs = pgTable("booking_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  changes: text("changes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Editor Leaves
export const editorLeaves = pgTable("editor_leaves", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  editorId: integer("editor_id").references(() => editors.id).notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chalans
export const chalans = pgTable("chalans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  chalanNumber: text("chalan_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  chalanDate: date("chalan_date").notNull(),
  totalAmount: text("total_amount").default("0"),
  isCancelled: boolean("is_cancelled").notNull().default(false),
  cancelReason: text("cancel_reason"),
  isRevised: boolean("is_revised").notNull().default(false),
  originalChalanId: integer("original_chalan_id"),
  editorId: integer("editor_id").references(() => editors.id),
  roomId: integer("room_id").references(() => rooms.id),
  fromTime: time("from_time"),
  toTime: time("to_time"),
  actualFromTime: time("actual_from_time"),
  actualToTime: time("actual_to_time"),
  breakHours: numeric("break_hours").default("0"),
  totalHours: numeric("total_hours").default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chalan Items
export const chalanItems = pgTable("chalan_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  chalanId: integer("chalan_id").references(() => chalans.id).notNull(),
  description: text("description").notNull(),
  quantity: text("quantity").default("1"),
  rate: text("rate").default("0"),
  amount: text("amount").default("0"),
});

// Chalan Revisions
export const chalanRevisions = pgTable("chalan_revisions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  chalanId: integer("chalan_id").references(() => chalans.id).notNull(),
  revisionNumber: integer("revision_number").notNull(),
  changes: text("changes"),
  revisedBy: integer("revised_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Module Access
export const userModuleAccess = pgTable("user_module_access", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  module: text("module").notNull(),
  section: text("section"),
  canView: boolean("can_view").notNull().default(false),
  canCreate: boolean("can_create").notNull().default(false),
  canEdit: boolean("can_edit").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  bookingLogs: many(bookingLogs),
  chalanRevisions: many(chalanRevisions),
  moduleAccess: many(userModuleAccess),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  contacts: many(customerContacts),
  projects: many(projects),
  bookings: many(bookings),
  chalans: many(chalans),
}));

export const customerContactsRelations = relations(customerContacts, ({ one }) => ({
  customer: one(customers, {
    fields: [customerContacts.customerId],
    references: [customers.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  bookings: many(bookings),
  chalans: many(chalans),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  bookings: many(bookings),
}));

export const editorsRelations = relations(editors, ({ many }) => ({
  bookings: many(bookings),
  leaves: many(editorLeaves),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  room: one(rooms, {
    fields: [bookings.roomId],
    references: [rooms.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  project: one(projects, {
    fields: [bookings.projectId],
    references: [projects.id],
  }),
  contact: one(customerContacts, {
    fields: [bookings.contactId],
    references: [customerContacts.id],
  }),
  editor: one(editors, {
    fields: [bookings.editorId],
    references: [editors.id],
  }),
  logs: many(bookingLogs),
}));

export const bookingLogsRelations = relations(bookingLogs, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingLogs.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [bookingLogs.userId],
    references: [users.id],
  }),
}));

export const editorLeavesRelations = relations(editorLeaves, ({ one }) => ({
  editor: one(editors, {
    fields: [editorLeaves.editorId],
    references: [editors.id],
  }),
}));

export const chalansRelations = relations(chalans, ({ one, many }) => ({
  customer: one(customers, {
    fields: [chalans.customerId],
    references: [customers.id],
  }),
  project: one(projects, {
    fields: [chalans.projectId],
    references: [projects.id],
  }),
  editor: one(editors, {
    fields: [chalans.editorId],
    references: [editors.id],
  }),
  room: one(rooms, {
    fields: [chalans.roomId],
    references: [rooms.id],
  }),
  booking: one(bookings, {
    fields: [chalans.bookingId],
    references: [bookings.id],
  }),
  items: many(chalanItems),
  revisions: many(chalanRevisions),
}));

export const chalanItemsRelations = relations(chalanItems, ({ one }) => ({
  chalan: one(chalans, {
    fields: [chalanItems.chalanId],
    references: [chalans.id],
  }),
}));

export const chalanRevisionsRelations = relations(chalanRevisions, ({ one }) => ({
  chalan: one(chalans, {
    fields: [chalanRevisions.chalanId],
    references: [chalans.id],
  }),
  revisedBy: one(users, {
    fields: [chalanRevisions.revisedBy],
    references: [users.id],
  }),
}));

export const userModuleAccessRelations = relations(userModuleAccess, ({ one }) => ({
  user: one(users, {
    fields: [userModuleAccess.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDesignationSchema = createInsertSchema(designations).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true }).extend({
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
});
export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({ id: true }).extend({
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
});
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true, createdAt: true });
export const insertEditorSchema = createInsertSchema(editors).omit({ id: true, createdAt: true }).extend({
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
});
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBookingLogSchema = createInsertSchema(bookingLogs).omit({ id: true, createdAt: true });
export const insertEditorLeaveSchema = createInsertSchema(editorLeaves).omit({ id: true, createdAt: true });
export const insertChalanSchema = createInsertSchema(chalans).omit({ id: true, createdAt: true, chalanNumber: true });
export const insertChalanItemSchema = createInsertSchema(chalanItems).omit({ id: true, chalanId: true });
export const insertChalanRevisionSchema = createInsertSchema(chalanRevisions).omit({ id: true, createdAt: true, revisionNumber: true, chalanId: true });
export const insertUserModuleAccessSchema = createInsertSchema(userModuleAccess).omit({ id: true });

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Designation = typeof designations.$inferSelect;
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Editor = typeof editors.$inferSelect;
export type InsertEditor = z.infer<typeof insertEditorSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BookingLog = typeof bookingLogs.$inferSelect;
export type InsertBookingLog = z.infer<typeof insertBookingLogSchema>;
export type EditorLeave = typeof editorLeaves.$inferSelect;
export type InsertEditorLeave = z.infer<typeof insertEditorLeaveSchema>;
export type Chalan = typeof chalans.$inferSelect;
export type InsertChalan = z.infer<typeof insertChalanSchema>;
export type ChalanItem = typeof chalanItems.$inferSelect;
export type InsertChalanItem = z.infer<typeof insertChalanItemSchema>;
export type ChalanRevision = typeof chalanRevisions.$inferSelect;
export type InsertChalanRevision = z.infer<typeof insertChalanRevisionSchema>;
export type UserModuleAccess = typeof userModuleAccess.$inferSelect;
export type InsertUserModuleAccess = z.infer<typeof insertUserModuleAccessSchema>;

// Extended types with relations
export type BookingWithRelations = Booking & {
  room?: Room;
  customer?: Customer;
  project?: Project;
  contact?: CustomerContact;
  editor?: Editor;
  logs?: BookingLog[];
};

export type CustomerWithContacts = Customer & {
  contacts?: CustomerContact[];
};

export type ChalanWithItems = Chalan & {
  items?: ChalanItem[];
  customer?: Customer;
  project?: Project;
  revisions?: ChalanRevision[];
  editor?: Editor;
  room?: Room;
  booking?: BookingWithRelations;
  originalChalan?: Chalan;
};

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  securityPin: z.string().min(4, "Security PIN must be at least 4 characters"),
  companyId: z.number({ required_error: "Please select a company to continue" }).min(1, "Please select a company to continue"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Create company with admin schema
export const createCompanyWithAdminSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  adminUsername: z.string().min(1, "Admin username is required"),
  adminSecurityPin: z.string().min(4, "Security PIN must be at least 4 characters"),
});

export type CreateCompanyWithAdmin = z.infer<typeof createCompanyWithAdminSchema>;
