import type { SyncStatus } from '../types/inspection';
import { getStatusBadgeConfig } from '../utils/inspection';

export function renderStatusBadge(status: SyncStatus): string {
  const config = getStatusBadgeConfig(status);
  return `<span class="badge ${config.className}" title="${config.description}">
    <span class="badge-icon">${config.icon}</span>
    <span>${config.label}</span>
  </span>`;
}
