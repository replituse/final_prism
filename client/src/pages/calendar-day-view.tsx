import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { format, parseISO, addDays, subDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Clock,
  Building,
  User,
  Film,
  Calendar,
  Plus,
  MoreVertical,
  FileText,
  XCircle,
  Eye,
  History,
  Grid3X3,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { BookingForm } from "@/components/booking-form";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { BookingWithRelations, Chalan } from "@shared/schema";

export default function CalendarDayView() {
  const [, navigate] = useLocation();
  const params = useParams<{ date?: string }>();
  const { setSelectedDate } = useAuth();
  const { toast } = useToast();

  const initialDate = params.date ? parseISO(params.date) : new Date();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<BookingWithRelations | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<BookingWithRelations | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const dateStr = format(currentDate, "yyyy-MM-dd");

  const { data: bookings = [], isLoading } = useQuery<BookingWithRelations[]>({
    queryKey: [`/api/bookings?from=${dateStr}&to=${dateStr}`],
  });

  const { data: bookingLogs = [] } = useQuery({
    queryKey: [`/api/bookings/${viewingBooking?.id}/logs`],
    enabled: !!viewingBooking && logsDialogOpen,
  });

  const bookingProjectIds = useMemo(() => {
    return bookings.map(b => b.projectId).filter(Boolean);
  }, [bookings]);

  const { data: chalans = [] } = useQuery<Chalan[]>({
    queryKey: ["/api/chalans", { projectIds: bookingProjectIds }],
    queryFn: async () => {
      if (bookingProjectIds.length === 0) return [];
      const params = new URLSearchParams();
      bookingProjectIds.forEach(id => params.append("projectId", id!.toString()));
      const response = await fetch(`/api/chalans?${params.toString()}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: bookingProjectIds.length > 0,
  });

  const bookingChalanMap = useMemo(() => {
    const map = new Map<number, Chalan>();
    chalans.forEach((chalan) => {
      if (chalan.bookingId) {
        map.set(chalan.bookingId, chalan);
      }
    });
    return map;
  }, [chalans]);

  const hasChalan = (bookingId: number) => bookingChalanMap.has(bookingId);
  const getChalan = (bookingId: number) => bookingChalanMap.get(bookingId);

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("POST", `/api/bookings/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/bookings')
      });
      toast({ title: "Booking cancelled successfully" });
      setCancelDialogOpen(false);
      setCancellingBooking(null);
      setCancelReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error cancelling booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sortedBookings = useMemo(() => {
    return [...bookings]
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => {
        if (a.fromTime && b.fromTime) {
          return a.fromTime.localeCompare(b.fromTime);
        }
        return 0;
      });
  }, [bookings]);

  const cancelledBookings = useMemo(() => {
    return bookings.filter((b) => b.status === "cancelled");
  }, [bookings]);

  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, BookingWithRelations[]>();
    sortedBookings.forEach((booking) => {
      const roomKey = booking.room?.name || "Unassigned Room";
      if (!map.has(roomKey)) {
        map.set(roomKey, []);
      }
      map.get(roomKey)!.push(booking);
    });
    return map;
  }, [sortedBookings]);

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleBack = () => {
    navigate("/");
  };

  const handleNewBooking = () => {
    setEditingBooking(null);
    setSelectedDate(currentDate);
    setBookingFormOpen(true);
  };

  const handleEditBooking = (booking: BookingWithRelations) => {
    setEditingBooking(booking);
    setBookingFormOpen(true);
  };

  const handleViewLogs = (booking: BookingWithRelations) => {
    setViewingBooking(booking);
    setLogsDialogOpen(true);
  };

  const handleCancelBooking = (booking: BookingWithRelations) => {
    setCancellingBooking(booking);
    setCancelDialogOpen(true);
  };

  const handleCreateChalan = (booking: BookingWithRelations) => {
    navigate(`/chalan?customerId=${booking.customerId}&projectId=${booking.projectId}`);
  };

  const handleViewChalan = (booking: BookingWithRelations) => {
    const chalan = getChalan(booking.id);
    if (chalan) {
      navigate(`/chalan?view=${chalan.id}`);
    }
  };

  const statusColors = {
    planning: "border-l-booking-planning bg-booking-planning/10",
    tentative: "border-l-booking-tentative bg-booking-tentative/10",
    confirmed: "border-l-booking-confirmed bg-booking-confirmed/10",
    cancelled: "border-l-booking-cancelled bg-booking-cancelled/10 opacity-60",
  };

  const statusBadgeColors = {
    planning: "bg-booking-planning text-white",
    tentative: "bg-booking-tentative text-white",
    confirmed: "bg-booking-confirmed text-white",
    cancelled: "bg-booking-cancelled text-white",
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Day View" />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back-to-calendar"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="h-6 w-px bg-border" />

            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              data-testid="button-prev-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[200px]"
                  data-testid="button-date-picker"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(currentDate, "EEEE, MMMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              data-testid="button-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              data-testid="button-today"
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border rounded-md bg-muted/50" data-testid="view-mode-toggle">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-list-view"
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <div className="w-px bg-border" />
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-grid-view"
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleNewBooking} data-testid="button-new-booking">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : sortedBookings.length === 0 && cancelledBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No bookings for this day"
                description={`There are no bookings scheduled for ${format(currentDate, "MMMM d, yyyy")}`}
                actionLabel="Create Booking"
                onAction={handleNewBooking}
              />
            ) : viewMode === "grid" ? (
              // GRID VIEW
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                  {Array.from(bookingsByRoom.entries()).map(([roomName, roomBookings]) => (
                    <div key={roomName} className="border rounded-lg overflow-hidden bg-card">
                      <div className="bg-muted p-3 border-b sticky top-0 z-10">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {roomName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {roomBookings.length} booking{roomBookings.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="space-y-2 p-3">
                        {roomBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className={cn(
                              "p-3 rounded-md border-l-4 bg-muted/30 cursor-pointer hover-elevate transition-colors",
                              statusColors[booking.status as keyof typeof statusColors]
                            )}
                            onClick={() => handleEditBooking(booking)}
                            data-testid={`grid-booking-${booking.id}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Badge
                                className={cn(
                                  "text-xs",
                                  statusBadgeColors[booking.status as keyof typeof statusBadgeColors]
                                )}
                              >
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewLogs(booking);
                                  }}>
                                    <History className="h-4 w-4 mr-2" />
                                    View Logs
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {hasChalan(booking.id) ? (
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewChalan(booking);
                                    }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Chalan
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateChalan(booking);
                                    }}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Create Chalan
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelBooking(booking);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <p className="font-medium text-sm line-clamp-1">
                              {booking.customer?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {booking.fromTime?.slice(0, 5)} - {booking.toTime?.slice(0, 5)}
                            </p>
                            {booking.project && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {booking.project.name}
                              </p>
                            )}
                            {booking.editor && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {booking.editor.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {cancelledBookings.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Cancelled Bookings ({cancelledBookings.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cancelledBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="p-3 rounded-md border-l-4 border-l-booking-cancelled bg-muted/30 opacity-60"
                          data-testid={`grid-cancelled-${booking.id}`}
                        >
                          <Badge variant="secondary" className="text-xs">Cancelled</Badge>
                          <p className="font-medium text-sm line-clamp-1 mt-2 line-through">
                            {booking.customer?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono line-through">
                            {booking.fromTime?.slice(0, 5)} - {booking.toTime?.slice(0, 5)}
                          </p>
                          {booking.cancelReason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {booking.cancelReason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // LIST VIEW
              <div className="space-y-6">
                {sortedBookings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Active Bookings ({sortedBookings.length})
                    </h3>
                    <div className="grid gap-3">
                      {sortedBookings.map((booking) => (
                        <Card
                          key={booking.id}
                          className={cn(
                            "border-l-4",
                            statusColors[booking.status as keyof typeof statusColors]
                          )}
                          data-testid={`day-view-booking-${booking.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div 
                                className="flex-1 min-w-0 cursor-pointer hover-elevate rounded-md p-1 -m-1"
                                onClick={() => handleEditBooking(booking)}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      statusBadgeColors[booking.status as keyof typeof statusBadgeColors]
                                    )}
                                  >
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-sm font-mono">
                                    <Clock className="h-3.5 w-3.5" />
                                    {booking.fromTime?.slice(0, 5)} - {booking.toTime?.slice(0, 5)}
                                  </div>
                                </div>

                                <h4 className="font-medium text-lg mb-1">
                                  {booking.customer?.name || "Unknown Customer"}
                                </h4>

                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                  {booking.project && (
                                    <div className="flex items-center gap-1">
                                      <Film className="h-3.5 w-3.5" />
                                      {booking.project.name}
                                    </div>
                                  )}
                                  {booking.room && (
                                    <div className="flex items-center gap-1">
                                      <Building className="h-3.5 w-3.5" />
                                      {booking.room.name}
                                    </div>
                                  )}
                                  {booking.editor && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3.5 w-3.5" />
                                      {booking.editor.name}
                                    </div>
                                  )}
                                </div>

                                {booking.notes && (
                                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                    {booking.notes}
                                  </p>
                                )}
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-booking-menu-${booking.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewLogs(booking)}>
                                    <History className="h-4 w-4 mr-2" />
                                    View Logs
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {hasChalan(booking.id) ? (
                                    <DropdownMenuItem onClick={() => handleViewChalan(booking)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Chalan
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleCreateChalan(booking)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Create Chalan
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleCancelBooking(booking)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Booking
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {cancelledBookings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Cancelled Bookings ({cancelledBookings.length})
                    </h3>
                    <div className="grid gap-3 opacity-60">
                      {cancelledBookings.map((booking) => (
                        <Card
                          key={booking.id}
                          className="border-l-4 border-l-booking-cancelled"
                          data-testid={`day-view-cancelled-${booking.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Cancelled
                                  </Badge>
                                  <div className="flex items-center gap-1 text-sm font-mono line-through">
                                    <Clock className="h-3.5 w-3.5" />
                                    {booking.fromTime?.slice(0, 5)} - {booking.toTime?.slice(0, 5)}
                                  </div>
                                </div>

                                <h4 className="font-medium line-through">
                                  {booking.customer?.name || "Unknown Customer"}
                                </h4>

                                {booking.cancelReason && (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Reason: {booking.cancelReason}
                                  </p>
                                )}
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewLogs(booking)}>
                                    <History className="h-4 w-4 mr-2" />
                                    View Logs
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <BookingForm
        open={bookingFormOpen}
        onOpenChange={(open) => {
          setBookingFormOpen(open);
          if (!open) setEditingBooking(null);
        }}
        booking={editingBooking}
        defaultDate={currentDate}
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
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Logs</DialogTitle>
            <DialogDescription>
              History of changes for this booking.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 mt-4">
              {Array.isArray(bookingLogs) && bookingLogs.length > 0 ? (
                bookingLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border bg-muted/30 text-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(log.createdAt), "MMM d, yyyy, h:mm a")}
                      </span>
                    </div>
                    {log.changes && (
                      <p className="text-muted-foreground leading-relaxed">{log.changes}</p>
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
