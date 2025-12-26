import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { UserCog, Download, Clock, Film } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { PagePermissionGuard } from "@/components/permission-guard";
import type { Editor, BookingWithRelations } from "@shared/schema";

interface EditorReport {
  editor: Editor;
  bookings: BookingWithRelations[];
  totalHours: number;
  projectCount: number;
}

function EditorReportContent() {
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedEditor, setSelectedEditor] = useState<string>("all");

  const editorQueryParams = new URLSearchParams({
    from: fromDate,
    to: toDate,
    ...(selectedEditor !== "all" && { editorId: selectedEditor }),
  }).toString();

  const { data: editorReports = [], isLoading } = useQuery<EditorReport[]>({
    queryKey: [`/api/reports/editors?${editorQueryParams}`],
  });

  const { data: editors = [] } = useQuery<Editor[]>({
    queryKey: ["/api/editors"],
  });

  const handleExport = () => {
    const csvContent = editorReports.flatMap((report) =>
      report.bookings.map((b) =>
        `${report.editor.name},${b.bookingDate},${b.project?.name},${b.fromTime}-${b.toTime},${b.totalHours || 0}`
      )
    ).join("\n");

    const blob = new Blob(
      [`Editor,Date,Project,Time,Hours\n${csvContent}`],
      { type: "text/csv" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `editor-report-${fromDate}-${toDate}.csv`;
    a.click();
  };

  const totalHours = editorReports.reduce((sum, r) => sum + r.totalHours, 0);
  const totalBookings = editorReports.reduce((sum, r) => sum + r.bookings.length, 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Editor Report" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4 print:hidden">
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
                  disabled={editorReports.length === 0}
                  data-testid="button-export"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserCog className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{editorReports.length}</p>
                    <p className="text-xs text-muted-foreground">Editors</p>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Film className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{totalBookings}</p>
                    <p className="text-xs text-muted-foreground">Total Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 print:col-span-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-48" />
                  </Card>
                ))}
              </div>
            ) : editorReports.length === 0 ? (
              <EmptyState
                icon={UserCog}
                title="No data found"
                description="No editor data matches the selected filters."
              />
            ) : (
              <div className="space-y-6">
                <div className="print:block hidden text-center mb-8">
                  <h1 className="text-2xl font-bold">Editor Report</h1>
                  <p className="text-muted-foreground">
                    {format(new Date(fromDate), "PPP")} - {format(new Date(toDate), "PPP")}
                  </p>
                </div>

                {editorReports.map((report) => (
                  <Card key={report.editor.id} className="print:break-inside-avoid">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <UserCog className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>{report.editor.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {report.editor.editorType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {report.totalHours} hours
                          </Badge>
                          <Badge variant="outline">
                            <Film className="h-3 w-3 mr-1" />
                            {report.projectCount} projects
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.bookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell className="font-mono text-sm">
                                {format(new Date(booking.bookingDate), "PP")}
                              </TableCell>
                              <TableCell>{booking.customer?.name}</TableCell>
                              <TableCell>{booking.project?.name}</TableCell>
                              <TableCell>{booking.room?.name}</TableCell>
                              <TableCell className="font-mono text-sm">
                                <div>{booking.fromTime?.slice(0, 5)} - {booking.toTime?.slice(0, 5)}</div>
                                {(booking.actualFromTime || booking.actualToTime) && (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    Actual: {booking.actualFromTime?.slice(0, 5) || '--:--'} - {booking.actualToTime?.slice(0, 5) || '--:--'}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {booking.totalHours || 0}
                              </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function EditorReportPage() {
  return (
    <PagePermissionGuard module="editor-report">
      <EditorReportContent />
    </PagePermissionGuard>
  );
}
