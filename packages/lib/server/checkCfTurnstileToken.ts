const TUNRSTILE_SITE_ID = process.env.CLOUDFLARE_TURNSTILE_SECRET;
export async function checkCfTurnstileToken({ token, remoteIp }: { token?: string; remoteIp: string }) {
  if (!TUNRSTILE_SITE_ID) {
    return {
      success: true,
      error: null,
    };
  }

  if (!token) {
    return {
      success: false,
      error: "no_cf_token_present",
    };
  }

  console.log({ token, remoteIp });

  const form = new URLSearchParams();
  form.append("secret", TUNRSTILE_SITE_ID);
  form.append("response", token);
  form.append("remoteip", remoteIp);

  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const json = await result.json();
}
