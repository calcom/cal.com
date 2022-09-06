import { ComponentMeta } from "@storybook/react";

import Avatar from "@calcom/ui/v2/core/Avatar";

export default {
  title: "Avatar",
  component: Avatar,
} as ComponentMeta<typeof Avatar>;

export const Default = () => {
  return (
    <>
      <Avatar size="sm" alt="Avatar Story" gravatarFallbackMd5="Ui@CAL.com" />
      <Avatar size="lg" alt="Avatar Story" gravatarFallbackMd5="Ui@CAL.com" />
    </>
  );
};

export const Accepted = () => {
  return (
    <>
      <Avatar size="sm" alt="Avatar Story" gravatarFallbackMd5="Ui@CAL.com" accepted />
      <Avatar size="lg" alt="Avatar Story" gravatarFallbackMd5="Ui@CAL.com" accepted />
    </>
  );
};
