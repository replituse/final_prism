import { format } from "date-fns";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import type { ChalanWithItems } from "@shared/schema";

interface ChalanInvoiceProps {
  chalan: ChalanWithItems;
  onClose?: () => void;
  showActions?: boolean;
  viewOnly?: boolean;
}

export function ChalanInvoice({ chalan, onClose, showActions = true, viewOnly = false }: ChalanInvoiceProps) {
  const { company } = useAuth();

  const formatBreakHours = (value: string | number | null | undefined) => {
    if (!value) return "0:00";
    const strValue = value.toString();
    if (strValue.includes(":")) return strValue;
    
    // Fallback for decimal values
    const decimal = parseFloat(strValue);
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const formatTotalHours = (value: string | number | null | undefined) => {
    if (!value) return "0:00";
    const strValue = value.toString();
    if (strValue.includes(":")) return strValue;

    // Fallback for decimal values
    const decimal = parseFloat(strValue);
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-col max-h-[85vh]">
      <div className="flex-1 overflow-y-auto p-4 print:p-0">
        <div className="max-w-4xl mx-auto bg-white dark:bg-card p-5 print:p-4 print:max-w-none text-sm">
          <div className="border border-foreground/20 p-4 print:border-black">
            <div className="text-center border-b-2 border-foreground/30 pb-4 mb-4">
              <h1 className="text-xl font-bold tracking-wide text-foreground">
                {company?.name || "PRISM Studios"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Post Production Management System
              </p>
              <div className="mt-3 inline-block px-4 py-1.5 bg-primary text-primary-foreground font-semibold tracking-widest text-sm">
                CHALAN / DELIVERY NOTE
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4 items-start">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Bill To</p>
                  <p className="text-sm font-semibold mt-0.5">{chalan.customer?.name}</p>
                  {chalan.customer?.email && (
                    <p className="text-xs text-muted-foreground">{chalan.customer.email}</p>
                  )}
                  {chalan.customer?.phone && (
                    <p className="text-xs text-muted-foreground">{chalan.customer.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Project</p>
                  <p className="text-sm font-medium mt-0.5">{chalan.project?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
                  <div className="mt-0.5">
                    {chalan.isCancelled ? (
                      <Badge variant="destructive" className="text-xs">CANCELLED</Badge>
                    ) : chalan.isRevised ? (
                      <Badge variant="secondary" className="text-xs">REVISED</Badge>
                    ) : (
                      <Badge variant="default" className="text-xs">ACTIVE</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-right">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Chalan Number</p>
                  <p className="text-base font-mono font-bold mt-0.5 text-primary">{chalan.chalanNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Date</p>
                  <p className="text-sm font-medium mt-0.5">{format(new Date(chalan.chalanDate), "PPP")}</p>
                </div>
                {(chalan.fromTime || chalan.actualFromTime) && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Time</p>
                    <div className="mt-0.5 space-y-0.5">
                      {chalan.fromTime && (
                        <p className="text-xs font-mono">
                          Scheduled: {chalan.fromTime?.slice(0, 5)} - {chalan.toTime?.slice(0, 5)}
                        </p>
                      )}
                      {chalan.actualFromTime && (
                        <p className="text-xs font-mono text-green-600 dark:text-green-400">
                          Actual: {chalan.actualFromTime?.slice(0, 5)} - {chalan.actualToTime?.slice(0, 5) || '--:--'}
                        </p>
                      )}
                      {chalan.breakHours && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Break: {formatBreakHours(chalan.breakHours)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {/* Remove duplicate break hours display as it's now in Time section */}
                {/* {chalan.breakHours && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Break Hours</p>
                    <p className="text-sm font-medium mt-0.5">{chalan.breakHours} hrs</p>
                  </div>
                )} */}
              </div>
            </div>


            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Booking Details</p>
              <div className="overflow-x-auto border border-foreground/20 rounded-md">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-foreground/20">
                      <th className="px-3 py-2 text-left font-semibold">Customer</th>
                      <th className="px-3 py-2 text-left font-semibold">Editor</th>
                      <th className="px-3 py-2 text-left font-semibold">Room</th>
                      <th className="px-3 py-2 text-left font-semibold">Booking Time (From-To)</th>
                      <th className="px-3 py-2 text-left font-semibold">Actual Time (From-To)</th>
                      <th className="px-3 py-2 text-left font-semibold">Break Hours</th>
                      <th className="px-3 py-2 text-left font-semibold">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-foreground/20 hover:bg-muted/30">
                      <td className="px-3 py-2">{chalan.customer?.name || "—"}</td>
                      <td className="px-3 py-2">{chalan.editor?.name || chalan.booking?.editor?.name || "—"}</td>
                      <td className="px-3 py-2">{chalan.room?.name || chalan.booking?.room?.name || "—"}</td>
                      <td className="px-3 py-2 font-mono">
                        {chalan.fromTime && chalan.toTime 
                          ? `${chalan.fromTime.slice(0, 5)} - ${chalan.toTime.slice(0, 5)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {chalan.actualFromTime && chalan.actualToTime
                          ? `${chalan.actualFromTime.slice(0, 5)} - ${chalan.actualToTime.slice(0, 5)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono">{formatBreakHours(chalan.breakHours)}</td>
                      <td className="px-3 py-2 font-mono font-semibold">{formatTotalHours(chalan.totalHours)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {chalan.notes && (
              <div className="mb-4 p-3 bg-muted/50 rounded-md">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes / Remarks</p>
                <p className="text-xs">{chalan.notes}</p>
              </div>
            )}

            {chalan.termsAndConditions && (
              <div className="mb-4 p-3 bg-muted/50 rounded-md">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Terms & Conditions</p>
                <p className="text-xs whitespace-pre-wrap">{chalan.termsAndConditions}</p>
              </div>
            )}

            {chalan.isCancelled && chalan.cancelReason && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide mb-1">Cancellation Reason</p>
                <p className="text-xs">{chalan.cancelReason}</p>
              </div>
            )}

            <Separator className="my-4" />

            <div className="pt-2">
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Customer Name", key: "customer-name", value: chalan.customer?.name },
                  { label: "Customer Signature", key: "customer-sig", value: null },
                  { label: "Editor Name", key: "editor-name", value: chalan.editor?.name || chalan.booking?.editor?.name },
                  { label: "Editor Signature", key: "editor-sig", value: null },
                  { label: "Authority Signature", key: "authority-sig", value: null },
                ].map((item) => (
                  <div key={item.key} className="text-center flex flex-col h-full">
                    <div className="flex-1 flex items-end justify-center mb-1">
                      {item.value && (
                        <p className="text-xs font-medium">
                          {item.value}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="h-4" />
                      <div className="border-t-2 border-foreground/50" />
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-foreground/20 text-center text-[10px] text-muted-foreground">
              <p>This is a computer-generated document. No signature is required.</p>
              <p className="mt-0.5">Generated by PRISM Post Production Management System</p>
            </div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center justify-end gap-2 p-3 border-t bg-background print:hidden">
          {!viewOnly && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} data-testid="button-download-pdf">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button size="sm" onClick={handlePrint} data-testid="button-print-invoice">
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onClose} data-testid="button-close-invoice">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
