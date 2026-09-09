# Cal.com — public booking page shows available times

A Kane CLI natural-language end-to-end test that opens a public Cal.com booking
page, selects an available date, and verifies bookable time slots appear. It does
not confirm a booking. Runs in a real browser (Kane CLI also automates mobile apps
on the iOS Simulator and Android Emulator).

## Open a booking page and verify time slots
Go to https://cal.com/peer.
Wait for the booking calendar to load.
Click an available (selectable, not disabled) date.
Wait for the available time slots to appear.
Assert that one or more bookable time slots are displayed.
Do not confirm or complete any booking.
