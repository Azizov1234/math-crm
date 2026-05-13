import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { uz } from 'date-fns/locale';

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '—';
  return format(date, 'dd.MM.yyyy');
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '—';
  return format(date, 'dd.MM.yyyy HH:mm');
}

export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '—';
  return formatDistanceToNow(date, { addSuffix: true, locale: uz });
}

export function formatMonth(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'MMMM yyyy', { locale: uz });
}
