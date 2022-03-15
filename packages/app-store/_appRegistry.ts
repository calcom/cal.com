import { App } from "@calcom/types/App";

import appStore from ".";

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export function getAppRegistry() {
  return [
    ...Object.values(appStore).map((app) => {
      // Let's not leak api keys to the front end
      const { key, ...metadata } = app.metadata;
      return metadata;
    }),
    /** TODO: Migrate these to App store */
    {
      name: "Stripe",
      slug: "stripe_payment",
      category: "payment",
      description: "Stripe is the world's leading payment provider. Start charging for your bookings today.",
      logo: "/apps/stripe.svg",
      rating: 4.6,
      trending: true,
      reviews: 69,
    },
    {
      name: "CalDAV",
      slug: "caldav",
      category: "calendar",
      description: "CalDAV is an open calendar standard which connects to virtually every calendar.",
      logo: "/apps/caldav.svg",
      rating: 3.6,
      reviews: 69,
    },
  ] as App[];
}
