<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/calendso/calendso">
    <img src="https://calendso.com/calendso-logo.svg" alt="Logo" width="160" height="160">
  </a>

  <h3 align="center">Calendso</h3>

  <p align="center">
    The open-source Calendly alternative.
    <br />
    <a href="https://calendso.com"><strong>Learn more »</strong></a>
    <br />
    <br />
    <a href="https://join.slack.com/t/calendso/shared_invite/zt-mem978vn-RgOEELhA5bcnoGONxDCiHw">Slack</a>
    ·
    <a href="https://calendso.com">Website</a>
    ·
    <a href="https://github.com/calendso/calendso/issues">Issues</a>
  </p>
</p>

<!-- ABOUT THE PROJECT -->
## About The Project

[![Calendso Screenshot][product-screenshot]](https://calendso.com)

Let's face it: Calendly and other scheduling tools are awesome. It made our lives massively easier. We're using it for business meetings, seminars, yoga classes and even calls with our families. However, most tools are very limited in terms of control and customisations. That's where Calendso comes in. Self-hosted or hosted by us. White-label by design. API-driven and ready to be deployed on your own domain. Full control of your events and data. Calendso is to Calendly what GitLab is to GitHub.

### Built With

* [Next.js](https://nextjs.org/)
* [React](https://reactjs.org/)
* [Tailwind](https://tailwindcss.com/)

<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here is what you need to be able to run Calendso.
* Node.js
* PostgreSQL
* Yarn _(recommended)_

You will also need Google API credentials. You can get this from the [Google API Console](https://console.cloud.google.com/apis/dashboard). More details on this can be found below under the [Obtaining the Google API Credentials section](#Obtaining-the-Google-API-Credentials).

### Development Setup

1. Clone the repo
   ```sh
   git clone https://github.com/calendso/calendso.git
   ```
2. Install packages with yarn
   ```sh
   yarn install
   ```
3. Copy .env.example to .env
4. Configure environment variables in the .env file. Replace \<user\>, \<pass\>, \<db-host\>, \<db-port\> with their applicable values
   ```
   DATABASE_URL='postgresql://<user>:<pass>@<db-host>:<db-port>'
   GOOGLE_API_CREDENTIALS='secret'
   ```
5. Set up the database using the Prisma schema
   ```sh
   npx prisma db push --preview-feature
   ```
6. Run (in development mode)
   ```sh
   yarn dev
   ```
7. Open the prisma schema (found in `prisma/schema.prisma`) with [Prisma Studio](https://www.prisma.io/studio)
8. Click on the user model to allow add a new user record.
9. Fill out the fields \(remembering to encrypt your password with [BCrypt](https://bcrypt-generator.com/)\) and click Save 1 Record to create your first user.
10. Open a browser to [http://localhost:3000](http://localhost:3000) and login with your first user.
<!-- ROADMAP -->
## Roadmap

See the [open issues](https://github.com/calendso/calendso/issues) for a list of proposed features (and known issues).

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.


1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request


## Obtaining the Google API Credentials

1. Open [Google API Console](https://console.cloud.google.com/apis/dashboard). If you don't have a project in your Google Cloud subscription, you'll need to create one before proceeding further. Under Dashboard pane, select Enable APIS and Services.
2. In the search box, type calendar and select the Google Calendar API search result.
3. Enable the selected API.
4. Next, select OAuth consent screen from the side pane. Select the app app type (Internal or External) and enter the basic app details on the first page.
5. In the second page on Scopes, select Add or Remove Scopes. Search for Calendar.event and select the scope with scope value `.../auth/calendar.events` and select Update.
6. Next, under Test Users, add the Google account(s) you'll using. Make sure the details are correct on the last page of the wizard and your consent screen will be configured.
7. Now select Credentials from the side pane and then select Create Credentials. Select the OAuth Client ID option.
8. Select Web Application as the Application Type.
9. Under Authorized redirect URI's, select Add URI and then add the URI  `<CALENDSO URL>/api/integrations/googlecalendar/callback` replacing CALENDSO URL with the URI at which your application runs.
10. The key will be created and you will be redirected back to the Credentials page. Select the newly generated client ID under OAuth 2.0 Client IDs.
11. Select Download JSON. Copy the contents of this file and paste the entire JSON string in the .env file as the value for GOOGLE_API_CREDENTIALS key.


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements
Special thanks to these amazing projects which help power Calendso:
* [Next.js](https://nextjs.org/)
* [Day.js](https://day.js.org/)
* [Tailwind CSS](https://tailwindcss.com/)

[product-screenshot]: https://i.imgur.com/4yvFj2E.png
