import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, resetDatabaseInstance } from '../src/storage/indexedDb';
import { inspectionRepository } from '../src/services/inspectionRepository';
import { syncQueue } from '../src/sync/syncQueue';
import { networkService } from '../src/services/networkService';
import { resolveInspectionConflict } from '../src/utils/conflict';
import type { Inspection } from '../src/types/inspection';

describe('Offline Sync Queue & State Transitions', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    const db = await getDatabase();
    await db.clear('inspections');
    await db.clear('syncQueue');
    networkService.simulateStatus(true);
    syncQueue.setSimulateServerError(false);
  });

  it('creates new inspection with PENDING_SYNC status and puts it into queue', async () => {
    const item = await inspectionRepository.create({
      building: 'Building B — Software & IT Labs',
      floor: 'Floor 2',
      room: 'B2-204',
      category: 'Hardware',
      rating: 5,
      defectNotes: 'All lab workstations functional'
    });

    expect(item.id).toBeDefined();
    expect(item.syncStatus).toBe('PENDING_SYNC');
    expect(item.syncAttempts).toBe(0);

    const saved = await inspectionRepository.getById(item.id);
    expect(saved?.syncStatus).toBe('PENDING_SYNC');
  });

  it('processes queue sequentially: PENDING_SYNC -> SYNCING -> SYNCED', async () => {
    const item1 = await inspectionRepository.create({
      building: 'Building A — Main Lecture Hall',
      floor: 'Floor 1',
      room: 'A1-101',
      category: 'Projector',
      rating: 4,
      defectNotes: 'Projection screen clean'
    });

    const transitions: string[] = [];
    const unsubscribe = syncQueue.subscribe((ev) => {
      if (ev.status) {
        transitions.push(ev.status);
      }
    });

    const result = await syncQueue.processQueue();
    unsubscribe();

    expect(result.succeeded).toBeGreaterThanOrEqual(1);

    const updated = await inspectionRepository.getById(item1.id);
    expect(updated?.syncStatus).toBe('SYNCED');
    expect(updated?.syncedAt).toBeDefined();
    expect(transitions).toContain('SYNCING');
    expect(transitions).toContain('SYNCED');
  });

  it('handles simulated server error: PENDING_SYNC -> SYNCING -> FAILED', async () => {
    const item = await inspectionRepository.create({
      building: 'Building C — Digital Economy & Innovation',
      floor: 'Floor 3',
      room: 'C1-305',
      category: 'AC',
      rating: 2,
      defectNotes: 'AC compressor failure'
    });

    // Enable server error simulation
    syncQueue.setSimulateServerError(true);

    const result = await syncQueue.processQueue();
    expect(result.failed).toBeGreaterThanOrEqual(1);

    const failedItem = await inspectionRepository.getById(item.id);
    expect(failedItem?.syncStatus).toBe('FAILED');
    expect(failedItem?.lastSyncError).toContain('Simulated upstream server error');

    // Retry behavior: reset error simulation, update to PENDING_SYNC, and re-run queue
    syncQueue.setSimulateServerError(false);
    await inspectionRepository.updateStatus(item.id, 'PENDING_SYNC');

    const retryResult = await syncQueue.processQueue();
    expect(retryResult.succeeded).toBeGreaterThanOrEqual(1);

    const retriedItem = await inspectionRepository.getById(item.id);
    expect(retriedItem?.syncStatus).toBe('SYNCED');
  });

  it('does not dispatch queue items while offline', async () => {
    await inspectionRepository.create({
      building: 'Building D',
      floor: 'Floor 1',
      room: 'D2-101',
      category: 'Furniture',
      rating: 3,
      defectNotes: 'Broken chair'
    });

    // Simulate offline
    networkService.simulateStatus(false);

    const result = await syncQueue.processQueue();
    expect(result.processed).toBe(0);
  });

  it('verifies Last-Write-Wins and PENDING priority in conflict resolution', () => {
    const localPending: Inspection = {
      id: 'uuid-1',
      createdAt: 1000,
      updatedAt: 2000,
      building: 'Building A',
      floor: 'Floor 1',
      room: 'A1-101',
      category: 'Projector',
      rating: 2,
      defectNotes: 'Local offline modifications',
      syncStatus: 'PENDING_SYNC',
      syncAttempts: 0
    };

    const remoteStale: Inspection = {
      id: 'uuid-1',
      createdAt: 1000,
      updatedAt: 1500,
      building: 'Building A',
      floor: 'Floor 1',
      room: 'A1-101',
      category: 'Projector',
      rating: 5,
      defectNotes: 'Old remote state',
      syncStatus: 'SYNCED',
      syncAttempts: 1
    };

    const res = resolveInspectionConflict(localPending, remoteStale);
    expect(res.resolved.syncStatus).toBe('PENDING_SYNC');
    expect(res.resolved.defectNotes).toBe('Local offline modifications');
  });
});
