# Setting up Make Integration

1. Install the app from the Cal app store and generate an API key. Copy the API key.
2. Go to `/admin/apps/automation` in Cal and set the `invite_link` for Make to `https://www.make.com/en/hq/app-invitation/6cb2772b61966508dd8f414ba3b44510` to use the app.
3. Create a [Make account](https://www.make.com/en/login), if you don't have one.
4. Go to `Scenarios` in the sidebar and click on **Create a new scenario**.
5. Search for `Cal.com` in the apps list and select from the list of triggers - Booking Created, Booking Deleted, Booking Rescheduled, Meeting Ended
6. To create a **connection** you will need your Cal deployment url and the app API Key generated above. You only need to create a **connection** once, all webhooks can use that connection.
7. Setup the webhook for the desired event in Make.
8. To delete a webhook, go to `Webhooks` in the left sidebar in Make, pick the webhook you want to delete and click **delete**.

## Localhost or Self-hosting

Localhost urls can not be used as the base URL for api endpoints

Possible solution: using [https://ngrok.com/](https://ngrok.com/)

1. Create Account
2. [Download](https://ngrok.com/download) ngrok and start a tunnel to your running localhost
   - Use forwarding url as your baseUrl for the URL endpoints
3. Use the ngrok url as your Cal deployment url when creating the **Connection** in Make.
