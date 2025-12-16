import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  Users,
  Film,
  Building2,
  UserCircle,
  FileText,
  ClipboardList,
  Settings,
  LogOut,
  ChevronDown,
  CalendarDays,
  UserMinus,
  AlertTriangle,
  FileSpreadsheet,
  UserCog,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { usePermissions, type Module } from "@/lib/permissions";
import { UserProfileModal } from "@/components/user-profile-modal";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "gst" | "non_gst" | "custom";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  roles?: UserRole[];
  module?: Module;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
  roles?: UserRole[];
  module?: Module;
}

const operationsItems: MenuItem[] = [
  { title: "Booking", url: "/", icon: Calendar, module: "booking" },
  { title: "Leaves Entry", url: "/leaves", icon: UserMinus, module: "leaves" },
  { title: "Chalan Entry", url: "/chalan", icon: FileText, roles: ["admin"], module: "chalan" },
  { title: "Chalan Revise", url: "/chalan/revise", icon: ClipboardList, roles: ["admin"], module: "chalan" },
];

const mastersItems: MenuItem[] = [
  { title: "Customer Master", url: "/masters/customers", icon: Users, module: "customers" },
  { title: "Project Master", url: "/masters/projects", icon: Film, module: "projects" },
  { title: "Room Master", url: "/masters/rooms", icon: Building2, module: "rooms" },
  { title: "Editor Master", url: "/masters/editors", icon: UserCircle, module: "editors" },
];

const reportsItems: MenuItem[] = [
  { title: "Conflict Report", url: "/reports/conflict", icon: AlertTriangle, module: "reports" },
  { title: "Booking Report", url: "/reports/booking", icon: CalendarDays, module: "reports" },
  { title: "Editor Report", url: "/reports/editor", icon: UserCog, module: "reports" },
  { title: "Chalan Report", url: "/reports/chalan", icon: FileSpreadsheet, roles: ["admin"], module: "reports" },
];

const utilityItems: MenuItem[] = [
  { title: "User Rights", url: "/utility/user-rights", icon: Shield, module: "user-rights" },
  { title: "User Management", url: "/utility/users", icon: Settings, module: "users" },
];

const menuSections: MenuSection[] = [
  { label: "Operations", items: operationsItems },
  { label: "Masters", items: mastersItems, roles: ["admin", "gst"] },
  { label: "Reports", items: reportsItems, roles: ["admin"], module: "reports" },
  { label: "Utility", items: utilityItems, roles: ["admin"] },
];

function filterItemsByRoleAndPermissions(
  items: MenuItem[], 
  userRole: UserRole, 
  canViewModule: (module: Module) => boolean
): MenuItem[] {
  return items.filter(item => {
    if (userRole === "custom") {
      if (item.module) {
        return canViewModule(item.module);
      }
      return false;
    }
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });
}

function filterSectionsByRoleAndPermissions(
  sections: MenuSection[], 
  userRole: UserRole,
  canViewModule: (module: Module) => boolean
): MenuSection[] {
  return sections
    .map(section => ({
      ...section,
      items: filterItemsByRoleAndPermissions(section.items, userRole, canViewModule),
    }))
    .filter(section => {
      // For custom roles, only show sections that have accessible items
      if (userRole === "custom") {
        return section.items.length > 0;
      }
      // For other roles, check if the section is allowed for this role
      if (section.roles && !section.roles.includes(userRole)) {
        return false;
      }
      return section.items.length > 0;
    });
}

function SidebarNavGroup({
  label,
  items,
  isOpen,
  onToggle,
}: {
  label: string;
  items: { title: string; url: string; icon: any }[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [location] = useLocation();

  return (
    <Collapsible 
      open={isOpen}
      onOpenChange={onToggle}
      className="group/collapsible"
    >
      <SidebarGroup className="py-0.5 px-0">
        <SidebarGroupLabel 
          asChild 
          className="h-auto py-2.5 px-3 sidebar-group-label rounded-none cursor-pointer"
        >
          <CollapsibleTrigger className="flex w-full items-center gap-2">
            <span className="text-sm font-semibold tracking-wide">{label}</span>
            <ChevronDown 
              className={cn(
                "ml-auto h-4 w-4 text-white/80 sidebar-arrow",
                isOpen && "sidebar-arrow-open"
              )} 
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent className="sidebar-collapsible-content">
          <SidebarGroupContent className="px-2 pt-1">
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { user, company, logout } = useAuth();
  const { role, canView } = usePermissions();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["Operations", "Masters", "Reports", "Utility"]));

  const userRole = (role as UserRole) || "non_gst";
  const filteredSections = filterSectionsByRoleAndPermissions(menuSections, userRole, canView);

  const handleToggleSection = (section: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case "admin":
        return <Badge variant="default" className="text-xs">Admin</Badge>;
      case "gst":
        return <Badge variant="secondary" className="text-xs">GST</Badge>;
      case "non_gst":
        return <Badge variant="outline" className="text-xs">Non-GST</Badge>;
      case "custom":
        return <Badge variant="outline" className="text-xs">Custom</Badge>;
      default:
        return null;
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 bg-sidebar-header text-sidebar-header-foreground">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate text-white">PRISM</h2>
            <p className="text-xs text-white/70 truncate">
              {company?.name || "No company"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="pt-4">
        {filteredSections.map((section) => (
          <SidebarNavGroup 
            key={section.label}
            label={section.label} 
            items={section.items} 
            isOpen={openSections.has(section.label)}
            onToggle={() => handleToggleSection(section.label)}
          />
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setProfileModalOpen(true)}
            className="cursor-pointer hover-elevate rounded-full"
            data-testid="button-user-profile"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground">
                {user?.username?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setProfileModalOpen(true)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {user?.username || "User"}
              </span>
              {user?.role && getRoleBadge(user.role)}
            </div>
          </div>
          <SidebarMenuButton
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setLogoutDialogOpen(true)}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </SidebarMenuButton>
        </div>
      </SidebarFooter>

      <UserProfileModal 
        open={profileModalOpen} 
        onOpenChange={setProfileModalOpen} 
      />

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to sign in again to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-logout">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout} data-testid="button-confirm-logout">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
