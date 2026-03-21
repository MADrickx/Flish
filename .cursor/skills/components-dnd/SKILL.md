---
name: preem-components-dnd
description: >-
  Documents Preem's component conventions and Drag & Drop patterns: OnPush,
  inject(), view-model binding, CDK DragDrop with typed payloads, and drop
  handlers that dispatch actions. Use when building or editing module
  components or DnD flows.
---

# Preem Components and Drag & Drop

**When to use:** Building or editing module components, implementing DnD between Rush and Timeline, or adding new drag payloads. See [preem-architecture](../preem-architecture/SKILL.md) for data flow.

## Component Basics

- **ChangeDetectionStrategy.OnPush** — always.
- **Component splitting** — Split into subcomponents when it improves clarity, reusability, or testability; avoid over-splitting — only extract when it's clearly beneficial.
- **Standalone components only.** No NgModules for features.
- **`inject()`** for DI — keep constructors minimal.
- **Signals** for local UI state (panel open, hover, drag ghost) — app data stays in NgRx.

## Binding Pattern

1. Select the module's view-model: `selectTimelineModuleVm`, `selectRushVm`, etc.
2. Use `store.selectSignal(selectXxxVm)` for reactive binding; component holds `readonly vm = this.store.selectSignal(...)`.
3. Bind the template to `vm()`. Use `@if`, `@for` with `vm().tracks`, `vm().clips`, etc.
4. No derived state in templates beyond trivial formatting (e.g. `{{ value | number }}`).
5. Complex derivation → move to selector or `computed()`.

## trackBy

Always use `track` for `@for`; `trackBy` for `*ngFor`:

```typescript
@for (t of vm().tracks; track t.id) { ... }
```

Or with `*ngFor`: `*ngFor="let t of vm().tracks; trackBy: trackByTrackId"` and a stable `trackByTrackId(id)`.

## Drag & Drop Contract

### Typed Payloads

Define payloads in `src/app/shared/dnd/drag-payload.models.ts` with a `kind` discriminant:

```typescript
export interface DragAssetRef {
  readonly kind: 'asset';
  readonly assetId: AssetId;
}

export type DragPayload = DragAssetRef;
```

Add type guards: `isDragAssetRef(payload): payload is DragAssetRef`.

### CDK DragDrop

Use Angular CDK `DragDropModule`. Configure:
- `cdkDropList` for drop zones
- `cdkDrag` for draggable items
- `[cdkDragData]` for the payload
- `(cdkDropListDropped)` for drop handling

### Drop Handlers

Drop handlers **only**:
1. Read the payload from `event.item.data` (typed as `DragPayload`)
2. Compute drop context (e.g. `trackId`, `atSeconds` from drop position)
3. Dispatch a store action (e.g. `timelineInsertAssetAt`)

Reducers update state. Never call into other components or services for app data. Use `snapSeconds()` from `shared/time/` for snapping drop position to grid.

### Payload Type Guards

In drop handlers, narrow with type guards. Support multiple payload kinds (e.g. `DragAssetRef`, `DragClipRef`) with separate branches:

```typescript
onDrop(event: CdkDragDrop<TimelineDragPayload>): void {
  const payload = event.item.data as TimelineDragPayload;
  if (isDragAssetRef(payload)) {
    this.store.dispatch(timelineInsertAssetAt({
      assetId: payload.assetId,
      trackId,
      atSeconds: snappedSeconds,
      durationSeconds,
    }));
  } else if (isDragClipRef(payload)) {
    this.store.dispatch(timelineMoveClip({ clipId: payload.clipId, trackId, startSeconds }));
  }
}
```

### connectedTo for Cross-Module DnD

Use `cdkDropListConnectedTo` so Rush and Timeline drop lists accept each other's drags. Each module defines its own list IDs; connect them at the container level if needed.

## Module Layout

Each module component is thin:
- Injects `Store`
- Selects its vm
- Dispatches actions on user interaction
- Renders from vm

Subcomponents can be used for reusable UI (e.g. clip bar, track header) but they receive data via inputs derived from the parent's vm, or the parent delegates rendering.

## Quick Checklist

- [ ] `ChangeDetectionStrategy.OnPush` and `inject()`
- [ ] Split into components when helpful; avoid over-splitting
- [ ] `readonly vm = this.store.selectSignal(selectXxxVm)`
- [ ] `@for` uses `track`; `*ngFor` uses `trackBy`
- [ ] DnD payloads have `kind`; type guards for narrowing
- [ ] Drop handler computes context and dispatches; no component calls

## Reference

- `src/app/modules/timeline/timeline-module.component.ts` — full DnD + vm pattern
- `src/app/shared/dnd/drag-payload.models.ts` — payload types and guards
- `src/app/shared/time/snap-seconds.ts` — snap to timeline grid
