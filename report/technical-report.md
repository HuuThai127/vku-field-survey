# VKU FIELD SURVEY — TECHNICAL REPORT
**Offline-First Campus Facility Inspection PWA with Capacitor Android Bridge**

---

## 1. General Information
- **Course / Module:** Mobile Application & Modern Web Development Mini-Project
- **Institution:** Vietnam - Korea University of Information and Communication Technology (VKU)
- **Project Title:** VKU Field Survey
- **Student / Author:** Student Auditor & Maintenance Inspection Team
- **Date:** September 2026
- **Architecture:** Offline-First Progressive Web Application (PWA) + Capacitor Native Bridge

---

## 2. Project Overview & Problem Statement
Campus facility inspectors, teaching assistants, and student auditors at VKU must regularly evaluate classroom infrastructure, audio-visual gear, AC units, electrical fittings, and furniture across complex multi-story lecture buildings (Buildings A, B, C, D, and K). Many interior classrooms, basements, and technical server rooms have severe Wi-Fi attenuation or zero mobile cellular reception.

Standard web applications fail when network connectivity drops, leading to data loss, abandoned audit forms, and operational frustration. **VKU Field Survey** addresses this challenge through an offline-first architecture:
1. **Zero-Network Boot:** Loads instantly from local storage cache via Service Worker even when offline.
2. **Crash-Resilient Drafts:** Auto-persists form inputs in real time into IndexedDB; refreshing or closing the browser preserves the active audit draft.
3. **Sequential Offline Sync Queue:** Queues submissions locally with `PENDING_SYNC` status, transitions to `SYNCING` upon reconnection, and marks `SYNCED` only after verified dispatch.
4. **Native Android Experience:** Packages the identical web code into an installable Android APK with native camera access (`@capacitor/camera`) and network monitoring (`@capacitor/network`).

---

## 3. Learning Objectives & Implementation Mapping

| Learning Objective | Specification | Implementation Files | Verification Method |
| :--- | :--- | :--- | :--- |
| **LO1: Offline-First PWA** | Standalone installation, manifest, theme `#0284c7`, icons | `public/manifest.json`, `public/icons/`, `index.html` | PWA manifest validation, standalone display mode check |
| **LO2: 100% Offline App Shell** | Service Worker cache-first app shell & IndexedDB draft storage | `public/sw.js`, `src/storage/indexedDb.ts`, `src/storage/draftStorage.ts` | Disconnect network, reload page, confirm app boots and draft survives |
| **LO3: Offline Sync Queue** | FIFO sequential queue with automatic dispatch upon reconnection | `src/sync/syncQueue.ts`, `src/sync/serverAdapter.ts`, `src/storage/queueStorage.ts` | Vitest automated suite (15 tests) + manual offline-to-online transition |
| **LO4: Capacitor Android Wrapper** | Native APK compilation with Camera & Network plugins | `capacitor.config.ts`, `android/`, `src/services/cameraService.ts`, `src/services/networkService.ts` | Gradle `assembleDebug` APK compilation & native API capability checks |

---

## 4. System Architecture
The application adheres to a lightweight, framework-agnostic architecture using Vanilla TypeScript, CSS custom properties, and native web standards.

```
                  +--------------------------------------------------+
                  |               VKU Field Survey UI                |
                  |  Dashboard | Wizard (Steps 1-6) | Queue | Settings |
                  +--------------------------------------------------+
                                           |
               +---------------------------+---------------------------+
               |                                                       |
     [Hardware Abstraction]                                  [Storage & Sync Engine]
  +--------------------------+                             +--------------------------+
  |  NetworkService          |                             |  InspectionRepository    |
  |  - @capacitor/network    |                             |  - CRUD Operations       |
  |  - window.ononline       |                             +--------------------------+
  +--------------------------+                                         |
  |  CameraService           |                             +--------------------------+
  |  - @capacitor/camera     |                             |  SyncQueueManager        |
  |  - HTML5 <input capture> |                             |  - Sequential FIFO Loop  |
  +--------------------------+                             |  - State Transitions     |
                                                           +--------------------------+
                                                                       |
               +-------------------------------------------------------+
               |                                                       |
  +--------------------------+                             +--------------------------+
  |  Service Worker (sw.js)  |                             |  IndexedDB (idb)         |
  |  - Cache-First App Shell |                             |  - 'inspections' store   |
  |  - Background Sync API   |                             |  - 'syncQueue' store     |
  +--------------------------+                             |  - 'appMetadata' store   |
                                                           +--------------------------+
```

