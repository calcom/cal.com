import { getWorldViewSVGStr } from "@pages/getting-started/worldviewUtils";
import type { ICountry } from "country-state-city";
import { Country } from "country-state-city";
import * as d3 from "d3";
import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { parseSync } from "svgson";
import type { SVGSON } from "svgson/dist/types";
import { z } from "zod";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc";
import { Button, StepCard, Steps } from "@calcom/ui";
import { Loader } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import { ConnectedCalendars } from "@components/getting-started/steps-views/ConnectCalendars";
import { ConnectedVideoStep } from "@components/getting-started/steps-views/ConnectedVideoStep";
import { SetupAvailability } from "@components/getting-started/steps-views/SetupAvailability";
import UserProfile from "@components/getting-started/steps-views/UserProfile";
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

import { ssrInit } from "@server/lib/ssr";

import worldviewGeoJSON from "../../public/worldviewGeo.json";

const INITIAL_STEP = "user-settings";
const steps = [
  "user-settings",
  "connected-calendar",
  "connected-video",
  "setup-availability",
  "user-profile",
] as const;

const stepTransform = (step: (typeof steps)[number]) => {
  const stepIndex = steps.indexOf(step);
  if (stepIndex > -1) {
    return steps[stepIndex];
  }
  return INITIAL_STEP;
};

const stepRouteSchema = z.object({
  step: z.array(z.enum(steps)).default([INITIAL_STEP]),
  from: z.string().optional(),
});

