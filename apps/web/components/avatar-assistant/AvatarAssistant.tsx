import { useAvatar } from "@avatechai/avatars/react";
import { ThreeJSPlugin } from "@avatechai/avatars/threejs";
import { useChat } from "ai/react";
import { LazyMotion, m } from "framer-motion";
import { useEffect, useState } from "react";
import React, { forwardRef } from "react";
import { MdSend } from "react-icons/md";

import { TextField, Button } from "@calcom/ui";

import useMeQuery from "@lib/hooks/useMeQuery";

const loadFramerFeatures = () => import("./framer-features").then((res) => res.default);

export const AvatarAssistant = (props: { username: string | null; userEventTypes: any[] }) => {
  const user = useMeQuery().data;

  const [isLoading, setIsLoading] = useState(false);

  const { avatarDisplay } = useAvatar({
    avatarId: user?.avatarId ?? undefined,
    // Loader + Plugins
    avatarLoaders: [ThreeJSPlugin],
    scale: -0.6,
    className: "!w-[400px] !h-[400px]",
  });

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/avatar-assistant/chat",
    body: {
      ...props,
      userId: user?.id,
      userTime: new Date().toISOString(),
    },
    onResponse: (_) => {
      setIsLoading(false);
    },
  });

  useEffect(() => {
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  if (!user) return <>No avatar id</>;

  return (
    <div className="mb-6 flex w-full flex-col items-center justify-center">
      {avatarDisplay}
      <div className="w-full min-w-0 max-w-[400px] md:min-w-[400px]">
        <LazyMotion features={loadFramerFeatures}>
          <ul className="max-h-[300px] w-full overflow-y-scroll" id="chat-container">
            {messages.map((a, index) => (
              <m.li
                key={index}
                className={`mb-2 flex w-full ${a.role === "user" ? "justify-end" : "justify-start"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}>
                <div
                  className={`w-fit rounded-md ${
                    a.role === "user" ? "bg-gray-300/40" : "bg-gray-300/60"
                  } p-2 text-sm `}>
                  {a.content}
                </div>
              </m.li>
            ))}
          </ul>
        </LazyMotion>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            handleSubmit(e);
            setIsLoading(true);
          }}
          className="flex w-full flex-row gap-2"
          disabled={isLoading}>
          <TextField
            containerClassName={`flex-grow ${isLoading ? "opacity-40" : ""}`}
            className="grow"
            placeholder="I wanna chat with you for a while this week!"
            value={input}
            onChange={handleInputChange}
            autocomplete="off"
          />
          <Button type="submit" className="flex-none">
            {/* Send */}
            {isLoading ? <Spinner className="h-4 w-4" /> : <MdSend />}
          </Button>
        </form>
      </div>
    </div>
  );
};

const Spinner = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(function Spinner(props) {
  return (
    <svg
      className={props.className}
      id="Layer_1"
      data-name="Layer 1"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg">
      <path
        className="fill-white opacity-40"
        d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
      />
      <path
        className="animate-spinning fill-emphasis origin-center"
        d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
      />
    </svg>
  );
});
