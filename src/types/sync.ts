import type { SyncStatus } from './inspection';

export interface SyncQueueItem {
  id: string; // queue item ID or inspection ID
  inspectionId: string;
  queuedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  status: SyncStatus;
  errorMessage?: string;
}

export interface SyncResult {
  success: boolean;
  inspectionId: string;
  syncedAt?: number;
  error?: string;
}

export interface SyncSummary {
  pendingCount: number;
  syncingCount: number;
  syncedCount: number;
  failedCount: number;
  totalCount: number;
}