---

## 5. Offline Strategy & Cache Lifecycle
The Service Worker (`public/sw.js`) manages a cache named `vku-survey-shell-v1`:
1. **Install Stage:** Precaches HTML, CSS, JavaScript chunks, manifest, and icons.
2. **Fetch Interception:** 
   - Static assets & App Shell: Checks cache first. If found, serves immediately; asynchronously checks network for updates.
   - Navigation: If network is offline, returns cached `index.html`.
3. **Background Sync:** Registers `vku-inspection-sync` tag with `SyncManager` where supported, firing dispatch events even if the browser tab was closed.

---

## 6. IndexedDB & Sync Queue State Machine
All data storage is managed through the Promise-based `idb` library with three stores:
1. `inspections`: Keyed by UUID, storing location, category, rating, defect notes, photo data URL, and status.
2. `syncQueue`: Keyed by UUID, tracking queued timestamps, attempt counters, and error diagnostics.
3. `appMetadata`: Key-value store holding the in-progress draft and demo flags.

### State Transition Lifecycle:
```
  [User Submits Form]
          |
          v
   +--------------+      Device Offline
   | PENDING_SYNC | ------------------------> [Stored safely in IndexedDB]
   +--------------+                                      |
          |                                              | (Connection Restored)
          | (Online)                                     |
          v                                              v
   +--------------+
   |   SYNCING    | <------------------------------------+
   +--------------+
      /        \
     /          \
(Success)     (Error / 503)
   v              v
+--------+   +----------+
| SYNCED |   |  FAILED  | ----> [Retry Trigger / Backoff]
+--------+   +----------+
```

---

## 7. Capacitor Android Integration
The application wraps seamlessly into Android using Capacitor 7:
- **`@capacitor/network`**: Listens to Android connectivity broadcast receivers, normalized with web `navigator.onLine`.
- **`@capacitor/camera`**: Triggers Android's native Camera intent with `CameraResultType.DataUrl`, providing crisp photo capture with automated web file picker fallback for browser testing.
- **Android Scheme:** Configured with `androidScheme: 'https'` to allow Service Workers and secure web contexts to function properly within Android WebView.

---

## 8. Testing & Verification Summary
An automated unit test suite built with Vitest and `fake-indexeddb` validates the core logic:
- **Form Validation Tests (`tests/validation.test.ts`):** 4 tests verifying location fields, category constraints, 1-5 star ratings, and full submission validity.
- **Storage Persistence Tests (`tests/storage.test.ts`):** 2 tests verifying that form drafts survive reloads and clear cleanly.
- **Queue & State Machine Tests (`tests/queue.test.ts`):** 5 tests verifying FIFO execution, `PENDING_SYNC -> SYNCING -> SYNCED`, server failure recovery (`FAILED -> Retry`), offline suspension, and Last-Write-Wins conflict resolution.
- **Repository Filter Tests (`tests/repository.test.ts`):** 4 tests verifying search, category filters, building filters, and today's inspection count aggregation.
- **Total:** 15 passing tests across 4 suites.

---

## 9. Conclusion
VKU Field Survey satisfies all academic and technical requirements set forth by the instructor. It demonstrates how modern web applications can achieve 100% offline capability without sacrificing user experience or reliability.
