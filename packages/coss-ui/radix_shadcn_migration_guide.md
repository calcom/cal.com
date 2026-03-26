---
title: Radix / shadcn Migration
description: A comprehensive guide for migrating from Radix UI and shadcn/ui to coss ui components.
---

This guide is designed for developers who already have applications built with **shadcn/ui** or **Radix UI** and want to adopt **coss ui** components. **coss ui is fundamentally built with Base UI from the ground up—it is not an adaptation from Radix UI.** Recognizing that many teams are migrating from Radix-based libraries, this page consolidates all migration instructions for a smooth transition.

## Overview

coss ui components are built on **Base UI**, not Radix. This means the architecture and API patterns are different by design. However, we've worked to make the migration path as clear as possible by:

- Providing detailed component-by-component migration guides below
- Maintaining similar component names and structures where it makes sense
- Offering clear prop mappings and code examples

## General Migration Patterns

### The asChild to render Pattern

The most common change across all components is replacing Radix UI's `asChild` prop with Base UI's `render` prop:

<span data-lib="radix-ui">
```tsx title="Radix / shadcn"
// [!code word:asChild]
<DropdownMenuTrigger asChild>
  <Button>Edit profile</Button>
</DropdownMenuTrigger>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
<MenuTrigger render={<Button />}>Edit profile</MenuTrigger>
```
</span>

### Component Naming Conventions

Some components have updated names for clarity and consistency:

- `*Content` → `*Popup` or `*Panel` (e.g., `DialogContent` → `DialogPopup`)
- Legacy names are often kept for backward compatibility

## Component Migration Guides

### Accordion

**Quick Checklist:**
- Replace `type="multiple"` → `multiple={true}` on `Accordion`
- Remove `type="single"` from `Accordion`
- Remove `collapsible` from `Accordion`
- Always use arrays for `defaultValue`
- Use `AccordionPanel` going forward; `AccordionContent` remains for legacy
- If you used `asChild` on parts, switch to the `render` prop

**Prop Mapping:**

| Component   | Radix UI Prop                             | Base UI Prop                          |
| ----------- | ----------------------------------------- | ------------------------------------- |
| `Accordion` | `type` (enum, `"single"` or `"multiple"`) | `multiple` (boolean, default: `false`) |
| `Accordion` | `collapsible`                             | _removed_                             |

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:type="multiple"]
// [!code word:collapsible]
// [!code word:"item-1":1]
<Accordion type="multiple" collapsible defaultValue="item-1">
  <AccordionItem value="item-1">
    <AccordionTrigger>Title</AccordionTrigger>
    <AccordionContent>Content</AccordionContent>
  </AccordionItem>
</Accordion>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:multiple={true}]
// [!code word:\{\["item-1"\]\}]
<Accordion multiple={true} defaultValue={["item-1"]}>
  <AccordionItem value="item-1">
    <AccordionTrigger>Title</AccordionTrigger>
    <AccordionPanel>Content</AccordionPanel>
  </AccordionItem>
</Accordion>
```
</span>

### Alert

**New Variants:**

We've added new colored variants for better semantic meaning:

| Variant   | Description                       |
| --------- | --------------------------------- |
| `info`    | Displays an info alert (blue)     |
| `success` | Displays a success alert (green)  |
| `warning` | Displays a warning alert (yellow) |
| `error`   | Displays a error alert (red)      |

Ensure you have the following variables imported in your CSS file:

- `--destructive-foreground`
- `--info`
- `--info-foreground`
- `--success`
- `--success-foreground`
- `--warning`
- `--warning-foreground`

### Alert Dialog

**Quick Checklist:**
- Replace `asChild` → `render` on `AlertDialogTrigger` and closing buttons
- Replace `AlertDialogAction` and `AlertDialogCancel` → `AlertDialogClose`
- Prefer `AlertDialogPopup`; `AlertDialogContent` remains for legacy
- Use `AlertDialogPanel` to wrap main content between `AlertDialogHeader` and `AlertDialogFooter`
- If you used `asChild` on any other parts, switch to the `render` prop

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
// [!code word:AlertDialogCancel]
// [!code word:AlertDialogAction]
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline">Show Alert Dialog</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction asChild>
        <Button>Continue</Button>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
// [!code word:AlertDialogClose]
// [!code word:<AlertDialogPanel>Content</AlertDialogPanel>]
<AlertDialog>
  <AlertDialogTrigger render={<Button variant="outline" />}>
    Show Alert Dialog
  </AlertDialogTrigger>
  <AlertDialogPopup>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogPanel>Content</AlertDialogPanel>
    <AlertDialogFooter>
      <AlertDialogClose render={<Button variant="ghost" />}>
        Cancel
      </AlertDialogClose>
      <AlertDialogClose render={<Button variant="destructive" />}>
        Continue
      </AlertDialogClose>
    </AlertDialogFooter>
  </AlertDialogPopup>
</AlertDialog>
```
</span>

