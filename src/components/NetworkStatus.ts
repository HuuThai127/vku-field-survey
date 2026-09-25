import type { AppNetworkStatus } from '../services/networkService';

export function renderNetworkPill(status: AppNetworkStatus): string {
  const isOnline = status.connected;
  return `
    <div class="network-pill ${isOnline ? 'online' : 'offline'}" id="network-status-indicator" title="${
      isOnline ? 'Online - automatic sync enabled' : 'Offline - inspections stored safely in IndexedDB'
    }">
      <span class="network-dot"></span>
      <span>${isOnline ? 'Online' : 'Offline'}</span>
    </div>
  `;
}

export function renderOfflineBanner(status: AppNetworkStatus): string {
  if (status.connected) {
    return '';
  }

  return `
    <div class="offline-banner" id="offline-banner">
      <div class="icon">📡</div>
      <div class="text">
        <strong>Offline Mode:</strong> Inspections are saved locally in IndexedDB and will automatically synchronize when connection returns.
      </div>
    </div>
  `;
}
