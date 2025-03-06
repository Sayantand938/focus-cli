// src/utils/filter-utils.ts
import { z } from 'zod';
import { FocusError } from './error-utils.js';
import { parseDurationStringToSeconds } from './duration-parser.js';

// Zod schema for session filter
export const sessionFilterSchema = z.object({
  field: z.literal('duration'),
  operator: z.enum(['>=', '<=', '=', '>', '<']),
  value: z.string().refine(
    (value) => {
      try {
        parseDurationStringToSeconds(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid duration format. Examples: 1h, 30m, 1h30m' }
  ),
});

// Zod schema for summary filter
export const summaryFilterSchema = z.object({
  field: z.enum(['total', 'average']),
  operator: z.enum(['>=', '<=', '=', '>', '<']),
  value: z.string().refine(
    (value) => {
      try {
        parseDurationStringToSeconds(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid duration format. Examples: 1h, 30m, 1h30m' }
  ),
});

export type FilterOption = {
  field: string;
  operator: string;
  value: number;
};

export function parseFilterString(input: string, schema: typeof sessionFilterSchema | typeof summaryFilterSchema): string {
  try {
    const match = input.match(/^(duration|total|average)\s*([>=<!]=?)\s*(.+)$/);
    if (!match) {
      throw new FocusError('Invalid filter format');
    }

    const [, field, operator, value] = match;
    schema.parse({ field, operator, value }); // Validate using provided schema
    return input;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new FocusError(error.errors.map((e) => e.message).join('\n'));
    } else if (error instanceof FocusError) {
      throw error;
    } else if (error instanceof Error) {
      throw new FocusError(`Invalid filter: ${error.message}`);
    } else {
      throw new FocusError('Invalid filter: An unexpected error occurred.');
    }
  }
}

export function getWhereClause(filter?: FilterOption): string {
  if (!filter) return '';
  return `WHERE ${filter.field} ${filter.operator} ?`;
}

export function getHavingClause(filter?: FilterOption): string {
  if (!filter) return '';

  const filterField =
    filter.field === 'total'
      ? 'SUM(duration)'
      : filter.field === 'average'
      ? 'AVG(duration)'
      : '';

  if (!filterField) return '';

  return `HAVING ${filterField} ${filter.operator} ?`;
}

export function parseAndValidateFilter(input: string, schema: typeof sessionFilterSchema | typeof summaryFilterSchema): FilterOption {
  const parsedInput = parseFilterString(input, schema);

  const match = parsedInput.match(/^(duration|total|average)\s*([>=<!]=?)\s*(.+)$/);
  if (!match) {
    throw new FocusError('Invalid filter format');
  }

  const [, field, operator, valueString] = match;
  const value = parseDurationStringToSeconds(valueString);
  return { field, operator, value };
}