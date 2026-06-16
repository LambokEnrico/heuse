import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends object>({
  data,
  columns,
  keyField,
  onRowClick,
  emptyMessage = "No data available",
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full caption-bottom">
          <thead>
            <tr className="border-b border-heuse-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-heuse-border">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
                    <div className="h-4 bg-heuse-dark/50 rounded animate-pulse w-20" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <p className="text-heuse-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full caption-bottom">
        <thead>
          <tr className="border-b border-heuse-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className={cn(
                "border-b border-heuse-border transition-colors",
                onRowClick
                  ? "cursor-pointer hover:bg-heuse-dark/50"
                  : ""
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => {
                const value = (item as Record<string, unknown>)[col.key];
                return (
                  <td
                    key={col.key}
                    className={cn(
                      "py-3 px-4 text-sm text-heuse-text",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(item)
                      : String(value ?? "")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}