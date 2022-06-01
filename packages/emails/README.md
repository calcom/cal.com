# JSX email templates

- `components` Holds reusable patterns
- `templates` A template equals a type of email sent

## Usage

```ts
import { renderEmail } from "@calcom/emails";

renderEmail("TeamInviteEmail", */{
  language: t,
  from: "teampro@example.com",
  to: "pro@example.com",
  teamName: "Team Pro",
  joinLink: "https://cal.com",
});
```

The first argument is the template name as defined inside `templates/index.ts`. The second argument are the template props.
