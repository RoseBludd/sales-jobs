export interface Job {
  id: string;
  name: string;
  email?: string;
  details: Record<string, string>;
  notes_count: number;
}

export interface CachedData {
  jobs: Job[];
  timestamp: number;
  lastCursor: string | null;
  hasMore: boolean;
  userEmail: string;
}

export type Classification = 'Prospects' | 'Sold' | 'Estimating' | 'Production' | 'Accounting' | 'Completed' | 'Unclassified'; 