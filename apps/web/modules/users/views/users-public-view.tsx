"use client";

import { Branding } from "@calid/features/ui/Branding";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import { Icon, SocialIcon, type IconName, type SocialIconName } from "@calid/features/ui/components/icon";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";

import { sdkActionManager, useEmbedNonStylesConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
import { getBrandLogoUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import { UserNotFoundView } from "./user-not-found-view";

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

function stripHtmlTags(html: string): string {
  if (typeof window !== "undefined") {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  // Fallback for SSR: simple regex to remove HTML tags
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
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
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const BIO_CHAR_LIMIT = 250;
  const bioPlainText = stripHtmlTags(props.safeBio || "");
  const isBioLong = bioPlainText.length > BIO_CHAR_LIMIT;

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

  // useEffect(() => {
  //   const defaultFavicons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  //   defaultFavicons.forEach((link) => {
  //     link.rel = "icon";
  //     link.href = user?.faviconUrl || "";
  //     link.type = "image/png";
  //   });
  //   if (defaultFavicons.length === 0) {
  //     const link: HTMLLinkElement = document.createElement("link");
  //     link.rel = "icon";
  //     link.href = user?.faviconUrl ?? "/favicon.ico";
  //     link.type = "image/png";
  //     document.head.appendChild(link);
  //   }
  // }, [user?.faviconUrl]);
  const faviconUrl = user?.faviconUrl
    ? `${getBrandLogoUrl({ faviconUrl: user.faviconUrl }, true)}?v=${Date.now()}`
    : "/calid_favicon.svg";
  console.log("DEBUG FAVICON:", faviconUrl);
  if (entity?.considerUnpublished) {
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  if (props.userNotFound) {
    return <UserNotFoundView slug={props.slug ?? "User"} />;
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
      <Head>
        <link rel="icon" type="image/png" href={faviconUrl} key="icon" />
        <link rel="shortcut icon" type="image/png" href={faviconUrl} key="shortcut-icon" />
        <link rel="apple-touch-icon" type="image/png" href={faviconUrl} key="apple-touch-icon" />
        <link rel="manifest" href="data:application/manifest+json,{}" />
      </Head>
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
                <div className="text-subtle break-words text-center text-sm font-medium md:px-[10%] lg:px-[20%]">
                  {isBioLong && !isBioExpanded ? (
                    <div className="relative inline-block w-full">
                      <div
                        className="line-clamp-2 overflow-hidden pr-0 md:pr-24"
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: props.safeBio }}
                      />
                      <div className="from-default via-default absolute bottom-0 right-0 hidden items-baseline md:inline-flex">
                        <button
                          onClick={() => setIsBioExpanded(!isBioExpanded)}
                          className="text-subtle hover:text-default whitespace-nowrap text-sm font-medium underline transition-colors"
                          type="button">
                          Read more
                        </button>
                      </div>
                      <div className="mt-2 flex w-full justify-center md:hidden">
                        <button
                          onClick={() => setIsBioExpanded(!isBioExpanded)}
                          className="text-subtle hover:text-default text-sm font-medium underline transition-colors"
                          type="button">
                          Read more
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="overflow-visible"
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: props.safeBio }}
                      />
                      {isBioLong && (
                        <div className="mt-2">
                          <button
                            onClick={() => setIsBioExpanded(!isBioExpanded)}
                            className="text-subtle hover:text-default text-sm font-medium underline transition-colors"
                            type="button">
                            Read less
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                    <div className="flex w-full flex-row items-end justify-between">
                      <div className="pl-12">
                        <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                      </div>
                      <Button
                        variant="button"
                        brandColor={profile?.brandColor}
                        darkBrandColor={profile?.darkBrandColor}
                        type="button"
                        size="base"
                        className="h-8 flex-shrink-0"
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
