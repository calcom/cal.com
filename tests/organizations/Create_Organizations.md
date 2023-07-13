# Test cases for Organizations feature

## Test data

- environment: <http://app.cal.dev/> (preferable) or your local (<http://app.cal.local:3000/>)
- Admin user: <admin@example.com> / ADMINadmin2022!
- Mailtrap

@sanity
TC0001: Create an Organization (skipping optional fields)

   - **Description**: Verify the ability to create a new organization, skipping wherever is possible
   - **Steps**:
     1. - [ ] Log in as an administrator.
     2. - [ ] Navigate to the organization creation page (`/settings/organizations/new`).
     3. - [ ] Enter valid details for the organization (email, name, URL/slug).
     4. - [ ] Click on the Continue button
     5. - [ ] Get validation code in mailtrap and paste there
     6. - [ ] Set a password and go next
     7. - [ ] Skip add a picture as the Organization logo just clicking on the Continue button
     8. - [ ] Skip the 'Invite your organization admins' page (click on "I'll do this later")
     9. - [ ] Skip the 'Create your teams' page (click on "I'll do this later"). A "Update timezone" might appears. Click on Update timezone
     10. Validate that the organization is successfully created and displayed in the user interface.
         1. - [ ] The Admin users is not logged in anymore. Instead, the new owner user for the organization will be logged in
         2. - [ ] You should see a blue notification with "Set your profile"
         3. - [ ] You should see the Event Type page for the Organization's owner and the message "Create your first event type"
         4. - [ ] You should see a default image as the user profile picture
         5. - [ ] You should see the user name as "Nameless" as it was not setting up yet
         6. - [ ] You should see on the top an orange bar (notification) saying "Thank you for trialing our Organization plan. We noticed your Organization "XYZ" needs to be upgraded. Upgrade here"
     11. - [ ] Click on Settings (bottom left)
         1. - [ ] You should see the Organization profile (default logo, Organization name and Organization URL, all filled)
         2. - [ ] You should see the Organization section from the left menu (Profile, General, Members, Appearance, Billing)
     12. - [ ] Click on Profile for the Organization's owner  (top left, "My account" option)
         1. - [ ] You should see the "Username" field with: `NameOfTheOrganizationOrSlug.cal.dev/NameOfUserOrganizationSet`
         2. - [ ] You should see the "Email" field filled out
         3. - [ ] You should see the "Full name" and "About" fields NOT filled out

@sanity
TC0002: Create an Organization (full filled out)

   - **Description**: Verify the ability to create a new organization, filling out all possible fields
   - **Steps**:
     1. - [ ] Log in as an administrator.
     2. - [ ] Navigate to the organization creation page (`/settings/organizations/new`).
     3. - [ ] Enter valid details for the organization (email, name, URL/slug).
     4. - [ ] Click on the Continue button
     5. - [ ] Get validation code in mailtrap and paste there
     6. - [ ] Set a password and go next
     7. - [ ] Upload a valid picture as the Organization logo
     8. - [ ] Write something in the "About" textfield
     9. - [ ] Click on the "Continue" button
     10. - [ ] Add an valid email as admin (use same slug) and click on "Continue" button
         1. - [ ] You should see a notification saying "1 user has been invited" and move to the next page ("Create your teams")
     11. - [ ] Add a team name and click on "Continue"
         1. - [ ] You should see a notification showing a triangle as progress bar and the event type page after a few seconds
         2. - [ ] A "Update Timezone" modal might appears. Click on the "Update tiezone" button
     12. Validate that the organization is successfully created and displayed in the user interface.
         1. - [ ] You should see the Event Type page for the Organization's owner and the message "Create your first event type"
         2. - [ ] You should see a blue notification with "Set your profile
         3. - [ ] You should see the Organization's Logo and its name close to the user profile picture
         4. - [ ] You should see the user profile picture as a default image (no picture) and a small green dot on it
         5. - [ ] You should see on the top an orange bar (notification) saying "Thank you for trialing our Organization plan. We noticed your Organization "XYZ" needs to be upgraded. Upgrade here"
     13. - [ ] Click on Settings (bottom left)
         1. - [ ] You should see the Organization profile (logo, organization name, organization URL and about, all filled)
         2. - [ ] You should see the Organization section from the left menu (Profile, General, Members, Appearance, Billing)
     14. - [ ] Click on Profile for the Organization's owner  (top left, under "My account")
         1. - [ ] You should see the "Username" field with: `NameOfTheOrganizationOrSlug.cal.dev/NameOfUserOrganizationSet`
         2. - [ ] You should see the "Email" field filled out
         3. - [ ] You should see the "Full name" and "About" fields NOT filled out
