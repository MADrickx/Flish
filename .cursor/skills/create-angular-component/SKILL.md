---
name: create-angular-component
description: Create a standalone Angular component following project conventions — OnPush, signals, input/output functions, host bindings, and vanilla CSS. Use when the user asks to create a new component, widget, UI element, or presentational piece.
---

# Create Angular Component

Creates a standalone Angular 21 component following all project conventions.

## Workflow

1. **Determine the component name and location** from the user's request.
   - Feature components go in `src/app/features/<feature>/components/`
   - Core/shared components go in `src/app/core/components/`
   - Page-level components go in `src/app/features/<feature>/pages/`
2. **Determine the component type**: presentational (dumb) or container (smart).
3. **Create the files** using the appropriate template below.

## Naming

- File name: `<component-name>.ts` (single file) or split into `.ts`, `.html`, `.css`
- Selector: `app-<component-name>`
- Class: `<ComponentName>Component`

## Template: Small Component (inline template + styles)

For components with < ~20 lines of HTML:

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
  // Inputs
  label = input.required<string>();

  // Outputs
  clicked = output<void>();
}
```

## Template: Larger Component (external template + styles)

For components with > ~20 lines of HTML, split into separate files:

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
  label = input.required<string>();
  clicked = output<void>();
}
```

**`<component-name>.html`**
```html
<!-- template here -->
```

**`<component-name>.css`**
```css
:host {
  display: block;
}
```

## Template: Container/Page Component

Container components inject stores/services and coordinate child components:

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { <FeatureName>Store } from '../store/<feature-name>.store';
import { <ChildComponent> } from '../components/<child-component>';

@Component({
  selector: 'app-<page-name>-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [<ChildComponent>],
  template: `
    @if (store.loading()) {
      <p>Loading...</p>
    } @else {
      @for (item of store.items(); track item.id) {
        <app-<child-component> [data]="item" />
      }
    }
  `,
})
export class <PageName>PageComponent {
  protected store = inject(<FeatureName>Store);
}
```

## Rules

- **Always** set `changeDetection: ChangeDetectionStrategy.OnPush`
- **Always** use `input()` / `input.required()` and `output()` — never decorators
- **Always** use `inject()` for dependencies — never constructor injection
- **Always** set `:host { display: block; }` (or `flex`/`grid` as appropriate)
- **Use** `model()` for two-way binding scenarios (toggles, custom form controls)
- **Use** `viewChild()` / `contentChild()` for template queries — never `@ViewChild`
- **Use** `host: {}` in decorator for host bindings — never `@HostBinding` / `@HostListener`
- **Use** `[class.name]` and `[style.prop]` — never `ngClass` / `ngStyle`
- **Use** `computed()` for derived template state
- **Never** set `standalone: true` (it is the default)
- **Never** use `::ng-deep`
