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

### Development Setup

1. Clone the repo
   ```sh
   git clone https://github.com/calendso/calendso.git
   ```
2. Install packages with yarn
   ```sh
   yarn install
   ```
3. Configure environment variables
   ```
   DATABASE_URL='postgresql://'
   GOOGLE_API_CREDENTIALS='secret'
   ```
4. Set up the database using the Prisma schema
   ```sh
   npx prisma db push --preview-feature
   ```
5. Run (in development mode)
   ```sh
   yarn dev
   ```

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

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements
Special thanks to these amazing projects which help power Calendso:
* [Next.js](https://nextjs.org/)
* [Day.js](https://day.js.org/)
* [Tailwind CSS](https://tailwindcss.com/)

[product-screenshot]: https://calendso.com/calendso-screenshot.jpg
