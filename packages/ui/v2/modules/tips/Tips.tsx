import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";

import Card from "../../core/Card";

export const tips = [
  {
    id: 1,
    thumbnailUrl: "https://img.youtube.com/vi/60HJt8DOVNo/0.jpg",
    mediaLink: "https://go.cal.com/dynamic-video",
    title: "Dynamic booking links",
    description: "Booking link that allows people to quickly schedule meetings.",
    href: "https://cal.com/blog/cal-v-1-9",
  },
  {
    id: 2,
    thumbnailUrl: "https://img.youtube.com/vi/EAc46SPL6iA/0.jpg",
    mediaLink: "https://go.cal.com/teams-video",
    title: "How to set up Teams",
    description: "Learn how to use round-robin and collective events.",
    href: "https://docs.cal.com/deep-dives/event-types",
  },
  {
    id: 3,
    thumbnailUrl: "https://img.youtube.com/vi/c7ZKFuLy1fg/0.jpg",
    mediaLink: "https://go.cal.com/routing-video",
    title: "Routing Forms, Workflows",
    description: "Ask screening questions of potential bookers to connect them with the right person",
    href: "https://cal.com/blog/cal-v-1-8",
  },
  {
    id: 4,
    thumbnailUrl: "https://img.youtube.com/vi/zGr_s-fG84k/0.jpg",
    mediaLink: "https://go.cal.com/confirmation-video",
    title: "Requires Confirmation",
    description: "Learn how to be in charge of your bookings",
    href: "https://docs.cal.com/deep-dives/event-types#opt-in-booking",
  },
  {
    id: 5,
    thumbnailUrl: "https://img.youtube.com/vi/0v_nQtpxC_4/0.jpg",
    mediaLink: "https://go.cal.com/payments-video",
    title: "Accept Payments",
    description: "Charge for your time with Cal.com's Stripe App",
    href: "https://app.cal.com/apps/stripe",
  },
  {
    id: 6,
    thumbnailUrl: "https://img.youtube.com/vi/yGiZo1Ry5-8/0.jpg",
    mediaLink: "https://go.cal.com/recurring-video",
    title: "Recurring Bookings",
    description: "Learn how to create a recurring schedule",
    href: "https://go.cal.com/recurring-video",
  },
];

export default function Tips() {
  const [animationRef] = useAutoAnimate<HTMLDivElement>();

  const { t } = useLocale();

  const [list, setList] = useState<typeof tips>([]);

  const handleRemoveItem = (id: number) => {
    setList((currentItems) => {
      const items = localStorage.getItem("removedTipsIds") || "";
      const itemToRemoveIndex = currentItems.findIndex((item) => item.id === id);

      localStorage.setItem(
        "removedTipsIds",
        `${currentItems[itemToRemoveIndex].id.toString()}${items.length > 0 ? `,${items.split(",")}` : ""}`
      );
      currentItems.splice(itemToRemoveIndex, 1);
      return [...currentItems];
    });
  };

  useEffect(() => {
    const reversedTips = tips.slice(0).reverse();
    const removedTipsString = localStorage.getItem("removedTipsIds") || "";
    const removedTipsIds = removedTipsString.split(",").map((id) => parseInt(id, 10));
    const filteredTips = reversedTips.filter((tip) => removedTipsIds.indexOf(tip.id) === -1);
    setList(() => [...filteredTips]);
  }, []);
  const baseOriginalList = list.slice(0).reverse();
  return (
    <div
      className="mb-4 hidden lg:grid"
      /* ref={animationRef} */
      style={{
        gridTemplateColumns: "1fr",
      }}>
      {list.map((tip) => {
        return (
          <div
            className="relative"
            style={{
              gridRowStart: 1,
              gridColumnStart: 1,
            }}
            key={tip.id}>
            <div
              className="relative"
              style={{
                transform: `scale(${1 - baseOriginalList.indexOf(tip) / 20})`,
                top: -baseOriginalList.indexOf(tip) * 10,
                opacity: `${1 - baseOriginalList.indexOf(tip) / 7}`,
              }}>
              <Card
                variant="SidebarCard"
                thumbnailUrl={tip.thumbnailUrl}
                mediaLink={tip.mediaLink}
                title={tip.title}
                description={tip.description}
                learnMore={{ href: tip.href, text: t("learn_more") }}
                actionButton={{ onClick: () => handleRemoveItem(tip.id), child: t("dismiss") }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
