# Lists & Data Display Migration

## Table to ListItem

Simple data tables (especially settings lists) migrate to `ListItem` composition.

### Before

```tsx
import { TableNew, TableRow, TableCell } from "@calcom/ui";

<TableNew>
  {items.map((item) => (
    <TableRow key={item.id}>
      <TableCell>{item.name}</TableCell>
      <TableCell>{item.date}</TableCell>
      <TableCell>
        <Button onClick={() => handleAction(item)}>{t("action")}</Button>
      </TableCell>
    </TableRow>
  ))}
</TableNew>
```

### After

```tsx
import {
  ListItem,
  ListItemContent,
  ListItemHeader,
  ListItemTitle,
  ListItemDescription,
  ListItemActions,
} from "@coss/ui/shared/list-item";

<Card>
  <CardPanel>
    {items.map((item) => (
      <ListItem key={item.id}>
        <ListItemContent>
          <ListItemHeader>
            <ListItemTitle>{item.name}</ListItemTitle>
          </ListItemHeader>
          <ListItemDescription>{item.date}</ListItemDescription>
        </ListItemContent>
        <ListItemActions>
          <Button variant="ghost" size="icon" onClick={() => handleAction(item)}>
            {t("action")}
          </Button>
        </ListItemActions>
      </ListItem>
    ))}
  </CardPanel>
</Card>
```

## List / AppListCard to Card + ListItem

`List` and `AppListCard` from `@calcom/ui` are replaced by composing `Card`, `CardPanel`, and `ListItem`.

```tsx
<Card>
  <CardPanel>
    {apps.map((app) => (
      <ListItem key={app.slug}>
        <ListItemContent>
          <ListItemHeader>
            <ListItemTitle>{app.name}</ListItemTitle>
          </ListItemHeader>
          <ListItemDescription>{app.description}</ListItemDescription>
        </ListItemContent>
        <ListItemActions>
          <Switch checked={app.enabled} onCheckedChange={(v) => toggleApp(app.slug, v)} />
        </ListItemActions>
      </ListItem>
    ))}
  </CardPanel>
</Card>
```

## EmptyScreen to Empty

The monolithic `EmptyScreen` decomposes into a composition.

### Before

```tsx
import { EmptyScreen } from "@calcom/ui";

<EmptyScreen
  Icon="link"
  headline={t("no_webhooks")}
  description={t("no_webhooks_description")}
  buttonText={t("create_webhook")}
  buttonOnClick={handleCreate}
/>
```

### After

```tsx
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@coss/ui/components/empty";

<Empty className="rounded-xl border border-dashed">
  <EmptyContent>
    <EmptyMedia>
      <LinkIcon className="size-6" aria-hidden="true" />
    </EmptyMedia>
    <EmptyHeader>
      <EmptyTitle>{t("no_webhooks")}</EmptyTitle>
      <EmptyDescription>{t("no_webhooks_description")}</EmptyDescription>
    </EmptyHeader>
    <Button onClick={handleCreate}>{t("create_webhook")}</Button>
  </EmptyContent>
</Empty>
```

Empty state styling: Use `className="rounded-xl border border-dashed"` directly on `<Empty>`. Whether to wrap in a `Card` is case-by-case -- analyze the context.

## Avatar Migration

The monolithic `Avatar` from `@calcom/ui` decomposes into `Avatar`, `AvatarImage`, and `AvatarFallback`.

### Before

```tsx
import { Avatar } from "@calcom/ui";

<Avatar alt={userName} imageSrc={userAvatar} size="sm" />
```

### After

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@coss/ui/components/avatar";

<Avatar className="size-5">
  {userAvatar ? <AvatarImage alt={userName} src={userAvatar} /> : null}
  <AvatarFallback>{userName?.charAt(0)}</AvatarFallback>
</Avatar>
```

Key differences:
- Size is controlled via Tailwind (`className="size-5"`) instead of a `size` prop
- Image is a child `AvatarImage`, not an `imageSrc` prop
- Fallback is explicit via `AvatarFallback` (shown when image is missing or fails to load)
- Conditionally render `AvatarImage` only when `src` is available

## Dropdown to Menu

```tsx
// Before
<Dropdown>
  <DropdownMenuTrigger><Button variant="icon" StartIcon="ellipsis" /></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownItem onClick={handleEdit}>{t("edit")}</DropdownItem>
  </DropdownMenuContent>
</Dropdown>

// After
<Menu>
  <MenuTrigger render={<Button variant="ghost" size="icon" />}>
    <EllipsisIcon aria-hidden="true" />
  </MenuTrigger>
  <MenuPopup>
    <MenuItem onClick={handleEdit}>{t("edit")}</MenuItem>
  </MenuPopup>
</Menu>
```
