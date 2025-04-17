# Router and Preloading of redirected booking
- In cal-modal-box, we identify if router URL is provided(calLink starts with /router and can have any query parameter optionally)
- If Router URL is provided, we consider it as a Router element.
- If Router element we first hit the /router endpoint using fetch request which submits the response and gives a redirect URL as response JSON property.
- While the /router endpoint is being fetched, in the meantime we preload the booking link specified as calPreloadBookingLink(to be introduced as a new property similar to calLink(existing property))
- Once the /router endpoint is fetched, we check if the redirectUrl path is same as calPreloadBookingLink path.
  - If yes, we pass the query params from the redirectUrl to the already loaded(or being loaded) iframe. We do this by calling doInInframe method of embed.ts, method:""



  To Test
  - [ ] Modal CTA is clicked again, before waiting for embed link to be ready . I think it just removes the skeleton showing what is there. This is wrog