export { cn } from "cn";

export const formatAadhar = (val: string): string => {
  const cleanVal = val.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < cleanVal.length; i += 4) {
    parts.push(cleanVal.slice(i, i + 4));
  }
  return parts.join(' ');
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

export function formatDisplayDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
