import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { AlertTriangle, Calendar, Download, Clock, Building, User, Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { BookingForm } from "@/components/booking-form";
import { PagePermissionGuard } from "@/components/permission-guard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BookingWithRelations, Room, Editor } from "@shared/schema";

function ConflictReportContent() {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedEditor, setSelectedEditor] = useState<string>("all");
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingWithRelations | null>(null);

  const conflictQueryParams = new URLSearchParams({
    from: fromDate,
    to: toDate,
    ...(selectedRoom !== "all" && { roomId: selectedRoom }),
    ...(selectedEditor !== "all" && { editorId: selectedEditor }),
  }).toString();

  const { data: conflicts = [], isLoading } = useQuery<{ booking1: BookingWithRelations; booking2: BookingWithRelations }[]>({
    queryKey: [`/api/reports/conflicts?${conflictQueryParams}`],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: editors = [] } = useQuery<Editor[]>({
    queryKey: ["/api/editors"],
  });

  // Mutation to resolve conflict - confirm one booking, cancel the other
  const resolveConflictMutation = useMutation({
    mutationFn: async ({ confirmBookingId, cancelBookingId }: { confirmBookingId: number; cancelBookingId: number }) => {
      // Cancel the other booking with conflict resolution reason
      await apiRequest("POST", `/api/bookings/${cancelBookingId}/cancel`, {
        reason: "Cancelled due to Conflict Resolution"
      });
      return { confirmBookingId, cancelBookingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && 
        (query.queryKey[0].startsWith('/api/bookings') || query.queryKey[0].startsWith('/api/reports/conflicts'))
      });
      toast({ title: "Conflict resolved successfully", description: "The selected booking has been confirmed and the other has been cancelled." });
    },
    onError: (error: any) => {
      toast({
        title: "Error resolving conflict",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirmBooking = (confirmBooking: BookingWithRelations, cancelBooking: BookingWithRelations) => {
    resolveConflictMutation.mutate({
      confirmBookingId: confirmBooking.id,
      cancelBookingId: cancelBooking.id
    });
  };

  const handleUpdateBooking = (booking: BookingWithRelations) => {
    setEditingBooking(booking);
    setBookingFormOpen(true);
  };

  const handleExport = () => {
    const csvContent = conflicts.map(c => 
      `${c.booking1.bookingDate},${c.booking1.room?.name},${c.booking1.fromTime}-${c.booking1.toTime},${c.booking1.customer?.name},${c.booking2.customer?.name}`
    ).join("\n");
    
    const blob = new Blob([`Date,Room,Time,Booking 1,Booking 2\n${csvContent}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conflict-report-${fromDate}-${toDate}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Conflict Report" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    data-testid="input-from-date"
                  />
                </div>
                <div>
                  <Label htmlFor="to-date">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    data-testid="input-to-date"
                  />
                </div>
                <div>
                  <Label>Room</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger data-testid="select-room">
                      <SelectValue placeholder="All rooms" />
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
                </div>
                <div>
                  <Label>Editor</Label>
                  <Select value={selectedEditor} onValueChange={setSelectedEditor}>
                    <SelectTrigger data-testid="select-editor">
                      <SelectValue placeholder="All editors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Editors</SelectItem>
                      {editors.map((editor) => (
                        <SelectItem key={editor.id} value={editor.id.toString()}>
                          {editor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExport}
                  disabled={conflicts.length === 0}
                  data-testid="button-export"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{conflicts.length}</p>
                    <p className="text-sm text-muted-foreground">Conflicts Found</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-32" />
                  </Card>
                ))}
              </div>
            ) : conflicts.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No conflicts found"
                description="There are no booking conflicts in the selected date range."
              />
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict, index) => (
                  <Card key={index} className="border-l-4 border-l-destructive">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Conflict</Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            {format(new Date(conflict.booking1.bookingDate), "PPP")}
                          </span>
                        </div>
                        {conflict.booking1.room && (
                          <Badge variant="outline">
                            <Building className="h-3 w-3 mr-1" />
                            {conflict.booking1.room.name}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-md bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{conflict.booking1.customer?.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {conflict.booking1.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {conflict.booking1.project?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">
                              {conflict.booking1.fromTime?.slice(0, 5)} - {conflict.booking1.toTime?.slice(0, 5)}
                            </span>
                          </div>
                          {conflict.booking1.editor && (
                            <div className="flex items-center gap-2 mt-1 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{conflict.booking1.editor.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleConfirmBooking(conflict.booking1, conflict.booking2)}
                              disabled={resolveConflictMutation.isPending}
                              data-testid={`button-confirm-booking1-${index}`}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Keep This
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBooking(conflict.booking1)}
                              data-testid={`button-update-booking1-${index}`}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Update
                            </Button>
                          </div>
                        </div>

                        <div className="p-3 rounded-md bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{conflict.booking2.customer?.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {conflict.booking2.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {conflict.booking2.project?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">
                              {conflict.booking2.fromTime?.slice(0, 5)} - {conflict.booking2.toTime?.slice(0, 5)}
                            </span>
                          </div>
                          {conflict.booking2.editor && (
                            <div className="flex items-center gap-2 mt-1 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{conflict.booking2.editor.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleConfirmBooking(conflict.booking2, conflict.booking1)}
                              disabled={resolveConflictMutation.isPending}
                              data-testid={`button-confirm-booking2-${index}`}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Keep This
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBooking(conflict.booking2)}
                              data-testid={`button-update-booking2-${index}`}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Update
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Click "Keep This" on the booking you want to confirm. The other booking will be automatically cancelled.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
        defaultDate={editingBooking ? new Date(editingBooking.bookingDate) : undefined}
      />
    </div>
  );
}

export default function ConflictReportPage() {
  return (
    <PagePermissionGuard module="reports">
      <ConflictReportContent />
    </PagePermissionGuard>
  );
}
