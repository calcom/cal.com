import { useAvatar } from "@avatechai/avatars/react";
import { ThreeJSPlugin } from "@avatechai/avatars/threejs";

// type AvatarAssistantProps = {};

export const AvatarAssistant = () => {
  const { avatarDisplay } = useAvatar({
    avatarId: "456a5395-c1c5-4f67-a4e2-b56235b97638",
    // Loader + Plugins
    avatarLoaders: [ThreeJSPlugin],
    scale: -0.6,
    className: "!w-[400px] !h-[400px]",
  });

  return <div>{avatarDisplay}</div>;
};
