---
name: preem-naming-typing
description: >-
  Enforces descriptive variable names (no single/double/triple char abbreviations)
  and bans the `any` type. Use when writing or reviewing code, refactoring
  variables, or enforcing code quality standards.
---

# Preem Naming and Typing

**When to use:** Writing or reviewing code, refactoring, or enforcing code quality. Complements [preem-typescript-style](../preem-typescript-style/SKILL.md).

## Variable Naming

### Principle

Use meaningful, descriptive names. Avoid abbreviations that obscure intent. Names should read naturally and explain their purpose.

### Length and Readability

| Avoid | Prefer | Reason |
|-------|--------|--------|
| `x`, `y`, `z` (unless coords) | `index`, `offset`, `count` | Single chars rarely convey meaning |
| `dt`, `ts` | `deltaTime`, `timestampSeconds` | Abbreviations require context to decode |
| `fn`, `cb`, `evt` | `handler`, `callback`, `event` | Spell out unless universally known |
| `tmp`, `val`, `data` | `temporaryResult`, `computedValue`, `clipData` | Vague names hide purpose |
| `id` (when ambiguous) | `assetId`, `clipId`, `trackId` | Domain-specific IDs are clearer |

### Accepted Short Names

These are acceptable when scope is narrow and meaning is obvious:

- `i`, `j`, `k` in small loop bodies (prefer `index` when loop is non-trivial)
- `id` when type makes it clear (`assetId: AssetId` as param name)
- `e` or `err` in catch blocks when immediately narrowed

### Naming by Role

| Role | Example | Anti-pattern |
|------|---------|--------------|
| Booleans | `isPlaying`, `hasAudio`, `canEdit` | `flag`, `b` |
| Arrays | `clips`, `trackIds`, `thumbnails` | `arr`, `list`, `items` |
| Callbacks | `onDrop`, `handleClick` | `cb`, `fn` |
| Events | `event`, `dragEvent` | `e`, `evt` |
| Counts/indices | `frameIndex`, `clipCount` | `n`, `idx`, `cnt` |

### Consistency

- Use the same term across the codebase: `assetId` everywhere, not `assetId` in one file and `asset` in another.
- Match domain language from VIDEO_ENGINE and .cursorrules: `clip`, `track`, `asset`, `playhead`, `keyframe`.

## Never Use `any`

### Rule

Do not use the `any` type. It disables type checking and undermines TypeScript's safety.

### Alternatives

| Situation | Use Instead |
|----------|-------------|
| Unknown JSON from API | `unknown` + type guard or validation at boundary |
| Generic callback param | Explicit type or generic `T` |
| Third-party typings | `unknown` and narrow; or augment declarations |
| "Escape hatch" | Fix the design; use generics or overloads |
| Catch clause | `catch (error: unknown)` then narrow |

### Narrowing Unknown

```typescript
// Good
if (error instanceof Error) {
  console.error(error.message);
} else {
  console.error(String(error));
}

// Good
function isDragAssetRef(payload: unknown): payload is DragAssetRef {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'kind' in payload &&
    (payload as { kind: string }).kind === 'asset'
  );
}
```

### When Dependencies Use `any`

Prefer well-typed libraries. If a dependency has `any` in its public API, wrap it in a typed facade or use `unknown` at the boundary.

## Quick Checklist

- [ ] Variable names are at least 4 characters unless in a very short, obvious scope
- [ ] Names describe purpose (e.g. `playheadSeconds` not `phs`)
- [ ] No `any` in code or in new type declarations
- [ ] `unknown` with narrowing for truly unknown values
- [ ] Catch clauses use `catch (error: unknown)`

## Related Skills

- [preem-typescript-style](../preem-typescript-style/SKILL.md) — branded IDs, readonly, discriminated unions
