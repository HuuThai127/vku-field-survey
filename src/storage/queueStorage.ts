import { getDatabase } from './indexedDb';
import type { SyncQueueItem, SyncSummary } from '../types/sync';
import type { SyncStatus } from '../types/inspection';

export async function enqueueInspection(inspectionId: string): Promise<SyncQueueItem> {
  const db = await getDatabase();
  const queueItem: SyncQueueItem = {
    id: inspectionId,
    inspectionId,
    queuedAt: Date.now(),
    attempts: 0,
    status: 'PENDING_SYNC'
  };

  await db.put('syncQueue', queueItem);
  return queueItem;
}

export async function getQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDatabase();
  const items = await db.getAllFromIndex('syncQueue', 'by-queuedAt');
  return items;
}

export async function getPendingAndFailedItems(): Promise<SyncQueueItem[]> {
  const db = await getDatabase();
  const all = await db.getAllFromIndex('syncQueue', 'by-queuedAt');
  return all.filter((item) => item.status === 'PENDING_SYNC' || item.status === 'FAILED');
}

export async function updateQueueItemStatus(
  id: string,
  status: SyncStatus,
  errorMessage?: string
): Promise<void> {
  const db = await getDatabase();
  const item = await db.get('syncQueue', id);
  if (!item) return;

  item.status = status;
  item.lastAttemptAt = Date.now();
  if (status === 'SYNCING') {
    item.attempts += 1;
  }
  if (errorMessage !== undefined) {
    item.errorMessage = errorMessage;
  }

  await db.put('syncQueue', item);
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('syncQueue', id);
}

export async function getQueueSummary(): Promise<SyncSummary> {
  const db = await getDatabase();
  const allInspections = await db.getAll('inspections');

  let pendingCount = 0;
  let syncingCount = 0;
  let syncedCount = 0;
  let failedCount = 0;

  for (const ins of allInspections) {
    switch (ins.syncStatus) {
      case 'PENDING_SYNC':
        pendingCount++;
        break;
      case 'SYNCING':
        syncingCount++;
        break;
      case 'SYNCED':
        syncedCount++;
        break;
      case 'FAILED':
        failedCount++;
        break;
    }
  }

  return {
    pendingCount,
    syncingCount,
    syncedCount,
    failedCount,
    totalCount: allInspections.length
  };
}
