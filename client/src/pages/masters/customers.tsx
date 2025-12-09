import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Users, Phone, Mail, User, X, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { DataTable, Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { CustomerWithContacts, Customer, CustomerContact } from "@shared/schema";

const DEFAULT_DESIGNATIONS = [
  "Director",
  "Producer",
  "Executive Producer",
  "Line Producer",
  "Production Manager",
  "Production Coordinator",
  "Post-Production Supervisor",
  "Editor",
  "Sound Designer",
  "Colorist",
  "VFX Supervisor",
  "Creative Director",
  "Marketing Head",
  "Finance Manager",
  "Accounts Manager",
  "CEO",
  "CFO",
  "COO",
  "Managing Director",
  "General Manager",
];

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  designation: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstNumber: z.string().optional(),
  isActive: z.boolean().default(true),
  contacts: z.array(contactSchema).optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function CustomersPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithContacts | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [customDesignations, setCustomDesignations] = useState<string[]>([]);
  const [addDesignationDialogOpen, setAddDesignationDialogOpen] = useState(false);
  const [newDesignation, setNewDesignation] = useState("");
  const [designationPopoverOpen, setDesignationPopoverOpen] = useState<{[key: number]: boolean}>({});

  const allDesignations = useMemo(() => {
    const combined = [...DEFAULT_DESIGNATIONS, ...customDesignations];
    return [...new Set(combined)].sort();
  }, [customDesignations]);

  const handleAddDesignation = () => {
    if (newDesignation.trim() && !allDesignations.includes(newDesignation.trim())) {
      setCustomDesignations(prev => [...prev, newDesignation.trim()]);
      toast({ title: `Designation "${newDesignation.trim()}" added` });
    }
    setNewDesignation("");
    setAddDesignationDialogOpen(false);
  };

  const { data: customers = [], isLoading } = useQuery<CustomerWithContacts[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      companyName: "",
      address: "",
      phone: "",
      email: "",
      gstNumber: "",
      isActive: true,
      contacts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      return apiRequest("POST", "/api/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      return apiRequest("PATCH", `/api/customers/${editingCustomer?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (customer?: CustomerWithContacts) => {
    if (customer) {
      setEditingCustomer(customer);
      form.reset({
        name: customer.name,
        companyName: customer.companyName || "",
        address: customer.address || "",
        phone: customer.phone || "",
        email: customer.email || "",
        gstNumber: customer.gstNumber || "",
        isActive: customer.isActive,
        contacts: customer.contacts?.map(c => ({
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          designation: c.designation || "",
          isPrimary: c.isPrimary,
        })) || [],
      });
    } else {
      setEditingCustomer(null);
      form.reset({
        name: "",
        companyName: "",
        address: "",
        phone: "",
        email: "",
        gstNumber: "",
        isActive: true,
        contacts: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCustomer(null);
    form.reset();
  };

  const onSubmit = (data: CustomerFormValues) => {
    if (editingCustomer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: Column<CustomerWithContacts>[] = [
    {
      key: "name",
      header: "Customer Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "companyName",
      header: "Company",
      cell: (row) => row.companyName || "-",
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row) => row.phone || "-",
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => row.email || "-",
    },
    {
      key: "contacts",
      header: "Contacts",
      cell: (row) => (
        <Badge variant="secondary">
          {row.contacts?.length || 0} contacts
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title="Customer Master" />

      <div className="flex-1 p-6 overflow-auto">
        {customers.length === 0 && !isLoading ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer to get started with bookings."
            actionLabel="Add Customer"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-customer">
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={customers}
              isLoading={isLoading}
              searchPlaceholder="Search customers..."
              onRowClick={handleOpenDialog}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(row)}
                    data-testid={`button-edit-customer-${row.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingCustomer(row);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-customer-${row.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Update customer information and contacts."
                : "Add a new customer with their contact details."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input data-testid="input-customer-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-company-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea data-testid="input-address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input data-testid="input-phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" data-testid="input-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl>
                        <Input data-testid="input-gst" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 pt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Contact Persons</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        name: "",
                        phone: "",
                        email: "",
                        designation: "",
                        isPrimary: false,
                      })
                    }
                    data-testid="button-add-contact"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Contact
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-contact-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input data-testid={`input-contact-name-${index}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.designation`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Designation</FormLabel>
                              <Popover 
                                open={designationPopoverOpen[index] || false} 
                                onOpenChange={(open) => setDesignationPopoverOpen(prev => ({...prev, [index]: open}))}
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "justify-between font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      data-testid={`select-contact-designation-${index}`}
                                    >
                                      {field.value || "Select designation"}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[250px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search designation..." data-testid={`input-designation-search-${index}`} />
                                    <CommandList>
                                      <CommandEmpty>No designation found.</CommandEmpty>
                                      <CommandGroup>
                                        {allDesignations.map((designation) => (
                                          <CommandItem
                                            key={designation}
                                            value={designation}
                                            onSelect={() => {
                                              field.onChange(designation);
                                              setDesignationPopoverOpen(prev => ({...prev, [index]: false}));
                                            }}
                                            data-testid={`option-designation-${designation.toLowerCase().replace(/\s+/g, '-')}`}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === designation ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {designation}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                      <CommandSeparator />
                                      <CommandGroup>
                                        <CommandItem
                                          onSelect={() => {
                                            setDesignationPopoverOpen(prev => ({...prev, [index]: false}));
                                            setAddDesignationDialogOpen(true);
                                          }}
                                          className="text-primary"
                                          data-testid={`button-add-new-designation-${index}`}
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          Add Designation
                                        </CommandItem>
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input data-testid={`input-contact-phone-${index}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" data-testid={`input-contact-email-${index}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.isPrimary`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid={`checkbox-contact-primary-${index}`}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Primary Contact</FormLabel>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-customer">
                  {isPending ? "Saving..." : editingCustomer ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCustomer?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDesignationDialogOpen} onOpenChange={setAddDesignationDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Designation</DialogTitle>
            <DialogDescription>
              Enter a new designation to add to the list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter designation name"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddDesignation();
                }
              }}
              data-testid="input-new-designation"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewDesignation("");
                setAddDesignationDialogOpen(false);
              }}
              data-testid="button-cancel-add-designation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDesignation}
              disabled={!newDesignation.trim()}
              data-testid="button-confirm-add-designation"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
