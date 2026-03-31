# Component Mapping: @calcom/ui to @coss/ui

Master lookup table for migrating Cal.com UI components. For detailed transformation rules per group, see the corresponding file under `../rules/`.

## Page Layout

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `SettingsHeader` | `AppHeader` / `AppHeaderContent` / `AppHeaderDescription` / `AppHeaderActions` | `@coss/ui/shared/app-header` | `page-layout.md` |
| `SectionBottomActions` | `CardFrameFooter` (inside `CardFrame`) | `@coss/ui/components/card` | `page-layout.md` |

## Cards & Containers

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `PanelCard` | `CardFrame` / `CardFrameHeader` / `CardFrameTitle` / `Card` / `CardPanel` | `@coss/ui/components/card` | `cards-containers.md` |
| `SettingsToggle` | `SettingsToggle` (shared) | `@coss/ui/shared/settings-toggle` | `cards-containers.md` |

## Dialogs & Overlays

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `Dialog` + `DialogContent` | `Dialog` + `DialogPopup` + `DialogHeader` + `DialogPanel` | `@coss/ui/components/dialog` | `dialogs-overlays.md` |
| `DialogFooter` | `DialogFooter` | `@coss/ui/components/dialog` | `dialogs-overlays.md` |
| `DialogClose` (button) | `DialogClose render={<Button variant="ghost" />}` | `@coss/ui/components/dialog` | `dialogs-overlays.md` |
| `ConfirmationDialogContent` | `AlertDialog` + `AlertDialogPopup` + `AlertDialogHeader` + `AlertDialogFooter` | `@coss/ui/components/alert-dialog` | `dialogs-overlays.md` |
| `Sheet` / `SheetBody` | `Drawer` (preferred) or `Sheet` / `SheetPanel` / `SheetClose` | `@coss/ui/components/drawer` | `dialogs-overlays.md` |

## Forms & Input Fields

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `TextField` | `Field` + `FieldLabel` + `Input` | `@coss/ui/components/field`, `@coss/ui/components/input` | `forms-inputs.md` |
| `TextField` (with `addOnLeading`) | `InputGroup` + `InputGroupAddon` + `InputGroupInput` | `@coss/ui/components/input-group` | `forms-inputs.md` |
| `PasswordField` | `PasswordField` (shared) | `@coss/ui/shared/password-field` | `forms-inputs.md` |
| `SelectField` (react-select) | `Select` + `SelectTrigger` + `SelectValue` + `SelectPopup` + `SelectItem` | `@coss/ui/components/select` | `forms-inputs.md` |
| `TextArea` | `Textarea` | `@coss/ui/components/textarea` | `forms-inputs.md` |
| `Form` (react-hook-form wrapper) | `Form` (coss, Base UI) integrated with RHF | `@coss/ui/components/form` | `forms-inputs.md` |
| `Switch` | `Switch` | `@coss/ui/components/switch` | `forms-inputs.md` |
| `CheckboxField` | `Checkbox` (with `Controller` pattern) | `@coss/ui/components/checkbox` | `forms-inputs.md` |
| `Slider` | `Slider` (array value API) | `@coss/ui/components/slider` | `forms-inputs.md` |
| `TwoFactor` / OTP inputs | `InputOTP` + `InputOTPGroup` + `InputOTPSlot` | `@coss/ui/components/input-otp` | `forms-inputs.md` |
| N/A (manual toggle+collapse) | `Collapsible` + `CollapsibleTrigger` + `CollapsiblePanel` + `Switch` | `@coss/ui/components/collapsible`, `@coss/ui/components/switch` | `forms-inputs.md` |
| `Label` (standalone) | `FieldLabel` (always inside `Field`) | `@coss/ui/components/field` | `forms-inputs.md` |

## Lists & Data Display

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `TableNew` / `TableRow` / `TableCell` | `ListItem` / `ListItemContent` / `ListItemTitle` / `ListItemDescription` / `ListItemActions` | `@coss/ui/shared/list-item` | `lists-data.md` |
| `List` / `AppListCard` | `Card` + `CardPanel` + `ListItem` composition | various | `lists-data.md` |
| `EmptyScreen` | `Empty` / `EmptyContent` / `EmptyHeader` / `EmptyTitle` / `EmptyDescription` / `EmptyMedia` | `@coss/ui/components/empty` | `lists-data.md` |
| `Dropdown` menu | `Menu` / `MenuItem` / `MenuPopup` / `MenuTrigger` | `@coss/ui/components/menu` | `lists-data.md` |

## Feedback & Notifications

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `showToast(msg, type)` | `toastManager.add({ title, type })` | `@coss/ui/components/toast` | `feedback-notifications.md` |
| N/A (custom tooltip toast) | `anchoredToastManager.add(...)` | `@coss/ui/components/toast` | `dialogs-overlays.md` |
| `Alert` (`severity` prop) | `Alert` (`variant` prop) + icon child + `AlertDescription` | `@coss/ui/components/alert` | `feedback-notifications.md` |
| `Badge` (`green`/`gray`/`blue`) | `Badge` (`success`/`secondary`/`info`) | `@coss/ui/components/badge` | `feedback-notifications.md` |
| `Tooltip` (content prop) | `TooltipProvider` + `Tooltip` + `TooltipTrigger` + `TooltipPopup` | `@coss/ui/components/tooltip` | `feedback-notifications.md` |

## Skeletons & Loading

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `SkeletonContainer` / `SkeletonText` / `SkeletonButton` | `Skeleton` (single generic component) | `@coss/ui/components/skeleton` | `skeletons-loading.md` |

## Actions

| `@calcom/ui` | `@coss/ui` | Import path | Rule file |
|---|---|---|---|
| `Button` | `Button` | `@coss/ui/components/button` | `buttons.md` |

## Navigation

| `@calcom/ui` | `@coss/ui` | Notes | Rule file |
|---|---|---|---|
| `VerticalTabs` / `HorizontalTabs` | Ghost `Button` + `ScrollArea` + `useMediaQuery` | Custom nav pattern | `page-layout.md` |
| `ToggleGroup` | `Tabs` | For mode selectors | `forms-inputs.md` |
| `ThemeLabel` + radio inputs | Not yet migrated — `ThemeLabel` still lives at `packages/features/settings/ThemeLabel.tsx` | N/A | N/A |

## Utilities

| `@calcom/ui` | `@coss/ui` | Notes |
|---|---|---|
| `classNames()` / `cs()` | `cn()` | `@coss/ui` utility |
| Icons from `@calcom/ui` or `lucide-react` | Icons from `@coss/ui/icons` | Strict rule |
| `Avatar` | `Avatar` / `AvatarImage` / `AvatarFallback` | Composition pattern |
| `Collapsible` (manual state) | `Collapsible` / `CollapsibleTrigger` / `CollapsiblePanel` | `@coss/ui/components/collapsible` / `forms-inputs.md` |
