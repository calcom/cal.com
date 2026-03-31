# Feedback & Notifications Migration

## showToast to toastManager.add

The imperative toast API changes from a positional function to a named-parameter object.

### Before

```tsx
import { showToast } from "@calcom/ui";

showToast(t("settings_updated"), "success");
showToast(t("error_occurred"), "error");
showToast(t("copied_to_clipboard"), "success");
```

### After

```tsx
import { toastManager } from "@coss/ui/components/toast";

toastManager.add({ title: t("settings_updated"), type: "success" });
toastManager.add({ title: t("error_occurred"), type: "error" });
toastManager.add({ title: t("copied_to_clipboard"), type: "success" });
```

Key migration difference: `showToast(message, type)` → `toastManager.add({ title, type })`.

For toast composition API (anchored toasts, provider setup), consult the `coss` skill at `primitives/toast.md`.

## Alert

The `Alert` component changes from props-based to composition-based.

```tsx
// Before
<Alert severity="warning" title={t("warning_title")} message={t("warning_desc")} />

// After
<Alert variant="warning">
  <TriangleAlertIcon className="size-4" aria-hidden="true" />
  <AlertTitle>{t("warning_title")}</AlertTitle>
  <AlertDescription>{t("warning_desc")}</AlertDescription>
</Alert>
```

Variant mapping: `severity="warning"` → `variant="warning"`, `"error"` → `"destructive"`, `"neutral"` → `"default"`.

For Alert composition API, consult the `coss` skill at `primitives/alert.md`.

## Badge

Variant mapping:
| Old variant | New variant |
|---|---|
| `"green"` | `"success"` |
| `"gray"` | `"secondary"` |
| `"blue"` | `"info"` |
| `"red"` | `"destructive"` |

## Tooltip

Changes from single-component to composition.

```tsx
// Before
<Tooltip content={t("tooltip_text")}><span>{t("label")}</span></Tooltip>

// After
<Tooltip>
  <TooltipTrigger><span>{t("label")}</span></TooltipTrigger>
  <TooltipPopup>{t("tooltip_text")}</TooltipPopup>
</Tooltip>
```

For Tooltip composition API (grouped tooltips, provider), consult the `coss` skill at `primitives/tooltip.md`.
