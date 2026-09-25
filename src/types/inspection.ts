export type InspectionCategory =
  | 'Hardware'
  | 'Projector'
  | 'AC'
  | 'Electrical'
  | 'Furniture';

export type SyncStatus =
  | 'DRAFT'
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED';

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface Inspection {
  id: string; // UUID v4
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  building: string; // e.g. "Building A", "Building B"
  floor: string; // e.g. "Floor 1", "Floor 2"
  room: string; // e.g. "A1-203"
  category: InspectionCategory;
  rating: RatingValue;
  defectNotes: string;
  photo?: string; // Data URL (base64)
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncError?: string;
  syncedAt?: number;
}

export interface InspectionDraft {
  building: string;
  floor: string;
  room: string;
  category: InspectionCategory | '';
  rating: RatingValue | 0;
  defectNotes: string;
  photo?: string;
  currentStep: number;
  lastModified: number;
}

export interface InspectionFilter {
  searchQuery?: string;
  building?: string;
  category?: InspectionCategory | '';
  syncStatus?: SyncStatus | '';
}
