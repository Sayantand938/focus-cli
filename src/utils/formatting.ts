// src/utils/formatting.ts
import { format, differenceInSeconds } from 'date-fns';
import humanizeDuration from 'humanize-duration';

export function formatDate(date: Date, formatString: string): string {
  return format(date, formatString);
}

export function formatDuration(durationInSeconds: number): string {
  return humanizeDuration(durationInSeconds * 1000, {
    units: ['h', 'm', 's'],
    round: true,
  });
}

export function getDurationParts(duration: number | null): { hours: number; minutes: number } {
  const hours = duration ? Math.floor(duration / 3600) : 0;
  const minutes = duration ? Math.floor((duration % 3600) / 60) : 0;
  return { hours, minutes };
}

export function formatDurationParts(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}