# Cards & Containers Migration

## PanelCard to CardFrame

`PanelCard` splits into a composition of `CardFrame`, `Card`, and `CardPanel`.

### Before

```tsx
import { PanelCard } from "@calcom/ui";

<PanelCard title={t("section_title")} description={t("section_desc")}>
  {/* content */}
</PanelCard>
```

### After

```tsx
import {
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  Card,
  CardPanel,
} from "@coss/ui/components/card";

<CardFrame>
  <CardFrameHeader>
    <CardFrameTitle>{t("section_title")}</CardFrameTitle>
  </CardFrameHeader>
  <Card>
    <CardPanel>
      <div className="flex flex-col gap-4">
        {/* content */}
      </div>
    </CardPanel>
  </Card>
</CardFrame>
```

## CardFrame vs Card

- **`CardFrame`** -- Outer frame with optional `CardFrameHeader` and `CardFrameFooter`. Used for settings sections that have a title and/or save button.
- **`Card` / `CardPanel`** -- Inner content container. `CardPanel` provides padding.

For Card composition API, consult the `coss` skill at `primitives/card.md`.

## SettingsToggle

The `@coss/ui/shared/settings-toggle` is a reusable shared component for boolean settings displayed as a card with a switch.

### Before

```tsx
import { SettingsToggle } from "@calcom/ui";

<SettingsToggle
  toggleSwitchAtTheEnd
  title={t("setting_title")}
  description={t("setting_desc")}
  checked={isEnabled}
  onCheckedChange={handleToggle}
  disabled={isPending}
/>
```

### After

```tsx
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";

<SettingsToggle
  title={t("setting_title")}
  description={t("setting_desc")}
  checked={isEnabled}
  onCheckedChange={handleToggle}
  disabled={isPending}
/>
```

The coss `SettingsToggle` has built-in `loading` prop support that renders a `Skeleton` internally:

```tsx
<SettingsToggle
  title={t("setting_title")}
  description={t("setting_desc")}
  loading
/>
```

## Identity Provider / Info Sections

Raw HTML sections with `@calcom/ui` class names (`border-subtle`, `text-emphasis`, etc.) should be wrapped in coss Card components. See `css-tokens.md` for class name mapping.
