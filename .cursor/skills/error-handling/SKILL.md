---
name: preem-error-handling
description: >
  Documents Preem's error handling conventions: effect catchError, component
  localError, defensive try/catch, service patterns. Use when handling failures,
  validation, or recovery flows.
---

# Preem Error Handling

**When to use:** Handling failures, validation, or recovery. See [preem-ngrx-patterns](../preem-ngrx-patterns/SKILL.md) for effect structure, [preem-effect-testing](../preem-effect-testing/SKILL.md) for testing failure paths.

## Effect Errors

Effects must never rethrow. Use `catchError` and dispatch `*Failure`:

```typescript
from(this.doAsyncThing()).pipe(
  map((result) => mySuccess({ data: result })),
  catchError((error: unknown) =>
    of(myFailure({
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })),
  ),
)
```

- Dispatch cleanup (e.g. `rushImportProgressClear`) in `catchError` or before returning
- `errorMessage: string` — user-facing or loggable
- Reducer stores `errorMessage` in state; selector exposes for template

**Files:** [rush.effects.ts](../../../src/app/store/rush/rush.effects.ts), [export.effects.ts](../../../src/app/store/export/export.effects.ts)

## Component Validation

Validate before dispatch. Use a `localError` signal for pre-dispatch validation:

```typescript
readonly localError = signal<string | null>(null);

async startExport(): Promise<void> {
  this.localError.set(null);

  if (!this.encodableVideoCodecs().includes(this.videoCodec())) {
    this.localError.set('Selected video codec is not supported by this browser.');
    return;
  }

  this.store.dispatch(exportStart({ config }));
}
```

- **When:** Validation the component can do without calling engine/services
- **Where:** Before `dispatch`; cleared at start of action
- **Display:** `@if (localError()) { <div class="error">{{ localError() }}</div> }`

**File:** [export-module.component.ts](../../../src/app/modules/export/export-module.component.ts)

## Defensive try/catch

Use when the caller or DOM may be gone by the time callback runs:

```typescript
requestAnimationFrame(() => {
  try {
    event.source.reset();
  } catch {
    // Element may have been destroyed by re-render
  }
});
```

- **When:** rAF callbacks, async callbacks where Angular may have torn down the component
- **Pattern:** Swallow; log if needed. No user-facing error—recovery not applicable

**File:** [timeline-module.component.ts](../../../src/app/modules/timeline/timeline-module.component.ts)

## Services

| Scenario | Pattern |
|---------|---------|
| Critical (e.g. getByKey) | Return `null` or `throw`; let caller handle |
| Non-critical (layout save) | Try/catch, log with `console.warn`, swallow |
| Quota exceeded | Detect `QuotaExceededError`, evict, retry once |

**Examples:**
- [transcode-cache.service.ts](../../../src/app/engine/transcode-cache.service.ts) — `getCached` returns null on error; `setCached` evicts on quota
- [layout-persistence.service.ts](../../../src/app/shared/persistence/layout-persistence.service.ts) — log and return null on load/save failure

## Decision Table

| Context | Use | Example |
|---------|-----|---------|
| Effect async fails | `catchError` → `*Failure` | rushImportFileFailure |
| Pre-dispatch validation | `localError` signal | Export codec check |
| Store already has error | Select `errorMessage`, show in template | vm().errorMessage |
| DOM/callback race | try/catch, swallow | event.source.reset() |
| Service non-critical | try/catch, log, return null | layout save |

## Related Skills

- [preem-ngrx-patterns](../preem-ngrx-patterns/SKILL.md) — effect structure, failure actions
- [preem-effect-testing](../preem-effect-testing/SKILL.md) — testing failure paths
