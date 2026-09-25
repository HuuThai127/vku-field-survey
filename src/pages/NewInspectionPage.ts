import { inspectionRepository } from '../services/inspectionRepository';
import { cameraService } from '../services/cameraService';
import { networkService } from '../services/networkService';
import { syncQueue } from '../sync/syncQueue';
import { getDraft, saveDraft, clearDraft, EMPTY_DRAFT } from '../storage/draftStorage';
import { renderProgressIndicator } from '../components/ProgressIndicator';
import { renderStarRating } from '../components/StarRating';
import { renderStatusBadge } from '../components/StatusBadge';
import { validateStep, validateInspectionSubmission } from '../utils/validation';
import { BUILDINGS } from '../constants/buildings';
import { CATEGORIES } from '../constants/categories';
import type { InspectionDraft, InspectionCategory, RatingValue } from '../types/inspection';

export class NewInspectionPage {
  private container: HTMLElement;
  private draft: InspectionDraft = { ...EMPTY_DRAFT };
  private errors: Record<string, string> = {};
  private draftRestoredNotice = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async render(): Promise<void> {
    // Check if an existing draft exists in IndexedDB
    const existingDraft = await getDraft();
    if (existingDraft && !this.draft.lastModified) {
      this.draft = existingDraft;
      this.draftRestoredNotice = true;
    }

    const currentStep = this.draft.currentStep || 1;

    this.container.innerHTML = `
      <div class="new-inspection-wizard">
        ${
          this.draftRestoredNotice
            ? `<div class="card" style="background: var(--info-bg); border-color: var(--info-border); padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 12px; color: #1e3a8a;">
                  💾 Restored unsubmitted draft from IndexedDB
                </div>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-discard-draft" style="font-size: 11px; padding: 4px 8px;">Discard</button>
              </div>`
            : ''
        }

        ${renderProgressIndicator(currentStep)}

        <form id="wizard-form" onsubmit="return false;">
          ${this.renderStepContent(currentStep)}

          <div style="display: flex; gap: 10px; margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--border);">
            ${
              currentStep > 1
                ? `<button type="button" class="btn btn-secondary" id="btn-wizard-back" style="flex: 1;">← Back</button>`
                : `<button type="button" class="btn btn-secondary" id="btn-wizard-cancel" style="flex: 1;">Cancel</button>`
            }

            <button type="button" class="btn btn-secondary" id="btn-save-draft" style="padding: 10px 14px;" title="Save draft to IndexedDB">
              💾 Save Draft
            </button>

            ${
              currentStep < 6
                ? `<button type="button" class="btn btn-primary" id="btn-wizard-next" style="flex: 2;">Next →</button>`
                : `<button type="button" class="btn btn-primary" id="btn-wizard-submit" style="flex: 2; background: #0284c7;">
                    ${networkService.getStatus().connected ? 'Submit & Sync' : 'Save Offline (Pending)'}
                   </button>`
            }
          </div>
        </form>
      </div>
    `;

    this.bindEvents(currentStep);
  }

  private renderStepContent(step: number): string {
    switch (step) {
      case 1:
        return this.renderStep1Location();
      case 2:
        return this.renderStep2Category();
      case 3:
        return this.renderStep3Condition();
      case 4:
        return this.renderStep4Notes();
      case 5:
        return this.renderStep5Photo();
      case 6:
        return this.renderStep6Review();
      default:
        return '';
    }
  }

