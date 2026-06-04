"use client";

import { DOCS_URL, IS_CALCOM, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

enum PageType {
  USER = "USER",
  OTHER = "OTHER",
}

function getPageInfo(pathname: string) {
  const [routerUsername] = pathname?.replace("%20", "-").split(/[?#]/) ?? [];
  return {
    username: routerUsername ?? "",
    pageType: PageType.USER,
    url: `${WEBSITE_URL}/signup?username=${(routerUsername ?? "").replace("/", "")}`,
  };
}

export function NotFound({ host }: { host: string }) {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const { username, pageType, url } = getPageInfo(pathname);
  const isBookingSuccessPage = pathname?.startsWith("/booking");
  const isSubpage = pathname?.includes("/", 2) || isBookingSuccessPage;

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      window.CalComPageStatus = "404";
    }
  }, []);

  const links = [
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

  return (
    <div className="min-h-screen bg-default px-4" data-testid="404-page">
      <main className="mx-auto max-w-xl pt-16 pb-6 sm:pt-24">
        <div className="text-center">
          <p className="font-semibold text-emphasis text-sm uppercase tracking-wide">{t("error_404")}</p>
          <h1 className="mt-2 font-cal font-extrabold text-4xl text-emphasis sm:text-5xl">
            {isBookingSuccessPage ? "Booking not found" : t("page_doesnt_exist")}
          </h1>
          {isSubpage ? (
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
                  <strong className="mt-2 inline-block text-green-500 text-lg">{username}</strong>{" "}
                  {t("is_still_available")}
                </>
              ) : null}
            </span>
          )}
        </div>
        <div className="mt-12">
          {!isSubpage && IS_CALCOM && (
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
                    <h3 className="font-medium text-base text-emphasis">
                      <span className="rounded-sm focus-within:ring-2 focus-within:ring-empthasis focus-within:ring-offset-2">
                        <span className="focus:outline-none">
                          <span className="absolute inset-0" aria-hidden="true" />
                          {t("register")} <strong className="text-green-500">{username}</strong>
                        </span>
                      </span>
                    </h3>
                    <p className="text-base text-subtle">{t(`404_claim_entity_${pageType.toLowerCase()}`)}</p>
                  </div>
                  <div className="shrink-0 self-center">
                    <Icon name="chevron-right" className="h-5 w-5 text-muted" aria-hidden="true" />
                  </div>
                </a>
              </li>
            </ul>
          )}
          <h2 className="font-semibold text-sm text-subtle uppercase tracking-wide">{t("popular_pages")}</h2>
          <ul role="list" className="divide-y divide-subtle border-subtle">
            {links.map((link, linkIdx) => (
              <li key={linkIdx} className="px-4 py-2">
                <a href={link.href} className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse">
                  <div className="shrink-0">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-cal-muted">
                      <Icon name={link.icon} className="h-6 w-6 text-default" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-base text-emphasis">
                      <span className="rounded-sm focus-within:ring-2 focus-within:ring-empthasis focus-within:ring-offset-2">
                        <span className="absolute inset-0" aria-hidden="true" />
                        {link.title}
                      </span>
                    </h3>
                    <p className="text-base text-subtle">{link.description}</p>
                  </div>
                  <div className="shrink-0 self-center">
                    <Icon name="chevron-right" className="h-5 w-5 text-muted" aria-hidden="true" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href={WEBSITE_URL} className="font-medium text-base text-emphasis hover:text-subtle">
              {t("or_go_back_home")}
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
