# coss Autocomplete

## When to use

- Search-driven suggestion pickers with free typing.
- Assisted text entry over a known option space with keyboard navigation.

## When NOT to use

- If options are predefined and don't need search -> use Select instead.
- If the user must pick from a strict set (no free text) -> use Combobox instead.
- If you need action commands, not data selection -> use Command instead.

## Install

```bash
npx shadcn@latest add @coss/autocomplete
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Autocomplete,
  AutocompleteCollection,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteSeparator,
  AutocompleteStatus,
  useAutocompleteFilter,
} from "@/components/ui/autocomplete"
```

## Minimal pattern

```tsx
const items = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
]

<Autocomplete items={items}>
  <AutocompleteInput aria-label="Search items" placeholder="Search items…" />
  <AutocompletePopup>
    <AutocompleteEmpty>No items found.</AutocompleteEmpty>
    <AutocompleteList>
      {(item) => (
        <AutocompleteItem key={item.value} value={item}>
          {item.label}
        </AutocompleteItem>
      )}
    </AutocompleteList>
  </AutocompletePopup>
</Autocomplete>
```

For form-bound autocomplete controls, prefer `Field` wrappers so label, required state, and error output remain tied to the same control.

## Patterns from coss particles

### Key patterns

Autocomplete with input affordances:

```tsx
<Autocomplete items={items}>
  <AutocompleteInput
    aria-label="Search frameworks"
    placeholder="Search..."
    showClear
    showTrigger
    startAddon={<SearchIcon aria-hidden="true" />}
  />
  <AutocompletePopup>
    <AutocompleteEmpty>No results found.</AutocompleteEmpty>
    <AutocompleteList>
      {(item) => <AutocompleteItem key={item.value} value={item}>{item.label}</AutocompleteItem>}
    </AutocompleteList>
  </AutocompletePopup>
</Autocomplete>
```

Grouped lists:

```tsx
<AutocompleteList>
  <AutocompleteGroup>
    <AutocompleteGroupLabel>Fruits</AutocompleteGroupLabel>
    <AutocompleteCollection>
      {(item) => <AutocompleteItem key={item.value} value={item}>{item.label}</AutocompleteItem>}
    </AutocompleteCollection>
  </AutocompleteGroup>
</AutocompleteList>
```

Async search: use `filter={null}`, control `value`/`onValueChange`, and provide `itemToStringValue` for object results.

Form integration: place `Autocomplete` inside `Field name="..."` with `FieldLabel`/`FieldError`.

### More examples

See `p-autocomplete-1` through `p-autocomplete-15` for sizes, matching behavior, groups, limited results, async, form integration, and pill input patterns.

## Common pitfalls

- Omitting `AutocompleteEmpty`, leaving blank popups with no user feedback.
- Using object items in async/custom flows without `itemToStringValue`, which breaks stable string mapping.
- Mixing combobox/select assumptions into autocomplete APIs without checking docs.
- Missing explicit labels (`FieldLabel` or `aria-label`) on the input.
- Not handling async race/error states (`loading`, `error`, stale response cancellation).

## Useful particle references

- baseline + size + disabled: `p-autocomplete-1`, `p-autocomplete-2`, `p-autocomplete-3`, `p-autocomplete-4`
- label + input affordances (`showClear`, `showTrigger`, `startAddon`): `p-autocomplete-5`, `p-autocomplete-8`, `p-autocomplete-9`, `p-autocomplete-14`
- matching behavior (`mode="both"`, `autoHighlight`): `p-autocomplete-6`, `p-autocomplete-7`
- grouped options: `p-autocomplete-10`
- limited results with status message: `p-autocomplete-11`
- async search with loading/error status: `p-autocomplete-12`
- form integration: `p-autocomplete-13`
- style variant (pill input): `p-autocomplete-15`
