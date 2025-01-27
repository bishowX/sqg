// app/components/data-table.tsx
"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface DataTableProps<TData> {
  data: TData[];
  sql?: string;
}

export function DataTable<TData>({ data, sql }: DataTableProps<TData>) {
  // Dynamically generate columns from data keys
  const columns =
    data.length > 0
      ? (Object.keys(data[0] as object).map((key) => ({
          accessorKey: key,
          header: key.replace(/_/g, " ").toUpperCase(),
        })) as ColumnDef<TData>[])
      : [];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border bg-background shadow-sm">
      <ScrollArea className="h-[500px] w-full">
        <Table>
          <TableHeader className="sticky top-0 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {sql && (
        <Alert className="mt-4 bg-card">
          <Terminal className="h-4 w-4" />
          <AlertDescription className="font-mono text-sm">
            <span className="text-muted-foreground">Executed SQL:</span>{" "}
            <code className="rounded bg-muted px-2 py-1 text-foreground">
              {sql}
            </code>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
