# Button Migration

## Prop Mapping

| Old prop | New prop | Notes |
|---|---|---|
| `color="primary"` | `variant="default"` | Primary CTA |
| `color="secondary"` | `variant="outline"` | Secondary action |
| `color="minimal"` | `variant="ghost"` | Tertiary/cancel action |
| `color="destructive"` | `variant="destructive"` | Delete/danger action |
| `size="sm"` | `size="sm"` | Same |
| `size="lg"` | `size="lg"` | Same |
| `StartIcon={IconComponent}` | Children: `<Icon aria-hidden="true" />` before text | See below |
| `EndIcon={IconComponent}` | Children: `<Icon aria-hidden="true" />` after text | See below |
| `loading={bool}` | `loading={bool}` | Same (added in coss Button) |
| `disabled={bool}` | `disabled={bool}` | Same |
| `tooltip="text"` | Wrap in `Tooltip` composition | Tooltip is separate |
| `href="/path"` | `render={<Link href="/path" />}` | Navigation buttons |

## Icon Placement

Icons move from dedicated props to children.

```tsx
// Before
<Button StartIcon="plus" color="primary">{t("add_item")}</Button>

// After
<Button><PlusIcon aria-hidden="true" />{t("add_item")}</Button>

// Icon-only: Before
<Button StartIcon="trash" color="minimal" size="sm" />

// Icon-only: After
<Button variant="ghost" size="icon"><TrashIcon aria-hidden="true" /></Button>
```

## Loading State

Use the native `loading` prop. Do not nest `<Spinner />` inside buttons.

```tsx
<Button type="submit" loading={mutation.isPending}>{t("save")}</Button>
```

## Link Buttons

```tsx
// Before
<Button href="/settings/security" color="secondary">{t("go_to_security")}</Button>

// After
<Button variant="outline" render={<Link href="/settings/security" />}>{t("go_to_security")}</Button>
```

For Button composition API (variants, sizes, render prop, loading), consult the `coss` skill at `primitives/button.md`.
