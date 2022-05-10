# Signup for self-hosted EE

In order to open the signup, please replace the contents of the file in

`calcom/apps/web/pages/auth/signup.tsx`

with the contents of the new file provided here in the @calcom/api repo at the folder:
`/auth/signup.tsx`

Once you do, if you run your cal.com self-hosted instance and go to:
`http://localhost:3000/auth/signup`

You should see the signup page, and your users should be able to create new accounts.

Please, keep in mind this will create git conflict resolutions if you try to git pull from main, where the signup.tsx file will still be different. We will find a better workaround for this soon in order to make it pain free.
