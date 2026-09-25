import type { Inspection, InspectionDraft } from '../types/inspection';
import { CATEGORIES } from '../constants/categories';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorList: ValidationError[];
}

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.id));

export function validateStep(step: number, draft: Partial<InspectionDraft>): ValidationResult {
  const errors: Record<string, string> = {};

  switch (step) {
    case 1: // Location
      if (!draft.building || !draft.building.trim()) {
        errors.building = 'Building is required';
      }
      if (!draft.floor || !draft.floor.trim()) {
        errors.floor = 'Floor is required';
      }
      if (!draft.room || !draft.room.trim()) {
        errors.room = 'Room number is required';
      }
      break;

    case 2: // Category
      if (!draft.category || !VALID_CATEGORIES.has(draft.category)) {
        errors.category = 'Please select a valid facility category';
      }
      break;

    case 3: // Condition (Rating)
      if (!draft.rating || draft.rating < 1 || draft.rating > 5) {
        errors.rating = 'Please rate the condition from 1 to 5 stars';
      }
      break;

    case 4: // Defect Details (Notes are optional, but if length > 2000, warn)
      if (draft.defectNotes && draft.defectNotes.length > 2000) {
        errors.defectNotes = 'Notes must not exceed 2000 characters';
      }
      break;

    case 5: // Photo (Optional in web/offline unless specified)
      break;

    case 6: // Review step validates all together
      return validateInspectionSubmission(draft);
  }

  const errorList = Object.entries(errors).map(([field, message]) => ({ field, message }));
  return {
    isValid: errorList.length === 0,
    errors,
    errorList
  };
}

export function validateInspectionSubmission(data: Partial<Inspection | InspectionDraft>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.building || !data.building.trim()) {
    errors.building = 'Building is required';
  }

  if (!data.floor || !data.floor.trim()) {
    errors.floor = 'Floor is required';
  }

  if (!data.room || !data.room.trim()) {
    errors.room = 'Room number is required';
  }

  if (!data.category || !VALID_CATEGORIES.has(data.category)) {
    errors.category = 'Facility category is required';
  }

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    errors.rating = 'A rating between 1 and 5 stars is required';
  }

  const errorList = Object.entries(errors).map(([field, message]) => ({ field, message }));
  return {
    isValid: errorList.length === 0,
    errors,
    errorList
  };
}
