# Feature Specification: Custom Branding (Logo & Favicon)

**Feature Branch**: `001-custom-branding`  
**Created**: 2025-11-18  
**Status**: Draft  
**Input**: "I would like to add a Business Logo upload to the '/settings/my-account/appearance' page. I would also like to add an option to replace the favicon. The Business Logo image should display centered at the top of the 'public page' and the favicon should be the favicon on the public page."

## Clarifications

### Session 2025-11-18

- Q: How should uploaded logo and favicon files be accessed? → A: Public URLs with obscured paths (random filenames/tokens), hotlinking allowed
- Q: What are the maximum display dimensions for the business logo on public booking pages? → A: Maximum 400px wide × 150px tall, scaled proportionally if larger
- Q: When a user uploads a new logo/favicon to replace an existing one, what happens to the old file? → A: Automatically delete old file from storage immediately upon successful new upload
- Q: What size should the uploaded favicon be, or should multiple sizes be supported? → A: Accept any size, but recommend 32×32px minimum (standard favicon size)
- Q: When a user deletes their logo/favicon (not replacing, but removing), should the file be deleted from storage? → A: Yes, automatically delete the file from storage when user deletes their logo/favicon

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Upload and Display Business Logo (Priority: P1)

A Cal.com user wants to personalize their public booking page by adding their business logo to create a professional, branded experience for their clients.

**Why this priority**: Branding is critical for professional use and is a primary differentiator between self-hosted solutions and generic booking tools. This delivers immediate visual impact and value.

**Independent Test**: User can upload a logo via appearance settings, navigate to their public booking page, and see the logo displayed centered at the top of the page.

**Acceptance Scenarios**:

1. **Given** a user is logged into Cal.com and navigates to `/settings/my-account/appearance`, **When** they click on a "Business Logo" upload control, **Then** they can select an image file from their device
2. **Given** a user has selected a valid image file (PNG, JPG, SVG), **When** the upload completes successfully, **Then** they see a preview of their uploaded logo in the settings page
3. **Given** a user has uploaded a business logo, **When** they visit their public booking page, **Then** the logo displays centered at the top of the page above all other content
4. **Given** a user has uploaded a business logo, **When** they want to change it, **Then** they can upload a new image which replaces the previous one
5. **Given** a user has uploaded a business logo, **When** they want to remove it, **Then** they can delete the logo and revert to the default Cal.com appearance

---

### User Story 2 - Upload and Apply Custom Favicon (Priority: P2)

A Cal.com user wants to customize the favicon on their public booking page to match their brand identity, making their booking page easily identifiable in browser tabs and bookmarks.

**Why this priority**: Favicons enhance brand recognition but are less critical than the main logo. Users can deliver a complete branded experience with the main logo alone.

**Independent Test**: User can upload a favicon via appearance settings, navigate to their public booking page, and see the custom favicon in the browser tab.

**Acceptance Scenarios**:

1. **Given** a user is logged into Cal.com and navigates to `/settings/my-account/appearance`, **When** they click on a "Favicon" upload control, **Then** they can select an icon file from their device
2. **Given** a user has selected a valid icon file (ICO, PNG), **When** the upload completes successfully, **Then** they see a preview of their uploaded favicon in the settings page
3. **Given** a user has uploaded a custom favicon, **When** they visit their public booking page, **Then** the custom favicon displays in the browser tab instead of the default Cal.com favicon
4. **Given** a user has uploaded a custom favicon, **When** they want to change it, **Then** they can upload a new icon which replaces the previous one
5. **Given** a user has uploaded a custom favicon, **When** they want to remove it, **Then** they can delete the icon and revert to the default Cal.com favicon

---

### User Story 3 - Responsive Logo Display (Priority: P3)

A Cal.com user expects their business logo to display properly on all device sizes (desktop, tablet, mobile) without distortion or layout issues.

**Why this priority**: Responsive design is essential but can be delivered after core upload/display functionality. Initial implementation can focus on desktop with mobile refinements following.

**Independent Test**: User views their public booking page on different screen sizes and confirms the logo displays appropriately scaled and centered on all devices.

**Acceptance Scenarios**:

1. **Given** a user has uploaded a business logo, **When** they view their public booking page on a desktop browser, **Then** the logo displays centered at the top scaled to maximum 400px wide by 150px tall while maintaining aspect ratio
2. **Given** a user has uploaded a business logo, **When** they view their public booking page on a tablet, **Then** the logo scales appropriately and remains centered
3. **Given** a user has uploaded a business logo, **When** they view their public booking page on a mobile device, **Then** the logo scales down to fit the screen width while maintaining aspect ratio
4. **Given** a user has uploaded a very wide logo, **When** they view it on mobile, **Then** the logo scales to fit the screen without horizontal scrolling

---

### Edge Cases

