import { inspectionRepository } from '../services/inspectionRepository';
import { networkService } from '../services/networkService';
import { syncQueue } from '../sync/syncQueue';
import { renderStatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/date';
import type { Inspection } from '../types/inspection';

export class SyncQueuePage {
  private container: HTMLElement;
  private unsubscribeQueue?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async render(): Promise<void> {
    const netStatus = networkService.getStatus();
    const isOnline = netStatus.connected;
    const isProcessing = syncQueue.getIsProcessing();
    const isSimulatingError = syncQueue.getSimulateServerError();

    const allInspections = await inspectionRepository.getAll();
    const counts = await inspectionRepository.getCounts();

    const syncingCount = allInspections.filter((i) => i.syncStatus === 'SYNCING').length;
    const syncedCount = allInspections.filter((i) => i.syncStatus === 'SYNCED').length;

    this.container.innerHTML = `
      <div class="sync-queue-page">
        <!-- Queue Metric Header -->
        <div class="card" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85;">Offline Sync Engine</div>
              <h2 style="font-size: 18px; font-weight: 700;">Synchronization Queue</h2>
            </div>
            <div style="background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 600;">
              ${isProcessing ? '↻ Processing...' : isOnline ? '🟢 Online Ready' : '🔴 Paused (Offline)'}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
            <div style="background: rgba(255, 255, 255, 0.15); padding: 8px 4px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 800;">${counts.pending}</div>
              <div style="font-size: 10px; opacity: 0.9;">Pending</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.15); padding: 8px 4px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 800;">${syncingCount}</div>
              <div style="font-size: 10px; opacity: 0.9;">Syncing</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.15); padding: 8px 4px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 800;">${syncedCount}</div>
              <div style="font-size: 10px; opacity: 0.9;">Synced</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.15); padding: 8px 4px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 800; color: #fecaca;">${counts.failed}</div>
              <div style="font-size: 10px; opacity: 0.9;">Failed</div>
            </div>
          </div>
        </div>

        <!-- Sync Actions Bar -->
        <div class="card" style="margin-bottom: 16px; padding: 12px 16px;">
          <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 13px; font-weight: 700; color: var(--secondary);">Manual Dispatch</div>
              <div style="font-size: 11px; color: var(--text-muted);">
                ${
                  !isOnline
                    ? 'Device is offline. Connect to dispatch pending audits.'
                    : counts.pending + counts.failed === 0
                    ? 'All inspections are up to date.'
                    : `${counts.pending + counts.failed} record(s) queued for synchronization.`
                }
              </div>
            </div>

            <button
              type="button"
              class="btn btn-primary"
              id="btn-sync-now"
              ${!isOnline || isProcessing || counts.pending + counts.failed === 0 ? 'disabled' : ''}
              style="min-width: 110px;"
            >
              ${isProcessing ? 'Syncing...' : 'Sync Now ↻'}
            </button>
          </div>

          <!-- Academic Demo Toggle: Simulate Server Outage -->
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: #991b1b;">Simulate Server 503 Outage</div>
              <div style="font-size: 10px; color: var(--text-muted);">Forces dispatch failure to test error state and retry logic</div>
            </div>
            <label style="position: relative; display: inline-block; width: 40px; height: 22px;">
              <input type="checkbox" id="toggle-simulate-error" ${isSimulatingError ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isSimulatingError ? '#ef4444' : '#cbd5e1'}; border-radius: 22px; transition: .2s;"></span>
            </label>
          </div>
        </div>

        <!-- Queue Item List -->
        <div style="margin-bottom: 10px; font-size: 13px; font-weight: 700; color: var(--secondary); display: flex; justify-content: space-between;">
          <span>Active Queue & Sync History (${allInspections.length})</span>
          <span style="font-size: 11px; font-weight: 500; color: var(--text-muted);">Processed Sequentially</span>
        </div>

        <div class="queue-list" id="queue-list-container">
          ${
            allInspections.length === 0
              ? `<div class="card" style="text-align: center; color: var(--text-muted); padding: 30px;">Queue is currently empty.</div>`
              : allInspections.map((item) => this.renderQueueItem(item)).join('')
          }
        </div>
      </div>
    `;

    this.bindEvents();
    this.setupLiveListener();
  }

  private renderQueueItem(item: Inspection): string {
    const isSyncing = item.syncStatus === 'SYNCING';

    return `
      <div class="card ${isSyncing ? 'syncing-card' : ''}" style="margin-bottom: 10px; padding: 12px 14px; border-left: 4px solid ${this.getStatusColor(item.syncStatus)};" id="queue-item-${item.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 700; font-size: 14px; color: var(--secondary);">
              Room ${item.room} — ${item.category}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              ${item.building} • ${formatDateTime(item.createdAt)}
            </div>
          </div>
          <div>
            ${renderStatusBadge(item.syncStatus)}
          </div>
        </div>

        ${
          item.lastSyncError
            ? `<div style="margin-top: 6px; font-size: 11px; color: #b91c1c; background: #fef2f2; padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid #fecaca;">
                Error: ${item.lastSyncError} (Attempts: ${item.syncAttempts})
               </div>`
            : ''
        }

        ${
          item.syncedAt
            ? `<div style="margin-top: 6px; font-size: 10px; color: #047857;">
                ✓ Synced at ${formatDateTime(item.syncedAt)}
               </div>`
            : ''
        }

        <div style="margin-top: 8px; display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-sm btn-view-detail" data-id="${item.id}" style="font-size: 11px; padding: 4px 8px;">
            Inspect Details
          </button>
          ${
            item.syncStatus === 'FAILED'
              ? `<button type="button" class="btn btn-primary btn-sm btn-retry-item" data-id="${item.id}" style="font-size: 11px; padding: 4px 8px; background: #0284c7;">
                  Retry
                 </button>`
              : ''
          }
        </div>
      </div>
    `;
  }

  private getStatusColor(status: Inspection['syncStatus']): string {
    switch (status) {
      case 'SYNCED':
        return 'var(--success)';
      case 'PENDING_SYNC':
        return 'var(--warning)';
      case 'SYNCING':
        return 'var(--info)';
      case 'FAILED':
        return 'var(--danger)';
      default:
        return 'var(--border)';
    }
  }

  private bindEvents(): void {
    const syncNowBtn = this.container.querySelector('#btn-sync-now');
    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', async () => {
        syncNowBtn.setAttribute('disabled', 'true');
        syncNowBtn.textContent = 'Syncing...';
        await syncQueue.processQueue();
        this.render();
      });
    }

    const toggleError = this.container.querySelector('#toggle-simulate-error') as HTMLInputElement | null;
    if (toggleError) {
      toggleError.addEventListener('change', () => {
        syncQueue.setSimulateServerError(toggleError.checked);
        this.render();
      });
    }

    // View detail buttons
    const detailBtns = this.container.querySelectorAll('.btn-view-detail');
    detailBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) window.location.hash = `#detail?id=${id}`;
      });
    });

    // Retry item buttons
    const retryBtns = this.container.querySelectorAll('.btn-retry-item');
    retryBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          await inspectionRepository.updateStatus(id, 'PENDING_SYNC');
          await syncQueue.processQueue();
          this.render();
        }
      });
    });
  }

  private setupLiveListener(): void {
    if (this.unsubscribeQueue) {
      this.unsubscribeQueue();
    }

    this.unsubscribeQueue = syncQueue.subscribe((event) => {
      console.log('[SyncQueuePage] Queue event received:', event);
      // Re-render automatically on any state transition
      this.render();
    });
  }

  public destroy(): void {
    if (this.unsubscribeQueue) {
      this.unsubscribeQueue();
      this.unsubscribeQueue = undefined;
    }
  }
}
