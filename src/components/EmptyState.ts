export function renderEmptyState(options: {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  actionId?: string;
}): string {
  const icon = options.icon || '📋';
  const actionButton = options.actionText && options.actionId
    ? `<button type="button" class="btn btn-primary btn-sm" id="${options.actionId}">${options.actionText}</button>`
    : '';

  return `
    <div class="card" style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 40px; margin-bottom: 12px;">${icon}</div>
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px; color: var(--secondary);">${options.title}</h3>
      <p style="font-size: 13px; color: var(--text-muted); max-width: 320px; margin: 0 auto 16px auto;">${options.description}</p>
      ${actionButton}
    </div>
  `;
}
