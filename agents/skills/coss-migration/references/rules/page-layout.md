# Page Layout Migration

## SettingsHeader to AppHeader

Every settings page replaces `SettingsHeader` with a composable `AppHeader` pattern.

### Before

```tsx
import { SettingsHeader } from "@calcom/ui";

<SettingsHeader
  title={t("page_title")}
  description={t("page_description")}
  borderInShellHeader
/>
```

### After

```tsx
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

<AppHeader>
  <AppHeaderContent>
    {t("page_title")}
    <AppHeaderDescription>{t("page_description")}</AppHeaderDescription>
  </AppHeaderContent>
</AppHeader>
```

When the header includes action buttons (e.g., "New" or "Add"):

```tsx
import { AppHeader, AppHeaderContent, AppHeaderDescription, AppHeaderActions } from "@coss/ui/shared/app-header";

<AppHeader>
  <AppHeaderContent>
    {t("page_title")}
    <AppHeaderDescription>{t("page_description")}</AppHeaderDescription>
  </AppHeaderContent>
  <AppHeaderActions>
    <Button variant="outline">{t("new")}</Button>
  </AppHeaderActions>
</AppHeader>
```

## SectionBottomActions to CardFrameFooter

Settings sections with save/cancel buttons at the bottom migrate from `SectionBottomActions` to `CardFrame` + `CardFrameFooter`.

### Before

```tsx
<SectionBottomActions>
  <Button color="primary" type="submit" loading={isPending}>
    {t("save")}
  </Button>
</SectionBottomActions>
```

### After

```tsx
<CardFrame>
  <Card>
    <CardPanel>
      {/* section content */}
    </CardPanel>
  </Card>
  <CardFrameFooter>
    <Button type="submit" loading={isPending}>
      {t("save")}
    </Button>
  </CardFrameFooter>
</CardFrame>
```

## Tab Navigation

`VerticalTabs` / `HorizontalTabs` are replaced with ghost `Button` components inside a `ScrollArea`, using `useMediaQuery` for responsive switching.

### Before

```tsx
import { VerticalTabs, HorizontalTabs } from "@calcom/ui";

<VerticalTabs tabs={tabs} />
```

### After

```tsx
import { Button } from "@coss/ui/components/button";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import { useMediaQuery } from "@coss/ui/hooks/use-media-query";

const isDesktop = useMediaQuery("sm"); // 640px breakpoint

// Render ghost buttons with active state detection
{categories.map((cat) => (
  <Button
    key={cat.href}
    variant="ghost"
    data-pressed={isActive ? "" : undefined}
    render={<Link href={cat.href} />}>
    <Icon name={cat.icon} />
    {cat.name}
  </Button>
))}
```

## Layout Spacing

When migrating page-level layout, replace margin/space utilities with flex gap:

```tsx
// Before
<div className="mt-6 space-y-6">
  <Section1 />
  <Section2 />
</div>

// After
<div className="flex flex-col gap-6">
  <Section1 />
  <Section2 />
</div>
```
