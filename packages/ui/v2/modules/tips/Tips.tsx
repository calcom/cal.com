import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";

import Card from "../../core/Card";

const tips = [
  {
    id: 1,
    thumbnailUrl: "https://img.youtube.com/vi/60HJt8DOVNo/0.jpg",
    mediaLink: "https://www.youtube.com/watch?v=60HJt8DOVNo",
    title: "1 Dynamic boooking links",
    description: "Booking link that allows people to quickly schedule meetings.",
    href: "https://cal.com/blog/cal-v-1-9",
  },
  {
    id: 2,
    thumbnailUrl: "https://img.youtube.com/vi/60HJt8DOVNo/0.jpg",
    mediaLink: "https://www.youtube.com/watch?v=60HJt8DOVNo",
    title: "2 Dynamic boooking links",
    description: "Booking link that allows people to quickly schedule meetings.",
    href: "https://cal.com/blog/cal-v-1-9",
  },
  {
    id: 3,
    thumbnailUrl: "https://img.youtube.com/vi/60HJt8DOVNo/0.jpg",
    mediaLink: "https://www.youtube.com/watch?v=60HJt8DOVNo",
    title: "3 Dynamic boooking links",
    description: "Booking link that allows people to quickly schedule meetings.",
    href: "https://cal.com/blog/cal-v-1-9",
  },
  {
    id: 4,
    thumbnailUrl: "https://img.youtube.com/vi/60HJt8DOVNo/0.jpg",
    mediaLink: "https://www.youtube.com/watch?v=60HJt8DOVNo",
    title: "4 Dynamic boooking links",
    description: "Booking link that allows people to quickly schedule meetings.",
    href: "https://cal.com/blog/cal-v-1-9",
  },
  {
    id: 5,
    thumbnailUrl: "https://img.youtube.com/vi/60HJt8DOVNo/0.jpg",
    mediaLink: "https://www.youtube.com/watch?v=60HJt8DOVNo",
    title: "3 Dynamic boooking links",
    description: "Booking link that allows people to quickly schedule meetings.",
    href: "https://cal.com/blog/cal-v-1-9",
  },
  {
    id: 6,
    thumbnailUrl: "https://img.youtube.com/vi/60HJt8DOVNo/0.jpg",
    mediaLink: "https://www.youtube.com/watch?v=60HJt8DOVNo",
    title: "3 Dynamic boooking links",
    description: "Booking link that allows people to quickly schedule meetings.",
    href: "https://cal.com/blog/cal-v-1-9",
  },
];

export default function Tips() {
  const { t } = useLocale();

  const reversedTips = tips.slice(0).reverse();

  // use localStorage instead
  const [list, setList] = useState(reversedTips);

  const handleRemoveItem = (id: number) => {
    // "Save localStorage"
    const shiftItem = list.shift();
    if (shiftItem) {
      setList(list);
      localStorage.setItem(
        "removedTips",
        [shiftItem.toString(), ...localStorage.getItem("removedTips")].join(",")
      );
    }
    // setList(list.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const removedTips = localStorage.getItem("removedTips");

    if (removedTips) {
      const removedTipsId = parseInt(removedTips, 10);
      setList(list.filter((item) => removedTipsId.indexOf(item.id) === -1));
    }
  }, []);

  return (
    <div
      className="mb-4 hidden lg:grid"
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
              top: -tips.indexOf(tip) * 9,
              transform: `scale(${1 - tips.indexOf(tip) / 20})`,
              opacity: `${1 - tips.indexOf(tip) / 6}`,
            }}
            key={tip.id}>
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
        );
      })}
    </div>
  );
}
