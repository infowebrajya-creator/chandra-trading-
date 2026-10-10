export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(timeString?: string): string {
  if (timeString) return timeString;
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function generateInvoiceNumber(prefix: string = 'WR-', lastCount: number = 1000): string {
  const nextNum = lastCount + 1;
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  return `${prefix}${yearSuffix}-${nextNum.toString().padStart(5, '0')}`;
}
