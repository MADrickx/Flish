---
name: preem-testing
description: >-
  Documents Preem's testing strategy: Vitest, test placement, reducer/selector
  patterns, effect mocking, and pure function tests. Use when writing or
  reviewing tests.
---

# Preem Testing

**When to use:** Writing or reviewing unit tests. See [preem-ngrx-patterns](../preem-ngrx-patterns/SKILL.md) for store patterns, [preem-video-engine](../preem-video-engine/SKILL.md) for engine mocking.

## Runner and Config

- **Vitest** with `@angular/build:unit-test`
- Run: `ng test` or `npx vitest`
- Watch: `npx vitest --watch`
- Single file: `npx vitest path/to/spec.ts`
- Coverage: `npx vitest --coverage`

## Test Placement

| Target | Location |
|--------|----------|
| Pure functions (keyframe-index, waveform, clip-visibility) | `src/app/engine/__tests__/*.spec.ts` |
| Reducer / selector | `src/app/store/<feature>/__tests__/*.spec.ts` |
| Effect | `src/app/store/<feature>/__tests__/*.effects.spec.ts` |
| Component | Sibling `*.component.spec.ts` next to component |
| Service | Sibling `*.spec.ts` or `__tests__/` in engine |

## Reducer Tests

Reducers are pure. No TestBed needed.

- Test default state for unknown action.
- Test each action handler; assert resulting state.
- Test immutability: previous state unchanged; new state is a new reference.

```typescript
const state = myReducer(undefined, { type: 'UNKNOWN' });
expect(state).toEqual(defaultMyState);

const next = myReducer(prev, myAction({ field: 'value' }));
expect(prev).toEqual(defaultMyState);
expect(next).not.toBe(prev);
```

## Selector Tests

Selectors are pure. Use `projector` with hand-built state:

```typescript
const state = { myFeature: { ... } };
const vm = selectMyVm.projector(state.myFeature, ...);
expect(vm.someField).toBe(expectedValue);
```

No `MockStore` needed for projector tests.

## Effect Tests

- Mock `VideoEngineService` with `vi.fn()`.
- Use `provideMockActions(() => actions$)` to drive actions.
- Assert dispatched actions (e.g. `rushImportFileSuccess`) and that `VideoEngineService.importFile` was called.

## Pure Function Tests

For `buildKeyframeIndex`, `extractWaveformPeaks`, `resolveVisibleClips`:
- Synthetic input (mock samples, fake `AudioBuffer`)
- Assert output shape and values
- No browser APIs required

## Browser API Mocking

WebCodecs (`VideoDecoder`, `VideoEncoder`, `VideoFrame`, etc.) do not exist in jsdom. Use `vi.stubGlobal`:

```typescript
beforeEach(() => {
  vi.stubGlobal('VideoDecoder', createMockVideoDecoder());
  vi.stubGlobal('VideoEncoder', createMockVideoEncoder());
  // ...
});
```

Provide minimal mocks that satisfy the code under test (e.g. `close` spy for frame eviction tests).

## Component Tests

- Use `provideMockStore` with selector values.
- Test creation, that vm is rendered, and that interactions dispatch the correct actions (spy on `store.dispatch`).
- Use `TestBed.createComponent`; call `fixture.detectChanges()` if needed for initial render; use `async`/`await` or `fakeAsync` for async updates.

## Effect Error Paths

Test failure flows: mock the service to `reject` or `throwError`, assert `*Failure` is dispatched and error message is passed. Use `catchError` in the effect so it doesn't rethrow and crash the stream.

## Async Testing

- `vi.fn().mockResolvedValue(...)` for async service methods.
- Use `await expect(...).resolves` or subscribe and assert in callback. For effects, `done` callback or `firstValueFrom` can ensure async completion.

## Quick Checklist

- [ ] Pure functions: synthetic input, assert output shape and values
- [ ] Reducer: unknown action → default; each action → correct state; immutability
- [ ] Selector: `projector` with hand-built state, no MockStore
- [ ] Effect: mock service, `provideMockActions`, assert success/failure dispatch
- [ ] Component: `provideMockStore`, spy `store.dispatch`, assert vm rendering
- [ ] Engine tests: `vi.stubGlobal` for WebCodecs when needed

## Reference

- `src/app/engine/__tests__/` — keyframe-index, waveform, clip-visibility, frame-cache
- `src/app/store/rush/__tests__/rush.effects.spec.ts` — effect with mocked VideoEngineService
- `src/app/store/timeline/__tests__/` — reducer, selectors
- [VIDEO_ENGINE.md](../../../VIDEO_ENGINE.md) Section 9 — full test templates

## Related Skills

- [preem-effect-testing](../preem-effect-testing/SKILL.md) — detailed effect test patterns, mock-all-deps rule

## Related Skills

- [preem-effect-testing](../preem-effect-testing/SKILL.md) — detailed effect testing patterns, mock-all-deps, async assertions
- [preem-effect-testing](../preem-effect-testing/SKILL.md) — detailed effect testing patterns, mock-all-deps
