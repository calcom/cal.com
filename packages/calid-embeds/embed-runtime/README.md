# @calid/embed-runtime

Vanilla JavaScript runtime for embedding Cal ID on any website.

This package builds the standalone embed.js script used to render and control the booking embed without requiring any framework.

### Install on Any Website

Load the script:

<script src="https://cal.id/embed-link/embed.js"></script>

### Development

Start dev server (runs on http://localhost:3100/embed/):

yarn dev

### Running Tests

Ensure:

Main app running on 3000

Embed dev server running on 3100

Then:

yarn embed-tests-quick

### Production Build
yarn build


Serve the generated script as:

https://cal.id/embed.js

### Notes

Framework-independent

Manages iframe lifecycle and messaging

Used by higher-level adapters (e.g. React wrapper)