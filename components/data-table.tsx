'use client';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
export function DataTable({ data, columns }: { data: any[]; columns: ColumnDef<any>[] }) {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is intentionally used for the operator data grid.
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return <div className="overflow-hidden rounded-xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-muted/60">{table.getHeaderGroups().map((hg) => <tr key={hg.id}>{hg.headers.map((h) => <th className="px-4 py-3" key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr className="border-t border-border" key={row.id}>{row.getVisibleCells().map((cell) => <td className="px-4 py-3 text-slate-300" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>;
}
