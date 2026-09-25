import { describe, it, expect } from 'vitest';
import { validateStep, validateInspectionSubmission } from '../src/utils/validation';

describe('Validation Unit Tests', () => {
  it('validates Step 1 Location: requires building, floor, and room', () => {
    const invalid = validateStep(1, { building: '', floor: '', room: '' });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.building).toBeDefined();
    expect(invalid.errors.floor).toBeDefined();
    expect(invalid.errors.room).toBeDefined();

    const valid = validateStep(1, {
      building: 'Building A — Main Lecture Hall',
      floor: 'Floor 1',
      room: 'A1-203'
    });
    expect(valid.isValid).toBe(true);
    expect(Object.keys(valid.errors).length).toBe(0);
  });

  it('validates Step 2 Category: requires a valid facility category', () => {
    const invalid = validateStep(2, { category: '' as any });
    expect(invalid.isValid).toBe(false);

    const valid = validateStep(2, { category: 'Projector' });
    expect(valid.isValid).toBe(true);
  });

  it('validates Step 3 Condition: requires rating between 1 and 5', () => {
    expect(validateStep(3, { rating: 0 }).isValid).toBe(false);
    expect(validateStep(3, { rating: 6 as any }).isValid).toBe(false);
    expect(validateStep(3, { rating: 1 }).isValid).toBe(true);
    expect(validateStep(3, { rating: 5 }).isValid).toBe(true);
  });

  it('validates full inspection submission', () => {
    const missingFields = validateInspectionSubmission({
      building: 'Building B',
      floor: 'Floor 2'
    });
    expect(missingFields.isValid).toBe(false);
    expect(missingFields.errors.room).toBeDefined();
    expect(missingFields.errors.category).toBeDefined();
    expect(missingFields.errors.rating).toBeDefined();

    const complete = validateInspectionSubmission({
      building: 'Building B — Software & IT Labs',
      floor: 'Floor 2',
      room: 'B2-204',
      category: 'Hardware',
      rating: 4,
      defectNotes: 'Keyboard key stickiness'
    });
    expect(complete.isValid).toBe(true);
    expect(complete.errorList.length).toBe(0);
  });
});
