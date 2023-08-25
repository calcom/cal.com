# Setting up Make Integration

1. Create a [Make account](https://www.make.com/en/login), if you don't have one.
2. Go to `Scenarios` in the sidebar and click on **Create a new scenario**
3. Search for `Cal.com` in the apps list and select from the list of triggers - Booking Created, Booking Deleted, Booking Rescheduled, Meeting Ended
4. To create a **connection** you will need your Cal deployment url and the app API Key generated when you install `Make` from the Cal app store.You only need to create a **connection** once, all webhooks can use that connection.
5. Setup the webhook for the desired event in Make.
6. To delete a webhook, go to `Webhooks` in the left sidebar in Make, pick the webhook you want to delete and click **delete**.
