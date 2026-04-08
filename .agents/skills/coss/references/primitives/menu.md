# coss Menu

## When to use

- Contextual action lists and dropdown commands.
- Mixed item types (regular, checkbox, radio, nested submenu).

## When NOT to use

- If the user needs to search/filter actions -> use Command instead.
- If the content is rich informational (not actions) -> use Popover instead.
- If the overlay is a full modal flow -> use Dialog instead.

## Install

```bash
npx shadcn@latest add @coss/menu
```

Manual deps and theme var from docs:

```bash
npm install @base-ui/react
```

Also include the destructive foreground CSS variable snippet from the coss menu docs when doing manual setup.

## Canonical imports

```tsx
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu"
```

## Minimal pattern

```tsx
<Menu>
  <MenuTrigger>Open</MenuTrigger>
  <MenuPopup>
    <MenuItem>Profile</MenuItem>
    <MenuSeparator />
    <MenuCheckboxItem>Shuffle</MenuCheckboxItem>
  </MenuPopup>
</Menu>
```

Use popup positioning props like `align` / `sideOffset` only when a layout needs explicit tuning.

## Patterns from coss particles

- Use `MenuTrigger render={<Button ... />}` as the default trigger composition.
- Use `openOnHover` on `MenuTrigger` only for explicit hover-driven UX.
- Use `MenuItem render={<Link ... />}` for navigational entries.
- Use `MenuItem closeOnClick` for action menus where selection should always dismiss the popup.
- Use `MenuCheckboxItem variant="switch"` for toggle-style preferences.
- Use `MenuRadioGroup` + `MenuRadioItem` with a `defaultValue` when enforcing single-choice selection.
- Use `MenuShortcut` to display keyboard hints in dense command menus.
- Use `variant="destructive"` on dangerous actions.
- For responsive action menus, keep desktop on `Menu` and switch mobile to `DrawerMenu` / `DrawerMenuTrigger` / `DrawerMenuItem` patterns.
- In `DrawerMenu` flows, wrap actionable rows with `DrawerClose render={<DrawerMenuItem />}` when selection should dismiss the drawer.

## Common pitfalls

- Forgetting `MenuGroup` around grouped structures.
- Missing submenu pair (`MenuSubTrigger` + `MenuSubPopup`) for nested actions.
- Mixing navigation and action items without clear close behavior (`closeOnClick`) and semantics.

## Useful particle references

- full-featured menu (groups, checkbox/radio, submenus, destructive): `p-menu-1`
- hover-activated trigger pattern: `p-menu-2`
- checkbox item pattern: `p-menu-3`
- radio group pattern: `p-menu-4`
- link/navigation items via `render`: `p-menu-5`
- grouped sections with labels + separators: `p-menu-6`
- nested submenu pattern: `p-menu-7`
- force close on click actions: `p-menu-8`
- switch-style checkbox items: `p-menu-9`
- cross-component example: `p-dialog-2` (menu opening dialog)
- responsive menu/drawer variant: `p-drawer-13`

