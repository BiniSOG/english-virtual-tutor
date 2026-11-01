import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
  d ? new Intl.DateTimeFormat('en-GB', opts).format(new Date(d)) : '—';

export const formatEtb = (n: number) => `${new Intl.NumberFormat('en-US').format(n)} ETB`;

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const bandLabel = (band: number | null | undefined) => {
  if (band == null) return 'Not yet assessed';
  if (band >= 8.5) return 'Expert';
  if (band >= 7.5) return 'Very good';
  if (band >= 6.5) return 'Competent';
  if (band >= 5.5) return 'Modest+';
  if (band >= 4.5) return 'Limited';
  return 'Beginner';
};

export const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
