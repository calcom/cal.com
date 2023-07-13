# Test cases for Organizations feature

## Test data

- environment: <http://app.cal.dev/> (preferable) or your local (<http://app.cal.local:3000/>)
- Admin user: <admin@example.com> / ADMINadmin2022!
- Mailtrap

1. Test Case: Create an Organization
   - **Description**: Verify the ability to create a new organization.
   - **Steps**:
     1. - [ ] Log in as an administrator.
     2. - [ ] Navigate to the organization creation page (`/settings/organizations/new`).
     3. - [ ] Enter valid details for the organization (email, name, URL/slug).
     4. - [ ] Click on the Continue button
     5. - [ ] Get validation code in Mailtrap and paste there
     6. - [ ] Set a password and go next
     7. - [ ] Upload a picture as the Organization logo and click on the Continue button
     8. - [ ] Skip the 'Invite your organization admins' page (click on "I'll do this later")
     9. - [ ] Skip the 'Create your teams' page (click on "I'll do this later")
     10. Validate that the organization is successfully created and displayed in the user interface.
         1. - [ ] You should see the Event Type page for the Organization's owner and the message "Create your first event type"
         2. - [ ] You should see the Organization's Logo close to the user profile picture
         3. - [ ] You should see the Event Type page for the Organization's owner
         4. - [ ] You should see on the top an orange bar (notification) saying "Thank you for trialing our Organization plan. We noticed your Organization "Acme" needs to be upgraded. Upgrade here"
         5. - [ ] You should see a blue notification with "Set your profile"
     11. - [ ] Click on Settings (bottom left)
         1. - [ ] You should see the Organization profile (logo, name and URL, all filled)
         2. - [ ] You should see the Organization section from the left menu (Profile, General, Members, Appearance, Billing)

