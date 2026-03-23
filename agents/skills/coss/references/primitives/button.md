# coss Button

## When to use

- Primary and secondary action triggers.
- Icon, loading, and shortcut-enhanced actions across forms and toolbars.

## Install

```bash
npx shadcn@latest add @coss/button
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Button } from "@/components/ui/button"
```

## Minimal pattern

```tsx
<Button type="button">Button</Button>
```

`Button` defaults to `type="button"` when rendered as the native button part. In form flows, set `type` explicitly (`button` / `submit` / `reset`) to match intent, especially when using `render` composition.

## Patterns from coss particles

### Key patterns

Variants are set via the `variant` prop:

```tsx
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

Icon-only button (always needs `aria-label`):

```tsx
<Button aria-label="Close" size="icon" variant="ghost">
  <XIcon aria-hidden="true" />
</Button>
```

Button with icon and text (no opacity on the icon):

```tsx
<Button>
  <PlusIcon aria-hidden="true" />
  Add Item
</Button>
```

Sizes: `xs`, `sm`, `default`, `lg`, `icon-xs`, `icon-sm`, `icon`, `icon-lg`.

### Loading state

Built-in `loading` prop (disables and shows spinner automatically):

```tsx
<Button loading={isLoading} onClick={handleClick}>Submit</Button>
```

Composite approach (manual `Spinner` + `disabled`):

```tsx
<Button disabled>
  <Spinner />
  Loading...
</Button>
```

Prefer the `loading` prop for typical async actions. Use the composite approach when you need custom spinner placement or label.

### More examples

- default: `p-button-1`
- outline: `p-button-2`
- secondary: `p-button-3`
- destructive: `p-button-4`
- destructive outline: `p-button-5`
- ghost: `p-button-6`
- link: `p-button-7`
- extra-small size: `p-button-8`

## Common pitfalls

- Omitting explicit `type` inside forms/dialogs and triggering unintended submit behavior.
- Using icon-only buttons without `aria-label` on the button.
- Rebuilding button state styling with ad-hoc classes instead of variants/sizes.
- Using `SelectButton` as if it were a general-purpose `Button`; `SelectButton` is a select-flavored trigger helper and should be treated as a `select`/`combobox` pattern.

## Useful particle references

- variants/sizes: `p-button-1` through `p-button-8`
- composite loading (Spinner + disabled): `p-button-18`
- built-in loading prop: `p-button-41`
