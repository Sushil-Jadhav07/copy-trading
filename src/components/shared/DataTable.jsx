import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { sortByMostRecent } from '@/lib/utils';

const DataTable = ({
  columns,
  data,
  pagination = true,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
  onRowClick,
  rowClassName,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const filteredData = searchable && searchQuery
    ? data.filter((row) =>
        columns.some((col) => {
          const value = col.accessor ? row[col.accessor] : null;
          return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      )
    : data;

  const sortedData = sortConfig.key
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : (() => {
        const accessorKeys = (columns || [])
          .map((col) => col?.accessor)
          .filter(Boolean);
        const dateLikeAccessors = accessorKeys.filter((key) =>
          /(time|date|created|updated|timestamp|triggered|placed)/i.test(String(key))
        );
        const fallbackKeys = ['timestamp', 'createdAt', 'updatedAt', 'time', 'date'];
        const keys = dateLikeAccessors.length > 0 ? dateLikeAccessors : fallbackKeys;
        return sortByMostRecent(filteredData, keys);
      })();

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').trim().toUpperCase();
    const styles = {
      ACTIVE:    'bg-emerald-500 text-white',
      PAUSED:    'bg-amber-500 text-white',
      SUSPENDED: 'bg-rose-500 text-white',
      CLOSED:    'bg-slate-500 text-white',
      PENDING:   'bg-amber-500 text-white',
      EXECUTED:  'bg-emerald-500 text-white',
      SUCCESS:   'bg-emerald-500 text-white',
      CANCELLED: 'bg-rose-500 text-white',
      COMPLETED: 'bg-emerald-500 text-white',
      ONLINE:    'bg-emerald-500 text-white',
      DEGRADED:  'bg-amber-500 text-white',
      OFFLINE:   'bg-rose-500 text-white',
      HIGH:      'bg-rose-500 text-white',
      MEDIUM:    'bg-amber-500 text-white',
      LOW:       'bg-emerald-500 text-white',
      BUY:       'bg-emerald-500 text-white',
      SELL:      'bg-rose-500 text-white',
      FAILED:    'bg-rose-500 text-white',
    };
    return styles[s] || 'bg-slate-500 text-white';
  };

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center gap-4">
          <label htmlFor="datatable-search" className="sr-only">Search</label>
          <input
            id="datatable-search"
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-64 px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-purple/50 transition-colors"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border/50">
              {columns.map((col) => (
                <th
                  key={col.key || col.accessor}
                  className={`px-2 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground ${
                    col.sortable ? 'cursor-pointer hover:text-foreground' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.accessor)}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortConfig.key === col.accessor && (
                      sortConfig.direction === 'asc'
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`border-b border-border/30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-foreground ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${rowClassName ? rowClassName(row) : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key || col.accessor} className="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                      {col.cell ? (
                        col.cell(row)
                      ) : col.accessor ? (
                        col.isStatus || col.isType ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(row[col.accessor])}`}>
                            {row[col.accessor]}
                          </span>
                        ) : col.isPnL ? (
                          <span className={`font-medium ${row[col.accessor] >= 0 ? 'text-success' : 'text-danger'}`}>
                            {row[col.accessor] >= 0 ? '+' : ''}{row[col.accessor]}
                          </span>
                        ) : (
                          row[col.accessor]
                        )
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, sortedData.length)}</span> of <span className="font-medium text-foreground">{sortedData.length}</span> entries
          </p>
          <div className="flex items-center justify-center gap-1.5 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-200/60 dark:border-white/10 shadow-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-foreground" />
            </button>
            
            <div className="flex items-center gap-1.5">
              {totalPages <= 5 ? (
                Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                      currentPage === page
                        ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 scale-105'
                        : 'bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-400 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground border border-slate-200/60 dark:border-white/10'
                    }`}
                  >
                    {page}
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                      currentPage === 1
                        ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 scale-105'
                        : 'bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-400 dark:text-muted-foreground border border-slate-200/60 dark:border-white/10'
                    }`}
                  >
                    1
                  </button>
                  {currentPage > 3 && <span className="text-slate-400 dark:text-muted-foreground px-1 font-bold">...</span>}
                  {currentPage > 2 && currentPage < totalPages - 1 && (
                    <button
                      className="w-10 h-10 rounded-xl text-xs font-black bg-brand-purple text-white shadow-lg shadow-brand-purple/20 scale-105"
                    >
                      {currentPage}
                    </button>
                  )}
                  {currentPage < totalPages - 2 && <span className="text-slate-400 dark:text-muted-foreground px-1 font-bold">...</span>}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                      currentPage === totalPages
                        ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 scale-105'
                        : 'bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-400 dark:text-muted-foreground border border-slate-200/60 dark:border-white/10'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-200/60 dark:border-white/10 shadow-sm"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
