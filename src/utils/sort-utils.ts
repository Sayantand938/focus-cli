// src/utils/sort-utils.ts
import { z } from 'zod';
import { Flags } from '@oclif/core'; // Import Flags
import { FocusError } from './error-utils.js';

const sortSchema = z.string().regex(/^(date|duration|total|average)(:(asc|desc))?$/);

export type SortOption = {
  field: 'date' | 'duration' | 'total' | 'average';
  order: 'asc' | 'desc';
} | null;

export function parseSortString(sortString: string | undefined): SortOption {
  if (!sortString) {
    return null;
  }

  try {
    sortSchema.parse(sortString);
    const [field, order] = sortString.split(':');
    return {
      field: field as 'date' | 'duration' | 'total' | 'average',
      order: (order || 'desc') as 'asc' | 'desc',
    };
  } catch (error) {
    throw new FocusError('Invalid sort format. Use date:asc, duration:desc, total:asc, etc., or date/duration/total/average.');
  }
}

// Create a custom flag type for SortOption
export const SortFlag = Flags.custom<SortOption>({
  parse: async (input: string) => parseSortString(input),
});

export function getOrderByClause(sortOption: SortOption, table: 'sessions' | 'summary'): string {
  if (!sortOption) {
    return table === 'sessions' ? 'ORDER BY start_time DESC' : 'ORDER BY Date DESC';
  }

  const sortColumn =
    table === 'sessions'
      ? sortOption.field === 'date'
        ? 'start_time'
        : sortOption.field
      : sortOption.field === 'date'
      ? 'Date'
      : sortOption.field;

  const orderDirection = sortOption.order === 'asc' ? 'ASC' : 'DESC';

  return `ORDER BY ${sortColumn} ${orderDirection}`;
}