import { useAvatar } from "@avatechai/avatars/react";
import { ThreeJSPlugin } from "@avatechai/avatars/threejs";
import { useChat } from "ai/react";
import { LazyMotion, m } from "framer-motion";
import { MdSend } from "react-icons/md";

import { TextField, Button } from "@calcom/ui";

import useMeQuery from "@lib/hooks/useMeQuery";

const loadFramerFeatures = () => import("./framer-features").then((res) => res.default);

export const AvatarAssistant = (props: { username: string | null; userEventTypes: any[] }) => {
  const user = useMeQuery().data;

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
  });

  if (!user) return <>No avatar id</>;

  return (
    <div className="mb-6 flex w-full flex-col items-center justify-center">
      {avatarDisplay}
      <div className="w-full min-w-0 max-w-[400px] md:min-w-[400px]">
        <LazyMotion features={loadFramerFeatures}>
          <ul className="max-h-[300px] w-full overflow-y-scroll">
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
            handleSubmit(e);
          }}
          className="flex w-full flex-row gap-2">
          <TextField
            containerClassName="flex-grow"
            className="grow"
            placeholder="I wanna chat with you for a while this week!"
            value={input}
            onChange={handleInputChange}
          />
          <Button type="submit" className="flex-none">
            {/* Send */}
            <MdSend />
          </Button>
        </form>
      </div>
    </div>
  );
};
