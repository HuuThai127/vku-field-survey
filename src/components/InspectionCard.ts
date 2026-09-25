import type { Inspection } from '../types/inspection';
import { renderStatusBadge } from './StatusBadge';
import { formatRelativeTime } from '../utils/date';
import { CATEGORIES } from '../constants/categories';

export function renderInspectionCard(item: Inspection): string {
  const categoryMeta = CATEGORIES.find((c) => c.id === item.category);
  const icon = categoryMeta?.icon || '🔍';
  const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
  const timeStr = formatRelativeTime(item.createdAt);
  const hasPhoto = Boolean(item.photo);

  return `
    <div class="card card-clickable inspection-card" data-inspection-id="${item.id}" id="card-${item.id}">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">${icon}</span>
          <div>
            <div style="font-weight: 700; font-size: 15px; color: var(--secondary);">
              Room ${item.room}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              ${item.building} • ${item.floor}
            </div>
          </div>
        </div>
        <div>
          ${renderStatusBadge(item.syncStatus)}
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; font-size: 12px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #f59e0b; font-size: 14px; letter-spacing: 1px;">${stars}</span>
          <span style="color: var(--text-muted);">(${item.rating}/5)</span>
        </div>
        <div style="color: var(--text-light); font-size: 11px;">
          ${timeStr}
        </div>
      </div>

      ${
        item.defectNotes
          ? `<p style="margin-top: 8px; font-size: 12px; color: var(--text-main); background: #f8fafc; padding: 6px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--border);">
              ${escapeHtml(item.defectNotes.slice(0, 100))}${item.defectNotes.length > 100 ? '...' : ''}
            </p>`
          : ''
      }

      ${
        hasPhoto
          ? `<div style="margin-top: 6px; font-size: 11px; color: var(--primary); font-weight: 600; display: flex; align-items: center; gap: 4px;">
              📷 Photo attached
            </div>`
          : ''
      }
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