### Avatar

**Quick Checklist:**
- Replace `asChild` → `render` on `Avatar`

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Avatar asChild>
  <Link href="/profile">
    <AvatarImage src="avatar.jpg" alt="User" />
    <AvatarFallback>U</AvatarFallback>
  </Link>
</Avatar>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
<Avatar render={<Link href="/profile" />}>
  <AvatarImage src="avatar.jpg" alt="User" />
  <AvatarFallback>U</AvatarFallback>
</Avatar>
```
</span>

### Badge

**Quick Checklist:**
- Replace `asChild` → `render` on `Badge`

**Size Comparison:**

Compared to shadcn/ui, our `Badge` component includes size variants for better density control. shadcn/ui badges have a fixed size, while our component offers flexible sizing with `sm`, `default`, and `lg` options.

So, if you want to preserve the original shadcn/ui badge size, you should use the `lg` size in coss ui.

**New Variants:**

We've added new colored variants to the existing ones (`default`, `destructive`, `outline`, `secondary`) for better semantic meaning and visual communication:

| Variant   | Description                        |
| --------- | ---------------------------------- |
| `info`    | Blue badge for information         |
| `success` | Green badge for success states     |
| `warning` | Yellow badge for warnings          |
| `error`   | Red badge for errors               |

Ensure you have the following variables imported in your CSS file:

- `--destructive-foreground`
- `--info`
- `--info-foreground`
- `--success`
- `--success-foreground`
- `--warning`
- `--warning-foreground`

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Badge asChild>
  <Link href="/new">New</Link>
</Badge>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
<Badge render={<Link href="/new" />}>New</Badge>
```
</span>

### Button

**Quick Checklist:**
- Replace `asChild` → `render` on `Button`

**Size Comparison:**

coss ui button sizes are more compact compared to shadcn/ui, making them better suited for dense applications. We also introduce new sizes (`xs`, `xl`, `icon-sm`, `icon-lg`) for more granular control:

| Size      | Height (shadcn/ui) | Height (coss ui) |
| --------- | ------------------ | ---------------- |
| `xs`      | -                  | 24px             |
| `sm`      | 32px               | 28px             |
| `default` | 36px               | 32px             |
| `lg`      | 40px               | 36px             |
| `xl`      | -                  | 40px             |
| `icon`    | 36px               | 32px             |
| `icon-sm` | -                  | 28px             |
| `icon-lg` | -                  | 36px             |

So, for example, if you were using the `default` size in shadcn/ui and you want to preserve the original height, you should use the `lg` size in coss ui.

**New Variants:**

We've added a new `destructive-outline` variant for better UX patterns:

- **Primary actions**: Use `destructive` (solid red) for the main destructive action
- **Secondary triggers**: Use `destructive-outline` (outline red) to avoid alarming red buttons in the main interface

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Button asChild>
  <Link href="/login">Login</Link>
</Button>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
<Button render={<Link href="/login" />}>Login</Button>
```
</span>

### Card

**Quick Checklist:**
- Use `CardPanel` going forward; `CardContent` remains for legacy

### Checkbox

**Quick Checklist:**
- Replace `asChild` → `render` on `Checkbox`


### Collapsible

**Quick Checklist:**
- Replace `asChild` → `render` on `CollapsibleTrigger`
- Prefer `CollapsiblePanel`; `CollapsibleContent` remains for legacy

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Collapsible>
  <CollapsibleTrigger asChild>
    <Button>Toggle</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>Content here</CollapsibleContent>
</Collapsible>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
// [!code word:CollapsiblePanel]
<Collapsible>
  <CollapsibleTrigger render={<Button />}>Toggle</CollapsibleTrigger>
  <CollapsiblePanel>Content here</CollapsiblePanel>
</Collapsible>
```
</span>

