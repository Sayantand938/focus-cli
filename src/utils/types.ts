export interface Session {
  id: string;
  start_time: string;
  stop_time: string | null;
  duration: number | null;
}