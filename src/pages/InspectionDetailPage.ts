import { inspectionRepository } from '../services/inspectionRepository';
import { syncQueue } from '../sync/syncQueue';
import { networkService } from '../services/networkService';
import { renderStatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/date';
import { CATEGORIES } from '../constants/categories';
import type { Inspection } from '../types/inspection';

export class InspectionDetailPage {
  private container: HTMLElement;
  private inspectionId: string;

  constructor(container: HTMLElement, inspectionId: string) {
    this.container = container;
    this.inspectionId = inspectionId;
  }

  public async render(): Promise<void> {
    const item = await inspectionRepository.getById(this.inspectionId);

    if (!item) {
      this.container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 36px; margin-bottom: 12px;">⚠️</div>
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Inspection Not Found</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">
            The requested inspection record #${this.inspectionId} was not found in IndexedDB.
          </p>
          <button type="button" class="btn btn-primary" id="btn-back-dashboard">Back to Dashboard</button>
        </div>
      `;
      this.container.querySelector('#btn-back-dashboard')?.addEventListener('click', () => {
        window.location.hash = '#dashboard';
      });
      return;
    }

    const categoryMeta = CATEGORIES.find((c) => c.id === item.category);
    const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
    const isOnline = networkService.getStatus().connected;

    this.container.innerHTML = `
      <div class="inspection-detail-page">
        <!-- Top Navigation -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-detail-back">
            ← Back
          </button>
          <div>
            ${renderStatusBadge(item.syncStatus)}
          </div>
        </div>

        <!-- Main Card Header -->
        <div class="card" style="margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <div style="font-size: 28px; width: 48px; height: 48px; background: #e0f2fe; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;">
              ${categoryMeta?.icon || '🔍'}
            </div>
            <div>
              <h2 style="font-size: 18px; font-weight: 800; color: var(--secondary);">
                Room ${item.room}
              </h2>
              <div style="font-size: 12px; color: var(--text-muted);">
                ${item.building} • ${item.floor}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; margin-bottom: 8px;">
            <span style="color: #f59e0b; font-size: 18px;">${stars}</span>
            <span style="font-weight: 600; color: var(--secondary);">${item.rating} / 5 Stars</span>
          </div>

          <div style="font-size: 12px; color: var(--text-muted);">
            Category: <strong>${item.category}</strong> (${categoryMeta?.description || ''})
          </div>
        </div>

        <!-- Defect Notes -->
        <div class="card" style="margin-bottom: 14px;">
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--secondary);">
            Inspector Observations & Defect Notes
          </h3>
          <div style="font-size: 13px; line-height: 1.6; color: var(--text-main); background: #f8fafc; padding: 12px; border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
            ${item.defectNotes || '<em style="color: var(--text-muted);">No specific defect notes recorded.</em>'}
          </div>
        </div>

        <!-- Attached Photo -->
        ${
          item.photo
            ? `<div class="card" style="margin-bottom: 14px;">
                <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--secondary);">
                  Visual Evidence Photo
                </h3>
                <img src="${item.photo}" alt="Inspection photo" style="width: 100%; border-radius: var(--radius-md); max-height: 320px; object-fit: contain; background: #0f172a;" />
              </div>`
            : ''
        }

        <!-- Sync & Metadata Details -->
        <div class="card" style="margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: var(--secondary);">
            Record Integrity & Audit Trail
          </h3>

          <div class="review-item">
            <span class="review-label">Inspection ID</span>
            <span class="review-value" style="font-family: monospace; font-size: 11px;">${item.id}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Created At</span>
            <span class="review-value">${formatDateTime(item.createdAt)}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Last Updated</span>
            <span class="review-value">${formatDateTime(item.updatedAt)}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Sync Status</span>
            <span class="review-value">${item.syncStatus}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Sync Attempts</span>
            <span class="review-value">${item.syncAttempts}</span>
          </div>
          ${
            item.syncedAt
              ? `<div class="review-item">
                  <span class="review-label">Synced Time</span>
                  <span class="review-value" style="color: var(--success);">${formatDateTime(item.syncedAt)}</span>
                </div>`
              : ''
          }
          ${
            item.lastSyncError
              ? `<div class="review-item">
                  <span class="review-label">Last Error</span>
                  <span class="review-value" style="color: var(--danger); font-size: 11px;">${item.lastSyncError}</span>
                </div>`
              : ''
          }
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 10px;">
          ${
            item.syncStatus !== 'SYNCED'
              ? `<button type="button" class="btn btn-primary" id="btn-sync-single" style="flex: 2;">
                  ${isOnline ? 'Sync Record Now ↻' : 'Offline (Will Sync Automatically)'}
                 </button>`
              : ''
          }
          <button type="button" class="btn btn-danger" id="btn-delete-record" style="flex: 1;">
            Delete
          </button>
        </div>
      </div>
    `;

    this.bindEvents(item);
  }

  private bindEvents(item: Inspection): void {
    const backBtn = this.container.querySelector('#btn-detail-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }

    const syncBtn = this.container.querySelector('#btn-sync-single');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        if (!networkService.getStatus().connected) {
          alert('Cannot synchronize while offline. Please connect to a network.');
          return;
        }
        await inspectionRepository.updateStatus(item.id, 'PENDING_SYNC');
        await syncQueue.processQueue();
        this.render();
      });
    }

    const deleteBtn = this.container.querySelector('#btn-delete-record');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Permanently delete inspection for Room ${item.room}?`)) {
          await inspectionRepository.delete(item.id);
          window.location.hash = '#dashboard';
        }
      });
    }
  }
}
