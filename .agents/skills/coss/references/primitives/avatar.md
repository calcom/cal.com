# coss Avatar

## When to use

- Identity visuals for users/teams in compact spaces.
- Image + fallback initials patterns in cards, lists, and menus.

## Install

```bash
npx shadcn@latest add @coss/avatar
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
```

## Minimal pattern

```tsx
<Avatar>
  <AvatarImage src="/avatars/01.png" alt="User avatar" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

## Patterns from coss particles

### Key patterns

Custom size via Tailwind class:

```tsx
<Avatar className="size-16">
  <AvatarImage src="/avatar.png" alt="User avatar" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

Stacked avatar group:

```tsx
<div className="flex -space-x-3">
  <Avatar className="ring-2 ring-background">
    <AvatarImage src="/user-1.png" alt="User 1" />
    <AvatarFallback>U1</AvatarFallback>
  </Avatar>
  <Avatar className="ring-2 ring-background">
    <AvatarImage src="/user-2.png" alt="User 2" />
    <AvatarFallback>U2</AvatarFallback>
  </Avatar>
</div>
```

### More examples

See `p-avatar-1` through `p-avatar-5` for sizes, radii, fallback-only, and group patterns.

## Common pitfalls

- Omitting `AvatarFallback`, causing broken image states with no identity fallback.
- Using non-descriptive `alt` text on `AvatarImage` in accessible contexts.
- Relying on oversized custom wrappers instead of built-in size variants/classes.

## Useful particle references

- fallback only: `p-avatar-2`
- different sizes: `p-avatar-3`
- different radius: `p-avatar-4`
- group avatars: `p-avatar-5`
