# Atoms examples
Example apps using atoms - customizable UI components to integrate scheduling into your product.

## Running examples apps locally

1. Cal's backend is required to run example apps, so clone `https://github.com/calcom/cal.com` and follow setup instructions in the readme. Importantly, you need to have Google credentials setup by following [this section](https://github.com/calcom/cal.com?tab=readme-ov-file#obtaining-the-google-api-credentials) in the docs.

2. Open "apps/api/v2/.env" and copy environment variables below, and then copy `NEXTAUTH_SECRET` from the root ".env" of repository cloned in step 1.
```jsx
NODE_ENV="development"
API_PORT=5555
DATABASE_READ_URL="postgresql://postgres:@localhost:5450/calendso"
DATABASE_WRITE_URL="postgresql://postgres:@localhost:5450/calendso"
API_URL="http://localhost"
NEXTAUTH_SECRET="copy from .env of root of repository cloned in step 1"
DATABASE_URL="postgresql://postgres:@localhost:5450/calendso"
JWT_SECRET="asjdijI1JIO12I3O89198jojioSAJDU"
REDIS_URL="redis://localhost:6379"
```

3. Start "apps/api/v2" api using `yarn dev`.
4. Start "packages/platform/atoms" atoms package with `yarn dev`.
5. Start "apps/web" cal web app using `yarn dx`.
6. Open your browser at "http://localhost:3000/" and login with admin username `admin@example.com` and password `ADMINadmin2022!`.
7. In the web app navigate to `http://localhost:3000/settings/organizations/new` and create a sample organization. When asked for phone verification code enter `111111`.
8. In the web app navigate to `http://localhost:3000/settings/organizations/platform/oauth-clients` and create a new oAuth client - give all permissions and set redirect uri to `http://localhost:4321` which points to example app.
9. Setup environment for the example app you want to run:
    1. First, copy ".env.example" into ".env".
    2. Open ".env" file and paste client id from step 8 in `NEXT_PUBLIC_X_CAL_ID` and client secret in `X_CAL_SECRET_KEY`. If in step 2 you used the same environment variables, then `NEXT_PUBLIC_CALCOM_API_URL` can stay as is. Otherwise adjust the port to point to the same `API_PORT` as you used in step 2.
10. Navigate to example app and setup database by running `rm -f prisma/dev.db && yarn prisma db push`.
11. Start the example app by running `yarn dev` and go to `http://localhost:4321`.
12. In the Google Cloud Console "API & Services" "Credentials" `https://console.cloud.google.com/apis/credentials` open web project setup in step 1 and add `http://localhost:5555/v2/gcal/oauth/save` to the authorized redirect URIs.

<img width="1000" alt="Screenshot 2024-03-21 at 09 42 36" src="https://github.com/calcom/atoms-examples/assets/42170848/82ce4d7a-fc08-489a-ab06-a8eb41a68a2a">

