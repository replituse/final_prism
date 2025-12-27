import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertProjectSchema, insertRoomSchema, insertEditorSchema, insertBookingSchema, insertEditorLeaveSchema, insertChalanSchema, insertChalanItemSchema, insertUserSchema, loginSchema, createCompanyWithAdminSchema } from "@shared/schema";
import { z } from "zod";

type UserRole = "admin" | "gst" | "non_gst" | "account" | "custom";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: UserRole;
}

async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Use session-based authentication
  const userId = req.session?.userId;
  const userRole = req.session?.userRole;
  
  if (userId && userRole) {
    // Verify user still exists and is active
    try {
      const user = await storage.getUser(userId);
      if (user && user.isActive) {
        req.userId = user.id;
        req.userRole = user.role as UserRole;
      } else {
        // User no longer valid, clear session
        req.session.destroy(() => {});
      }
    } catch (error) {
      // Silent fail - no auth
    }
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.userId || !req.userRole) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }
    next();
  };
}

const moduleToSectionMap: Record<string, { module: string; section: string }[]> = {
  booking: [{ module: "Operations", section: "Booking" }],
  leaves: [{ module: "Operations", section: "Leaves Entry" }],
  chalan: [
    { module: "Operations", section: "Chalan Entry" },
    { module: "Operations", section: "Chalan Revise" },
  ],
  customers: [{ module: "Masters", section: "Customer Master" }],
  projects: [{ module: "Masters", section: "Project Master" }],
  rooms: [{ module: "Masters", section: "Room Master" }],
  editors: [{ module: "Masters", section: "Editor Master" }],
  reports: [
    { module: "Reports", section: "Conflict Report" },
    { module: "Reports", section: "Booking Report" },
    { module: "Reports", section: "Editor Report" },
    { module: "Reports", section: "Chalan Report" },
  ],
  "conflict-report": [{ module: "Reports", section: "Conflict Report" }],
  "booking-report": [{ module: "Reports", section: "Booking Report" }],
  "editor-report": [{ module: "Reports", section: "Editor Report" }],
  "chalan-report": [{ module: "Reports", section: "Chalan Report" }],
  users: [{ module: "Utility", section: "User Management" }],
  "user-rights": [{ module: "Utility", section: "User Rights" }],
};

