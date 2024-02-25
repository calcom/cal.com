import Script from "next/script";

export default function Turnstile() {
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async={true} defer={true} />
      <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_CLOUDFLARE_SITEKEY} />
    </>
  );
}
