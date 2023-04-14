import { useState } from "react";
import { useChat } from "react-live-chat-loader";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast, TextArea } from "@calcom/ui";
import { ExternalLink, AlertTriangle } from "@calcom/ui/components/icon";

import { useFreshChat } from "../lib/freshchat/FreshChatProvider";
import { isFreshChatEnabled } from "../lib/freshchat/FreshChatScript";
import { isInterComEnabled, useIntercom } from "../lib/intercom/useIntercom";
import ContactMenuItem from "./ContactMenuItem";

interface HelpMenuItemProps {
  onHelpItemSelect: () => void;
}

export default function HelpMenuItem({ onHelpItemSelect }: HelpMenuItemProps) {
  const [rating, setRating] = useState<null | string>(null);
  const { open } = useIntercom();
  const [comment, setComment] = useState("");
  const [disableSubmit, setDisableSubmit] = useState(true);
  const [active, setActive] = useState(false);
  const [, loadChat] = useChat();
  const { t } = useLocale();

  const { setActive: setFreshChat } = useFreshChat();

  const mutation = trpc.viewer.submitFeedback.useMutation({
    onSuccess: () => {
      setDisableSubmit(true);
      showToast("Thank you, feedback submitted", "success");
      onHelpItemSelect();
    },
  });

  const onRatingClick = (value: string) => {
    setRating(value);
    setDisableSubmit(false);
  };

  const sendFeedback = async (rating: string, comment: string) => {
    mutation.mutate({ rating: rating, comment: comment });
  };

  return (
    <div className="bg-default border-default w-full rounded-md">
      <div className="w-full py-5">
        <p className="text-subtle mb-1 px-5">{t("resources").toUpperCase()}</p>
        <a
          onClick={() => onHelpItemSelect()}
          href="https://cal.com/docs/"
          target="_blank"
          className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium"
          rel="noreferrer">
          {t("documentation")}
          <ExternalLink
            className={classNames(
              "group-hover:text-subtle text-muted",
              "ml-1 mt-px h-4 w-4 flex-shrink-0 ltr:mr-3"
            )}
          />
        </a>
        <div>
          <ContactMenuItem onHelpItemSelect={onHelpItemSelect} />
        </div>
      </div>

      <hr className="border-muted" />
      <div className="w-full p-5">
        <p className="text-subtle mb-1">{t("feedback").toUpperCase()}</p>
        <p className="text-default flex w-full py-2 text-sm font-medium">{t("comments")}</p>

        <TextArea id="comment" name="comment" rows={3} onChange={(event) => setComment(event.target.value)} />

        <div className="my-3 flex justify-end">
          <button
            className={classNames(
              "m-1 items-center justify-center p-1.5 grayscale hover:opacity-100 hover:grayscale-0",
              rating === "Extremely unsatisfied" ? "grayscale-0" : "opacity-50"
            )}
            onClick={() => onRatingClick("Extremely unsatisfied")}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="1.5em" height="1.5em">
              <path
                fill="#FFCC4D"
                d="M36 18c0 9.941-8.059 18-18 18S0 27.941 0 18 8.059 0 18 0s18 8.059 18 18"
              />
              <path
                fill="#664500"
                d="M22 27c0 2.763-1.791 3-4 3-2.21 0-4-.237-4-3 0-2.761 1.79-6 4-6 2.209 0 4 3.239 4 6zm8-12c-.124 0-.25-.023-.371-.072-5.229-2.091-7.372-5.241-7.461-5.374-.307-.46-.183-1.081.277-1.387.459-.306 1.077-.184 1.385.274.019.027 1.93 2.785 6.541 4.629.513.206.763.787.558 1.3-.157.392-.533.63-.929.63zM6 15c-.397 0-.772-.238-.929-.629-.205-.513.044-1.095.557-1.3 4.612-1.844 6.523-4.602 6.542-4.629.308-.456.929-.577 1.387-.27.457.308.581.925.275 1.383-.089.133-2.232 3.283-7.46 5.374C6.25 14.977 6.124 15 6 15z"
              />
              <path fill="#5DADEC" d="M24 16h4v19l-4-.046V16zM8 35l4-.046V16H8v19z" />
              <path
                fill="#664500"
                d="M14.999 18c-.15 0-.303-.034-.446-.105-3.512-1.756-7.07-.018-7.105 0-.495.249-1.095.046-1.342-.447-.247-.494-.047-1.095.447-1.342.182-.09 4.498-2.197 8.895 0 .494.247.694.848.447 1.342-.176.35-.529.552-.896.552zm14 0c-.15 0-.303-.034-.446-.105-3.513-1.756-7.07-.018-7.105 0-.494.248-1.094.047-1.342-.447-.247-.494-.047-1.095.447-1.342.182-.09 4.501-2.196 8.895 0 .494.247.694.848.447 1.342-.176.35-.529.552-.896.552z"
              />
              <ellipse fill="#5DADEC" cx="18" cy="34" rx="18" ry="2" />
              <ellipse fill="#E75A70" cx="18" cy="27" rx="3" ry="2" />
            </svg>
          </button>
          <button
            className={classNames(
              "m-1 items-center justify-center p-1.5 grayscale hover:opacity-100 hover:grayscale-0",
              rating === "Unsatisfied" ? "grayscale-0" : "opacity-50"
            )}
            onClick={() => onRatingClick("Unsatisfied")}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="1.5em" height="1.5em">
              <path
                fill="#FFCC4D"
                d="M36 18c0 9.941-8.059 18-18 18-9.94 0-18-8.059-18-18C0 8.06 8.06 0 18 0c9.941 0 18 8.06 18 18"
              />
              <ellipse fill="#664500" cx="11.5" cy="14.5" rx="2.5" ry="3.5" />
              <ellipse fill="#664500" cx="24.5" cy="14.5" rx="2.5" ry="3.5" />
              <path
                fill="#664500"
                d="M8.665 27.871c.178.161.444.171.635.029.039-.029 3.922-2.9 8.7-2.9 4.766 0 8.662 2.871 8.7 2.9.191.142.457.13.635-.029.177-.16.217-.424.094-.628C27.3 27.029 24.212 22 18 22s-9.301 5.028-9.429 5.243c-.123.205-.084.468.094.628z"
              />
            </svg>
          </button>
          <button
            className={classNames(
              "m-1 items-center justify-center p-1.5 grayscale hover:opacity-100 hover:grayscale-0",
              rating === "Satisfied" ? "grayscale-0" : "opacity-50"
            )}
            onClick={() => onRatingClick("Satisfied")}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="1.5em" height="1.5em">
              <path
                fill="#FFCC4D"
                d="M36 18c0 9.941-8.059 18-18 18-9.94 0-18-8.059-18-18C0 8.06 8.06 0 18 0c9.941 0 18 8.06 18 18"
              />
              <path
                fill="#664500"
                d="M28.457 17.797c-.06-.135-1.499-3.297-4.457-3.297-2.957 0-4.397 3.162-4.457 3.297-.092.207-.032.449.145.591.175.142.426.147.61.014.012-.009 1.262-.902 3.702-.902 2.426 0 3.674.881 3.702.901.088.066.194.099.298.099.11 0 .221-.037.312-.109.177-.142.238-.386.145-.594zm-12 0c-.06-.135-1.499-3.297-4.457-3.297-2.957 0-4.397 3.162-4.457 3.297-.092.207-.032.449.144.591.176.142.427.147.61.014.013-.009 1.262-.902 3.703-.902 2.426 0 3.674.881 3.702.901.088.066.194.099.298.099.11 0 .221-.037.312-.109.178-.142.237-.386.145-.594zM18 22c-3.623 0-6.027-.422-9-1-.679-.131-2 0-2 2 0 4 4.595 9 11 9 6.404 0 11-5 11-9 0-2-1.321-2.132-2-2-2.973.578-5.377 1-9 1z"
              />
              <path fill="#FFF" d="M9 23s3 1 9 1 9-1 9-1-2 4-9 4-9-4-9-4z" />
            </svg>
          </button>
          <button
            className={classNames(
              "m-1 items-center justify-center p-1.5 grayscale hover:opacity-100 hover:grayscale-0",
              rating === "Extremely satisfied" ? "grayscale-0" : "opacity-50"
            )}
            onClick={() => onRatingClick("Extremely satisfied")}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="1.5em" height="1.5em">
              <path
                fill="#FFCC4D"
                d="M36 18c0 9.941-8.059 18-18 18S0 27.941 0 18 8.059 0 18 0s18 8.059 18 18"
              />
              <path
                fill="#664500"
                d="M18 21c-3.623 0-6.027-.422-9-1-.679-.131-2 0-2 2 0 4 4.595 9 11 9 6.404 0 11-5 11-9 0-2-1.321-2.132-2-2-2.973.578-5.377 1-9 1z"
              />
              <path fill="#FFF" d="M9 22s3 1 9 1 9-1 9-1-2 4-9 4-9-4-9-4z" />
              <path
                fill="#E95F28"
                d="M15.682 4.413l-4.542.801L8.8.961C8.542.492 8.012.241 7.488.333c-.527.093-.937.511-1.019 1.039l-.745 4.797-4.542.801c-.535.094-.948.525-1.021 1.064s.211 1.063.703 1.297l4.07 1.932-.748 4.812c-.083.536.189 1.064.673 1.309.179.09.371.133.562.133.327 0 .65-.128.891-.372l3.512-3.561 4.518 2.145c.49.232 1.074.123 1.446-.272.372-.395.446-.984.185-1.459L13.625 9.73l3.165-3.208c.382-.387.469-.977.217-1.459-.254-.482-.793-.743-1.325-.65zm4.636 0l4.542.801L27.2.961c.258-.469.788-.72 1.312-.628.526.093.936.511 1.018 1.039l.745 4.797 4.542.801c.536.094.949.524 1.021 1.063s-.211 1.063-.703 1.297l-4.07 1.932.748 4.812c.083.536-.189 1.064-.673 1.309-.179.09-.371.133-.562.133-.327 0-.65-.128-.891-.372l-3.512-3.561-4.518 2.145c-.49.232-1.074.123-1.446-.272-.372-.395-.446-.984-.185-1.459l2.348-4.267-3.165-3.208c-.382-.387-.469-.977-.217-1.459.255-.482.794-.743 1.326-.65z"
              />
            </svg>
          </button>
        </div>
        <div className="my-2 flex justify-end">
          <Button
            disabled={disableSubmit}
            loading={mutation.isLoading}
            onClick={async () => {
              if (rating && comment) {
                await sendFeedback(rating, comment);
              }
            }}>
            {t("submit")}
          </Button>
        </div>
        {mutation.isError && (
          <div className="bg-error mb-4 flex p-4 text-sm text-red-700">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="ml-3 flex-grow">
              <p className="font-medium">{t("feedback_error")}</p>
              <p>{t("please_try_again")}</p>
            </div>
          </div>
        )}
      </div>
      <div className="text-subtle bg-muted w-full p-5">
        <p className="">{t("specific_issue")}</p>
        <button
          className="hover:text-emphasis text-defualt font-medium underline"
          onClick={() => {
            setActive(true);
            if (isFreshChatEnabled) {
              setFreshChat(true);
            } else if (isInterComEnabled) {
              open();
            } else {
              loadChat({ open: true });
            }

            onHelpItemSelect();
          }}>
          {t("contact_support")}
        </button>
        <span> {t("or").toLowerCase()} </span>
        <a
          onClick={() => onHelpItemSelect()}
          className="hover:text-emphasis text-defualt font-medium underline"
          href="https://cal.com/docs"
          target="_blank"
          rel="noreferrer">
          {t("browse_our_docs")}
        </a>
        .
      </div>
    </div>
  );
}