- What happens when a user uploads an extremely large file (e.g., 50MB image)?
- How does the system handle unsupported file formats (e.g., BMP, TIFF, animated GIF)?
- What happens when a user uploads an image with unusual dimensions (e.g., 10:1 aspect ratio)?
- How does the system handle corrupt or malformed image files?
- What happens if image upload fails due to network interruption?
- How does the system handle multiple rapid upload attempts (user clicking upload multiple times)?
- What happens when a user uploads a logo but their storage quota is exceeded?
- How does the logo display if the image URL becomes invalid (e.g., file deleted from storage)?
- What happens if a user uploads a replacement logo but deletion of the old file fails?
- What happens if a user deletes their logo/favicon from settings but the file deletion from storage fails?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an upload control for business logo on the `/settings/my-account/appearance` page
- **FR-002**: System MUST provide an upload control for favicon on the `/settings/my-account/appearance` page
- **FR-003**: System MUST accept PNG, JPG, and SVG file formats for business logo uploads
- **FR-004**: System MUST accept ICO and PNG file formats for favicon uploads of any dimensions, with a recommended minimum of 32×32px for optimal display across browsers
- **FR-005**: System MUST display a preview of uploaded logo in the appearance settings page
- **FR-006**: System MUST display a preview of uploaded favicon in the appearance settings page
- **FR-007**: System MUST display the uploaded business logo centered at the top of the user's public booking page
- **FR-008**: System MUST apply the uploaded favicon to the user's public booking page
- **FR-009**: System MUST allow users to replace their previously uploaded logo with a new one
- **FR-010**: System MUST allow users to replace their previously uploaded favicon with a new one
- **FR-011**: System MUST allow users to delete their uploaded logo and revert to default appearance, automatically removing the logo file from storage
- **FR-012**: System MUST allow users to delete their uploaded favicon and revert to default Cal.com favicon, automatically removing the favicon file from storage
- **FR-013**: System MUST validate file types and reject unsupported formats with clear error messages
- **FR-014**: System MUST enforce a maximum file size limit for uploads (suggested default: 5MB for logos, 1MB for favicons)
- **FR-015**: System MUST persist uploaded images and associate them with the user's account
- **FR-016**: System MUST maintain aspect ratio of uploaded logos when displaying on public page
- **FR-017**: System MUST scale logos to a maximum of 400px wide by 150px tall on public booking pages, maintaining aspect ratio (logos larger than these dimensions are scaled down proportionally)
- **FR-018**: System MUST display error messages when uploads fail due to validation or storage issues
- **FR-019**: System MUST show upload progress indication during file upload
- **FR-020**: System MUST generate publicly accessible URLs with obscured paths (using random filenames or tokens) for uploaded logo and favicon files to prevent path guessing while allowing hotlinking
- **FR-021**: System MUST automatically delete the previous logo file from storage when a user uploads a new logo to replace it
- **FR-022**: System MUST automatically delete the previous favicon file from storage when a user uploads a new favicon to replace it

### Key Entities _(include if feature involves data)_

- **User**: Cal.com account holder with appearance customization permissions
- **Business Logo**: Image file associated with a user account, displayed on their public booking page
- **Favicon**: Icon file associated with a user account, displayed in browser tab for their public booking page
- **Appearance Settings**: Configuration page containing branding customization options including logo and favicon uploads

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can successfully upload and save a business logo in under 30 seconds
- **SC-002**: Uploaded business logos display on public booking pages within 5 seconds of upload completion
- **SC-003**: Logo and favicon uploads succeed for 99% of valid file formats and sizes
- **SC-004**: Users can identify their public booking page in browser tabs immediately due to custom favicon
- **SC-005**: 95% of users successfully complete logo upload on first attempt without errors
- **SC-006**: Logos display correctly (centered, scaled to maximum 400px × 150px, maintaining aspect ratio, no distortion) on desktop, tablet, and mobile devices
- **SC-007**: System rejects invalid files immediately (within 1 second) with clear error explanation
- **SC-008**: Users can replace or remove their logo/favicon in under 15 seconds

## Assumptions

- Users have appropriate permissions to modify appearance settings for their Cal.com account
- Storage infrastructure exists or can be configured to store uploaded image files
- Public booking pages have a consistent layout structure where centered logo placement is feasible
- File size limits of 5MB (logo) and 1MB (favicon) are sufficient for professional quality images
- Standard web image formats (PNG, JPG, SVG for logos; ICO, PNG for favicons) cover user needs
- Users access appearance settings through a web browser (not mobile app)
- Each user account has one primary public booking page where branding applies
- Uploaded images are accessible via public URLs with obscured paths (random filenames/tokens) to prevent guessing while allowing necessary public access
- Hotlinking of logo and favicon images is acceptable since they must be publicly accessible for public booking pages
- Browsers automatically scale favicons appropriately from any uploaded size, with 32×32px being the standard size that ensures good quality across all contexts
- File deletion from storage happens immediately when users replace or remove logo/favicon files to prevent storage waste and orphaned files

## Constraints

- Feature is limited to `/settings/my-account/appearance` page (no other settings pages affected)
- Only one business logo and one favicon per user account
- Logo displays only on public booking page, not in admin/settings areas
- Favicon applies only to public booking page, not to Cal.com admin interface
- Animated images (animated GIFs, animated SVGs) may not be supported in initial version

## Scope

### In Scope

- Upload interface for business logo on appearance settings page
- Upload interface for favicon on appearance settings page
- File validation (type and size) for uploads
- Preview display of uploaded logo and favicon in settings
- Display of business logo centered at top of public booking page
- Application of custom favicon to public booking page
- Ability to replace uploaded logo/favicon
- Ability to delete uploaded logo/favicon
- Error handling for failed uploads
- Responsive display of logo on different screen sizes
- Image storage and retrieval
- Association of uploaded assets with user accounts

### Out of Scope

- Multiple logos per account (alternate logos for different booking pages)
- Logo animation or interactive effects
- Automatic logo optimization or format conversion
- Logo editing tools (cropping, resizing, filters)
- Bulk logo upload for multiple users/organizations
- Logo display in email notifications or calendar invites
- Custom positioning options (user cannot choose logo placement)
- Color picker or theme customization beyond logo/favicon
- Logo/favicon version history or rollback functionality
- A/B testing of different logos
- Analytics on logo effectiveness or click-through rates
