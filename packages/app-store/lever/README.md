# Lever Integration for Cal.com

This integration connects Cal.com with Lever ATS through the Merge.dev unified API, enabling automatic candidate creation and activity logging when bookings are made.

## Features

- Automatically create or find candidates in Lever based on booking attendee email
- Log booking activities (interviews, meetings) to the candidate's profile

## Installation

1. Sign up for a [Merge.dev](https://merge.dev) account
2. Connect your Lever account to Merge.dev
3. Obtain your Merge.dev API key and account token
4. Configure the integration in Cal.com admin settings at `<baseUrl>/settings/admin/apps/lever`

## Configuration

Add the following environment variables or configure through the Cal.com admin panel:

- `MERGE_API_KEY`: Your Merge.dev production API key

## Usage

Once installed and configured, the integration will automatically:

1. When a booking is created: Create a candidate (if not exists) and log an activity

Note: The Merge.dev ATS API does not currently support updating or deleting activities.

## API Documentation

- [Merge.dev ATS API](https://docs.merge.dev/ats/)
- [Lever Integration](https://docs.merge.dev/integrations/ats/lever/)
