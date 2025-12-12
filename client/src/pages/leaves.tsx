import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { Plus, Pencil, Trash2, UserMinus, Calendar, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EditorLeave, Editor } from "@shared/schema";

const leaveFormSchema = z.object({
  editorId: z.string().min(1, "Editor is required"),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  reason: z.string().optional(),
});

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

type LeaveWithEditor = EditorLeave & { editor?: Editor };

export default function LeavesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveWithEditor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLeave, setDeletingLeave] = useState<LeaveWithEditor | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLeave, setHistoryLeave] = useState<LeaveWithEditor | null>(null);

  const { data: leaves = [], isLoading } = useQuery<LeaveWithEditor[]>({
    queryKey: ["/api/editor-leaves"],
  });

  const { data: editors = [] } = useQuery<Editor[]>({
    queryKey: ["/api/editors"],
  });

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      editorId: "",
      fromDate: "",
      toDate: "",
      reason: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeaveFormValues) => {
      return apiRequest("POST", "/api/editor-leaves", {
        editorId: parseInt(data.editorId),
        fromDate: data.fromDate,
        toDate: data.toDate,
        reason: data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor-leaves"] });
      toast({ title: "Leave created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating leave",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LeaveFormValues) => {
      return apiRequest("PATCH", `/api/editor-leaves/${editingLeave?.id}`, {
        editorId: parseInt(data.editorId),
        fromDate: data.fromDate,
        toDate: data.toDate,
        reason: data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor-leaves"] });
      toast({ title: "Leave updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating leave",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/editor-leaves/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor-leaves"] });
      toast({ title: "Leave deleted successfully" });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting leave",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (leave?: LeaveWithEditor) => {
    if (leave) {
      setEditingLeave(leave);
      form.reset({
        editorId: leave.editorId.toString(),
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        reason: leave.reason || "",
      });
    } else {
      setEditingLeave(null);
      form.reset({
        editorId: "",
        fromDate: "",
        toDate: "",
        reason: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLeave(null);
    form.reset();
  };

  const onSubmit = (data: LeaveFormValues) => {
    if (editingLeave) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: Column<LeaveWithEditor>[] = [
    {
      key: "editor",
      header: "Editor",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <UserMinus className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.editor?.name || "Unknown"}</span>
        </div>
      ),
    },
    {
      key: "fromDate",
      header: "From Date",
      cell: (row) => (
        <span className="font-mono text-sm">
          {format(new Date(row.fromDate), "PP")}
        </span>
      ),
    },
    {
      key: "toDate",
      header: "To Date",
      cell: (row) => (
        <span className="font-mono text-sm">
          {format(new Date(row.toDate), "PP")}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      cell: (row) => {
        const days = differenceInDays(new Date(row.toDate), new Date(row.fromDate)) + 1;
        return (
          <Badge variant="secondary">
            {days} day{days > 1 ? "s" : ""}
          </Badge>
        );
      },
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.reason || "-"}
        </span>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title="Leaves Entry" />

      <div className="flex-1 p-6 overflow-auto">
        {leaves.length === 0 && !isLoading ? (
          <EmptyState
            icon={Calendar}
            title="No leaves recorded"
            description="Add editor leave records to track their availability."
            actionLabel="Add Leave"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-leave">
                <Plus className="h-4 w-4 mr-2" />
                Add Leave
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={leaves}
              isLoading={isLoading}
              searchPlaceholder="Search leaves..."
              onRowClick={handleOpenDialog}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setHistoryLeave(row);
                      setHistoryDialogOpen(true);
                    }}
                    data-testid={`button-history-leave-${row.id}`}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(row)}
                    data-testid={`button-edit-leave-${row.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingLeave(row);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-leave-${row.id}`}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLeave ? "Edit Leave" : "Add Leave"}
            </DialogTitle>
            <DialogDescription>
              {editingLeave
                ? "Update leave information."
                : "Record a new leave for an editor."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="editorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Editor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Date *</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-from-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Date *</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-to-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for leave..."
                        data-testid="input-reason"
                        {...field}
                      />
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
                <Button type="submit" disabled={isPending} data-testid="button-save-leave">
                  {isPending ? "Saving..." : editingLeave ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Leave</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave record? This action cannot be undone.
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
              onClick={() => deletingLeave && deleteMutation.mutate(deletingLeave.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={(open) => {
        setHistoryDialogOpen(open);
        if (!open) setHistoryLeave(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Leave History
            </DialogTitle>
            <DialogDescription>
              Complete history of this leave record
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">Created</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {historyLeave?.createdAt ? format(new Date(historyLeave.createdAt), "PPp") : "-"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Leave created for {historyLeave?.editor?.name || "Unknown editor"}
                </p>
              </div>
              
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">Leave Period</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {historyLeave?.fromDate ? format(new Date(historyLeave.fromDate), "PP") : "-"} to {historyLeave?.toDate ? format(new Date(historyLeave.toDate), "PP") : "-"}
                </p>
                {historyLeave && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Duration: {differenceInDays(new Date(historyLeave.toDate), new Date(historyLeave.fromDate)) + 1} days
                  </p>
                )}
              </div>

              {historyLeave?.reason && (
                <div className="p-3 rounded-md bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">Reason</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{historyLeave.reason}</p>
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
