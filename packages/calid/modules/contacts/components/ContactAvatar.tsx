import { cn } from "@calid/features/lib/cn";
import { Avatar } from "@calid/features/ui/components/avatar";

import { getContactInitials } from "../utils/contactUtils";

interface ContactAvatarProps {
  name: string;
  avatar?: string;
  size?: "sm" | "md" | "mdLg" | "lg";
  className?: string;
}

export const ContactAvatar = ({ name, avatar, size = "md", className }: ContactAvatarProps) => {
  const fallbackText = avatar || getContactInitials(name);

  return (
    <Avatar
      alt={name}
      size={size}
      className={className}
      fallback={<span className={cn("text-primary font-semibold", className)}>{fallbackText}</span>}
    />
  );
};
