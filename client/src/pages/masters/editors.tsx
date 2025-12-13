import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, UserCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormDescription,
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
import type { Editor } from "@shared/schema";

const EDITOR_TYPES = [
  { value: "video", label: "Video Editor" },
  { value: "audio", label: "Audio Editor" },
  { value: "vfx", label: "VFX Artist" },
  { value: "colorist", label: "Colorist" },
  { value: "di", label: "DI (Digital Intermediate)" },
];

const editorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  editorType: z.enum(["video", "audio", "vfx", "colorist", "di"]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  joinDate: z.string().optional(),
  leaveDate: z.string().optional(),
  isActive: z.boolean().default(true),
  ignoreConflict: z.boolean().default(false),
});

type EditorFormValues = z.infer<typeof editorFormSchema>;

export default function EditorsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEditor, setEditingEditor] = useState<Editor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEditor, setDeletingEditor] = useState<Editor | null>(null);

  const { data: editors = [], isLoading } = useQuery<Editor[]>({
    queryKey: ["/api/editors"],
  });

  const form = useForm<EditorFormValues>({
    resolver: zodResolver(editorFormSchema),
    defaultValues: {
      name: "",
      editorType: "video",
      phone: "",
      email: "",
      joinDate: "",
      leaveDate: "",
      isActive: true,
      ignoreConflict: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EditorFormValues) => {
      return apiRequest("POST", "/api/editors", {
        ...data,
        joinDate: data.joinDate || null,
        leaveDate: data.leaveDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editors"] });
      toast({ title: "Editor created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating editor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditorFormValues) => {
      return apiRequest("PATCH", `/api/editors/${editingEditor?.id}`, {
        ...data,
        joinDate: data.joinDate || null,
        leaveDate: data.leaveDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editors"] });
      toast({ title: "Editor updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating editor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/editors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editors"] });
      toast({ title: "Editor deleted successfully" });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting editor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      setTogglingId(id);
      return apiRequest("PATCH", `/api/editors/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editors"] });
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

  const handleOpenDialog = (editor?: Editor) => {
    if (editor) {
      setEditingEditor(editor);
      form.reset({
        name: editor.name,
        editorType: editor.editorType as any,
        phone: editor.phone || "",
        email: editor.email || "",
        joinDate: editor.joinDate || "",
        leaveDate: editor.leaveDate || "",
        isActive: editor.isActive,
        ignoreConflict: editor.ignoreConflict,
      });
    } else {
      setEditingEditor(null);
      form.reset({
        name: "",
        editorType: "video",
        phone: "",
        email: "",
        joinDate: "",
        leaveDate: "",
        isActive: true,
        ignoreConflict: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEditor(null);
    form.reset();
  };

  const onSubmit = (data: EditorFormValues) => {
    if (editingEditor) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: Column<Editor>[] = [
    {
      key: "name",
      header: "Editor Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.name}</span>
          {row.ignoreConflict && (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              No Conflict
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "editorType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline">
          {EDITOR_TYPES.find((t) => t.value === row.editorType)?.label || row.editorType}
        </Badge>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row) => row.phone || "-",
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => row.email || "-",
    },
    {
      key: "joinDate",
      header: "Join Date",
      cell: (row) => row.joinDate ? format(new Date(row.joinDate), "PP") : "-",
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
      <Header title="Editor Master" />

      <div className="flex-1 p-6 overflow-auto">
        {editors.length === 0 && !isLoading ? (
          <EmptyState
            icon={UserCircle}
            title="No editors yet"
            description="Add your first editor to assign them to bookings."
            actionLabel="Add Editor"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-editor">
                <Plus className="h-4 w-4 mr-2" />
                Add Editor
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={editors}
              isLoading={isLoading}
              searchPlaceholder="Search editors..."
              onRowClick={handleOpenDialog}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(row)}
                    data-testid={`button-edit-editor-${row.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingEditor(row);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-editor-${row.id}`}
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
              {editingEditor ? "Edit Editor" : "Add Editor"}
            </DialogTitle>
            <DialogDescription>
              {editingEditor
                ? "Update editor information."
                : "Add a new editor to the system."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Editor Name *</FormLabel>
                    <FormControl>
                      <Input data-testid="input-editor-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="editorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Editor Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-editor-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EDITOR_TYPES.map((type) => (
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input data-testid="input-phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" data-testid="input-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Join Date</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-join-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leaveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Date</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-leave-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-6">
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

                <FormField
                  control={form.control}
                  name="ignoreConflict"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-ignore-conflict"
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="!mt-0">Ignore Conflicts</FormLabel>
                        <FormDescription className="text-xs">
                          Allow overlapping bookings
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-editor">
                  {isPending ? "Saving..." : editingEditor ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Editor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingEditor?.name}"? This action cannot be undone.
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
              onClick={() => deletingEditor && deleteMutation.mutate(deletingEditor.id)}
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
