import { useLocation } from "wouter";
import { usePermissions, type Module } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldX } from "lucide-react";

interface PermissionGuardProps {
  module: Module;
  action?: "canView" | "canCreate" | "canEdit" | "canDelete";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ 
  module, 
  action = "canView", 
  children, 
  fallback 
}: PermissionGuardProps) {
  const { getModulePermissions } = usePermissions();
  const permissions = getModulePermissions(module);
  
  const hasPermission = permissions[action];
  
  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }
  
  return <>{children}</>;
}

interface PagePermissionGuardProps {
  module: Module;
  children: React.ReactNode;
}

export function PagePermissionGuard({ module, children }: PagePermissionGuardProps) {
  const [, setLocation] = useLocation();
  const { canView, isCustomRole } = usePermissions();
  
  const hasViewPermission = canView(module);
  
  if (!hasViewPermission) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldX className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  You don't have permission to view this page. 
                  Please contact your administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <>{children}</>;
}