### Command

The API is significantly different from shadcn/ui (cmdk). Please review both docs before migrating: [cmdk Docs](https://cmdk.paco.me/) and [shadcn/ui Command](https://ui.shadcn.com/docs/components/command), and our Base UI Autocomplete docs.

**Key Differences:**

- No `cmdk` dependency - built entirely with Base UI's Autocomplete and Dialog components
- Data-driven approach - pass an `items` array to `Command` and use render functions instead of manually composing `CommandItem` children
- Use `CommandCollection` within `CommandGroup` when rendering grouped data with the items pattern
- Use `CommandDialog`, `CommandDialogTrigger`, and `CommandDialogPopup` for dialog functionality instead of composing separate Dialog components
- `CommandGroup` uses `<CommandGroupLabel>` as a child instead of a `heading` prop

### Dialog

**Quick Checklist:**
- Replace `asChild` → `render` on `DialogTrigger` and closing buttons
- Prefer `DialogPopup`; `DialogContent` remains for legacy
- Use `DialogPanel` to wrap main content between `DialogHeader` and `DialogFooter`
- If you used `asChild` on any other parts, switch to the `render` prop

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Show Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="ghost">Cancel</Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
// [!code word:<DialogPanel>Content</DialogPanel>]
<Dialog>
  <DialogTrigger render={<Button variant="outline" />}>
    Show Dialog
  </DialogTrigger>
  <DialogPopup>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog Description</DialogDescription>
    </DialogHeader>
    <DialogPanel>Content</DialogPanel>
    <DialogFooter>
      <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
    </DialogFooter>
  </DialogPopup>
</Dialog>
```
</span>

### Group (Button Group)

**Quick Checklist:**
- Prefer `Group*` component names; `ButtonGroup*` remain for compatibility
- `GroupSeparator` is **always required** between controls, including outline buttons (unlike shadcn where separators are optional for outline buttons). This ensures consistent focus state handling and better accessibility
- If you used `asChild` on `ButtonGroupText`, switch to the `render` prop for custom components

### Input

Compared to shadcn/ui, our `Input` component includes size variants for better density control. shadcn/ui inputs have a fixed height of 36px, while our component offers flexible sizing with `sm` (28px), `default` (32px), and `lg` (36px) options.

So, if you want to preserve the original shadcn/ui input height (36px), you should use the `lg` size in coss ui.

### Input Group

**Quick Checklist:**
- No `InputGroupButton` component - use the regular `Button` component directly inside `InputGroupAddon` instead
- To disable an input group, disable the `InputGroupInput` or `InputGroupTextarea` directly (and any Button inside it) - no need to add a `data-disabled` attribute on `InputGroup`.

### Menu

**Prop Mapping:**

| Component  | Radix UI Prop | Base UI Prop |
| ---------- | ------------- | ------------ |
| `MenuItem` | `onSelect`    | `onClick`    |

**Quick Checklist:**
- Replace `asChild` → `render` on `MenuTrigger` and `MenuItem`
- Replace `onSelect` → `onClick` on menu items
- Update import path from `@/components/ui/dropdown-menu` → `@/components/ui/menu`
- Prefer `Menu*` component names; `DropdownMenu*` remain for legacy
- Prefer `MenuGroupLabel` instead of `DropdownMenuLabel`
- Prefer `MenuPopup` instead of `DropdownMenuContent`
- Prefer `MenuSubPopup` instead of `DropdownMenuSubContent`
- If you used `asChild` on any other parts, switch to the `render` prop

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:onSelect]
<DropdownMenu>
  <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem
      onSelect={() => {
        console.log("Dashboard")
      }}
    >
      Dashboard
    </DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem>Sign out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:onClick]
<Menu>
  <MenuTrigger>Open menu</MenuTrigger>
  <MenuPopup>
    <MenuItem
      onClick={() => {
        console.log("Dashboard")
      }}
    >
      Dashboard
    </MenuItem>
    <MenuItem>Settings</MenuItem>
    <MenuItem>Sign out</MenuItem>
  </MenuPopup>
</Menu>
```
</span>

### Popover

**Quick Checklist:**
- Replace `asChild` → `render` on `PopoverTrigger` and closing buttons
- Prefer `PopoverPopup`; `PopoverContent` remains for legacy
- If you used `asChild` on any other parts, switch to the `render` prop

**Additional Notes:**

Base UI introduces `PopoverTitle` and `PopoverDescription` to structure headings and helper text inside the popup. Base UI also introduces a `PopoverClose` component for adding close buttons to the popup.

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <h2>Popover Title</h2>
    <p>Popover Description</p>
  </PopoverContent>
</Popover>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:PopoverTitle]
// [!code word:PopoverDescription]
// [!code word:PopoverClose]
// [!code word:render:2]
<Popover>
  <PopoverTrigger render={<Button variant="outline" />}>
    Open Popover
  </PopoverTrigger>
  <PopoverPopup>
    <PopoverTitle>Popover Title</PopoverTitle>
    <PopoverDescription>Popover Description</PopoverDescription>
    <PopoverClose render={<Button variant="ghost" />}>Close</PopoverClose>
  </PopoverPopup>
