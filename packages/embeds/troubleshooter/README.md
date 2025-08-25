# Cal.com Embed Troubleshooter

A diagnostic tool for troubleshooting Cal.com embeds on any website. This bookmarklet helps identify issues with Cal.com embed installations, configuration problems, and provides actionable recommendations.

## Features

- ✓ Detects if `window.Cal` is properly initialized
- ✓ Identifies all Cal.com embed elements on the page
- ✓ Monitors network requests to Cal.com
- ✓ Captures console errors related to embeds
- ✓ Checks for configuration issues
- ✓ Validates security policies (CSP, CORS)
- ✓ Provides actionable recommendations
- ✓ Real-time monitoring with refresh capability

## Installation

1. Open `index.html` in your browser
2. Drag the "Cal.com Troubleshooter" button to your bookmarks bar
3. Navigate to any page with Cal.com embeds
4. Click the bookmarklet to open the troubleshooter

## Development

No build step required! Just edit the files and they're ready to use.

### Files Structure

- `index.html` - Landing page with installation instructions
- `troubleshooter.js` - Main troubleshooter script (self-contained)
- `bookmarklet-loader.js` - Minimal loader script for the bookmarklet
- **Test Pages:**
  - `test-real-embed.html` - **RECOMMENDED** - Uses REAL Cal.com embed with proper data-cal-link attributes
  - `test-page-local.html` - Configurable test page for local development
  - `test-page.html` - Mock version (DO NOT USE for real testing)
  - `test-page-real.html` - Alternative real embed test page

### Testing Locally

#### Quick Start (with REAL local Cal.com embed):

1. Make sure your Cal.com dev server is running (e.g., at `http://app.cal.local:3000`)

2. Start the troubleshooter server:
   ```bash
   cd packages/embeds/troubleshooter
   python3 -m http.server 8080
   ```

3. Open `http://localhost:8080/test-page-local.html`

4. Configure your domain if needed (default is `http://app.cal.local:3000`)

5. Click "Load Cal.com Embed" to load the real embed

6. Click "Inject Troubleshooter" to test the troubleshooter

#### For testing the bookmarklet:

1. Modify the script URL in `bookmarklet-loader.js` if needed
2. Create a bookmarklet with the local loader or paste the loader code directly in the console

### Direct Console Testing

You can also test by pasting this in the console:
```javascript
const script = document.createElement('script');
script.src = 'http://localhost:8000/troubleshooter.js';
document.head.appendChild(script);
```

## Deployment

1. Host `troubleshooter.js` on cal.com (e.g., `https://cal.com/embed/troubleshooter.js`)
2. Update the URL in `bookmarklet-loader.js`
3. Update the bookmarklet URL in `index.html`

## How It Works

1. **Detection**: Checks for `window.Cal` object and embed script presence
2. **Element Scanning**: Finds all Cal.com embed elements (inline, modal, floating button)
3. **Network Monitoring**: Intercepts fetch requests to Cal.com domains
4. **Error Tracking**: Captures console errors related to Cal.com
5. **Diagnostics**: Runs comprehensive checks and displays results
6. **Recommendations**: Provides actionable fixes based on detected issues

## Troubleshooting Common Issues

### "window.Cal is not defined"
The embed snippet hasn't been loaded. Add the Cal.com embed snippet to your page.

### "CSP may block Cal.com resources"
Add `cal.com` to your Content Security Policy headers.

### "Invalid JSON in data-cal-config"
Check the syntax of your `data-cal-config` attribute on embed elements.

### Network errors
Check the Network tab in the troubleshooter for failed requests and their status codes.

## License

Part of the Cal.com project.