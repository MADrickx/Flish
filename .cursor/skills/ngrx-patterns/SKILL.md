---
name: preem-ngrx-patterns
description: >-
  Documents Preem's NgRx store patterns: feature slices, action naming, entity
  storage, selectors with view-models, pure reducers, and effects that call the
  engine. Use when adding store slices, actions, reducers, selectors, or
  effects.
---

# Preem NgRx Store Patterns

**When to use:** Adding store slices, actions, reducers, selectors, or effects. See [preem-architecture](../preem-architecture/SKILL.md) for data flow context.

## Feature Slice Structure

Each store feature lives in `src/app/store/<feature>/` with these files:

| File | Purpose |
|------|---------|
| `*.models.ts` | Types, interfaces, `defaultState` |
| `*.actions.ts` | `createAction` with `props<>()` |
| `*.reducer.ts` | `createReducer`, `on()` handlers |
| `*.selectors.ts` | Raw selectors + `select<Feature>Vm` |
| `*.effects.ts` | When side effects (engine, API) are needed |

Keep barrel exports minimal. Avoid circular dependencies.

## Action Naming

- **Format:** `[Feature] Verb Noun` — e.g. `[Timeline] Insert Asset At`
- **Effect results:** Use `Success` / `Failure` suffixes — e.g. `rushImportFileSuccess`, `rushImportFileFailure`
- **Intent, not implementation:** Model user intent. `[Timeline] Split Selected Clip At Playhead` not `[Timeline] Create Two Clips`

## Entity Storage

Use `ids` + `byId` for scalable lists:

```typescript
interface TimelineState {
  readonly trackIds: readonly TrackId[];
  readonly tracksById: Readonly<Record<TrackId, Track>>;
  readonly clipIds: readonly ClipId[];
  readonly clipsById: Readonly<Record<ClipId, Clip>>;
  // ...
}
```

Benefits: O(1) lookup by ID, stable references, minimal re-renders with `trackBy`.

## Selectors

1. **Raw selectors:** `selectTimelineState`, `selectTimelineTrackIds`, `selectTimelineClipsById`, etc. Use `createFeatureSelector` for the feature slice.
2. **`select<Feature>Vm`:** Single selector that derives the full view-model for the module.
3. **Composed module VMs:** App-level selectors (e.g. `selectTimelineModuleVm`) compose feature selectors and add cross-slice data (e.g. asset names for clip titles).

Templates bind to `vm`. Use `store.selectSignal(selectXxxVm)` or `store.select(selectXxxVm)` depending on needs. Never derive state in templates beyond trivial formatting.

Example shape for `TimelineVm`:
- `tracks` (with nested `clips` per track)
- `selectedClipId`, `playheadSeconds`, `viewStartSeconds`, `viewDurationSeconds`
- `playheadLeftPct`, `leftPct`/`widthPct` per clip for layout

Use `createSelector` with composed inputs. Keep projector logic pure; avoid allocating new arrays/objects when the underlying data hasn't changed (NgRx memoizes by input reference equality).

## Reducers

- **Pure and immutable.** No side effects. No `Date.now()`, no API calls.
- Use `createReducer(initialState, on(action, handler))`.
- Handlers return new state objects; never mutate `state`.
- For complex updates, extract helpers like `deleteClipFromState(state, clipId)`.

## Effects

- Bridge user actions ↔ `VideoEngineService` or external APIs. See [preem-video-engine](../preem-video-engine/SKILL.md).
- Components **never** inject `VideoEngineService`; only effects call it.
- Use `inject(Actions)`, `inject(Store)`, `inject(VideoEngineService)`.
- `createEffect(() => this.actions$.pipe(ofType(...), mergeMap(...)))` — use `mergeMap` for concurrent requests, `exhaustMap` when you want to ignore duplicate requests.
- On success: dispatch `*Success`; on failure: dispatch `*Failure`.
- Use `catchError` and return `of(failureAction)` to keep the effect alive. Use `tap` to dispatch progress actions (e.g. `rushImportProgress`).

## App State Composition

Add new slices to `AppState` in `app.state.ts` and wire them in `app.reducer.ts`. Ephemeral slices (playback, export) are not persisted.

## Quick Checklist

- [ ] New slice has `*.models.ts` with `defaultState`
- [ ] Actions use `[Feature] Verb Noun` and `*Success` / `*Failure` for effects
- [ ] State uses `ids` + `byId` for entity lists
- [ ] Selector exports `select<Feature>Vm`; templates bind to vm
- [ ] Reducer is pure; no side effects
- [ ] Effects use `inject()`, call engine/API, dispatch success/failure

## Reference

- `src/app/store/timeline/` — full feature example
- `src/app/store/rush/rush.effects.ts` — effect with progress and transcode
- `src/app/store/app.selectors.ts` — composed module VMs
