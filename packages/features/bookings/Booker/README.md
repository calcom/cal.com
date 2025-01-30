## Strategies to prevent error during booking
- The `getSchedule` call, fetches only those slots that are bookable including not showing the slots that are reserved by someone else.
    - The booking call and the get scheduled call share the same availability checking logic to avoid scenario where `getSchedule` considers a slot as available but Booking call doesn't consider it available.
- Even though a slot might be available, multiple people might have opened the same booking page and might want to book the same slot.
  - We have a reservation system in place that avoid showing a slot that is reserved by someone to other people.
  - The `getSchedule` call itself considers the reservations and doesn't show those slots.
  - When two persons open the same booking page at the same time, they might will see the same slots.
    - If Person1 selects slot1, it will be reserved by Person1. Person2 still sees the slot(because we don't refetch `getSchedule` on regular intervals). But when Person2 selects the same slot1, he will go to "Slot no-longer available" state.
- We don't check for reservation during the confirm booking call, because a reservation has lower priority then the actual booking.



### "Slot no-longer available" state
- When a slot is no longer available, we disable the "Confirm" button which does the booking.
- We show a message to the user that he should select a different slot.
- To ensure that we can go to this state, whenever applicable, we do the following:
    - `getSchedule` fetching. It prevents the unavailable slot to not appear in the list.
      - Fetched on window focus to handle the users who have the page opened for some time then come back to it
      - Fetched every 5 mins(configurable by .env) as well to handle users who are just there on the page for a long time.
    - `isReservation` query. It prevents the unavailable slot to be not bookable by the User
      - Fetched on regular quick intervals(currently every 10s(configurable by .env)). 

