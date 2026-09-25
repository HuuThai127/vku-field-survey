import './styles/main.css';
import { renderAppHeader } from './components/AppHeader';
import { networkService } from './services/networkService';
import { inspectionRepository } from './services/inspectionRepository';
import { syncQueue } from './sync/syncQueue';
import { DashboardPage } from './pages/DashboardPage';
import { NewInspectionPage } from './pages/NewInspectionPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { SyncQueuePage } from './pages/SyncQueuePage';
import { SettingsPage } from './pages/SettingsPage';

// Register Service Worker for Cache-First PWA offline operation
async function registerServiceWorker() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      // In production Vite, sw.js is served at root ./sw.js
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('[App] Service Worker registered with scope:', reg.scope);
    } catch (err) {
      console.warn('[App] Service Worker registration failed (normal during some dev modes):', err);
    }
  }
}

class AppRouter {
  private appEl: HTMLElement;
  private contentEl!: HTMLElement;
  private currentView: any = null;

  constructor() {
    const el = document.getElementById('app');
    if (!el) throw new Error('Missing #app root element');
    this.appEl = el;

    this.initShell();
    this.setupListeners();
    this.handleRoute();
  }

  private initShell() {
    this.appEl.innerHTML = `
      <div id="header-container">
        ${renderAppHeader()}
      </div>

      <main class="app-content" id="page-content" role="main"></main>

      <nav class="bottom-nav" id="bottom-navigation" aria-label="Main Navigation">
        <button type="button" class="nav-item active" data-nav="dashboard" id="nav-btn-dashboard">
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </button>
        <button type="button" class="nav-item" data-nav="new" id="nav-btn-new">
          <span class="nav-icon">➕</span>
          <span>Inspect</span>
        </button>
        <button type="button" class="nav-item" data-nav="queue" id="nav-btn-queue">
          <span class="nav-icon">⚡</span>
          <span>Queue</span>
          <span class="nav-badge" id="nav-queue-badge" style="display: none;">0</span>
        </button>
        <button type="button" class="nav-item" data-nav="settings" id="nav-btn-settings">
          <span class="nav-icon">⚙️</span>
          <span>Settings</span>
        </button>
      </nav>
    `;

    this.contentEl = document.getElementById('page-content') as HTMLElement;
  }

  private setupListeners() {
    // Hash change routing
    window.addEventListener('hashchange', () => this.handleRoute());

    // Bottom navigation clicks
    const navItems = this.appEl.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.getAttribute('data-nav');
        if (route) {
          window.location.hash = `#${route}`;
        }
      });
    });

    // Header Home logo click
    const homeBtn = document.getElementById('header-home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.hash = '#dashboard';
      });
    }

    // Network status subscriber
    networkService.subscribe(() => {
      this.updateHeaderNetworkIndicator();
      this.updateQueueBadge();
    });

    // Queue subscriber
    syncQueue.subscribe(() => {
      this.updateQueueBadge();
    });

    this.updateQueueBadge();
  }

  private updateHeaderNetworkIndicator() {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      const title = this.getPageTitle();
      headerContainer.innerHTML = renderAppHeader(title.title, title.subtitle);

      // Re-bind logo click
      const homeBtn = document.getElementById('header-home-btn');
      if (homeBtn) {
        homeBtn.addEventListener('click', () => {
          window.location.hash = '#dashboard';
        });
      }
    }
  }

  private async updateQueueBadge() {
    const badge = document.getElementById('nav-queue-badge');
    if (!badge) return;

    try {
      const counts = await inspectionRepository.getCounts();
      if (counts.pending > 0) {
        badge.textContent = String(counts.pending);
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch {
      // Ignore
    }
  }

  private getPageTitle(): { title: string; subtitle: string } {
    const hash = window.location.hash || '#dashboard';
    if (hash.startsWith('#new')) {
      return { title: 'New Inspection', subtitle: 'Facility Audit Wizard' };
    }
    if (hash.startsWith('#queue')) {
      return { title: 'Sync Queue', subtitle: 'Offline Dispatch Engine' };
    }
    if (hash.startsWith('#detail')) {
      return { title: 'Inspection Details', subtitle: 'Audit Record History' };
    }
    if (hash.startsWith('#settings')) {
      return { title: 'System & Diagnostics', subtitle: 'PWA & Simulator Tools' };
    }
    return { title: 'VKU Field Survey', subtitle: 'Campus Facility Inspection' };
  }

  public async handleRoute() {
    const hash = window.location.hash || '#dashboard';
    const [routePath, queryString] = hash.slice(1).split('?');

    // Clean up previous view if needed
    if (this.currentView && typeof this.currentView.destroy === 'function') {
      this.currentView.destroy();
    }

    // Update bottom navigation active styles
    const navItems = this.appEl.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
      const navTarget = item.getAttribute('data-nav');
      if (navTarget === routePath) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.updateHeaderNetworkIndicator();

    // Render corresponding page
    if (routePath === 'new') {
      this.currentView = new NewInspectionPage(this.contentEl);
      await this.currentView.render();
    } else if (routePath === 'queue') {
      this.currentView = new SyncQueuePage(this.contentEl);
      await this.currentView.render();
    } else if (routePath === 'detail') {
      const params = new URLSearchParams(queryString || '');
      const id = params.get('id') || '';
      this.currentView = new InspectionDetailPage(this.contentEl, id);
      await this.currentView.render();
    } else if (routePath === 'settings') {
      this.currentView = new SettingsPage(this.contentEl);
      await this.currentView.render();
    } else {
      // Default to Dashboard
      this.currentView = new DashboardPage(this.contentEl);
      await this.currentView.render();
    }

    this.updateQueueBadge();
    // Scroll to top on route change
    this.contentEl.scrollTop = 0;
  }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', () => {
  new AppRouter();
  registerServiceWorker();
});
