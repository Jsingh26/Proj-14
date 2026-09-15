# Mini Job Queue Management Dashboard

A production-minded, full-stack **Job Queue Management Dashboard** engineered with **NestJS**, **Prisma ORM**, **PostgreSQL**, **Redis Distributed Locking**, and **React** (Vite + TypeScript + Tailwind CSS).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [State Machine & Business Invariants](#4-state-machine--business-invariants)
5. [Concurrency Strategy & Defense-in-Depth](#5-concurrency-strategy--defense-in-depth)
6. [1,000 QPS Capacity Planning & Scalability Reasoning](#6-1000-qps-capacity-planning--scalability-reasoning)
7. [REST API Documentation](#7-rest-api-documentation)
8. [Database Schema & Indexes](#8-database-schema--indexes)
9. [Redis Failure Strategy (HTTP 503)](#9-redis-failure-strategy-http-503)
10. [Local Development & Setup Guide](#10-local-development--setup-guide)
11. [Environment Variables](#11-environment-variables)
12. [Verification & Testing Suite](#12-verification--testing-suite)
13. [Trade-offs](#13-trade-offs)
14. [Future Improvements](#14-future-improvements)

---

## 1. Project Overview

The **Mini Job Queue Management Dashboard** is a full-stack system designed to manage and monitor background job lifecycles. It provides visibility into jobs across distinct lifecycle phases (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`) and guarantees strict consistency under high concurrency.

The repository is organized into two completely decoupled, independently runnable, and independently deployable applications:
- **`backend/`**: NestJS REST API with Prisma ORM, PostgreSQL persistence, Redis distributed locks, and atomic conditional state transitions.
- **`frontend/`**: Single-Page React Application with Vite, TypeScript, Tailwind CSS, real-time statistics cards, status filtering, optimistic feedback, resilient concurrency conflict resolution, and automatic cross-tab polling.

---

## 2. System Architecture

```text
                                  ┌───────────────────────────┐
                                  │      React + Vite UI      │
                                  │ (Dashboard, Stats, Poller)│
                                  └─────────────┬─────────────┘
                                                │ REST API (JSON)
                                                ▼
                                  ┌───────────────────────────┐
                                  │       NestJS Backend      │
                                  │  (ValidationPipe, CORS)   │
                                  └──────┬─────────────┬──────┘
                                         │             │
        Distributed Lock (SET NX EX 5)   │             │ Atomic Conditional Update
                 Lua Script Release      │             │ (WHERE id = :id AND status = :prev)
                                         ▼             ▼
                                  ┌─────────────┐  ┌─────────────┐
                                  │    Redis    │  │ PostgreSQL  │
                                  │ (Distributed│  │ (Prisma ORM,│
                                  │    Locks)   │  │  Indexes)   │
                                  └─────────────┘  └─────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler & Tooling**: Vite 5
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **State & Synchronization**: React Hooks (`useJobs`) with automatic 6-second background polling

### Backend
- **Framework**: NestJS 10 (Node.js TypeScript framework)
- **Database ORM**: Prisma ORM 5
- **Database**: PostgreSQL 16
- **Distributed Locking**: Redis 7 via `ioredis`
- **Validation**: `class-validator` & `class-transformer` with global strict `ValidationPipe`
- **Testing**: Jest unit tests and end-to-end concurrency integration tests

### Infrastructure
- **Containerization**: Docker & Docker Compose (`docker-compose.yml`)

---

## 4. State Machine & Business Invariants

The backend strictly enforces the following finite state machine:

```text
                ┌──────────────→ COMPLETED (terminal)
                │
  PENDING ──→ RUNNING
                │
                └──────────────→ FAILED (terminal)
```

### Transition Matrix

| Current State | Target State | Legal? | Response |
| :--- | :--- | :--- | :--- |
| `PENDING` | `RUNNING` | **Yes** | `200 OK` (Job starts) |
| `RUNNING` | `COMPLETED` | **Yes** | `200 OK` (Job succeeds) |
| `RUNNING` | `FAILED` | **Yes** | `200 OK` (Job fails) |
| `PENDING` | `COMPLETED` | **No** | `409 Conflict` (Bypasses execution) |
| `PENDING` | `FAILED` | **No** | `409 Conflict` (Bypasses execution) |
| `COMPLETED` | *Any* | **No** | `409 Conflict` (Terminal state) |
| `FAILED` | *Any* | **No** | `409 Conflict` (Terminal state) |
| *Any* | `PENDING` | **No** | `409 Conflict` (Cannot regress to PENDING) |
| State $S$ | State $S$ | **No** | `409 Conflict` (No-op transition invalid) |

The backend acts as the sole authority. Even if a user crafts a direct HTTP request or uses `curl` to bypass the UI, the state machine invariants cannot be violated.

---

## 5. Concurrency Strategy & Defense-in-Depth

### Why Race Conditions Occur
In a typical distributed or multi-tab web application:
1. Tab A queries `GET /jobs` and observes Job 1 with status `PENDING`.
2. Tab B queries `GET /jobs` and simultaneously observes Job 1 with status `PENDING`.
3. Both users click **Start** (`PATCH /jobs/1/status` with `status: "RUNNING"`).
4. If the backend naively executes:
   ```sql
   SELECT status FROM jobs WHERE id = 1;
   -- if status == 'PENDING':
   UPDATE jobs SET status = 'RUNNING' WHERE id = 1;
   ```
   Both requests can read `PENDING` before either update commits, resulting in duplicate transitions, phantom side effects, or duplicate worker dispatch.

### Defense-in-Depth Architecture
To eliminate race conditions across multiple horizontally scaled backend instances, this system applies four layers of defense:

```text
Request
  ↓
[Layer 1: NestJS ValidationPipe]
  Checks DTO types, non-empty strings, and valid JobStatus enum values.
  ↓
[Layer 2: Invariant Check & Redis Distributed Lock]
  Acquires `job:{id}:status-lock` via `SET job:{id}:status-lock {uuid} NX PX 5000`.
  If lock is held by another request, immediately returns `409 Conflict`.
  ↓
[Layer 3: PostgreSQL Atomic Conditional Update]
  Executes a single atomic query:
  UPDATE "Job" SET "status" = $target WHERE "id" = $id AND "status" = $expectedPrev;
  If affected rows is 0, the job either does not exist (`404`) or was already modified (`409`).
  ↓
[Layer 4: Safe Token-Based Lua Lock Release]
  Releases Redis lock using an atomic Lua script:
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
  Guarantees that a slow request whose lock expired cannot delete another request's lock.
```

### Behavior When Two Requests Arrive Simultaneously
```text
Request A (Tab A)                 Request B (Tab B)
PATCH /jobs/1/status              PATCH /jobs/1/status
      │                                 │
      ▼                                 ▼
Acquires Redis Lock               Tries to acquire Redis Lock
(SET ... NX PX 5000) -> OK        (SET ... NX PX 5000) -> NULL (already locked)
      │                                 │
Database Conditional UPDATE:            ▼
UPDATE ... WHERE status = 'PENDING'   Returns 409 Conflict:
Affected rows: 1                      {"message": "Job status is currently being updated..."}
      │
Releases Redis Lock via Lua
      │
      ▼
Returns 200 OK (Job is now RUNNING)
```

---

## 6. 1,000 QPS Capacity Planning & Scalability Reasoning

### Traffic Distribution Modeling

| Endpoint | Method | Traffic % | Peak QPS | Requests / Min | Requests / Hour |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/jobs` | `GET` | 60% | **600 QPS** | 36,000 | 2,160,000 |
| `/jobs` | `POST` | 10% | **100 QPS** | 6,000 | 360,000 |
| `/jobs/:id/status` | `PATCH` | 20% | **200 QPS** | 12,000 | 720,000 |
| `/jobs/:id` | `DELETE` | 10% | **100 QPS** | 6,000 | 360,000 |
| **Total** | | **100%** | **1,000 QPS** | **60,000** | **3,600,000** |

### Horizontal Scalability Architecture

```text
                           ┌── NestJS Instance 1 ──┐
                           │                        │
Clients ──▶ Load Balancer ─┼── NestJS Instance 2 ───┼──▶ PostgreSQL (Connection Pooler)
                           │                        │
                           └── NestJS Instance 3 ──┘
                                    │
                                    └──▶ Redis Cluster / Sentinel (Shared Locks)
```

1. **Stateless API Tier**:
   - NestJS instances keep zero session state or in-memory lock state.
   - Any backend instance can handle any incoming request.
2. **Shared Distributed Locking**:
   - Redis coordinates status transitions across all backend replicas so instances never run isolated locking logic.
   - Lock TTL is intentionally short (5,000ms) because critical sections execute in $<10\text{ms}$.
3. **Database Performance & Invariants**:
   - B-Tree indexes on `status` and `createdAt` eliminate full table scans during `GET /jobs` (`ORDER BY createdAt DESC`) and filtered lookups.
   - Conditional single-query updates (`updateMany`) avoid extra `SELECT` round-trips.
   - Connection pool size (e.g. PgBouncer / Prisma connection limits) ensures database connection starvation does not occur under peak load.

---

## 7. REST API Documentation

### Base URL
`http://localhost:3000` (configurable via `PORT` and `VITE_API_URL`)

### Standard Error Format
All errors return a uniform, predictable JSON contract:
```json
{
  "statusCode": 409,
  "message": "Job status has already changed or the requested transition is invalid (current: RUNNING, requested: RUNNING)",
  "error": "Conflict"
}
```

---

### Endpoints

#### 1. Create Job
- **URL**: `POST /jobs`
- **Request Body**:
  ```json
  {
    "title": "Generate Monthly Financial Report",
    "type": "report"
  }
  ```
- **Validation**:
  - `title`: String, 3–120 characters, trimmed, required.
  - `type`: String, 2–50 characters, trimmed, required.
- **Backend Behavior**:
  - Automatically initializes `status = PENDING`.
  - Automatically initializes `createdAt = current timestamp`.
  - Clients cannot set initial status.
- **Response**: `201 Created`
  ```json
  {
    "id": 1,
    "title": "Generate Monthly Financial Report",
    "type": "report",
    "status": "PENDING",
    "createdAt": "2026-09-15T08:30:00.000Z"
  }
  ```

#### 2. Get All Jobs
- **URL**: `GET /jobs`
- **Response**: `200 OK`
  - Array of all jobs ordered by `createdAt DESC`.

#### 3. Update Job Status
- **URL**: `PATCH /jobs/:id/status`
- **Request Body**:
  ```json
  {
    "status": "RUNNING"
  }
  ```
- **Valid Status Values**: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.
- **Response Codes**:
  - `200 OK`: Transition succeeded. Returns updated job object.
  - `400 Bad Request`: Payload missing status or invalid enum value.
  - `404 Not Found`: Job with given `:id` does not exist.
  - `409 Conflict`: Illegal state transition or concurrent modification.
  - `503 Service Unavailable`: Redis lock service unreachable.

#### 4. Delete Job
- **URL**: `DELETE /jobs/:id`
- **Response Codes**:
  - `204 No Content`: Job deleted successfully.
  - `404 Not Found`: Job with given `:id` does not exist.

---

## 8. Database Schema & Indexes

PostgreSQL is the ultimate source of truth for all job data.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

model Job {
  id        Int       @id @default(autoincrement())
  title     String
  type      String
  status    JobStatus @default(PENDING)
  createdAt DateTime  @default(now())

  @@index([status])
  @@index([createdAt])
}
```

### Why Indexes Matter:
- `@@index([status])`: Dramatically accelerates status filtering, aggregation queries, and state machine conditional lookups.
- `@@index([createdAt])`: Avoids costly database in-memory sort operations during high-volume `GET /jobs` ordering (`ORDER BY createdAt DESC`).

---

## 9. Redis Failure Strategy (HTTP 503)

In accordance with Section 28 of the specification:
- If Redis becomes unavailable, the system **does not silently pretend** that distributed locking succeeded.
- Any request attempting a state transition that requires the distributed lock fails fast and returns **`503 Service Unavailable`**:
  ```json
  {
    "statusCode": 503,
    "message": "Distributed lock service is currently unavailable. Please try again.",
    "error": "Service Unavailable"
  }
  ```
- **Trade-off Justification**: In a distributed multi-instance deployment, bypassing Redis locking could lead to concurrent workers acquiring the same job before the database commits. Returning 503 ensures that clients know the coordination tier is degraded and can safely retry with exponential backoff.

---

## 10. Local Development & Setup Guide

### Prerequisites
- Node.js 20+
- npm 10+
- Docker & Docker Compose

### 1. Start Infrastructure (PostgreSQL & Redis)
A root `docker-compose.yml` is provided. Run:
```bash
docker compose up -d
```
*Note: PostgreSQL is mapped to port `5433` on the host to prevent conflicts with any pre-existing local Postgres services.*

### 2. Start Backend API
```bash
cd backend

# Copy environment variables
copy .env.example .env

# Install dependencies
npm install

# Push schema to PostgreSQL & generate Prisma Client
npx prisma generate
npx prisma db push

# Run test suite
npm test

# Start backend in development mode (port 3000)
npm run start:dev
```

### 3. Start Frontend Dashboard
```bash
cd ../frontend

# Copy environment variables
copy .env.example .env

# Install dependencies
npm install

# Run frontend in development mode (port 5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 11. Environment Variables

### Backend (`backend/.env`)
```ini
PORT=3000
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5433/job_queue?schema=public
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:3000
```

---

## 12. Verification & Testing Suite

### Running Backend Unit & Concurrency Integration Tests
```bash
cd backend
npm test
```

### Tests Covered:
1. `create`: Valid job creation, initial `PENDING` status enforcement.
2. `findAll`: Sorted by `createdAt DESC`.
3. `findOne`: Retrieval and 404 validation.
4. `updateStatus`:
   - Valid transition: `PENDING` $\rightarrow$ `RUNNING`
   - Valid transition: `RUNNING` $\rightarrow$ `COMPLETED`
   - Valid transition: `RUNNING` $\rightarrow$ `FAILED`
   - Invalid transition: `PENDING` $\rightarrow$ `COMPLETED` (409 Conflict)
   - Invalid transition: `PENDING` $\rightarrow$ `FAILED` (409 Conflict)
   - Terminal state invariant: `COMPLETED` $\rightarrow$ `RUNNING` (409 Conflict)
   - Terminal state invariant: `FAILED` $\rightarrow$ `RUNNING` (409 Conflict)
   - Regressive invariant: Transitioning to `PENDING` (409 Conflict)
   - Non-existent job: (404 Not Found)
5. `concurrency.integration.spec.ts` (Live Postgres + Redis):
   - Fires simultaneous `PENDING` $\rightarrow$ `RUNNING` updates for the same job.
   - Asserts that **exactly 1 request succeeds** and **exactly 1 request receives 409 Conflict**.
   - Asserts that the Redis lock key is safely freed.
6. `remove`: Successful deletion and 404 validation.

---

## 13. Trade-offs

1. **Client-side Filtering vs Server-side Filtering**:
   - For this assignment's expected dataset size, filtering is executed on the frontend for instant user response without extra network hops.
   - For enterprise scale, filtering, search, and pagination would be offloaded to database queries (`WHERE status = $1 LIMIT $limit OFFSET $offset`).
2. **Lightweight Polling vs WebSockets / SSE**:
   - Polling every 6 seconds provides reliable cross-tab synchronization with minimal operational complexity.
   - For high-frequency real-time updates (thousands of state changes per second), Server-Sent Events (SSE) or WebSockets would be preferable.
3. **Strict 503 on Redis Outage vs Degraded DB-Only Mode**:
   - We chose to fail fast with 503 when Redis is unavailable to preserve distributed mutual exclusion across clustered nodes.

---

## 14. Future Improvements

- **Cursor-based Pagination**: Infinite scroll or page-based slicing for datasets exceeding 100,000 records.
- **Server-Sent Events (SSE)**: Push status changes reactively to connected browser tabs.
- **BullMQ Worker Integration**: Introduce distributed background worker processes to execute actual tasks when jobs transition to `RUNNING`.
- **Token Bucket Rate Limiting**: Redis-based rate limiting per client IP to safeguard against denial-of-service spikes.
- **Distributed Tracing & Metrics**: OpenTelemetry instrumentation with Prometheus metrics (`qps_total`, `state_transition_duration_ms`).
- **Role-Based Access Control (RBAC)**: Authentication with JWT to distinguish between read-only viewers and job operators.
