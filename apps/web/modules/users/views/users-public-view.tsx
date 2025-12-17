"use client";

import { Branding } from "@calid/features/ui/Branding";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import { Icon, SocialIcon, type IconName, type SocialIconName } from "@calid/features/ui/components/icon";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { z } from "zod";

import { sdkActionManager, useEmbedNonStylesConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps> & {
  slug?: string;
};

interface IconParams {
  icon: IconName;
  color: string;
}

function getIconParamsFromMetadata(metadata: Record<string, unknown> | null | undefined): IconParams {
  const iconParams = metadata?.iconParams as IconParams;
  return iconParams || { icon: "calendar", color: "#6B7280" };
}

function UserNotFound(props: { slug: string }) {
  const { slug } = props;
  const { t } = useLocale();

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center px-10 md:p-0">
        <div className="bg-default dark:bg-emphasis w-full max-w-xl rounded-lg p-10 text-center shadow-lg">
          <div className="flex flex-col items-center">
            <h2 className="dark:text-emphasis mt-4 text-3xl font-semibold text-gray-800">
              No man&apos;s land - Conquer it today!
            </h2>
            <p className="dark:text-default mt-4 text-lg text-gray-600">
              Claim username <span className="font-semibold">{`'${slug}'`}</span> on{" "}
              <span className="font-semibold">Cal ID</span> now before someone else does! 🗓️🔥
            </p>
          </div>

          <div className="mt-6">
            <Link href="/auth/signup">
              <Button color="primary" target="_blank">
                {t("register_now")}
              </Button>
            </Link>
          </div>

          <div className="dark:text-default mt-6 text-base text-gray-500">
            Or Lost your way? &nbsp;
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Log in to your personal space
            </Link>
          </div>
        </div>
        <div key="logo" className={classNames("mt-6 flex w-full justify-center [&_img]:h-[32px]")}>
          <Branding />
        </div>
      </div>
    </>
  );
}

