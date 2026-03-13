/** @type {import('@tomehq/core').TomeConfig} */
export default {
  name: "Cal.diy Docs",
  theme: {
    preset: "amber",
    mode: "auto",
  },
  logo: {
    light: "/cal-docs-logo.svg",
    dark: "/cal-docs-logo-white.svg",
  },
  navigation: [
    {
      group: "Getting Started",
      pages: ["index", "installation", "database-migrations", "upgrading", "docker"],
    },
    {
      group: "Apps",
      pages: [
        "apps/google",
        "apps/microsoft",
        "apps/zoom",
        "apps/daily",
        "apps/hubspot",
        "apps/sendgrid",
        "apps/stripe",
        "apps/twilio",
        "apps/zoho",
      ],
    },
    {
      group: "Deployments",
      pages: [
        "deployments/aws",
        "deployments/azure",
        "deployments/elestio",
        "deployments/gcp",
        "deployments/northflank",
        "deployments/railway",
        "deployments/render",
        "deployments/vercel",
      ],
    },
  ],
};
