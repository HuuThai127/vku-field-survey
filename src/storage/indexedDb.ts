import { openDB, type IDBPDatabase } from 'idb';
import type { VKUInspectionDB } from '../types/database';
import { APP_CONFIG } from '../constants/config';
import { getInitialSeedInspections } from '../utils/inspection';

let dbInstance: IDBPDatabase<VKUInspectionDB> | null = null;

export async function getDatabase(): Promise<IDBPDatabase<VKUInspectionDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<VKUInspectionDB>(APP_CONFIG.DB_NAME, APP_CONFIG.DB_VERSION, {
    upgrade(db, oldVersion) {
      console.log(`[IndexedDB] Upgrading database from v${oldVersion} to v${APP_CONFIG.DB_VERSION}`);

      // 1. inspections store
      if (!db.objectStoreNames.contains('inspections')) {
        const inspectionStore = db.createObjectStore('inspections', { keyPath: 'id' });
        inspectionStore.createIndex('by-syncStatus', 'syncStatus');
        inspectionStore.createIndex('by-createdAt', 'createdAt');
        inspectionStore.createIndex('by-building', 'building');
      }

      // 2. syncQueue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('by-status', 'status');
        queueStore.createIndex('by-queuedAt', 'queuedAt');
        queueStore.createIndex('by-inspectionId', 'inspectionId');
      }

      // 3. appMetadata store
      if (!db.objectStoreNames.contains('appMetadata')) {
        db.createObjectStore('appMetadata', { keyPath: 'key' });
      }
    }
  });

  // Check if initial seed is needed (first time app runs)
  await checkAndSeedData(dbInstance);

  return dbInstance;
}

async function checkAndSeedData(db: IDBPDatabase<VKUInspectionDB>): Promise<void> {
  try {
    const initialized = await db.get('appMetadata', 'is_seeded');
    if (!initialized) {
      console.log('[IndexedDB] First initialization: seeding deterministic VKU mock data');
      const seeds = getInitialSeedInspections();
      const tx = db.transaction(['inspections', 'syncQueue', 'appMetadata'], 'readwrite');

      for (const item of seeds) {
        await tx.objectStore('inspections').put(item);
        if (item.syncStatus === 'PENDING_SYNC' || item.syncStatus === 'FAILED') {
          await tx.objectStore('syncQueue').put({
            id: item.id,
            inspectionId: item.id,
            queuedAt: item.createdAt,
            attempts: item.syncAttempts,
            status: item.syncStatus,
            errorMessage: item.lastSyncError
          });
        }
      }

      await tx.objectStore('appMetadata').put({
        key: 'is_seeded',
        value: true,
        updatedAt: Date.now()
      });

      await tx.done;
      console.log('[IndexedDB] Seed data initialized successfully');
    }
  } catch (err) {
    console.error('[IndexedDB] Error during seed check:', err);
  }
}

/**
 * Resets or clears database connection (useful for unit tests)
 */
export function resetDatabaseInstance(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
