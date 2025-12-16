import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, User, Eye, EyeOff, Mail, Phone, Lock } from "lucide-react";
import { usePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType, Company } from "@shared/schema";

const ROLES = [
  { value: "admin", label: "Admin", description: "Full access to all modules" },
  { value: "gst", label: "GST", description: "GST billing access" },
  { value: "non_gst", label: "Non-GST", description: "Non-GST billing access" },
];

const createUserFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  mobile: z.string().optional(),
  password: z.string().min(4, "Password must be at least 4 characters"),
  securityPin: z.string().min(4, "Security PIN must be at least 4 characters"),
  role: z.enum(["admin", "gst", "non_gst"]),
  companyId: z.string().optional(),
  isActive: z.boolean().default(true),
});

const editUserFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  mobile: z.string().optional(),
  password: z.string().optional().refine((val) => !val || val.length >= 4, {
    message: "Password must be at least 4 characters if provided",
  }),
  securityPin: z.string().optional().refine((val) => !val || val.length >= 4, {
    message: "Security PIN must be at least 4 characters if provided",
  }),
  role: z.enum(["admin", "gst", "non_gst"]),
  companyId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof createUserFormSchema>;

function getInitials(name: string | null | undefined, username: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export default function UsersPage() {
  const { toast } = useToast();
  const permissions = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  if (!permissions.canView("users")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="User Management" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const { data: users = [], isLoading } = useQuery<(UserType & { company?: Company })[]>({
    queryKey: ["/api/users"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(editingUser ? editUserFormSchema : createUserFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      mobile: "",
      password: "",
      securityPin: "",
      role: "non_gst",
      companyId: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      return apiRequest("POST", "/api/users", {
        ...data,
        companyId: data.companyId ? parseInt(data.companyId) : null,
        email: data.email || null,
        fullName: data.fullName || null,
        mobile: data.mobile || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const payload: Record<string, any> = {
        username: data.username,
        fullName: data.fullName || null,
        email: data.email || null,
        mobile: data.mobile || null,
        role: data.role,
        companyId: data.companyId ? parseInt(data.companyId) : null,
        isActive: data.isActive,
      };
      if (data.password && data.password.length > 0) {
        payload.password = data.password;
      }
      if (data.securityPin && data.securityPin.length > 0) {
        payload.securityPin = data.securityPin;
      }
      return apiRequest("PATCH", `/api/users/${editingUser?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted successfully" });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const statusToggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/users/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ 
        title: variables.isActive ? "User activated" : "User deactivated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (user?: UserType) => {
    if (user) {
      setEditingUser(user);
      form.reset({
        username: user.username,
        fullName: user.fullName || "",
        email: user.email || "",
        mobile: user.mobile || "",
        password: "",
        securityPin: "",
        role: user.role as any,
        companyId: user.companyId?.toString() || "",
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      form.reset({
        username: "",
        fullName: "",
        email: "",
        mobile: "",
        password: "",
        securityPin: "",
        role: "non_gst",
        companyId: "",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setShowPassword(false);
    setShowPin(false);
    form.reset();
  };

  const onSubmit = (data: UserFormValues) => {
    if (editingUser) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "gst":
        return <Badge variant="secondary">GST</Badge>;
      case "non_gst":
        return <Badge variant="outline">Non-GST</Badge>;
      default:
        return null;
    }
  };

  const columns: Column<UserType & { company?: Company }>[] = [
    {
      key: "username",
      header: "User",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(row.fullName, row.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.fullName || row.username}</span>
            {row.fullName && (
              <span className="text-xs text-muted-foreground">@{row.username}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Contact",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.email && (
            <div className="flex items-center gap-1.5 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span>{row.email}</span>
            </div>
          )}
          {row.mobile && (
            <div className="flex items-center gap-1.5 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{row.mobile}</span>
            </div>
          )}
          {!row.email && !row.mobile && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => getRoleBadge(row.role),
    },
    {
      key: "company",
      header: "Company",
      cell: (row) => row.company?.name || "-",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        permissions.canEdit("users") ? (
          <div 
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={row.isActive}
              onCheckedChange={(checked) => {
                statusToggleMutation.mutate({ id: row.id, isActive: checked });
              }}
              disabled={statusToggleMutation.isPending}
              data-testid={`switch-user-status-${row.id}`}
            />
            <span className={`text-sm ${!row.isActive ? "text-muted-foreground" : ""}`}>
              {row.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        ) : (
          <Badge variant={row.isActive ? "default" : "secondary"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        )
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title="User Management" />

      <div className="flex-1 p-6 overflow-auto">
        {users.length === 0 && !isLoading ? (
          <EmptyState
            icon={User}
            title="No users yet"
            description="Add your first user to get started."
            actionLabel="Add User"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="space-y-4">
            {permissions.canCreate("users") && (
              <div className="flex justify-end">
                <Button onClick={() => handleOpenDialog()} data-testid="button-add-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            )}

            <DataTable
              columns={columns}
              data={users}
              isLoading={isLoading}
              searchPlaceholder="Search users..."
              onRowClick={handleOpenDialog}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  {permissions.canEdit("users") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(row)}
                      data-testid={`button-edit-user-${row.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canDelete("users") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingUser(row);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`button-delete-user-${row.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information and role."
                : "Add a new user to the system."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            className="pl-9"
                            placeholder="Enter username"
                            data-testid="input-username" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter full name"
                          data-testid="input-fullname" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="email"
                            className="pl-9"
                            placeholder="user@example.com"
                            data-testid="input-email" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            className="pl-9"
                            placeholder="+91 98765 43210"
                            data-testid="input-mobile" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password {editingUser ? "(leave blank to keep)" : "*"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            className="pl-9 pr-9"
                            placeholder="Enter password"
                            data-testid="input-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="securityPin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Security PIN {editingUser ? "(leave blank to keep)" : "*"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type={showPin ? "text" : "password"}
                            className="pl-9 pr-9"
                            placeholder="Enter PIN"
                            data-testid="input-pin"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPin(!showPin)}
                          >
                            {showPin ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex flex-col">
                                <span>{role.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {role.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-company">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-user">
                  {isPending ? "Saving..." : editingUser ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingUser?.username}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
