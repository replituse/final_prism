import { useAuth } from "./auth-context";

export type UserRole = "admin" | "gst" | "non_gst";

export type Module = 
  | "booking" 
  | "leaves" 
  | "chalan" 
  | "customers" 
  | "projects" 
  | "rooms" 
  | "editors" 
  | "reports" 
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
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    "user-rights": { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as UserRole) || "non_gst";
  const isAdmin = role === "admin";

  function getModulePermissions(module: Module): ModulePermissions {
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
