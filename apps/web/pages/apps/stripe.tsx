import App from "@components/App";

export default function Stripe() {
  return (
    <App
      name="Stripe"
      logo="/apps/stripe.svg"
      categories={["payments"]}
      author="Cal.com"
      type="usage-based" // "usage-based" or "monthly" or "one-time"
      price={0.1} // price per installation. if "monthly" = price per month. if type="usage-based" = price per booking
      commission={0} // only required for "usage-based" billing. % of commission for paid bookings
      docs="https://stripe.com/docs"
      website="https://zoom.us"
      email="support@zoom.us"
      tos="https://zoom.us/terms"
      privacy="https://zoom.us/privacy"
      body={
        <>
          Stripe provides payments infrastructure for the internet. Millions of businesses of all sizes—from
          startups to large enterprises—use Stripe&apos;s software and APIs to accept payments, send payouts,
          and manage their businesses online.
          <br />
          <br />
          Use this Stripe App, build by the Cal.com team to start charging for your bookings today.
        </>
      }
    />
  );
}
