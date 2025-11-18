# Branding Test Fixtures

Test assets for Custom Branding feature (logo and favicon upload).

## Files

- `test-logo.png` - Sample business logo for E2E tests (~200KB PNG)
- `test-favicon.png` - Sample favicon for E2E tests (PNG format, browsers support PNG favicons)

## Usage

These fixtures are used by Playwright E2E tests in `apps/web/playwright/settings/upload-branding.e2e.ts` to test:

- Logo upload and display functionality
- Favicon upload and application
- File validation (size, format)
- Replace and delete operations

## Notes

- Both files are copies of the existing `cal.png` fixture
- PNG format is supported for both logos and favicons in modern browsers
- For production ICO favicon testing, additional `.ico` files can be added if needed

