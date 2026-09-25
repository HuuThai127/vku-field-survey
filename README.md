# VKU Field Survey — Offline-First PWA + Capacitor Android

> **Campus Facility Inspection System for Vietnam - Korea University of Information and Communication Technology (VKU)**  
> Built with Vanilla TypeScript, Service Worker Cache-First App Shell, IndexedDB Storage, Sequential Sync Queue, and Capacitor 7 Native Android Bridge.

---

## 📸 Screenshots

| 01. Dashboard & Statistics | 02. Multi-Step Inspection Wizard |
| :---: | :---: |
| ![Dashboard](screenshots/01-dashboard.png) | ![Inspection Wizard](screenshots/02-inspection-form.png) |
| *Real-time metrics, online/offline pill, and audit cards* | *Location, category, 1–5 stars, defect notes & photo* |

| 03. Offline Queued (PENDING_SYNC) | 04. Synced Result & Detail |
| :---: | :---: |
| ![Offline Pending](screenshots/03-offline-pending.png) | ![Sync Success](screenshots/04-sync-success.png) |
| *Zero-network offline banner & pending queue item* | *Automatic sequential dispatch upon reconnection* |

---

## 🎯 1. Project Overview & Problem Statement

VKU facility inspectors and student auditors regularly inspect classrooms, projectors, air conditioning units, electrical installations, and furniture in campus basements, server rooms, and remote lecture halls where Wi-Fi and mobile network signals are unavailable.

**VKU Field Survey** is designed from the ground up to solve this problem:
- **100% Offline Boot:** Operates with zero network connectivity using Service Worker app shell caching.
- **Draft Persistence:** Unfinished inspection audits are automatically autosaved to IndexedDB and survive full page reloads.
- **Sequential Sync Queue:** Form submissions made while offline enter a deterministic FIFO queue as `PENDING_SYNC`.
- **Automatic Reconnection Dispatch:** When network connectivity is restored, the queue dispatches records sequentially to the central server.
- **Native Android APK:** Wraps into a high-performance native Android application using Capacitor native plugins for Camera and Network monitoring.

---

## 🏆 2. Academic Learning Objectives Mapping

| Learning Objective | Requirement | Implementation | Verification Method |
| :--- | :--- | :--- | :--- |
| **LO1: Offline-First PWA** | Standalone installation, manifest, theme `#0284c7`, 192/512px icons | [`public/manifest.json`](manifest.json), [`index.html`](index.html), [`public/icons/`](public/icons/) | PWA installation prompt, standalone display audit |
| **LO2: Cache-First App Shell & Storage** | Service Worker precache + IndexedDB draft persistence | [`public/sw.js`](public/sw.js), [`src/storage/indexedDb.ts`](src/storage/indexedDb.ts), [`src/storage/draftStorage.ts`](src/storage/draftStorage.ts) | Offline reload test: Draft survives page refresh |
| **LO3: Offline Sync Queue** | Sequential queue: `PENDING_SYNC` → `SYNCING` → `SYNCED` / `FAILED` | [`src/sync/syncQueue.ts`](src/sync/syncQueue.ts), [`src/sync/serverAdapter.ts`](src/sync/serverAdapter.ts) | Vitest automated suite (15 tests) + online/offline test |
| **LO4: Capacitor Android Wrapper** | Native APK compilation with Camera & Network plugins | [`capacitor.config.ts`](capacitor.config.ts), [`android/`](android/), [`src/services/cameraService.ts`](src/services/cameraService.ts) | Android APK compilation (`assembleDebug`) |

---

## 🏗️ 3. Architecture & Tech Stack