</Popover>
```
</span>

### Preview Card

**Quick Checklist:**
- Update import path from `@/components/ui/hover-card` → `@/components/ui/preview-card`
- Prefer `PreviewCard*` component names; `HoverCard*` remain for legacy
- Prefer `PreviewCardPopup` instead of `HoverCardContent`
- If you used `asChild` on parts, switch to the `render` prop

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="outline">Open Preview Card</Button>
  </HoverCardTrigger>
  <HoverCardContent>Preview Card Content</HoverCardContent>
</HoverCard>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
<PreviewCard>
  <PreviewCardTrigger render={<Button variant="outline" />}>
    Open Preview Card
  </PreviewCardTrigger>
  <PreviewCardPopup>Preview Card Content</PreviewCardPopup>
</PreviewCard>
```
</span>

### Progress

**Quick Checklist:**
- Prefer `ProgressLabel` and `ProgressValue` for label/value instead of inline elements
- If you render children inside `Progress`, you must include `ProgressTrack` and `ProgressIndicator` (otherwise the bar will not display). Without children, a default bar is rendered for you
- If you used `asChild`, switch to the `render` prop

**Additional Notes:**

Base UI introduces separate parts — `ProgressLabel`, `ProgressValue`, `ProgressTrack`, and `ProgressIndicator` — which you compose inside `Progress` for greater flexibility.

### Radio Group

**Quick Checklist:**
- Use `Radio` going forward; `RadioGroupItem` remains for legacy
- Replace `asChild` → `render` on parts if used

### Scroll Area

**Quick Checklist:**
- If you used `asChild` on parts, switch to the `render` prop

### Select

**Important:** Base UI changes how options are provided. Instead of deriving options from children only (Radix pattern), you should pass an `items` prop (array or record) so values and labels are known before hydration. This avoids SSR pitfalls and improves mount performance. Alternatively, provide a function child to `SelectValue` to format the label. See the [Base UI Select docs](https://base-ui.com/react/components/select).

**Prop Mapping:**

| Component     | Radix UI Prop          | Base UI Prop    |
| ------------- | ---------------------- | --------------- |
| `Select`      | `items`                | `items`         |
| `SelectValue` | `placeholder`          | _removed_       |
| `SelectPopup` | `alignItemWithTrigger` | _no equivalent_ |

**Quick Checklist:**
- Set `items` prop on `Select`
- Remove `placeholder` from `Select`
- Prefer `SelectPopup` instead of `SelectContent`
- If you used `asChild` on parts, switch to the `render` prop

**Size Comparison:**

coss ui select sizes are more compact compared to shadcn/ui, making them better suited for dense applications:

| Size      | Height (shadcn/ui) | Height (coss ui) |
| --------- | ------------------ | ---------------- |
| `sm`      | 32px               | 28px             |
| `default` | 36px               | 32px             |
| `lg`      | -                  | 36px             |

So, for example, if you were using the `default` size in shadcn/ui and you want to preserve the original height, you should use the `lg` size in coss ui.

**Additional Notes:**

Base UI introduces the `alignItemWithTrigger` prop to control whether the `SelectContent` overlaps the `SelectTrigger` so the selected item's text is aligned with the trigger's value text.

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:placeholder="Select a framework"]
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select a framework" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="next">Next.js</SelectItem>
    <SelectItem value="vite">Vite</SelectItem>
    <SelectItem value="astro">Astro</SelectItem>
  </SelectContent>
