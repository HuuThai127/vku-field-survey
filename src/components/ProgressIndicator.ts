const STEP_NAMES = [
  'Location',
  'Category',
  'Condition',
  'Notes',
  'Photo',
  'Review'
];

export function renderProgressIndicator(currentStep: number): string {
  const stepsHtml = STEP_NAMES.map((name, index) => {
    const stepNumber = index + 1;
    let stateClass = '';
    if (stepNumber < currentStep) {
      stateClass = 'completed';
    } else if (stepNumber === currentStep) {
      stateClass = 'active';
    }

    return `
      <div class="step-node ${stateClass}" data-step="${stepNumber}">
        <div class="step-circle">
          ${stepNumber < currentStep ? '✓' : stepNumber}
        </div>
        <span class="step-title">${name}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="wizard-progress" role="progressbar" aria-valuenow="${currentStep}" aria-valuemin="1" aria-valuemax="6">
      ${stepsHtml}
    </div>
  `;
}
