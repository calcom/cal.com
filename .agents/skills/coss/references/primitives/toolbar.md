# coss Toolbar

## When to use

- Grouped command/action strips.
- Editor-like tool controls and mode toggles.

## Install

```bash
npx shadcn@latest add @coss/toolbar
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Button } from "@/components/ui/button"
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/ui/toolbar"
import { Toggle } from "@/components/ui/toggle-group"
```

## Minimal pattern

```tsx
<Toolbar>
  <ToolbarGroup>
    <ToolbarButton render={<Toggle value="bold" />} aria-label="Bold">
      Bold
    </ToolbarButton>
    <ToolbarButton render={<Toggle value="underline" />} aria-label="Underline">
      Underline
    </ToolbarButton>
  </ToolbarGroup>
  <ToolbarSeparator />
  <ToolbarGroup>
    <ToolbarButton render={<Button type="button" variant="outline" />}>
      Save
    </ToolbarButton>
  </ToolbarGroup>
</Toolbar>
```

## Patterns from coss particles

- **Part composition via `render`**: use `ToolbarButton render={<Toggle ... />}` or `render={<Button ... />}` instead of re-implementing button behavior.
- **Grouped layout**: use `ToolbarGroup` boundaries with `ToolbarSeparator` between logical command clusters.
- **Icon-only controls**: pair icon buttons with explicit `aria-label`; combine with `Tooltip` for discoverability.
- **Embedded selects**: wrap `SelectTrigger` with `ToolbarButton render={...}` to keep visual consistency in mixed control bars.
- **Formatting rows**: combine `ToggleGroup` + `ToolbarButton` for alignment/formatting command sets.

## Common pitfalls

- Dropping `ToolbarSeparator`, causing unrelated command clusters to collapse visually.
- Missing `aria-label` on icon-only toolbar actions.
- Rendering raw `Button`/`Toggle` next to toolbar controls without `ToolbarButton`, creating inconsistent density/spacing.
- Treating Toolbar as a state manager; control selection/toggle state through composed primitives (`ToggleGroup`, `Select`, etc.).

## Useful particle references

- core toolbar patterns: `p-toolbar-1`
- related composition references: `p-toggle-group-1`, `p-group-1`, `p-select-1`