</Select>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:alignItemWithTrigger={false}]
// [!code word:items:2]
<Select
  items={[
    { label: "Select a framework", value: null },
    { label: "Next.js", value: "next" },
    { label: "Vite", value: "vite" },
    { label: "Astro", value: "astro" },
  ]}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectPopup alignItemWithTrigger={false}>
    {items.map((item) => (
      <SelectItem key={item.value} value={item}>
        {item.label}
      </SelectItem>
    ))}
  </SelectPopup>
</Select>
```
</span>

### Sheet

**Quick Checklist:**
- Replace `asChild` → `render` on `SheetTrigger` and closing buttons
- Prefer `SheetPopup`; `SheetContent` remains for legacy
- Use `SheetPanel` to wrap main content
- If you used `asChild` on any other parts, switch to the `render` prop

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Sheet</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
    </SheetHeader>
    Content here
    <SheetFooter>
      <SheetClose asChild>
        <Button>Close</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
// [!code word:<SheetPanel>Content here</SheetPanel>]
<Sheet>
  <SheetTrigger render={<Button variant="outline" />}>
    Open Sheet
  </SheetTrigger>
  <SheetPopup>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
    </SheetHeader>
    <SheetPanel>Content here</SheetPanel>
    <SheetFooter>
      <SheetClose render={<Button />}>Close</SheetClose>
    </SheetFooter>
  </SheetPopup>
</Sheet>
```
</span>

### Slider

**Quick Checklist:**
- coss ui `Slider` uses Base UI's multiple value approach
- Always pass values as arrays (e.g., `value={[50]}` instead of `value={50}`)
- `onValueChange` receives an array of numbers
- Multiple thumbs are supported natively via array length
- Replace `asChild` → `render` on parts if used

### Switch

**Quick Checklist:**
- Replace `asChild` → `render` on `Switch` if used

### Tabs

**Quick Checklist:**
- Replace `asChild` → `render` on parts if used
- Use `TabsTab` going forward; `TabsTrigger` remains for legacy
- Prefer `TabsPanel`; `TabsContent` remains for legacy

**Additional Notes:**

Compared to shadcn/ui, our `TabsList` component adds `variant` prop, which allows you to choose between `default` and `underline` styles.

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:TabsContent]
<Tabs defaultValue="tab-1">
  <TabsList>
    <TabsTab value="tab-1">Tab 1</TabsTab>
    <TabsTab value="tab-2">Tab 2</TabsTab>
    <TabsTab value="tab-3">Tab 3</TabsTab>
  </TabsList>
  <TabsContent value="tab-1">Tab 1 content</TabsContent>
  <TabsContent value="tab-2">Tab 2 content</TabsContent>
  <TabsContent value="tab-3">Tab 3 content</TabsContent>
</Tabs>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:TabsPanel]
<Tabs defaultValue="tab-1">
  <TabsList>
    <TabsTab value="tab-1">Tab 1</TabsTab>
    <TabsTab value="tab-2">Tab 2</TabsTab>
    <TabsTab value="tab-3">Tab 3</TabsTab>
  </TabsList>
  <TabsPanel value="tab-1">Tab 1 content</TabsPanel>
  <TabsPanel value="tab-2">Tab 2 content</TabsPanel>
  <TabsPanel value="tab-3">Tab 3 content</TabsPanel>
