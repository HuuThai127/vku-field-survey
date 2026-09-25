import { networkService } from '../services/networkService';
import { renderNetworkPill } from './NetworkStatus';

export function renderAppHeader(title: string = 'VKU Field Survey', subtitle: string = 'Offline Inspector'): string {
  const status = networkService.getStatus();
  const networkHtml = renderNetworkPill(status);

  return `
    <header class="app-header">
      <div class="header-brand" data-route="dashboard" id="header-home-btn">
        <div class="header-logo">VKU</div>
        <div class="header-title-box">
          <h1 id="header-page-title">${title}</h1>
          <p id="header-page-subtitle">${subtitle}</p>
        </div>
      </div>
      <div class="header-actions">
        ${networkHtml}
      </div>
    </header>
  `;
}
