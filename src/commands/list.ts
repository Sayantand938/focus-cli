import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { Session } from '../utils/types.js';
import { format } from 'date-fns';
import Table from 'cli-table3';

export default class List extends Command {
  static description = 'Shows all sessions in a table (formatted times, shortened UUIDs)';

  static examples = [
    `$ focus list`,
  ];

  async run(): Promise<void> {
    const db = new FocusDatabase();
    try {
      const sessions: Session[] = db.getSessions();

      if (sessions.length === 0) {
        this.log('No sessions found.');
        return;
      }

      const table = new Table({
        head: ['ID', 'Date', 'Start Time', 'Stop Time', 'Duration'],
        colAligns: ['center', 'center', 'center', 'center', 'center'],
      });

      sessions.forEach((session) => {
        const hours = session.duration ? Math.floor(session.duration / 3600) : 0;
        const minutes = session.duration ? Math.floor((session.duration % 3600) / 60) : 0;
        const duration = session.duration ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` : '';
        table.push([
          session.id.substring(0, 8),
          format(new Date(session.start_time), 'yyyy-MM-dd'),
          format(new Date(session.start_time), 'hh:mm a'),
          session.stop_time ? format(new Date(session.stop_time), 'hh:mm a') : '',
          duration,
        ]);
      });

      this.log(table.toString());
    } catch (error: any) {
      this.error(`Failed to list sessions: ${error.message}`);
    } finally {
      db.close();
    }
  }
}