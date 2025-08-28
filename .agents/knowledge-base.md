# Knowledge Base - Product & Domain-Specific Information

## Booking Flows

### Event Types vs Event Type Groups

- **Event Types**: Individual bookable services (e.g., "30-min meeting", "Product demo")
- **Event Type Groups**: Collections of related event types shown together on booking page
- Users can create groups to organize multiple services under one booking link
- Groups are useful for offering different durations/formats of the same service

### Booking Confirmation Flow

- **Instant booking**: Automatically confirmed, no host approval needed
- **Requires confirmation**: Host must manually approve before booking is confirmed
- **Opt-in confirmation**: Users can choose whether to require confirmation per event type
- Status progression: `PENDING` → `ACCEPTED`/`REJECTED` → `CANCELLED` (if needed)
- Email notifications sent at each status change

## Organizations & Teams

### Organization Structure

- **Organizations**: Top-level entities that can contain multiple teams
- **Teams**: Groups of users within an organization, can have shared event types
- **Personal accounts**: Individual users not part of any organization
- Migration path: Personal → Team → Organization (each level adds features)

### Team Event Types

- Can be assigned to multiple team members (round-robin or collective scheduling)
- **Round-robin**: Distributes bookings evenly among available team members
- **Collective**: All assigned members must be available for the booking slot
- Team members can have different availability within the same event type

## Integrations & Apps

### Calendar Integrations

- **Primary calendar**: Where new events are created (Google, Outlook, Apple, etc.)
- **Additional calendars**: Checked for conflicts but events not created there
- **Destination calendar**: Can override primary calendar per event type
- Conflict checking happens across all connected calendars regardless of where event is created

### Payment Integrations

- **Stripe**: Main payment processor, supports one-time and subscription payments
- **Payment apps**: Additional processors like PayPal, can be enabled per event type
- **Payment required**: Events can require payment before booking confirmation
- Refund handling varies by processor and must be configured per integration
