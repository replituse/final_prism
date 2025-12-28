import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
  isBefore,
  startOfDay,
  setMonth,
  setYear,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Filter,
  EyeOff,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { BookingCard } from "@/components/booking-card";
import { BookingForm } from "@/components/booking-form";
import { PagePermissionGuard } from "@/components/permission-guard";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { showSuccessMessage, showErrorMessage, messages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { BookingWithRelations, Room, Chalan } from "@shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Generate years from 2020 to 2030
const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BookingContent() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [, navigate] = useLocation();
  const { selectedDate, setSelectedDate } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hideCancelled, setHideCancelled] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null);
  const [viewingCancelledBooking, setViewingCancelledBooking] = useState<BookingWithRelations | null>(null);
  const [viewingBookingWithChalan, setViewingBookingWithChalan] = useState<BookingWithRelations | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<BookingWithRelations | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<BookingWithRelations | null>(null);

  const MAX_BOOKINGS_PER_DAY = 2;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const fromDate = format(monthStart, "yyyy-MM-dd");
  const toDate = format(monthEnd, "yyyy-MM-dd");

  const { data: bookings = [], isLoading } = useQuery<BookingWithRelations[]>({
    queryKey: [`/api/bookings?from=${fromDate}&to=${toDate}`],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: chalans = [] } = useQuery<Chalan[]>({
    queryKey: [`/api/chalans?from=${fromDate}&to=${toDate}`],
  });

  const bookingChalanMap = useMemo(() => {
    const map = new Set<number>();
    chalans.forEach((chalan) => {
      if (chalan.bookingId) {
        map.add(chalan.bookingId);
      }
    });
    return map;
  }, [chalans]);

  const hasChalan = (bookingId: number) => bookingChalanMap.has(bookingId);

  const { data: bookingLogs = [] } = useQuery({
    queryKey: [`/api/bookings/${viewingBooking?.id}/logs`],
    enabled: !!viewingBooking && logsDialogOpen,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("POST", `/api/bookings/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/bookings')
      });
      showSuccessMessage(messages.success.deleted("Booking"));
      setCancelDialogOpen(false);
      setCancellingBooking(null);
      setCancelReason("");
    },
    onError: (error: any) => {
      showErrorMessage({
        title: messages.error.delete("Booking").title,
        description: error.message,
      });
    },
  });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (hideCancelled && booking.status === "cancelled") return false;
      if (selectedRoom !== "all" && booking.roomId?.toString() !== selectedRoom) return false;
      if (selectedStatus !== "all" && booking.status !== selectedStatus) return false;
      return true;
    });
  }, [bookings, hideCancelled, selectedRoom, selectedStatus]);

  const getBookingsForDay = (day: Date) => {
    return filteredBookings
      .filter((booking) => isSameDay(new Date(booking.bookingDate), day))
      .sort((a, b) => {
        // Sort by fromTime descending to show latest bookings first
        if (a.fromTime && b.fromTime) {
          return b.fromTime.localeCompare(a.fromTime);
        }
        return 0;
      });
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleEditBooking = (booking: BookingWithRelations) => {
    if (booking.status === "cancelled") {
      setViewingCancelledBooking(booking);
    } else if (hasChalan(booking.id!)) {
      setViewingBookingWithChalan(booking);
    } else {
      setEditingBooking(booking);
      setBookingFormOpen(true);
    }
  };

  const handleViewCancelledBooking = (booking: BookingWithRelations) => {
    setViewingCancelledBooking(booking);
  };

  const handleCancelBooking = (booking: BookingWithRelations) => {
    setCancellingBooking(booking);
    setCancelDialogOpen(true);
  };

  const handleViewLogs = (booking: BookingWithRelations) => {
    setViewingBooking(booking);
    setLogsDialogOpen(true);
  };

  const handleNewBooking = (date?: Date) => {
    setEditingBooking(null);
    // Always set the date: use provided date or default to today
    setSelectedDate(date || new Date());
    setBookingFormOpen(true);
  };

  const handleViewChalan = (booking: BookingWithRelations) => {
    navigate(`/chalan`);
  };

  const handleOpenDayView = (day: Date) => {
    navigate(`/calendar/day/${format(day, "yyyy-MM-dd")}`);
  };

  const statusCounts = useMemo(() => {
    return {
      planning: bookings.filter((b) => b.status === "planning").length,
      tentative: bookings.filter((b) => b.status === "tentative").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  return (
    <div className="flex flex-col h-full">
      <Header title="Booking Calendar" />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[180px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
              Today
            </Button>
            
            {/* Mini Calendar Year/Month Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-calendar-picker">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                  <div className="text-sm font-medium">Jump to Date</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Month</Label>
                      <Select 
                        value={currentMonth.getMonth().toString()} 
                        onValueChange={(value) => {
                          // Normalize to start of month to prevent overflow (e.g., Jan 31 -> Feb would become Mar)
                          const normalized = startOfMonth(currentMonth);
                          setCurrentMonth(setMonth(normalized, parseInt(value)));
                        }}
                      >
                        <SelectTrigger className="w-full" data-testid="select-month-picker">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, index) => (
                            <SelectItem key={month} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Year</Label>
                      <Select 
                        value={currentMonth.getFullYear().toString()} 
                        onValueChange={(value) => {
                          // Normalize to start of month to prevent overflow
                          const normalized = startOfMonth(currentMonth);
                          setCurrentMonth(setYear(normalized, parseInt(value)));
                        }}
                      >
                        <SelectTrigger className="w-full" data-testid="select-year-picker">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-booking-planning/10 border-booking-planning">
                Planning: {statusCounts.planning}
              </Badge>
              <Badge variant="outline" className="bg-booking-tentative/10 border-booking-tentative">
                Tentative: {statusCounts.tentative}
              </Badge>
              <Badge variant="outline" className="bg-booking-confirmed/10 border-booking-confirmed">
                Confirmed: {statusCounts.confirmed}
              </Badge>
              {!hideCancelled && (
                <Badge variant="outline" className="bg-booking-cancelled/10 border-booking-cancelled">
                  Cancelled: {statusCounts.cancelled}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-[160px]" data-testid="filter-room">
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id.toString()}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]" data-testid="filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="hide-cancelled"
              checked={hideCancelled}
              onCheckedChange={(checked) => setHideCancelled(checked as boolean)}
              data-testid="checkbox-hide-cancelled"
            />
            <Label htmlFor="hide-cancelled" className="text-sm cursor-pointer">
              <EyeOff className="h-4 w-4 inline mr-1" />
              Hide Cancelled
            </Label>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenDayView(selectedDate || new Date())}
              data-testid="button-day-view"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Day View
            </Button>
            {canCreate("booking") && (
              <Button onClick={() => handleNewBooking()} data-testid="button-schedule-booking">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Booking
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg sticky top-0 z-30 shadow-sm">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="bg-muted p-2 text-center text-sm font-medium"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg min-h-full">

            {calendarDays.map((day) => {
              const dayBookings = getBookingsForDay(day);
              const visibleBookings = dayBookings.slice(0, MAX_BOOKINGS_PER_DAY);
              const remainingCount = dayBookings.length - MAX_BOOKINGS_PER_DAY;
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isPastDate = isBefore(startOfDay(day), startOfDay(new Date()));
              const canAddBooking = !isPastDate;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "bg-background min-h-[120px] p-1 flex flex-col group",
                    !isCurrentMonth && "bg-muted/30"
                  )}
                  data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm w-7 h-7 flex items-center justify-center rounded-full",
                        isToday && "bg-primary text-primary-foreground font-medium",
                        !isCurrentMonth && "text-muted-foreground",
                        isPastDate && isCurrentMonth && "text-muted-foreground/70"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {canAddBooking && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 invisible group-hover:visible transition-all"
                        onClick={() => handleNewBooking(day)}
                        data-testid={`button-add-booking-${format(day, "yyyy-MM-dd")}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="space-y-1">
                      {visibleBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onEdit={handleEditBooking}
                          onCancel={handleCancelBooking}
                          onViewLogs={handleViewLogs}
                          onViewChalan={handleViewChalan}
                          hasChalan={hasChalan(booking.id)}
                          compact
                        />
                      ))}
                      {remainingCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 text-xs text-muted-foreground"
                          onClick={() => handleOpenDayView(day)}
                          data-testid={`button-more-bookings-${format(day, "yyyy-MM-dd")}`}
                        >
                          +{remainingCount} more
                        </Button>
                      )}
                    </div>
                  </ScrollArea>

                  {dayBookings.length === 0 && canAddBooking && (
                    <div
                      className="flex-1 flex items-center justify-center border border-dashed rounded-md text-xs text-muted-foreground cursor-pointer hover-elevate invisible group-hover:visible transition-all"
                      onClick={() => handleNewBooking(day)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      <BookingForm
        open={bookingFormOpen}
        onOpenChange={(open) => {
          setBookingFormOpen(open);
          if (!open) setEditingBooking(null);
        }}
        booking={editingBooking}
        defaultDate={selectedDate}
        hasChalan={editingBooking ? hasChalan(editingBooking.id!) : false}
      />

      <BookingForm
        open={!!viewingCancelledBooking}
        onOpenChange={(open) => {
          if (!open) setViewingCancelledBooking(null);
        }}
        booking={viewingCancelledBooking}
        readOnly={true}
      />

      <BookingForm
        open={!!viewingBookingWithChalan}
        onOpenChange={(open) => {
          if (!open) setViewingBookingWithChalan(null);
        }}
        booking={viewingBookingWithChalan}
        readOnly={true}
      />

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please provide a reason for cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Booking Details:</p>
              <p className="text-sm text-muted-foreground">
                {cancellingBooking?.customer?.name} - {cancellingBooking?.project?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {cancellingBooking?.bookingDate} ({cancellingBooking?.fromTime} - {cancellingBooking?.toTime})
              </p>
            </div>
            <div>
              <Label htmlFor="cancel-reason">Reason for Cancellation *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1"
                data-testid="input-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
              data-testid="button-cancel-dialog-close"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancellingBooking && cancelReason.trim()) {
                  cancelMutation.mutate({
                    id: cancellingBooking.id,
                    reason: cancelReason,
                  });
                }
              }}
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Logs</DialogTitle>
            <DialogDescription>
              History of changes for this booking.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {Array.isArray(bookingLogs) && bookingLogs.length > 0 ? (
                bookingLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-md bg-muted/50 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(log.createdAt), "PPp")}
                      </span>
                    </div>
                    {log.changes && (
                      <p className="text-muted-foreground text-xs">{log.changes}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No logs available for this booking.
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}


export default function BookingPage() {
  return (
    <PagePermissionGuard module="booking">
      <BookingContent />
    </PagePermissionGuard>
  );
}
