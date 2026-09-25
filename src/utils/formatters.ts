// Formatting utilities for FINVORA Indian Enterprise Finance

/**
 * Format a number as Indian Rupee (INR) currency with Indian numbering system (Lakhs & Crores)
 * Example: 680000 -> ₹6,80,000; 12500000 -> ₹1,25,00,000
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format large INR amounts in compact Lakhs (L) and Crores (Cr)
 * Example: 4500000 -> ₹45.0 L; 18500000 -> ₹1.85 Cr
 */
export function formatINRCompact(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formatted = '';
  if (abs >= 10000000) {
    formatted = `₹${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    formatted = `₹${(abs / 100000).toFixed(1)} L`;
  } else if (abs >= 1000) {
    formatted = `₹${(abs / 1000).toFixed(0)} K`;
  } else {
    formatted = `₹${abs.toFixed(0)}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format date string (YYYY-MM-DD or ISO) to clean readable format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format percentage with positive/negative sign
 */
export function formatPercent(val: number, decimals: number = 1): string {
  if (isNaN(val) || val === null) return '0%';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(decimals)}%`;
}

/**
 * Utility to export an array of JSON objects to downloadable CSV
 */
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data || !data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];
  
  // Header row
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
  
  // Data rows
  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
