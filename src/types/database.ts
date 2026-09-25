import type { DBSchema } from 'idb';
import type { Inspection } from './inspection';
import type { SyncQueueItem } from './sync';

export interface AppMetadataItem {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface VKUInspectionDB extends DBSchema {
  inspections: {
    key: string;
    value: Inspection;
    indexes: {
      'by-syncStatus': string;
      'by-createdAt': number;
      'by-building': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-queuedAt': number;
      'by-inspectionId': string;
    };
  };
  appMetadata: {
    key: string;
    value: AppMetadataItem;
  };
}