const rolePermissions: Record<UserRole, Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>> = {
  admin: {
    booking: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    leaves: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    chalan: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    projects: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    rooms: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    editors: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "conflict-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "booking-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "editor-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "chalan-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    "user-rights": { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  gst: {
    booking: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    leaves: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    chalan: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    projects: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    rooms: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    editors: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "conflict-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "booking-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "editor-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "chalan-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "user-rights": { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  non_gst: {
    booking: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    leaves: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    chalan: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    customers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    projects: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    rooms: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    editors: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "conflict-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "booking-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "editor-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    "chalan-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "user-rights": { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  account: {
    booking: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    leaves: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    chalan: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    customers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    projects: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    rooms: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    editors: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "conflict-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "booking-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "editor-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "chalan-report": { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "user-rights": { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  custom: {
    booking: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    leaves: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    chalan: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    customers: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    projects: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    rooms: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    editors: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "conflict-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "booking-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "editor-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "chalan-report": { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "user-rights": { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

async function getModulePermissions(userId: number, userRole: UserRole, moduleName: string) {
  if (userRole !== "custom") {
    return rolePermissions[userRole]?.[moduleName] || { canView: false, canCreate: false, canEdit: false, canDelete: false };
  }
  
  const sections = moduleToSectionMap[moduleName] || [];
  const userAccess = await storage.getUserAccess(userId);
  
  let canView = false;
  let canCreate = false;
  let canEdit = false;
  let canDelete = false;

  for (const { module, section } of sections) {
    const access = userAccess.find(a => a.module === module && a.section === section);
    if (access) {
      if (access.canView) canView = true;
      if (access.canCreate) canCreate = true;
      if (access.canEdit) canEdit = true;
      if (access.canDelete) canDelete = true;
    }
  }

  return { canView, canCreate, canEdit, canDelete };
}

function requirePermission(moduleName: string, action: "canView" | "canCreate" | "canEdit" | "canDelete") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const permissions = await getModulePermissions(req.userId, req.userRole, moduleName);
    
    if (!permissions[action]) {
      return res.status(403).json({ message: `You don't have ${action.replace('can', '').toLowerCase()} permission for this module` });
    }
    
    next();
  };
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Apply auth middleware to all routes (populates req.userId and req.userRole if session exists)
  app.use(authMiddleware);
  
  // Apply authentication requirement to all /api/ routes EXCEPT public ones
  // Public routes: /api/auth/*, /api/companies (GET for login dropdown)
  app.use("/api", (req: AuthenticatedRequest, res, next) => {
    // Allow public routes without authentication (req.path is relative to mount point /api)
    const publicPaths = ["/auth/login", "/auth/logout", "/auth/session"];
    const isCompaniesGet = req.path === "/companies" && req.method === "GET";
    
    if (publicPaths.includes(req.path) || isCompaniesGet) {
      return next();
    }
    
    // All other API routes require authentication
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  });
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      // Find user by username and company
      const user = await storage.getUserByUsernameAndCompany(data.username, data.companyId);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or PIN for the selected company" });
      }
      
      if (user.securityPin !== data.securityPin) {
        return res.status(401).json({ message: "Invalid username or PIN" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive. Please contact administrator." });
      }
      
      // Get company details
      const company = await storage.getCompany(data.companyId);
      if (!company) {
        return res.status(400).json({ message: "Selected company not found" });
      }
      
      // Set session data (secure server-side authentication)
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.companyId = data.companyId;
      
      const { password, securityPin, ...userWithoutSensitive } = user;
      res.json({ user: userWithoutSensitive, company });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const firstError = error.errors[0];
        return res.status(400).json({ message: firstError.message });
      }
      res.status(400).json({ message: error.message });
    }
  });
  
  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Get current session info
  app.get("/api/auth/session", async (req: AuthenticatedRequest, res) => {
    if (!req.userId) {
      return res.json({ authenticated: false });
    }
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.json({ authenticated: false });
      }
      const company = req.session?.companyId ? await storage.getCompany(req.session.companyId) : null;
      const { password, securityPin, ...userWithoutSensitive } = user;
      res.json({ authenticated: true, user: userWithoutSensitive, company });
    } catch (error) {
      res.json({ authenticated: false });
    }
  });

  // Companies routes
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.status(201).json(company);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/companies", requireRole("admin"), async (req, res) => {
    try {
      const data = createCompanyWithAdminSchema.parse(req.body);
      const result = await storage.createCompanyWithAdmin(data);
      const { password, securityPin, ...userWithoutSensitive } = result.user;
      res.status(201).json({ company: result.company, user: userWithoutSensitive });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const firstError = error.errors[0];
        return res.status(400).json({ message: firstError.message });
      }
      res.status(400).json({ message: error.message });
    }
  });

  // Users routes - Admin only for list/create/update/delete
  app.get("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const sanitized = users.map(({ password, securityPin, ...u }) => u);
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      const { password, securityPin, ...sanitized } = user;
      res.status(201).json(sanitized);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.updateUser(id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, securityPin, ...sanitized } = user;
      res.json(sanitized);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin-only endpoint to get user sensitive data (password/securityPin)
  app.get("/api/users/:id/sensitive", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ password: user.password, securityPin: user.securityPin });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        fullName: user.fullName || "",
        email: user.email || "",
        mobile: user.mobile || "",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/profile", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { fullName, email, mobile } = req.body;
      const user = await storage.updateUser(id, { fullName, email, mobile });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        fullName: user.fullName || "",
        email: user.email || "",
        mobile: user.mobile || "",
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { currentPin, newPin } = req.body;
      
      if (!currentPin || !newPin) {
        return res.status(400).json({ message: "Current PIN and new PIN are required" });
      }
      
      if (newPin.length < 4) {
        return res.status(400).json({ message: "New PIN must be at least 4 characters" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.securityPin !== currentPin) {
        return res.status(401).json({ message: "Current PIN is incorrect" });
      }
      
      await storage.updateUser(id, { securityPin: newPin });
      res.json({ message: "Security PIN updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/access", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const access = await storage.getUserAccess(id);
      res.json(access);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:id/access", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.setUserAccess(id, req.body.access);
      res.status(200).json({ message: "Access updated" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Helper function to calculate total hours from times and break
  const calculateTotalHours = (from: string | null, to: string | null, breakHours: string | number | null) => {
    if (!from || !to) return null;
    
    try {
      const [fromH, fromM] = from.split(':').map(Number);
      const [toH, toM] = to.split(':').map(Number);
      
      let diffMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight
      
      let breakMinutes = 0;
      if (breakHours) {
        const breakStr = breakHours.toString();
        if (breakStr.includes('.')) {
          const [bH, bM] = breakStr.split('.').map(Number);
          breakMinutes = (bH || 0) * 60 + (bM || 0);
        } else {
          breakMinutes = Number(breakStr) * 60;
        }
      }
      
      const totalMinutes = Math.max(0, diffMinutes - breakMinutes);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      
      return `${h}.${m.toString().padStart(2, '0')}`;
    } catch (e) {
      return null;
    }
  };

  // Customers routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers/:id/contacts", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contacts = await storage.getCustomerContacts(id);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers", requirePermission("customers", "canCreate"), async (req, res) => {
    try {
      const { contacts, ...customerData } = req.body;
      const data = insertCustomerSchema.parse(customerData);
      const customer = await storage.createCustomer(data, contacts);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/customers/:id", requirePermission("customers", "canEdit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { contacts, ...customerData } = req.body;
      const customer = await storage.updateCustomer(id, customerData, contacts);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/customers/:id", requirePermission("customers", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomer(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const projects = await storage.getProjects(customerId);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/projects", requirePermission("projects", "canCreate"), async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/projects/:id", requirePermission("projects", "canEdit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateProject(id, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/projects/:id", requirePermission("projects", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Rooms routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms", requirePermission("rooms", "canCreate"), async (req, res) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(data);
      res.status(201).json(room);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/rooms/:id", requirePermission("rooms", "canEdit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const room = await storage.updateRoom(id, req.body);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/rooms/:id", requirePermission("rooms", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRoom(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Editors routes
  app.get("/api/editors", async (req, res) => {
    try {
      const editors = await storage.getEditors();
      res.json(editors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/editors", requirePermission("editors", "canCreate"), async (req, res) => {
    try {
      const data = insertEditorSchema.parse(req.body);
      const editor = await storage.createEditor(data);
      res.status(201).json(editor);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/editors/:id", requirePermission("editors", "canEdit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const editor = await storage.updateEditor(id, req.body);
      if (!editor) {
        return res.status(404).json({ message: "Editor not found" });
      }
      res.json(editor);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/editors/:id", requirePermission("editors", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEditor(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Bookings routes
  app.get("/api/bookings", requirePermission("booking", "canView"), async (req, res) => {
    try {
      const filters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        roomId: req.query.roomId ? parseInt(req.query.roomId as string) : undefined,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        editorId: req.query.editorId ? parseInt(req.query.editorId as string) : undefined,
        status: req.query.status as string | undefined,
      };
      const bookings = await storage.getBookings(filters);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/:id", requirePermission("booking", "canView"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/:id/logs", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await storage.getBookingLogs(id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const conflictCheckSchema = z.object({
    roomId: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
    editorId: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).optional(),
    bookingDate: z.string().min(1, "Date is required"),
    fromTime: z.string().min(1, "From time is required"),
    toTime: z.string().min(1, "To time is required"),
    excludeBookingId: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).optional(),
  });

  app.post("/api/bookings/check-conflicts", async (req, res) => {
    try {
      const validated = conflictCheckSchema.parse(req.body);

      const result = await storage.checkBookingConflicts({
        roomId: validated.roomId,
        editorId: validated.editorId || undefined,
        bookingDate: validated.bookingDate,
        fromTime: validated.fromTime,
        toTime: validated.toTime,
        excludeBookingId: validated.excludeBookingId,
      });

      res.json(result);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings", requirePermission("booking", "canCreate"), async (req, res) => {
    try {
      const { repeatDays, ...bookingData } = req.body;
      const data = insertBookingSchema.parse(bookingData);
      
      const bookings = [];
      const baseDate = new Date(data.bookingDate);
      
      for (let i = 0; i <= (repeatDays || 0); i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        const booking = await storage.createBooking({
          ...data,
          bookingDate: date.toISOString().split("T")[0],
          totalHours: calculateTotalHours(data.actualFromTime || data.fromTime, data.actualToTime || data.toTime, data.breakHours)
        });
        bookings.push(booking);
      }
      
      res.status(201).json(bookings.length === 1 ? bookings[0] : bookings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id", requirePermission("booking", "canEdit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if booking has a chalan - bookings with chalans are locked
      const existingChalan = await storage.getChalanByBookingId(id);
      if (existingChalan) {
        return res.status(403).json({ message: "Booking is locked because a chalan has been created. Delete the chalan first to edit the booking." });
      }

      // Check if booking is cancelled - cancelled bookings are read-only
      const existingBooking = await storage.getBooking(id);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (existingBooking.status === "cancelled") {
        return res.status(403).json({ message: "Cancelled Booking is Read-Only - Modifications are not allowed" });
      }
      
      const bookingData = {
        ...req.body,
        totalHours: calculateTotalHours(req.body.actualFromTime || req.body.fromTime, req.body.actualToTime || req.body.toTime, req.body.breakHours)
      };
      const booking = await storage.updateBooking(id, bookingData);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/bookings/:id/cancel", requirePermission("booking", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Reason is required" });
      }
      const booking = await storage.cancelBooking(id, reason);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bookings/:id", requirePermission("booking", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBooking(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Editor Leaves routes
  app.get("/api/editor-leaves", requirePermission("leaves", "canView"), async (req, res) => {
    try {
      const editorId = req.query.editorId ? parseInt(req.query.editorId as string) : undefined;
      const leaves = await storage.getEditorLeaves(editorId);
      res.json(leaves);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/editor-leaves", requirePermission("leaves", "canCreate"), async (req, res) => {
    try {
      const data = insertEditorLeaveSchema.parse(req.body);
      const leave = await storage.createEditorLeave(data);
      res.status(201).json(leave);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/editor-leaves/:id", requirePermission("leaves", "canEdit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const leave = await storage.updateEditorLeave(id, req.body);
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
      }
      res.json(leave);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/editor-leaves/:id", requirePermission("leaves", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEditorLeave(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Chalans routes
  app.get("/api/chalans", requirePermission("chalan", "canView"), async (req, res) => {
    try {
      const filters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
      };
      const chalans = await storage.getChalans(filters);
      res.json(chalans);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chalans/:id", requirePermission("chalan", "canView"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chalan = await storage.getChalan(id);
      if (!chalan) {
        return res.status(404).json({ message: "Chalan not found" });
      }
      res.json(chalan);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chalans/:id/revisions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const revisions = await storage.getChalanRevisions(id);
      res.json(revisions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chalans", requirePermission("chalan", "canCreate"), async (req, res) => {
    try {
      const { items, ...chalanData } = req.body;
      const data = insertChalanSchema.parse(chalanData);
      
      // Enforce: Chalan must be generated only from a booking
      if (!data.bookingId) {
        return res.status(400).json({ message: "Chalan must be created from a confirmed booking. Manual creation is blocked." });
      }

      // Check if a chalan already exists for this booking (one chalan per booking rule)
      const existingChalan = await storage.getChalanByBookingId(data.bookingId);
      if (existingChalan) {
        return res.status(409).json({ 
          message: "A chalan already exists for this booking. Each booking can only have one chalan.",
          existingChalanId: existingChalan.id
        });
      }
      
      const chalan = await storage.createChalan(data, items || []);
      res.status(201).json(chalan);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/chalans/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Reason is required" });
      }
      const chalan = await storage.cancelChalan(id, reason);
      if (!chalan) {
        return res.status(404).json({ message: "Chalan not found" });
      }
      res.json(chalan);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/chalans/:id/revise", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { items, ...revisionData } = req.body;
      const userId = (req.user as any)?.id;
      
      // Validate items if provided
      let validatedItems = undefined;
      if (items && Array.isArray(items)) {
        validatedItems = items.map((item: any) => {
          const parsed = insertChalanItemSchema.safeParse(item);
          if (!parsed.success) {
            throw new Error(`Invalid item data: ${parsed.error.message}`);
          }
          return parsed.data;
        });
      }
      
      const revisedChalan = await storage.reviseChalan(id, revisionData, validatedItems, userId);
      res.status(201).json(revisedChalan);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/chalans/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isCancelled } = req.body;
      
      if (typeof isCancelled !== 'boolean') {
        return res.status(400).json({ message: "isCancelled must be a boolean" });
      }
      
      const chalan = await storage.updateChalanStatus(id, isCancelled);
      if (!chalan) {
        return res.status(404).json({ message: "Chalan not found" });
      }
      
      // Create a revision log for the status change
      await storage.createChalanRevision(
        id, 
        isCancelled ? "Status changed to Cancelled" : "Status changed to Active"
      );
      
      res.json(chalan);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/chalans/:id", requirePermission("chalan", "canEdit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if chalan is cancelled - cancelled chalans are read-only
      const existingChalan = await storage.getChalan(id);
      if (!existingChalan) {
        return res.status(404).json({ message: "Chalan not found" });
      }
      if (existingChalan.isCancelled) {
        return res.status(403).json({ message: "Cancelled Chalan is Read-Only - Modifications are not allowed" });
      }
      
      const { items, ...chalanData } = req.body;
      
      // Check if trying to change bookingId to a value that's already used by another chalan
      if (chalanData.bookingId && chalanData.bookingId !== existingChalan.bookingId) {
        const chalanWithBooking = await storage.getChalanByBookingId(chalanData.bookingId);
        if (chalanWithBooking && chalanWithBooking.id !== id) {
          return res.status(409).json({ 
            message: "A chalan already exists for this booking. Each booking can only have one chalan.",
            existingChalanId: chalanWithBooking.id
          });
        }
      }
      
      const chalan = await storage.updateChalan(id, chalanData, items);
      if (!chalan) {
        return res.status(404).json({ message: "Chalan not found" });
      }
      
      // Create a revision log
      await storage.createChalanRevision(id, "Chalan updated", undefined);
      
      res.json(chalan);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/chalans/:id", requirePermission("chalan", "canDelete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChalan(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Reports routes
  app.get("/api/reports/conflicts", requirePermission("conflict-report", "canView"), async (req, res) => {
    try {
      const from = req.query.from as string;
      const to = req.query.to as string;
      const roomId = req.query.roomId && req.query.roomId !== "all" ? parseInt(req.query.roomId as string) : undefined;
      const editorId = req.query.editorId && req.query.editorId !== "all" ? parseInt(req.query.editorId as string) : undefined;
      
      if (!from || !to) {
        return res.status(400).json({ message: "from and to dates are required" });
      }
      
      const conflicts = await storage.getConflicts(from, to, roomId, editorId);
      res.json(conflicts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/editors", requirePermission("editor-report", "canView"), async (req, res) => {
    try {
      const from = req.query.from as string;
      const to = req.query.to as string;
      const editorId = req.query.editorId && req.query.editorId !== "all" ? parseInt(req.query.editorId as string) : undefined;
      
      if (!from || !to) {
        return res.status(400).json({ message: "from and to dates are required" });
      }
      
      const reports = await storage.getEditorReport(from, to, editorId);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Designations routes
  app.get("/api/designations", async (req, res) => {
    try {
      const designations = await storage.getDesignations();
      res.json(designations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/designations", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Designation name is required" });
      }
      const designation = await storage.createDesignation(name.trim());
      res.status(201).json(designation);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return res.status(200).json(await storage.getDesignationByName(req.body.name.trim()));
      }
      res.status(400).json({ message: error.message });
    }
  });

  // History/Audit trail
  app.get("/api/history", async (req, res) => {
    try {
      const filters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        entityType: req.query.entityType as string | undefined,
        action: req.query.action as string | undefined,
      };
      const history = await storage.getHistory(filters);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check if chalan exists for a booking
  app.get("/api/bookings/:id/chalan", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chalan = await storage.getChalanByBookingId(id);
      if (chalan) {
        res.json({ exists: true, chalan });
      } else {
        res.json({ exists: false });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