- **Core:** HTML5, Vanilla TypeScript, Vanilla CSS (Design system with CSS variables, mobile-first responsive layout).
- **Offline Storage:** IndexedDB using [`idb`](https://github.com/jakearchibald/idb) v8.
- **Service Worker:** Native Service Worker API with Cache-First strategy for App Shell and Background Sync listener.
- **Native Bridge:** Capacitor 7 (`@capacitor/core`, `@capacitor/android`, `@capacitor/camera`, `@capacitor/network`).
- **Testing:** Vitest + `fake-indexeddb` for fast, deterministic unit and state transition tests.
- **Bundler:** Vite 6 with relative base `./` for web and Android WebView compatibility.

```
miniproject1/
├── android/                   # Capacitor Android native project & Gradle build
├── public/
│   ├── favicon.ico
│   ├── manifest.json          # PWA standalone manifest
│   ├── sw.js                  # Cache-First Service Worker
│   └── icons/                 # 192x192 & 512x512 standard & maskable icons
├── src/
│   ├── components/            # UI components (Header, Badges, StarRating, Progress)
│   ├── constants/             # VKU buildings, categories, configuration
│   ├── pages/                 # Dashboard, NewInspection, SyncQueue, Detail, Settings
│   ├── services/              # Repository, CameraService, NetworkService
│   ├── storage/               # IndexedDB setup, draft storage, queue storage
│   ├── styles/                # Clean academic mobile-first CSS design system
│   ├── sync/                  # Sequential sync queue and mock server adapter
│   ├── types/                 # Strongly-typed domain and database models
│   ├── utils/                 # UUID, date, validation, conflict resolution
│   └── main.ts                # Application router and entry point
├── tests/                     # 15 Vitest automated test cases
├── screenshots/               # Demonstration captures
├── report/                    # University Technical Report (PDF / Markdown)
├── capacitor.config.ts        # Capacitor configuration
├── package.json
└── tsconfig.json
```

---

## 💾 4. IndexedDB & Domain Model

Database: `vku-field-survey` (Version 1)

### Stores:
1. **`inspections`** (Key: `id` [UUID])
   - `id`: UUID v4
   - `building`, `floor`, `room`: Location strings
   - `category`: Hardware | Projector | AC | Electrical | Furniture
   - `rating`: 1 | 2 | 3 | 4 | 5
   - `defectNotes`: string
   - `photo`: Compressed Data URL (base64)
   - `syncStatus`: `DRAFT` | `PENDING_SYNC` | `SYNCING` | `SYNCED` | `FAILED`
   - `syncAttempts`: number
   - `createdAt`, `updatedAt`, `syncedAt`: epoch timestamps
2. **`syncQueue`** (Key: `id`)
   - `inspectionId`: UUID
   - `queuedAt`: timestamp
   - `attempts`: number
   - `status`: SyncStatus
   - `errorMessage`?: string
3. **`appMetadata`** (Key: `key`)
   - `vku_active_draft`: In-progress multi-step form draft (survives offline reloads)
   - `is_seeded`: Flag for deterministic initial demo data

---

## ⚡ 5. Sync Queue & Server Dispatch Boundary

```
[User Submits Form]
       |
       v
+--------------+     Offline
| PENDING_SYNC | ----------------> Saved locally in IndexedDB
+--------------+                             |
       |                                     | (Online Event / Background Sync)
       | (Online)                            |
       v                                     v
+--------------+
|   SYNCING    | <---------------------------+
+--------------+
   /        \
  /          \
(Success)   (503 / Network Timeout)
 v            v
+--------+  +----------+
| SYNCED |  |  FAILED  | ----> Queued for retry with error message
+--------+  +----------+
```

> **Note on Server Dispatch:**  
> *"Offline synchronization is implemented against a mock server adapter (`src/sync/serverAdapter.ts`) because no backend service is specified by the university assignment."*  
> If an instructor API endpoint is provided, only the `dispatchInspection()` function needs to be updated with the remote URL.

---

## 🚀 6. Local Development & Testing

### Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm 9+

### Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run all automated unit tests (15 tests)
npm test

# Build production PWA bundle into dist/
npm run build

# Preview production build locally
npm run preview
```

### Android APK Build
```bash
# Sync web dist to Capacitor Android project
npx cap sync android

# Build debug APK via Gradle
cd android
./gradlew assembleDebug
```
The compiled APK will be generated at:  
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🧪 7. Offline Verification Walkthrough

To verify offline operation in any standard web browser:
1. Open the application.
2. Open DevTools (F12) → **Network** tab → set to **Offline** (or toggle the offline switch in **Settings**).
3. Notice the header displays **🔴 Offline** and the offline advisory banner appears.
4. Click **+ New Facility Inspection** and enter Room (e.g. `A1-203`), select Category, Rating, Notes, and Photo.
5. Click **Save Draft** or advance through the wizard and hit **Save Offline (Pending)**.
6. Refresh the browser while still **Offline**. Notice the app shell loads instantly from cache and your draft or queued submission is intact.
7. Re-enable network connectivity (**Online**).
8. The sync queue automatically detects connection, updates to **SYNCING**, and marks the record **SYNCED** with zero data loss.

---

## 📋 8. Deliverables & Links

- **Repository:** Public GitHub Repository
- **Live Demo (HTTPS):** Cloudflare Pages / Vercel deployment URL
- **Technical Report:** [`report/technical-report.md`](report/technical-report.md)
- **Installable Android APK:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📜 9. License

Developed for the VKU Mini-Project Course. Educational and campus facility audit use only.
