// src/commands/list.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';
import { parseDurationStringToSeconds } from '../utils/duration-parser.js';
import { parseSortString, SortFlag, SortOption } from '../utils/sort-utils.js';
import { generateAndDisplayTable } from '../utils/table-utils.js';
import {
  parseFilterString,
  sessionFilterSchema,
  FilterOption,
  parseAndValidateFilter,
} from '../utils/filter-utils.js';

interface ListFlags {
  sort: SortOption | undefined;
  filter?: string;
}

export default class List extends Command {
  static description = 'Shows all sessions in a table (formatted times, shortened UUIDs).';

  static examples = [
    `$ focus list`,
    `$ focus list --sort=date:asc`,
    `$ focus list --filter="duration>=1h"`,
    `$ focus list --filter="duration<=30m"`,
  ];

  static flags = {
    sort: SortFlag({
      char: 's',
      description: 'Sort by date or duration (e.g., date:asc, duration:desc)',
    }),
    filter: Flags.string({
      char: 'f',
      description: 'Filter sessions (e.g., duration>=1h30m)',
    }),
  };

  private db: FocusDatabase;

  constructor(argv: string[], config: any, db?: FocusDatabase) {
    super(argv, config);
    this.db = db || new FocusDatabase();
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(List);

    try {
      const parsedFilter = this.parseAndValidateFilter(flags.filter);
      const sortOption = this.getValidSortOption(flags.sort);
      const sessions = this.fetchSessions(sortOption, parsedFilter);

      if (sessions.length === 0) {
        this.log('No sessions found.');
        return;
      }

      this.displaySessions(sessions);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  private parseAndValidateFilter(filter?: string): FilterOption | undefined {
    if (!filter) return undefined;

    try {
      return parseAndValidateFilter(filter, sessionFilterSchema);
    } catch (error: any) {
      throw error instanceof FocusError
        ? error
        : new FocusError(`Invalid filter format: ${error.message}`);
    }
  }

  private getValidSortOption(sortOption?: SortOption): SortOption {
    return sortOption || { field: 'date', order: 'asc' };
  }

  private fetchSessions(sort: SortOption, filter?: FilterOption): any[] {
    return this.db.getSessions(sort, filter);
  }

  private displaySessions(sessions: any[]): void {
    generateAndDisplayTable(this, sessions, 'sessions');
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