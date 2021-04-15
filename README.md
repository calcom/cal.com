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

You will also need Google API credentials. You can get this from the [Google API Console](https://console.cloud.google.com/apis/dashboard). Simply create a new project, set the OAuth to use the calendar.events read and write permissions, and then set the callback URL to `<CALENDSO-URL>/api/integrations/googlecalendar/callback`.

### Development Setup

1. Clone the repo
   ```sh
   git clone https://github.com/calendso/calendso.git
   ```
2. Install packages with yarn
   ```sh
   yarn install
   ```
3. Copy `.env.example` to `.env`
4. Configure environment variables in the .env file. Replace `<user>`, `<pass>`, `<db-host>`, `<db-port>` with their applicable values
   ```
   DATABASE_URL='postgresql://<user>:<pass>@<db-host>:<db-port>'
   GOOGLE_API_CREDENTIALS='secret'
   ```
5. Set up the database using the Prisma schema (found in `prisma/schema.prisma`)
   ```sh
   npx prisma db push --preview-feature
   ```
6. Run (in development mode)
   ```sh
   yarn dev
   ```
7. Open [Prisma Studio](https://www.prisma.io/studio) to look at or modify the database content:
   ```
   npx prisma studio
   ```
9. Click on the `User` model to add a new user record.
10. Fill out the fields (remembering to encrypt your password with [BCrypt](https://bcrypt-generator.com/)) and click `Save 1 Record` to create your first user.
11. Open a browser to [http://localhost:3000](http://localhost:3000) and login with your just created, first user.

<!-- ROADMAP -->
## Roadmap

See the [open issues](https://github.com/calendso/calendso/issues) for a list of proposed features (and known issues).

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a pull request

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
