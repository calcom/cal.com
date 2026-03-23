# coss Sidebar

## When to use

- Persistent app shell navigation and grouped links.
- Collapsible/structured side navigation for dashboard layouts.

## Install

```bash
npx shadcn@latest add @coss/sidebar
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
```

## Minimal pattern

```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>Workspace</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Dashboard</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>{/* Main page content */}</SidebarInset>
</SidebarProvider>
```

## Patterns from coss particles

### Key patterns

Sidebar with grouped navigation and footer:

```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <h2 className="text-lg font-semibold">App Name</h2>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<a href="/dashboard" />}>
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton render={<a href="/projects" />}>
                Projects
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>Settings</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
  <SidebarInset>{/* Page content */}</SidebarInset>
</SidebarProvider>
```

Key composition rules:
- Wrap app with `SidebarProvider` at the layout level.
- Use `SidebarContent` (not "SidebarPanel") as the scrollable body between header/footer.
- Navigation items use `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton`.
- For link items, use `render` composition: `<SidebarMenuButton render={<a href="..." />}>`. Do not use `asChild` -- sidebar follows the same `render` pattern as all other coss primitives.
- Use `SidebarTrigger` for the collapse/expand toggle.
- Use `SidebarInset` for the main content area next to the sidebar.
- `SidebarRail` adds a slim hover-to-expand rail in collapsed state.

### More examples

See `p-toolbar-1`, `p-breadcrumb-1`, `p-tabs-1`, `p-menu-1` for related app-shell patterns.

## Common pitfalls

- Using non-existent parts like "SidebarPanel" or "SidebarItem" -- the correct names are `SidebarContent` and `SidebarMenuItem`.
- Forgetting `SidebarProvider` wrapper, which manages collapse state and mobile responsiveness.
- Skipping the `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton` hierarchy for nav items.
- Missing responsive collapse strategy for narrow/mobile layouts.

## Useful particle references

- sidebar-specific particles: no dedicated `p-sidebar-*` family currently.
- app-shell references: `p-toolbar-1`, `p-breadcrumb-1`, `p-tabs-1`, `p-menu-1`
