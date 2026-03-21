---
name: create-angular-component
description: Create a standalone Angular component for the Flish multimedia client — OnPush, signals, media-aware inputs, and Flish design tokens. Use when the user asks to create a new component, widget, media card, player, thumbnail grid, or UI element.
---

# Create Angular Component (Flish)

Creates a standalone Angular 21 component following Flish conventions and design system.

## Workflow

1. **Determine the component name and location** from the user's request.
   - Feature components go in `front-client/src/app/features/<feature>/components/`
   - Core/shared components go in `front-client/src/app/core/components/`
   - Page-level components go in `front-client/src/app/features/<feature>/pages/`
2. **Determine the component type**: presentational, container, or media player.
3. **Create the files** using the appropriate template below.

## Design Tokens

All components use CSS custom properties from `front-client/src/styles.scss`:

```
--bg, --bg-elev           (backgrounds)
--surface, --surface-elev (card surfaces)
--border                  (borders)
--text, --text-soft       (text colors)
--primary, --primary-strong (actions)
--danger, --danger-strong   (destructive actions)
--focus                   (focus rings)
--shadow                  (elevation)
```

## Template: Media Card Component

For displaying a file/media item in a grid or list:

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-media-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      background: linear-gradient(180deg, var(--surface-elev), var(--surface));
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }
    :host:hover {
      border-color: var(--primary);
    }
    .thumb {
      aspect-ratio: 16 / 9;
      background: var(--bg);
      display: grid;
      place-items: center;
      color: var(--text-soft);
      font-size: 2rem;
    }
    .info {
      padding: 0.6rem 0.7rem;
    }
    .name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      font-size: 0.84rem;
      color: var(--text-soft);
      margin-top: 0.2rem;
    }
  `,
  template: `
    <div class="thumb" (click)="selected.emit()">
      <span aria-hidden="true">{{ icon() }}</span>
    </div>
    <div class="info">
      <div class="name">{{ fileName() }}</div>
      <div class="meta">{{ size() }} &middot; {{ extension() }}</div>
    </div>
  `,
})
export class MediaCardComponent {
  fileName = input.required<string>();
  extension = input.required<string>();
  size = input.required<string>();
  icon = input<string>('');
  selected = output<void>();
}
```

## Template: Media Player Shell

Base shell for video or audio player with controls slot:

```typescript
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-player-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border: 1px solid var(--border);
      border-radius: 0.9rem;
      background: var(--bg);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .title-bar {
      padding: 0.5rem 0.7rem;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }
  `,
  template: `
    <div class="title-bar">{{ title() }}</div>
    <ng-content />
  `,
})
export class PlayerShellComponent {
  title = input<string>('');
}
```

## Template: Small Presentational Component

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-<component-name>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.<modifier>]': '<condition>()',
  },
  styles: `
    :host {
      display: block;
    }
  `,
  template: `
    <!-- template here -->
  `,
})
export class <ComponentName>Component {
  label = input.required<string>();
  clicked = output<void>();
}
```

## Template: Larger Component (external files)

**`<component-name>.ts`**
```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-<component-name>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './<component-name>.html',
  styleUrl: './<component-name>.css',
})
export class <ComponentName>Component {
  data = input.required<MediaItem>();
  selected = output<void>();
}
```

**`<component-name>.css`**
```css
:host {
  display: block;
  border: 1px solid var(--border);
  border-radius: 0.85rem;
  background: var(--surface);
}
```

## Template: Container/Page Component

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { <FeatureName>Store } from '../store/<feature-name>.store';

@Component({
  selector: 'app-<page-name>-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (store.loading()) {
      <p class="state">Loading...</p>
    } @else {
      @for (item of store.items(); track item.id) {
        <app-media-card
          [fileName]="item.fileName"
          [extension]="item.extension"
          [size]="formatBytes(item.sizeBytes)"
          (selected)="store.select(item)"
        />
      }
    }
  `,
})
export class <PageName>PageComponent {
  protected readonly store = inject(<FeatureName>Store);
}
```

## Rules

- **Always** set `changeDetection: ChangeDetectionStrategy.OnPush`
- **Always** use `input()` / `input.required()` and `output()` -- never decorators
- **Always** use `inject()` for dependencies -- never constructor injection
- **Always** set `:host { display: block; }` (or `flex`/`grid` as appropriate)
- **Always** use CSS custom properties from the Flish design system
- **Use** `model()` for two-way binding scenarios (toggles, custom form controls)
- **Use** `viewChild()` / `contentChild()` for template queries -- never `@ViewChild`
- **Use** `host: {}` in decorator for host bindings -- never `@HostBinding` / `@HostListener`
- **Use** `[class.name]` and `[style.prop]` -- never `ngClass` / `ngStyle`
- **Use** `computed()` for derived template state
- **Never** set `standalone: true` (it is the default)
- **Never** use `::ng-deep`
