import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Film, FileCheck, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Customer } from "@shared/schema";

const PROJECT_TYPES = [
  { value: "movie", label: "Movie" },
  { value: "serial", label: "Serial" },
  { value: "web_series", label: "Web Series" },
  { value: "ad", label: "Advertisement" },
  { value: "teaser", label: "Teaser" },
  { value: "trilogy", label: "Trilogy" },
];

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customerId: z.string().min(1, "Customer is required"),
  projectType: z.enum(["movie", "serial", "web_series", "ad", "teaser", "trilogy"]),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery<(Project & { customer?: Customer })[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      customerId: "",
      projectType: "movie",
      description: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("POST", "/api/projects", {
        ...data,
        customerId: parseInt(data.customerId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("PATCH", `/api/projects/${editingProject?.id}`, {
        ...data,
        customerId: parseInt(data.customerId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted successfully" });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      setTogglingId(id);
      return apiRequest("PATCH", `/api/projects/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingId(null);
    },
  });

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      form.reset({
        name: project.name,
        customerId: project.customerId.toString(),
        projectType: project.projectType as any,
        description: project.description || "",
        isActive: project.isActive,
      });
    } else {
      setEditingProject(null);
      form.reset({
        name: "",
        customerId: "",
        projectType: "movie",
        description: "",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProject(null);
    form.reset();
  };

  const onSubmit = (data: ProjectFormValues) => {
    if (editingProject) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: Column<Project & { customer?: Customer }>[] = [
    {
      key: "name",
      header: "Project Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => row.customer?.name || "-",
    },
    {
      key: "projectType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline">
          {PROJECT_TYPES.find((t) => t.value === row.projectType)?.label || row.projectType}
        </Badge>
      ),
    },
    {
      key: "chalan",
      header: "Chalan/Invoice",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.hasChalanCreated && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Chalan
            </Badge>
          )}
          {row.hasInvoiceCreated && (
            <Badge variant="default" className="text-xs">
              <FileCheck className="h-3 w-3 mr-1" />
              Invoice
            </Badge>
          )}
          {!row.hasChalanCreated && !row.hasInvoiceCreated && "-"}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {togglingId === row.id ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={row.isActive}
              onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: row.id, isActive: checked })}
              data-testid={`switch-status-${row.id}`}
            />
          )}
          <span className="text-sm text-muted-foreground">{row.isActive ? "Active" : "Inactive"}</span>
        </div>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title="Project Master" />

      <div className="flex-1 p-6 overflow-auto">
        {projects.length === 0 && !isLoading ? (
          <EmptyState
            icon={Film}
            title="No projects yet"
            description="Add your first project to get started."
            actionLabel="Add Project"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-project">
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={projects}
              isLoading={isLoading}
              searchPlaceholder="Search projects..."
              onRowClick={handleOpenDialog}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(row)}
                    data-testid={`button-edit-project-${row.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingProject(row);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-project-${row.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Add Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update project information."
                : "Add a new project for a customer."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input data-testid="input-project-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.filter((c) => c.isActive).map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
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
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea data-testid="input-description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                <Button type="submit" disabled={isPending} data-testid="button-save-project">
                  {isPending ? "Saving..." : editingProject ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingProject?.name}"? This action cannot be undone.
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
              onClick={() => deletingProject && deleteMutation.mutate(deletingProject.id)}
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
