"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon, type IconName } from "@calid/features/ui/components/icon";
import { Logo } from "@calid/features/ui/components/logo";
import Link from "next/link";
import { useEffect, useRef, useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface UserNotFoundViewProps {
  slug: string;
}

interface FloatingBubble {
  id: string;
  name: string;
  subtitle: string;
  icon: IconName;
  color: string;
  x: number;
  y: number;
  velocity: { x: number; y: number };
}

function FloatingFeatureBubbles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const integrations = useMemo<Omit<FloatingBubble, "x" | "y" | "velocity">[]>(
    () => [
      {
        id: "zoom",
        name: "Zoom",
        subtitle: "Video calls",
        icon: "video",
        color: "bg-blue-100 border-blue-200 text-blue-700",
      },
      {
        id: "razorpay",
        name: "Razorpay",
        subtitle: "Payments",
        icon: "credit-card",
        color: "bg-blue-100 border-blue-200 text-blue-700",
      },
      {
        id: "whatsapp",
        name: "WhatsApp Business",
        subtitle: "Messaging",
        icon: "message-circle",
        color: "bg-green-100 border-green-200 text-green-700",
      },
      {
        id: "google-calendar",
        name: "Google Calendar",
        subtitle: "Sync",
        icon: "calendar",
        color: "bg-yellow-100 border-yellow-200 text-yellow-700",
      },
      {
        id: "team-meetings",
        name: "Team Meetings",
        subtitle: "Collaborate",
        icon: "users",
        color: "bg-indigo-100 border-indigo-200 text-indigo-700",
      },
      {
        id: "webhook-and-api",
        name: "APIs",
        subtitle: "Integrate",
        icon: "webhook",
        color: "bg-red-100 border-red-200 text-red-700",
      },
      {
        id: "workflows",
        name: "Workflows",
        subtitle: "Automate",
        icon: "workflow",
        color: "bg-purple-100 border-purple-200 text-purple-700",
      },
      {
        id: "custom-branding",
        name: "Custom Branding",
        subtitle: "Branding",
        icon: "paintbrush",
        color: "bg-green-100 border-green-200 text-green-700",
      },
    ],
    []
  );

  useEffect(() => {
    const initializeBubbles = () => {
      if (!containerRef.current) {
        setTimeout(initializeBubbles, 100);
        return;
      }

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width || 400;
      const containerHeight = containerRect.height || 600;

      if (containerWidth === 0 || containerHeight === 0) {
        setTimeout(initializeBubbles, 100);
        return;
      }

      const initialBubbles: FloatingBubble[] = integrations.map((integration) => ({
        ...integration,
        x: 70 + Math.random() * Math.max(0, containerWidth - 240),
        y: 60 + Math.random() * Math.max(0, containerHeight - 120),
        velocity: {
          x: (Math.random() - 0.5) * 1,
          y: (Math.random() - 0.5) * 1,
        },
      }));

      setBubbles(initialBubbles);
    };

    requestAnimationFrame(() => {
      initializeBubbles();
    });
  }, [integrations]);

  useEffect(() => {
    if (bubbles.length === 0) return;
    if (draggedId !== null) return;

    let animationFrameId: number;

    const startDelay = setTimeout(() => {
      const animate = () => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width || 400;
        const containerHeight = containerRect.height || 600;

        setBubbles((prev) =>
          prev.map((bubble) => {
            let newX = bubble.x + bubble.velocity.x;
            let newY = bubble.y + bubble.velocity.y;
            let newVelX = bubble.velocity.x;
            let newVelY = bubble.velocity.y;

            const bubbleWidth = 140;
            const bubbleHeight = 60;
            const halfW = bubbleWidth / 2;
            const halfH = bubbleHeight / 2;
            if (newX < halfW || newX > containerWidth - halfW) newVelX *= -1;
            if (newY < halfH || newY > containerHeight - halfH) newVelY *= -1;

            newX = Math.max(halfW, Math.min(containerWidth - halfW, newX));
            newY = Math.max(halfH, Math.min(containerHeight - halfH, newY));

            return {
              ...bubble,
              x: newX,
              y: newY,
              velocity: { x: newVelX, y: newVelY },
            };
          })
        );

        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);
    }, 300);

    return () => {
      if (startDelay) {
        clearTimeout(startDelay);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [bubbles.length, draggedId]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || draggedId === null) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setBubbles((prev) =>
      prev.map((bubble) =>
        bubble.id === draggedId ? { ...bubble, x: x - dragOffset.x, y: y - dragOffset.y } : bubble
      )
    );
  };

  const handleMouseDown = (e: React.MouseEvent, bubble: FloatingBubble) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDraggedId(bubble.id);
    setDragOffset({ x: x - bubble.x, y: y - bubble.y });
  };

  const handleMouseUp = () => {
    if (draggedId !== null) {
      setBubbles((prev) =>
        prev.map((bubble) =>
          bubble.id === draggedId
            ? {
                ...bubble,
                velocity: {
                  x: (Math.random() - 0.5) * 1.5,
                  y: (Math.random() - 0.5) * 1.5,
                },
              }
            : bubble
        )
      );
    }
    setDraggedId(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-[500px] w-full overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
        height: "100%",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}>
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={`absolute flex flex-row items-center gap-3 rounded-xl border p-3 shadow-md transition-all duration-200 ${
            draggedId === bubble.id ? "z-50 scale-110 cursor-grabbing shadow-xl" : "cursor-grab"
          } ${bubble.color}`}
          style={{
            left: bubble.x,
            top: bubble.y,
            transform: `translate(-50%, -50%) ${draggedId === bubble.id ? "scale(1.1)" : "scale(1)"}`,
            minWidth: "140px",
            height: "auto",
            transition: draggedId === bubble.id ? "none" : "transform 0.2s ease-out",
            willChange: "transform",
          }}
          onMouseDown={(e) => handleMouseDown(e, bubble)}>
          <Icon name={bubble.icon} className="h-5 w-5 flex-shrink-0" />
          <div className="flex flex-col">
            <h4 className="text-sm font-semibold leading-tight">{bubble.name}</h4>
            <p className="text-xs leading-tight opacity-70">{bubble.subtitle}</p>
          </div>
        </div>
      ))}
      <div className="text-default absolute bottom-4 right-4 text-xs">All your tools, one platform</div>
    </div>
  );
}

