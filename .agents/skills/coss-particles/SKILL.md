---
name: coss-particles
description: Index of all COSS UI particle examples. Use when implementing UI features to find copy-paste-ready component patterns built on coss primitives. Each particle has a description and a JSON URL for easy installation.
compatibility: Requires coss UI components installed in the project.
license: MIT
metadata:
  author: cosscom
---

# COSS UI Particles Index

Particles are copy-paste-ready UI patterns built on [coss](https://coss.com/ui) primitives. Browse them visually at <https://coss.com/ui/particles>.

## How to use this skill

1. Describe the UI you need (e.g. "a form with validation", "a dialog with a form inside", "tabs with icons").
2. Search this index for matching particles by component type and description.
3. Fetch the JSON URL to get the full source code of the particle.
4. Adapt the particle code to your needs.

## JSON URL pattern

Each particle has a JSON manifest at:
```
https://coss.com/ui/r/<particle-name>.json
```
For example: `https://coss.com/ui/r/p-accordion-1.json`

## Source code

Particle source files live in this repo at `apps/ui/registry/default/particles/`.

## Updating this index

Run the generator script from the coss repo root:
```bash
node apps/ui/scripts/generate-particle-index.cjs
```

Total: **474 particles** across **52 component types**

## Component types

- [accordion](#accordion) (4)
- [alert](#alert) (7)
- [alert-dialog](#alert-dialog) (2)
- [autocomplete](#autocomplete) (15)
- [avatar](#avatar) (14)
- [badge](#badge) (20)
- [breadcrumb](#breadcrumb) (7)
- [button](#button) (40)
- [calendar](#calendar) (24)
- [card](#card) (11)
- [checkbox](#checkbox) (5)
- [checkbox-group](#checkbox-group) (5)
- [collapsible](#collapsible) (1)
- [combobox](#combobox) (18)
- [command](#command) (2)
- [date-picker](#date-picker) (9)
- [dialog](#dialog) (6)
- [drawer](#drawer) (14)
- [empty](#empty) (1)
- [field](#field) (18)
- [fieldset](#fieldset) (1)
- [form](#form) (2)
- [frame](#frame) (4)
- [group](#group) (22)
- [input](#input) (19)
- [input-group](#input-group) (28)
- [input-otp](#input-otp) (7)
- [kbd](#kbd) (1)
- [menu](#menu) (9)
- [meter](#meter) (4)
- [number-field](#number-field) (11)
- [pagination](#pagination) (3)
- [popover](#popover) (3)
- [preview-card](#preview-card) (1)
- [progress](#progress) (3)
- [radio-group](#radio-group) (6)
- [scroll-area](#scroll-area) (5)
- [select](#select) (23)
- [separator](#separator) (1)
- [sheet](#sheet) (3)
- [skeleton](#skeleton) (2)
- [slider](#slider) (23)
- [spinner](#spinner) (1)
- [switch](#switch) (6)
- [table](#table) (4)
- [tabs](#tabs) (13)
- [textarea](#textarea) (15)
- [toast](#toast) (9)
- [toggle](#toggle) (8)
- [toggle-group](#toggle-group) (9)
- [toolbar](#toolbar) (1)
- [tooltip](#tooltip) (4)

---

### accordion

- Basic accordion | [JSON](https://coss.com/ui/r/p-accordion-1.json)
- Accordion with one panel open | [JSON](https://coss.com/ui/r/p-accordion-2.json)
- Accordion allowing multiple panels open | [JSON](https://coss.com/ui/r/p-accordion-3.json)
- Controlled accordion | [JSON](https://coss.com/ui/r/p-accordion-4.json)

### alert

- Basic alert | [JSON](https://coss.com/ui/r/p-alert-1.json)
- Alert with icon | [JSON](https://coss.com/ui/r/p-alert-2.json)
- Alert with icon and action buttons | [JSON](https://coss.com/ui/r/p-alert-3.json)
- Info alert | [JSON](https://coss.com/ui/r/p-alert-4.json)
- Success alert | [JSON](https://coss.com/ui/r/p-alert-5.json)
- Warning alert | [JSON](https://coss.com/ui/r/p-alert-6.json)
- Error alert | [JSON](https://coss.com/ui/r/p-alert-7.json)

### alert-dialog

- Alert dialog | [JSON](https://coss.com/ui/r/p-alert-dialog-1.json)
- Alert dialog with bare footer | [JSON](https://coss.com/ui/r/p-alert-dialog-2.json)

### autocomplete

- Basic autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-1.json)
- Disabled autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-2.json)
- Small autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-3.json)
- Large autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-4.json)
- Autocomplete with label | [JSON](https://coss.com/ui/r/p-autocomplete-5.json)
- Autocomplete autofilling the input with the highlighted item | [JSON](https://coss.com/ui/r/p-autocomplete-6.json)
- Autocomplete auto highlighting the first option | [JSON](https://coss.com/ui/r/p-autocomplete-7.json)
- Autocomplete with clear button | [JSON](https://coss.com/ui/r/p-autocomplete-8.json)
- Autocomplete with trigger and clear buttons | [JSON](https://coss.com/ui/r/p-autocomplete-9.json)
- Autocomplete with grouped items | [JSON](https://coss.com/ui/r/p-autocomplete-10.json)
- Autocomplete with limited number of results | [JSON](https://coss.com/ui/r/p-autocomplete-11.json)
- Autocomplete with async items loading | [JSON](https://coss.com/ui/r/p-autocomplete-12.json)
- Autocomplete form | [JSON](https://coss.com/ui/r/p-autocomplete-13.json)
- Autocomplete form | [JSON](https://coss.com/ui/r/p-autocomplete-14.json)
- Pill-shaped autocomplete | [JSON](https://coss.com/ui/r/p-autocomplete-15.json)

### avatar

- Avatar with image and fallback | [JSON](https://coss.com/ui/r/p-avatar-1.json)
- Fallback-only avatar | [JSON](https://coss.com/ui/r/p-avatar-2.json)
- Avatars with different sizes | [JSON](https://coss.com/ui/r/p-avatar-3.json)
- Avatars with different radii | [JSON](https://coss.com/ui/r/p-avatar-4.json)
- Overlapping avatar group | [JSON](https://coss.com/ui/r/p-avatar-5.json)
- Avatar with user icon fallback | [JSON](https://coss.com/ui/r/p-avatar-6.json)
- Avatar with emerald status dot | [JSON](https://coss.com/ui/r/p-avatar-7.json)
- Avatar with muted status dot | [JSON](https://coss.com/ui/r/p-avatar-8.json)
- Rounded avatar with top-right emerald status | [JSON](https://coss.com/ui/r/p-avatar-9.json)
- Avatar with notification badge | [JSON](https://coss.com/ui/r/p-avatar-10.json)
- Rounded avatar with notification badge | [JSON](https://coss.com/ui/r/p-avatar-11.json)
- Avatar with verified badge | [JSON](https://coss.com/ui/r/p-avatar-12.json)
- Small overlapping avatar group | [JSON](https://coss.com/ui/r/p-avatar-13.json)
- Large overlapping avatar group | [JSON](https://coss.com/ui/r/p-avatar-14.json)

### badge

- Basic badge | [JSON](https://coss.com/ui/r/p-badge-1.json)
- Outline badge | [JSON](https://coss.com/ui/r/p-badge-2.json)
- Secondary badge | [JSON](https://coss.com/ui/r/p-badge-3.json)
- Destructive badge | [JSON](https://coss.com/ui/r/p-badge-4.json)
- Info badge | [JSON](https://coss.com/ui/r/p-badge-5.json)
- Success badge | [JSON](https://coss.com/ui/r/p-badge-6.json)
- Warning badge | [JSON](https://coss.com/ui/r/p-badge-7.json)
- Error badge | [JSON](https://coss.com/ui/r/p-badge-8.json)
- Small badge | [JSON](https://coss.com/ui/r/p-badge-9.json)
- Large badge | [JSON](https://coss.com/ui/r/p-badge-10.json)
- Badge with icon | [JSON](https://coss.com/ui/r/p-badge-11.json)
- Badge with link | [JSON](https://coss.com/ui/r/p-badge-12.json)
- Badge with count | [JSON](https://coss.com/ui/r/p-badge-13.json)
- Full rounded badge (pill) | [JSON](https://coss.com/ui/r/p-badge-14.json)
- Badge with number after text | [JSON](https://coss.com/ui/r/p-badge-15.json)
- Status badge - Paid | [JSON](https://coss.com/ui/r/p-badge-16.json)
- Status badge - Pending | [JSON](https://coss.com/ui/r/p-badge-17.json)
- Status badge - Failed | [JSON](https://coss.com/ui/r/p-badge-18.json)
- Selectable badge with checkbox | [JSON](https://coss.com/ui/r/p-badge-19.json)
- Removable badge | [JSON](https://coss.com/ui/r/p-badge-20.json)

### breadcrumb

- Breadcrumb with menu example | [JSON](https://coss.com/ui/r/p-breadcrumb-1.json)
- Breadcrumb with custom separator | [JSON](https://coss.com/ui/r/p-breadcrumb-2.json)
- Breadcrumb with home icon for home link only | [JSON](https://coss.com/ui/r/p-breadcrumb-3.json)
- Breadcrumb with folders icon menu | [JSON](https://coss.com/ui/r/p-breadcrumb-4.json)
- Breadcrumb with icons before text | [JSON](https://coss.com/ui/r/p-breadcrumb-5.json)
- Breadcrumb with dot separators | [JSON](https://coss.com/ui/r/p-breadcrumb-6.json)
- Breadcrumb with select dropdown | [JSON](https://coss.com/ui/r/p-breadcrumb-7.json)

### button

- Default button | [JSON](https://coss.com/ui/r/p-button-1.json)
- Outline button | [JSON](https://coss.com/ui/r/p-button-2.json)
- Secondary button | [JSON](https://coss.com/ui/r/p-button-3.json)
- Destructive button | [JSON](https://coss.com/ui/r/p-button-4.json)
- Destructive outline button | [JSON](https://coss.com/ui/r/p-button-5.json)
- Ghost button | [JSON](https://coss.com/ui/r/p-button-6.json)
- Link button | [JSON](https://coss.com/ui/r/p-button-7.json)
- Extra-small button | [JSON](https://coss.com/ui/r/p-button-8.json)
- Small button | [JSON](https://coss.com/ui/r/p-button-9.json)
- Large button | [JSON](https://coss.com/ui/r/p-button-10.json)
- Extra-large button | [JSON](https://coss.com/ui/r/p-button-11.json)
- Disabled button | [JSON](https://coss.com/ui/r/p-button-12.json)
- Icon button | [JSON](https://coss.com/ui/r/p-button-13.json)
- Small icon button | [JSON](https://coss.com/ui/r/p-button-14.json)
- Large icon button | [JSON](https://coss.com/ui/r/p-button-15.json)
- Button with icon | [JSON](https://coss.com/ui/r/p-button-16.json)
- Link rendered as button | [JSON](https://coss.com/ui/r/p-button-17.json)
- Button using the built-in loading prop | [JSON](https://coss.com/ui/r/p-button-41.json)
- Custom loading button with manual Spinner | [JSON](https://coss.com/ui/r/p-button-18.json)
- Expandable show more/less toggle button | [JSON](https://coss.com/ui/r/p-button-19.json)
- Back link button with chevron | [JSON](https://coss.com/ui/r/p-button-20.json)
- Card-style button with heading and description | [JSON](https://coss.com/ui/r/p-button-21.json)
- Directional pad control buttons | [JSON](https://coss.com/ui/r/p-button-22.json)
- Outline like button with count | [JSON](https://coss.com/ui/r/p-button-23.json)
- Social login icon buttons | [JSON](https://coss.com/ui/r/p-button-24.json)
- Star button with count badge | [JSON](https://coss.com/ui/r/p-button-26.json)
- Button group with QR code icon and sign in | [JSON](https://coss.com/ui/r/p-button-27.json)
- Button with avatar | [JSON](https://coss.com/ui/r/p-button-28.json)
- Pill-shaped button with rounded-full styling | [JSON](https://coss.com/ui/r/p-button-29.json)
- Button with animated arrow on hover | [JSON](https://coss.com/ui/r/p-button-30.json)
- Button with keyboard shortcut indicator | [JSON](https://coss.com/ui/r/p-button-31.json)
- Button with notification badge | [JSON](https://coss.com/ui/r/p-button-32.json)
- Paired buttons (Cancel/Save) | [JSON](https://coss.com/ui/r/p-button-33.json)
- Button with animated status dot | [JSON](https://coss.com/ui/r/p-button-34.json)
- Icon-only copy button with feedback | [JSON](https://coss.com/ui/r/p-button-35.json)
- Copy button with feedback | [JSON](https://coss.com/ui/r/p-button-36.json)
- Rotating icon button (FAB-style toggle) | [JSON](https://coss.com/ui/r/p-button-37.json)
- Hamburger menu button with animated icon | [JSON](https://coss.com/ui/r/p-button-39.json)
- Download button with progress and cancel action | [JSON](https://coss.com/ui/r/p-button-40.json)
- Social login buttons (Google, X, GitHub) | [JSON](https://coss.com/ui/r/p-button-38.json)

### calendar

- Basic calendar | [JSON](https://coss.com/ui/r/p-calendar-1.json)
- Calendar with date range selection | [JSON](https://coss.com/ui/r/p-calendar-3.json)
- Calendar with month/year dropdown navigation | [JSON](https://coss.com/ui/r/p-calendar-4.json)
- Calendar with custom Select dropdown for month/year | [JSON](https://coss.com/ui/r/p-calendar-5.json)
- Calendar with Combobox dropdown for month/year | [JSON](https://coss.com/ui/r/p-calendar-6.json)
- Calendar with disabled dates | [JSON](https://coss.com/ui/r/p-calendar-7.json)
- Calendar with multiple date selection | [JSON](https://coss.com/ui/r/p-calendar-8.json)
- Calendar with custom cell size | [JSON](https://coss.com/ui/r/p-calendar-2.json)
- Calendar with rounded day buttons | [JSON](https://coss.com/ui/r/p-calendar-9.json)
- Calendar with rounded range selection style | [JSON](https://coss.com/ui/r/p-calendar-10.json)
- Calendar with right-aligned navigation | [JSON](https://coss.com/ui/r/p-calendar-11.json)
- Calendar with week numbers | [JSON](https://coss.com/ui/r/p-calendar-12.json)
- Calendar with year-only combobox dropdown | [JSON](https://coss.com/ui/r/p-calendar-13.json)
- Calendar without arrow navigation (dropdown only) | [JSON](https://coss.com/ui/r/p-calendar-14.json)
- Calendar with current month button | [JSON](https://coss.com/ui/r/p-calendar-15.json)
- Calendar with today button | [JSON](https://coss.com/ui/r/p-calendar-16.json)
- Calendar with date input | [JSON](https://coss.com/ui/r/p-calendar-17.json)
- Calendar with time input | [JSON](https://coss.com/ui/r/p-calendar-18.json)
- Calendar with time slots (appointment picker) | [JSON](https://coss.com/ui/r/p-calendar-19.json)
- Calendar with date presets | [JSON](https://coss.com/ui/r/p-calendar-20.json)
- Range calendar with date presets | [JSON](https://coss.com/ui/r/p-calendar-21.json)
- Two months calendar | [JSON](https://coss.com/ui/r/p-calendar-22.json)
- Three months calendar | [JSON](https://coss.com/ui/r/p-calendar-23.json)
- Pricing calendar with custom day buttons | [JSON](https://coss.com/ui/r/p-calendar-24.json)

### card

- A basic card with header and footer | [JSON](https://coss.com/ui/r/p-card-1.json)
- Authentication card with actions | [JSON](https://coss.com/ui/r/p-card-2.json)
- Authentication card with separators | [JSON](https://coss.com/ui/r/p-card-3.json)
- Framed card with footer | [JSON](https://coss.com/ui/r/p-card-4.json)
- Framed card with header | [JSON](https://coss.com/ui/r/p-card-5.json)
- Framed card with header and footer | [JSON](https://coss.com/ui/r/p-card-6.json)
- Framed card with no rounded bottom | [JSON](https://coss.com/ui/r/p-card-7.json)
- Card within a frame and footer | [JSON](https://coss.com/ui/r/p-card-8.json)
- Card within a frame and footer | [JSON](https://coss.com/ui/r/p-card-9.json)
- Card within a frame with header and footer | [JSON](https://coss.com/ui/r/p-card-10.json)
- CardFrame with header action | [JSON](https://coss.com/ui/r/p-card-11.json)

### checkbox

- Basic checkbox | [JSON](https://coss.com/ui/r/p-checkbox-1.json)
- Disabled checkbox | [JSON](https://coss.com/ui/r/p-checkbox-2.json)
- Checkbox with description | [JSON](https://coss.com/ui/r/p-checkbox-3.json)
- Card-style checkbox | [JSON](https://coss.com/ui/r/p-checkbox-4.json)
- Checkbox form | [JSON](https://coss.com/ui/r/p-checkbox-5.json)

### checkbox-group

- Basic checkbox group | [JSON](https://coss.com/ui/r/p-checkbox-group-1.json)
- Checkbox group with disabled items | [JSON](https://coss.com/ui/r/p-checkbox-group-2.json)
- Checkbox group with parent checkbox | [JSON](https://coss.com/ui/r/p-checkbox-group-3.json)
- Nested checkbox group with parent | [JSON](https://coss.com/ui/r/p-checkbox-group-4.json)
- Checkbox group form | [JSON](https://coss.com/ui/r/p-checkbox-group-5.json)

### collapsible

- Basic collapsible | [JSON](https://coss.com/ui/r/p-collapsible-1.json)

### combobox

- Basic combobox | [JSON](https://coss.com/ui/r/p-combobox-1.json)
- Disabled combobox | [JSON](https://coss.com/ui/r/p-combobox-2.json)
- Small combobox | [JSON](https://coss.com/ui/r/p-combobox-3.json)
- Large combobox | [JSON](https://coss.com/ui/r/p-combobox-4.json)
- Combobox with label | [JSON](https://coss.com/ui/r/p-combobox-5.json)
- Combobox auto highlighting the first option | [JSON](https://coss.com/ui/r/p-combobox-6.json)
- Combobox with clear button | [JSON](https://coss.com/ui/r/p-combobox-7.json)
- Combobox with grouped items | [JSON](https://coss.com/ui/r/p-combobox-8.json)
- Combobox with multiple selection | [JSON](https://coss.com/ui/r/p-combobox-9.json)
- Combobox with input inside popup | [JSON](https://coss.com/ui/r/p-combobox-10.json)
- Combobox form | [JSON](https://coss.com/ui/r/p-combobox-11.json)
- Combobox multiple form | [JSON](https://coss.com/ui/r/p-combobox-12.json)
- Combobox with start addon | [JSON](https://coss.com/ui/r/p-combobox-13.json)
- Combobox multiple with start addon | [JSON](https://coss.com/ui/r/p-combobox-14.json)
- Pill-shaped combobox | [JSON](https://coss.com/ui/r/p-combobox-15.json)
- Timezone combobox | [JSON](https://coss.com/ui/r/p-combobox-16.json)
- Timezone combobox with search input | [JSON](https://coss.com/ui/r/p-combobox-17.json)
- Combobox with select trigger | [JSON](https://coss.com/ui/r/p-combobox-18.json)

### command

- Command palette with dialog | [JSON](https://coss.com/ui/r/p-command-1.json)
- Command palette with AI assistant | [JSON](https://coss.com/ui/r/p-command-2.json)

### date-picker

- Basic date picker | [JSON](https://coss.com/ui/r/p-date-picker-1.json)
- Date range picker | [JSON](https://coss.com/ui/r/p-date-picker-2.json)
- Two months calendar with range date | [JSON](https://coss.com/ui/r/p-date-picker-9.json)
- Date picker with field and dropdown navigation | [JSON](https://coss.com/ui/r/p-date-picker-3.json)
- Date picker with presets | [JSON](https://coss.com/ui/r/p-date-picker-4.json)
- Date picker with input | [JSON](https://coss.com/ui/r/p-date-picker-5.json)
- Date picker that closes on select | [JSON](https://coss.com/ui/r/p-date-picker-6.json)
- Multiple dates picker | [JSON](https://coss.com/ui/r/p-date-picker-7.json)
- Date picker with select-like trigger | [JSON](https://coss.com/ui/r/p-date-picker-8.json)

### dialog

- Dialog with form | [JSON](https://coss.com/ui/r/p-dialog-1.json)
- Dialog with bare footer | [JSON](https://coss.com/ui/r/p-dialog-6.json)
- Dialog opened from menu | [JSON](https://coss.com/ui/r/p-dialog-2.json)
- Nested dialogs | [JSON](https://coss.com/ui/r/p-dialog-3.json)
- Dialog with close confirmation | [JSON](https://coss.com/ui/r/p-dialog-4.json)
- Dialog with long content | [JSON](https://coss.com/ui/r/p-dialog-5.json)

### drawer

- Simple bottom drawer with close button | [JSON](https://coss.com/ui/r/p-drawer-1.json)
- Bottom drawer without drag bar | [JSON](https://coss.com/ui/r/p-drawer-2.json)
- Drawer with close button | [JSON](https://coss.com/ui/r/p-drawer-3.json)
- Inset variant drawers for all four positions | [JSON](https://coss.com/ui/r/p-drawer-4.json)
- Straight variant drawers for all four positions | [JSON](https://coss.com/ui/r/p-drawer-5.json)
- Scrollable content with terms and conditions | [JSON](https://coss.com/ui/r/p-drawer-6.json)
- Nested bottom drawers with centered content | [JSON](https://coss.com/ui/r/p-drawer-7.json)
- Nested right drawers with inset variant | [JSON](https://coss.com/ui/r/p-drawer-8.json)
- Bottom drawer with snap points | [JSON](https://coss.com/ui/r/p-drawer-9.json)
- Edit profile form with default and bare footer variants | [JSON](https://coss.com/ui/r/p-drawer-10.json)
- Mobile menu drawer from the left | [JSON](https://coss.com/ui/r/p-drawer-11.json)
- Responsive edit profile: dialog on desktop, drawer on mobile | [JSON](https://coss.com/ui/r/p-drawer-12.json)
- Responsive actions menu: menu on desktop, drawer on mobile | [JSON](https://coss.com/ui/r/p-drawer-13.json)
- Left drawer with swipe area | [JSON](https://coss.com/ui/r/p-drawer-14.json)

### empty

- Empty state with icon and actions | [JSON](https://coss.com/ui/r/p-empty-1.json)

### field

- Field with description | [JSON](https://coss.com/ui/r/p-field-1.json)
- Field with required indicator | [JSON](https://coss.com/ui/r/p-field-2.json)
- Field in disabled state | [JSON](https://coss.com/ui/r/p-field-3.json)
- Field showing validation error | [JSON](https://coss.com/ui/r/p-field-4.json)
- Show field validity state | [JSON](https://coss.com/ui/r/p-field-5.json)
- Input group with field | [JSON](https://coss.com/ui/r/p-field-6.json)
- Field with autocomplete | [JSON](https://coss.com/ui/r/p-field-7.json)
- Field with combobox | [JSON](https://coss.com/ui/r/p-field-8.json)
- Field with multiple selection combobox | [JSON](https://coss.com/ui/r/p-field-9.json)
- Field with textarea | [JSON](https://coss.com/ui/r/p-field-10.json)
- Field with select | [JSON](https://coss.com/ui/r/p-field-11.json)
- Field with checkbox | [JSON](https://coss.com/ui/r/p-field-12.json)
- Field with checkbox group | [JSON](https://coss.com/ui/r/p-field-13.json)
- Field with radio group | [JSON](https://coss.com/ui/r/p-field-14.json)
- Field with toggle switch | [JSON](https://coss.com/ui/r/p-field-15.json)
- Field with slider | [JSON](https://coss.com/ui/r/p-field-16.json)
- Field with number field | [JSON](https://coss.com/ui/r/p-field-17.json)
- Complete form built with field | [JSON](https://coss.com/ui/r/p-field-18.json)

### fieldset

- Fieldset with multiple fields | [JSON](https://coss.com/ui/r/p-fieldset-1.json)

### form

- Input in a form | [JSON](https://coss.com/ui/r/p-form-1.json)
- Form with zod validation | [JSON](https://coss.com/ui/r/p-form-2.json)

### frame

- Basic frame | [JSON](https://coss.com/ui/r/p-frame-1.json)
- Frame with multiple separated panels | [JSON](https://coss.com/ui/r/p-frame-3.json)
- Frame with multiple stacked panels | [JSON](https://coss.com/ui/r/p-frame-4.json)
- Frame with collapsible content and delete button | [JSON](https://coss.com/ui/r/p-frame-2.json)

### group

- Basic group | [JSON](https://coss.com/ui/r/p-group-1.json)
- Group with input | [JSON](https://coss.com/ui/r/p-group-2.json)
- Small group | [JSON](https://coss.com/ui/r/p-group-3.json)
- Large group | [JSON](https://coss.com/ui/r/p-group-4.json)
- Group with disabled button | [JSON](https://coss.com/ui/r/p-group-5.json)
- Group with default button | [JSON](https://coss.com/ui/r/p-group-6.json)
- Group with start text | [JSON](https://coss.com/ui/r/p-group-7.json)
- Group with end text | [JSON](https://coss.com/ui/r/p-group-8.json)
- Vertical group | [JSON](https://coss.com/ui/r/p-group-9.json)
- Nested groups | [JSON](https://coss.com/ui/r/p-group-10.json)
- Group with popup | [JSON](https://coss.com/ui/r/p-group-11.json)
- Group with input group | [JSON](https://coss.com/ui/r/p-group-12.json)
- Group with menu | [JSON](https://coss.com/ui/r/p-group-13.json)
- Group with select | [JSON](https://coss.com/ui/r/p-group-14.json)
- Group with search | [JSON](https://coss.com/ui/r/p-group-15.json)
- Group with add button and input | [JSON](https://coss.com/ui/r/p-group-16.json)
- Group with input and currency text | [JSON](https://coss.com/ui/r/p-group-17.json)
- Group with select and input | [JSON](https://coss.com/ui/r/p-group-18.json)
- Group with input and select | [JSON](https://coss.com/ui/r/p-group-19.json)
- Group with input and text button | [JSON](https://coss.com/ui/r/p-group-20.json)
- Group with two number inputs for range | [JSON](https://coss.com/ui/r/p-group-22.json)
- Group with filter label, combobox multi-select, and remove button | [JSON](https://coss.com/ui/r/p-group-23.json)

### input

- Basic input | [JSON](https://coss.com/ui/r/p-input-1.json)
- Small input | [JSON](https://coss.com/ui/r/p-input-2.json)
- Large input | [JSON](https://coss.com/ui/r/p-input-3.json)
- Disabled input | [JSON](https://coss.com/ui/r/p-input-4.json)
- File input | [JSON](https://coss.com/ui/r/p-input-5.json)
- Input with label | [JSON](https://coss.com/ui/r/p-input-6.json)
- Input with button using Group | [JSON](https://coss.com/ui/r/p-input-7.json)
- Input with start text and end tooltip | [JSON](https://coss.com/ui/r/p-input-8.json)
- Password input with toggle visibility | [JSON](https://coss.com/ui/r/p-input-9.json)
- Input group mimicking a URL bar | [JSON](https://coss.com/ui/r/p-input-10.json)
- Input group with keyboard shortcut | [JSON](https://coss.com/ui/r/p-input-11.json)
- Input group with start loading spinner | [JSON](https://coss.com/ui/r/p-input-12.json)
- Input with label and required indicator | [JSON](https://coss.com/ui/r/p-input-13.json)
- Input with optional label | [JSON](https://coss.com/ui/r/p-input-14.json)
- Input with custom border and background | [JSON](https://coss.com/ui/r/p-input-15.json)
- Input group with end loading spinner | [JSON](https://coss.com/ui/r/p-input-16.json)
- Read-only input | [JSON](https://coss.com/ui/r/p-input-17.json)
- Input with characters remaining counter | [JSON](https://coss.com/ui/r/p-input-18.json)
- Pill-shaped input | [JSON](https://coss.com/ui/r/p-input-19.json)

### input-group

- Basic input group | [JSON](https://coss.com/ui/r/p-input-group-1.json)
- Input group with end icon | [JSON](https://coss.com/ui/r/p-input-group-2.json)
- Input group with start text | [JSON](https://coss.com/ui/r/p-input-group-3.json)
- Input group with end text | [JSON](https://coss.com/ui/r/p-input-group-4.json)
- Input group with start and end text | [JSON](https://coss.com/ui/r/p-input-group-5.json)
- Input group with number field | [JSON](https://coss.com/ui/r/p-input-group-6.json)
- Input group with end tooltip | [JSON](https://coss.com/ui/r/p-input-group-7.json)
- Input group with icon button | [JSON](https://coss.com/ui/r/p-input-group-8.json)
- Input group with button | [JSON](https://coss.com/ui/r/p-input-group-9.json)
- Input group with badge | [JSON](https://coss.com/ui/r/p-input-group-10.json)
- Input group with keyboard shortcut | [JSON](https://coss.com/ui/r/p-input-group-11.json)
- Input group with inner label | [JSON](https://coss.com/ui/r/p-input-group-12.json)
- Small input group | [JSON](https://coss.com/ui/r/p-input-group-13.json)
- Large input group | [JSON](https://coss.com/ui/r/p-input-group-14.json)
- Disabled input group | [JSON](https://coss.com/ui/r/p-input-group-15.json)
- Input group with loading spinner | [JSON](https://coss.com/ui/r/p-input-group-16.json)
- Input group with textarea | [JSON](https://coss.com/ui/r/p-input-group-17.json)
- Input group with badge and menu | [JSON](https://coss.com/ui/r/p-input-group-18.json)
- Mini editor built with input group and toggle | [JSON](https://coss.com/ui/r/p-input-group-19.json)
- Input group with search icon | [JSON](https://coss.com/ui/r/p-input-group-20.json)
- Input group with start tooltip | [JSON](https://coss.com/ui/r/p-input-group-21.json)
- Input group with clear button | [JSON](https://coss.com/ui/r/p-input-group-22.json)
- Search input group with loader and voice button | [JSON](https://coss.com/ui/r/p-input-group-23.json)
- Input group with character counter | [JSON](https://coss.com/ui/r/p-input-group-24.json)
- Password input with strength indicator | [JSON](https://coss.com/ui/r/p-input-group-26.json)
- Code snippet input with language selector | [JSON](https://coss.com/ui/r/p-input-group-27.json)
- Message composer with attachment buttons | [JSON](https://coss.com/ui/r/p-input-group-28.json)
- Chat input with voice and send buttons | [JSON](https://coss.com/ui/r/p-input-group-29.json)

### input-otp

- Basic OTP input | [JSON](https://coss.com/ui/r/p-input-otp-1.json)
- Large OTP input | [JSON](https://coss.com/ui/r/p-input-otp-2.json)
- OTP input with separator | [JSON](https://coss.com/ui/r/p-input-otp-3.json)
- OTP input with label | [JSON](https://coss.com/ui/r/p-input-otp-4.json)
- Digits-only OTP input | [JSON](https://coss.com/ui/r/p-input-otp-5.json)
- Invalid OTP input | [JSON](https://coss.com/ui/r/p-input-otp-6.json)
- OTP input with auto validation | [JSON](https://coss.com/ui/r/p-input-otp-7.json)

### kbd

- Keyboard shortcuts display | [JSON](https://coss.com/ui/r/p-kbd-1.json)

### menu

- Basic menu | [JSON](https://coss.com/ui/r/p-menu-1.json)
- Menu with hover | [JSON](https://coss.com/ui/r/p-menu-2.json)
- Menu with checkbox | [JSON](https://coss.com/ui/r/p-menu-3.json)
- Menu with checkbox items as switches | [JSON](https://coss.com/ui/r/p-menu-9.json)
- Menu with radio group | [JSON](https://coss.com/ui/r/p-menu-4.json)
- Menu with link | [JSON](https://coss.com/ui/r/p-menu-5.json)
- Menu with group labels | [JSON](https://coss.com/ui/r/p-menu-6.json)
- Nested menu | [JSON](https://coss.com/ui/r/p-menu-7.json)
- Menu close on click | [JSON](https://coss.com/ui/r/p-menu-8.json)

### meter

- Basic meter | [JSON](https://coss.com/ui/r/p-meter-1.json)
- Simple meter | [JSON](https://coss.com/ui/r/p-meter-2.json)
- Meter with formatted value | [JSON](https://coss.com/ui/r/p-meter-3.json)
- Meter with range | [JSON](https://coss.com/ui/r/p-meter-4.json)

### number-field

- Basic number field | [JSON](https://coss.com/ui/r/p-number-field-1.json)
- Small number field | [JSON](https://coss.com/ui/r/p-number-field-2.json)
- Large number field | [JSON](https://coss.com/ui/r/p-number-field-3.json)
- Disabled number field | [JSON](https://coss.com/ui/r/p-number-field-4.json)
- Number field with label | [JSON](https://coss.com/ui/r/p-number-field-5.json)
- Number field with scrub | [JSON](https://coss.com/ui/r/p-number-field-6.json)
- Number field with range | [JSON](https://coss.com/ui/r/p-number-field-7.json)
- Number field with formatted value | [JSON](https://coss.com/ui/r/p-number-field-8.json)
- Number field with step | [JSON](https://coss.com/ui/r/p-number-field-9.json)
- Number field in form | [JSON](https://coss.com/ui/r/p-number-field-10.json)
- Pill-shaped number field | [JSON](https://coss.com/ui/r/p-number-field-11.json)

### pagination

- Pagination example | [JSON](https://coss.com/ui/r/p-pagination-1.json)
- Pagination with previous and next buttons only | [JSON](https://coss.com/ui/r/p-pagination-2.json)
- Pagination with select, and previous and next buttons | [JSON](https://coss.com/ui/r/p-pagination-3.json)

### popover

- Popover with a form | [JSON](https://coss.com/ui/r/p-popover-1.json)
- Popover with close button | [JSON](https://coss.com/ui/r/p-popover-2.json)
- Animated popovers | [JSON](https://coss.com/ui/r/p-popover-3.json)

### preview-card

- Preview card with popup | [JSON](https://coss.com/ui/r/p-preview-card-1.json)

### progress

- Basic progress bar | [JSON](https://coss.com/ui/r/p-progress-1.json)
- Progress with label and value | [JSON](https://coss.com/ui/r/p-progress-2.json)
- Progress with formatted value | [JSON](https://coss.com/ui/r/p-progress-3.json)

### radio-group

- Basic radio group | [JSON](https://coss.com/ui/r/p-radio-group-1.json)
- Disabled radio group | [JSON](https://coss.com/ui/r/p-radio-group-2.json)
- Radio group with description | [JSON](https://coss.com/ui/r/p-radio-group-3.json)
- Radio group card | [JSON](https://coss.com/ui/r/p-radio-group-4.json)
- Radio group in form | [JSON](https://coss.com/ui/r/p-radio-group-5.json)
- Theme selector with image cards | [JSON](https://coss.com/ui/r/p-radio-group-6.json)

### scroll-area

- Basic scroll area | [JSON](https://coss.com/ui/r/p-scroll-area-1.json)
- Horizontal scroll area | [JSON](https://coss.com/ui/r/p-scroll-area-2.json)
- Scroll area with both directions | [JSON](https://coss.com/ui/r/p-scroll-area-3.json)
- Scroll area with fading edges | [JSON](https://coss.com/ui/r/p-scroll-area-4.json)
- Horizontal scroll area with scrollbar gutter | [JSON](https://coss.com/ui/r/p-scroll-area-5.json)

### select

- Basic select | [JSON](https://coss.com/ui/r/p-select-1.json)
- Small select | [JSON](https://coss.com/ui/r/p-select-2.json)
- Large select | [JSON](https://coss.com/ui/r/p-select-3.json)
- Disabled select | [JSON](https://coss.com/ui/r/p-select-4.json)
- Select without item alignment | [JSON](https://coss.com/ui/r/p-select-5.json)
- Select with groups | [JSON](https://coss.com/ui/r/p-select-6.json)
- Multiple select | [JSON](https://coss.com/ui/r/p-select-7.json)
- Select with icon | [JSON](https://coss.com/ui/r/p-select-8.json)
- Select options with icon | [JSON](https://coss.com/ui/r/p-select-9.json)
- Select with object values | [JSON](https://coss.com/ui/r/p-select-10.json)
- Select with disabled items | [JSON](https://coss.com/ui/r/p-select-12.json)
- Timezone select | [JSON](https://coss.com/ui/r/p-select-13.json)
- Status select with colored dot | [JSON](https://coss.com/ui/r/p-select-14.json)
- Pill-shaped select trigger | [JSON](https://coss.com/ui/r/p-select-15.json)
- Select with left text label | [JSON](https://coss.com/ui/r/p-select-16.json)
- Select with country flags | [JSON](https://coss.com/ui/r/p-select-17.json)
- Select with description in options only | [JSON](https://coss.com/ui/r/p-select-18.json)
- Select with avatars | [JSON](https://coss.com/ui/r/p-select-19.json)
- Rich select with avatars and usernames | [JSON](https://coss.com/ui/r/p-select-20.json)
- Auto width select | [JSON](https://coss.com/ui/r/p-select-21.json)
- Select with custom border and background | [JSON](https://coss.com/ui/r/p-select-22.json)
- Select with label | [JSON](https://coss.com/ui/r/p-select-23.json)
- Select in form | [JSON](https://coss.com/ui/r/p-select-11.json)

### separator

- Separator with horizontal and vertical orientations | [JSON](https://coss.com/ui/r/p-separator-1.json)

### sheet

- Basic sheet | [JSON](https://coss.com/ui/r/p-sheet-1.json)
- Sheet inset | [JSON](https://coss.com/ui/r/p-sheet-2.json)
- Sheet position | [JSON](https://coss.com/ui/r/p-sheet-3.json)

### skeleton

- Basic skeleton | [JSON](https://coss.com/ui/r/p-skeleton-1.json)
- Skeleton only | [JSON](https://coss.com/ui/r/p-skeleton-2.json)

### slider

- Basic slider | [JSON](https://coss.com/ui/r/p-slider-1.json)
- Slider with label and value | [JSON](https://coss.com/ui/r/p-slider-2.json)
- Disabled slider | [JSON](https://coss.com/ui/r/p-slider-3.json)
- Slider with reference labels | [JSON](https://coss.com/ui/r/p-slider-4.json)
- Slider with ticks | [JSON](https://coss.com/ui/r/p-slider-5.json)
- Slider with labels above | [JSON](https://coss.com/ui/r/p-slider-6.json)
- Range slider | [JSON](https://coss.com/ui/r/p-slider-7.json)
- Slider with 3 thumbs | [JSON](https://coss.com/ui/r/p-slider-8.json)
- Range slider with collision behavior none | [JSON](https://coss.com/ui/r/p-slider-9.json)
- Range slider with collision behavior swap | [JSON](https://coss.com/ui/r/p-slider-10.json)
- Slider with icons | [JSON](https://coss.com/ui/r/p-slider-11.json)
- Slider with input | [JSON](https://coss.com/ui/r/p-slider-12.json)
- Range slider with inputs | [JSON](https://coss.com/ui/r/p-slider-13.json)
- Slider with increment and decrement buttons | [JSON](https://coss.com/ui/r/p-slider-14.json)
- Price range slider | [JSON](https://coss.com/ui/r/p-slider-15.json)
- Emoji rating slider | [JSON](https://coss.com/ui/r/p-slider-16.json)
- Vertical slider | [JSON](https://coss.com/ui/r/p-slider-17.json)
- Vertical range slider | [JSON](https://coss.com/ui/r/p-slider-18.json)
- Vertical slider with input | [JSON](https://coss.com/ui/r/p-slider-19.json)
- Equalizer with vertical sliders | [JSON](https://coss.com/ui/r/p-slider-20.json)
- Object position sliders with reset | [JSON](https://coss.com/ui/r/p-slider-21.json)
- Price slider with histogram | [JSON](https://coss.com/ui/r/p-slider-22.json)
- Slider in form | [JSON](https://coss.com/ui/r/p-slider-23.json)

### spinner

- Basic spinner | [JSON](https://coss.com/ui/r/p-spinner-1.json)

### switch

- Basic switch | [JSON](https://coss.com/ui/r/p-switch-1.json)
- Disabled switch | [JSON](https://coss.com/ui/r/p-switch-2.json)
- Switch with description | [JSON](https://coss.com/ui/r/p-switch-3.json)
- Switch card | [JSON](https://coss.com/ui/r/p-switch-4.json)
- Switch in form | [JSON](https://coss.com/ui/r/p-switch-5.json)
- Custom size switch | [JSON](https://coss.com/ui/r/p-switch-6.json)

### table

- Basic table | [JSON](https://coss.com/ui/r/p-table-1.json)
- Framed table | [JSON](https://coss.com/ui/r/p-table-2.json)
- Table with TanStack Table and checkboxes | [JSON](https://coss.com/ui/r/p-table-3.json)
- Table with TanStack Table, sorting, and pagination | [JSON](https://coss.com/ui/r/p-table-4.json)

### tabs

- Basic tabs | [JSON](https://coss.com/ui/r/p-tabs-1.json)
- Tabs with underline | [JSON](https://coss.com/ui/r/p-tabs-2.json)
- Vertical tabs | [JSON](https://coss.com/ui/r/p-tabs-3.json)
- Vertical tabs with underline | [JSON](https://coss.com/ui/r/p-tabs-4.json)
- Tabs with full rounded triggers | [JSON](https://coss.com/ui/r/p-tabs-5.json)
- Tabs with icon before name | [JSON](https://coss.com/ui/r/p-tabs-6.json)
- Tabs with icon before name and underline | [JSON](https://coss.com/ui/r/p-tabs-7.json)
- Tabs with icon only | [JSON](https://coss.com/ui/r/p-tabs-8.json)
- Tabs with underline and icon on top | [JSON](https://coss.com/ui/r/p-tabs-9.json)
- Tabs with count badge | [JSON](https://coss.com/ui/r/p-tabs-10.json)
- Vertical tabs with underline and icon before name | [JSON](https://coss.com/ui/r/p-tabs-11.json)
- Tabs with icon only and count badge | [JSON](https://coss.com/ui/r/p-tabs-12.json)
- Tabs with icon only and grouped tooltips | [JSON](https://coss.com/ui/r/p-tabs-13.json)

### textarea

- Basic textarea | [JSON](https://coss.com/ui/r/p-textarea-1.json)
- Small textarea | [JSON](https://coss.com/ui/r/p-textarea-2.json)
- Large textarea | [JSON](https://coss.com/ui/r/p-textarea-3.json)
- Disabled textarea | [JSON](https://coss.com/ui/r/p-textarea-4.json)
- Textarea with label | [JSON](https://coss.com/ui/r/p-textarea-5.json)
- Textarea in form | [JSON](https://coss.com/ui/r/p-textarea-6.json)
- Textarea with label and required indicator | [JSON](https://coss.com/ui/r/p-textarea-7.json)
- Textarea with optional label | [JSON](https://coss.com/ui/r/p-textarea-8.json)
- Textarea with custom border and background | [JSON](https://coss.com/ui/r/p-textarea-9.json)
- Read-only textarea | [JSON](https://coss.com/ui/r/p-textarea-10.json)
- Textarea with characters remaining counter | [JSON](https://coss.com/ui/r/p-textarea-11.json)
- Textarea field with required indicator | [JSON](https://coss.com/ui/r/p-textarea-12.json)
- Shorter textarea with fixed height | [JSON](https://coss.com/ui/r/p-textarea-13.json)
- Textarea with button aligned right | [JSON](https://coss.com/ui/r/p-textarea-14.json)
- Textarea with button aligned left | [JSON](https://coss.com/ui/r/p-textarea-15.json)

### toast

- Basic toast | [JSON](https://coss.com/ui/r/p-toast-1.json)
- Toast with status | [JSON](https://coss.com/ui/r/p-toast-2.json)
- Loading toast | [JSON](https://coss.com/ui/r/p-toast-3.json)
- Toast with action | [JSON](https://coss.com/ui/r/p-toast-4.json)
- Promise toast | [JSON](https://coss.com/ui/r/p-toast-5.json)
- Toast with varying heights | [JSON](https://coss.com/ui/r/p-toast-6.json)
- Anchored toast with tooltip style | [JSON](https://coss.com/ui/r/p-toast-7.json)
- Anchored toast | [JSON](https://coss.com/ui/r/p-toast-8.json)
- Promise toast with cancel action | [JSON](https://coss.com/ui/r/p-toast-9.json)

### toggle

- Basic toggle | [JSON](https://coss.com/ui/r/p-toggle-1.json)
- Toggle with outline | [JSON](https://coss.com/ui/r/p-toggle-2.json)
- Toggle with icon | [JSON](https://coss.com/ui/r/p-toggle-3.json)
- Small toggle | [JSON](https://coss.com/ui/r/p-toggle-4.json)
- Large toggle | [JSON](https://coss.com/ui/r/p-toggle-5.json)
- Disabled toggle | [JSON](https://coss.com/ui/r/p-toggle-6.json)
- Toggle icon group | [JSON](https://coss.com/ui/r/p-toggle-7.json)
- Bookmark toggle with tooltip and success toast | [JSON](https://coss.com/ui/r/p-toggle-8.json)

### toggle-group

- Basic toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-1.json)
- Small toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-2.json)
- Large toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-3.json)
- Toggle group with outline | [JSON](https://coss.com/ui/r/p-toggle-group-4.json)
- Vertical toggle group with outline | [JSON](https://coss.com/ui/r/p-toggle-group-5.json)
- Disabled toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-6.json)
- Toggle group with disabled item | [JSON](https://coss.com/ui/r/p-toggle-group-7.json)
- Multiple selection toggle group | [JSON](https://coss.com/ui/r/p-toggle-group-8.json)
- Toggle group with tooltips | [JSON](https://coss.com/ui/r/p-toggle-group-9.json)

### toolbar

- Toolbar with toggles, buttons, and select | [JSON](https://coss.com/ui/r/p-toolbar-1.json)

### tooltip

- Basic tooltip | [JSON](https://coss.com/ui/r/p-tooltip-1.json)
- Grouped tooltips | [JSON](https://coss.com/ui/r/p-tooltip-2.json)
- Toggle group animated tooltip | [JSON](https://coss.com/ui/r/p-tooltip-3.json)
- Vertical group with animated tooltip | [JSON](https://coss.com/ui/r/p-tooltip-4.json)