// TODO: Refactor how steps work to be contained in one array/object. Currently we have steps,initalsteps,headers etc. These can all be in one place
const OnboardingPage = () => {
  const pathname = usePathname();
  const params = useParamsWithFallback();
  const router = useRouter();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const result = stepRouteSchema.safeParse(params);
  const currentStep = result.success ? result.data.step[0] : INITIAL_STEP;
  const from = result.success ? result.data.from : "";
  const svgRef = useRef<any>(null);
  const [fullName, setFullName] = useState<string>(null);
  const [timeZone, setTimeZone] = useState<string>(null);

  const headers = [
    {
      title: `${t("welcome_to_cal_header", { appName: APP_NAME })}`,
      subtitle: [`${t("we_just_need_basic_info")}`, `${t("edit_form_later_subtitle")}`],
    },
    {
      title: `${t("connect_your_calendar")}`,
      subtitle: [`${t("connect_your_calendar_instructions")}`],
      skipText: `${t("connect_calendar_later")}`,
    },
    {
      title: `${t("connect_your_video_app")}`,
      subtitle: [`${t("connect_your_video_app_instructions")}`],
      skipText: `${t("set_up_later")}`,
    },
    {
      title: `${t("set_availability")}`,
      subtitle: [
        `${t("set_availability_getting_started_subtitle_1")}`,
        `${t("set_availability_getting_started_subtitle_2")}`,
      ],
    },
    {
      title: `${t("nearly_there")}`,
      subtitle: [`${t("nearly_there_instructions")}`],
    },
  ];

  // TODO: Add this in when we have solved the ability to move to tokens accept invite and note invitedto
  // Ability to accept other pending invites if any (low priority)
  // if (props.hasPendingInvites) {
  //   headers.unshift(
  //     props.hasPendingInvites && {
  //       title: `${t("email_no_user_invite_heading", { appName: APP_NAME })}`,
  //       subtitle: [], // TODO: come up with some subtitle text here
  //     }
  //   );
  // }

  const goToIndex = (index: number) => {
    const newStep = steps[index];
    router.push(`/getting-started/${stepTransform(newStep)}`);
  };

  const currentStepIndex = steps.indexOf(currentStep);

  function isPointInsidePolygon(point: number[], polygon: ([number, number] | null | undefined)[]) {
    const x = point[0];
    const y = point[1];

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  useEffect(() => {
    if (timeZone !== "" && timeZone !== null) {
      const targetTimeZone = timeZone;

      // Search country by timezone
      const targetCountry: ICountry | undefined = Country.getAllCountries().find((c: any) => {
        const alltimezones = c.timezones.map((t: any) => {
          return t.zoneName;
        });

        if (alltimezones.includes(targetTimeZone)) return true;

        return false;
      });

      if (!targetCountry) return;

      // Find country's geo json data
      const country = worldviewGeoJSON.features.find((feature) => {
        return feature.properties.name_en === targetCountry.name;
      });
      const areaCoordinates: ([number, number] | null)[] = [];
      country?.geometry.coordinates.slice(0, 1).map((g) => {
        areaCoordinates.push(...(g as [number, number][]));
      });

      // Convert geo json data to svg coordinates
      let svgCoordinates: ([number, number] | null | undefined)[] = [];
      let countryCoord: [number, number] = [0, 0];
      if (areaCoordinates) {
        const projection = d3.geoMercator().scale(100).translate([318, 235]);

        svgCoordinates = areaCoordinates
          .filter((coord) => coord !== null)
          .map((coord) => {
            if (coord) {
              return projection(coord);
            }
          });
      }

      // Highlight country on map
      if (svgRef.current) {
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }

        const svgSstr = getWorldViewSVGStr();
        const svgparsed = parseSync(svgSstr);
        svgparsed.children = svgparsed.children.map((child) => {
          if (
            isPointInsidePolygon(
              child.attributes.d
                .split("C")[0]
                .split(" ")
                .map((c) => {
                  return parseFloat(c.replace("M", ""));
                }),
              svgCoordinates
            )
          ) {
            if (countryCoord[0] == 0) {
              countryCoord = child.attributes.d
                .split("C")[0]
                .split(" ")
                .map((c) => {
                  return parseFloat(c.replace("M", ""));
                });
            }

            child.attributes.fill = "#374151";
          }

          return child;
        });

        const svgElement = createSVGElement(svgparsed, "svg", true, countryCoord);
        svgRef.current.appendChild(svgElement);
      }
    } else {
      if (svgRef.current) {
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }

        const svgSstr = getWorldViewSVGStr();
        const svgparsed = parseSync(svgSstr);
        const svgElement = createSVGElement(svgparsed, "svg", true, [0, 0]);
        svgRef.current.appendChild(svgElement);
      }
    }
  }, [timeZone]);

  function createSVGElement(
    svgsonObject: SVGSON,
    element = "svg",
    animateZoom = false,
    zoomAt: [number, number] = [0, 0]
  ): SVGElement {
    if (!svgsonObject.attributes) return (<svg />) as unknown as SVGElement;

    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", element);

    for (const [key, value] of Object.entries(svgsonObject.attributes)) {
      svgElement.setAttribute(key, value as string);

      if (element === "svg" && animateZoom && zoomAt[0] != 0 && zoomAt[1] != 0) {
        const x = zoomAt[0];
        const y = zoomAt[1];
        setTimeout(() => {
          svgElement.setAttribute(
            "style",
            `scale:5.3; transform-origin: ${x}px ${y}px;  transition: scale 2s; object-fit: cover;`
          );
        }, 1000);
      }
    }

    if (svgsonObject.children) {
      svgsonObject.children.forEach((child: SVGSON) => {
        const childElement: SVGElement = createSVGElement(child, "path");
        svgElement.appendChild(childElement);
      });
    }

    return svgElement;
  }

  // TODO: UI flickers when changing steps. This is because we are using suspense to load the step component. We should use a loading state instead
  const onNameOrTimezoneChange = (Name?: string, TimeZone?: string) => {
    setFullName(Name || "");
    setTimeZone(TimeZone || "");
  };

  return (
    <div
      className={classNames(
        "dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen [--cal-brand:#111827] dark:[--cal-brand:#FFFFFF]",
        "[--cal-brand-emphasis:#101010] dark:[--cal-brand-emphasis:#e1e1e1]",
        "[--cal-brand-subtle:#9CA3AF]",
        "[--cal-brand-text:#FFFFFF]  dark:[--cal-brand-text:#000000]"
      )}
      data-testid="onboarding"
      key={pathname}>
      <Head>
        <title>{`${APP_NAME} - ${t("getting_started")}`}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="scrollbar-thin max-h-screen min-h-screen overflow-y-auto">
          <div className="mx-auto py-6 sm:px-4 md:py-24">
            <div className="relative">
              <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
                <div className="sm:max-w-[520px]">
                  <header>
                    <p className="font-cal mb-3 text-[28px] font-medium leading-7">
                      {headers[currentStepIndex]?.title || "Undefined title"}
                    </p>

                    {headers[currentStepIndex]?.subtitle.map((subtitle, index) => (
                      <p className="text-subtle font-sans text-sm font-normal" key={index}>
                        {subtitle}
                      </p>
                    ))}
                  </header>
                  <Steps
                    maxSteps={steps.length}
                    currentStep={currentStepIndex + 1}
                    navigateToStep={goToIndex}
                  />
                </div>
                <StepCard>
                  <Suspense fallback={<Loader />}>
                    {currentStep === "user-settings" && (
                      <UserSettings
                        nextStep={() => goToIndex(1)}
                        hideUsername={from === "signup"}
                        onNameOrTimezoneChange={onNameOrTimezoneChange}
                      />
                    )}
                    {currentStep === "connected-calendar" && (
                      <ConnectedCalendars nextStep={() => goToIndex(2)} />
                    )}

                    {currentStep === "connected-video" && (
                      <ConnectedVideoStep nextStep={() => goToIndex(3)} />
                    )}

                    {currentStep === "setup-availability" && (
                      <SetupAvailability
                        nextStep={() => goToIndex(4)}
                        defaultScheduleId={user.defaultScheduleId}
                      />
                    )}
                    {currentStep === "user-profile" && <UserProfile />}
                  </Suspense>
                </StepCard>

                {headers[currentStepIndex]?.skipText && (
                  <div className="flex w-full flex-row justify-center">
                    <Button
                      color="minimal"
                      data-testid="skip-step"
                      onClick={(event) => {
                        event.preventDefault();
                        goToIndex(currentStepIndex + 1);
                      }}
                      className="mt-8 cursor-pointer px-4 py-2 font-sans text-sm font-medium">
                      {headers[currentStepIndex]?.skipText}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="min-h-full p-4">
          {currentStep === "user-settings" && (
            <>
              <div
                ref={svgRef}
                className="flex max-h-full min-h-full items-center justify-center overflow-x-clip overflow-y-clip rounded-l-2xl align-middle"
                style={{ backgroundColor: "grey", scale: 5 }}
              />

              {/* Fixed div at center */}
              {timeZone && (
                <div className="absolute left-3/4 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
                  <div className="flex flex-col items-center justify-center">
                    <div className="min-w-52 rounded-xl bg-white p-3">
                      <div className="items-start">
                        {/* Full name */}
                        <div className="mb-1 text-sm font-medium text-slate-500">Full Name</div>
                        <div className="min-h-4 mb-1 text-sm font-medium text-slate-500">
                          {fullName || ""}
                        </div>
                        {/* Timezone */}
                        <div className="min-h-4 text-sm font-medium text-slate-800">{timeZone || ""}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, res } = context;

  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const ssr = await ssrInit(context);

  await ssr.viewer.me.prefetch();

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      completedOnboarding: true,
      teams: {
        select: {
          accepted: true,
          team: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User from session not found");
  }

  if (user.completedOnboarding) {
    return { redirect: { permanent: false, destination: "/event-types" } };
  }
  const locale = await getLocale(context.req);

  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
      trpcState: ssr.dehydrate(),
      hasPendingInvites: user.teams.find((team) => team.accepted === false) ?? false,
    },
  };
};

OnboardingPage.PageWrapper = PageWrapper;

export default OnboardingPage;
