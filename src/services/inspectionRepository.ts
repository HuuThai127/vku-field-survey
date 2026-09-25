import { getDatabase } from '../storage/indexedDb';
import { enqueueInspection, removeQueueItem } from '../storage/queueStorage';
import type { Inspection, InspectionFilter, SyncStatus } from '../types/inspection';
import { generateUUID } from '../utils/uuid';
import { isToday } from '../utils/date';

export class InspectionRepository {
  async getAll(filter?: InspectionFilter): Promise<Inspection[]> {
    const db = await getDatabase();
    let inspections = await db.getAllFromIndex('inspections', 'by-createdAt');
    // Sort descending by created timestamp (newest first)
    inspections.sort((a, b) => b.createdAt - a.createdAt);

    if (!filter) return inspections;

    if (filter.building) {
      inspections = inspections.filter((i) => i.building === filter.building);
    }

    if (filter.category) {
      inspections = inspections.filter((i) => i.category === filter.category);
    }

    if (filter.syncStatus) {
      inspections = inspections.filter((i) => i.syncStatus === filter.syncStatus);
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      inspections = inspections.filter(
        (i) =>
          i.room.toLowerCase().includes(q) ||
          i.building.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.defectNotes.toLowerCase().includes(q)
      );
    }

    return inspections;
  }

  async getById(id: string): Promise<Inspection | undefined> {
    const db = await getDatabase();
    return db.get('inspections', id);
  }

  async create(data: {
    building: string;
    floor: string;
    room: string;
    category: Inspection['category'];
    rating: Inspection['rating'];
    defectNotes: string;
    photo?: string;
  }): Promise<Inspection> {
    const db = await getDatabase();
    const now = Date.now();
    const id = generateUUID();

    const inspection: Inspection = {
      id,
      createdAt: now,
      updatedAt: now,
      building: data.building,
      floor: data.floor,
      room: data.room,
      category: data.category,
      rating: data.rating,
      defectNotes: data.defectNotes,
      photo: data.photo,
      syncStatus: 'PENDING_SYNC', // All new submissions start as PENDING_SYNC (Section 14)
      syncAttempts: 0
    };

    await db.put('inspections', inspection);
    await enqueueInspection(id);

    return inspection;
  }

  async updateStatus(id: string, status: SyncStatus, error?: string): Promise<void> {
    const db = await getDatabase();
    const record = await db.get('inspections', id);
    if (!record) return;

    record.syncStatus = status;
    record.updatedAt = Date.now();

    if (status === 'SYNCING') {
      record.syncAttempts = (record.syncAttempts || 0) + 1;
    } else if (status === 'SYNCED') {
      record.syncedAt = Date.now();
      record.lastSyncError = undefined;
      // Remove from queue since it's fully synced
      await removeQueueItem(id);
    } else if (status === 'FAILED') {
      record.lastSyncError = error || 'Synchronization failed';
    }

    await db.put('inspections', record);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('inspections', id);
    await removeQueueItem(id);
  }

  async getCounts(): Promise<{ total: number; today: number; pending: number; failed: number }> {
    const db = await getDatabase();
    const all = await db.getAll('inspections');

    let today = 0;
    let pending = 0;
    let failed = 0;

    for (const item of all) {
      if (isToday(item.createdAt)) today++;
      if (item.syncStatus === 'PENDING_SYNC' || item.syncStatus === 'SYNCING') pending++;
      if (item.syncStatus === 'FAILED') failed++;
    }

    return {
      total: all.length,
      today,
      pending,
      failed
    };
  }
}

export const inspectionRepository = new InspectionRepository();
