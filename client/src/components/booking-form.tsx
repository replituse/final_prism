import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, Customer, Project, Room, Editor, CustomerContact } from "@shared/schema";

const bookingFormSchema = z.object({
  roomId: z.string().min(1, "Room is required"),
  customerId: z.string().min(1, "Customer is required"),
  projectId: z.string().min(1, "Project is required"),
  contactId: z.string().optional(),
  editorId: z.string().optional(),
  bookingDate: z.string().min(1, "Date is required"),
  fromTime: z.string().min(1, "Start time is required"),
  toTime: z.string().min(1, "End time is required"),
  actualFromTime: z.string().optional(),
  actualToTime: z.string().optional(),
  breakHours: z.string().default("0"),
  status: z.enum(["planning", "tentative", "confirmed"]),
  notes: z.string().optional(),
  repeatDays: z.number().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  defaultDate?: Date;
  readOnly?: boolean;
  hasChalan?: boolean;
}

interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{ type: string; booking: any; message: string }>;
  editorOnLeave: boolean;
  leaveInfo?: any;
}

export function BookingForm({ open, onOpenChange, booking, defaultDate, readOnly = false, hasChalan = false }: BookingFormProps) {
  const { toast } = useToast();
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  
  // Lock booking if chalan exists
  const isLocked = hasChalan && booking?.id;

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: open,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const { data: editors = [] } = useQuery<Editor[]>({
    queryKey: ["/api/editors"],
    enabled: open,
  });

  const formatTimeForInput = (timeValue: string | undefined | null): string => {
    if (!timeValue) return "";
    // Handle format "HH:MM:SS" or "HH:MM" from database
    return timeValue.substring(0, 5); // Return only "HH:MM"
  };

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: booking?.roomId?.toString() || "",
      customerId: booking?.customerId?.toString() || "",
      projectId: booking?.projectId?.toString() || "",
      contactId: booking?.contactId?.toString() || "",
      editorId: booking?.editorId?.toString() || "",
      bookingDate: booking?.bookingDate || (defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")),
      fromTime: formatTimeForInput(booking?.fromTime) || "09:00",
      toTime: formatTimeForInput(booking?.toTime) || "18:00",
      actualFromTime: formatTimeForInput(booking?.actualFromTime),
      actualToTime: formatTimeForInput(booking?.actualToTime),
      breakHours: booking?.breakHours?.toString() || "0",
      status: (booking?.status as any) || "planning",
      notes: booking?.notes || "",
    },
  });

  const selectedCustomerId = form.watch("customerId");

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: [`/api/projects?customerId=${selectedCustomerId}`],
    enabled: !!selectedCustomerId,
  });

  const { data: contacts = [] } = useQuery<CustomerContact[]>({
    queryKey: [`/api/customers/${selectedCustomerId}/contacts`],
    enabled: !!selectedCustomerId,
  });

  // Reset form when booking changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        roomId: booking?.roomId?.toString() || "",
        customerId: booking?.customerId?.toString() || "",
        projectId: booking?.projectId?.toString() || "",
        contactId: booking?.contactId?.toString() || "",
        editorId: booking?.editorId?.toString() || "",
        bookingDate: booking?.bookingDate || (defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")),
        fromTime: formatTimeForInput(booking?.fromTime) || "09:00",
        toTime: formatTimeForInput(booking?.toTime) || "18:00",
        actualFromTime: formatTimeForInput(booking?.actualFromTime),
        actualToTime: formatTimeForInput(booking?.actualToTime),
        breakHours: booking?.breakHours?.toString() || "0",
        status: (booking?.status as any) || "planning",
        notes: booking?.notes || "",
      });
    }
  }, [open, booking, defaultDate, form]);

  // Watch for conflict-related fields
  const watchedRoomId = form.watch("roomId");
  const watchedEditorId = form.watch("editorId");
  const watchedBookingDate = form.watch("bookingDate");
  const watchedFromTime = form.watch("fromTime");
  const watchedToTime = form.watch("toTime");

  // Check for conflicts when relevant fields change
  const checkConflicts = useCallback(async () => {
    if (!watchedRoomId || !watchedBookingDate || !watchedFromTime || !watchedToTime) {
      setConflictResult(null);
      return;
    }

    setIsCheckingConflicts(true);
    try {
      const response = await apiRequest("POST", "/api/bookings/check-conflicts", {
        roomId: watchedRoomId,
        editorId: watchedEditorId || undefined,
        bookingDate: watchedBookingDate,
        fromTime: watchedFromTime,
        toTime: watchedToTime,
        excludeBookingId: booking?.id,
      });
      const result = await response.json();
      setConflictResult(result as ConflictResult);
    } catch (error) {
      console.error("Error checking conflicts:", error);
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [watchedRoomId, watchedEditorId, watchedBookingDate, watchedFromTime, watchedToTime, booking?.id]);

  useEffect(() => {
    if (open && watchedRoomId && watchedBookingDate && watchedFromTime && watchedToTime) {
      const timer = setTimeout(() => {
        checkConflicts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, checkConflicts, watchedRoomId, watchedBookingDate, watchedFromTime, watchedToTime]);

  // Reset conflict result when dialog closes
  useEffect(() => {
    if (!open) {
      setConflictResult(null);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      return apiRequest("POST", "/api/bookings", {
        roomId: parseInt(data.roomId),
        customerId: parseInt(data.customerId),
        projectId: parseInt(data.projectId),
        contactId: data.contactId ? parseInt(data.contactId) : null,
        editorId: data.editorId ? parseInt(data.editorId) : null,
        bookingDate: data.bookingDate,
        fromTime: data.fromTime,
        toTime: data.toTime,
        actualFromTime: data.actualFromTime || null,
        actualToTime: data.actualToTime || null,
        breakHours: data.breakHours || "0",
        status: data.status,
        notes: data.notes,
        repeatDays: data.repeatDays,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/bookings')
      });
      toast({ 
        title: "Booking created successfully",
        className: "bg-green-500 text-white border-none"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      // Convert breakHours from HH.mm to a format the server can parse if needed
      // But we'll keep it as string for now and let the server handle it
      return apiRequest("PATCH", `/api/bookings/${booking?.id}`, {
        roomId: parseInt(data.roomId),
        customerId: parseInt(data.customerId),
        projectId: parseInt(data.projectId),
        contactId: data.contactId ? parseInt(data.contactId) : null,
        editorId: data.editorId ? parseInt(data.editorId) : null,
        bookingDate: data.bookingDate,
        fromTime: data.fromTime,
        toTime: data.toTime,
        actualFromTime: data.actualFromTime || null,
        actualToTime: data.actualToTime || null,
        breakHours: data.breakHours || "0",
        status: data.status,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/bookings')
      });
      toast({ 
        title: "Booking updated successfully",
        className: "bg-green-500 text-white border-none"
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormValues) => {
    if (booking) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isFormDisabled = readOnly || isLocked || isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "View Booking (Read Only)" : isLocked ? "View Booking (Locked)" : booking ? "Edit Booking" : "New Booking"}
          </DialogTitle>
          <DialogDescription>
            {readOnly 
              ? "This booking is cancelled and cannot be edited."
              : isLocked
                ? "This booking is linked to a chalan and cannot be edited."
                : booking 
                  ? "Update the booking details below." 
                  : "Fill in the details to create a new booking."}
          </DialogDescription>
        </DialogHeader>

        {conflictResult?.editorOnLeave && (
          <Alert variant="destructive" data-testid="alert-editor-leave">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Editor on Leave</AlertTitle>
            <AlertDescription>
              The selected editor is on leave during this date. Please choose a different editor or date.
            </AlertDescription>
          </Alert>
        )}

        {conflictResult?.hasConflict && (
          <Alert variant="destructive" data-testid="alert-conflicts">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Booking Conflicts ({conflictResult.conflicts.length})</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {conflictResult.conflicts.map((conflict, index) => (
                  <li key={index} className="text-sm">
                    {conflict.message} ({conflict.booking?.fromTime} - {conflict.booking?.toTime})
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isLocked && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Booking Locked</AlertTitle>
                <AlertDescription>
                  This booking is linked to an existing chalan and cannot be edited.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                      <FormControl>
                        <SelectTrigger data-testid="select-room">
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.filter(r => r.isActive).map((room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.name} ({room.roomType})
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
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.filter(c => c.isActive).map((customer) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={readOnly || !selectedCustomerId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.filter(p => p.isActive).map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name} ({project.projectType})
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
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={readOnly || !selectedCustomerId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-contact">
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id.toString()}>
                            {contact.name}
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
              name="editorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Editor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                    <FormControl>
                      <SelectTrigger data-testid="select-editor">
                        <SelectValue placeholder="Select editor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {editors.filter(e => e.isActive).map((editor) => (
                        <SelectItem key={editor.id} value={editor.id.toString()}>
                          {editor.name} ({editor.editorType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bookingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid="input-booking-date" disabled={isFormDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fromTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Time *</FormLabel>
                    <FormControl>
                      <Input type="time" data-testid="input-from-time" disabled={isFormDisabled} {...field} />
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
                    <FormLabel>To Time *</FormLabel>
                    <FormControl>
                      <Input type="time" data-testid="input-to-time" disabled={isFormDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="actualFromTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual From</FormLabel>
                    <FormControl>
                      <Input type="time" data-testid="input-actual-from-time" disabled={isFormDisabled} {...field} />
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
                    <FormLabel>Actual To</FormLabel>
                    <FormControl>
                      <Input type="time" data-testid="input-actual-to-time" disabled={isFormDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="breakHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break Hrs</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        data-testid="input-break-hours"
                        disabled={isFormDisabled}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="tentative">Tentative</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        {readOnly && <SelectItem value="cancelled">Cancelled</SelectItem>}
                      </SelectContent>
                    </Select>
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
                    <Textarea
                      placeholder="Add any additional notes..."
                      className="resize-none"
                      data-testid="input-notes"
                      disabled={isFormDisabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!booking && (
              <FormField
                control={form.control}
                name="repeatDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat for Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0 for no repeat"
                        data-testid="input-repeat-days"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {isFormDisabled ? "Close" : "Cancel"}
              </Button>
              {!isFormDisabled && (
                <Button type="submit" disabled={isPending} data-testid="button-save-booking">
                  {isPending ? "Saving..." : booking ? "Update Booking" : "Create Booking"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
