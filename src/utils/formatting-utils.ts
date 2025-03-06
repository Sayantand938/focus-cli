// src/utils/formatting.ts
import { format, isValid, parse } from 'date-fns';
import humanizeDuration from 'humanize-duration';
import { FocusError } from './error-utils.js';

export function formatDate(date: Date, formatString: string): string {
  if (!isValid(date)) {
    throw new FocusError('Invalid date provided.');
  }
  return format(date, formatString);
}

export function formatDuration(durationInSeconds: number): string {
  if (durationInSeconds < 0) {
    throw new FocusError('Duration cannot be negative.');
  }
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
  if (hours < 0 || minutes < 0 || minutes > 59) {
    throw new FocusError('Hours and minutes must be non-negative, and minutes must be less than 60.');
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseTimeStringToDate(timeString: string): Date {
  const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
  const match = timeString.trim().match(timeRegex);

  if (!match) {
    throw new FocusError('Invalid time format. Please use "HH:MM AM/PM".');
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0; // Midnight

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new FocusError('Invalid time. Hours must be between 0 and 23, and minutes between 0 and 59.');
  }

  const now = new Date();
  const parsedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

  if (!isValid(parsedTime)) {
    throw new FocusError('Invalid time.');
  }
  return parsedTime;
}