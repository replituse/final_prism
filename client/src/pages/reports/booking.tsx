import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { CalendarDays, Download, Clock, Building, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PagePermissionGuard } from "@/components/permission-guard";
import type { BookingWithRelations, Customer, Room } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "planning", label: "Planning" },
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

function BookingReportContent() {
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [hideCancelled, setHideCancelled] = useState(false);

  const bookingQueryParams = new URLSearchParams({
    from: fromDate,
    to: toDate,
    ...(selectedCustomer !== "all" && { customerId: selectedCustomer }),
    ...(selectedRoom !== "all" && { roomId: selectedRoom }),
    ...(selectedStatus !== "all" && { status: selectedStatus }),
  }).toString();

  const { data: bookings = [], isLoading } = useQuery<BookingWithRelations[]>({
    queryKey: [`/api/bookings?${bookingQueryParams}`],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const filteredBookings = hideCancelled
    ? bookings.filter((b) => b.status !== "cancelled")
    : bookings;

  const handleExport = () => {
    const csvContent = filteredBookings.map((b) =>
      `${b.bookingDate},${b.customer?.name},${b.project?.name},${b.room?.name},${b.fromTime}-${b.toTime},${b.status}`
    ).join("\n");

    const blob = new Blob(
      [`Date,Customer,Project,Room,Time,Status\n${csvContent}`],
      { type: "text/csv" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-report-${fromDate}-${toDate}.csv`;
    a.click();
  };

  const statusColors = {
    planning: "bg-booking-planning text-white",
    tentative: "bg-booking-tentative text-white",
    confirmed: "bg-booking-confirmed text-white",
    cancelled: "bg-booking-cancelled text-white",
  };

  const columns: Column<BookingWithRelations>[] = [
    {
      key: "bookingDate",
      header: "Date",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-sm">
          {format(new Date(row.bookingDate), "PP")}
        </span>
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
      key: "room",
      header: "Room",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Building className="h-3 w-3 text-muted-foreground" />
          {row.room?.name || "-"}
        </div>
      ),
    },
    {
      key: "time",
      header: "Time",
      cell: (row) => (
        <span className="font-mono text-sm">
          {row.fromTime?.slice(0, 5)} - {row.toTime?.slice(0, 5)}
        </span>
      ),
    },
    {
      key: "editor",
      header: "Editor",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          {row.editor?.name || "-"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={statusColors[row.status as keyof typeof statusColors]}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
  ];

  const totalHours = filteredBookings.reduce((sum, b) => sum + (b.totalHours || 0), 0);
  const confirmedCount = filteredBookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Booking Report" />

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
                  <Label>Customer</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder="All customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                  <Label htmlFor="hide-cancelled" className="cursor-pointer">
                    Hide Cancelled
                  </Label>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExport}
                  disabled={filteredBookings.length === 0}
                  data-testid="button-export"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{filteredBookings.length}</p>
                    <p className="text-xs text-muted-foreground">Total Bookings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-booking-confirmed/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-booking-confirmed" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{confirmedCount}</p>
                    <p className="text-xs text-muted-foreground">Confirmed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{totalHours}</p>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {isLoading ? (
              <DataTable columns={columns} data={[]} isLoading={true} />
            ) : filteredBookings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No bookings found"
                description="No bookings match the selected filters."
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredBookings}
                searchPlaceholder="Search bookings..."
                exportable
                onExport={handleExport}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function BookingReportPage() {
  return (
    <PagePermissionGuard module="booking-report">
      <BookingReportContent />
    </PagePermissionGuard>
  );
}
