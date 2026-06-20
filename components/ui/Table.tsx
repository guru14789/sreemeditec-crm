import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  className = '',
  emptyState,
  loading,
}: TableProps<T>) {
  return (
    <div className={`overflow-hidden rounded-card border border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 ${className}`}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`
                    px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    ${col.width ? `w-[${col.width}]` : ''}
                    ${col.className || ''}
                  `}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-100/60 dark:border-slate-800/60">
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-4">
                      <div className="h-4 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  {emptyState || (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest">No data</span>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    border-b border-slate-100/60 dark:border-slate-800/60
                    transition-all duration-[200ms] ease-out
                    ${onRowClick ? 'cursor-pointer' : ''}
                    hover:bg-[#F5F4F1]/80 dark:hover:bg-slate-800/40
                  `}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`
                        px-5 py-4 text-[12px] font-medium text-slate-700 dark:text-slate-300
                        ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                        ${col.className || ''}
                      `}
                    >
                      {col.render ? col.render(item, index) : (item as any)[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
