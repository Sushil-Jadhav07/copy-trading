import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

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
    : filteredData;

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
    const styles = {
      Active: 'bg-success/20 text-success',
      Paused: 'bg-warning/20 text-warning',
      Suspended: 'bg-danger/20 text-danger',
      Closed: 'bg-muted text-muted-foreground',
      Pending: 'bg-warning/20 text-warning',
      Executed: 'bg-success/20 text-success',
      Cancelled: 'bg-danger/20 text-danger',
      Completed: 'bg-success/20 text-success',
      Online: 'bg-success/20 text-success',
      Degraded: 'bg-warning/20 text-warning',
      Offline: 'bg-danger/20 text-danger',
      High: 'bg-danger/20 text-danger',
      Medium: 'bg-warning/20 text-warning',
      Low: 'bg-success/20 text-success',
      BUY: 'bg-success/20 text-success',
      SELL: 'bg-danger/20 text-danger',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center gap-4">
          <input
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
                  className={`px-4 py-3 text-left text-sm font-medium text-muted-foreground ${
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
                    <td key={col.key || col.accessor} className="px-4 py-3 text-sm">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-brand-purple text-white'
                    : 'hover:bg-black/10 dark:hover:bg-white/10 text-foreground'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
