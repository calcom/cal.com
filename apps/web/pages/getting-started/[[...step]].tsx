"use client";

import getWorldViewSVGStr from "@pages/getting-started/worldviewUtils";
import type { ICountry } from "country-state-city";
import { Country } from "country-state-city";
import { geoMercator } from "d3";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { parseSync } from "svgson";
import { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { LargeCalendar } from "@calcom/features/auth/signup/LargeCalendar";
import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc";
import type { TimeRange } from "@calcom/types/schedule";
import { Avatar, Button, StepCard, Steps } from "@calcom/ui";
import { Loader, Timer, User } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import { ConnectedCalendars } from "@components/getting-started/steps-views/ConnectCalendars";
import { SetupAvailability } from "@components/getting-started/steps-views/SetupAvailability";
import UserProfile from "@components/getting-started/steps-views/UserProfile";
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

import worldviewGeoJSON from "../../public/worldviewGeo.json";

export { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

const INITIAL_STEP = "user-settings";
const steps = [
  "user-settings",
  "connected-calendar",
  // "connected-video",
  "setup-availability",
  "user-profile",
] as const;

const fakeMeetings = [
  {
    title: "A very important meeting",
    slug: "/alex/veryimportantmeeting",
    description: "A longer chat to run through designs",
    duration: 30,
    type: "1-on-1",
  },
  {
    title: "An even more important meeting",
    slug: "/alex/evenmoreimportantmeeting",
    description: "A quick chat",
    duration: 30,
    type: "1-on-1",
  },
  {
    title: "Never gonna give you up",
    slug: "/alex/rickastley",
    description: "A longer chat",
    duration: 30,
    type: "1-on-1",
  },
];

type SVGSON = {
  name: string;
  attributes: { [key: string]: string | number | boolean };
  children?: SVGSON[];
};

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

  const result = stepRouteSchema.safeParse({
    ...params,
    step: Array.isArray(params.step) ? params.step : [params.step],
  });

  const currentStep = result.success ? result.data.step[0] : INITIAL_STEP;
  const from = result.success ? result.data.from : "";
  const svgRef = useRef<HTMLDivElement>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const extraDays = 7;
  const startDate = dayjs();
  const endDate = dayjs(startDate).add(extraDays - 1, "day");
  const [availableTimeslots, setAvailableTimeslots] = useState<{
    [key: string]: TimeRange[];
  }>({});
  const [imageSrc, setImageSrc] = useState<string>(user?.avatar || "");
  const [bio, setBio] = useState<string>(user?.bio || "");

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
    // {
    //   title: `${t("connect_your_video_app")}`,
    //   subtitle: [`${t("connect_your_video_app_instructions")}`],
    //   skipText: `${t("set_up_later")}`,
    // },
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
      const xi = polygon[i]?.[0];
      const yi = polygon[i]?.[1];
      const xj = polygon[j]?.[0];
      const yj = polygon[j]?.[1];

      if (xi == undefined || yi == undefined || xj == undefined || yj == undefined) continue;

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  useEffect(() => {
    if (timeZone !== "" && timeZone !== null) {
      // Search country by timezone
      const targetCountry: ICountry | undefined = Country.getAllCountries().find((c: any) => {
        const alltimezones = c.timezones.map((t: any) => {
          return t.zoneName;
        });

        if (alltimezones.includes(timeZone)) return true;

        return false;
      });

      if (!targetCountry) return;

      // Find country's geo json data
      const country = worldviewGeoJSON.features.find((feature) => {
        return feature.properties.name_en === targetCountry.name;
      });
      const areaCoordinates: ([number, number] | null)[] = [];
      country?.geometry.coordinates.map((g) => {
        areaCoordinates.push(...(g as [number, number][]));
      });

      // Convert geo json data to svg coordinates
      let svgCoordinates: ([number, number] | null | undefined)[] = [];
      let countryCoord: [number, number] = [0, 0];
      if (areaCoordinates) {
        const projection = geoMercator().scale(100).translate([318, 235]);

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

        const svgString = getWorldViewSVGStr();
        const svgParsed = parseSync(svgString);
        svgParsed.children = svgParsed.children.map((child) => {
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
                }) as [number, number];
            }

            child.attributes.fill = "#374151";
          }

          return child;
        });

        const svgElement = createSVGElement(svgParsed, "svg", true, countryCoord);
        svgRef.current.appendChild(svgElement);
      }
    } else {
      if (svgRef.current) {
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }

        const svgString = getWorldViewSVGStr();
        const svgParsed = parseSync(svgString);
        const svgElement = createSVGElement(svgParsed, "svg", true, [0, 0]);
        svgRef.current.appendChild(svgElement);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const onNameOrTimezoneChange = (Name?: string, TimeZone?: string) => {
    setFullName(Name || "");
    setTimeZone(TimeZone || "");
  };

  const generateRange = (startDate: Dayjs, endDate: Dayjs, duration: number): TimeRange[] => {
    const range: TimeRange[] = [];
    let currentDate = dayjs(startDate);
    const stopDate = dayjs(endDate);
    while (currentDate <= stopDate) {
      range.push({
        start: currentDate.toDate(),
        end: dayjs(currentDate).add(duration, "minutes").toDate(),
      });
      currentDate = currentDate.add(duration, "minutes");
    }
    return range;
  };

  const calculateAvailableTimeslots = (ranges: TimeRange[]) => {
    const dateRange: TimeRange[] = [];

    ranges.map((m) => {
      dateRange.push(
        ...generateRange(
          dayjs(m?.start).add(new Date().getTimezoneOffset(), "minutes"),
          dayjs(m?.end).add(new Date().getTimezoneOffset(), "minutes"),
          30
        )
      );
    });

    return dateRange;
  };

  const onAvailabilityChanged = (
    mondayWatchedValue: TimeRange[],
    tuesdayWatchedValue: TimeRange[],
    wednesdayWatchedValue: TimeRange[],
    thursdayWatchedValue: TimeRange[],
    fridayWatchedValue: TimeRange[],
    saturdayWatchedValue: TimeRange[],
    sundayWatchedValue: TimeRange[]
  ) => {
    let tempStartDate = dayjs();
    const newAvailableTimeslots: {
      [key: string]: TimeRange[];
    } = {};
    while (tempStartDate <= endDate.add(1, "day")) {
      const dddd = tempStartDate.format("dddd");

      switch (dddd) {
        case "Monday":
          newAvailableTimeslots[tempStartDate.format("YYYY-MM-DD")] =
            calculateAvailableTimeslots(mondayWatchedValue);
          break;
        case "Tuesday":
          newAvailableTimeslots[tempStartDate.format("YYYY-MM-DD")] =
            calculateAvailableTimeslots(tuesdayWatchedValue);
          break;
        case "Wednesday":
          newAvailableTimeslots[tempStartDate.format("YYYY-MM-DD")] =
            calculateAvailableTimeslots(wednesdayWatchedValue);
          break;
        case "Thursday":
          newAvailableTimeslots[tempStartDate.format("YYYY-MM-DD")] =
            calculateAvailableTimeslots(thursdayWatchedValue);
          break;
        case "Friday":
          newAvailableTimeslots[tempStartDate.format("YYYY-MM-DD")] =
            calculateAvailableTimeslots(fridayWatchedValue);
          break;
        case "Saturday":
          newAvailableTimeslots[tempStartDate.format("YYYY-MM-DD")] =
            calculateAvailableTimeslots(saturdayWatchedValue);
          break;
        case "Sunday":
          newAvailableTimeslots[tempStartDate.format("YYYY-MM-DD")] =
            calculateAvailableTimeslots(sundayWatchedValue);
          break;
      }

      tempStartDate = tempStartDate.add(1, "day");
    }

    setAvailableTimeslots(newAvailableTimeslots);
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

      <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2 md:p-0">
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

                    {/* {currentStep === "connected-video" && (
                      <ConnectedVideoStep nextStep={() => goToIndex(3)} />
                    )} */}

                    {currentStep === "setup-availability" && (
                      <SetupAvailability
                        nextStep={() => goToIndex(3)}
                        defaultScheduleId={user.defaultScheduleId}
                        onAvailabilityChanged={onAvailabilityChanged}
                      />
                    )}
                    {currentStep === "user-profile" && (
                      <UserProfile
                        imageSrc={imageSrc}
                        setImageSrc={setImageSrc}
                        onBioChange={(val: string | null) => {
                          if (val) setBio(val);
                        }}
                      />
                    )}
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
        <div className="scrollbar-thin hidden max-h-screen min-h-screen overflow-y-auto pb-4 ps-4 pt-4 md:block">
          {currentStep === "user-settings" && (
            <>
              <div
                ref={svgRef}
                className="flex max-h-full min-h-full items-center justify-center overflow-x-clip overflow-y-clip rounded-l-2xl align-middle"
                style={{ background: "linear-gradient(to top right, #D4D4D5 0%, #667593 100%)" }}
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

          {currentStep === "connected-calendar" && (
            <div
              className="flex min-h-full items-center justify-center rounded-l-2xl pb-8 ps-8 pt-8 align-middle"
              style={{ background: "linear-gradient(to top right, #D4D4D5 0%, #667593 100%)" }}>
              <LargeCalendar
                extraDays={7}
                showFakeEvents={true}
                allRoundedCorners={false}
                startDate={startDate.toDate()}
                endDate={endDate.toDate()}
                availableTimeslots={availableTimeslots}
              />
            </div>
          )}

          {currentStep === "setup-availability" && (
            <div
              className="flex min-h-full items-center justify-center rounded-l-2xl p-10 align-middle"
              style={{ background: "linear-gradient(to top right, #D4D4D5 0%, #667593 100%)" }}>
              <LargeCalendar
                extraDays={7}
                showFakeEvents={true}
                allRoundedCorners={true}
                startDate={startDate.toDate()}
                endDate={endDate.toDate()}
                availableTimeslots={availableTimeslots}
              />
            </div>
          )}

          {currentStep === "user-profile" && (
            <>
              <div
                className="flex min-h-full items-end justify-end rounded-l-2xl ps-8 pt-8"
                style={{ background: "linear-gradient(to top right, #D4D4D5 0%, #667593 100%)" }}>
                <div className="bg-subtle min-h-screen min-w-full rounded-l-xl">
                  <div className="item-center mb-16 ms-44 mt-24 flex flex-col items-center justify-center">
                    <Avatar size="lg" alt="User Avatar" imageSrc={imageSrc} className="mb-4" />
                    <div className="min-h-8 text-default text-3xl font-bold">{fullName}</div>
                    <div className="min-h-4 text-subtle text-xl">{bio}</div>
                  </div>

                  <div className="ml-24">
                    {fakeMeetings.map((meet, index) => {
                      return (
                        <div key={index} className="border-subtle bg-default border p-6 dark:bg-black">
                          <div className="text-default display-inline">
                            <span className="font-bold">{meet.title}</span> {meet.slug}
                          </div>

                          <div className="text-default">{meet.description}</div>

                          <div className="mt-2 flex">
                            <Button color="secondary" variant="icon" className="mr-2" StartIcon={Timer}>
                              60 m
                            </Button>

                            <Button color="secondary" variant="icon" StartIcon={User}>
                              1-on-1
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

OnboardingPage.PageWrapper = PageWrapper;

export default OnboardingPage;
