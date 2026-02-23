## What does this PR do?

- Fixes #28067 

This PR resolves an issue with API v2 documentation where:
1. `bookingLimitsCount.disabled` was incorrectly shown even though it is implicitly set to false when additional values are provided.
2. `lengthInMinutesOptions` was showing up as `string[]` instead of `number[]` in the docs.

**Solution:**
- Added `@ApiHideProperty()` to `disabled` in `BaseBookingLimitsCount_2024_06_14`.
- Explicitly set `type: [Number]` in the `@DocsPropertyOptional()` for `lengthInMinutesOptions` in `create-event-type.input.ts` and `update-event-type.input.ts`.

## Visual Demo 
As this is a backend API schema documentation change, no visual UI demo is applicable. 

<img width="1919" height="946" alt="Screenshot 2026-02-21 154125" src="https://github.com/user-attachments/assets/d1b53530-932e-48c6-b3e2-5182a35a3417" />

## Mandatory Tasks (DO NOT REMOVE)

- [x] I have self-reviewed the code (A decent size PR without self-review might be rejected).
- [x] I have updated the developer docs in /docs if this PR makes changes that would require a documentation change. If N/A, write N/A here and check the checkbox.
- [x] I confirm automated tests are in place that prove my fix is effective or that my feature works.

## How should this be tested?

1. Generate the swagger docs by running `yarn workspace @calcom/api-v2 generate-swagger` (pending successful environment setup).
2. Observe the generated `openapi.json`.
3. Verify that `lengthInMinutesOptions` in `CreateEventTypeInput_2024_06_14` and `UpdateEventTypeInput_2024_06_14` shows `"type": "array", "items": { "type": "number" }`.
4. Verify that `bookingLimitsCount` schema no longer has the `disabled` property.

## Checklist

- [x] I have read the [contributing guide](https://github.com/calcom/cal.com/blob/main/CONTRIBUTING.md)
- [x] My code follows the style guidelines of this project
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] I have checked if my changes generate no new warnings
- [x] My PR is not too large (>500 lines or >10 files) and does not need to be split into smaller PRs
