export default {
  title: "Cal.com Docs",
  orgName: "Cal.com Inc.",
  feedback: {
    formspreeId: "mjvdozgr",
  },
  links: {
    slack: "https://cal.com/slack",
    discord: "https://go.cal.com/discord",
    github: "https://github.com/calcom/cal.com",
    twitter: "https://twitter.com/calcom",
    contactEmail: "contact@cal.com",
  },
  navbar: {
    tabs: [
      {
        label: "Pricing",
        href: "https://cal.com/pricing",
      },
      {
        label: "Infra",
        href: "https://cal.com/infrastructure",
      },
      {
        label: "Apps",
        href: "https://cal.com/apps",
      },
      {
        label: "Docs",
        href: "/docs",
      },
      {
        label: "Blog",
        href: "https://cal.com/blog",
      },
    ],
  },
  sidebar: [
    {
      title: "Introduction",
      kind: "group",
      pages: [
        {
          title: "Welcome",
          href: "/docs/introduction/welcome",
        },
        {
          title: "Quick Start",
          href: "/docs/introduction/quick-start",
          pages: [
            {
              title: "Sign up for a Cal.com account",
              href: "/docs/introduction/quick-start/sign-up-for-a-cal.com-account",
            },
            {
              title: "Complete your onboarding",
              href: "/docs/introduction/quick-start/complete-your-onboarding",
            },
            {
              title: "Self-hosting",
              href: "/docs/introduction/quick-start/self-hosting",
              pages: [
                {
                  title: "Installation",
                  href: "/docs/introduction/quick-start/self-hosting/installation",
                  pages: [
                    {
                      title: "Enterprise",
                      href: "/docs/introduction/quick-start/self-hosting/installation/enterprise",
                    },
                    {
                      title: "Platform",
                      href: "/docs/introduction/quick-start/self-hosting/installation/platform",
                      pages: [
                        {
                          title: "Get access to the API",
                          href: "/docs/introduction/quick-start/self-hosting/installation/platform/get-access-to-the-api",
                        },
                        {
                          title: "API submodule",
                          href: "/docs/introduction/quick-start/self-hosting/installation/platform/api-submodule",
                        },
                      ],
                    },
                  ],
                },
                {
                  title: "Install apps",
                  href: "/docs/introduction/quick-start/self-hosting/install-apps",
                  pages: [
                    {
                      title: "Google",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/google",
                    },
                    {
                      title: "Microsoft",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/microsoft",
                    },
                    {
                      title: "Zoom",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/zoom",
                    },
                    {
                      title: "Daily",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/daily",
                    },
                    {
                      title: "HubSpot",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/hubspot",
                    },
                    {
                      title: "Sendgrid",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/sendgrid",
                    },
                    {
                      title: "Stripe",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/stripe",
                    },
                    {
                      title: "Twilio",
                      href: "/docs/introduction/quick-start/self-hosting/install-apps/twilio",
                    },
                  ],
                },
                {
                  title: "E2E testing",
                  href: "/docs/introduction/quick-start/self-hosting/e2e-testing",
                },
                {
                  title: "Upgrading",
                  href: "/docs/introduction/quick-start/self-hosting/upgrading",
                },
                {
                  title: "Docker",
                  href: "/docs/introduction/quick-start/self-hosting/docker",
                },
                {
                  title: "Vercel",
                  href: "/docs/introduction/quick-start/self-hosting/vercel",
                },
                {
                  title: "Database migrations",
                  href: "/docs/introduction/quick-start/self-hosting/database-migrations",
                },
                {
                  title: "SSO setup",
                  href: "/docs/introduction/quick-start/self-hosting/sso-setup",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Core Features",
      kind: "group",
      pages: [
        {
          title: "Event types",
          href: "/docs/core-features/event-types",
          pages: [
            {
              title: "Secret events",
              href: "/docs/core-features/event-types/secret-events",
            },
            {
              title: "Location of the event",
              href: "/docs/core-features/event-types/location-of-the-event",
            },
            {
              title: "Availability schedule",
              href: "/docs/core-features/event-types/availability-schedule",
            },
            {
              title: "Multiple durations",
              href: "/docs/core-features/event-types/multiple-durations",
            },
            {
              title: "Event buffer",
              href: "/docs/core-features/event-types/event-buffer",
            },
            {
              title: "Custom time-slot intervals",
              href: "/docs/core-features/event-types/custom-time-slot-intervals",
            },
            {
              title: "Custom event name in the booking",
              href: "/docs/core-features/event-types/custom-event-name-in-the-booking",
            },
            {
              title: "Minimum notice",
              href: "/docs/core-features/event-types/minimum-notice",
            },
            {
              title: "Booking frequency",
              href: "/docs/core-features/event-types/booking-frequency",
            },
            {
              title: "Limit future bookings",
              href: "/docs/core-features/event-types/limit-future-bookings",
            },
            {
              title: "Add events to calendar",
              href: "/docs/core-features/event-types/add-events-to-calendar",
            },
            {
              title: "Booking questions",
              href: "/docs/core-features/event-types/booking-questions",
            },
            {
              title: "Requires confirmation",
              href: "/docs/core-features/event-types/requires-confirmation",
            },
            {
              title: "Hide notes in calendar",
              href: "/docs/core-features/event-types/hide-notes-in-calendar",
            },
            {
              title: "Require additional notes",
              href: "/docs/core-features/event-types/require-additional-notes",
            },
            {
              title: "Booking success URL",
              href: "/docs/core-features/event-types/booking-success-url",
            },
            {
              title: "Single use private links",
              href: "/docs/core-features/event-types/single-use-private-links",
            },
            {
              title: "Offer seats",
              href: "/docs/core-features/event-types/offer-seats",
            },
            {
              title: "Recurring events",
              href: "/docs/core-features/event-types/recurring-events",
            },
            {
              title: "Disable guests",
              href: "/docs/core-features/event-types/disable-guests",
            },
          ],
        },
        {
          title: "Bookings",
          href: "/docs/core-features/bookings",
          pages: [
            {
              title: "Paid bookings",
              href: "/docs/core-features/bookings/paid-bookings",
            },
            {
              title: "Prefill fields",
              href: "/docs/core-features/bookings/prefill-fields",
            },
          ],
        },
        {
          title: "Availability",
          href: "/docs/core-features/availability",
          pages: [
            {
              title: "Multiple time slots per day",
              href: "/docs/core-features/availability/multiple-time-slots-per-day",
            },
            {
              title: "Date overrides",
              href: "/docs/core-features/availability/date-overrides",
            },
            {
              title: "Multiple schedules",
              href: "/docs/core-features/availability/multiple-schedules",
            },
          ],
        },
        {
          title: "App Store",
          href: "/docs/core-features/app-store",
          pages: [
            {
              title: "Apps",
              href: "/docs/core-features/app-store/apps",
            },
          ],
        },
        {
          title: "Webhooks",
          href: "/docs/core-features/webhooks",
        },
        {
          title: "Embed",
          href: "/docs/core-features/embed",
          pages: [
            {
              title: "Adding embed to your webpage",
              href: "/docs/core-features/embed/adding-embed-to-your-webpage",
            },
            {
              title: "Embed snippet generator",
              href: "/docs/core-features/embed/embed-snippet-generator",
            },
            {
              title: "Embed events",
              href: "/docs/core-features/embed/embed-events",
            },
            {
              title: "Embed instructions",
              href: "/docs/core-features/embed/embed-instructions",
            },
            {
              title: "Adding slots to your email",
              href: "/docs/core-features/embed/adding-slots-to-your-email",
            },
            {
              title: "Prefill booking form in embed",
              href: "/docs/core-features/embed/prefill-booking-form-in-embed",
            },
          ],
        },
        {
          title: "Dynamic group links",
          href: "/docs/core-features/dynamic-group-links",
        },
        {
          title: "Customization",
          href: "/docs/core-features/customization",
        },
        {
          title: "i18n Internationalization",
          href: "/docs/core-features/i18n-internationalization",
        },
      ],
    },
    {
      title: "Enterprise Features",
      kind: "group",
      pages: [
        {
          title: "Teams",
          href: "/docs/enterprise-features/teams",
          pages: [
            {
              title: "Team workflows",
              href: "/docs/enterprise-features/teams/team-workflows",
            },
            {
              title: "Round-robin scheduling",
              href: "/docs/enterprise-features/teams/round-robin-scheduling",
            },
            {
              title: "Collective events",
              href: "/docs/enterprise-features/teams/collective-events",
            },
            {
              title: "Managed Events",
              href: "/docs/enterprise-features/teams/managed-events",
            },
            {
              title: "Advanced routing forms",
              href: "/docs/enterprise-features/teams/advanced-routing-forms",
            },
            {
              title: "Cal Video Recordings",
              href: "/docs/enterprise-features/teams/cal-video-recordings",
            },
          ],
        },
        {
          title: "API",
          href: "/docs/enterprise-features/api",
          pages: [
            {
              title: "Quick start",
              href: "/docs/enterprise-features/api/quick-start",
              pages: [
                {
                  title: "Testing API locally",
                  href: "/docs/enterprise-features/api/quick-start/testing-api-locally",
                },
                {
                  title: "Hosted API through Cal.com",
                  href: "/docs/enterprise-features/api/quick-start/hosted-api-through-cal-com",
                },
              ],
            },
            {
              title: "Authentication",
              href: "/docs/enterprise-features/api/authentication",
            },
            {
              title: "Errors",
              href: "/docs/enterprise-features/api/errors",
            },
            {
              title: "Rate limits",
              href: "/docs/enterprise-features/api/rate-limits",
            },
            {
              title: "Versioning",
              href: "/docs/enterprise-features/api/versioning",
            },
            {
              title: "Types",
              href: "/docs/enterprise-features/api/types",
            },
            {
              title: "API reference",
              href: "/docs/enterprise-features/api/api-reference",
              pages: [
                {
                  title: "Attendees",
                  href: "/docs/enterprise-features/api/api-reference/attendees",
                },
                {
                  title: "Availabilities",
                  href: "/docs/enterprise-features/api/api-reference/availabilities",
                },
                {
                  title: "Availability",
                  href: "/docs/enterprise-features/api/api-reference/availability",
                },
                {
                  title: "Booking References",
                  href: "/docs/enterprise-features/api/api-reference/booking-references",
                },
                {
                  title: "Bookings",
                  href: "/docs/enterprise-features/api/api-reference/bookings",
                },
                {
                  title: "Destination calendars",
                  href: "/docs/enterprise-features/api/api-reference/destination-calendars",
                },
                {
                  title: "Event types",
                  href: "/docs/enterprise-features/api/api-reference/event-types",
                },
                {
                  title: "Memberships",
                  href: "/docs/enterprise-features/api/api-reference/memberships",
                },
                {
                  title: "Payments",
                  href: "/docs/enterprise-features/api/api-reference/payments",
                },
                {
                  title: "Schedules",
                  href: "/docs/enterprise-features/api/api-reference/schedules",
                },
                {
                  title: "Selected calendars",
                  href: "/docs/enterprise-features/api/api-reference/selected-calendars",
                },
                {
                  title: "Teams",
                  href: "/docs/enterprise-features/api/api-reference/teams",
                },
                {
                  title: "Users",
                  href: "/docs/enterprise-features/api/api-reference/users",
                },
                {
                  title: "Webhooks",
                  href: "/docs/enterprise-features/api/api-reference/webhooks",
                },
              ],
            },
          ],
        },
        {
          title: "Insights",
          href: "/docs/enterprise-features/insights",
        },
        {
          title: "Workflows",
          href: "/docs/enterprise-features/workflows",
        },
        {
          title: "Admin",
          href: "/docs/enterprise-features/admin",
        },
        {
          title: "Instance-wide theming using color tokens",
          href: "/docs/enterprise-features/instance-wide-theming",
        },
        {
          title:
            "Synchronizing third party apps with a self-hosted Cal.com instance",
          href: "/docs/enterprise-features/syncing-third-party-apps",
        },
      ],
    },
    {
      title: "Knowledgebase",
      kind: "group",
      pages: [
        {
          title: "Contributor's Guide",
          href: "/docs/knowledgebase/contributors-guide",
          pages: [
            {
              title: "Code styling",
              href: "/docs/knowledgebase/contributors-guide/code-styling",
            },
            {
              title: "Pull requests",
              href: "/docs/knowledgebase/contributors-guide/pull-requests",
            },
          ],
        },
        {
          title: "Glossary",
          href: "/docs/knowledgebase/glossary",
        },
      ],
    },
    {
      title: "How To Guides",
      kind: "group",
      pages: [
        {
          title: "Manage a license key",
          href: "/docs/how-to-guides/acquire-and-manage-a-license-key",
        },
        {
          title: "Adding your first app",
          href: "/docs/how-to-guides/adding-your-first-app",
        },
        {
          title: "Allowing Bookings That Meet a Custom Internal Criteria",
          href: "/docs/how-to-guides/allow-bookings-that-meet-a-custom-internal-criteria",
        },
        {
          title: "Can Cal.com sponsor my open source project?",
          href: "/docs/how-to-guides/can-calcom-sponsor-my-open-source-project",
        },
        {
          title: "Creating a recurring event",
          href: "/docs/how-to-guides/creating-a-recurring-event",
        },
        {
          title: "Creating a secret event type",
          href: "/docs/how-to-guides/creating-a-secret-event-type",
        },
        {
          title: "Creating your first event type",
          href: "/docs/how-to-guides/creating-your-first-event-type",
        },
        {
          title: "How to add a location to your event type",
          href: "/docs/how-to-guides/how-to-add-a-location-to-your-event-type",
        },
        {
          title: "How to add custom CSS",
          href: "/docs/how-to-guides/how-to-add-custom-css",
        },
        {
          title: "Adding Zoom as the Meeting Location for Your Event Types",
          href: "/docs/how-to-guides/how-to-add-zoom-as-meeting-location",
        },
        {
          title: "How to build an app",
          href: "/docs/how-to-guides/how-to-build-an-app",
          pages: [
            {
              title: "Build a greeter app",
              href: "/docs/how-to-guides/how-to-build-an-app/build-a-greeter-app",
            },
          ],
        },
        {
          title: "Connect apple calendar with calcom",
          href: "/docs/how-to-guides/how-to-connect-apple-calendar-with-calcom",
        },
        {
          title: "How to get notified on slack whenever you're booked",
          href: "/docs/how-to-guides/how-to-get-slack-notification-on-booking",
        },
        {
          title: "How to set buffer time",
          href: "/docs/how-to-guides/how-to-set-buffer-time",
        },
        {
          title: "How to set up requires confirmation",
          href: "/docs/how-to-guides/how-to-set-up-requires-confirmation",
        },
        {
          title: "How to set up OIDC with Okta",
          href: "/docs/how-to-guides/how-to-setup-oidc-with-okta",
        },
        {
          title:
            "How to split fullname into firstname and lastname in the public booking page",
          href: "/docs/how-to-guides/how-to-split-firstname-lastname-booking",
        },
        {
          title: "How to hide and prefill booking questions in embeds",
          href: "/docs/how-to-guides/how-to-hide-and-prefill-booking-question-in-embeds",
        },
        {
          title: "How to set time-slot intervals",
          href: "/docs/how-to-guides/how-to-set-time-slot-intervals",
        },
        {
          title: "How to set up an event type to receive payments",
          href: "/docs/how-to-guides/how-to-set-up-an-event-type-to-receive-payments",
        },
        {
          title: "How to test API in a local instance",
          href: "/docs/how-to-guides/how-to-test-api-in-a-local-instance",
        },
        {
          title: "How to troubleshoot symbolic link issues on Windows",
          href: "/docs/how-to-guides/how-to-troubleshoot-symbolic-link-issues-on-windows",
        },
        {
          title:
            "How to use open-source scheduling infrastructure with HubSpot",
          href: "/docs/how-to-guides/how-to-use-open-source-scheduling-infrastructure-with-hubspot",
        },
        {
          title:
            "How to sync third party apps with a self-hosted Cal.com instance",
          href: "/docs/how-to-guides/syncing-third-party-apps-with-self-hosted-cal-com",
        },
        {
          title: "How to white label the self hosted instance",
          href: "/docs/how-to-guides/how-to-white-label-the-self-hosted-instance",
        },
        {
          title: "Setting up mailtrap for email testing",
          href: "/docs/how-to-guides/setting-up-mailtrap-for-email-testing",
        },
        {
          title: "Setting up your availability",
          href: "/docs/how-to-guides/setting-up-your-availability",
          pages: [
            {
              title: "Adding date override",
              href: "/docs/how-to-guides/setting-up-your-availability/adding-date-override",
            },
          ],
        },
        {
          title: "Providing necessary google calendar integration permissions",
          href: "/docs/how-to-guides/providing-necessary-permission-to-google-calendar",
        },
        {
          title: "Quick actions using command bar",
          href: "/docs/how-to-guides/quick-actions-using-command-bar",
        },
      ],
    },
  ],
};
