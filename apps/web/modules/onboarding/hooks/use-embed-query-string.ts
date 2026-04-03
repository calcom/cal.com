"use client";

import { useSearchParams } from "next/navigation";

export const EMBED_PARAMS = ["onboardingEmbed", "client_id", "scope", "state", "redirect_uri", "email", "name", "username", "theme", "code_challenge", "code_challenge_method"] as const;

export const useEmbedQueryString = () => {
  const searchParams = useSearchParams();

  const params: Record<(typeof EMBED_PARAMS)[number], string> = {
    onboardingEmbed: "",
    client_id: "",
    scope: "",
    state: "",
    redirect_uri: "",
    email: "",
    name: "",
    username: "",
    theme: "",
    code_challenge: "",
    code_challenge_method: "",
  };

  const query = new URLSearchParams();
  for (const param of EMBED_PARAMS) {
    const value = searchParams?.get(param) ?? "";
    params[param] = value;
    if (value) query.set(param, value);
  }

  return { queryString: query.toString(), ...params };
};
