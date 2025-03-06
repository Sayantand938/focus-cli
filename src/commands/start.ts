// src/commands/start.ts
import { Command } from '@oclif/core';
import { v4 as uuidv4 } from 'uuid';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';
import { formatDate } from '../utils/formatting-utils.js';

export default class Start extends Command {
  static description = 'Starts a focus session and logs the start time.';

  static examples = [
    `$ focus start`,
  ];

  private db: FocusDatabase;

  constructor(argv: string[], config: any, db?: FocusDatabase) {
    super(argv, config);
    // Use dependency injection for the database
    this.db = db || new FocusDatabase();
  }

  async run(): Promise<void> {
    try {
      const sessionId = this.generateSessionId();
      const startTime = this.getCurrentTime();

      await this.validateNoActiveSession();
      await this.createAndLogSession(sessionId, startTime);

    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  private generateSessionId(): string {
    return uuidv4();
  }

  private getCurrentTime(): string {
    return new Date().toISOString();
  }

  private async validateNoActiveSession(): Promise<void> {
    const existingSession = this.db.getOpenSession();
    if (existingSession) {
      throw new FocusError(
        `There is already an active session (ID: ${existingSession.id.substring(0, 8)}). Stop it first.`
      );
    }
  }

  private async createAndLogSession(sessionId: string, startTime: string): Promise<void> {
    this.db.createSession(sessionId, startTime);
    const formattedTime = formatDate(new Date(startTime), 'MMM dd yyyy, hh:mm:ss a');
    this.log(`Focus session started at ${formattedTime} with ID: ${sessionId.substring(0, 8)}`);
  }

  private handleError(error: any): void {
    if (error instanceof FocusError) {
      this.error(error.message);
    } else {
      this.error(`Failed to start session: ${error.message}`);
    }
  }

  private cleanup(): void {
    this.db.close();
  }
}