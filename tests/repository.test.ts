import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, resetDatabaseInstance } from '../src/storage/indexedDb';
import { inspectionRepository } from '../src/services/inspectionRepository';

describe('Inspection Repository Filter & Query Tests', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    const db = await getDatabase();
    await db.clear('inspections');
    await db.clear('syncQueue');

    // Create a variety of test records
    await inspectionRepository.create({
      building: 'Building A — Main Lecture Hall',
      floor: 'Floor 1',
      room: 'A1-101',
      category: 'Projector',
      rating: 4,
      defectNotes: 'Bulb lumen level stable'
    });

    await inspectionRepository.create({
      building: 'Building B — Software & IT Labs',
      floor: 'Floor 2',
      room: 'B2-204',
      category: 'Hardware',
      rating: 5,
      defectNotes: 'Network switches good'
    });

    await inspectionRepository.create({
      building: 'Building C — Digital Economy & Innovation',
      floor: 'Floor 3',
      room: 'C1-305',
      category: 'AC',
      rating: 2,
      defectNotes: 'Water droplet leak from coil'
    });
  });

  it('filters inspections by building', async () => {
    const bldgA = await inspectionRepository.getAll({
      building: 'Building A — Main Lecture Hall'
    });
    expect(bldgA.length).toBe(1);
    expect(bldgA[0].room).toBe('A1-101');
  });

  it('filters inspections by category', async () => {
    const acItems = await inspectionRepository.getAll({
      category: 'AC'
    });
    expect(acItems.length).toBe(1);
    expect(acItems[0].category).toBe('AC');
  });

  it('filters inspections by search query', async () => {
    const searchResult = await inspectionRepository.getAll({
      searchQuery: 'droplet leak'
    });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].room).toBe('C1-305');
  });

  it('calculates counts correctly', async () => {
    const counts = await inspectionRepository.getCounts();
    expect(counts.total).toBe(3);
    expect(counts.pending).toBe(3);
    expect(counts.failed).toBe(0);
  });
});
