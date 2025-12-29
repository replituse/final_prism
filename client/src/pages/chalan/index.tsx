import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useSearch, useLocation } from "wouter";
import { Plus, Trash2, FileText, Eye, X, Pencil, Calendar, Link2, History, ClipboardList, ArrowUp, ArrowDown, Lock } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ChalanInvoice } from "@/components/chalan-invoice";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChalanWithItems, Customer, Project, Booking, ChalanRevision, Room, Editor } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BookingWithRelations extends Booking {
  room?: { name: string };
  customer?: { name: string };
  project?: { name: string };
  editor?: { name: string };
}

const chalanItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.string().default("1"),
  rate: z.string().default("0"),
});

const chalanFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  projectId: z.string().optional().nullable().or(z.literal("")),
  chalanDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  items: z.array(chalanItemSchema).min(1, "At least one item is required"),
  bookingId: z.string().optional(),
  editorId: z.string().optional(),
  roomId: z.string().optional(),
  fromTime: z.string().optional(),
  toTime: z.string().optional(),
  actualFromTime: z.string().optional().nullable().or(z.literal("")),
  actualToTime: z.string().optional().nullable().or(z.literal("")),
  breakHours: z.string().optional().nullable().or(z.literal("")),
  totalHours: z.string().optional().nullable().or(z.literal("")),
});

type ChalanFormValues = z.infer<typeof chalanFormSchema>;

