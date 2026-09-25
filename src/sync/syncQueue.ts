import { inspectionRepository } from '../services/inspectionRepository';
import { getPendingAndFailedItems, updateQueueItemStatus } from '../storage/queueStorage';
import { dispatchInspection } from './serverAdapter';
import { networkService } from '../services/networkService';
import { APP_CONFIG } from '../constants/config';
import type { SyncStatus } from '../types/inspection';
import type { SyncQueueItem } from '../types/sync';

export type QueueEventCallback = (event: {
  type: 'QUEUE_STARTED' | 'ITEM_STATE_CHANGE' | 'QUEUE_COMPLETED' | 'ITEM_ERROR';
  item?: SyncQueueItem;
  status?: SyncStatus;
  error?: string;
  processedCount?: number;
  totalPending?: number;
}) => void;

class SyncQueueManager {
  private isProcessing = false;
  private listeners: Set<QueueEventCallback> = new Set();
  private simulateServerError = false; // Debug toggle for demoing retry / failed states

  constructor() {
    this.init();
  }

  private init() {
    // 1. Listen for network changes: auto-sync when online returns
    networkService.subscribe((status) => {
      if (status.connected) {
        console.log('[SyncQueue] Network is online. Automatically initiating queue processing...');
        this.processQueue();
      }
    });

    // 2. Listen for messages from Service Worker (Background Sync triggers)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'TRIGGER_BACKGROUND_SYNC') {
          console.log('[SyncQueue] Received TRIGGER_BACKGROUND_SYNC from ServiceWorker');
          this.processQueue();
        }
      });
    }
  }

  public subscribe(callback: QueueEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(event: Parameters<QueueEventCallback>[0]) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[SyncQueue] Error in event listener:', err);
      }
    }
  }

  /**
   * Registers a one-off Background Sync with the Service Worker (if supported by browser)
   */
  public async registerBackgroundSync(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        // @ts-expect-error SyncManager type definition
        if (reg.sync) {
          // @ts-expect-error SyncManager type definition
          await reg.sync.register(APP_CONFIG.SYNC_TAG);
          console.log('[SyncQueue] Background Sync successfully registered with tag:', APP_CONFIG.SYNC_TAG);
          return true;
        }
      }
    } catch (err) {
      console.warn('[SyncQueue] Background Sync registration failed, falling back to window online listener:', err);
    }
    return false;
  }

  /**
   * Processes all pending and failed queue items sequentially
   */
  public async processQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      console.log('[SyncQueue] Queue is already actively processing. Skipping concurrent run.');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const netStatus = networkService.getStatus();
    if (!netStatus.connected) {
      console.log('[SyncQueue] Device is currently offline. Queue processing suspended.');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let succeeded = 0;
    let failed = 0;

    try {
      const pendingItems = await getPendingAndFailedItems();
      if (pendingItems.length === 0) {
        this.isProcessing = false;
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      console.log(`[SyncQueue] Starting sequential processing of ${pendingItems.length} items...`);
      this.emit({ type: 'QUEUE_STARTED', totalPending: pendingItems.length });

      for (let i = 0; i < pendingItems.length; i++) {
        // Double-check connectivity between iterations
        if (!networkService.getStatus().connected) {
          console.warn('[SyncQueue] Lost network connectivity during queue execution. Halting.');
          break;
        }

        const queueItem = pendingItems[i];
        const inspection = await inspectionRepository.getById(queueItem.inspectionId);

        if (!inspection) {
          console.warn(`[SyncQueue] Inspection ${queueItem.inspectionId} not found in DB. Cleaning queue item.`);
          await updateQueueItemStatus(queueItem.id, 'FAILED', 'Record missing in IndexedDB');
          continue;
        }

        // Transition: PENDING_SYNC -> SYNCING
        console.log(`[SyncQueue] Processing item ${i + 1}/${pendingItems.length}: #${inspection.id} (${inspection.room}) -> SYNCING`);
        await inspectionRepository.updateStatus(inspection.id, 'SYNCING');
        await updateQueueItemStatus(queueItem.id, 'SYNCING');

        this.emit({
          type: 'ITEM_STATE_CHANGE',
          item: queueItem,
          status: 'SYNCING',
          processedCount: i + 1,
          totalPending: pendingItems.length
        });

        try {
          // Attempt dispatch to server adapter
          await dispatchInspection(inspection, {
            forceFail: this.simulateServerError
          });

          // Transition: SYNCING -> SYNCED
          await inspectionRepository.updateStatus(inspection.id, 'SYNCED');
          succeeded++;

          this.emit({
            type: 'ITEM_STATE_CHANGE',
            item: queueItem,
            status: 'SYNCED',
            processedCount: i + 1,
            totalPending: pendingItems.length
          });
          console.log(`[SyncQueue] Successfully synchronized inspection #${inspection.id}`);
        } catch (err: unknown) {
          // Transition: SYNCING -> FAILED
          const errorMessage = err instanceof Error ? err.message : 'Unknown sync failure';
          console.error(`[SyncQueue] Failed to synchronize #${inspection.id}:`, errorMessage);
          await inspectionRepository.updateStatus(inspection.id, 'FAILED', errorMessage);
          await updateQueueItemStatus(queueItem.id, 'FAILED', errorMessage);
          failed++;

          this.emit({
            type: 'ITEM_ERROR',
            item: queueItem,
            status: 'FAILED',
            error: errorMessage,
            processedCount: i + 1,
            totalPending: pendingItems.length
          });
        }
      }

      this.emit({
        type: 'QUEUE_COMPLETED',
        processedCount: succeeded + failed,
        totalPending: pendingItems.length
      });
    } catch (err) {
      console.error('[SyncQueue] Fatal error during queue run:', err);
    } finally {
      this.isProcessing = false;
    }

    return { processed: succeeded + failed, succeeded, failed };
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }

  public setSimulateServerError(enable: boolean) {
    this.simulateServerError = enable;
  }

  public getSimulateServerError(): boolean {
    return this.simulateServerError;
  }
}

export const syncQueue = new SyncQueueManager();
