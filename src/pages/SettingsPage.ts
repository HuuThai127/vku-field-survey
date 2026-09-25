import { networkService } from '../services/networkService';
import { syncQueue } from '../sync/syncQueue';
import { getDatabase } from '../storage/indexedDb';
import { clearDraft } from '../storage/draftStorage';
import { getInitialSeedInspections } from '../utils/inspection';
import { APP_CONFIG } from '../constants/config';
import { Capacitor } from '@capacitor/core';

// Store beforeinstallprompt event globally for PWA install button
let deferredPrompt: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured');
  });
}

export class SettingsPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async render(): Promise<void> {
    const netStatus = networkService.getStatus();
    const isNative = Capacitor.isNativePlatform();
    const isSimulatingError = syncQueue.getSimulateServerError();

    let storageEstimate = 'Unknown';
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMb = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
        storageEstimate = `${usedMb} MB used of ${quotaMb} MB`;
      } catch {
        // Ignore
      }
    }

    this.container.innerHTML = `
      <div class="settings-page">
        <!-- University & Project Overview -->
        <div class="card" style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border: none; margin-bottom: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8; font-weight: 700;">
            Vietnam-Korea University of ICT
          </div>
          <h2 style="font-size: 18px; font-weight: 800; margin-top: 2px;">VKU Field Survey PWA</h2>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
            Offline-First Campus Facility Inspection System • Capacitor Android
          </p>

          <div style="margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="badge" style="background: rgba(2, 132, 199, 0.3); color: #7dd3fc; border: 1px solid #0284c7;">PWA Standalone</span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.3); color: #6ee7b7; border: 1px solid #10b981;">Cache-First SW</span>
            <span class="badge" style="background: rgba(245, 158, 11, 0.3); color: #fde68a; border: 1px solid #f59e0b;">IndexedDB Engine</span>
            <span class="badge" style="background: rgba(168, 85, 247, 0.3); color: #d8b4fe; border: 1px solid #a855f7;">Capacitor 7</span>
          </div>
        </div>

        <!-- PWA Installation Box -->
        <div class="card" style="margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 6px; color: var(--secondary);">
            📱 PWA Installation
          </h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
            Install as a standalone application on Android, Windows, macOS, or iOS. Runs completely offline from homescreen.
          </p>
          <button type="button" class="btn btn-primary btn-sm btn-block" id="btn-install-pwa">
            Install VKU Survey PWA
          </button>
        </div>

        <!-- Testing & Simulation Controls for Evaluators -->
        <div class="card" style="margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--secondary);">
            🧪 Examiner Simulation Tools
          </h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
            Quickly test offline queuing, automatic reconnection, and error recovery without disconnecting physical Wi-Fi.
          </p>

          <!-- Online / Offline toggle -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <div>
              <div style="font-size: 13px; font-weight: 600;">Simulate Network State</div>
              <div style="font-size: 11px; color: var(--text-muted);">Current: ${netStatus.connected ? '🟢 Online' : '🔴 Offline'}</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-sm ${netStatus.connected ? 'btn-primary' : 'btn-secondary'}" id="btn-force-online">Online</button>
              <button type="button" class="btn btn-sm ${!netStatus.connected ? 'btn-danger' : 'btn-secondary'}" id="btn-force-offline">Offline</button>
            </div>
          </div>

          <!-- Server 503 toggle -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <div>
              <div style="font-size: 13px; font-weight: 600;">Simulate Server 503 Outage</div>
              <div style="font-size: 11px; color: var(--text-muted);">Triggers FAILED status on next sync</div>
            </div>
            <label style="position: relative; display: inline-block; width: 40px; height: 22px;">
              <input type="checkbox" id="settings-simulate-error" ${isSimulatingError ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isSimulatingError ? '#ef4444' : '#cbd5e1'}; border-radius: 22px; transition: .2s;"></span>
            </label>
          </div>

          <!-- Reset Seed Data -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
            <div>
              <div style="font-size: 13px; font-weight: 600;">Reset Demo Mock Data</div>
              <div style="font-size: 11px; color: var(--text-muted);">Restores deterministic campus seed records</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-seeds">Reset</button>
          </div>
        </div>

        <!-- Technical Environment Diagnostics -->
        <div class="card" style="margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: var(--secondary);">
            ⚙️ Runtime Environment Diagnostics
          </h3>

          <div class="review-item">
            <span class="review-label">Runtime Platform</span>
            <span class="review-value">${isNative ? 'Android Native (Capacitor Bridge)' : 'Web Browser (PWA)'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Service Worker</span>
            <span class="review-value" style="color: var(--success);">
              ${typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'Active (vku-survey-shell-v1)' : 'Not supported'}
            </span>
          </div>
          <div class="review-item">
            <span class="review-label">Background Sync</span>
            <span class="review-value">
              ${typeof window !== 'undefined' && 'SyncManager' in window ? 'Supported (SyncManager API)' : 'Fallback to online event'}
            </span>
          </div>
          <div class="review-item">
            <span class="review-label">IndexedDB Database</span>
            <span class="review-value">${APP_CONFIG.DB_NAME} (v${APP_CONFIG.DB_VERSION})</span>
          </div>
          <div class="review-item">
            <span class="review-label">Storage Usage</span>
            <span class="review-value">${storageEstimate}</span>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // PWA Install Button
    const installBtn = this.container.querySelector('#btn-install-pwa');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[PWA] User choice outcome:', outcome);
          deferredPrompt = null;
        } else {
          alert('PWA is already installed or install prompt is managed by your browser toolbar (+ icon in address bar).');
        }
      });
    }

    // Force Online
    const onlineBtn = this.container.querySelector('#btn-force-online');
    if (onlineBtn) {
      onlineBtn.addEventListener('click', () => {
        networkService.simulateStatus(true);
        this.render();
      });
    }

    // Force Offline
    const offlineBtn = this.container.querySelector('#btn-force-offline');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', () => {
        networkService.simulateStatus(false);
        this.render();
      });
    }

    // Toggle server error
    const toggleErr = this.container.querySelector('#settings-simulate-error') as HTMLInputElement | null;
    if (toggleErr) {
      toggleErr.addEventListener('change', () => {
        syncQueue.setSimulateServerError(toggleErr.checked);
        this.render();
      });
    }

    // Reset seeds
    const resetBtn = this.container.querySelector('#btn-reset-seeds');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('Reset IndexedDB to default deterministic seed records?')) {
          const db = await getDatabase();
          await db.clear('inspections');
          await db.clear('syncQueue');
          await clearDraft();

          const seeds = getInitialSeedInspections();
          const tx = db.transaction(['inspections', 'syncQueue', 'appMetadata'], 'readwrite');
          for (const item of seeds) {
            await tx.objectStore('inspections').put(item);
            if (item.syncStatus === 'PENDING_SYNC' || item.syncStatus === 'FAILED') {
              await tx.objectStore('syncQueue').put({
                id: item.id,
                inspectionId: item.id,
                queuedAt: item.createdAt,
                attempts: item.syncAttempts,
                status: item.syncStatus,
                errorMessage: item.lastSyncError
              });
            }
          }
          await tx.done;
          alert('Database reset to initial deterministic seeds successfully.');
          window.location.hash = '#dashboard';
        }
      });
    }
  }
}
