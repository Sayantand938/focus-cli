// src/commands/summary.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { parseSortString, SortFlag, SortOption } from '../utils/sort-utils.js';
import { FocusError } from '../utils/error-utils.js';
import { generateAndDisplayTable } from '../utils/table-utils.js';
import {
  parseFilterString,
  summaryFilterSchema,
  FilterOption,
  parseAndValidateFilter,
} from '../utils/filter-utils.js';

interface SummaryFlags {
  sort: SortOption | undefined; // Allow undefined for optional flags
  filter?: string;
}

export default class Summary extends Command {
  static description = 'Shows total & average focus time per day with ✅ or ❌';

  static examples = [
    `$ focus summary`,
    `$ focus summary --sort total:asc`,
    `$ focus summary --sort date:desc`,
    `$ focus summary --filter="total>=2h"`,
    `$ focus summary --filter="average<=45m"`,
  ];

  static flags = {
    sort: SortFlag({
      char: 's',
      description: 'Sort by total, average, or date (e.g., total:asc, date:desc)',
    }),
    filter: Flags.string({
      char: 'f',
      description: 'Filter summary (e.g., total>=2h, average<=30m)',
    }),
  };

  private db: FocusDatabase;

  constructor(argv: string[], config: any, db?: FocusDatabase) {
    super(argv, config);
    this.db = db || new FocusDatabase();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Summary);

    try {
      const parsedFilter = this.parseAndValidateFilter(flags.filter);
      const sortOption = this.getValidSortOption(flags.sort);
      const summaryData = this.fetchSummary(sortOption, parsedFilter);

      if (summaryData.length === 0) {
        this.log('No sessions found.');
        return;
      }

      this.displaySummary(summaryData);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  private parseAndValidateFilter(filter?: string): FilterOption | undefined {
    if (!filter) return undefined;

    try {
      return parseAndValidateFilter(filter, summaryFilterSchema);
    } catch (error: any) {
      throw error instanceof FocusError
        ? error
        : new FocusError(`Invalid filter format: ${error.message}`);
    }
  }

  private getValidSortOption(sortOption?: SortOption): SortOption {
    return sortOption || { field: 'date', order: 'asc' };
  }

  private fetchSummary(sort: SortOption, filter?: FilterOption): any[] {
    return this.db.getSummary(sort, filter);
  }

  private displaySummary(summaryData: any[]): void {
    generateAndDisplayTable(this, summaryData, 'summary');
  }

  private handleError(error: unknown): void {
    if (error instanceof FocusError) {
      this.error(error.message);
    } else if (error instanceof Error) {
      this.error(`Error: ${error.message}`);
    } else {
      this.error('An unexpected error occurred.');
    }
  }

  private cleanup(): void {
    this.db.close();
  }
}