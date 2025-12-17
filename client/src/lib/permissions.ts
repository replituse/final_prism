import { useAuth } from "./auth-context";
import { useQuery } from "@tanstack/react-query";
import type { UserModuleAccess } from "@shared/schema";

export type UserRole = "admin" | "gst" | "non_gst" | "account" | "custom";

export type Module = 
  | "booking" 
  | "leaves" 
  | "chalan" 
  | "customers" 
  | "projects" 
  | "rooms" 
  | "editors" 
  | "reports"
  | "conflict-report"
  | "booking-report"
  | "editor-report"
  | "chalan-report"
  | "users" 
  | "user-rights";

export interface ModulePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const rolePermissions: Record<UserRole, Record<Module, ModulePermissions>> = {
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

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as UserRole) || "non_gst";
  const isAdmin = role === "admin";
  const isCustomRole = role === "custom";

  const { data: customAccess = [] } = useQuery<UserModuleAccess[]>({
    queryKey: ["/api/users", user?.id, "access"],
    enabled: isCustomRole && !!user?.id,
  });

  function getCustomPermissions(module: Module): ModulePermissions {
    const sections = moduleToSectionMap[module] || [];
    let canView = false;
    let canCreate = false;
    let canEdit = false;
    let canDelete = false;

    for (const { module: modName, section } of sections) {
      const access = customAccess.find(
        (a) => a.module === modName && a.section === section
      );
      if (access) {
        if (access.canView) canView = true;
        if (access.canCreate) canCreate = true;
        if (access.canEdit) canEdit = true;
        if (access.canDelete) canDelete = true;
      }
    }

    return { canView, canCreate, canEdit, canDelete };
  }

  function getModulePermissions(module: Module): ModulePermissions {
    if (isCustomRole) {
      return getCustomPermissions(module);
    }
    return rolePermissions[role][module] || {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    };
  }

  function canView(module: Module): boolean {
    return getModulePermissions(module).canView;
  }

  function canCreate(module: Module): boolean {
    return getModulePermissions(module).canCreate;
  }

  function canEdit(module: Module): boolean {
    return getModulePermissions(module).canEdit;
  }

  function canDelete(module: Module): boolean {
    return getModulePermissions(module).canDelete;
  }

  return {
    role,
    isAdmin,
    isCustomRole,
    getModulePermissions,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}

export function getPermissionsForRole(role: UserRole, module: Module): ModulePermissions {
  return rolePermissions[role]?.[module] || {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  };
}
