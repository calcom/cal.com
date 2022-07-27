import { ComponentMeta } from "@storybook/react";

import Avatar from "@calcom/ui/v2/Avatar";
import AvatarGroup from "@calcom/ui/v2/AvatarGroup";

export default {
  title: "Avatar/Group",
  component: AvatarGroup,
} as ComponentMeta<typeof AvatarGroup>;

const IMAGES = [
  {
    image: "https://cal.com/stakeholder/peer.jpg",
    alt: "Peer",
    title: "Peer Richelsen",
  },
  {
    image: "https://cal.com/stakeholder/bailey.jpg",
    alt: "Bailey",
    title: "Bailey Pumfleet",
  },
  {
    image: "https://cal.com/stakeholder/alex-van-andel.jpg",
    alt: "Alex",
    title: "Alex Van Andel",
  },
  {
    image: "https://cal.com/stakeholder/ciaran.jpg",
    alt: "Ciarán",
    title: "Ciarán Hanrahan",
  },
  {
    image: "https://cal.com/stakeholder/peer.jpg",
    alt: "Peer",
    title: "Peer Richelsen",
  },
  {
    image: "https://cal.com/stakeholder/bailey.jpg",
    alt: "Bailey",
    title: "Bailey Pumfleet",
  },
  {
    image: "https://cal.com/stakeholder/alex-van-andel.jpg",
    alt: "Alex",
    title: "Alex Van Andel",
  },
  {
    image: "https://cal.com/stakeholder/ciaran.jpg",
    alt: "Ciarán",
    title: "Ciarán Hanrahan",
  },
];

export const Default = () => {
  return (
    <>
      <AvatarGroup size="lg" items={IMAGES} />
    </>
  );
};
