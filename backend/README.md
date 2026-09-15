# Mini Job Queue Management — Backend API

Production-minded REST API built with **NestJS**, **Prisma ORM**, **PostgreSQL**, and **Redis Distributed Locking**.

## Architecture & Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js TypeScript framework)
- **Database ORM**: [Prisma](https://www.prisma.io/) with PostgreSQL
- **Distributed Locking**: [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis)
- **Validation**: `class-validator` & `class-transformer` with global `ValidationPipe`
- **Testing**: Jest unit and concurrency test suite

```text
Clients
   │
   ▼
[NestJS REST API]
   ├── Global ValidationPipe (whitelist, forbidNonWhitelisted, transform)
   ├── JobsController & JobsService
   │
   ├── Redis Distributed Lock (`job:{id}:status-lock`, NX EX 5, Lua token release)
   │
   └── PostgreSQL (Atomic conditional UPDATE WHERE id = $1 AND status = $expected)
```

---

## State Machine & Business Invariants

```text
                ┌──────────────→ COMPLETED (terminal)
                │
  PENDING ──→ RUNNING
                │
                └──────────────→ FAILED (terminal)
```

- **Allowed transitions**:
  - `PENDING` $\rightarrow$ `RUNNING`
  - `RUNNING` $\rightarrow$ `COMPLETED`
  - `RUNNING` $\rightarrow$ `FAILED`
- **Terminal states**: `COMPLETED` and `FAILED` can never transition again.
- **Defense in Depth**:
  1. **DTO Validation**: Validates that the requested status is a valid enum value.
  2. **State Machine Invariant Check**: Fast static verification of target transition.
  3. **Redis Distributed Lock**: Prevents parallel workers from updating the same job concurrently.
  4. **Atomic Conditional Database Update**:
     ```sql
     UPDATE "Job"
     SET "status" = $target
     WHERE "id" = $id AND "status" = $expectedOldStatus;
     ```
     If affected rows is `0`, a `409 Conflict` is returned.

---

## Redis Failure Strategy (HTTP 503)

If Redis is temporarily down or unreachable:
- Rather than silently pretending that distributed locking succeeded, status updates fail fast with **`503 Service Unavailable`**.
- This upholds strict distributed locking guarantees across clustered backend instances.

---

## API Documentation

### 1. Create Job
- **Method**: `POST`
- **Path**: `/jobs`
- **Request Body**:
  ```json
  {
    "title": "Generate Monthly Report",
    "type": "report"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": 1,
    "title": "Generate Monthly Report",
    "type": "report",
    "status": "PENDING",
    "createdAt": "2026-09-15T08:30:00.000Z"
  }
  ```
- Initial status is always `PENDING`. Clients cannot set initial status.

### 2. Get All Jobs
- **Method**: `GET`
- **Path**: `/jobs`
- **Response**: `200 OK`
  ```json
  [
    {
      "id": 1,
      "title": "Generate Monthly Report",
      "type": "report",
      "status": "PENDING",
      "createdAt": "2026-09-15T08:30:00.000Z"
    }
  ]
  ```
- Ordered by `createdAt DESC`.

### 3. Update Job Status
- **Method**: `PATCH`
- **Path**: `/jobs/:id/status`
- **Request Body**:
  ```json
  {
    "status": "RUNNING"
  }
  ```
- **Response**:
  - `200 OK` with updated job object.
  - `400 Bad Request` if payload is malformed or status is not a valid enum.
  - `404 Not Found` if job ID does not exist.
  - `409 Conflict` if the transition is illegal or the job was already updated.
  - `503 Service Unavailable` if Redis is down.

### 4. Delete Job
- **Method**: `DELETE`
- **Path**: `/jobs/:id`
- **Response**:
  - `204 No Content` on success.
  - `404 Not Found` if job ID does not exist.

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API listening port | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgrespassword@localhost:5433/job_queue?schema=public` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `http://localhost:5173` |

---

## Local Setup & Development

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client & push schema to PostgreSQL
npx prisma generate
npx prisma db push

# 3. Run unit tests
npm test

# 4. Start backend in development mode
npm run start:dev
```
