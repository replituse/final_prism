import { db } from "./db";
import { eq, and, gte, lte, sql, desc, or, inArray, asc } from "drizzle-orm";
import {
  companies,
  users,
  customers,
  customerContacts,
  projects,
  rooms,
  editors,
  bookings,
  bookingLogs,
  editorLeaves,
  chalans,
  chalanItems,
  chalanRevisions,
  userModuleAccess,
  designations,
  type Company,
  type InsertCompany,
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type CustomerContact,
  type InsertCustomerContact,
  type Project,
  type InsertProject,
  type Room,
  type InsertRoom,
  type Editor,
  type InsertEditor,
  type Booking,
  type InsertBooking,
  type BookingLog,
  type InsertBookingLog,
  type EditorLeave,
  type InsertEditorLeave,
  type Chalan,
  type InsertChalan,
  type ChalanItem,
  type InsertChalanItem,
  type ChalanRevision,
  type InsertChalanRevision,
  type UserModuleAccess,
  type InsertUserModuleAccess,
  type Designation,
} from "@shared/schema";

export interface IStorage {
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;

  // Users
  getUsers(): Promise<(User & { company?: Company })[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameAndCompany(username: string, companyId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUserAccess(userId: number): Promise<UserModuleAccess[]>;
  setUserAccess(userId: number, access: InsertUserModuleAccess[]): Promise<void>;

  // Customers
  getCustomers(): Promise<(Customer & { contacts?: CustomerContact[] })[]>;
  getCustomer(id: number): Promise<(Customer & { contacts?: CustomerContact[] }) | undefined>;
  createCustomer(customer: InsertCustomer, contacts?: InsertCustomerContact[]): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>, contacts?: (InsertCustomerContact & { id?: number })[]): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getCustomerContacts(customerId: number): Promise<CustomerContact[]>;

  // Projects
  getProjects(customerId?: number): Promise<(Project & { customer?: Customer })[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Rooms
  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;

  // Editors
  getEditors(): Promise<Editor[]>;
  getEditor(id: number): Promise<Editor | undefined>;
  createEditor(editor: InsertEditor): Promise<Editor>;
  updateEditor(id: number, editor: Partial<InsertEditor>): Promise<Editor | undefined>;
  deleteEditor(id: number): Promise<boolean>;

  // Bookings
  getBookings(filters?: { from?: string; to?: string; roomId?: number; customerId?: number; editorId?: number; status?: string }): Promise<any[]>;
  getBooking(id: number): Promise<any | undefined>;
  createBooking(booking: InsertBooking, userId?: number): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>, userId?: number): Promise<Booking | undefined>;
  cancelBooking(id: number, reason: string, userId?: number): Promise<Booking | undefined>;
  getBookingLogs(bookingId: number): Promise<BookingLog[]>;
  checkBookingConflicts(booking: { roomId: number; editorId?: number; bookingDate: string; fromTime: string; toTime: string; excludeBookingId?: number }): Promise<{ hasConflict: boolean; conflicts: any[]; editorOnLeave: boolean; leaveInfo?: any }>;
  calculateBillingHours(fromTime: string, toTime: string, actualFromTime?: string, actualToTime?: string, breakHours?: number): number;

  // Editor Leaves
  getEditorLeaves(editorId?: number): Promise<(EditorLeave & { editor?: Editor })[]>;
  getEditorLeave(id: number): Promise<EditorLeave | undefined>;
  createEditorLeave(leave: InsertEditorLeave): Promise<EditorLeave>;
  updateEditorLeave(id: number, leave: Partial<InsertEditorLeave>): Promise<EditorLeave | undefined>;
  deleteEditorLeave(id: number): Promise<boolean>;

  // Chalans
  getChalans(filters?: { from?: string; to?: string; customerId?: number }): Promise<any[]>;
  getChalan(id: number): Promise<any | undefined>;
  createChalan(chalan: InsertChalan, items: InsertChalanItem[]): Promise<Chalan>;
  cancelChalan(id: number, reason: string): Promise<Chalan | undefined>;
  updateChalanStatus(id: number, isCancelled: boolean): Promise<Chalan | undefined>;
  getChalanRevisions(chalanId: number): Promise<ChalanRevision[]>;
  createChalanRevision(chalanId: number, changes: string, userId?: number): Promise<ChalanRevision>;

  // Reports
  getConflicts(from: string, to: string, roomId?: number, editorId?: number): Promise<any[]>;
  getEditorReport(from: string, to: string, editorId?: number): Promise<any[]>;

  // Designations
  getDesignations(): Promise<Designation[]>;
  getDesignationByName(name: string): Promise<Designation | undefined>;
  createDesignation(name: string): Promise<Designation>;

  // Get Chalan by Booking
  getChalanByBookingId(bookingId: number): Promise<Chalan | undefined>;
  
  // Update Chalan
  updateChalan(id: number, chalan: Partial<InsertChalan>, items?: (InsertChalanItem & { id?: number })[]): Promise<Chalan | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Companies
  async getCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(asc(companies.name));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set(company).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: number): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id));
    return true;
  }

  // Users
  async getUsers(): Promise<(User & { company?: Company })[]> {
    const result = await db
      .select()
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .orderBy(asc(users.username));
    
    return result.map(r => ({
      ...r.users,
      company: r.companies || undefined,
    }));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByUsernameAndCompany(username: string, companyId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.username, username), eq(users.companyId, companyId))
    );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getUserAccess(userId: number): Promise<UserModuleAccess[]> {
    return db.select().from(userModuleAccess).where(eq(userModuleAccess.userId, userId)).orderBy(asc(userModuleAccess.module));
  }

  async setUserAccess(userId: number, access: InsertUserModuleAccess[]): Promise<void> {
    await db.delete(userModuleAccess).where(eq(userModuleAccess.userId, userId));
    if (access.length > 0) {
      await db.insert(userModuleAccess).values(access.map(a => ({ ...a, userId })));
    }
  }

  // Customers
  async getCustomers(): Promise<(Customer & { contacts?: CustomerContact[] })[]> {
    const customersList = await db.select().from(customers).orderBy(asc(customers.name));
    const contactsList = await db.select().from(customerContacts).orderBy(asc(customerContacts.name));
    
    return customersList.map(c => ({
      ...c,
      contacts: contactsList.filter(contact => contact.customerId === c.id),
    }));
  }

  async getCustomer(id: number): Promise<(Customer & { contacts?: CustomerContact[] }) | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) return undefined;
    
    const contacts = await db.select().from(customerContacts).where(eq(customerContacts.customerId, id)).orderBy(asc(customerContacts.name));
    return { ...customer, contacts };
  }

  async createCustomer(customer: InsertCustomer, contacts?: InsertCustomerContact[]): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    
    if (contacts && contacts.length > 0) {
      await db.insert(customerContacts).values(
        contacts.map(c => ({ ...c, customerId: created.id }))
      );
    }
    
    return created;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>, contacts?: (InsertCustomerContact & { id?: number })[]): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    
    if (contacts !== undefined) {
      const existingContacts = await db.select().from(customerContacts).where(eq(customerContacts.customerId, id));
      const existingContactIds = existingContacts.map(c => c.id);
      
      const contactsWithId = contacts.filter(c => c.id !== undefined) as (InsertCustomerContact & { id: number })[];
      const contactsWithoutId = contacts.filter(c => c.id === undefined);
      const incomingIds = contactsWithId.map(c => c.id);
      
      for (const contact of contactsWithId) {
        const { id: contactId, ...contactData } = contact;
        await db.update(customerContacts).set({ ...contactData, customerId: id }).where(eq(customerContacts.id, contactId));
      }
      
      if (contactsWithoutId.length > 0) {
        await db.insert(customerContacts).values(
          contactsWithoutId.map(c => ({ ...c, customerId: id }))
        );
      }
      
      const idsToRemove = existingContactIds.filter(existingId => !incomingIds.includes(existingId));
      for (const contactId of idsToRemove) {
        const [referencedBooking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.contactId, contactId)).limit(1);
        if (!referencedBooking) {
          await db.delete(customerContacts).where(eq(customerContacts.id, contactId));
        }
      }
    }
    
    return updated;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const [referencedBooking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.customerId, id)).limit(1);
    if (referencedBooking) {
      throw new Error("Cannot delete customer: it is referenced by bookings");
    }
    const [referencedChalan] = await db.select({ id: chalans.id }).from(chalans).where(eq(chalans.customerId, id)).limit(1);
    if (referencedChalan) {
      throw new Error("Cannot delete customer: it is referenced by chalans");
    }
    const [referencedProject] = await db.select({ id: projects.id }).from(projects).where(eq(projects.customerId, id)).limit(1);
    if (referencedProject) {
      throw new Error("Cannot delete customer: it has associated projects");
    }
    await db.delete(customerContacts).where(eq(customerContacts.customerId, id));
    await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  async getCustomerContacts(customerId: number): Promise<CustomerContact[]> {
    return db.select().from(customerContacts).where(eq(customerContacts.customerId, customerId)).orderBy(asc(customerContacts.name));
  }

  // Projects
  async getProjects(customerId?: number): Promise<(Project & { customer?: Customer })[]> {
    const query = customerId
      ? db.select().from(projects).leftJoin(customers, eq(projects.customerId, customers.id)).where(eq(projects.customerId, customerId)).orderBy(asc(projects.name))
      : db.select().from(projects).leftJoin(customers, eq(projects.customerId, customers.id)).orderBy(asc(projects.name));
    
    const result = await query;
    return result.map(r => ({
      ...r.projects,
      customer: r.customers || undefined,
    }));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    // Check for duplicate project name for the same customer
    const existingProjects = await db.select()
      .from(projects)
      .where(and(
        eq(projects.customerId, project.customerId),
        eq(projects.name, project.name),
        eq(projects.isActive, true)
      ));
    
    if (existingProjects.length > 0) {
      throw new Error(`A project with the name "${project.name}" already exists for this customer`);
    }
    
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    // Check for conflicts if name, customerId, or isActive is being updated
    // This includes reactivation scenario where isActive goes from false to true
    const needsConflictCheck = project.name !== undefined || project.customerId !== undefined || project.isActive === true;
    
    if (needsConflictCheck) {
      const existing = await this.getProject(id);
      if (existing) {
        const nameToCheck = project.name ?? existing.name;
        const customerIdToCheck = project.customerId ?? existing.customerId;
        const willBeActive = project.isActive ?? existing.isActive;
        
        // Only check for conflicts if the project will be active after the update
        if (willBeActive) {
          const duplicates = await db.select()
            .from(projects)
            .where(and(
              eq(projects.customerId, customerIdToCheck),
              eq(projects.name, nameToCheck),
              eq(projects.isActive, true)
            ));
          
          // Filter out the current project from duplicates
          const conflicting = duplicates.filter(p => p.id !== id);
          if (conflicting.length > 0) {
            throw new Error(`A project with the name "${nameToCheck}" already exists for this customer`);
          }
        }
      }
    }
    
    const [updated] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: number): Promise<boolean> {
    const [referencedBooking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.projectId, id)).limit(1);
    if (referencedBooking) {
      throw new Error("Cannot delete project: it is referenced by bookings");
    }
    const [referencedChalan] = await db.select({ id: chalans.id }).from(chalans).where(eq(chalans.projectId, id)).limit(1);
    if (referencedChalan) {
      throw new Error("Cannot delete project: it is referenced by chalans");
    }
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Rooms
  async getRooms(): Promise<Room[]> {
    return db.select().from(rooms).orderBy(asc(rooms.name));
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined> {
    const [updated] = await db.update(rooms).set(room).where(eq(rooms.id, id)).returning();
    return updated;
  }

  async deleteRoom(id: number): Promise<boolean> {
    const [referencedBooking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.roomId, id)).limit(1);
    if (referencedBooking) {
      throw new Error("Cannot delete room: it is referenced by bookings");
    }
    await db.delete(rooms).where(eq(rooms.id, id));
    return true;
  }

  // Editors
  async getEditors(): Promise<Editor[]> {
    return db.select().from(editors).orderBy(asc(editors.name));
  }

  async getEditor(id: number): Promise<Editor | undefined> {
    const [editor] = await db.select().from(editors).where(eq(editors.id, id));
    return editor;
  }

  async createEditor(editor: InsertEditor): Promise<Editor> {
    const [created] = await db.insert(editors).values(editor).returning();
    return created;
  }

  async updateEditor(id: number, editor: Partial<InsertEditor>): Promise<Editor | undefined> {
    const [updated] = await db.update(editors).set(editor).where(eq(editors.id, id)).returning();
    return updated;
  }

  async deleteEditor(id: number): Promise<boolean> {
    const [referencedBooking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.editorId, id)).limit(1);
    if (referencedBooking) {
      throw new Error("Cannot delete editor: it is referenced by bookings");
    }
    const [referencedLeave] = await db.select({ id: editorLeaves.id }).from(editorLeaves).where(eq(editorLeaves.editorId, id)).limit(1);
    if (referencedLeave) {
      throw new Error("Cannot delete editor: it has leave records");
    }
    await db.delete(editors).where(eq(editors.id, id));
    return true;
  }

  // Bookings
  async getBookings(filters?: { from?: string; to?: string; roomId?: number; customerId?: number; editorId?: number; status?: string }): Promise<any[]> {
    let query = db
      .select()
      .from(bookings)
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(projects, eq(bookings.projectId, projects.id))
      .leftJoin(editors, eq(bookings.editorId, editors.id))
      .leftJoin(customerContacts, eq(bookings.contactId, customerContacts.id));

    const conditions = [];
    if (filters?.from) {
      conditions.push(gte(bookings.bookingDate, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(bookings.bookingDate, filters.to));
    }
    if (filters?.roomId) {
      conditions.push(eq(bookings.roomId, filters.roomId));
    }
    if (filters?.customerId) {
      conditions.push(eq(bookings.customerId, filters.customerId));
    }
    if (filters?.editorId) {
      conditions.push(eq(bookings.editorId, filters.editorId));
    }
    if (filters?.status) {
      conditions.push(eq(bookings.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(asc(bookings.bookingDate), asc(bookings.fromTime));
    return result.map(r => ({
      ...r.bookings,
      room: r.rooms || undefined,
      customer: r.customers || undefined,
      project: r.projects || undefined,
      editor: r.editors || undefined,
      contact: r.customer_contacts || undefined,
    }));
  }

  async getBooking(id: number): Promise<any | undefined> {
    const [result] = await db
      .select()
      .from(bookings)
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(projects, eq(bookings.projectId, projects.id))
      .leftJoin(editors, eq(bookings.editorId, editors.id))
      .where(eq(bookings.id, id));

    if (!result) return undefined;

    return {
      ...result.bookings,
      room: result.rooms || undefined,
      customer: result.customers || undefined,
      project: result.projects || undefined,
      editor: result.editors || undefined,
    };
  }

  async createBooking(booking: InsertBooking, userId?: number): Promise<Booking> {
    // Calculate billing hours before creating
    const totalHours = this.calculateBillingHours(
      booking.fromTime,
      booking.toTime,
      booking.actualFromTime || undefined,
      booking.actualToTime || undefined,
      booking.breakHours || 0
    );
    
    const [created] = await db.insert(bookings).values({
      ...booking,
      totalHours,
    }).returning();
    
    await db.insert(bookingLogs).values({
      bookingId: created.id,
      userId: userId || null,
      action: "Created",
      changes: `Booking created for ${booking.bookingDate}`,
    });
    
    return created;
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>, userId?: number): Promise<Booking | undefined> {
    // First, fetch existing booking to check status and get current values
    const existingRows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    
    // Handle missing booking early
    if (existingRows.length === 0) {
      return undefined;
    }
    
    const existing = existingRows[0];
    
    // Check if booking is cancelled
    if (existing.status === "cancelled") {
      throw new Error("Cannot update a cancelled booking");
    }
    
    // Calculate billing hours if any time-related fields are being updated
    let totalHours: number | undefined;
    if (booking.fromTime || booking.toTime || booking.actualFromTime !== undefined || booking.actualToTime !== undefined || booking.breakHours !== undefined) {
      // Always use persisted times as base, only override with new values
      const fromTime = booking.fromTime || existing.fromTime;
      const toTime = booking.toTime || existing.toTime;
      const actualFromTime = booking.actualFromTime !== undefined ? booking.actualFromTime : existing.actualFromTime;
      const actualToTime = booking.actualToTime !== undefined ? booking.actualToTime : existing.actualToTime;
      const breakHours = booking.breakHours !== undefined ? booking.breakHours : (existing.breakHours || 0);
      
      totalHours = this.calculateBillingHours(
        fromTime,
        toTime,
        actualFromTime || undefined,
        actualToTime || undefined,
        breakHours
      );
    }
    
    const [updated] = await db
      .update(bookings)
      .set({ ...booking, ...(totalHours !== undefined ? { totalHours } : {}), updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    
    if (updated) {
      await db.insert(bookingLogs).values({
        bookingId: id,
        userId: userId || null,
        action: "Updated",
        changes: `Booking updated`,
      });
    }
    
    return updated;
  }

  async cancelBooking(id: number, reason: string, userId?: number): Promise<Booking | undefined> {
    const [existing] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    
    if (!existing) {
      return undefined;
    }
    
    if (existing.status === "cancelled") {
      throw new Error("Booking is already cancelled");
    }
    
    const todayString = new Date().toISOString().split('T')[0];
    
    if (existing.bookingDate < todayString) {
      throw new Error("Cannot cancel past bookings. Only current date and future bookings can be cancelled.");
    }
    
    const [updated] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();
    
    if (updated) {
      await db.insert(bookingLogs).values({
        bookingId: id,
        userId: userId || null,
        action: "Cancelled",
        changes: `Reason: ${reason}`,
      });
    }
    
    return updated;
  }

  async getBookingLogs(bookingId: number): Promise<BookingLog[]> {
    return db
      .select()
      .from(bookingLogs)
      .where(eq(bookingLogs.bookingId, bookingId))
      .orderBy(asc(bookingLogs.createdAt));
  }

  async checkBookingConflicts(booking: { roomId: number; editorId?: number; bookingDate: string; fromTime: string; toTime: string; excludeBookingId?: number }): Promise<{ hasConflict: boolean; conflicts: any[]; editorOnLeave: boolean; leaveInfo?: any }> {
    const conflicts: any[] = [];
    let editorOnLeave = false;
    let leaveInfo = undefined;

    // Get the room to check if it ignores conflicts
    const room = await this.getRoom(booking.roomId);
    const roomIgnoresConflict = room?.ignoreConflict ?? false;

    // Get editor if provided
    let editorIgnoresConflict = false;
    if (booking.editorId) {
      const editor = await this.getEditor(booking.editorId);
      editorIgnoresConflict = editor?.ignoreConflict ?? false;

      // Check if editor is on leave
      const leaves = await db.select().from(editorLeaves).where(eq(editorLeaves.editorId, booking.editorId));
      for (const leave of leaves) {
        if (booking.bookingDate >= leave.fromDate && booking.bookingDate <= leave.toDate) {
          editorOnLeave = true;
          leaveInfo = leave;
          break;
        }
      }
    }

    // Get all bookings for the same date
    const existingBookings = await this.getBookings({ from: booking.bookingDate, to: booking.bookingDate });
    const activeBookings = existingBookings.filter(b => 
      b.status !== "cancelled" && 
      (booking.excludeBookingId ? b.id !== booking.excludeBookingId : true)
    );

    // Check for conflicts
    for (const existing of activeBookings) {
      // Check time overlap
      const overlaps = booking.fromTime < existing.toTime && existing.fromTime < booking.toTime;
      if (!overlaps) continue;

      // Check room conflict
      const hasRoomConflict = existing.roomId === booking.roomId;
      if (hasRoomConflict && !roomIgnoresConflict && !existing.room?.ignoreConflict) {
        conflicts.push({ type: 'room', booking: existing, message: `Room "${existing.room?.name}" is already booked` });
      }

      // Check editor conflict
      if (booking.editorId && existing.editorId === booking.editorId) {
        if (!editorIgnoresConflict && !existing.editor?.ignoreConflict) {
          conflicts.push({ type: 'editor', booking: existing, message: `Editor "${existing.editor?.name}" is already assigned` });
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      editorOnLeave,
      leaveInfo,
    };
  }

  calculateBillingHours(fromTime: string, toTime: string, actualFromTime?: string, actualToTime?: string, breakHours?: number): number {
    // Parse times
    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Use actual times if available, otherwise use scheduled times
    const startTime = actualFromTime || fromTime;
    const endTime = actualToTime || toTime;

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    // Calculate total minutes
    let totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight bookings

    // Subtract break hours (convert to minutes)
    const breakMinutes = (breakHours || 0) * 60;
    totalMinutes -= breakMinutes;

    // Convert to hours (rounded to nearest 0.5)
    const hours = Math.max(0, Math.round(totalMinutes / 30) * 0.5);
    return hours;
  }

  // Editor Leaves
  async getEditorLeaves(editorId?: number): Promise<(EditorLeave & { editor?: Editor })[]> {
    let query = db
      .select()
      .from(editorLeaves)
      .leftJoin(editors, eq(editorLeaves.editorId, editors.id));

    if (editorId) {
      query = query.where(eq(editorLeaves.editorId, editorId)) as any;
    }

    const result = await query.orderBy(asc(editorLeaves.fromDate));
    return result.map(r => ({
      ...r.editor_leaves,
      editor: r.editors || undefined,
    }));
  }

  async getEditorLeave(id: number): Promise<EditorLeave | undefined> {
    const [leave] = await db.select().from(editorLeaves).where(eq(editorLeaves.id, id));
    return leave;
  }

  async createEditorLeave(leave: InsertEditorLeave): Promise<EditorLeave> {
    const [created] = await db.insert(editorLeaves).values(leave).returning();
    return created;
  }

  async updateEditorLeave(id: number, leave: Partial<InsertEditorLeave>): Promise<EditorLeave | undefined> {
    const [updated] = await db.update(editorLeaves).set(leave).where(eq(editorLeaves.id, id)).returning();
    return updated;
  }

  async deleteEditorLeave(id: number): Promise<boolean> {
    await db.delete(editorLeaves).where(eq(editorLeaves.id, id));
    return true;
  }

  // Chalans
  async getChalans(filters?: { from?: string; to?: string; customerId?: number }): Promise<any[]> {
    let query = db
      .select()
      .from(chalans)
      .leftJoin(customers, eq(chalans.customerId, customers.id))
      .leftJoin(projects, eq(chalans.projectId, projects.id));

    const conditions = [];
    if (filters?.from) {
      conditions.push(gte(chalans.chalanDate, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(chalans.chalanDate, filters.to));
    }
    if (filters?.customerId) {
      conditions.push(eq(chalans.customerId, filters.customerId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(asc(chalans.chalanDate), asc(chalans.chalanNumber));
    
    const chalanIds = result.map(r => r.chalans.id);
    const items = chalanIds.length > 0
      ? await db.select().from(chalanItems).where(inArray(chalanItems.chalanId, chalanIds)).orderBy(asc(chalanItems.chalanId), asc(chalanItems.id))
      : [];
    const revisions = chalanIds.length > 0
      ? await db.select().from(chalanRevisions).where(inArray(chalanRevisions.chalanId, chalanIds)).orderBy(asc(chalanRevisions.chalanId), asc(chalanRevisions.revisionNumber))
      : [];

    return result.map(r => ({
      ...r.chalans,
      customer: r.customers || undefined,
      project: r.projects || undefined,
      items: items.filter(i => i.chalanId === r.chalans.id),
      revisions: revisions.filter(rev => rev.chalanId === r.chalans.id),
    }));
  }

  async getChalan(id: number): Promise<any | undefined> {
    const [result] = await db
      .select()
      .from(chalans)
      .leftJoin(customers, eq(chalans.customerId, customers.id))
      .leftJoin(projects, eq(chalans.projectId, projects.id))
      .where(eq(chalans.id, id));

    if (!result) return undefined;

    const items = await db.select().from(chalanItems).where(eq(chalanItems.chalanId, id)).orderBy(asc(chalanItems.id));
    const revisions = await db.select().from(chalanRevisions).where(eq(chalanRevisions.chalanId, id)).orderBy(asc(chalanRevisions.revisionNumber));

    return {
      ...result.chalans,
      customer: result.customers || undefined,
      project: result.projects || undefined,
      items,
      revisions,
    };
  }

  async createChalan(chalan: InsertChalan, items: InsertChalanItem[]): Promise<Chalan> {
    // Generate unique chalan ID in format CHL-000001
    const lastChalan = await db.select({ id: chalans.id }).from(chalans).orderBy(desc(chalans.id)).limit(1);
    const nextId = (lastChalan[0]?.id || 0) + 1;
    const chalanNumber = `CHL-${String(nextId).padStart(6, '0')}`;
    
    // Ensure totalAmount is stored as string
    const totalAmountStr = typeof chalan.totalAmount === 'number' 
      ? chalan.totalAmount.toString() 
      : (chalan.totalAmount || '0');
    
    const chalanInsert: typeof chalans.$inferInsert = {
      ...chalan,
      chalanNumber,
      totalAmount: totalAmountStr,
    };
    
    const [created] = await db.insert(chalans).values(chalanInsert).returning();

    if (items.length > 0) {
      const itemsInsert: (typeof chalanItems.$inferInsert)[] = items.map(item => ({
        ...item,
        chalanId: created.id,
        quantity: typeof item.quantity === 'number' ? item.quantity.toString() : (item.quantity || '1'),
        rate: typeof item.rate === 'number' ? item.rate.toString() : (item.rate || '0'),
        amount: typeof item.amount === 'number' ? item.amount.toString() : (item.amount || '0'),
      }));
      await db.insert(chalanItems).values(itemsInsert);
    }

    await db.update(projects).set({ hasChalanCreated: true }).where(eq(projects.id, chalan.projectId));

    return created;
  }

  async updateChalan(id: number, chalanData: Partial<InsertChalan>, items?: InsertChalanItem[]): Promise<Chalan | undefined> {
    // Check if chalan is cancelled - cancelled chalans are read-only
    const existing = await this.getChalan(id);
    if (!existing) return undefined;
    if (existing.isCancelled) return undefined; // Cancelled chalans cannot be updated
    
    // Update the chalan basic info (but preserve chalanNumber and createdAt)
    const updateData: any = {};
    if (chalanData.customerId !== undefined) updateData.customerId = chalanData.customerId;
    if (chalanData.projectId !== undefined) updateData.projectId = chalanData.projectId;
    if (chalanData.chalanDate !== undefined) updateData.chalanDate = chalanData.chalanDate;
    if (chalanData.notes !== undefined) updateData.notes = chalanData.notes;
    if (chalanData.totalAmount !== undefined) {
      updateData.totalAmount = typeof chalanData.totalAmount === 'number' 
        ? chalanData.totalAmount.toString() 
        : chalanData.totalAmount;
    }

    const [updated] = await db
      .update(chalans)
      .set(updateData)
      .where(eq(chalans.id, id))
      .returning();

    if (!updated) return undefined;

    // If items are provided, delete old items and insert new ones
    if (items && items.length > 0) {
      await db.delete(chalanItems).where(eq(chalanItems.chalanId, id));
      const itemsInsert: (typeof chalanItems.$inferInsert)[] = items.map(item => ({
        ...item,
        chalanId: id,
        quantity: typeof item.quantity === 'number' ? item.quantity.toString() : (item.quantity || '1'),
        rate: typeof item.rate === 'number' ? item.rate.toString() : (item.rate || '0'),
        amount: typeof item.amount === 'number' ? item.amount.toString() : (item.amount || '0'),
      }));
      await db.insert(chalanItems).values(itemsInsert);
    }

    return updated;
  }

  async cancelChalan(id: number, reason: string): Promise<Chalan | undefined> {
    const [updated] = await db
      .update(chalans)
      .set({ isCancelled: true, cancelReason: reason })
      .where(eq(chalans.id, id))
      .returning();
    return updated;
  }

  async updateChalanStatus(id: number, isCancelled: boolean): Promise<Chalan | undefined> {
    const [updated] = await db
      .update(chalans)
      .set({ 
        isCancelled, 
        cancelReason: isCancelled ? "Cancelled via status toggle" : null 
      })
      .where(eq(chalans.id, id))
      .returning();
    return updated;
  }

  async getChalanRevisions(chalanId: number): Promise<ChalanRevision[]> {
    return db
      .select()
      .from(chalanRevisions)
      .where(eq(chalanRevisions.chalanId, chalanId))
      .orderBy(asc(chalanRevisions.revisionNumber));
  }

  async createChalanRevision(chalanId: number, changes: string, userId?: number): Promise<ChalanRevision> {
    const existingRevisions = await this.getChalanRevisions(chalanId);
    const revisionNumber = existingRevisions.length + 1;

    const revisionInsert: typeof chalanRevisions.$inferInsert = {
      chalanId,
      revisionNumber,
      changes,
      revisedBy: userId || null,
    };
    
    const [created] = await db.insert(chalanRevisions).values(revisionInsert).returning();

    return created;
  }

  // Reports
  async getConflicts(from: string, to: string, roomId?: number, editorId?: number): Promise<any[]> {
    const allBookings = await this.getBookings({ from, to, roomId, editorId });
    const activeBookings = allBookings.filter(b => b.status !== "cancelled");
    
    const conflicts: { booking1: any; booking2: any }[] = [];
    
    for (let i = 0; i < activeBookings.length; i++) {
      for (let j = i + 1; j < activeBookings.length; j++) {
        const b1 = activeBookings[i];
        const b2 = activeBookings[j];
        
        if (b1.bookingDate !== b2.bookingDate) continue;
        
        const hasRoomConflict = b1.roomId === b2.roomId;
        const hasEditorConflict = b1.editorId && b2.editorId && b1.editorId === b2.editorId;
        
        if (!hasRoomConflict && !hasEditorConflict) continue;
        
        const from1 = b1.fromTime;
        const to1 = b1.toTime;
        const from2 = b2.fromTime;
        const to2 = b2.toTime;
        
        const overlaps = from1 < to2 && from2 < to1;
        
        if (overlaps) {
          conflicts.push({ booking1: b1, booking2: b2 });
        }
      }
    }
    
    return conflicts;
  }

  async getEditorReport(from: string, to: string, editorId?: number): Promise<any[]> {
    const editorsList = editorId
      ? await db.select().from(editors).where(eq(editors.id, editorId)).orderBy(asc(editors.name))
      : await db.select().from(editors).where(eq(editors.isActive, true)).orderBy(asc(editors.name));
    
    const reports = [];
    
    for (const editor of editorsList) {
      const editorBookings = await this.getBookings({ from, to, editorId: editor.id });
      const confirmedBookings = editorBookings.filter(b => b.status !== "cancelled");
      
      const totalHours = confirmedBookings.reduce((sum, b) => sum + (b.totalHours || 0), 0);
      const projectIds = new Set(confirmedBookings.map(b => b.projectId));
      
      reports.push({
        editor,
        bookings: confirmedBookings,
        totalHours,
        projectCount: projectIds.size,
      });
    }
    
    return reports;
  }

  // Designations
  async getDesignations(): Promise<Designation[]> {
    return db.select().from(designations).orderBy(asc(designations.name));
  }

  async getDesignationByName(name: string): Promise<Designation | undefined> {
    const [designation] = await db.select().from(designations).where(eq(designations.name, name));
    return designation;
  }

  async createDesignation(name: string): Promise<Designation> {
    const [created] = await db.insert(designations).values({ name }).returning();
    return created;
  }

  // Get Chalan by Booking ID
  async getChalanByBookingId(bookingId: number): Promise<Chalan | undefined> {
    const [chalan] = await db.select().from(chalans).where(eq(chalans.bookingId, bookingId));
    return chalan;
  }

  // Update Chalan
  async updateChalan(id: number, chalanData: Partial<InsertChalan>, items?: (InsertChalanItem & { id?: number })[]): Promise<Chalan | undefined> {
    const [updated] = await db.update(chalans).set(chalanData).where(eq(chalans.id, id)).returning();
    
    if (!updated) return undefined;

    if (items) {
      // Delete existing items and insert new ones
      await db.delete(chalanItems).where(eq(chalanItems.chalanId, id));
      
      if (items.length > 0) {
        await db.insert(chalanItems).values(
          items.map(item => ({
            chalanId: id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          }))
        );
      }
    }

    return updated;
  }
}

export const storage = new DatabaseStorage();
