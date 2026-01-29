# Workflow Translation

## Overview

Auto-translate workflow notifications to the attendee's browser language using lingo.dev.

## How to Use

### Step 1: Enable Auto-translate

When editing a workflow step (EMAIL_ATTENDEE, SMS_ATTENDEE, or WHATSAPP_ATTENDEE), toggle "Auto-translate for attendees".

### Step 2: Translations Generated

Translations to 19 languages are generated automatically when you save the workflow.

### Step 3: Attendees Receive Translated Notifications

When a booking is made, the attendee receives notifications in their browser language (if supported).

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| Auto-translate for attendees | Enable/disable translation | Off |

## FAQ

### Which languages are supported?

English, Spanish, German, Portuguese, French, Italian, Arabic, Russian, Chinese (Simplified & Traditional), Japanese, Korean, Dutch, Swedish, Danish, Icelandic, Lithuanian, Norwegian.

### What happens if attendee's language isn't supported?

They receive the original notification in the language it was written.

### Are template variables translated?

No, variables like {EVENT_NAME} are preserved and substituted after translation.
