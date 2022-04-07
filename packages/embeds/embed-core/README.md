# embed-core

See [index.html](index.html) to see various examples

## How to use embed on any webpage no matter what framework
See <https://docs.cal.com/integrations/embed>

## Development

Run the following command and then you can test the embed in the automatically opened page `http://localhost:3002`

```bash
yarn dev
```

## Running Tests

Ensure that App is running on port 3000 already and then run following command:

```bash
yarn test-playwright
```

## Shipping to Production

```bash
yarn build
```

Make `dist/embed.umd.js` servable on URL <http://cal.com/embed.js>

## DX

- Hot reload doesn't work with CSS files in the way we use vite.

## Known Bugs and Upcoming Improvements

- Unsupported Browsers and versions. Documenting them and gracefully handling that.

- Accessibility and UI/UX Issues
  - let user choose the loader for ModalBox
  - If website owner links the booking page directly for an event, should the user be able to go to events-listing page using back button ?

- Automation Tests
  - Run automation tests in CI

- Bundling Related
  - Comments in CSS aren't stripped off

- Debuggability
  - Send log messages from iframe to parent so that all logs can exist in a single queue forming a timeline.
    - user should be able to use "on" instruction to understand what's going on in the system
  - Error Tracking for embed.js
    - Know where exactly it’s failing if it does.

- Color Scheme
  - Need to reduce the number of colors on booking page, so that UI configuration is simpler

- Dev Experience/Ease of Installation
  - Improved Demo
    - Seeding might be done for team event so that such an example is also available readily in index.html
  - Do we need a one liner(like `window.dataLayer.push`) to inform SDK of something even if snippet is not yet on the page but would be there e.g. through GTM it would come late on the page ?

- Might be better to pass all configuration using a single base64encoded query param to booking page.

- Embed Code Generator

- UI Config Features
  - Theme switch dynamically - If user switches the theme on website, he should be able to do it on embed. Add a demo for the API. Also, test system theme handling.
    - How would the user add on hover styles just using style attribute ?

- If just iframe refreshes due to some reason, embed script can't replay the applied instructions.

- React Component
  - `onClick` support with preloading

Embed for authenticated pages

- Currently embed is properly supported for non authenticated pages like cal.com/john. It is supported for team links as well.
- For such pages, you can customize the colors of all the texts and give a common background to all pages under your cal link
- If we can support other pages, which are behind login, it can open possibilities for users to show "upcoming bookings", "availability" and other functionalities on their website itself. 
  - First of all we need more usecases for this.
  - Think of it in this way. Cal.com is build with many different UI components that are put together to work seamlessly, what if the user can choose which component they need and which they don't
  - The main problem with this is that, there are so many pages in the app. We would need to ensure that all the pages use the same text colors only that are available as embed UI configuration.
  - We would need to hide certain UI components when opening a page. e.g. the navigation component wouldn't be there.
  - User might want to change the text also for components, e.g. he might call "Event Type" as "Meeting Type" everywhere. common.json would be useful in this scenario.
  - Login form shouldn't be visible in embed as auth would be taken care of separately. If due to cookies being expired, the component can't be shown then whatever auth flow is configured, can be triggered
    - In most scenarios, user would have a website on which the visitors would be signing in already into their system(and thus they own the user table) and he would want to just link those users to cal.com - This would be allowed only with self hosted instance ?
      - So, cal.com won't maintain the user details itself and would simply store a user id which it would provide to hosting website to retrieve user information whenever it needs it.


## Pending Documentation

- READMEs
  - How to make a new element configurable using UI instruction ?
  - Why do we NOT want to provide completely flexible CSS customization by adding whatever CSS user wants. ?
  - Feature Documentation
    - Inline mode doesn't cause any scroll in iframe by default. It more looks like it is part of the website.
- docs.cal.com
  - A complete document on how to use embed

- app.cal.com
  - Get Embed code for each event-type