export default function ChalanPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingChalan, setViewingChalan] = useState<ChalanWithItems | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingChalan, setDeletingChalan] = useState<ChalanWithItems | null>(null);
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  const [editingChalan, setEditingChalan] = useState<ChalanWithItems | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyChalan, setHistoryChalan] = useState<ChalanWithItems | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const canEditChalans = user?.role === "admin" || user?.role === "gst" || user?.role === "account";

  const { data: chalansData = [], isLoading } = useQuery<ChalanWithItems[]>({
    queryKey: ["/api/chalans"],
  });

  const chalans = [...chalansData].sort((a, b) => {
    const dateA = new Date(a.chalanDate).getTime();
    const dateB = new Date(b.chalanDate).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  // Get set of booking IDs that already have chalans
  const bookingsWithChalans = new Set(
    chalansData
      .filter(c => c.bookingId && !c.isCancelled)
      .map(c => c.bookingId)
  );

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: bookings = [] } = useQuery<BookingWithRelations[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: chalanRevisions = [] } = useQuery<ChalanRevision[]>({
    queryKey: [`/api/chalans/${historyChalan?.id}/revisions`],
    enabled: !!historyChalan && historyDialogOpen,
  });

  const form = useForm<ChalanFormValues>({
    resolver: zodResolver(chalanFormSchema),
    defaultValues: {
      customerId: "",
      projectId: "",
      chalanDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      items: [{ description: "", quantity: "1", rate: "0" }],
      editorId: "",
      roomId: "",
      fromTime: "",
      toTime: "",
      actualFromTime: "",
      actualToTime: "",
      breakHours: "",
      totalHours: "",
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

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: editors = [] } = useQuery<Editor[]>({
    queryKey: ["/api/editors"],
  });

  const actualFromTime = form.watch("actualFromTime");
  const actualToTime = form.watch("actualToTime");
  const breakHours = form.watch("breakHours");

  useEffect(() => {
    if (actualFromTime && actualToTime) {
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + (minutes || 0);
      };

      const fromMinutes = timeToMinutes(actualFromTime);
      const toMinutes = timeToMinutes(actualToTime);
      const breakMinutes = breakHours ? parseFloat(breakHours) * 60 : 0;

      let diffMinutes = toMinutes - fromMinutes;
      if (diffMinutes < 0) diffMinutes += 24 * 60;

      const totalMinutes = diffMinutes - breakMinutes;
      const totalHours = (totalMinutes / 60).toFixed(2);

      form.setValue("totalHours", totalHours);
    }
  }, [actualFromTime, actualToTime, breakHours, form]);

  useEffect(() => {
    if (editors.length > 0 && user?.fullName && !editingChalan && dialogOpen) {
      const matchingEditor = editors.find(
        editor => editor.name.toLowerCase() === user.fullName?.toLowerCase()
      );
      if (matchingEditor) {
        form.setValue("editorId", matchingEditor.id.toString());
      }
    }
  }, [editors, user?.fullName, editingChalan, dialogOpen, form]);

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
            quantity: (item.quantity ?? "1").toString(),
            rate: (item.rate ?? "0").toString(),
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
      const items = data.items.map((item) => {
        const qty = parseFloat(item.quantity) || 1;
        const rate = parseFloat(item.rate) || 0;
        const amount = qty * rate;
        return {
          description: item.description,
          quantity: qty.toString(),
          rate: rate.toString(),
          amount: amount.toString(),
        };
      });
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

      return apiRequest("POST", "/api/chalans", {
        customerId: parseInt(data.customerId),
        projectId: data.projectId ? parseInt(data.projectId) : null,
        chalanDate: data.chalanDate,
        notes: data.notes,
        totalAmount: totalAmount.toString(),
        items,
        bookingId: selectedBookingId ? parseInt(selectedBookingId) : undefined,
        editorId: data.editorId ? parseInt(data.editorId) : undefined,
        roomId: data.roomId ? parseInt(data.roomId) : undefined,
        fromTime: data.fromTime,
        toTime: data.toTime,
        actualFromTime: data.actualFromTime || null,
        actualToTime: data.actualToTime || null,
        breakHours: data.breakHours || "0",
        totalHours: data.totalHours || "0",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && (query.queryKey[0].startsWith('/api/chalans') || query.queryKey[0] === '/api/bookings')
      });
      toast({ 
        title: "Chalan Generated Successfully", 
        description: "The new chalan has been created and logged.",
        variant: "success"
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Create Chalan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ChalanFormValues & { id: number }) => {
      const items = data.items.map((item) => {
        const qty = parseFloat(item.quantity) || 1;
        const rate = parseFloat(item.rate) || 0;
        const amount = qty * rate;
        return {
          description: item.description,
          quantity: qty.toString(),
          rate: rate.toString(),
          amount: amount.toString(),
        };
      });
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

      return apiRequest("PATCH", `/api/chalans/${data.id}`, {
        customerId: parseInt(data.customerId),
        projectId: data.projectId ? parseInt(data.projectId) : null,
        chalanDate: data.chalanDate,
        notes: data.notes,
        totalAmount: totalAmount.toString(),
        items,
        editorId: data.editorId ? parseInt(data.editorId) : undefined,
        roomId: data.roomId ? parseInt(data.roomId) : undefined,
        fromTime: data.fromTime,
        toTime: data.toTime,
        actualFromTime: data.actualFromTime || null,
        actualToTime: data.actualToTime || null,
        breakHours: data.breakHours || "0",
        totalHours: data.totalHours || "0",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/chalans')
      });
      toast({ 
        title: "Chalan Updated Successfully", 
        description: "The chalan modifications have been saved.",
        variant: "success"
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Update Chalan",
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
        typeof query.queryKey[0] === 'string' && (query.queryKey[0].startsWith('/api/chalans') || query.queryKey[0] === '/api/bookings')
      });
      toast({ 
        title: "Chalan Deleted Successfully", 
        description: "The chalan record has been permanently removed.",
        variant: "destructive"
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Delete Chalan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const statusToggleMutation = useMutation({
    mutationFn: async ({ id, isCancelled }: { id: number; isCancelled: boolean }) => {
      return apiRequest("PATCH", `/api/chalans/${id}/status`, { isCancelled });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/chalans')
      });
      toast({ 
        title: variables.isCancelled ? "Chalan Cancelled" : "Chalan Reactivated",
        description: variables.isCancelled ? "The chalan has been marked as cancelled." : "The chalan has been restored to active status.",
        variant: variables.isCancelled ? "warning" : "success"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Update Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = () => {
    if (!canEditChalans) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create chalans.",
        variant: "destructive",
      });
      return;
    }
    setEditingChalan(null);
    setSelectedBookingId("");
    form.reset({
      customerId: "",
      projectId: "",
      chalanDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      items: [{ description: "", quantity: "1", rate: "0" }],
      editorId: "",
      roomId: "",
      fromTime: "",
      toTime: "",
      actualFromTime: "",
      actualToTime: "",
      breakHours: "",
      totalHours: "",
    });
    setDialogOpen(true);
  };

  const handleBookingSelect = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    if (!bookingId) return;
    
    const booking = bookings.find(b => b.id === parseInt(bookingId));
    if (!booking) return;
    
    // Auto-fill all fields immediately
    form.setValue("customerId", booking.customerId.toString());
    form.setValue("projectId", booking.projectId.toString(), { shouldValidate: true, shouldDirty: true });
    form.setValue("chalanDate", booking.bookingDate);
    form.setValue("notes", booking.notes || "");
    form.setValue("roomId", booking.roomId.toString());
    if (booking.editorId) form.setValue("editorId", booking.editorId.toString());

    // Auto-populate time fields from booking
    if (booking.fromTime) form.setValue("fromTime", booking.fromTime);
    if (booking.toTime) form.setValue("toTime", booking.toTime);
    form.setValue("actualFromTime", booking.actualFromTime || "");
    form.setValue("actualToTime", booking.actualToTime || "");
    form.setValue("breakHours", booking.breakHours?.toString() || "");
    form.setValue("totalHours", booking.totalHours?.toString() || "");

    const hours = Number(booking.totalHours) || 0;
    const roomName = booking.room?.name || "Room booking";
    const editorName = booking.editor?.name || "";
    const description = editorName 
      ? `${roomName} - ${editorName} (${hours} hrs)`
      : `${roomName} (${hours} hrs)`;

    form.setValue("items", [{
      description,
      quantity: (hours > 0 ? hours : 1).toString(),
      rate: "0",
    }]);
  };

  const handleEditChalan = (chalan: ChalanWithItems) => {
    if (!canEditChalans) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit chalans.",
        variant: "destructive",
      });
      return;
    }
    if (chalan.isCancelled) {
      toast({
        title: "Cannot edit cancelled chalan",
        description: "Cancelled chalans are read-only and cannot be modified.",
        variant: "destructive",
      });
      return;
    }
    setEditingChalan(chalan);
    setSelectedBookingId("");
    form.reset({
      customerId: chalan.customerId.toString(),
      projectId: chalan.projectId.toString(),
      chalanDate: chalan.chalanDate,
      notes: chalan.notes || "",
      editorId: chalan.editorId?.toString() || "",
      roomId: chalan.roomId?.toString() || "",
      fromTime: chalan.fromTime || "",
      toTime: chalan.toTime || "",
      actualFromTime: chalan.actualFromTime || "",
      actualToTime: chalan.actualToTime || "",
      breakHours: chalan.breakHours?.toString() || "",
      totalHours: chalan.totalHours?.toString() || "",
      items: chalan.items?.length ? chalan.items.map(item => ({
        description: item.description,
        quantity: (item.quantity ?? "1").toString(),
        rate: (item.rate ?? "0").toString(),
      })) : [{ description: "", quantity: "1", rate: "0" }],
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingChalan(null);
    setSelectedBookingId("");
    form.reset();
  };

  const handleViewChalan = (chalan: ChalanWithItems) => {
    setViewingChalan(chalan);
    setViewDialogOpen(true);
  };

  const onSubmit = (data: ChalanFormValues) => {
    if (!selectedBookingId && !editingChalan) {
      toast({
        title: "Booking Required",
        description: "A confirmed booking must be selected to create a chalan.",
        variant: "destructive",
      });
      return;
    }

    if (editingChalan) {
      updateMutation.mutate({ ...data, id: editingChalan.id });
    } else {
      createMutation.mutate({ ...data, bookingId: selectedBookingId });
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
      key: "editor",
      header: "Editor",
      cell: (row) => row.editor?.name || row.booking?.editor?.name || "-",
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
      key: "isCancelled",
      header: "Status",
      cell: (row) => (
        <div 
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={!row.isCancelled}
            onCheckedChange={(checked) => {
              statusToggleMutation.mutate({ id: row.id, isCancelled: !checked });
            }}
            disabled={statusToggleMutation.isPending}
            data-testid={`switch-status-${row.id}`}
          />
          <span className={`text-sm ${row.isCancelled ? "text-destructive" : "text-muted-foreground"}`}>
            {row.isCancelled ? "Cancelled" : "Active"}
          </span>
        </div>
      ),
    },
  ];

  const isPending = createMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title="Chalan Entry" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button onClick={handleOpenDialog} data-testid="button-create-chalan">
              <Plus className="h-4 w-4 mr-2" />
              Create Chalan
            </Button>
            {chalans.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setLocation("/chalan/revise")}
                data-testid="button-revise-chalan"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Revise Chalan
              </Button>
            )}
          </div>

          {chalans.length === 0 && !isLoading ? (
            <EmptyState
              icon={FileText}
              title="No chalans yet"
              description="Click 'Create Chalan' above to create a new chalan from a confirmed booking."
            />
          ) : (

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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setHistoryChalan(row);
                      setHistoryDialogOpen(true);
                    }}
                    data-testid={`button-history-chalan-${row.id}`}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  {canEditChalans && !row.isCancelled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditChalan(row)}
                      data-testid={`button-edit-chalan-${row.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canEditChalans && (
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
                  )}
                </div>
              )}
            />
          )}
        </div>
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
              {!editingChalan && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-md space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Link2 className="h-4 w-4" />
                      <span>Select confirmed booking to create chalan *</span>
                    </div>
                    <Select value={selectedBookingId} onValueChange={handleBookingSelect}>
                      <SelectTrigger data-testid="select-booking">
                        <SelectValue placeholder="Select a booking..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bookings
                          .filter(b => b.status === "confirmed")
                          .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
                          .slice(0, 50)
                          .map((booking) => {
                            const hasChalan = bookingsWithChalans.has(booking.id);
                            return (
                              <SelectItem 
                                key={booking.id} 
                                value={booking.id.toString()}
                                disabled={hasChalan}
                              >
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(booking.bookingDate), "PP")}</span>
                                  <span className="text-muted-foreground">-</span>
                                  <span>{booking.customer?.name || "Unknown"}</span>
                                  <span className="text-muted-foreground">({booking.room?.name})</span>
                                  {hasChalan && (
                                    <Lock className="h-3 w-3 text-destructive ml-1" />
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!!selectedBookingId || !!editingChalan}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder={!selectedBookingId && !editingChalan ? "Select booking first" : "Select customer"} />
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
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={!!selectedBookingId || !!editingChalan || !selectedCustomerId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder={!selectedBookingId && !editingChalan ? "Select booking first" : "Select project"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
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
                      <Input type="date" data-testid="input-chalan-date" {...field} disabled={true} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Room" 
                          value={rooms.find(r => r.id === parseInt(field.value || "0"))?.name || ""} 
                          disabled={true}
                          data-testid="input-room"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="editorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Editor</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-editor">
                            <SelectValue placeholder="Select editor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {editors.filter((e) => e.isActive).map((editor) => (
                            <SelectItem key={editor.id} value={editor.id.toString()}>
                              {editor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking From Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="HH:MM" 
                          {...field}
                          disabled={true}
                          data-testid="input-from-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking To Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="HH:MM" 
                          {...field}
                          disabled={true}
                          data-testid="input-to-time"
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
                  name="actualFromTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual From Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="HH:MM" 
                          {...field}
                          disabled={true}
                          data-testid="input-actual-from-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualToTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual To Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="HH:MM" 
                          {...field}
                          disabled={true}
                          data-testid="input-actual-to-time"
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
                  name="breakHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="0" 
                          {...field}
                          disabled={true}
                          data-testid="input-break-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="0" 
                          {...field}
                          disabled={true}
                          data-testid="input-total-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

      <Dialog open={historyDialogOpen} onOpenChange={(open) => {
        setHistoryDialogOpen(open);
        if (!open) setHistoryChalan(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Chalan History
            </DialogTitle>
            <DialogDescription>
              Complete history of changes for chalan {historyChalan?.chalanNumber}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">Created</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {historyChalan?.createdAt ? format(new Date(historyChalan.createdAt), "PPp") : "-"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Chalan created for {historyChalan?.customer?.name} - {historyChalan?.project?.name}
                </p>
              </div>
              
              {chalanRevisions.length > 0 ? (
                chalanRevisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="p-3 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">
                        Revision #{revision.revisionNumber}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(revision.createdAt), "PPp")}
                      </span>
                    </div>
                    {revision.changes && (
                      <p className="text-sm text-muted-foreground">{revision.changes}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No revisions yet
                </div>
              )}

              {historyChalan?.isCancelled && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-destructive">Cancelled</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This chalan has been cancelled
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
