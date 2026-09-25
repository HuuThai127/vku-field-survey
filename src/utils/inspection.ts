import type { Inspection, SyncStatus } from '../types/inspection';

export function getStatusBadgeConfig(status: SyncStatus): {
  label: string;
  className: string;
  icon: string;
  description: string;
} {
  switch (status) {
    case 'SYNCED':
      return {
        label: 'Synced',
        className: 'badge-synced',
        icon: '✓',
        description: 'Successfully uploaded to central server'
      };
    case 'SYNCING':
      return {
        label: 'Syncing',
        className: 'badge-syncing',
        icon: '↻',
        description: 'Dispatching payload to central server'
      };
    case 'PENDING_SYNC':
      return {
        label: 'Pending Sync',
        className: 'badge-pending',
        icon: '⏳',
        description: 'Stored locally in IndexedDB, awaiting connection'
      };
    case 'FAILED':
      return {
        label: 'Sync Failed',
        className: 'badge-failed',
        icon: '⚠',
        description: 'Error during sync attempt, queued for retry'
      };
    case 'DRAFT':
    default:
      return {
        label: 'Draft',
        className: 'badge-draft',
        icon: '✎',
        description: 'In-progress inspection draft'
      };
  }
}

/**
 * Deterministic seed inspections for VKU demo (Section 38).
 * Realistic campus data that remains predictable across restarts.
 */
export function getInitialSeedInspections(): Inspection[] {
  const baseTime = 1790320000000; // Deterministic timestamp baseline (Sep 2026)

  return [
    {
      id: 'd8f2a101-7c3e-4b91-9e22-11a8b9c0d101',
      createdAt: baseTime - 86400000 * 2, // 2 days ago
      updatedAt: baseTime - 86400000 * 2,
      building: 'Building A — Main Lecture Hall',
      floor: 'Floor 1',
      room: 'A1-101',
      category: 'Projector',
      rating: 4,
      defectNotes: 'Projection screen motor is smooth. HDMI cable plug has slight wear but functional.',
      syncStatus: 'SYNCED',
      syncAttempts: 1,
      syncedAt: baseTime - 86400000 * 2 + 1200
    },
    {
      id: 'd8f2a102-7c3e-4b91-9e22-11a8b9c0d102',
      createdAt: baseTime - 86400000 * 1, // 1 day ago
      updatedAt: baseTime - 86400000 * 1,
      building: 'Building B — Software & IT Labs',
      floor: 'Floor 2',
      room: 'B2-204',
      category: 'Hardware',
      rating: 5,
      defectNotes: 'All 35 student workstations operational. Gigabit ethernet switches running at nominal temperature.',
      syncStatus: 'SYNCED',
      syncAttempts: 1,
      syncedAt: baseTime - 86400000 * 1 + 950
    },
    {
      id: 'd8f2a103-7c3e-4b91-9e22-11a8b9c0d103',
      createdAt: baseTime - 3600000 * 4, // 4 hours ago
      updatedAt: baseTime - 3600000 * 4,
      building: 'Building C — Digital Economy & Innovation',
      floor: 'Floor 3',
      room: 'C1-305',
      category: 'AC',
      rating: 2,
      defectNotes: 'Left split AC unit blowing warm air, filter indicator flashing amber. Requires technician refrigerant check.',
      syncStatus: 'PENDING_SYNC',
      syncAttempts: 0
    },
    {
      id: 'd8f2a104-7c3e-4b91-9e22-11a8b9c0d104',
      createdAt: baseTime - 3600000 * 2, // 2 hours ago
      updatedAt: baseTime - 3600000 * 2,
      building: 'Building A — Main Lecture Hall',
      floor: 'Floor 2',
      room: 'A1-203',
      category: 'Electrical',
      rating: 3,
      defectNotes: 'Rear ceiling LED row intermittent flicker during high load. Wall socket #4 loose.',
      syncStatus: 'PENDING_SYNC',
      syncAttempts: 0
    },
    {
      id: 'd8f2a105-7c3e-4b91-9e22-11a8b9c0d105',
      createdAt: baseTime - 1800000, // 30 mins ago
      updatedAt: baseTime - 1800000,
      building: 'Building D — Learning Resource Center & Library',
      floor: 'Floor 1',
      room: 'D2-102',
      category: 'Furniture',
      rating: 1,
      defectNotes: 'Study table #12 has damaged leg bracket; wobbles severely. 2 swivel chairs missing caster wheels.',
      syncStatus: 'FAILED',
      syncAttempts: 3,
      lastSyncError: 'Simulated connection timeout: host unreachable'
    }
  ];
}
