import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { FileSpreadsheet, Download, Eye, Pencil, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/export-utils";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ChalanInvoice } from "@/components/chalan-invoice";
import { PagePermissionGuard } from "@/components/permission-guard";
import { useLocation } from "wouter";
import type { ChalanWithItems, Customer } from "@shared/schema";

function ChalanReportContent() {
  const [, navigate] = useLocation();
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingChalan, setViewingChalan] = useState<ChalanWithItems | null>(null);

  const chalanQueryParams = new URLSearchParams({
    from: fromDate,
    to: toDate,
    ...(selectedCustomer !== "all" && { customerId: selectedCustomer }),
  }).toString();

  const { data: chalans = [], isLoading } = useQuery<ChalanWithItems[]>({
    queryKey: [`/api/chalans?${chalanQueryParams}`],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredChalans = showCancelled
    ? chalans
    : chalans.filter((c) => !c.isCancelled);

  const handleExport = () => {
    const exportData = filteredChalans.map((c) => ({
      "Chalan No": c.chalanNumber,
      "Date": c.chalanDate,
      "Customer": c.customer?.name || "-",
      "Project": c.project?.name || "-",
      "Editor": c.editor?.name || c.booking?.editor?.name || "-",
      "Room": c.booking?.room?.name || "-",
      "From Time": c.fromTime || "-",
      "To Time": c.toTime || "-",
      "Actual From": c.actualFromTime || "-",
      "Actual To": c.actualToTime || "-",
      "Break Hours": c.breakHours || "0",
      "Total Hours": c.totalHours || "0",
      "Amount": c.totalAmount,
      "Status": c.isCancelled ? "Cancelled" : "Active",
      "Notes": c.notes || ""
    }));

    exportToExcel(exportData, `chalan-report-${fromDate}-${toDate}`);
  };

  const handleViewChalan = (chalan: ChalanWithItems) => {
    setViewingChalan(chalan);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = (chalan: ChalanWithItems) => {
    setViewingChalan(chalan);
    setViewDialogOpen(true);
    setTimeout(() => window.print(), 100);
  };

  const handleEditChalan = (chalan: ChalanWithItems) => {
    // Navigate to chalan management page with edit mode
    navigate(`/chalan?edit=${chalan.id}`);
  };

  const totalAmount = filteredChalans.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0);
  const cancelledCount = chalans.filter((c) => c.isCancelled).length;

  const columns: Column<ChalanWithItems>[] = [
    {
      key: "chalanNumber",
      header: "Chalan No.",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-medium">{row.chalanNumber}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      cell: (row) => row.customer?.name || "-",
    },
    {
      key: "project",
      header: "Project",
      sortable: true,
      cell: (row) => row.project?.name || "-",
    },
    {
      key: "chalanDate",
      header: "Date",
      sortable: true,
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
        <div className="flex items-center gap-1">
          <Badge variant={row.isCancelled ? "destructive" : "default"}>
            {row.isCancelled ? "Cancelled" : "Active"}
          </Badge>
          {row.isCancelled && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
              <Lock className="h-2.5 w-2.5" />
              View Only
            </Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Chalan Report" />

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
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-cancelled"
                    checked={showCancelled}
                    onCheckedChange={(checked) => setShowCancelled(checked as boolean)}
                    data-testid="checkbox-show-cancelled"
                  />
                  <Label htmlFor="show-cancelled" className="cursor-pointer">
                    Show Cancelled
                  </Label>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExport}
                  disabled={filteredChalans.length === 0}
                  data-testid="button-export"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{filteredChalans.length}</p>
                    <p className="text-xs text-muted-foreground">Total Chalans</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-booking-confirmed/10 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-5 w-5 text-booking-confirmed" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold font-mono truncate" title={`Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                      Rs. {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                  </div>
                </div>
                {cancelledCount > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{cancelledCount}</p>
                      <p className="text-xs text-muted-foreground">Cancelled</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {isLoading ? (
              <DataTable columns={columns} data={[]} isLoading={true} />
            ) : filteredChalans.length === 0 ? (
              <EmptyState
                icon={FileSpreadsheet}
                title="No chalans found"
                description="No chalans match the selected filters."
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredChalans}
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
                      onClick={() => handleDownloadPDF(row)}
                      data-testid={`button-download-pdf-${row.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl p-0 print:max-w-none print:m-0 print:shadow-none">
          {viewingChalan && (
            <ChalanInvoice 
              chalan={viewingChalan} 
              onClose={() => setViewDialogOpen(false)}
              showActions={true}
              viewOnly={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


export default function ChalanReportPage() {
  return (
    <PagePermissionGuard module="chalan-report">
      <ChalanReportContent />
    </PagePermissionGuard>
  );
}
