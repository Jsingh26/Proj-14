# Mini Job Queue Management — Frontend Dashboard

A responsive, production-minded Job Queue Dashboard built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## Features

- **Dashboard Overview**: Single-page dashboard tracking background job statuses.
- **Dynamic Metric Cards**: Real-time counts for `Pending`, `Running`, `Completed`, and `Failed` jobs derived directly from API data.
- **Status Filter**: Client-side filtering across `All`, `Pending`, `Running`, `Completed`, and `Failed` jobs.
- **Action Buttons by State**:
  - `PENDING`: `[Start]` and `[Delete]`
  - `RUNNING`: `[Complete]`, `[Fail]`, and `[Delete]`
  - `COMPLETED`: `[Delete]`
  - `FAILED`: `[Delete]`
- **In-flight Loading Indicators**: Buttons and forms display loading spinners and disable interactions during active API calls to prevent accidental duplicate clicks.
- **Resilient Concurrency & Error Handling**:
  - Catches `409 Conflict` errors and displays a clear toast notification indicating that another tab/request modified the job.
  - Automatically refetches server state immediately upon encountering a conflict or error.
  - Clear retry states for network interruptions.
- **Automatic Cross-Tab Synchronization**:
  - Lightweight polling every 6 seconds ensures multiple open tabs stay synchronized without heavy infrastructure.
  - Includes a pause/resume toggle and timestamp indicator.

---

## Folder Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Header.tsx           # Nav bar with title, sync toggle, refresh & create buttons
│   │   ├── StatsCards.tsx       # 5 dynamic metric cards with active filter rings
│   │   ├── JobTable.tsx         # Responsive table container
│   │   ├── JobRow.tsx           # Individual job item with valid action buttons
│   │   ├── StatusBadge.tsx      # Color-coded status badge with animated pulse/spinners
│   │   ├── StatusFilter.tsx     # Filter tabs with item counts
│   │   ├── CreateJobModal.tsx   # Modal with title/type inputs and validation
│   │   ├── LoadingState.tsx     # Initial loader
│   │   ├── EmptyState.tsx       # Zero-jobs and empty-filter state handlers
│   │   ├── ErrorState.tsx       # Network error card with retry button
│   │   └── ToastContainer.tsx   # Floating toast alerts for conflicts & notifications
│   │
│   ├── pages/
│   │   └── Dashboard.tsx        # Main dashboard page
│   │
│   ├── services/
│   │   └── jobApi.ts            # Axios client with structured error extraction
│   │
│   ├── hooks/
│   │   └── useJobs.ts           # State management, stats derivation, and auto-poller
│   │
│   ├── types/
│   │   └── job.ts               # Core TypeScript models and enums
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the backend REST API | `http://localhost:3000` |

---

## Local Setup & Development

```bash
# 1. Install dependencies
npm install

# 2. Run development server (Vite on port 5173)
npm run dev

# 3. Build production bundle
npm run build
```
