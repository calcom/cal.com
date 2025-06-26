# Organizations feature

From the [Original RFC](https://github.com/calcom/cal.com/issues/7142):

> We want to create organisations within Cal.com to enable people to easily and effectively manage multiple teams. An organisation will live above the current teams layer.

## App setup

1.  Log in as admin and in Settings, turn on Organizations feature flag under Features section. Organizations feature has an operational feature flag in order to turn on the entire feature.

2.  Set the following environment variables as described:

    1. **`CALCOM_LICENSE_KEY`**: Since Organizations is an EE feature, a license key should be present, either as this environment variable or visiting as an Admin `/auth/setup`. To get a license key, please [contact sales](https://cal.com/sales)
    2. **`NEXT_PUBLIC_WEBAPP_URL`**: In case of local development, this variable should be set to `http://app.cal.local:3000` to be able to handle subdomains correctly in terms of authentication and cookies
    3. **`NEXTAUTH_URL`**: Should be equal to `NEXT_PUBLIC_WEBAPP_URL` which is `http://app.cal.local:3000`
    4. **`NEXTAUTH_COOKIE_DOMAIN`**: In case of local development, this variable should be set to `.cal.local` to be able to accept session cookies in subdomains as well otherwise it should be set to the corresponding environment such as `.cal.dev`, `.cal.qa` or `.cal.com`. If you choose another subdomain, the value for this should match the apex domain of `NEXT_PUBLIC_WEBAPP_URL` with a leading dot (`.`)
    5. **`ORGANIZATIONS_ENABLED`**: Should be set to `1` or `true`
    6. **`STRIPE_ORG_MONTHLY_PRICE_ID`**: For dev and all testing should be set to your own testing key. Or ask for the shared key if you're a core member.
    7. **`ORGANIZATIONS_AUTOLINK`**: Optional. Set to `1` or `true` to let new signed-up users using Google external provider join the corresponding organization based on the email domain name.

3.  Add `app.cal.local` to your host file, either:

    1. `sudo npx hostile set localhost app.cal.local`
    2. Add it yourself

4.  Add `acme.cal.local` to host file given that the org create for it will be `acme`, otherwise do this for whatever slug will be assigned to the org. This is needed to test org-related public URLs, such as sub-teams, members and event-types.

5.  Be sure to be logged in with any type of user and visit `/settings/organizations/new` and follow setup steps with the slug matching the org slug from step 3

6.  Log in as admin and go to Settings and under Organizations you will need to accept the newly created organization in order to be operational

7.  After finishing the org creation, you will be automatically logged in as the owner of the organization, and the app will be shown in organization mode

### Note

Browsers do not allow camera/mic access on any non-HTTPS hosts except for localhost. To test cal video organization meeting links locally (`app.cal.local/video/[uid]`). You can access the meeting link by replacing app.cal.local with localhost in the URL.

For eg:- Use `http://localhost:3000/video/nAjnkjejuzis99NhN72rGt` instead of `http://app.cal.local:3000/video/nAjnkjejuzis99NhN72rGt`.

To get an HTTPS URL for localhost, you can use a tunneling tool such as `ngrok` or [Tunnelmole](https://github.com/robbie-cahill/tunnelmole-client) . Alternatively, you can generate an SSL certificate for your local domain using `mkcert`. Turn off any SSL certificate validation in your HTTPS client (be sure to do this for local only, otherwise its a security risk).

#### Tunnelmole - Open Source Tunnelling Tool:

To install Tunnelmole, execute the command:

```
curl -O https://install.tunnelmole.com/8dPBw/install && sudo bash install
```

After a successful installation, you can run Tunnelmole using the following command, replacing `8000` with your actual port number if it is different:

```
tmole 8000
```

In the output, you'll see two URLs, one HTTP and an HTTPS URL. For privacy and security reasons, it is recommended to use the HTTPS URL.

View the Tunnelmole [README](https://github.com/robbie-cahill/tunnelmole-client) for additional information and other installation methods such as `npm` or building your own binaries from source.

#### ngrok - Closed Source Tunnelling Tool:

ngrok is a popular closed source tunneling tool. You can run ngrok using the same port, using the format `ngrok http <port>` replacing `<port>` with your actual port number. For example:

```
ngrok http 8000
```

This will generate a public URL that you can use to access your localhost server.

## DNS setup

When a new organization is created, other than not being verified up until the admin accepts it in settings as explained in step 6, a flag gets created that marks the organization as missing DNS setup. That flag get auto-checked by the system upon organization creation when the Cal instance is deployed in Vercel and the subdomain registration was successful. Logging in as admin and going to Settings > Organizations section, you will see that flag as a badge, designed to give admins a glimpe on what is pending in terms of making an organization work. Alongside the mentioned badge, an email gets sent to admins in order to warn them there is a pending action about setting up DNS for the newly created organization to work.



## Single Org Mode

For a detailed documentation with screenshots, please refer to [this](https://docs.google.com/document/d/1cXTBlsbd9w_CnkQLKTTh_mP2csMQ431npYk3CjrYXM0/edit?usp=sharing)

If you want to have booker.yourcompany.com to be the domain used for both dashboard(e.g. https://booker.yourcompany.com/event-types) and booking pages(e.g. https://booker.yourcompany.com/john.joe/15min).
- Set the `NEXT_PUBLIC_SINGLE_ORG_SLUG` environment variable to the slug of the organization you want to use. `NEXT_PUBLIC_SINGLE_ORG_SLUG=booker`
- Set the `NEXT_PUBLIC_WEBAPP_URL` environment variable to the URL of the Cal.com self-hosted instance e.g. `NEXT_PUBLIC_WEBAPP_URL=https://booker.yourcompany.com`.
- Set the `NEXT_PUBLIC_WEBSITE_URL` environment variable to the URL of the Cal.com self-hosted instance e.g. `NEXT_PUBLIC_WEBSITE_URL=https://booker.yourcompany.com`.
- Set the `NEXTAUTH_URL` environment variable to the URL of the Cal.com self-hosted instance e.g. `NEXTAUTH_URL=https://booker.yourcompany.com`.

Note: It causes root to serve the dashboard and not the organization profile page which shows all bookable users in the organization.


## Other Env Variables

### RESERVED_SUBDOMAINS

This is a comma-separated list of subdomains that are not allowed to be used as organization slugs.
So, e.g. if you set `RESERVED_SUBDOMAINS="app","auth","help"` then the domains `app.cal.com`, `auth.cal.com` and `help.cal.com` are reserved for its use by the Cal.com instance. So, you can't create an organization with the slug `app`, `auth` or `help`.

### ALLOWED_HOSTNAMES

It is a comma-separated list of domains, on the subdomains of which the booking pages and dashboard are allowed to work.

So, if ALLOWED_HOSTNAMES='"cal.com", "cal.dev"' then,
- acme.cal.com is a valid organization booking domain and WEBAPP_URL can be set to http://app.cal.com
- dunder.cal.dev is also a valid organization subdomain and WEBAPP_URL can be set to http://app.cal.dev

If ALLOWED_HOSTNAMES='"cal.domain.tld"" then
WEBAPP_URL should be app.cal.domain.tld and acme.cal.domain.tld, dunder.cal.domain.tld, xxxx.cal.domain.tld are valid organization domain.

