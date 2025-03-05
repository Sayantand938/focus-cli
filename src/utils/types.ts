// src/utils/types.ts

export interface Session {
  id: string;
  start_time: string;
  stop_time: string | null;
  duration: number | null;
}

export interface SummaryRow {
  SL: number;
  Date: string;
  Average: string;
  Total: string;
  Status: string;
}