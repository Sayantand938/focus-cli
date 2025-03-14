// src/lib/types.ts
export interface Session {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
}

export interface EditOptions {
  // Added EditOptions
  startTime?: string;
  endTime?: string;
  date?: string;
}
