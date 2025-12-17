import { Clock, User, Building, MoreVertical, X, FileText, Eye, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BookingWithRelations } from "@shared/schema";

interface BookingCardProps {
  booking: BookingWithRelations;
  onEdit?: (booking: BookingWithRelations) => void;
  onCancel?: (booking: BookingWithRelations) => void;
  onViewLogs?: (booking: BookingWithRelations) => void;
  onViewChalan?: (booking: BookingWithRelations) => void;
  hasChalan?: boolean;
  compact?: boolean;
}

// Helper to truncate long names
function truncateName(name: string, maxLength: number = 15): string {
  if (!name) return "Unknown";
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

export function BookingCard({
  booking,
  onEdit,
  onCancel,
  onViewLogs,
  onViewChalan,
  hasChalan = false,
  compact = false,
}: BookingCardProps) {
  const statusColors = {
    planning: "border-l-booking-planning bg-booking-planning/10",
    tentative: "border-l-booking-tentative bg-booking-tentative/10",
    confirmed: "border-l-booking-confirmed bg-booking-confirmed/10",
    cancelled: "border-l-booking-cancelled bg-booking-cancelled/10 opacity-60",
  };

  const statusBadgeVariants = {
    planning: "bg-booking-planning text-white",
    tentative: "bg-booking-tentative text-white",
    confirmed: "bg-booking-confirmed text-white",
    cancelled: "bg-booking-cancelled text-white",
  };

  const isEditable = booking.status !== "cancelled";
  const isCancelled = booking.status === "cancelled";
  const customerName = booking.customer?.name || "Unknown Customer";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative rounded-md border-l-4 p-2 text-left hover-elevate cursor-pointer h-[72px]",
            statusColors[booking.status as keyof typeof statusColors]
          )}
          onClick={() => onEdit?.(booking)}
          data-testid={`booking-card-${booking.id}`}
        >
          {!isEditable && (
            <>
              <div className="absolute inset-0 bg-booking-cancelled/20 pointer-events-none z-10 rounded-md" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-full h-0.5 bg-booking-cancelled transform -rotate-12" />
              </div>
              <div className="absolute top-0 right-0 left-0 flex items-center justify-center pointer-events-none z-20">
                <Badge className="text-[10px] px-1.5 py-0 gap-1 rounded-b-md rounded-t-none bg-booking-cancelled text-white">
                  <Lock className="h-2.5 w-2.5" />
                  View Only
                </Badge>
              </div>
            </>
          )}
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0 overflow-hidden">
              <p 
                className={cn("text-sm font-medium truncate", !isEditable && "line-through text-muted-foreground")}
                title={customerName}
              >
                {truncateName(customerName, 12)}
              </p>
            </div>
            
            {isEditable ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`booking-menu-${booking.id}`}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewLogs?.(booking);
                    }}
                    data-testid={`booking-logs-${booking.id}`}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Logs
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChalan?.(booking);
                    }}
                    data-testid={`booking-view-chalan-${booking.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Chalan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel?.(booking);
                    }}
                    data-testid={`booking-cancel-${booking.id}`}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div 
                className="h-6 w-6 shrink-0 flex-shrink-0 flex items-center justify-center opacity-30"
                aria-hidden="true"
              >
                <MoreVertical className="h-3 w-3" />
              </div>
            )}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            <div className="font-mono">
              {booking.fromTime?.slice(0, 5)} - {booking.toTime?.slice(0, 5)}
            </div>
            {(booking.actualFromTime || booking.actualToTime) && (
              <div className="font-mono text-green-600 dark:text-green-400">
                {booking.actualFromTime?.slice(0, 5) || '--:--'} - {booking.actualToTime?.slice(0, 5) || '--:--'}
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-2">
          <div>
            <p className="font-medium">{booking.customer?.name}</p>
            <p className="text-sm text-muted-foreground">{booking.project?.name}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Scheduled: {booking.fromTime?.slice(0, 5)} - {booking.toTime?.slice(0, 5)}</span>
            </div>
            {(booking.actualFromTime || booking.actualToTime) && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Clock className="h-4 w-4" />
                <span>Actual: {booking.actualFromTime?.slice(0, 5) || '--:--'} - {booking.actualToTime?.slice(0, 5) || '--:--'}</span>
              </div>
            )}
          </div>
          {booking.room && (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4" />
              <span>{booking.room.name}</span>
            </div>
          )}
          {booking.editor && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>{booking.editor.name}</span>
            </div>
          )}
          <Badge className={cn("text-xs", statusBadgeVariants[booking.status as keyof typeof statusBadgeVariants])}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
