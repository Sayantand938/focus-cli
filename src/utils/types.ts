// src/utils/types.ts

export interface ListTable {
  id: string;
  start_time: string;
  stop_time: string | null;
  duration: number | null;
}

export interface SummaryTable {
  SL: number;
  Date: string;
  Average: string;
  Total: string;
  Status: string;
}