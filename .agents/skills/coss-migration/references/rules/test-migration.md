# Test Migration

## Unit Test Updates

When migrating a page component, update its corresponding test file. The main changes are mock paths and component selectors.

### Mock Path Updates

```tsx
// Before
vi.mock("@calcom/ui", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  TextField: (props: any) => <input {...props} />,
  showToast: vi.fn(),
}));

// After
vi.mock("@coss/ui/components/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock("@coss/ui/components/toast", () => ({
  toastManager: { add: vi.fn() },
}));
```

Each coss component is imported from its own module path, so mocks must target individual module paths instead of the single `@calcom/ui` barrel export.

### Selector Updates

Data attributes change from `data-state` to boolean attributes:

```tsx
// Before
expect(element).toHaveAttribute("data-state", "checked");

// After
expect(element).toHaveAttribute("data-checked");
```

### Toast Assertions

```tsx
// Before
expect(showToast).toHaveBeenCalledWith("Success message", "success");

// After
expect(toastManager.add).toHaveBeenCalledWith({
  title: "Success message",
  type: "success",
});
```

## E2E Test Updates

### Locator Changes

When components change their DOM structure, update E2E locators:

```tsx
// Before - selecting by @calcom/ui internal structure
page.locator('[data-testid="settings-toggle"] input[type="checkbox"]');

// After - selecting by coss Switch structure
page.locator('[data-testid="settings-toggle"] button[role="switch"]');
```

### Dialog Selectors

```tsx
// Before
page.locator('[role="dialog"] [data-testid="dialog-content"]');

// After
page.locator('[role="dialog"]'); // DialogPopup renders role="dialog"
```

### Form Field Selectors

Since `TextField` decomposes into `Field` + `Input`, data-testid attributes may need to move:

```tsx
// Before - data-testid on TextField wrapper
page.locator('[data-testid="name-field"] input');

// After - data-testid on Field or directly on Input
page.locator('[data-testid="name-field"] input');
// or
page.locator('input[data-testid="name-input"]');
```

Preserve existing `data-testid` values wherever possible to minimize E2E test breakage.

## Shared Component Mocks

New shared components need new mock entries:

```tsx
vi.mock("@coss/ui/shared/app-header", () => ({
  AppHeader: ({ children }: any) => <div>{children}</div>,
  AppHeaderContent: ({ children }: any) => <div>{children}</div>,
  AppHeaderDescription: ({ children }: any) => <p>{children}</p>,
  AppHeaderActions: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@coss/ui/shared/settings-toggle", () => ({
  SettingsToggle: (props: any) => (
    <div data-testid="settings-toggle">
      <input type="checkbox" checked={props.checked} onChange={() => props.onCheckedChange?.(!props.checked)} />
    </div>
  ),
}));
```

## What to Preserve

- All test logic, assertions about business behavior, and tRPC mutation calls remain unchanged.
- Only update: import paths, mock definitions, component selectors, data attribute checks, and toast assertion shapes.
- Do not rewrite tests from scratch. Make targeted updates to match the new component structure.