  private renderStep1Location(): string {
    const selectedBuilding = BUILDINGS.find((b) => b.name === this.draft.building) || BUILDINGS[0];
    const floors = selectedBuilding ? selectedBuilding.floors : ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'];
    const suggestedRooms = selectedBuilding ? selectedBuilding.suggestedRooms : [];

    return `
      <div class="card">
        <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--secondary);">Step 1: Facility Location</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Specify the exact campus facility or classroom being audited.</p>

        <div class="form-group">
          <label class="form-label" for="input-building">Campus Building <span class="required">*</span></label>
          <select class="form-control" id="input-building">
            <option value="">Select Building</option>
            ${BUILDINGS.map(
              (b) => `<option value="${b.name}" ${this.draft.building === b.name ? 'selected' : ''}>${b.name}</option>`
            ).join('')}
          </select>
          ${this.errors.building ? `<div class="form-error">${this.errors.building}</div>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label" for="input-floor">Floor Level <span class="required">*</span></label>
          <select class="form-control" id="input-floor">
            <option value="">Select Floor</option>
            ${floors.map(
              (f) => `<option value="${f}" ${this.draft.floor === f ? 'selected' : ''}>${f}</option>`
            ).join('')}
          </select>
          ${this.errors.floor ? `<div class="form-error">${this.errors.floor}</div>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label" for="input-room">Room / Area Code <span class="required">*</span></label>
          <input
            type="text"
            class="form-control"
            id="input-room"
            placeholder="e.g. A1-203, Lab 3, Server Room"
            value="${this.draft.room || ''}"
          />
          ${this.errors.room ? `<div class="form-error">${this.errors.room}</div>` : ''}

          <div style="margin-top: 8px;">
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Quick Suggestions:</span>
            <div class="pill-tags">
              ${suggestedRooms
                .map((r) => `<button type="button" class="pill-tag room-pill" data-room="${r}">${r}</button>`)
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderStep2Category(): string {
    return `
      <div class="card">
        <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--secondary);">Step 2: Facility Category</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Select the asset or facility class under review.</p>

        ${this.errors.category ? `<div class="form-error" style="margin-bottom: 12px;">${this.errors.category}</div>` : ''}

        <div class="category-grid">
          ${CATEGORIES.map((cat) => {
            const isSelected = this.draft.category === cat.id;
            return `
              <div class="category-card ${isSelected ? 'selected' : ''}" data-cat-id="${cat.id}">
                <div class="icon-box">${cat.icon}</div>
                <div class="details">
                  <div class="title">${cat.name}</div>
                  <div class="desc">${cat.description}</div>
                  <div style="margin-top: 4px; font-size: 10px; color: var(--text-light);">
                    Checklist: ${cat.checklist.join(' • ')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderStep3Condition(): string {
    return `
      <div class="card">
        <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--secondary);">Step 3: Condition Evaluation</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Rate overall operational reliability and integrity.</p>

        ${this.errors.rating ? `<div class="form-error" style="margin-bottom: 10px; text-align: center;">${this.errors.rating}</div>` : ''}

        ${renderStarRating(this.draft.rating || 0)}

        <div style="background: #f8fafc; border-radius: var(--radius-sm); padding: 12px; font-size: 12px; color: var(--text-muted); line-height: 1.6;">
          <strong>VKU Evaluation Rubric:</strong>
          <ul style="padding-left: 18px; margin-top: 4px;">
            <li><strong>1 Star:</strong> Safety hazard or completely inoperable. Urgent repair.</li>
            <li><strong>2 Stars:</strong> Substantial defect; severely hampers instruction.</li>
            <li><strong>3 Stars:</strong> Functional with notable flaws (flicker, noise, wear).</li>
            <li><strong>4 Stars:</strong> Good working state with slight cosmetic blemishes.</li>
            <li><strong>5 Stars:</strong> Perfect condition; passes all inspection checklists.</li>
          </ul>
        </div>
      </div>
    `;
  }

  private renderStep4Notes(): string {
    const quickTags = [
      'Lamp burnt out',
      'No power / tripping',
      'Cable damaged',
      'Missing screws',
      'Water leakage',
      'Overheating',
      'Unresponsive switch',
      'Workstation boots slowly'
    ];

    return `
      <div class="card">
        <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--secondary);">Step 4: Defect Notes & Observations</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Document specific issues, serial tags, or maintenance recommendations.</p>

        <div class="form-group">
          <label class="form-label" for="input-defect-notes">Detailed Observations</label>
          <textarea
            class="form-control"
            id="input-defect-notes"
            placeholder="Describe the condition, exact equipment ID, or symptoms..."
          >${this.draft.defectNotes || ''}</textarea>
          ${this.errors.defectNotes ? `<div class="form-error">${this.errors.defectNotes}</div>` : ''}

          <div style="margin-top: 10px;">
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Common Issue Tags:</span>
            <div class="pill-tags">
              ${quickTags
                .map((t) => `<button type="button" class="pill-tag note-tag" data-tag="${t}">+ ${t}</button>`)
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderStep5Photo(): string {
    const hasPhoto = Boolean(this.draft.photo);
    const isNative = cameraService.isNative();

    return `
      <div class="card">
        <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--secondary);">Step 5: Visual Evidence Capture</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
          ${isNative ? '📱 Android Native Camera' : '🌐 Web Photo Picker Fallback'}
        </p>

        <div class="photo-box">
          ${
            hasPhoto
              ? `
                <img src="${this.draft.photo}" alt="Inspection photo preview" class="photo-preview" />
                <div style="display: flex; gap: 8px; justify-content: center;">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-retake-photo">📷 Retake</button>
                  <button type="button" class="btn btn-danger btn-sm" id="btn-remove-photo">🗑 Remove</button>
                </div>
              `
              : `
                <div style="font-size: 42px; margin-bottom: 10px;">📷</div>
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">Attach Inspection Photo</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
                  Supports native camera capture or local gallery upload. Images are compressed for offline storage.
                </div>
                <button type="button" class="btn btn-primary btn-sm" id="btn-capture-photo">
                  ${isNative ? 'Launch Native Camera' : 'Select / Capture Photo'}
                </button>
              `
          }
        </div>
      </div>
    `;
  }

  private renderStep6Review(): string {
    const netStatus = networkService.getStatus();
    const isOnline = netStatus.connected;

    return `
      <div class="card">
        <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--secondary);">Step 6: Review & Finalize</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Verify inspection audit accuracy before committing.</p>

        <div style="background: var(--surface-hover); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px;">
          <div class="review-item">
            <span class="review-label">Building</span>
            <span class="review-value">${this.draft.building || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Floor</span>
            <span class="review-value">${this.draft.floor || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Room / Area</span>
            <span class="review-value">${this.draft.room || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Category</span>
            <span class="review-value">${this.draft.category || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Rating</span>
            <span class="review-value">${this.draft.rating ? '★'.repeat(this.draft.rating) + ` (${this.draft.rating}/5)` : '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Observations</span>
            <span class="review-value">${this.draft.defectNotes ? this.draft.defectNotes : '(No notes provided)'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Photo</span>
            <span class="review-value">${this.draft.photo ? '✓ Attached (Stored offline)' : 'None'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">Network State</span>
            <span class="review-value" style="color: ${isOnline ? 'var(--success)' : 'var(--danger)'};">
              ${isOnline ? '🟢 Connected (Will trigger dispatch)' : '🔴 Offline (Will queue PENDING_SYNC)'}
            </span>
          </div>
          <div class="review-item">
            <span class="review-label">Initial Status</span>
            <span class="review-value">${renderStatusBadge('PENDING_SYNC')}</span>
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 10px;">
          🔒 <strong>Data Integrity Guarantee:</strong> Your record will be written atomically to IndexedDB first. It will never be lost regardless of network conditions.
        </div>
      </div>
    `;
  }

  private bindEvents(currentStep: number): void {
    // Navigation Back/Cancel
    const backBtn = this.container.querySelector('#btn-wizard-back');
    if (backBtn) {
      backBtn.addEventListener('click', async () => {
        this.saveCurrentStepInputs(currentStep);
        this.draft.currentStep = Math.max(1, currentStep - 1);
        await saveDraft(this.draft);
        this.render();
      });
    }

    const cancelBtn = this.container.querySelector('#btn-wizard-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Discard changes and return to Dashboard?')) {
          clearDraft();
          window.location.hash = '#dashboard';
        }
      });
    }

