---
name: preem-effect-testing
description: >
  Documents Preem's effect testing patterns: mock all injected services,
  provideMockActions, success/failure paths, async assertions. Use when writing
  or reviewing NgRx effect tests.
---

# Preem Effect Testing

**When to use:** Writing or reviewing effect tests. See [preem-testing](../preem-testing/SKILL.md) for general test strategy, [preem-ngrx-patterns](../preem-ngrx-patterns/SKILL.md) for store patterns.

## Rule: Mock Every Injected Service

Effects inject multiple services (VideoEngineService, TranscodeService, TranscodeCacheService, etc.). **Provide a mock for each.** Unmocked services fall back to real implementations, which can hit IndexedDB, Workers, or browser APIs and cause flaky or failing tests.

```typescript
TestBed.configureTestingModule({
  providers: [
    RushEffects,
    provideMockActions(() => actions$),
    { provide: Store, useValue: { dispatch: vi.fn() } },
    { provide: VideoEngineService, useValue: { importFile: vi.fn(), ... } },
    { provide: TranscodeService, useValue: { transcode: vi.fn() } },
    { provide: TranscodeCacheService, useValue: { getCached: vi.fn(), setCached: vi.fn(), getByKey: vi.fn() } },
  ],
});
```

**Reference:** [rush.effects.spec.ts](../../../src/app/store/rush/__tests__/rush.effects.spec.ts) — currently mocks VideoEngine, Transcode; add TranscodeCache mock for `importFromLibrary` tests.

## Setup Template

```typescript
const setup = () => {
  const actions$ = new ReplaySubject(1) as ReplaySubject<ReturnType<typeof myAction>>;
  const dispatch = vi.fn();
  const myService = vi.fn().mockResolvedValue(expectedResult);

  TestBed.configureTestingModule({
    providers: [
      MyEffects,
      provideMockActions(() => actions$ as Observable<unknown>),
      { provide: Store, useValue: { dispatch } },
      { provide: MyService, useValue: { method: myService } },
    ],
  });

  return { actions$, dispatch, effects: TestBed.inject(MyEffects), myService };
};

it('dispatches success', async () => {
  const { actions$, effects, myService } = setup();
  myService.mockResolvedValue(result);
  actions$.next(myAction({ payload }));

  const emitted = await firstValueFrom(effects.myEffect$);
  expect(emitted).toEqual(mySuccess({ data: result }));
  expect(myService).toHaveBeenCalledWith(expectedArgs);
});
```

## Success Path

- Drive action via `actions$.next(...)`
- Use `firstValueFrom(effects.myEffect$)` or `pipe(take(N), toArray())` for multiple emissions
- Assert `*Success` action with correct payload
- Assert service was called with expected arguments

## Failure Path

- Mock service: `vi.fn().mockRejectedValue(new Error('message'))`
- Assert `*Failure` dispatched with `errorMessage`
- Assert cleanup (e.g. `rushImportProgressClear`) via `dispatch` spy
- Effect must use `catchError` — never rethrow; return `of(failureAction)`

```typescript
it('dispatches failure when service rejects', async () => {
  const myService = vi.fn().mockRejectedValue(new Error('service failed'));
  const { actions$, effects } = setup({ myService });
  actions$.next(myAction({ payload }));

  const emitted = await firstValueFrom(effects.myEffect$);
  expect(emitted).toEqual(myFailure({ errorMessage: 'service failed' }));
});
```

## Example: importFromLibrary

```typescript
it('dispatches success when loading from library', async () => {
  const result = buildResult({ id: 'asset_1', name: 'cached.mp4', videoCodec: 'avc1.64001f', audioCodec: 'mp4a.40.2' });
  const importFile = vi.fn().mockResolvedValue(result);
  const getByKey = vi.fn().mockResolvedValue(new File(['x'], 'cached.mp4', { type: 'video/mp4' }));

  const actions$ = new ReplaySubject(1) as ReplaySubject<ReturnType<typeof rushImportFromLibrary>>;
  TestBed.configureTestingModule({
    providers: [
      RushEffects,
      provideMockActions(() => actions$),
      { provide: Store, useValue: { dispatch: vi.fn() } },
      { provide: VideoEngineService, useValue: { importFile } },
      { provide: TranscodeService, useValue: { transcode: vi.fn() } },
      { provide: TranscodeCacheService, useValue: { getByKey, getCached: vi.fn(), setCached: vi.fn() } },
    ],
  });

  const effects = TestBed.inject(RushEffects);
  actions$.next(rushImportFromLibrary({ cacheKey: 'abc123' }));

  const emitted = await firstValueFrom(effects.importFromLibrary$);
  expect(emitted).toEqual(rushImportFileSuccess({ asset: result.asset }));
  expect(getByKey).toHaveBeenCalledWith('abc123');
  expect(importFile).toHaveBeenCalledWith(expect.any(File));
});

it('dispatches failure when library entry not found', async () => {
  const getByKey = vi.fn().mockResolvedValue(null);
  // ... provide TranscodeCacheService with getByKey
  actions$.next(rushImportFromLibrary({ cacheKey: 'missing' }));

  const emitted = await firstValueFrom(effects.importFromLibrary$);
  expect(emitted).toEqual(rushImportFileFailure({ errorMessage: 'Library entry not found' }));
});
```

## Avoid in Tests

- Real IndexedDB, Workers, WebCodecs
- Unmocked injectables
- Relying on `providedIn: 'root'` — explicitly provide mocks
- `subscribe()` without awaiting — use `firstValueFrom` or `lastValueFrom`

## Related Skills

- [preem-testing](../preem-testing/SKILL.md) — general test strategy, placement, checklists
- [preem-ngrx-patterns](../preem-ngrx-patterns/SKILL.md) — action naming, effect structure
