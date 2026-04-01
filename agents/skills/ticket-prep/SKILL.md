---
name: ticket-prep
description: >
  Prepare a Linear ticket into a full implementation spec. This skill only
  plans — it does NOT create branches, write code, or open PRs.

  Trigger phrases (any of these should activate this skill):
    - "prep <ID>"
    - "prep ticket <ID>"
    - "ticket prep <ID>"
    - "prepare <ID>"
    - "prepare spec for <ID>"
    - "plan <ID>"
    - "plan ticket <ID>"
    - "spec <ID>"
    - "spec out <ID>"
    - "write spec for <ID>"

  Takes a Linear ticket ID (e.g. ENG-123) as input and produces a structured
  implementation spec by reading the ticket, gathering codebase context, and
  updating the ticket description.
---

# Ticket Prep

Prepare a Linear ticket into a full implementation spec.

> **Important:** This skill is for *planning only*. Do **not** create branches,
> write code, or open pull requests. The output is an updated ticket description
> on Linear.

## Input

$ARGUMENTS — a Linear ticket ID (e.g. `ENG-123`).

## Steps

### 1. Read the ticket, comments, and sub-tickets

- Fetch the ticket title, description, and attachments from Linear.
- If the description or comments contain images (screenshots, diagrams, etc.),
  use the `extract_images` Linear tool to view them — they often contain
  critical context about the desired behavior.
- Read existing comments on the ticket (these may contain answers to previously asked questions).
- Check for sub-tickets and read each one to gather additional context.
  Summarize any relevant details from sub-tickets when writing the spec.
- Do **not** create or modify sub-tickets.

### 2. Evaluate completeness

Determine whether the ticket (description + comments combined) provides enough information to write a spec. A complete ticket should answer:

- **What**: What specifically needs to change?
- **Why**: Why is this needed? What problem does it solve?
- **Where**: Which area of the product / codebase is affected?

If any of these are unclear or ambiguous, go to **Step 3a**. Otherwise, go to **Step 3b**.

### 3a. If unclear — Ask questions in Slack

- Formulate specific, actionable clarifying questions (not vague).
- Post them in the current Slack thread and wait for the user to respond.
- **Stop here.** Do not proceed further until the user responds.
- Once the user responds, re-evaluate from Step 2.

### 3b. If clear enough — Gather codebase context

- Explore the `calcom/cal` repo to understand the current implementation relevant to the ticket.
- Identify affected files, current behavior, and existing patterns.
- Read relevant source files to understand the before state.

### 4. Write the spec and update the ticket

Update the Linear ticket description with the spec.

The spec should include a "Before / After" section so readers can quickly understand what changed compared to the original ticket. Preserve the original description verbatim in a blockquote for reference.

Use this format for the spec:

```markdown
## Original Description

> <Paste the original ticket description here verbatim, as a blockquote>

---

## Summary
<What this ticket is about - 2-3 sentences>

## Motivation
<Why this change is needed>

## Current Behavior
<How it works today, with relevant file paths>

## Desired Behavior
<How it should work after implementation>

## Affected Files
<List the key files/modules that will need changes, with brief notes on what changes in each>

## Implementation Plan
<Step-by-step approach, referencing specific files/modules in the codebase>

## Testing
<How to verify the change - unit tests, manual testing steps, edge cases>
Include navigation steps or URLs to reach each affected page in the app
(e.g. "Go to Settings > Developer > OAuth clients" or "http://localhost:3000/settings/developer/oauth-clients").
The app is large and pages are not always easy to find, so explicit paths help testers.
```

### 5. Attach the Slack thread and notify

- Add the current Slack thread URL as a link attachment on the Linear ticket.
- Notify the user in the Slack thread that the ticket description has been updated, including a link to the Linear ticket.
