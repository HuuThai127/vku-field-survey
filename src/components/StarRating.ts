import type { RatingValue } from '../types/inspection';

const RATING_LABELS: Record<number, string> = {
  0: 'Select a rating to evaluate facility condition',
  1: '★☆☆☆☆ (1/5) — Critical Defect / Inoperable',
  2: '★★☆☆☆ (2/5) — Poor Condition / Repair Required',
  3: '★★★☆☆ (3/5) — Fair / Minor Issues Present',
  4: '★★★★☆ (4/5) — Good Condition / Fully Usable',
  5: '★★★★★ (5/5) — Excellent / Pristine Condition'
};

export function renderStarRating(currentRating: number): string {
  const starsHtml = [1, 2, 3, 4, 5]
    .map((star) => {
      const isFilled = star <= currentRating;
      return `<button type="button" class="star-btn ${isFilled ? 'filled' : ''}" data-rating="${star}" aria-label="${star} stars">★</button>`;
    })
    .join('');

  const labelText = RATING_LABELS[currentRating] || RATING_LABELS[0];

  return `
    <div class="star-rating-container" id="star-rating-box">
      <div class="star-rating-stars">
        ${starsHtml}
      </div>
      <div class="star-rating-label" id="star-rating-text">${labelText}</div>
    </div>
  `;
}

export function getRatingLabel(rating: RatingValue | 0): string {
  return RATING_LABELS[rating] || 'Unrated';
}
