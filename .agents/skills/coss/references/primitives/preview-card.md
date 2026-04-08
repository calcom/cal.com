# coss Preview Card

## When to use

- Hover/focus-triggered rich preview content.
- Contextual details for users/entities without full navigation.

## Install

```bash
npx shadcn@latest add @coss/preview-card
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Button } from "@/components/ui/button"
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger,
} from "@/components/ui/preview-card"
```

## Minimal pattern

```tsx
<PreviewCard>
  <PreviewCardTrigger>Open Preview Card</PreviewCardTrigger>
  <PreviewCardPopup>Preview Card Content</PreviewCardPopup>
</PreviewCard>
```

## Patterns from coss particles

### Key patterns

Preview card with rich content:

```tsx
<PreviewCard>
  <PreviewCardTrigger render={<a href="/user/johndoe" />}>
    @johndoe
  </PreviewCardTrigger>
  <PreviewCardPopup className="w-80">
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src="/avatar.png" alt="John Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-semibold">John Doe</p>
        <p className="text-muted-foreground text-xs">Software Engineer</p>
      </div>
    </div>
  </PreviewCardPopup>
</PreviewCard>
```

### More examples

See `p-preview-card-1` for the core pattern.

## Common pitfalls

- Using preview card for critical workflows requiring explicit modal interaction.
- Missing accessible trigger labels when using icon-only triggers.
- Rendering heavy async content on every hover without throttling/caching strategy.

## Useful particle references

- core patterns: `p-preview-card-1`
