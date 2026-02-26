"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

import {
  getOrgDomainConfigFromHostname,
  subdomainSuffix,
} from "@calcom/features/ee/organizations/lib/orgDomains";
import { DOCS_URL, IS_CALCOM, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";

enum PageType {
  ORG = "ORG",
  TEAM = "TEAM",
  USER = "USER",
  OTHER = "OTHER",
}

function getPageInfo(pathname: string, host: string) {
  const { isValidOrgDomain, currentOrgDomain } = getOrgDomainConfigFromHostname({ hostname: host });
  const [routerUsername] = pathname?.replace("%20", "-").split(/[?#]/) ?? [];
  if (routerUsername && (!isValidOrgDomain || !currentOrgDomain)) {
    const splitPath = routerUsername.split("/");
    if (splitPath[1] === "team" && splitPath.length === 3) {
      return {
        username: splitPath[2],
        pageType: PageType.TEAM,
        url: `${WEBSITE_URL}/signup?callbackUrl=settings/teams/new%3Fslug%3D${splitPath[2].replace("/", "")}`,
      };
    } else {
      return {
        username: routerUsername,
        pageType: PageType.USER,
        url: `${WEBSITE_URL}/signup?username=${routerUsername.replace("/", "")}`,
      };
    }
  } else {
    return {
      username: currentOrgDomain ?? "",
      pageType: PageType.ORG,
      url: `${WEBSITE_URL}/signup?callbackUrl=settings/organizations/new%3Fslug%3D${
        currentOrgDomain?.replace("/", "") ?? ""
      }`,
    };
  }
}

export function NotFound({ host }: { host: string }) {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const { username, pageType, url } = getPageInfo(pathname, host);
  const isBookingSuccessPage = pathname?.startsWith("/booking");
  const isSubpage = pathname?.includes("/", 2) || isBookingSuccessPage;
  const isInsights = pathname?.startsWith("/insights");

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      window.CalComPageStatus = "404";
    }
  }, []);

  const links = [
    {
      title: t("enterprise"),
      description: "Learn more about organizations and subdomains in our enterprise plan.",
      icon: "shield" as const,
      href: `${WEBSITE_URL}/enterprise`,
    },
    {
      title: t("documentation"),
      description: t("documentation_description"),
      icon: "file-text" as const,
      href: DOCS_URL,
    },
    {
      title: t("blog"),
      description: t("blog_description"),
      icon: "book-open" as const,
      href: `${WEBSITE_URL}/blog`,
    },
  ];

  /**
   * If we're on 404 and the route is insights it means it is disabled
   * TODO: Abstract this for all disabled features
   **/
  if (isInsights) {
    return (
      <div className="min-h-screen bg-white px-4" data-testid="404-page">
        <main className="mx-auto max-w-xl pb-6 pt-16 sm:pt-24">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-black">{t("error_404")}</p>
            <h1 className="font-cal mt-2 text-4xl font-extrabold text-gray-900 sm:text-5xl">
              {t("feature_currently_disabled") ?? "Feature is currently disabled"}
            </h1>
          </div>
          <div className="mt-12">
            <div className="mt-8">
              <Link href={WEBSITE_URL} className="text-base font-medium text-black hover:text-gray-500">
                {t("or_go_back_home")}
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-default min-h-screen px-4" data-testid="404-page">
      <main className="mx-auto max-w-xl pb-6 pt-16 sm:pt-24">
        <div className="text-center">
          <p className="text-emphasis text-sm font-semibold uppercase tracking-wide">{t("error_404")}</p>
          <h1 className="font-cal text-emphasis mt-2 text-4xl font-extrabold sm:text-5xl">
            {isBookingSuccessPage ? "Booking not found" : t("page_doesnt_exist")}
          </h1>
          {isSubpage && pageType !== PageType.TEAM ? (
            <span className="mt-2 inline-block text-lg">{t("check_spelling_mistakes_or_go_back")}</span>
          ) : IS_CALCOM ? (
            <a target="_blank" href={url} className="mt-2 inline-block text-lg" rel="noreferrer">
              {t(`404_the_${pageType.toLowerCase()}`)}{" "}
              {username ? (
                <>
                  <strong className="text-blue-500">{username}</strong>
                  {` ${t("is_still_available")} `}
                  <span className="text-blue-500">{t("register_now")}</span>.
                </>
              ) : null}
            </a>
          ) : (
            <span className="mt-2 inline-block text-lg">
              {t(`404_the_${pageType.toLowerCase()}`)}{" "}
              {username ? (
                <>
                  <strong className="mt-2 inline-block text-lg text-green-500">{username}</strong>{" "}
                  {t("is_still_available")}
                </>
              ) : null}
            </span>
          )}
        </div>
        <div className="mt-12">
          {((!isSubpage && IS_CALCOM) || pageType === PageType.ORG || pageType === PageType.TEAM) && (
            <ul role="list" className="my-4">
              <li className="border-2 border-green-500 px-4 py-2">
                <a
                  href={url}
                  target="_blank"
                  className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse"
                  rel="noreferrer">
                  <div className="shrink-0">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                      <Icon name="check" className="h-6 w-6 text-green-500" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-emphasis text-base font-medium">
                      <span className="focus-within:ring-empthasis rounded-sm focus-within:ring-2 focus-within:ring-offset-2">
                        <span className="focus:outline-none">
                          <span className="absolute inset-0" aria-hidden="true" />
                          {t("register")}{" "}
                          <strong className="text-green-500">{`${
                            pageType === PageType.TEAM ? `${new URL(WEBSITE_URL).host}/team/` : ""
                          }${username}${pageType === PageType.ORG ? `.${subdomainSuffix()}` : ""}`}</strong>
                        </span>
                      </span>
                    </h3>
                    <p className="text-subtle text-base">{t(`404_claim_entity_${pageType.toLowerCase()}`)}</p>
                  </div>
                  <div className="shrink-0 self-center">
                    <Icon name="chevron-right" className="text-muted h-5 w-5" aria-hidden="true" />
                  </div>
                </a>
              </li>
            </ul>
          )}
          <h2 className="text-subtle text-sm font-semibold uppercase tracking-wide">{t("popular_pages")}</h2>
          <ul role="list" className="border-subtle divide-subtle divide-y">
            {links
              .filter((_, idx) => pageType === PageType.ORG || idx !== 0)
              .map((link, linkIdx) => (
                <li key={linkIdx} className="px-4 py-2">
                  <a
                    href={link.href}
                    className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse">
                    <div className="shrink-0">
                      <span className="bg-cal-muted flex h-12 w-12 items-center justify-center rounded-lg">
                        <Icon name={link.icon} className="text-default h-6 w-6" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-emphasis text-base font-medium">
                        <span className="focus-within:ring-empthasis rounded-sm focus-within:ring-2 focus-within:ring-offset-2">
                          <span className="absolute inset-0" aria-hidden="true" />
                          {link.title}
                        </span>
                      </h3>
                      <p className="text-subtle text-base">{link.description}</p>
                    </div>
                    <div className="shrink-0 self-center">
                      <Icon name="chevron-right" className="text-muted h-5 w-5" aria-hidden="true" />
                    </div>
                  </a>
                </li>
              ))}
          </ul>
          <div className="mt-8">
            <Link href={WEBSITE_URL} className="hover:text-subtle text-emphasis text-base font-medium">
              {t("or_go_back_home")}
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
