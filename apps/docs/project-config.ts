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
        href: "",
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
          href: "/introduction/welcome",
        },
        {
          title: "Quick Start",
          href: "/introduction/quick-start",
          pages: [
            {
              title: "Sign up for a Cal.com account",
              href: "/introduction/quick-start/sign-up-for-a-cal.com-account",
            },
            {
              title: "Complete your onboarding",
              href: "/introduction/quick-start/complete-your-onboarding",
            },
            {
              title: "Self-hosting",
              href: "/introduction/quick-start/self-hosting",
              pages: [
                {
                  title: "Installation",
                  href: "/introduction/quick-start/self-hosting/installation",
                  pages: [
                    {
                      title: "Enterprise",
                      href: "/introduction/quick-start/self-hosting/installation/enterprise",
                    },
                    {
                      title: "Platform",
                      href: "/introduction/quick-start/self-hosting/installation/platform",
                      pages: [
                        {
                          title: "Get access to the API",
                          href: "/introduction/quick-start/self-hosting/installation/platform/get-access-to-the-api",
                        },
                        {
                          title: "API submodule",
                          href: "/introduction/quick-start/self-hosting/installation/platform/api-submodule",
                        },
                      ],
                    },
                  ],
                },
                {
                  title: "Install apps",
                  href: "/introduction/quick-start/self-hosting/install-apps",
                  pages: [
                    {
                      title: "Google",
                      href: "/introduction/quick-start/self-hosting/install-apps/google",
                    },
                    {
                      title: "Microsoft",
                      href: "/introduction/quick-start/self-hosting/install-apps/microsoft",
                    },
                    {
                      title: "Zoom",
                      href: "/introduction/quick-start/self-hosting/install-apps/zoom",
                    },
                    {
                      title: "Daily",
                      href: "/introduction/quick-start/self-hosting/install-apps/daily",
                    },
                    {
                      title: "HubSpot",
                      href: "/introduction/quick-start/self-hosting/install-apps/hubspot",
                    },
                    {
                      title: "Sendgrid",
                      href: "/introduction/quick-start/self-hosting/install-apps/sendgrid",
                    },
                    {
                      title: "Stripe",
                      href: "/introduction/quick-start/self-hosting/install-apps/stripe",
                    },
                    {
                      title: "Twilio",
                      href: "/introduction/quick-start/self-hosting/install-apps/twilio",
                    },
                  ],
                },
                {
                  title: "E2E testing",
                  href: "/introduction/quick-start/self-hosting/e2e-testing",
                },
                {
                  title: "Upgrading",
                  href: "/introduction/quick-start/self-hosting/upgrading",
                },
                {
                  title: "Docker",
                  href: "/introduction/quick-start/self-hosting/docker",
                },
                {
                  title: "Vercel",
                  href: "/introduction/quick-start/self-hosting/vercel",
                },
                {
                  title: "Database migrations",
                  href: "/introduction/quick-start/self-hosting/database-migrations",
                },
                {
                  title: "SSO setup",
                  href: "/introduction/quick-start/self-hosting/sso-setup",
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
          href: "/core-features/event-types",
          pages: [
            {
              title: "Secret events",
              href: "/core-features/event-types/secret-events",
            },
            {
              title: "Location of the event",
              href: "/core-features/event-types/location-of-the-event",
            },
            {
              title: "Availability schedule",
              href: "/core-features/event-types/availability-schedule",
            },
            {
              title: "Multiple durations",
              href: "/core-features/event-types/multiple-durations",
            },
            {
              title: "Event buffer",
              href: "/core-features/event-types/event-buffer",
            },
            {
              title: "Custom time-slot intervals",
              href: "/core-features/event-types/custom-time-slot-intervals",
            },
            {
              title: "Custom event name in the booking",
              href: "/core-features/event-types/custom-event-name-in-the-booking",
            },
            {
              title: "Minimum notice",
              href: "/core-features/event-types/minimum-notice",
            },
            {
              title: "Booking frequency",
              href: "/core-features/event-types/booking-frequency",
            },
            {
              title: "Limit future bookings",
              href: "/core-features/event-types/limit-future-bookings",
            },
            {
              title: "Add events to calendar",
              href: "/core-features/event-types/add-events-to-calendar",
            },
            {
              title: "Booking questions",
              href: "/core-features/event-types/booking-questions",
            },
            {
              title: "Requires confirmation",
              href: "/core-features/event-types/requires-confirmation",
            },
            {
              title: "Hide notes in calendar",
              href: "/core-features/event-types/hide-notes-in-calendar",
            },
            {
              title: "Require additional notes",
              href: "/core-features/event-types/require-additional-notes",
            },
            {
              title: "Booking success URL",
              href: "/core-features/event-types/booking-success-url",
            },
            {
              title: "Single use private links",
              href: "/core-features/event-types/single-use-private-links",
            },
            {
              title: "Offer seats",
              href: "/core-features/event-types/offer-seats",
            },
            {
              title: "Recurring events",
              href: "/core-features/event-types/recurring-events",
            },
            {
              title: "Disable guests",
              href: "/core-features/event-types/disable-guests",
            },
          ],
        },
        {
          title: "Bookings",
          href: "/core-features/bookings",
          pages: [
            {
              title: "Paid bookings",
              href: "/core-features/bookings/paid-bookings",
            },
            {
              title: "Prefill fields",
              href: "/core-features/bookings/prefill-fields",
            },
          ],
        },
        {
          title: "Availability",
          href: "/core-features/availability",
          pages: [
            {
              title: "Multiple time slots per day",
              href: "/core-features/availability/multiple-time-slots-per-day",
            },
            {
              title: "Date overrides",
              href: "/core-features/availability/date-overrides",
            },
            {
              title: "Multiple schedules",
              href: "/core-features/availability/multiple-schedules",
            },
          ],
        },
        {
          title: "App Store",
          href: "/core-features/app-store",
          pages: [
            {
              title: "Apps",
              href: "/core-features/app-store/apps",
            },
          ],
        },
        {
          title: "Webhooks",
          href: "/core-features/webhooks",
        },
        {
          title: "Embed",
          href: "/core-features/embed",
          pages: [
            {
              title: "Adding embed to your webpage",
              href: "/core-features/embed/adding-embed-to-your-webpage",
            },
            {
              title: "Embed snippet generator",
              href: "/core-features/embed/embed-snippet-generator",
            },
            {
              title: "Embed events",
              href: "/core-features/embed/embed-events",
            },
            {
              title: "Embed instructions",
              href: "/core-features/embed/embed-instructions",
            },
            {
              title: "Adding slots to your email",
              href: "/core-features/embed/adding-slots-to-your-email",
            },
            {
              title: "Prefill booking form in embed",
              href: "/core-features/embed/prefill-booking-form-in-embed",
            },
          ],
        },
        {
          title: "Dynamic group links",
          href: "/core-features/dynamic-group-links",
        },
        {
          title: "Customization",
          href: "/core-features/customization",
        },
        {
          title: "i18n Internationalization",
          href: "/core-features/i18n-internationalization",
        },
      ],
    },
    {
      title: "Enterprise Features",
      kind: "group",
      pages: [
        {
          title: "Teams",
          href: "/enterprise-features/teams",
          pages: [
            {
              title: "Team workflows",
              href: "/enterprise-features/teams/team-workflows",
            },
            {
              title: "Round-robin scheduling",
              href: "/enterprise-features/teams/round-robin-scheduling",
            },
            {
              title: "Collective events",
              href: "/enterprise-features/teams/collective-events",
            },
            {
              title: "Managed Events",
              href: "/enterprise-features/teams/managed-events",
            },
            {
              title: "Advanced routing forms",
              href: "/enterprise-features/teams/advanced-routing-forms",
            },
            {
              title: "Cal Video Recordings",
              href: "/enterprise-features/teams/cal-video-recordings",
            },
          ],
        },
        {
          title: "API",
          href: "/enterprise-features/api",
          pages: [
            {
              title: "Quick start",
              href: "/enterprise-features/api/quick-start",
              pages: [
                {
                  title: "Testing API locally",
                  href: "/enterprise-features/api/quick-start/testing-api-locally",
                },
              ],
            },
            {
              title: "Authentication",
              href: "/enterprise-features/api/authentication",
            },
            {
              title: "Errors",
              href: "/enterprise-features/api/errors",
            },
            {
              title: "Rate limits",
              href: "/enterprise-features/api/rate-limits",
            },
            {
              title: "Versioning",
              href: "/enterprise-features/api/versioning",
            },
            {
              title: "Types",
              href: "/enterprise-features/api/types",
            },
            {
              title: "API reference",
              href: "/enterprise-features/api/api-reference",
              pages: [
                {
                  title: "Attendees",
                  href: "/enterprise-features/api/api-reference/attendees",
                },
                {
                  title: "Availabilities",
                  href: "/enterprise-features/api/api-reference/availabilities",
                },
                {
                  title: "Availability",
                  href: "/enterprise-features/api/api-reference/availability",
                },
                {
                  title: "Booking References",
                  href: "/enterprise-features/api/api-reference/booking-references",
                },
                {
                  title: "Bookings",
                  href: "/enterprise-features/api/api-reference/bookings",
                },
                {
                  title: "Destination calendars",
                  href: "/enterprise-features/api/api-reference/destination-calendars",
                },
                {
                  title: "Event types",
                  href: "/enterprise-features/api/api-reference/event-types",
                },
                {
                  title: "Me",
                  href: "/enterprise-features/api/api-reference/me",
                },
                {
                  title: "Memberships",
                  href: "/enterprise-features/api/api-reference/memberships",
                },
                {
                  title: "Payments",
                  href: "/enterprise-features/api/api-reference/payments",
                },
                {
                  title: "Schedules",
                  href: "/enterprise-features/api/api-reference/schedules",
                },
                {
                  title: "Selected calendars",
                  href: "/enterprise-features/api/api-reference/selected-calendars",
                },
                {
                  title: "Slots",
                  href: "/enterprise-features/api/api-reference/slots",
                },
                {
                  title: "Teams",
                  href: "/enterprise-features/api/api-reference/teams",
                },
                {
                  title: "Users",
                  href: "/enterprise-features/api/api-reference/users",
                },
                {
                  title: "Webhooks",
                  href: "/enterprise-features/api/api-reference/webhooks",
                },
              ],
            },
          ],
        },
        {
          title: "Insights",
          href: "/enterprise-features/insights",
        },
        {
          title: "Workflows",
          href: "/enterprise-features/workflows",
        },
        {
          title: "Admin",
          href: "/enterprise-features/admin",
        },
        {
          title: "Instance-wide theming using color tokens",
          href: "/enterprise-features/instance-wide-theming",
        },
        {
          title:
            "Synchronizing third party apps with a self-hosted Cal.com instance",
          href: "/enterprise-features/syncing-third-party-apps",
        },
      ],
    },
    {
      title: "Platform",
      kind: "group",
      pages: [
        {
          title: "Welcome",
          href: "/platform"
        },
        {
          title: "Quickstart",
          href: "/platform/quick-start"
        },
        {
          title: "Booking redirects",
          href: "/platform/booking-redirects"
        },
        {
          title: "Atoms reference",
          href: "/platform/atoms-reference"
        },
        {
          title: "FAQ",
          href: "/platform/faq"
        }
      ]
    },
    {
      title: "Knowledgebase",
      kind: "group",
      pages: [
        {
          title: "Contributor's Guide",
          href: "/knowledgebase/contributors-guide",
          pages: [
            {
              title: "Code styling",
              href: "/knowledgebase/contributors-guide/code-styling",
            },
            {
              title: "Pull requests",
              href: "/knowledgebase/contributors-guide/pull-requests",
            },
          ],
        },
        {
          title: "Glossary",
          href: "/knowledgebase/glossary",
        },
      ],
    },
    {
      title: "How To Guides",
      kind: "group",
      pages: [
        {
          title: "App store and integrations",
          href: "/how-to-guides/app-store-and-integrations",
          pages: [
            {
              title: "Adding your first app",
              href: "/how-to-guides/app-store-and-integrations/adding-your-first-app",
            },
            {
              title: "How to build an app",
              href: "/how-to-guides/app-store-and-integrations/how-to-build-an-app",
            },
            {
              title: "Build a greeter app",
              href: "/how-to-guides/app-store-and-integrations/build-a-greeter-app",
            },
            {
              title: "How to use OAuth to authorize apps with cal.com accounts",
              href: "/how-to-guides/app-store-and-integrations/oauth",
            },
            {
              title:
                "How to sync third party apps with a self-hosted Cal.com instance",
              href: "/how-to-guides/app-store-and-integrations/syncing-third-party-apps-with-self-hosted-cal-com",
            },
            {
              title:
                "How to use open-source scheduling infrastructure with HubSpot",
              href: "/how-to-guides/app-store-and-integrations/how-to-use-open-source-scheduling-infrastructure-with-hubspot",
            },
            {
              title: "How to show and assign people from a CRM",
              href: "/how-to-guides/app-store-and-integrations/how-to-show-assigned-people-from-a-crm",
            },
          ]
        },
        {
          title: "Auth and provision",
          href: "/how-to-guides/auth-and-provision",
          pages: [
            {
              title: "How to set up OIDC with Okta",
              href: "/how-to-guides/auth-and-provision/how-to-setup-oidc-with-okta",
            },
            {
              title: "How to set up SCIM with Okta",
              href: "/how-to-guides/auth-and-provision/how-to-setup-scim-with-okta",
            },
          ]
        },
        {
          title: "Availability",
          href: "/how-to-guides/availability",
          pages: [
            {
              title: "Adding date override",
              href: "/how-to-guides/availability/adding-date-override",
            },
            {
              title: "Setting up your availability",
              href: "/how-to-guides/availability/setting-up-your-availability"
            },
          ]
        },
        {
          title: "Bookings",
          href: "/how-to-guides/bookings",
          pages: [
            {
              title: "Allowing Bookings That Meet a Custom Internal Criteria",
              href: "/how-to-guides/bookings/allow-bookings-that-meet-a-custom-internal-criteria",
            },
            {
              title: "How to get notified on slack whenever you're booked",
              href: "/how-to-guides/bookings/how-to-get-slack-notification-on-booking",
            },
            {
              title: "How to hide and prefill booking questions in embeds",
              href: "/how-to-guides/bookings/how-to-hide-and-prefill-booking-question-in-embeds",
            },
            {
              title:
                "How to split fullname into firstname and lastname in the public booking page",
              href: "/how-to-guides/bookings/how-to-split-firstname-lastname-booking",
            },
          ]
        },
        {
          title: "Calendar",
          href: "/how-to-guides/calendar",
          pages: [
            {
              title: "Connect apple calendar with calcom",
              href: "/how-to-guides/calendar/how-to-connect-apple-calendar-with-calcom",
            },
            {
              title: "Providing necessary google calendar integration permissions",
              href: "/how-to-guides/calendar/providing-necessary-permission-to-google-calendar",
            },
          ]
        },
        {
          title: "Event types",
          href: "/how-to-guides/event-types",
          pages: [
            {
              title: "Creating a recurring event",
              href: "/how-to-guides/event-types/creating-a-recurring-event",
            },
            {
              title: "Creating a secret event type",
              href: "/how-to-guides/event-types/creating-a-secret-event-type",
            },
            {
              title: "Creating your first event type",
              href: "/how-to-guides/event-types/creating-your-first-event-type",
            },
            {
              title: "How to add a location to your event type",
              href: "/how-to-guides/event-types/how-to-add-a-location-to-your-event-type",
            },
            {
              title: "Adding Zoom as the Meeting Location for Your Event Types",
              href: "/how-to-guides/event-types/how-to-add-zoom-as-meeting-location",
            },
            {
              title: "How to set buffer time",
              href: "/how-to-guides/event-types/how-to-set-buffer-time",
            },
            {
              title: "How to set up requires confirmation",
              href: "/how-to-guides/event-types/how-to-set-up-requires-confirmation",
            },
            {
              title: "How to set time-slot intervals",
              href: "/how-to-guides/event-types/how-to-set-time-slot-intervals",
            },
            {
              title: "How to set up an event type to receive payments",
              href: "/how-to-guides/event-types/how-to-create-paid-events",
            },
            {
              title: "Setting up location of team events",
              href: "/how-to-guides/event-types/setting-up-location-of-team-events",
            }
          ]
        },
        {
          title: "Self Hosting",
          href: "/how-to-guides/self-hosting",
          pages: [
            {
              title: "Manage a license key",
              href: "/how-to-guides/self-hosting/acquire-and-manage-a-license-key",
            },
            {
              title: "How to add custom CSS",
              href: "/how-to-guides/self-hosting/how-to-add-custom-css",
            },
            {
              title: "How to test API in a local instance",
              href: "/how-to-guides/self-hosting/how-to-set-up-api-in-a-local-instance",
            },
            {
              title: "Setting up mailtrap for email testing",
              href: "/how-to-guides/self-hosting/setting-up-mailtrap-for-email-testing",
            }
          ]
        },
        {
          title: "White Labeling",
          href: "/how-to-guides/whitelabel",
          pages: [
            {
              title: "How to white label the self hosted instance",
              href: "/how-to-guides/whitelabel/self-hosted-instance",
            },
          ]
        },
        {
          title: "Can Cal.com sponsor my open source project?",
          href: "/how-to-guides/can-calcom-sponsor-my-open-source-project",
        },
        {
          title: "Quick actions using command bar",
          href: "/how-to-guides/quick-actions-using-command-bar",
        },
      ],
    },
    {
      title: "Troubleshooting Guides",
      kind: "group",
      pages: [
        {
          title: "Problems related to the booking page",
          href: "/troubleshooting-guides/booking-page",
          pages: [
            {
              title: "Event Type slot display issues",
              href: "/troubleshooting-guides/booking-page/event-type-slot-availability-issues",
            }
          ]
        },
        {
          title: "Problems related to self hosting",
          href: "/troubleshooting-guides/self-hosting",
          pages: [
            {
              title: "How to troubleshoot symbolic link issues on Windows",
              href: "/troubleshooting-guides/self-hosting/symbolic-link-issues-on-windows",
            },
          ]
        }
      ],
    },
  ],
};
