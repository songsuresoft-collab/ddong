# API Routes — Future Backend Placeholder

This directory is reserved for future API route implementations.

## Current Status
All data processing is performed **client-side** (IndexedDB, in-browser parsing).
No backend implementation is required at this time.

## Planned Routes (Future Extension)

```
app/api/
├── sessions/
│   └── route.ts        # GET /api/sessions, POST /api/sessions
├── reports/
│   └── route.ts        # GET /api/reports/:sessionId
├── compare/
│   └── route.ts        # POST /api/compare
└── export/
    └── route.ts        # POST /api/export
```

## When to Implement

Implement these routes when:
1. Multi-user support is required (shared sessions)
2. Server-side file storage is needed
3. CI/CD pipeline integration is planned
4. Authentication/authorization is added

## Architecture Note

The current frontend-only approach (IndexedDB) is intentional:
- Zero backend dependency
- Works fully offline
- No server infrastructure required

Future migration path: IndexedDB → API routes → Database (e.g., PostgreSQL, SQLite)
