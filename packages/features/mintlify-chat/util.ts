/**
 * This file contains utility functions for interacting with the Mintlify chat API.
 * The code was adapted from https://mintlify.com/docs/advanced/rest-api/overview#getting-started. The original source can be found at https://github.com/mintlify/discovery-api-example/tree/main/src/utils.
 */

const API_KEY = process.env.NEXT_PUBLIC_MINTLIFY_CHAT_API_KEY;
const apiBaseUrl = process.env.NEXT_PUBLIC_CHAT_API_URL;

export const createChat = async () => {
  if (!API_KEY || !apiBaseUrl) return;

  const topicResponse = await fetch(`${apiBaseUrl}/topic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!topicResponse.ok) {
    return;
  }

  const topic: unknown = await topicResponse.json();

  if (topic && typeof topic === "object" && "topicId" in topic && typeof topic.topicId === "string") {
    return topic.topicId;
  } else {
    return undefined;
  }
};

export const generateResponse = async ({
  topicId,
  userQuery,
  onChunkReceived,
}: {
  topicId: string;
  userQuery: string;
  onChunkReceived: (chunk: string, baseUrl?: string, finalChunk?: boolean) => void;
}) => {
  if (!API_KEY || !apiBaseUrl) return;

  const queryResponse = await fetch(
    `
${apiBaseUrl}/message`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ message: userQuery, topicId }),
    }
  );

  if (!queryResponse.ok || !queryResponse.body) {
    throw Error(queryResponse.statusText);
  }
  const streamReader = queryResponse.body.getReader();

  for (;;) {
    const { done, value } = await streamReader.read();
    if (done) {
      const newValue = new TextDecoder().decode(value);

      onChunkReceived(newValue, queryResponse.headers.get("X-Mintlify-Base-Url") ?? "", true);
      return;
    }

    const newValue = new TextDecoder().decode(value);
    onChunkReceived(newValue);
  }
};

export const handleAiChat = async (
  onChunkReceived: (chunk: string, baseUrl?: string, finalChunk?: boolean) => void,
  userQuery: string,
  topicId?: string
) => {
  let id = null;
  let error = "";
  try {
    if (!topicId) {
      id = await createChat();
    }

    if (!id)
      return {
        id,
        error: "Error creating topic. Please try again later",
      };

    await generateResponse({
      topicId: id,
      onChunkReceived,
      userQuery,
    });
  } catch (err) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = "k_bar_ai_error";
    }
  }

  return {
    id,
    error,
  };
};

type ChunkMetadata = {
  id: string;
  link?: string;
  metadata?: Record<string, unknown>;
  chunk_html?: string;
};

export const generateDeeplink = (chunkMetadata: ChunkMetadata) => {
  if (
    !(
      "metadata" in chunkMetadata &&
      !!chunkMetadata.metadata &&
      "title" in chunkMetadata.metadata &&
      "link" in chunkMetadata &&
      typeof chunkMetadata.link === "string"
    )
  )
    return "";
  const section = chunkMetadata.metadata.title;
  const link = optionallyAddLeadingSlash(chunkMetadata.link);
  if (section && typeof section === "string") {
    const sectionSlug = section
      .toLowerCase()
      .replaceAll(" ", "-")
      .replaceAll(/[^a-zA-Z0-9-_#]/g, "");

    return `${link}#${sectionSlug}`;
  }

  return link;
};

type UnformattedCitation = {
  id: string;
  link: string;
  chunk_html: string;
  metadata: Record<string, string>;
};

export type Citation = {
  citationNumber: number;
  title: string;
  url: string;
  rootRecordId?: number;
  rootRecordType?: string;
};

export function getFormattedCitations(rawContent?: string): Citation[] {
  try {
    const citations: UnformattedCitation[] = JSON.parse(rawContent ?? "[]");

    const uniqueCitations = new Map(
      citations.map((citation, index) => {
        const title = citation.metadata.title ?? "";
        const formattedCitation = {
          citationNumber: index,
          title: citation.metadata.title ?? "",
          url: generateDeeplink(citation),
        };

        return [title, formattedCitation];
      })
    );

    return Array.from(uniqueCitations.values());
  } catch {
    return [];
  }
}

export function optionallyRemoveLeadingSlash(path: string) {
  return path.startsWith("/") ? path.substring(1) : path;
}

export function optionallyAddLeadingSlash(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function optionallyAddBaseUrl(baseUrl: string, url: string) {
  // absolute urls
  if (url.startsWith("https://")) return url;

  const urlWithLeadingSlash = optionallyAddLeadingSlash(url);
  return `${baseUrl}${urlWithLeadingSlash}`;
}
