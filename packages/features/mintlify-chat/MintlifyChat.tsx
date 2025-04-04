/* eslint-disable react/no-danger */
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";

import { getFormattedCitations, handleAiChat, optionallyAddBaseUrl } from "../mintlify-chat/util";

interface MintlifyChatProps {
  searchText: string;
  aiResponse: string;
  setAiResponse: Dispatch<SetStateAction<string>>;
}

export const MintlifyChat = ({ searchText, aiResponse, setAiResponse }: MintlifyChatProps) => {
  const { t } = useLocale();
  const [topicId, setTopicId] = useState("");
  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_DOCS_URL ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const onChunkReceived = (chunk: string, baseUrl?: string, finalChunk?: boolean) => {
    setAiResponse((prev) => {
      return prev + chunk;
    });
    if (baseUrl) {
      setBaseUrl(baseUrl);
    }
    if (finalChunk) {
      setIsGenerating(false);
    }
  };

  const citations = getFormattedCitations(aiResponse.split("||")[1]) ?? [];
  const answer = aiResponse.split("||")[0] ?? "";

  return (
    <>
      <div
        onClick={async () => {
          if (isGenerating) return;
          setIsGenerating(true);
          setAiResponse("");
          setError("");
          const { id, error } = await handleAiChat(onChunkReceived, searchText, topicId);
          if (id) {
            setTopicId(id);
          } else if (error) {
            setIsGenerating(false);
            setError(error);
          }
        }}
        className={classNames(
          "hover:bg-subtle flex items-center gap-3 px-4 py-2 transition",
          isGenerating ? "cursor-not-allowed" : "cursor-pointer"
        )}>
        <div>
          <Icon name="star" />
        </div>
        <div>
          <div>
            {t("can_you_tell_me_about")} <span className="font-bold">{searchText}</span>
          </div>
          <div className="text-subtle text-sm">{t("use_ai_to_answer_your_questions")}</div>
        </div>
      </div>
      <div className="px-2 px-4 text-sm">
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {isGenerating && aiResponse === "" ? (
          <SkeletonContainer>
            <SkeletonText className="h-12 w-full" />
          </SkeletonContainer>
        ) : (
          <>
            <div dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(answer) }} />
            <div className="my-1 flex flex-wrap gap-2">
              {baseUrl &&
                citations.map((citation) => {
                  if (citation.title) {
                    const url = optionallyAddBaseUrl(baseUrl, citation.url);
                    return (
                      <a key={url} href={url} target="_blank">
                        <div className="flex h-6 items-center gap-1 rounded-md bg-gray-100 px-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          {citation.title}
                        </div>
                      </a>
                    );
                  }
                  return null;
                })}
            </div>
          </>
        )}
      </div>
    </>
  );
};