export function UserNotFoundView({ slug }: UserNotFoundViewProps) {
  const { t } = useLocale();

  const features = [
    {
      icon: "zap" as IconName,
      title: t("claim_username_instant_setup_title"),
      description: t("claim_username_instant_setup_description"),
    },
    {
      icon: "users" as IconName,
      title: t("claim_username_trusted_by_professionals_title"),
      description: t("claim_username_trusted_by_professionals_description"),
    },
    {
      icon: "shield" as IconName,
      title: t("claim_username_yours_forever_title"),
      description: t("claim_username_yours_forever_description"),
    },
  ];

  return (
    <div className="bg-default flex min-h-screen flex-col">
      <div className="flex w-full items-center justify-between px-6 py-4 md:px-8 md:py-6 lg:px-16 lg:py-8">
        <Logo />
        <Link href="/auth/login" target="_blank" className="text-default text-sm font-medium hover:underline">
          {t("already_have_account")} {t("sign_in")}
        </Link>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 md:px-8 md:py-12 lg:items-start lg:px-16 lg:py-16">
          <div className="mb-12 w-full max-w-3xl text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700">
              <Icon name="clock" className="h-4 w-4 text-yellow-700" />
              <span>{t("username_still_available")}</span>
            </div>

            <h1 className="text-default mb-4 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              {t("claim")} <span className="text-active">cal.id/{slug}</span> {t("before_someone_else_does")}
            </h1>

            <p className="text-default mb-8 text-lg md:text-xl">{t("claim_username_description")}</p>

            <div className="mb-2 flex w-full justify-center lg:justify-start">
              <Link href="/auth/signup" target="_blank" className="w-full sm:w-auto">
                <Button
                  StartIcon="circle-check"
                  className="flex h-12 w-full justify-center gap-2 px-8 text-base font-semibold sm:w-auto">
                  {t("claim_username_cta")}
                </Button>
              </Link>
            </div>

            <p className="text-default mb-12 text-sm">{t("claim_username_no_card_required")}</p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.icon} className="flex items-start justify-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Icon name={feature.icon} className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-default font-semibold">{feature.title}</h3>
                    <p className="text-default text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:px-16 lg:py-16">
          <div className="mb-12 h-[600px] w-full">
            <FloatingFeatureBubbles />
          </div>
        </div>
      </div>
    </div>
  );
}