    // Save Draft manually
    const saveDraftBtn = this.container.querySelector('#btn-save-draft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', async () => {
        this.saveCurrentStepInputs(currentStep);
        await saveDraft(this.draft);
        this.showToast('Draft saved in IndexedDB! Refreshing will preserve this data.');
      });
    }

    // Discard restored draft
    const discardBtn = this.container.querySelector('#btn-discard-draft');
    if (discardBtn) {
      discardBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to discard this saved draft?')) {
          await clearDraft();
          this.draft = { ...EMPTY_DRAFT };
          this.draftRestoredNotice = false;
          this.render();
        }
      });
    }

    // Next step
    const nextBtn = this.container.querySelector('#btn-wizard-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        this.saveCurrentStepInputs(currentStep);
        const validation = validateStep(currentStep, this.draft);

        if (!validation.isValid) {
          this.errors = validation.errors;
          this.render();
          return;
        }

        this.errors = {};
        this.draft.currentStep = currentStep + 1;
        await saveDraft(this.draft);
        this.render();
      });
    }

    // Submit Inspection
    const submitBtn = this.container.querySelector('#btn-wizard-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        await this.handleFinalSubmission();
      });
    }

    // Step 1: Building select change
    if (currentStep === 1) {
      const bldgSelect = this.container.querySelector('#input-building') as HTMLSelectElement | null;
      if (bldgSelect) {
        bldgSelect.addEventListener('change', () => {
          this.draft.building = bldgSelect.value;
          this.saveDraftDebounced();
          this.render();
        });
      }

      // Room quick suggestions
      const roomPills = this.container.querySelectorAll('.room-pill');
      roomPills.forEach((pill) => {
        pill.addEventListener('click', () => {
          const roomVal = pill.getAttribute('data-room');
          const roomInput = this.container.querySelector('#input-room') as HTMLInputElement | null;
          if (roomInput && roomVal) {
            roomInput.value = roomVal;
            this.draft.room = roomVal;
            this.saveDraftDebounced();
          }
        });
      });
    }

    // Step 2: Category cards
    if (currentStep === 2) {
      const catCards = this.container.querySelectorAll('.category-card');
      catCards.forEach((card) => {
        card.addEventListener('click', () => {
          const catId = card.getAttribute('data-cat-id') as InspectionCategory;
          if (catId) {
            this.draft.category = catId;
            delete this.errors.category;
            this.saveDraftDebounced();
            this.render();
          }
        });
      });
    }

    // Step 3: Star rating
    if (currentStep === 3) {
      const starBtns = this.container.querySelectorAll('.star-btn');
      starBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = Number(btn.getAttribute('data-rating')) as RatingValue;
          if (val) {
            this.draft.rating = val;
            delete this.errors.rating;
            this.saveDraftDebounced();
            this.render();
          }
        });
      });
    }

    // Step 4: Quick issue tags
    if (currentStep === 4) {
      const noteTags = this.container.querySelectorAll('.note-tag');
      noteTags.forEach((btn) => {
        btn.addEventListener('click', () => {
          const tag = btn.getAttribute('data-tag');
          const textarea = this.container.querySelector('#input-defect-notes') as HTMLTextAreaElement | null;
          if (textarea && tag) {
            const current = textarea.value.trim();
            textarea.value = current ? `${current}; ${tag}` : tag;
            this.draft.defectNotes = textarea.value;
            this.saveDraftDebounced();
          }
        });
      });
    }

    // Step 5: Photo capture & removal
    if (currentStep === 5) {
      const captureBtn = this.container.querySelector('#btn-capture-photo');
      const retakeBtn = this.container.querySelector('#btn-retake-photo');
      const removeBtn = this.container.querySelector('#btn-remove-photo');

      const handlePhotoCapture = async () => {
        try {
          const result = await cameraService.takePhoto();
          this.draft.photo = result.dataUrl;
          await saveDraft(this.draft);
          this.render();
          this.showToast('Inspection photo captured and stored locally!');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('cancelled')) {
            alert('Camera error: ' + msg);
          }
        }
      };

      if (captureBtn) captureBtn.addEventListener('click', handlePhotoCapture);
      if (retakeBtn) retakeBtn.addEventListener('click', handlePhotoCapture);

      if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
          this.draft.photo = undefined;
          await saveDraft(this.draft);
          this.render();
        });
      }
    }
  }

  private saveCurrentStepInputs(step: number): void {
    if (step === 1) {
      const bldg = (this.container.querySelector('#input-building') as HTMLSelectElement)?.value;
      const floor = (this.container.querySelector('#input-floor') as HTMLSelectElement)?.value;
      const room = (this.container.querySelector('#input-room') as HTMLInputElement)?.value;
      if (bldg !== undefined) this.draft.building = bldg;
      if (floor !== undefined) this.draft.floor = floor;
      if (room !== undefined) this.draft.room = room.trim();
    } else if (step === 4) {
      const notes = (this.container.querySelector('#input-defect-notes') as HTMLTextAreaElement)?.value;
      if (notes !== undefined) this.draft.defectNotes = notes.trim();
    }
  }

  private saveDraftDebounced(): void {
    saveDraft(this.draft).catch(console.error);
  }

  private async handleFinalSubmission(): Promise<void> {
    const validation = validateInspectionSubmission(this.draft);
    if (!validation.isValid) {
      this.errors = validation.errors;
      alert('Please fill in all mandatory fields before submitting:\n' + validation.errorList.map((e) => '• ' + e.message).join('\n'));
      return;
    }

    try {
      // 1. Atomically create inspection record (starts as PENDING_SYNC in IndexedDB)
      const created = await inspectionRepository.create({
        building: this.draft.building,
        floor: this.draft.floor,
        room: this.draft.room,
        category: this.draft.category as InspectionCategory,
        rating: this.draft.rating as RatingValue,
        defectNotes: this.draft.defectNotes,
        photo: this.draft.photo
      });

      // 2. Clear working draft from IndexedDB
      await clearDraft();

      // 3. Register Background Sync if available
      await syncQueue.registerBackgroundSync();

      const isConnected = networkService.getStatus().connected;

      if (isConnected) {
        this.showToast('Inspection submitted! Synchronizing with server...');
        // Auto-trigger sync queue in background
        syncQueue.processQueue();
      } else {
        this.showToast('Offline: Inspection safely saved to queue as PENDING_SYNC!');
      }

      // Navigate to detail page or sync queue
      window.location.hash = `#detail?id=${created.id}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Failed to save inspection to IndexedDB: ' + msg);
    }
  }

  private showToast(msg: string): void {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}
