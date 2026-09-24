import { cn } from '@/lib/cn';

/**
 * columns: [{ key, header, render?: (row) => node, className?, srOnlyHeader? }]
 * Handles loading / error / empty rows so feature tables only describe their columns.
 */
export function DataTable({ columns, rows, getRowKey = (row) => row.id, isLoading, error, emptyMessage = 'Nothing here yet.', compact = false, className }) {
  const span = columns.length;
  let body;
  if (isLoading) body = <StateRow span={span}>Loading...</StateRow>;
  else if (error) body = <StateRow span={span} className="error-text">{error.message}</StateRow>;
  else if (!rows?.length) body = <StateRow span={span}>{emptyMessage}</StateRow>;
  else {
    body = rows.map((row) => (
      <tr key={getRowKey(row)}>
        {columns.map((column) => (
          <td key={column.key} className={column.className}>{column.render ? column.render(row) : row[column.key]}</td>
        ))}
      </tr>
    ));
  }

  return (
    <div className={cn('table-wrap', className)}>
      <table className={cn(compact && 'compact')}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.className}>
                {column.srOnlyHeader ? <span className="sr-only">{column.header}</span> : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={isLoading || undefined}>{body}</tbody>
      </table>
    </div>
  );
}

function StateRow({ span, className, children }) {
  return <tr><td colSpan={span} className={cn('empty-state', className)}>{children}</td></tr>;
}
