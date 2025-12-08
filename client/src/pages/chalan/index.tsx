import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useSearch, useLocation } from "wouter";
import { Plus, Trash2, FileText, Eye, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ChalanInvoice } from "@/components/chalan-invoice";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChalanWithItems, Customer, Project } from "@shared/schema";

const chalanItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.string().default("1"),
  rate: z.string().default("0"),
});

const chalanFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  projectId: z.string().min(1, "Project is required"),
  chalanDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  items: z.array(chalanItemSchema).min(1, "At least one item is required"),
});

type ChalanFormValues = z.infer<typeof chalanFormSchema>;

export default function ChalanPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingChalan, setViewingChalan] = useState<ChalanWithItems | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingChalan, setDeletingChalan] = useState<ChalanWithItems | null>(null);
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  const [editingChalan, setEditingChalan] = useState<ChalanWithItems | null>(null);

  const { data: chalans = [], isLoading } = useQuery<ChalanWithItems[]>({
    queryKey: ["/api/chalans"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<ChalanFormValues>({
    resolver: zodResolver(chalanFormSchema),
    defaultValues: {
      customerId: "",
      projectId: "",
      chalanDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      items: [{ description: "", quantity: "1", rate: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedCustomerId = form.watch("customerId");

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: [`/api/projects?customerId=${selectedCustomerId}`],
    enabled: !!selectedCustomerId,
  });

  useEffect(() => {
    if (urlParamsProcessed) return;
    
    const params = new URLSearchParams(searchString);
    const customerId = params.get("customerId");
    const projectId = params.get("projectId");
    const editId = params.get("edit");
    
    // Handle edit mode from URL (e.g., /chalan?edit=123)
    if (editId && chalans.length > 0) {
      const chalanToEdit = chalans.find(c => c.id === parseInt(editId));
      if (chalanToEdit && !chalanToEdit.isCancelled) {
        setEditingChalan(chalanToEdit);
        form.reset({
          customerId: chalanToEdit.customerId.toString(),
          projectId: chalanToEdit.projectId.toString(),
          chalanDate: chalanToEdit.chalanDate,
          notes: chalanToEdit.notes || "",
          items: chalanToEdit.items?.length ? chalanToEdit.items.map(item => ({
            description: item.description,
            quantity: item.quantity.toString(),
            rate: item.rate.toString(),
          })) : [{ description: "", quantity: "1", rate: "0" }],
        });
        setDialogOpen(true);
        setUrlParamsProcessed(true);
        setLocation("/chalan", { replace: true });
      }
      return;
    }
    
    // Handle create mode from URL with pre-filled customer/project
    if (customerId && customers.length > 0) {
      form.setValue("customerId", customerId);
      setDialogOpen(true);
      setUrlParamsProcessed(true);
      setLocation("/chalan", { replace: true });
      
      if (projectId) {
        setTimeout(() => {
          form.setValue("projectId", projectId);
        }, 100);
      }
    }
  }, [searchString, customers, chalans, urlParamsProcessed, form, setLocation]);

  const createMutation = useMutation({
    mutationFn: async (data: ChalanFormValues) => {
      const items = data.items.map((item) => ({
        description: item.description,
        quantity: parseInt(item.quantity) || 1,
        rate: parseInt(item.rate) || 0,
        amount: (parseInt(item.quantity) || 1) * (parseInt(item.rate) || 0),
      }));
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      return apiRequest("POST", "/api/chalans", {
        customerId: parseInt(data.customerId),
        projectId: parseInt(data.projectId),
        chalanDate: data.chalanDate,
        notes: data.notes,
        totalAmount,
        items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/chalans')
      });
      toast({ title: "Chalan created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating chalan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ChalanFormValues & { id: number }) => {
      const items = data.items.map((item) => ({
        description: item.description,
        quantity: parseInt(item.quantity) || 1,
        rate: parseInt(item.rate) || 0,
        amount: (parseInt(item.quantity) || 1) * (parseInt(item.rate) || 0),
      }));
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      return apiRequest("PATCH", `/api/chalans/${data.id}`, {
        customerId: parseInt(data.customerId),
        projectId: parseInt(data.projectId),
        chalanDate: data.chalanDate,
        notes: data.notes,
        totalAmount,
        items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/chalans')
      });
      toast({ title: "Chalan updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating chalan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/chalans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/chalans')
      });
      toast({ title: "Chalan deleted successfully" });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting chalan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = () => {
    setEditingChalan(null);
    form.reset({
      customerId: "",
      projectId: "",
      chalanDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      items: [{ description: "", quantity: "1", rate: "0" }],
    });
    setDialogOpen(true);
  };

  const handleEditChalan = (chalan: ChalanWithItems) => {
    if (chalan.isCancelled) {
      toast({
        title: "Cannot edit cancelled chalan",
        description: "Cancelled chalans are read-only and cannot be modified.",
        variant: "destructive",
      });
      return;
    }
    setEditingChalan(chalan);
    form.reset({
      customerId: chalan.customerId.toString(),
      projectId: chalan.projectId.toString(),
      chalanDate: chalan.chalanDate,
      notes: chalan.notes || "",
      items: chalan.items?.length ? chalan.items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        rate: item.rate.toString(),
      })) : [{ description: "", quantity: "1", rate: "0" }],
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingChalan(null);
    form.reset();
  };

  const handleViewChalan = (chalan: ChalanWithItems) => {
    setViewingChalan(chalan);
    setViewDialogOpen(true);
  };

  const onSubmit = (data: ChalanFormValues) => {
    if (editingChalan) {
      updateMutation.mutate({ ...data, id: editingChalan.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: Column<ChalanWithItems>[] = [
    {
      key: "chalanNumber",
      header: "Chalan No.",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{row.chalanNumber}</span>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => row.customer?.name || "-",
    },
    {
      key: "project",
      header: "Project",
      cell: (row) => row.project?.name || "-",
    },
    {
      key: "chalanDate",
      header: "Date",
      cell: (row) => (
        <span className="font-mono text-sm">
          {format(new Date(row.chalanDate), "PP")}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Amount",
      cell: (row) => (
        <span className="font-mono font-medium">
          Rs. {(row.totalAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "isCancelled",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isCancelled ? "destructive" : "default"}>
          {row.isCancelled ? "Cancelled" : "Active"}
        </Badge>
      ),
    },
  ];

  const isPending = createMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title="Chalan Entry" />

      <div className="flex-1 p-6 overflow-auto">
        {chalans.length === 0 && !isLoading ? (
          <EmptyState
            icon={FileText}
            title="No chalans yet"
            description="Create your first chalan to start billing."
            actionLabel="Create Chalan"
            onAction={handleOpenDialog}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleOpenDialog} data-testid="button-create-chalan">
                <Plus className="h-4 w-4 mr-2" />
                Create Chalan
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={chalans}
              isLoading={isLoading}
              searchPlaceholder="Search chalans..."
              actions={(row) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewChalan(row)}
                    data-testid={`button-view-chalan-${row.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!row.isCancelled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditChalan(row)}
                      data-testid={`button-edit-chalan-${row.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingChalan(row);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-chalan-${row.id}`}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChalan ? "Edit Chalan" : "Create Chalan"}</DialogTitle>
            <DialogDescription>
              {editingChalan 
                ? `Update chalan ${editingChalan.chalanNumber}. Chalan ID and Created Date will be preserved.`
                : "Create a new chalan with project details and items."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedCustomerId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.filter((p) => p.isActive).map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
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
                name="chalanDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chalan Date *</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid="input-chalan-date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Items</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: "", quantity: "1", rate: "0" })}
                    data-testid="button-add-item"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      data-testid={`button-remove-item-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-4 space-y-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Input data-testid={`input-item-description-${index}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  data-testid={`input-item-quantity-${index}`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.rate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rate (Rs.)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  data-testid={`input-item-rate-${index}`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea data-testid="input-notes" {...field} />
                    </FormControl>
                    <FormMessage />
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
                <Button type="submit" disabled={isPending || updateMutation.isPending} data-testid="button-save-chalan">
                  {editingChalan 
                    ? (updateMutation.isPending ? "Updating..." : "Update Chalan")
                    : (isPending ? "Creating..." : "Create Chalan")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {viewingChalan && (
            <ChalanInvoice 
              chalan={viewingChalan} 
              onClose={() => setViewDialogOpen(false)}
              showActions={true}
              viewOnly={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chalan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete chalan "{deletingChalan?.chalanNumber}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingChalan && deleteMutation.mutate(deletingChalan.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
