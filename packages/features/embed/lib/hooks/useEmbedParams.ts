import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

import type { EmbedType } from "../../types";
import { useEmbedDialogCtx } from "./useEmbedDialogCtx";

type EmbedParams = {
  embedType: EmbedType | null;
  embedUrl: string;
  namespace: string;
  embedTabName: string | null;
  eventId: string | null;
  date: string | null;
  month: string | null;
};

export function useEmbedParams(noQueryParamMode = false): EmbedParams {
  const searchParams = useCompatSearchParams();
  const { embedState } = useEmbedDialogCtx(noQueryParamMode);

  return noQueryParamMode
    ? {
        embedType: embedState?.embedType ?? null,
        embedUrl: embedState?.embedUrl ?? "",
        namespace: embedState?.namespace ?? "",
        embedTabName: embedState?.embedTabName ?? null,
        eventId: embedState?.eventId ?? null,
        date: embedState?.date ?? null,
        month: embedState?.month ?? null,
      }
    : {
        embedType: (searchParams?.get("embedType") as EmbedType) ?? null,
        embedUrl: (searchParams?.get("embedUrl") || "") as string,
        namespace: (searchParams?.get("namespace") || "") as string,
        embedTabName: (searchParams?.get("embedTabName") || "") as string,
        eventId: (searchParams?.get("eventId") || "") as string,
        date: (searchParams?.get("date") || "") as string,
        month: (searchParams?.get("month") || "") as string,
      };
}
