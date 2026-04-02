import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { Card } from "@calcom/ui/components/card";
import shuffle from "lodash/shuffle";
import posthog from "posthog-js";
import { memo, useState } from "react";
import { GatedFeatures, useGatedFeaturesStore } from "./stores/gatedFeaturesStore";

type Tip = {
  id: number;
  thumbnailUrl: string;
  mediaLink?: string;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  coverPhoto?: string;
  variant?: "SidebarCard" | "NewLaunchSidebarCard";
};

function Tips() {
  const { t } = useLocale();
  const openModal = useGatedFeaturesStore((state) => state.open);

  const tips: Tip[] = [
    {
      id: 18,
      thumbnailUrl: "https://img.youtube.com/vi/J8HsK-8W39U/0.jpg",
      mediaLink: "https://go.cal.com/rbac-video",
      title: "Roles & Permissions",
      description: "Manage team access with roles & permissions",
      onClick: () => openModal(GatedFeatures.RolesAndPermissions),
    },
    {
      id: 17,
      thumbnailUrl: "https://img.youtube.com/vi/fMHW6jYPIb8/0.jpg",
      mediaLink: "https://go.cal.com/embed-video",
      title: "Embed",
      description: "Embed your booking page on your website",
      href: "https://go.cal.com/embed-video",
    },
    {
      id: 16,
      thumbnailUrl: "https://img.youtube.com/vi/xopxmk2H4Ng/0.jpg",
      mediaLink: "https://go.cal.com/paid-booking",
      title: "Paid Bookings",
      description: "Charge for your time with Cal.com's paid bookings",
      href: "https://go.cal.com/paid-booking",
    },
    {
      id: 15,
      thumbnailUrl: "https://img.youtube.com/vi/ZjSD1yPgLLQ/0.jpg",
      mediaLink: "https://go.cal.com/instant-meetings-video",
      title: "Instant Meetings",
      description: "Book meetings instantly with a link",
      href: "https://go.cal.com/instant-meetings-video",
    },
    {
      id: 14,
      thumbnailUrl: "https://img.youtube.com/vi/IZ4-nUiIpvY/0.jpg",
      mediaLink: "https://go.cal.com/custom-attributes",
      title: "Custom Attributes",
      description: "Define roles and attributes for your teams",
      href: "https://go.cal.com/custom-attributes",
    },
    {
      id: 13,
      thumbnailUrl: "https://img.youtube.com/vi/TTAASLLPKk0/0.jpg",
      mediaLink: "https://go.cal.com/ooo-video",
      title: "ooo.new",
      description: "Easily go out-of-office",
      href: "https://go.cal.com/ooo-video",
    },
    {
      id: 12,
      thumbnailUrl: "https://cal.com/og-image-cal-ai.jpg",
      mediaLink: "https://go.cal.com/cal-ai",
      title: "Cal.ai",
      description: "Your personal AI scheduling assistant",
      href: "https://go.cal.com/cal-ai",
    },
    {
      id: 11,
      thumbnailUrl: "https://img.youtube.com/vi/KTg_qzA9NEc/0.jpg",
      mediaLink: "https://go.cal.com/insights",
      title: "Insights",
      description: "Get a better understanding of your business",
      href: "https://go.cal.com/insights",
    },
    {
      id: 10,
      thumbnailUrl: "https://img.youtube.com/vi/jvaBafzVUQc/0.jpg",
      mediaLink: "https://go.cal.com/video",
      title: "Cal Video",
      description: "Free video conferencing with recording",
      href: "https://go.cal.com/video",
    },
    {
      id: 9,
      thumbnailUrl: "https://img.youtube.com/vi/93iOmzHieCU/0.jpg",
      mediaLink: "https://go.cal.com/round-robin",
      title: "Round-Robin",
      description: "Create advanced group meetings with round-robin",
      href: "https://go.cal.com/round-robin",
    },
    {
      id: 8,
      thumbnailUrl: "https://img.youtube.com/vi/piKlAiibAFo/0.jpg",
      mediaLink: "https://go.cal.com/workflows",
      title: "Automate Workflows",
      description: "Make time work for you and automate tasks",
      href: "https://go.cal.com/workflows",
    },
    {
      id: 7,
      thumbnailUrl: "https://img.youtube.com/vi/UVXgo12cY4g/0.jpg",
      mediaLink: "https://go.cal.com/routing-forms",
      title: "Routing Forms",
      description: "Ask questions and route to the correct person",
      href: "https://go.cal.com/routing-forms",
    },
    {
      id: 6,
      thumbnailUrl: "https://img.youtube.com/vi/yGiZo1Ry5-8/0.jpg",
      mediaLink: "https://go.cal.com/recurring-video",
      title: "Recurring Bookings",
      description: "Learn how to create a recurring schedule",
      href: "https://go.cal.com/recurring-video",
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
      id: 4,
      thumbnailUrl: "https://img.youtube.com/vi/zGr_s-fG84k/0.jpg",
      mediaLink: "https://go.cal.com/confirmation-video",
      title: "Requires Confirmation",
      description: "Learn how to be in charge of your bookings",
      href: "https://cal.com/resources/feature/opt-in",
    },
    {
      id: 3,
      thumbnailUrl: "https://img.youtube.com/vi/-L8MCiT6uhQ/0.jpg",
      mediaLink: "https://youtu.be/-L8MCiT6uhQ?si=DRJzRNhN85hqAwBl",
      title: "Routing Forms, Workflows",
      description: "Ask screening questions of potential bookers to connect them with the right person",
      href: "https://youtu.be/-L8MCiT6uhQ?si=DRJzRNhN85hqAwBl",
    },
    {
      id: 2,
      thumbnailUrl: "https://img.youtube.com/vi/EAc46SPL6iA/0.jpg",
      mediaLink: "https://go.cal.com/teams-video",
      title: "How to set up Teams",
      description: "Learn how to use round-robin and collective events.",
      href: "https://cal.com/teams",
    },
    {
      id: 1,
      thumbnailUrl: "https://img.youtube.com/vi/VZ5PfQzzxBw/0.jpg",
      mediaLink: "https://youtu.be/VZ5PfQzzxBw?si=oB0LPSxG8dWIwg5a",
      title: "Dynamic booking links",
      description: "Booking link that allows people to quickly schedule meetings.",
      href: "https://youtu.be/VZ5PfQzzxBw?si=oB0LPSxG8dWIwg5a",
    },
  ];

  const reversedTips = [...shuffle(tips).slice(0).reverse()];

  const [list, setList] = useState<Tip[]>(() => {
    if (typeof window === "undefined") {
      return reversedTips;
    }
    try {
      const removedTipsString = localStorage.getItem("removedTipsIds");
      if (removedTipsString !== null) {
        const removedTipsIds = removedTipsString.split(",").map((id) => parseInt(id, 10));
        const filteredTips = reversedTips.filter((tip) => removedTipsIds.indexOf(tip.id) === -1);
        return filteredTips;
      } else {
        return reversedTips;
      }
    } catch {
      return reversedTips;
    }
  });

  const handleRemoveItem = (id: number) => {
    setList((currentItems) => {
      const items = localStorage.getItem("removedTipsIds") || "";
      const itemToRemoveIndex = currentItems.findIndex((item) => item.id === id);

      if (itemToRemoveIndex === -1) return [...currentItems];

      localStorage.setItem(
        "removedTipsIds",
        `${currentItems[itemToRemoveIndex].id.toString()}${items.length > 0 ? `,${items}` : ""}`
      );
      currentItems.splice(itemToRemoveIndex, 1);
      return [...currentItems];
    });
  };

  const baseOriginalList = list.slice(0).reverse();
  return (
    <>
      <div
        className="hidden pb-4 pt-8 lg:grid"
        /* ref={animationRef} */
        style={{
          gridTemplateColumns: "1fr",
        }}>
        {list.map((tip) => {
          const isTopTip = baseOriginalList.indexOf(tip) === 0;
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
                  variant={tip.variant ?? "SidebarCard"}
                  thumbnailUrl={tip.thumbnailUrl}
                  coverPhoto={tip.coverPhoto}
                  mediaLink={isTopTip ? tip.mediaLink : undefined}
                  mediaLinkOnClick={
                    isTopTip
                      ? () => {
                          posthog.capture("tip_video_clicked", tip);
                          if (tip.onClick) tip.onClick();
                        }
                      : undefined
                  }
                  title={t(tip.title)}
                  description={t(tip.description)}
                  learnMore={
                    isTopTip
                      ? {
                          href: tip.href,
                          text: t("learn_more"),
                          onClick: () => {
                            posthog.capture("tip_learn_more_clicked", tip);
                            if (tip.onClick) tip.onClick();
                          },
                        }
                      : undefined
                  }
                  actionButton={
                    isTopTip
                      ? {
                          onClick: () => {
                            posthog.capture("tip_dismiss_clicked", tip);
                            handleRemoveItem(tip.id);
                          },
                          child: t("dismiss"),
                        }
                      : undefined
                  }
                  containerProps={{
                    tabIndex: isTopTip ? undefined : -1,
                    "aria-hidden": isTopTip ? undefined : "true",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default memo(Tips);
