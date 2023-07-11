import type { GetStaticPropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { orgDomainConfig, subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DOCS_URL, JOIN_DISCORD, WEBSITE_URL, IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HeadSeo } from "@calcom/ui";
import { BookOpen, Check, ChevronRight, FileText, Shield } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

import { ssgInit } from "@server/lib/ssg";

enum pageType {
  ORG = "org",
  TEAM = "team",
  USER = "user",
  OTHER = "other",
}

export default function Custom404() {
  const { t } = useLocale();

  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [currentPageType, setCurrentPageType] = useState<pageType>(pageType.USER);

  const links = [
    {
      title: "Enterprise",
      description: "Learn more about organizations and subdomains in our enterprise plan.",
      icon: Shield,
      href: `${WEBSITE_URL}/enterprise`,
    },
    {
      title: t("documentation"),
      description: t("documentation_description"),
      icon: FileText,
      href: DOCS_URL,
    },
    {
      title: t("blog"),
      description: t("blog_description"),
      icon: BookOpen,
      href: `${WEBSITE_URL}/blog`,
    },
  ];

  const [url, setUrl] = useState(`${WEBSITE_URL}/signup`);
  useEffect(() => {
    const { isValidOrgDomain, currentOrgDomain } = orgDomainConfig(window.location.host);
    const [routerUsername] = router.asPath.replace("%20", "-").split(/[?#]/);
    if (!isValidOrgDomain || !currentOrgDomain) {
      const splitPath = routerUsername.split("/");
      if (splitPath[1] === "team" && splitPath.length === 3) {
        // Accessing a non-existent team
        setUsername(splitPath[2]);
        setCurrentPageType(pageType.TEAM);
        setUrl(`${WEBSITE_URL}/signup?callbackUrl=settings/teams/new%3Fslug%3D${username.replace("/", "")}`);
      } else {
        setUsername(routerUsername);
        setUrl(`${WEBSITE_URL}/signup?username=${username.replace("/", "")}`);
      }
    } else {
      setUsername(currentOrgDomain);
      setCurrentPageType(pageType.ORG);
      setUrl(
        `${WEBSITE_URL}/signup?callbackUrl=settings/organizations/new%3Fslug%3D${username.replace("/", "")}`
      );
    }
  }, []);

  const isSuccessPage = router.asPath.startsWith("/booking");
  const isSubpage = router.asPath.includes("/", 2) || isSuccessPage;
  const isSignup = router.asPath.startsWith("/signup");
  /**
   * If we're on 404 and the route is insights it means it is disabled
   * TODO: Abstract this for all disabled features
   **/
  const isInsights = router.asPath.startsWith("/insights");
  if (isInsights) {
    return (
      <>
        <HeadSeo
          title="Feature is currently disabled"
          description={t("404_page_not_found")}
          nextSeoProps={{
            nofollow: true,
            noindex: true,
          }}
        />
        <div className="min-h-screen bg-white px-4" data-testid="404-page">
          <main className="mx-auto max-w-xl pb-6 pt-16 sm:pt-24">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-black">{t("error_404")}</p>
              <h1 className="font-cal mt-2 text-4xl font-extrabold text-gray-900 sm:text-5xl">
                Feature is currently disabled
              </h1>
            </div>
            <div className="mt-12">
              <div className="mt-8">
                <Link href="/" className="text-base font-medium text-black hover:text-gray-500">
                  {t("or_go_back_home")}
                  <span aria-hidden="true"> &rarr;</span>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!username) return null;

  return (
    <>
      <HeadSeo
        title={isSignup ? t("signup_requires") : t("404_page_not_found")}
        description={t("404_page_not_found")}
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div className="bg-default min-h-screen px-4" data-testid="404-page">
        <main className="mx-auto max-w-xl pb-6 pt-16 sm:pt-24">
          {isSignup && process.env.NEXT_PUBLIC_WEBAPP_URL !== "https://app.cal.com" ? (
            <div>
              <div>
                <p className="text-emphasis text-sm font-semibold uppercase tracking-wide">
                  {t("missing_license")}
                </p>
                <h1 className="font-cal text-emphasis mt-2 text-3xl font-extrabold">
                  {t("signup_requires")}
                </h1>
                <p className="mt-4">{t("signup_requires_description", { companyName: "Cal.com" })}</p>
              </div>
              <div className="mt-12">
                <h2 className="text-subtle text-sm font-semibold uppercase tracking-wide">
                  {t("next_steps")}
                </h2>
                <ul role="list" className="mt-4">
                  <li className="border-2 border-green-500 px-4 py-2">
                    <a
                      href="https://console.cal.com"
                      className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse">
                      <div className="flex-shrink-0">
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                          <Check className="h-6 w-6 text-green-500" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-emphasis text-base font-medium">
                          <span className="focus-within:ring-empthasis rounded-sm focus-within:ring-2 focus-within:ring-offset-2">
                            <span className="focus:outline-none">
                              <span className="absolute inset-0" aria-hidden="true" />
                              {t("acquire_commercial_license")}
                            </span>
                          </span>
                        </h3>
                        <p className="text-subtle text-base">{t("the_infrastructure_plan")}</p>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <ChevronRight className="text-muted h-5 w-5" aria-hidden="true" />
                      </div>
                    </a>
                  </li>
                </ul>

                <ul role="list" className="border-subtle divide-subtle divide-y">
                  <li className="px-4 py-2">
                    <Link
                      href="https://cal.com/self-hosting/installation"
                      className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse">
                      <div className="flex-shrink-0">
                        <span className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                          <FileText className="text-default h-6 w-6" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-emphasis text-base font-medium">
                          <span className="focus-within:ring-empthasis rounded-sm focus-within:ring-2 focus-within:ring-offset-2">
                            <span className="absolute inset-0" aria-hidden="true" />
                            {t("prisma_studio_tip")}
                          </span>
                        </h3>
                        <p className="text-subtle text-base">{t("prisma_studio_tip_description")}</p>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <ChevronRight className="text-muted h-5 w-5" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                  <li className="px-4 py-2">
                    <a
                      href={JOIN_DISCORD}
                      className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse">
                      <div className="flex-shrink-0">
                        <span className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                          <svg
                            className="text-default h-6 w-6"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 127.14 96.36">
                            <title>Discord Logo</title>
                            <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" />
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-emphasis text-base font-medium">
                          <span className="focus-within:ring-empthasis rounded-sm focus-within:ring-2 focus-within:ring-offset-2">
                            <span className="absolute inset-0" aria-hidden="true" />
                            Discord
                          </span>
                        </h3>
                        <p className="text-subtle text-base">{t("join_our_community")}</p>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <ChevronRight className="text-muted h-5 w-5" aria-hidden="true" />
                      </div>
                    </a>
                  </li>
                </ul>
                <div className="mt-8">
                  <Link
                    href={`${WEBSITE_URL}/enterprise`}
                    className="hover:text-subtle text-emphasis text-base font-medium">
                    {t("contact_sales")}
                    <span aria-hidden="true"> &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-emphasis text-sm font-semibold uppercase tracking-wide">
                  {t("error_404")}
                </p>
                <h1 className="font-cal text-emphasis mt-2 text-4xl font-extrabold sm:text-5xl">
                  {isSuccessPage ? "Booking not found" : t("page_doesnt_exist")}
                </h1>
                {isSubpage && currentPageType !== pageType.TEAM ? (
                  <span className="mt-2 inline-block text-lg ">
                    {t("check_spelling_mistakes_or_go_back")}
                  </span>
                ) : IS_CALCOM ? (
                  <a target="_blank" href={url} className="mt-2 inline-block text-lg" rel="noreferrer">
                    {t(`404_the_${currentPageType.toLowerCase()}`)}{" "}
                    <strong className="text-blue-500">
                      {new URL(WEBSITE_URL).hostname}
                      {username}
                    </strong>{" "}
                    {t("is_still_available")} <span className="text-blue-500">{t("register_now")}</span>.
                  </a>
                ) : (
                  <span className="mt-2 inline-block text-lg">
                    {t(`404_the_${currentPageType.toLowerCase()}`)}{" "}
                    <strong className="text-lgtext-green-500 mt-2 inline-block">{username}</strong>{" "}
                    {t("is_still_available")}
                  </span>
                )}
              </div>
              <div className="mt-12">
                {((!isSubpage && IS_CALCOM) ||
                  currentPageType === pageType.ORG ||
                  currentPageType === pageType.TEAM) && (
                  <ul role="list" className="my-4">
                    <li className="border-2 border-green-500 px-4 py-2">
                      <a
                        href={url}
                        target="_blank"
                        className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse"
                        rel="noreferrer">
                        <div className="flex-shrink-0">
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                            <Check className="h-6 w-6 text-green-500" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-emphasis text-base font-medium">
                            <span className="focus-within:ring-empthasis rounded-sm focus-within:ring-2 focus-within:ring-offset-2">
                              <span className="focus:outline-none">
                                <span className="absolute inset-0" aria-hidden="true" />
                                {t("register")}{" "}
                                <strong className="text-green-500">{`${
                                  currentPageType === pageType.TEAM
                                    ? `${new URL(WEBSITE_URL).host}/team/`
                                    : ""
                                }${username}${
                                  currentPageType === pageType.ORG ? `.${subdomainSuffix()}` : ""
                                }`}</strong>
                              </span>
                            </span>
                          </h3>
                          <p className="text-subtle text-base">
                            {t(`404_claim_entity_${currentPageType.toLowerCase()}`)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 self-center">
                          <ChevronRight className="text-muted h-5 w-5" aria-hidden="true" />
                        </div>
                      </a>
                    </li>
                  </ul>
                )}
                <h2 className="text-subtle text-sm font-semibold uppercase tracking-wide">
                  {t("popular_pages")}
                </h2>
                <ul role="list" className="border-subtle divide-subtle divide-y">
                  {links
                    .filter((_, idx) => currentPageType === pageType.ORG || idx !== 0)
                    .map((link, linkIdx) => (
                      <li key={linkIdx} className="px-4 py-2">
                        <Link
                          href={link.href}
                          className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse">
                          <div className="flex-shrink-0">
                            <span className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                              <link.icon className="text-default h-6 w-6" aria-hidden="true" />
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
                          <div className="flex-shrink-0 self-center">
                            <ChevronRight className="text-muted h-5 w-5" aria-hidden="true" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  <li className="px-4 py-2">
                    <a
                      href={JOIN_DISCORD}
                      className="relative flex items-start space-x-4 py-6 rtl:space-x-reverse">
                      <div className="flex-shrink-0">
                        <span className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                          <svg
                            className="text-default h-6 w-6"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 127.14 96.36">
                            <title>Discord Logo</title>
                            <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" />
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-emphasis text-base font-medium">
                          <span className="focus-within:ring-empthasis rounded-sm focus-within:ring-2 focus-within:ring-offset-2">
                            <span className="absolute inset-0" aria-hidden="true" />
                            Discord
                          </span>
                        </h3>
                        <p className="text-subtle text-base">{t("join_our_community")}</p>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <ChevronRight className="text-muted h-5 w-5" aria-hidden="true" />
                      </div>
                    </a>
                  </li>
                </ul>
                <div className="mt-8">
                  <Link href="/" className="hover:text-subtle text-emphasis text-base font-medium">
                    {t("or_go_back_home")}
                    <span aria-hidden="true"> &rarr;</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

Custom404.PageWrapper = PageWrapper;

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const ssr = await ssgInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};
