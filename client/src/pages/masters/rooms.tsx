import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Building2, Users, Loader2 } from "lucide-react";
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
import type { Room } from "@shared/schema";

const ROOM_TYPES = [
  { value: "sound", label: "Sound" },
  { value: "music", label: "Music" },
  { value: "vfx", label: "VFX" },
  { value: "client_office", label: "Client Office" },
  { value: "editing", label: "Editing" },
  { value: "dubbing", label: "Dubbing" },
  { value: "mixing", label: "Mixing" },
];

const roomFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  roomType: z.enum(["sound", "music", "vfx", "client_office", "editing", "dubbing", "mixing"]),
  capacity: z.string().optional(),
  isActive: z.boolean().default(true),
  ignoreConflict: z.boolean().default(false),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

export default function RoomsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      roomType: "sound",
      capacity: "1",
      isActive: true,
      ignoreConflict: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoomFormValues) => {
      return apiRequest("POST", "/api/rooms", {
        ...data,
        capacity: data.capacity ? parseInt(data.capacity) : 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Room created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RoomFormValues) => {
      return apiRequest("PATCH", `/api/rooms/${editingRoom?.id}`, {
        ...data,
        capacity: data.capacity ? parseInt(data.capacity) : 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Room updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Room deleted successfully" });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      setTogglingId(id);
      return apiRequest("PATCH", `/api/rooms/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
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

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      form.reset({
        name: room.name,
        roomType: room.roomType as any,
        capacity: room.capacity?.toString() || "1",
        isActive: room.isActive,
        ignoreConflict: room.ignoreConflict || false,
      });
    } else {
      setEditingRoom(null);
      form.reset({
        name: "",
        roomType: "sound",
        capacity: "1",
        isActive: true,
        ignoreConflict: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRoom(null);
    form.reset();
  };

  const onSubmit = (data: RoomFormValues) => {
    if (editingRoom) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: Column<Room>[] = [
    {
      key: "name",
      header: "Room Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "roomType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline">
          {ROOM_TYPES.find((t) => t.value === row.roomType)?.label || row.roomType}
        </Badge>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.capacity || 1}</span>
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
      <Header title="Room Master" />

      <div className="flex-1 p-6 overflow-auto">
        {rooms.length === 0 && !isLoading ? (
          <EmptyState
            icon={Building2}
            title="No rooms yet"
            description="Add your first room to enable bookings."
            actionLabel="Add Room"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-room">
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={rooms}
              isLoading={isLoading}
              searchPlaceholder="Search rooms..."
              onRowClick={handleOpenDialog}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(row)}
                    data-testid={`button-edit-room-${row.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingRoom(row);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-room-${row.id}`}
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
              {editingRoom ? "Edit Room" : "Add Room"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom
                ? "Update room information."
                : "Add a new room for bookings."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Name *</FormLabel>
                    <FormControl>
                      <Input data-testid="input-room-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-room-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROOM_TYPES.map((type) => (
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
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        data-testid="input-capacity" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-4">
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
                      <FormLabel className="!mt-0">Ignore Conflict</FormLabel>
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
                <Button type="submit" disabled={isPending} data-testid="button-save-room">
                  {isPending ? "Saving..." : editingRoom ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingRoom?.name}"? This action cannot be undone.
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
              onClick={() => deletingRoom && deleteMutation.mutate(deletingRoom.id)}
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
