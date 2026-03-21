---
name: preem-typescript-style
description: >-
  Documents Preem's TypeScript and styling conventions: branded IDs, strict
  typing, immutability, discriminated unions, satisfies, and vanilla SCSS. Use
  when writing or reviewing TypeScript, interfaces, or styles.
---

# Preem TypeScript and Styling

**When to use:** Writing or reviewing TypeScript, interfaces, or styles.

## Typed IDs (Brand Types)

Domain IDs are branded to prevent mixing:

```typescript
export type AssetId = Brand<string, 'AssetId'>;
export const asAssetId = (value: string): AssetId => value as AssetId;
```

Use `asAssetId`, `asClipId`, `asTrackId` when creating IDs. Never use raw strings in domain logic. IDs live in `src/app/shared/ids/`.

## Strict Typing

- **No `any`.** Use `unknown` and narrow with type guards when the type is truly unknown.
- **`import type`** for type-only imports.
- **Explicit return types** on public APIs (functions, methods).

## Immutability

- Use `readonly` on interface properties.
- Use `readonly` arrays where appropriate: `readonly ClipId[]`, `Readonly<Record<ClipId, Clip>>`.
- Use `as const` for literal objects that should not change.
- Reducer state is always immutable; return new objects.

## Discriminated Unions

Use `kind` for narrowing:

```typescript
type WorkerCommand =
  | { readonly kind: 'demux'; readonly requestId: string; readonly fileBuffer: ArrayBuffer; ... }
  | { readonly kind: 'decode-frame'; readonly requestId: string; readonly assetId: string; ... };
```

Type guards: `payload.kind === 'demux'` or `isDragAssetRef(payload)`.

## satisfies Operator

Use `satisfies` when you need the compiler to check the shape without widening the type:

```typescript
// Worker postMessage — ensures payload matches WorkerCommand without losing literal kinds
this.worker.postMessage(
  { kind: 'demux', requestId, fileName, fileBuffer } satisfies WorkerCommand,
);
```

Prefer `satisfies` over `as` for type assertions when the value should conform to a union — it catches missing/extra properties.

## Error Handling

- Check `error instanceof Error` before accessing `message`.
- Use `error instanceof Error ? error.message : 'Unknown error'` for user-facing strings.
- Prefer `unknown` for catch; narrow before use.

## Vanilla SCSS

- No CSS frameworks (Bootstrap, Tailwind, etc.).
- Use vanilla SCSS; component styles in `*.component.scss`.
- Prefer small, focused components. Split into subcomponents for reuse.
- Avoid deep nesting; use BEM-like or flat class names as needed.

## Minimal Dependencies

- Prefer first-party Angular packages (`@angular/cdk`, `@angular/common`, etc.).
- Justify any new third-party library. Preem uses Mediabunny for mux/demux; WebCodecs for decode/encode.
- No `any` in dependency typings; prefer well-typed packages.

## Quick Checklist

- [ ] Use branded IDs (`asAssetId`, etc.); no raw strings in domain logic
- [ ] No `any`; `import type` for type-only imports
- [ ] `readonly` on interface fields; `as const` for literals
- [ ] `satisfies` for payloads that must match a union
- [ ] Vanilla SCSS; no CSS frameworks

## Related Skills

- [preem-naming-typing](../preem-naming-typing/SKILL.md) — variable naming, no `any`

## Reference

- `src/app/shared/ids/brand.ts`, `asset-id.ts`, `clip-id.ts`, `track-id.ts`
- `src/app/engine/video-engine.models.ts` — discriminated unions
