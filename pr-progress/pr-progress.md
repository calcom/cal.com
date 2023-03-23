# PR Progress Updates
It summarizes whatever things I observe while working on a PR. These can be unrelated bugs, related bugs, pending tasks.
Life of this file is till PR Review after which either these comments are moved to PR Description if they are related to the PR or they are filed as bugs/features if unrelated to PR.

## Bugs Seen during testing
- [ ] [Important] rescheduleReason isn't shown on booking/[uid]. It used to be shown earlier, I clearly remember. Important because apart from email, organizer won't be able to see the reason for reschedule.
- [ ] Reschedule still showing Reason for cancellation in email ![](2023-03-23-16-18-47.png)
- [ ] In Calendar, on reschedule (atleast maybe on fresh booking as well) both description and additional notes are shown which are same as additional Notes. I don't see Event Description. It works correctly in Email. ![](2023-03-23-16-21-41.png)
- [ ] Reschedule not cancelling previous booking ![](2023-03-23-17-02-23.png)
- [ ] Location Link Value still shown for Paid Event event(on payment/[uid] page) if 'Display on booking page' is not checked ![](2023-03-23-17-55-10.png)


## Tests
- Verify User Responses shown
  - [x] Fresh Booking
    - [x] Email
    - [x] Calendar
    - [x] Webhook
  - [x] Reschedule
    - [x] Email
    - [x] Calendar
    - [ ] Webhook
  - [x] Request Reschedule
    - [x] Email -> Looks like Request Reschedule never sent customInputs in email as it's not there. So, new user responses are also not there
    - [x] Calendar -> It's a cancellation so no Calendar invitation is left
    - [x] Webhook
  - [ ] Cancellation
    - [x] Email 
    - [x] Calendar -> It's a cancellation so no Calendar invitation is left
    - [x] Webhook
  - [ ] Paid Event Fresh Booking
    - [ ] Email
    - [ ] Calendar
    - [ ] Webhook

## TODOS
- [ ] API Changes for Booking Questions - Assign the Issue to myself  
- [ ] Test how responses template variable work in workflow reminders.
- [ ] Make cancellationReason from Request Reschedule(which actually cancels the booking) part of responses