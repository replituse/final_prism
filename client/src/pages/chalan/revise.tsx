import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardList, FileText, Clock, ArrowLeft, Save, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChalanWithItems, ChalanRevision } from "@shared/schema";

export default function ChalanRevisePage() {
  const { toast } = useToast();
  const [selectedChalan, setSelectedChalan] = useState<ChalanWithItems | null>(null);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [editingItems, setEditingItems] = useState<Array<{ id?: number; description: string; quantity: string; rate: string }>>([]);
  const [editingNotes, setEditingNotes] = useState("");

  const { data: chalans = [], isLoading } = useQuery<ChalanWithItems[]>({
    queryKey: ["/api/chalans"],
  });

  const { data: revisions = [] } = useQuery<ChalanRevision[]>({
    queryKey: [`/api/chalans/${selectedChalan?.id}/revisions`],
    enabled: !!selectedChalan,
  });

  const reviseMutation = useMutation({
    mutationFn: async ({ chalanId, items, notes, changes }: { chalanId: number; items: any[]; notes: string; changes: string }) => {
      return apiRequest("PATCH", `/api/chalans/${chalanId}`, { 
        items,
        notes,
        revisions: [{ changes }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/chalans')
      });
      toast({ title: "Revision saved successfully" });
      setReviseDialogOpen(false);
      setEditingItems([]);
      setEditingNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error saving revision",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ chalanId, reason }: { chalanId: number; reason: string }) => {
      return apiRequest("POST", `/api/chalans/${chalanId}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/chalans')
      });
      toast({ title: "Chalan cancelled successfully" });
      setSelectedChalan(null);
      setCancelDialogOpen(false);
      setCancelReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error cancelling chalan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const columns: Column<ChalanWithItems>[] = [
    {
      key: "chalanNumber",
      header: "Chalan No.",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{row.chalanNumber}</span>
        </div>
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
      key: "chalanDate",
      header: "Date",
      cell: (row) => (
        <span className="font-mono text-sm">
          {format(new Date(row.chalanDate), "PP")}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Amount",
      cell: (row) => (
        <span className="font-mono font-medium">
          Rs. {(row.totalAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "revisions",
      header: "Revisions",
      cell: (row) => (
        <Badge variant="outline">
          {row.revisions?.length || 0} revision{(row.revisions?.length || 0) !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "isCancelled",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isCancelled ? "destructive" : "default"}>
          {row.isCancelled ? "Cancelled" : "Active"}
        </Badge>
      ),
    },
  ];

  // Full-screen detail view when a chalan is selected
  if (selectedChalan) {
    return (
      <div className="flex flex-col h-full">
        <Header title={`Chalan: ${selectedChalan.chalanNumber}`} />

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Back button and actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Button
                variant="ghost"
                onClick={() => setSelectedChalan(null)}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setEditingItems(selectedChalan.items?.map(item => ({
                      id: item.id,
                      description: item.description,
                      quantity: item.quantity.toString(),
                      rate: item.rate.toString(),
                    })) || []);
                    setEditingNotes(selectedChalan.notes || "");
                    setReviseDialogOpen(true);
                  }}
                  disabled={selectedChalan.isCancelled}
                  data-testid="button-revise"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Revision
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={selectedChalan.isCancelled || cancelMutation.isPending}
                  data-testid="button-cancel-chalan"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Chalan
                </Button>
              </div>
            </div>

            {/* Status badge if cancelled */}
            {selectedChalan.isCancelled && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Cancelled</Badge>
                    {selectedChalan.cancelReason && (
                      <span className="text-sm text-muted-foreground">
                        Reason: {selectedChalan.cancelReason}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chalan Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Chalan Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Chalan Number</p>
                      <p className="font-mono font-medium text-lg">{selectedChalan.chalanNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-mono">{format(new Date(selectedChalan.chalanDate), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{selectedChalan.customer?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Project</p>
                      <p className="font-medium">{selectedChalan.project?.name || "-"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-mono font-bold text-2xl">
                      Rs. {(selectedChalan.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  {selectedChalan.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{selectedChalan.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Items Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    {selectedChalan.items && selectedChalan.items.length > 0 ? (
                      <div className="space-y-3">
                        {selectedChalan.items.map((item, index) => (
                          <div
                            key={item.id || index}
                            className="p-3 rounded-md bg-muted/50 space-y-1"
                          >
                            <p className="font-medium">{item.description}</p>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>Qty: {item.quantity} x Rs. {item.rate}</span>
                              <span className="font-mono font-medium">Rs. {item.amount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-sm text-muted-foreground">No items</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Revision History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Revision History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revisions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {revisions.map((revision) => (
                      <div
                        key={revision.id}
                        className="p-4 rounded-md bg-muted/50 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="outline">
                            Revision #{revision.revisionNumber}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {format(new Date(revision.createdAt), "PPp")}
                          </span>
                        </div>
                        {revision.changes && (
                          <p className="text-sm">{revision.changes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No revisions yet. Click "Create Revision" to record changes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Revision Edit Dialog */}
        <Dialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Revision - {selectedChalan?.chalanNumber}</DialogTitle>
              <DialogDescription>
                Edit items, quantity, rate, and notes to create a revision.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-6 pr-4">
                {/* Items Section */}
                <div>
                  <h3 className="font-semibold mb-4">Items</h3>
                  <div className="space-y-4">
                    {editingItems.map((item, index) => (
                      <Card key={item.id || index}>
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => {
                                const updated = [...editingItems];
                                updated[index].description = e.target.value;
                                setEditingItems(updated);
                              }}
                              data-testid={`input-item-description-${index}`}
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...editingItems];
                                  updated[index].quantity = e.target.value;
                                  setEditingItems(updated);
                                }}
                                data-testid={`input-item-quantity-${index}`}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Rate (Rs.)</Label>
                              <Input
                                type="number"
                                value={item.rate}
                                onChange={(e) => {
                                  const updated = [...editingItems];
                                  updated[index].rate = e.target.value;
                                  setEditingItems(updated);
                                }}
                                data-testid={`input-item-rate-${index}`}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <Label htmlFor="revision-notes">Notes</Label>
                  <Textarea
                    id="revision-notes"
                    placeholder="Add any additional notes..."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="mt-1"
                    data-testid="input-revision-notes"
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReviseDialogOpen(false);
                  setEditingItems([]);
                  setEditingNotes("");
                }}
                data-testid="button-cancel-revision-dialog"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedChalan) {
                    reviseMutation.mutate({
                      chalanId: selectedChalan.id,
                      items: editingItems.map(item => ({
                        id: item.id,
                        description: item.description,
                        quantity: parseFloat(item.quantity) || 0,
                        rate: parseFloat(item.rate) || 0,
                        amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
                      })),
                      notes: editingNotes,
                      changes: `Updated items and notes`,
                    });
                  }
                }}
                disabled={reviseMutation.isPending}
                data-testid="button-save-revision"
              >
                {reviseMutation.isPending ? "Saving..." : "Save Revision"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Chalan</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel chalan {selectedChalan.chalanNumber}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="cancel-reason">Cancellation Reason</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1"
                data-testid="input-cancel-reason"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancelReason("")} data-testid="button-cancel-dialog-back">
                Go Back
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (cancelReason.trim()) {
                    cancelMutation.mutate({ chalanId: selectedChalan.id, reason: cancelReason });
                  }
                }}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-cancel-chalan"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Chalan"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List view when no chalan is selected
  return (
    <div className="flex flex-col h-full">
      <Header title="Chalan Revise" />

      <div className="flex-1 p-6 overflow-auto">
        {chalans.length === 0 && !isLoading ? (
          <EmptyState
            icon={ClipboardList}
            title="No chalans to revise"
            description="Create chalans first to be able to revise them."
          />
        ) : (
          <DataTable
            columns={columns}
            data={chalans}
            isLoading={isLoading}
            searchPlaceholder="Search chalans..."
            onRowClick={setSelectedChalan}
          />
        )}
      </div>
    </div>
  );
}
