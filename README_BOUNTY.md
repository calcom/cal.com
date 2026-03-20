# Bounty #18987: Add "Booking Questions" directly into Routing Forms

This bounty implements the ability to map Routing Form fields directly to Booking Form fields. When a user is redirected from a Routing Form to a Booking Page, the mapped fields will be pre-filled automatically.

## Changes

### 1. Schema Extension
- Modified `packages/features/routing-forms/lib/zod.ts` to add `mappedBookingField: z.string().optional()` to the `zodNonRouterField` schema. This allows storing the target booking field name for each routing form question.

### 2. UI Update (Form Builder)
- Updated `apps/web/app/(use-page-wrapper)/apps/routing-forms/[...pages]/FormEdit.tsx` to include a new "Map to Booking Field" input for each question in the Routing Form builder.
- Users can now specify the identifier of the booking field they want to pre-fill (e.g., `name`, `email`, `location`, or any custom field identifier).

### 3. Submission Logic (Pre-filling)
- Updated `packages/features/routing-forms/lib/getUrlSearchParamsToForward.ts` to handle the mapping during redirection.
- When generating the redirect URL to the booking page, the logic now checks if a `mappedBookingField` is defined for a routing form field.
- If defined, the routing form response value is appended to the URL search parameters using the `mappedBookingField` as the key.
- This ensures that Cal.com's booking page can pick up these parameters and pre-fill the corresponding fields.

## How to Test

1. **Create a Routing Form:**
   - Go to Routing Forms and create a new form.
   - Add a "Text" question with the label "Your Name".
   - In the "Map to Booking Field" input, enter `name`.
   - Add another "Email" question and map it to `email`.
   - Add a "Text" question for "Reason for meeting" and map it to `notes`.

2. **Set up Routing:**
   - Set up a route that redirects to an existing Event Type.

3. **Submit the Form:**
   - Open the public Routing Form link.
   - Fill in the values (e.g., Name: "John Doe", Email: "john@example.com", Reason: "Project Discussion").
   - Submit the form.

4. **Verify Pre-filling:**
   - You should be redirected to the Booking Page.
   - Verify that the "Name", "Email", and "Additional Notes" (if mapped to `notes`) fields on the booking page are pre-filled with the values you entered in the Routing Form.

## Technical Details
- The implementation leverages existing `URLSearchParams` forwarding logic in `getUrlSearchParamsToForward`.
- It supports all field types, including selects and multi-selects (where labels are forwarded).
- By adding this to `getUrlSearchParamsToForward`, it automatically works for both standard redirects and embed scenarios.