export function UserPage(props: PageProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { profile, eventTypes, entity } = props;
  const [user] = props.users || [];
  const isEventListEmpty = (eventTypes || []).length === 0;
  const isOrg = !!user?.profile?.organization;
  const isBioEmpty = !user?.bio || !user.bio.replace("<p><br></p>", "").length;
  const isEmbed = useIsEmbed(props.isEmbed);
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const { user: _user, orgSlug: _orgSlug, redirect: _redirect, ...query } = useRouterQuery();
  const isLongName = (profile?.name?.length ?? 0) > 18;

  useTheme(profile?.theme, false, false);

  const headerUrl = (user?.metadata as z.infer<typeof userMetadataSchema> | null)?.headerUrl ?? undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socialProfiles = (user as any)?.socialProfiles as
    | Record<SocialIconName, string | undefined>
    | undefined
    | null;
  const socialLinks = (
    ["linkedin", "facebook", "twitter", "instagram", "youtube", "github"] as SocialIconName[]
  )
    .map((key) => {
      const url = socialProfiles?.[key];
      if (!url || !url.trim()) return null;
      return { key, url: url.trim() };
    })
    .filter(Boolean) as Array<{ key: SocialIconName; url: string }>;

  useEffect(() => {
    const defaultFavicons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
    defaultFavicons.forEach((link) => {
      link.rel = "icon";
      link.href = user?.faviconUrl || "";
      link.type = "image/png";
    });
    if (defaultFavicons.length === 0) {
      const link: HTMLLinkElement = document.createElement("link");
      link.rel = "icon";
      link.href = user?.faviconUrl ?? "/favicon.ico";
      link.type = "image/png";
      document.head.appendChild(link);
    }
  }, [user?.faviconUrl]);

  if (entity?.considerUnpublished) {
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  if (props.userNotFound) {
    return <UserNotFound slug={props.slug ?? "User"} />;
  }

  const handleEventTypeClick = async (type: (typeof eventTypes)[number]) => {
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const url = `/${user.profile.username}/${type.slug}${queryString ? `?${queryString}` : ""}`;

    await sdkActionManager?.fire("eventTypeSelected", {
      eventType: type,
    });

    router.push(url);
  };

  return (
    <>
      <div
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "max-w-3xl" : "",
          "bg-default flex min-h-screen w-full flex-col"
        )}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width bg-default rounded-md" : "bg-default",
            "h-full w-full"
          )}>
          <div
            className={classNames(
              "border-subtle bg-cal-gradient dark:bg-cal-gradient text-default mb-4 flex flex-col items-center bg-cover bg-center p-6"
            )}
            style={{
              backgroundImage: headerUrl ? `url(${headerUrl})` : undefined,
            }}>
            <Avatar
              size="xl"
              imageSrc={user.avatarUrl}
              alt={profile.name || "User Avatar"}
              title={profile.name || "User"}
            />
            <div
              className={classNames(
                "mt-2 flex",
                isLongName
                  ? "flex-col items-center gap-1 md:flex-row md:items-center md:gap-2"
                  : "flex-row items-center gap-2"
              )}>
              <h1 className="text-default text-2xl font-bold leading-none" data-testid="name-title">
                {profile.name}
                {!isOrg && user.verified && (
                  <Icon
                    name="badge-check"
                    className="text-default mx-1 -mt-1 inline h-6 w-6 fill-blue-500 dark:text-black"
                  />
                )}
                {isOrg && (
                  <Icon
                    name="badge-check"
                    className="text-default mx-1 -mt-1 inline h-6 w-6 fill-yellow-500 dark:text-black"
                  />
                )}
              </h1>
              {socialLinks.length > 0 && (
                <div
                  className={classNames(
                    "flex items-center gap-2",
                    isLongName && "justify-center md:justify-start"
                  )}>
                  {socialLinks.map((item) => (
                    <a key={item.key} href={item.url} target="_blank" rel="noreferrer">
                      <SocialIcon key={item.key} name={item.key} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            {!isBioEmpty && (
              <>
                <div
                  className="text-subtle break-words text-center text-sm font-medium md:px-[10%] lg:px-[20%]"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: props.safeBio }}
                />
              </>
            )}
          </div>

          <div
            className={classNames("bg-default mx-auto flex flex-col gap-4 rounded-md pb-8 pt-2 lg:max-w-4xl")}
            data-testid="event-types">
            {eventTypes.map((type) => {
              const iconParams = getIconParamsFromMetadata(type.metadata);
              return (
                <div
                  key={type.id}
                  onClick={() => handleEventTypeClick(type)}
                  className="dark:hover:bg-emphasis hover:bg-muted border-default bg-default group relative cursor-pointer rounded-md border shadow-md transition hover:scale-[1.02]"
                  data-testid="event-type-link">
                  <div className="block w-full px-2 py-4">
                    <div className="mb-2 flex flex-row items-center gap-2">
                      <div className="self-start p-2">
                        <Icon
                          name={iconParams?.icon?.toLowerCase() as IconName}
                          className="h-6 w-6"
                          style={{ color: iconParams.color }}
                        />
                      </div>
                      <div className="mr-20">
                        <h3 className="text-default text-base font-semibold">{type.title}</h3>
                        {type.descriptionAsSafeHTML && (
                          <div
                            className={classNames(
                              "text-subtle line-clamp-3 break-words text-sm",
                              "line-clamp-4 [&>*:not(:first-child)]:hidden"
                            )}
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{
                              __html: markdownToSafeHTML(type.descriptionAsSafeHTML || ""),
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex w-full flex-row justify-between">
                      <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                      <Button
                        variant="button"
                        brandColor={profile?.brandColor}
                        darkBrandColor={profile?.darkBrandColor}
                        type="button"
                        size="base"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventTypeClick(type);
                        }}>
                        {t("schedule")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}

          {(!user.hideBranding || user?.bannerUrl) && (
            <div key="logo" className={classNames("mb-8 flex w-full justify-center")}>
              <Branding bannerUrl={user?.bannerUrl} size={user?.bannerUrl ? "sm" : "xs"} />
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default UserPage;
