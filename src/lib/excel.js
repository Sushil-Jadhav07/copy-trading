import * as XLSX from 'xlsx';

const sanitizeSheetName = (name) => String(name || 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1';

const buildColumnWidths = (rows) => {
  const entries = rows.length > 0 ? rows : [{}];
  const keys = Array.from(
    entries.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );

  return keys.map((key) => {
    const maxLength = entries.reduce((width, row) => {
      const value = row?.[key];
      return Math.max(width, String(value ?? '').length);
    }, String(key).length);

    return { wch: Math.min(Math.max(maxLength + 2, 12), 36) };
  });
};

export const buildExportFileName = (label) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${label} - ${day}-${month}-${year}.xlsx`;
};

export const downloadExcelSheet = ({ rows, sheetName, fileName }) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No rows available for export');
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = buildColumnWidths(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName));
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};
