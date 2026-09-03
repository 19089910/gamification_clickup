# Implementation Plan - Fix Mind Map Synchronization

Changes in the mind map (POST/PUT) are currently not reflected immediately in the UI because of server-side caching in the Next.js `fetch` implementation when calling the ClickUp API.

## User Review Required

> [!IMPORTANT]
> **ClickUp API Rate Limits:** Disabling server-side caching will cause more frequent calls to the ClickUp API. Given the interactive nature of the Mind Map, this is necessary for a good user experience, but be aware of your ClickUp workspace's rate limits.

## Proposed Changes

### [Server-Side] ClickUp API Library

#### [MODIFY] [clickup.ts](file:///c:/Users/lucas/OneDrive/Documentos/PROJETOS/gamification/src/lib/clickup.ts)
- Remove `next: { revalidate: 60 }` from the `fetchClickUp` function.
- Change it to `{ cache: 'no-store' }` to ensure we always get the latest data from ClickUp when the mind map is requested.

### [Server-Side] API Routes

#### [MODIFY] [route.ts](file:///c:/Users/lucas/OneDrive/Documentos/PROJETOS/gamification/src/app/api/clickup/graph/route.ts)
- Add `export const dynamic = 'force-dynamic'` to ensure Next.js does not statically optimize this route.

### [Client-Side] Graph Data Hook

#### [MODIFY] [useClickUpData.ts](file:///c:/Users/lucas/OneDrive/Documentos/PROJETOS/gamification/src/hooks/useClickUpData.ts)
- Reduce `staleTime` for the `clickup-graph` query. 5 minutes is too long for an interactive management tool. I'll reduce it to 30 seconds or even 0.

## Open Questions

- Should we implement **Optimistic Updates**? 
  - *Pros:* The UI updates instantly when you rename a task. 
  - *Cons:* More complex to implement correctly for a graph structure. 
  - *Recommendation:* Let's fix the caching first. If it's still too slow, we can add optimistic updates in a follow-up.

## Verification Plan

### Manual Verification
1. Open the ClickUp Mind Map.
2. Open a Task detail panel and change its name.
3. Press "Enter" to save.
4. Verify that the task label in the mind map updates automatically without needing a page refresh or server restart.
5. Repeat for adding a new task and changing a quarter.
