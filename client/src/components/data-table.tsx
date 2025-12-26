import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Download, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  exportable?: boolean;
  onExport?: () => void;
  pageSize?: number;
  enableColumnFilters?: boolean;
  defaultSort?: { key: string; direction: SortDirection };
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "Search...",
  onRowClick,
  actions,
  exportable = false,
  onExport,
  pageSize = 5,
  enableColumnFilters = false,
  defaultSort = { key: "bookingDate", direction: "desc" },
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSort.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort.direction);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Toggle direction: asc <-> desc (simple two-state toggle)
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column: start with ascending
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
    setPage(1); // Reset pagination on sort
  };

  // Helper to extract searchable text from values (handles nested objects)
  const getSearchableValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      // Handle common nested object patterns: customer, project, room, editor, etc.
      const searchableFields = [
        "name",           // customer.name, project.name, room.name, editor.name
        "chalanNumber",   // chalan number
        "description",    // project.description, item descriptions
        "email",          // customer.email
        "type",           // room.type, editor.type
        "projectType",    // project type
        "notes",          // booking/chalan notes
      ];
      const matches: string[] = [];
      for (const field of searchableFields) {
        if (field in value && value[field]) {
          matches.push(String(value[field]));
        }
      }
      return matches.join(" ");
    }
    if (typeof value === "boolean") return value ? "yes" : "no";
    return String(value);
  };

  const filteredData = data.filter((row) => {
    // Global search
    const matchesGlobal = Object.values(row).some((value) =>
      getSearchableValue(value).toLowerCase().includes(search.toLowerCase())
    );

    if (!matchesGlobal) return false;

    // Column filters
    return Object.entries(columnFilters).every(([key, filterValue]) => {
      if (!filterValue) return true;
      const rowValue = row[key];
      return getSearchableValue(rowValue).toLowerCase().includes(filterValue.toLowerCase());
    });
  });

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle nested objects like customer, project, room, editor
      if (aVal && typeof aVal === 'object') {
        if ('name' in aVal) aVal = aVal.name;
        else if ('chalanNumber' in aVal) aVal = aVal.chalanNumber;
      }
      if (bVal && typeof bVal === 'object') {
        if ('name' in bVal) bVal = bVal.name;
        else if ('chalanNumber' in bVal) bVal = bVal.chalanNumber;
      }

      // Special handling for concatenated time string "09:00 - 18:00"
      if (sortColumn === 'time') {
        aVal = a.fromTime || "";
        bVal = b.fromTime || "";
      }

      // Handle dates
      if (sortColumn.toLowerCase().includes('date')) {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      // Handle null/undefined
      if (aVal == null) return sortDirection === "asc" ? 1 : -1;
      if (bVal == null) return sortDirection === "asc" ? -1 : 1;

      // Compare
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === "asc" ? comparison : -comparison;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
            data-testid="input-table-search"
          />
        </div>
        {exportable && onExport && (
          <Button variant="outline" size="sm" onClick={onExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={cn(
                    column.className,
                    "cursor-pointer select-none"
                  )}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex flex-col gap-2 py-2">
                    <div className="flex items-center gap-1">
                      {column.header}
                      <span className="inline-flex">
                        {sortColumn === column.key ? (
                          <ArrowUp 
                            className={cn(
                              "h-4 w-4 text-primary transition-transform duration-200",
                              sortDirection === "desc" && "rotate-180"
                            )} 
                            data-testid={`sort-${sortDirection}-${column.key}`} 
                          />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-muted-foreground opacity-40" data-testid={`sort-none-${column.key}`} />
                        )}
                      </span>
                    </div>
                    {enableColumnFilters && column.key !== "status" && column.key !== "isCancelled" && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Input
                          placeholder={`Filter ${column.header}...`}
                          value={columnFilters[column.key] || ""}
                          onChange={(e) => {
                            setColumnFilters(prev => ({
                              ...prev,
                              [column.key]: e.target.value
                            }));
                            setPage(1);
                          }}
                          className="h-7 text-xs px-2"
                          data-testid={`input-filter-${column.key}`}
                        />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={row.id || index}
                  className={onRowClick ? "cursor-pointer hover-elevate" : ""}
                  onClick={() => onRowClick?.(row)}
                  data-testid={`table-row-${row.id || index}`}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell ? column.cell(row) : row[column.key]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[70px]" data-testid="select-rows-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