</Tabs>
```
</span>

### Textarea

Compared to shadcn/ui, our `Textarea` component includes size variants (`sm`, `default`, `lg`) for better density control. For visual consistency, if you're using `size="lg"` on other form elements like inputs, you should add the same size to textareas as well.

### Toast

The API is significantly different from shadcn/ui (Sonner). Please review both docs before migrating: [Sonner Docs](https://sonner.emilkowal.ski/) and [shadcn/ui Sonner](https://ui.shadcn.com/docs/components/sonner), and our Base UI toast docs.

**Quick Checklist:**
- Replace `<Toaster />` component in layout → `<ToastProvider>` wrapper
- Toast API calls differ significantly - see comparison below
- Toast actions use different patterns

**Comparison Examples:**

**shadcn/ui (Sonner)**

```tsx title="app/layout.tsx"
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
```

```tsx
toast("Event has been created", {
  description: "Sunday, December 03, 2023 at 9:00 AM",
  cancel: {
    label: "Undo",
  },
})
```

**coss ui (Base UI)**

```tsx title="app/layout.tsx"
import { ToastProvider } from "@/components/ui/toast"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
        <ToastProvider>
          <main>{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}
```

```tsx
onClick={() => {
  const id = toastManager.add({
    title: "Event has been created",
    description: "Sunday, December 03, 2023 at 9:00 AM",
    type: "success",
    actionProps: {
      children: "Undo",
      onClick: () => toastManager.close(id),
    },
  })
}}
```

### Toggle

**Quick Checklist:**
- Replace `asChild` → `render` on `Toggle` if used

### Toggle Group

**Prop Mapping:**

| Component     | Radix UI Prop                             | Base UI Prop                           |
| ------------- | ----------------------------------------- | -------------------------------------- |
| `ToggleGroup` | `type` (enum, `"single"` or `"multiple"`) | `multiple` (boolean, default: `false`) |

**Quick Checklist:**
- Replace `type="multiple"` → `multiple` on `ToggleGroup`
- Remove `type="single"` from `ToggleGroup`
- Always use arrays for `defaultValue`
- Use `Toggle` going forward; `ToggleGroupItem` remains for legacy
- Replace `asChild` → `render` on parts if used

**Size Comparison:**

coss ui toggle group sizes are more compact compared to shadcn/ui, making them better suited for dense applications:

| Size      | Height (shadcn/ui) | Height (coss ui) |
| --------- | ------------------ | ---------------- |
| `sm`      | 32px               | 28px             |
| `default` | 36px               | 32px             |
| `lg`      | -                  | 36px             |

So, for example, if you were using the `default` size in shadcn/ui and you want to preserve the original height, you should use the `lg` size in coss ui.

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:type="multiple"]
<ToggleGroup type="multiple" defaultValue={["bold"]}>
  <ToggleGroupItem value="bold">B</ToggleGroupItem>
  <ToggleGroupItem value="italic">I</ToggleGroupItem>
  <ToggleGroupItem value="underline">U</ToggleGroupItem>
</ToggleGroup>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:multiple]
<ToggleGroup multiple defaultValue={["bold"]}>
  <Toggle value="bold">B</Toggle>
  <Toggle value="italic">I</Toggle>
  <Toggle value="underline">U</Toggle>
</ToggleGroup>
```
</span>

### Tooltip

**Quick Checklist:**
- Replace `asChild` → `render` on `TooltipTrigger`
- Prefer `TooltipPopup`; `TooltipContent` remains for legacy

**Comparison Example:**

<span data-lib="radix-ui">
```tsx title="shadcn/ui"
// [!code word:asChild]
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline">Hover me</Button>
  </TooltipTrigger>
  <TooltipContent>Tooltip content</TooltipContent>
</Tooltip>
```
</span>

<span data-lib="base-ui">
```tsx title="coss ui"
// [!code word:render]
<Tooltip>
  <TooltipTrigger render={<Button variant="outline" />}>
    Hover me
  </TooltipTrigger>
  <TooltipPopup>Tooltip content</TooltipPopup>
</Tooltip>
```
</span>

## Additional Resources

- [Base UI Documentation](https://base-ui.com/) - Official Base UI docs
- [Component Documentation](/ui/docs/components) - Individual component docs with examples
- [Styling Guide](/ui/docs/styling) - Learn about our color system and theming

## Need Help?

If you encounter issues during migration or have questions about specific components, please:

- Check the individual component documentation pages
- Review the Base UI documentation for deeper understanding
- Open an issue on our GitHub repository
