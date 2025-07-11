import pkceChallenge from "pkce-challenge";

import { ADYEN_OAUTH_CONNECT_BASE_URL } from "../api/_adyenUrls";

//see https://docs.adyen.com/development-resources/oauth/integration/#step-21-construct-the-access-grant-url
export default async function createOAuthUrl({
  clientId,
  redirectUri,
  credentialId,
}: {
  clientId: string | null;
  redirectUri: string;
  credentialId: number;
}) {
  const codeChallengeMethod = "S256";
  const pkce = await pkceChallenge();
  const codeVerifier = pkce.code_verifier;
  const codeChallenge = pkce.code_challenge;
  const responseType = "code";
  const state = window.crypto.getRandomValues(new Uint8Array(32)).join("");

  //should mention all scopes here, that are selected while creating oAuth App in Adyen->Developers->oAuthapps
  //space separated for multiple scopes
  const scope = "psp.onlinepayment:write psp.webhook:write";

  const url =
    `${ADYEN_OAUTH_CONNECT_BASE_URL}` +
    `?client_id=${clientId}` +
    `&code_challenge_method=${codeChallengeMethod}` +
    `&code_challenge=${codeChallenge}` +
    `&response_type=${responseType}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${state}` +
    `&scope=${scope}`;

  localStorage.setItem(
    `appstore_install_${credentialId}`,
    JSON.stringify({ code_verifier: codeVerifier, state })
  );

  return url;
}
