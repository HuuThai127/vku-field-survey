import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, resetDatabaseInstance } from '../src/storage/indexedDb';
import { saveDraft, getDraft, clearDraft, hasDraft } from '../src/storage/draftStorage';
import type { InspectionDraft } from '../src/types/inspection';

describe('IndexedDB & Draft Storage Tests', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    const db = await getDatabase();
    await db.clear('appMetadata');
  });

  it('saves draft to IndexedDB and verifies survival upon subsequent get', async () => {
    const draft: InspectionDraft = {
      building: 'Building A — Main Lecture Hall',
      floor: 'Floor 3',
      room: 'A1-305',
      category: 'AC',
      rating: 3,
      defectNotes: 'Filter noise during power-up',
      photo: 'data:image/jpeg;base64,sample',
      currentStep: 4,
      lastModified: 0
    };

    await saveDraft(draft);

    // Verify hasDraft returns true
    expect(await hasDraft()).toBe(true);

    // Retrieve draft from IndexedDB
    const retrieved = await getDraft();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.building).toBe('Building A — Main Lecture Hall');
    expect(retrieved?.room).toBe('A1-305');
    expect(retrieved?.category).toBe('AC');
    expect(retrieved?.rating).toBe(3);
    expect(retrieved?.currentStep).toBe(4);
    expect(retrieved?.lastModified).toBeGreaterThan(0);
  });

  it('clears active draft completely from IndexedDB', async () => {
    await saveDraft({
      building: 'Building C',
      floor: 'Floor 1',
      room: 'C1-101',
      category: 'Furniture',
      rating: 4,
      defectNotes: '',
      currentStep: 2,
      lastModified: 0
    });

    expect(await hasDraft()).toBe(true);
    await clearDraft();
    expect(await hasDraft()).toBe(false);
    expect(await getDraft()).toBeNull();
  });
});
