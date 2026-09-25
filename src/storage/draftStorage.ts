import { getDatabase } from './indexedDb';
import type { InspectionDraft } from '../types/inspection';
import { APP_CONFIG } from '../constants/config';

export const EMPTY_DRAFT: InspectionDraft = {
  building: '',
  floor: '',
  room: '',
  category: '',
  rating: 0,
  defectNotes: '',
  photo: undefined,
  currentStep: 1,
  lastModified: 0
};

export async function saveDraft(draft: InspectionDraft): Promise<void> {
  const db = await getDatabase();
  await db.put('appMetadata', {
    key: APP_CONFIG.DRAFT_STORAGE_KEY,
    value: {
      ...draft,
      lastModified: Date.now()
    },
    updatedAt: Date.now()
  });
}

export async function getDraft(): Promise<InspectionDraft | null> {
  const db = await getDatabase();
  const entry = await db.get('appMetadata', APP_CONFIG.DRAFT_STORAGE_KEY);
  if (!entry || !entry.value) {
    return null;
  }
  return entry.value as InspectionDraft;
}

export async function clearDraft(): Promise<void> {
  const db = await getDatabase();
  await db.delete('appMetadata', APP_CONFIG.DRAFT_STORAGE_KEY);
}

export async function hasDraft(): Promise<boolean> {
  const draft = await getDraft();
  if (!draft) return false;
  // Has meaningful content if any location, category, or rating is set
  return Boolean(draft.building || draft.room || draft.category || draft.rating > 0 || draft.defectNotes);
}
