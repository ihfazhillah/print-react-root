import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import styles from './DataTable.module.css';

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  pagination: PaginationState;
  onPaginationChange: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  pageCount?: number;
  isLoading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  pagination,
  onPaginationChange,
  pageCount,
  isLoading,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    state: { pagination },
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className={styles.loading}>
                Loading…
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                No results.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className={styles.pagination}>
        <button
          onClick={() => onPaginationChange((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
          disabled={pagination.pageIndex === 0}
        >
          ← Prev
        </button>
        <span>Page {pagination.pageIndex + 1}</span>
        <button
          onClick={() => onPaginationChange((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
          disabled={data.length < pagination.pageSize}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
