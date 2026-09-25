import { inspectionRepository } from '../services/inspectionRepository';
import { networkService } from '../services/networkService';
import { renderInspectionCard } from '../components/InspectionCard';
import { renderEmptyState } from '../components/EmptyState';
import { renderOfflineBanner } from '../components/NetworkStatus';
import type { InspectionFilter } from '../types/inspection';

export class DashboardPage {
  private container: HTMLElement;
  private currentFilter: InspectionFilter = {};
  private activeTab: 'all' | 'pending' | 'synced' | 'failed' = 'all';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async render(): Promise<void> {
    const netStatus = networkService.getStatus();
    const counts = await inspectionRepository.getCounts();
    const inspections = await inspectionRepository.getAll(this.currentFilter);

    this.container.innerHTML = `
      ${renderOfflineBanner(netStatus)}

      <div class="stats-grid" id="dashboard-stats">
        <div class="stat-card today">
          <span class="stat-label">Today's Inspections</span>
          <span class="stat-value" id="stat-today">${counts.today}</span>
        </div>
        <div class="stat-card pending" style="cursor: pointer;" id="stat-pending-card">
          <span class="stat-label">Pending Sync ⏳</span>
          <span class="stat-value" id="stat-pending" style="color: #b45309;">${counts.pending}</span>
        </div>
        <div class="stat-card synced">
          <span class="stat-label">Synced to Cloud ✓</span>
          <span class="stat-value" id="stat-synced" style="color: #047857;">${counts.total - counts.pending - counts.failed}</span>
        </div>
        <div class="stat-card failed">
          <span class="stat-label">Sync Errors ⚠</span>
          <span class="stat-value" id="stat-failed" style="color: #b91c1c;">${counts.failed}</span>
        </div>
      </div>

      <!-- Main Action Banner -->
      <div style="margin-bottom: 20px;">
        <button type="button" class="btn btn-primary btn-block" id="btn-new-inspection" style="padding: 14px; font-size: 15px; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.35);">
          <span style="font-size: 18px;">+</span>
          <span>New Facility Inspection</span>
        </button>
      </div>

      <!-- Filter & Search Toolbar -->
      <div style="margin-bottom: 14px;">
        <div style="position: relative; margin-bottom: 10px;">
          <input
            type="text"
            class="form-control"
            id="search-input"
            placeholder="Search room (e.g. A1-203), category, or defect..."
            value="${this.currentFilter.searchQuery || ''}"
            style="padding-left: 36px;"
          />
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px;">🔍</span>
        </div>

        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;">
          <button type="button" class="btn btn-sm ${this.activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}" data-tab="all" id="tab-all">
            All (${counts.total})
          </button>
          <button type="button" class="btn btn-sm ${this.activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}" data-tab="pending" id="tab-pending">
            Pending (${counts.pending})
          </button>
          <button type="button" class="btn btn-sm ${this.activeTab === 'synced' ? 'btn-primary' : 'btn-secondary'}" data-tab="synced" id="tab-synced">
            Synced
          </button>
          <button type="button" class="btn btn-sm ${this.activeTab === 'failed' ? 'btn-primary' : 'btn-secondary'}" data-tab="failed" id="tab-failed">
            Failed (${counts.failed})
          </button>
        </div>
      </div>

      <!-- Inspection Cards Feed -->
      <div class="inspection-list" id="inspection-list">
        ${
          inspections.length > 0
            ? inspections.map((item) => renderInspectionCard(item)).join('')
            : renderEmptyState({
                icon: '📝',
                title: 'No Inspections Found',
                description: this.currentFilter.searchQuery
                  ? 'No records match your query. Try clearing filters.'
                  : 'Start an offline facility inspection around VKU campus.',
                actionText: '+ Create Inspection',
                actionId: 'empty-create-btn'
              })
        }
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // New Inspection action
    const newBtn = this.container.querySelector('#btn-new-inspection');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        window.location.hash = '#new';
      });
    }

    const emptyCreateBtn = this.container.querySelector('#empty-create-btn');
    if (emptyCreateBtn) {
      emptyCreateBtn.addEventListener('click', () => {
        window.location.hash = '#new';
      });
    }

    // Pending card click navigates to queue
    const pendingCard = this.container.querySelector('#stat-pending-card');
    if (pendingCard) {
      pendingCard.addEventListener('click', () => {
        window.location.hash = '#queue';
      });
    }

    // Search input with debounce
    const searchInput = this.container.querySelector('#search-input') as HTMLInputElement | null;
    if (searchInput) {
      let timeout: ReturnType<typeof setTimeout>;
      searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.currentFilter.searchQuery = searchInput.value;
          this.render();
        }, 200);
      });
    }

    // Tabs filter
    const tabs = this.container.querySelectorAll('[data-tab]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabType = tab.getAttribute('data-tab') as 'all' | 'pending' | 'synced' | 'failed';
        this.activeTab = tabType;
        if (tabType === 'all') {
          delete this.currentFilter.syncStatus;
        } else if (tabType === 'pending') {
          this.currentFilter.syncStatus = 'PENDING_SYNC';
        } else if (tabType === 'synced') {
          this.currentFilter.syncStatus = 'SYNCED';
        } else if (tabType === 'failed') {
          this.currentFilter.syncStatus = 'FAILED';
        }
        this.render();
      });
    });

    // Inspection Card click to open detail
    const cards = this.container.querySelectorAll('.inspection-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-inspection-id');
        if (id) {
          window.location.hash = `#detail?id=${id}`;
        }
      });
    });
  }
}
