import type { GetServerSidePropsContext } from "next";

// import { useSession } from "next-auth/react";
import { getLayout } from "@calcom/features/MainLayout";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import PageWrapper from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

import {
  calculateTotalMeetingTime,
  createEventsLengthRecord,
  eventNamesById,
  eventFrequencyObj,
  makeEventNameArr,
} from "./utils";

function TimeCapsule() {
  const { t } = useLocale();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  //grab bookings data
  const bookings = trpc.viewer.bookings.get.useQuery({ filters: { status: "past" } });
  const cancelledBookings = trpc.viewer.bookings.get.useQuery({ filters: { status: "cancelled" } });
  console.log("cancelled", cancelledBookings.data);
  //grab all event types for user
  const { data: eventTypes } = trpc.viewer.eventTypes.bulkEventFetch.useQuery();
  //key = event type id value = length of event
  const eventList = eventTypes?.eventTypes;
  const eventLengthRecord: Record<string, number | undefined> | null = createEventsLengthRecord(eventList);
  const bookingsEventIds: number[] | undefined = bookings.data?.bookings.map(
    (booking: any) => booking.eventType.id
  );
  const eventFrequenciesByName = makeEventNameArr(
    eventFrequencyObj(bookingsEventIds),
    eventNamesById(eventList)
  );

  const totalMeetingTime = calculateTotalMeetingTime(bookingsEventIds, eventLengthRecord);
  const averageMeetingTime =
    totalMeetingTime / (bookingsEventIds !== undefined ? bookingsEventIds.length : 1);
  // const eventNamesAndFrequencies =

  return (
    <ShellMain heading={t("Time Capsule")} subtitle={t("create_manage_teams_collaborative")}>
      <div className="flex items-end gap-5 bg-slate-900 pl-4 pt-12 max-md:flex-wrap">
        <div className="mt-16 flex grow basis-[0%] flex-col items-center max-md:mt-10 max-md:max-w-full">
          <div className="max-w-[976px] bg-clip-text text-center text-4xl font-semibold leading-10 text-neutral-50 max-md:max-w-full">
            Cal.com
          </div>
          <div className="mt-7 flex items-stretch justify-between gap-5 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
            <div className="mt-96 flex basis-[0%] flex-col items-stretch self-start max-md:mt-10">
              <div className="flex flex-col items-stretch">
                <div className="flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                <div className="mt-5 flex h-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
              </div>
              <div className="mt-1.5 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
            </div>
            <div className="mt-96 flex h-[3px] w-[3px] shrink-0 flex-col self-start rounded-[50%] max-md:mt-10" />
            <div className="flex grow basis-[0%] flex-col items-stretch max-md:max-w-full">
              <div className="flex items-center justify-between gap-0 max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                <div className="my-auto flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px] max-md:mt-10" />
                <div className="flex grow basis-[0%] flex-col items-stretch self-stretch max-md:max-w-full">
                  <div className="flex items-stretch justify-between gap-5 max-md:max-w-full max-md:flex-wrap">
                    <div className="flex grow basis-[0%] flex-col items-center max-md:max-w-full">
                      <div className="max-w-[977px] self-center text-center text-7xl font-semibold leading-[82px] text-neutral-50 max-md:max-w-full max-md:text-4xl max-md:leading-10">
                        Your year in review
                      </div>
                      <div className="mt-24 flex w-[41px] max-w-full items-start justify-between gap-5 self-center max-md:mt-10">
                        <div className="flex h-2 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                        <div className="mt-1.5 flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                      </div>
                      <div className="flex h-[3px] w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                      <div className="mt-1.5 flex items-start gap-2 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                        <div className="flex grow basis-[0%] flex-col items-end self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 pb-10 pt-2 shadow-sm backdrop-blur-[6px] max-md:max-w-full">
                          <div className="mr-16 flex w-[364px] max-w-full items-start gap-2 max-md:mr-2.5">
                            <div className="flex basis-[0%] flex-col items-end">
                              <div className="relative flex aspect-[0.030303030303030304] w-1.5 max-w-full flex-col items-stretch justify-start overflow-hidden stroke-purple-400 stroke-[1px] px-0.5 py-12">
                                <img
                                  loading="lazy"
                                  alt="icon"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/048def221ce64f53c484edf12d4dc52e4d4bf04a51e65148cdf149203363e9fc?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  className="absolute inset-0 h-full w-full object-cover object-center"
                                />
                                <div className="relative mb-10 mt-8 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                              </div>
                              <div className="mt-5 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                            </div>
                            <div className="mt-1 flex grow basis-[0%] flex-col items-stretch">
                              <div className="flex flex-col items-stretch pl-16 max-md:pl-5">
                                <div className="flex items-end justify-between gap-5">
                                  <div className="mt-11 flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                                    <img
                                      loading="lazy"
                                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/60c35c97c89a92e062fe329891d971ccc6d79d8a0b0c5a9e13e705a037e9ed20?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                      className="aspect-square w-full overflow-hidden object-contain object-center"
                                    />
                                  </div>
                                  <div className="flex grow basis-[0%] flex-col items-stretch self-start">
                                    <div className="flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                                    <div className="mt-9 flex w-[17px] max-w-full flex-col items-stretch self-end">
                                      <div className="flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                                      <div className="mt-4 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-8 mt-5 flex w-[39px] max-w-full items-start justify-between gap-5 self-center">
                                  <div className="flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                                  <div className="flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                                </div>
                                <div className="mt-7 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%]" />
                              </div>
                              <div className="mt-5 flex items-start justify-between gap-0">
                                <div className="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                <div className="flex grow basis-[0%] flex-col items-end self-stretch">
                                  <div className="mr-6 flex h-[3px] w-32 shrink-0 flex-col rounded-[50%] max-md:mr-2.5" />
                                  <div className="mt-1.5 self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                    {totalMeetingTime}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 flex flex-col items-stretch self-stretch pl-5 pr-16 max-md:max-w-full max-md:pr-5">
                            <div className="flex items-start justify-between gap-5 max-md:max-w-full max-md:flex-wrap">
                              <div className="mt-4 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                              <div className="shrink grow basis-auto self-stretch text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                                meeting minutes.
                                <br />
                                Gold medal for your attention span
                              </div>
                            </div>
                            <div className="mt-16 flex w-[380px] max-w-full items-center justify-between gap-5 self-center max-md:mt-10">
                              <div className="my-auto flex items-start gap-0">
                                <div className="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                                <div className="mt-6 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%]" />
                              </div>
                              <div className="flex items-start justify-between gap-3 self-stretch max-md:justify-center">
                                <div className="mt-7 grow items-stretch justify-center self-end whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px]">
                                  Share
                                </div>
                                <div className="my-auto flex h-2 w-2 shrink-0 flex-col self-center rounded-[50%] blur-[1.0836269855499268px]" />
                                <div className="flex grow basis-[0%] flex-col items-stretch self-start">
                                  <div className="flex items-start justify-between gap-5">
                                    <div className="flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                    <div className="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                  </div>
                                  <div className="mt-4 flex h-0.5 shrink-0 flex-col rounded-[50%]" />
                                </div>
                                <div className="mt-4 flex h-[9px] w-[9px] shrink-0 flex-col self-start rounded-[50%] blur-[1.0836269855499268px]" />
                                <div className="mt-3.5 flex h-2 w-2 shrink-0 flex-col self-start rounded-[50%] blur-[1.0836269855499268px]" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-11 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                        <div className="flex grow basis-[0%] flex-col self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 px-20 pb-10 pt-5 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                          <div className="flex h-[3px] w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                          <div className="mt-7 flex w-[383px] max-w-full items-start justify-between gap-5 self-start pr-20 max-md:pr-5">
                            <div className="mt-1.5 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                            <div className="flex items-start justify-between gap-5 self-stretch">
                              <div className="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                              <div className="mt-1.5 flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/69d055722385a65c42943c85c0aed66be89dff7198ac970255d2d2dc6a947112?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  className="aspect-square w-full overflow-hidden object-contain object-center"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="mr-16 mt-20 flex w-52 max-w-full items-stretch justify-between gap-5 self-end max-md:mr-2.5 max-md:mt-10">
                            <div className="flex items-end justify-between gap-4">
                              <div className="mt-12 flex h-2 w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px] max-md:mt-10" />
                              <div className="self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                {averageMeetingTime}
                              </div>
                            </div>
                            <div className="my-auto flex h-[9px] w-2 shrink-0 flex-col self-center rounded-[50%] blur-[1.0836269855499268px]" />
                          </div>
                          <div className="mt-7 max-w-[351px] self-center text-center text-3xl font-semibold leading-8 text-white">
                            Average event duration — Profoundly inspiring
                          </div>
                          <div className="ml-20 mt-12 flex h-[3px] w-[3px] shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5 max-md:mt-10" />
                          <div className="mt-9 flex w-[164px] max-w-full items-center justify-between gap-5 self-center">
                            <div className="my-auto flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                            <div className="grow items-stretch justify-center self-stretch whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 py-3 pl-3 pr-8 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:pr-5">
                              Share
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="z-[1] mt-5 flex flex-col items-start self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 pb-2 pl-14 pr-20 pt-5 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                        <div className="ml-24 flex w-[193px] max-w-full items-stretch justify-between gap-5 max-md:ml-2.5">
                          <div className="flex h-[9px] flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                          <div className="flex h-2 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                        </div>
                        <div className="mt-7 w-full max-w-[986px] self-center max-md:max-w-full">
                          <div className="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                            <div className="flex w-[55%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                              <div className="flex flex-col items-start max-md:mt-6 max-md:max-w-full">
                                <div className="flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                                  <img
                                    loading="lazy"
                                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/725689169310e302492ddf55a03586d5503ea80decdf878ac2c6ada80be31337?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                    className="aspect-square w-full overflow-hidden object-contain object-center"
                                  />
                                </div>
                                <div className="mt-3 flex h-[3px] w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                                <div className="flex items-start justify-between gap-3 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                                  <div className="mt-2.5 shrink grow basis-auto text-5xl font-semibold leading-10 text-white max-md:max-w-full max-md:text-4xl max-md:leading-10">
                                    You&apos;re the maestro of event variety
                                  </div>
                                  <div className="mt-3 flex h-2 w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                  <div className="flex basis-[0%] flex-col items-center">
                                    <div className="flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                    <div className="mt-4 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                                    <div className="mt-4 flex items-start justify-between gap-5 self-stretch">
                                      <div className="flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                      <div className="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="ml-5 flex w-[45%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                              <div className="mt-7 flex grow flex-col items-start max-md:mt-10 max-md:max-w-full">
                                {eventFrequenciesByName &&
                                  eventFrequenciesByName.map((event) => {
                                    return (
                                      <div
                                        key={crypto.randomUUID()}
                                        className="self-stretch text-2xl font-semibold leading-7 text-white text-opacity-50 max-md:max-w-full">
                                        <span className="mr-3 text-white">{event[0]}</span>
                                        <span className="text-white text-opacity-50">{event[1]}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex w-full max-w-[986px] items-stretch justify-between gap-5 self-center pr-10 max-md:max-w-full max-md:flex-wrap max-md:pr-5">
                          <div className="flex items-stretch justify-between gap-5">
                            <div className="flex grow basis-[0%] flex-col items-stretch">
                              <div className="items-stretch justify-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:pr-5">
                                Share
                              </div>
                              <div className="mt-6 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                              <div className="mt-1.5 flex flex-col items-stretch pl-11 max-md:pl-5">
                                <div className="flex h-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                <div className="flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%]" />
                              </div>
                            </div>
                            <div className="mt-6 flex h-[3px] w-[3px] shrink-0 flex-col self-start rounded-[50%]" />
                          </div>
                          <div className="mt-16 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%] max-md:mt-10" />
                          <div className="mt-20 flex h-2 w-[9px] shrink-0 flex-col self-end rounded-[50%] blur-[1.0836269855499268px] max-md:mt-10" />
                        </div>
                      </div>
                      <div className="ml-28 flex w-[350px] max-w-full flex-col items-center self-start max-md:ml-2.5">
                        <div className="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                        <div className="flex h-0.5 w-[3px] shrink-0 flex-col self-start rounded-[50%]" />
                        <div className="mt-3 flex w-[50px] max-w-full items-start justify-between gap-5 self-end">
                          <div className="flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                          <div className="flex h-2 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                        </div>
                      </div>
                      <div className="z-[1] mt-0 flex items-start gap-0 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                        <div className="flex grow basis-[0%] flex-col items-end self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 pb-10 pt-2.5 shadow-sm backdrop-blur-[6px] max-md:max-w-full">
                          <div className="mr-7 flex w-[166px] max-w-full items-stretch justify-between gap-5 max-md:mr-2.5">
                            <div className="flex h-[9px] flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                            <div className="mt-1.5 flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                          </div>
                          <div className="mt-12 flex flex-col self-stretch pl-10 pr-7 max-md:mt-10 max-md:max-w-full max-md:px-5">
                            <div className="flex items-stretch justify-between gap-3 self-stretch pr-2.5 max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                              <div className="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                S
                              </div>
                              <div className="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                S
                              </div>
                              <div className="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-5 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                M
                              </div>
                              <div className="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                T
                              </div>
                              <div className="flex h-[60px] w-[60px] basis-[0%] flex-col items-center justify-center rounded-2xl border border-solid border-slate-700 border-opacity-60 px-5 shadow-sm backdrop-blur-[3px] max-md:pl-5">
                                <div className="text-center text-xl leading-6 text-white">W</div>
                                <div className="ml-4 mt-2.5 flex h-[3px] w-full shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                              </div>
                              <div className="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                T
                              </div>
                              <div className="aspect-square h-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                F
                              </div>
                            </div>
                            <div className="mr-3 mt-16 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%] max-md:mr-2.5 max-md:mt-10" />
                            <div className="max-w-[347px] self-center text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                              Tuesday
                            </div>
                            <div className="mt-5 max-w-[421px] self-center text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                              The rockstar of your year, having most meetings
                            </div>
                            <div className="mr-16 mt-20 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%] max-md:mr-2.5 max-md:mt-10" />
                            <div className="mt-12 items-stretch justify-center self-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                              Share
                            </div>
                          </div>
                        </div>
                        <div className="mt-16 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                        <div className="flex grow basis-[0%] flex-col items-start self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 py-10 shadow-sm backdrop-blur-[6px] max-md:max-w-full">
                          <div className="ml-4 flex w-[471px] max-w-full items-stretch justify-between gap-5 pr-20 max-md:flex-wrap max-md:pr-5">
                            <div className="flex grow basis-[0%] flex-col items-center">
                              <div className="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                              <div className="mt-8 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                              <div className="mt-16 flex flex-col items-end self-stretch pl-20 max-md:mt-10 max-md:pl-5">
                                <div className="flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                                <div className="mt-4 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                                <div className="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                              </div>
                            </div>
                            <div className="my-auto flex basis-[0%] flex-col items-stretch self-center">
                              <div className="flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/a1d313ff780976475824a88d9f9b1737a8c19e21e699ffe168ba715aefb09922?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  className="aspect-square w-full overflow-hidden object-contain object-center"
                                />
                              </div>
                              <div className="mt-9 flex h-0.5 shrink-0 flex-col rounded-[50%]" />
                            </div>
                            <div className="mt-28 flex h-[9px] w-2 shrink-0 flex-col self-end rounded-[50%] blur-[1.0836269855499268px] max-md:mt-10" />
                          </div>
                          <div className="mt-5 flex w-full flex-col self-stretch px-20 max-md:px-5">
                            <div className="mr-20 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%] max-md:mr-2.5" />
                            <div className="mt-2 w-full self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:ml-1.5 max-md:mr-1 max-md:text-4xl max-md:leading-10">
                              September
                            </div>
                            <div className="mt-5 max-w-[319px] self-center text-center text-3xl font-semibold leading-8 text-white">
                              Meeting maestro of your year
                            </div>
                            <div className="mt-1 flex h-0.5 w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                            <div className="mt-32 items-stretch justify-center self-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-4 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                              Share
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mr-80 mt-1.5 flex h-3 w-3 shrink-0 flex-col self-end rounded-[50%] blur-[1.5px] max-md:mr-2.5" />
                      <div className="z-[1] self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 py-3 pl-6 pr-11 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                        <div className="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                          <div className="flex w-[45%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                            <div className="mt-1.5 flex flex-col items-center max-md:mt-8 max-md:max-w-full">
                              <div className="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                              <div className="mt-11 flex items-end justify-between gap-0 self-stretch max-md:mt-10 max-md:max-w-full max-md:flex-wrap">
                                <div className="mt-60 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                                <div className="flex grow basis-[0%] flex-col items-stretch self-stretch max-md:max-w-full">
                                  <div className="relative flex min-h-[240px] w-full flex-col items-end overflow-hidden pb-7 pl-8 pr-20 pt-12 max-md:max-w-full max-md:px-5">
                                    <img
                                      loading="lazy"
                                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/b52efee6cae2c3e67a944a61fc0db41666a1479663af56fd8f4b4d225547c20b?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                      className="absolute inset-0 h-full w-full object-cover object-center"
                                    />
                                    <img
                                      loading="lazy"
                                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/3186cba5dde6722c5a03c3e2edec7dc361ad72b3e771a2f2dbff77e42b822a81?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                      className="mr-20 aspect-[0.52] w-[55px] max-w-full overflow-hidden object-contain object-center max-md:mr-2.5"
                                    />
                                    <div className="relative flex w-[293px] max-w-full items-end justify-between gap-5 self-start">
                                      <div className="mt-11 flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px] max-md:mt-10" />
                                      <div className="self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                        2
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-1 flex w-[211px] max-w-full flex-col self-center">
                                    <div className="self-stretch text-center text-base leading-6 text-gray-400">
                                      Schedulers timezones
                                    </div>
                                    <div className="mt-3 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                    <div className="ml-3 mt-4 flex h-1 w-[9px] shrink-0 flex-col self-center rounded-[50%]" />
                                    <div className="ml-3 mt-5 flex h-3 w-[17px] shrink-0 flex-col self-center rounded-[50%] blur-[1.5px]" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-5 flex w-[55%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                            <div className="flex flex-col items-stretch max-md:mt-7 max-md:max-w-full">
                              <div className="flex flex-col items-center pl-12 max-md:max-w-full max-md:pl-5">
                                <div className="self-stretch max-md:max-w-full max-md:pr-5">
                                  <div className="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                                    <div className="flex w-[67%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                      <div className="m-auto flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                                        <img
                                          loading="lazy"
                                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/d7245a4514af04219f1ebcab01325e13cda72249546f3a40de05b0a5fb9dfbcd?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                          className="aspect-square w-full overflow-hidden object-contain object-center"
                                        />
                                      </div>
                                    </div>
                                    <div className="ml-5 flex w-[33%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                      <div className="flex grow flex-col items-stretch max-md:mt-10">
                                        <div className="flex h-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                        <div className="mt-7 flex flex-col items-end pl-11 max-md:pl-5">
                                          <div className="flex h-3 shrink-0 flex-col self-stretch rounded-[50%] blur-[1.5px]" />
                                          <div className="mt-2 flex items-start justify-between gap-1.5 self-stretch pr-6 max-md:pr-5">
                                            <div className="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                            <div className="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                          </div>
                                          <div className="mr-3 mt-10 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mr-2.5" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="self-stretch text-5xl font-semibold leading-10 text-white max-md:max-w-full max-md:text-4xl max-md:leading-10">
                                  Your calendar is a global time zone party
                                </div>
                                <div className="ml-6 mt-2 flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                              </div>
                              <div className="mt-1 max-md:max-w-full max-md:pr-5">
                                <div className="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                                  <div className="flex w-4/5 flex-col items-stretch max-md:ml-0 max-md:w-full">
                                    <div className="flex flex-col items-start max-md:mt-10">
                                      <div className="ml-12 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:ml-2.5" />
                                      <div className="mt-11 flex items-stretch justify-between gap-5 self-stretch max-md:mt-10">
                                        <div className="flex grow basis-[0%] flex-col items-center">
                                          <div className="items-stretch justify-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px]">
                                            Share
                                          </div>
                                          <div className="flex items-stretch justify-between gap-5 self-stretch">
                                            <div className="flex grow basis-[0%] flex-col items-end">
                                              <div className="flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                                              <div className="mt-8 flex h-1 shrink-0 flex-col self-stretch rounded-[50%]" />
                                            </div>
                                            <div className="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                                          </div>
                                        </div>
                                        <div className="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ml-5 flex w-1/5 flex-col items-stretch max-md:ml-0 max-md:w-full">
                                    <div className="mt-28 flex grow flex-col items-stretch max-md:mt-10">
                                      <div className="flex h-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                      <div className="mt-5 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mr-28 flex w-[521px] max-w-full flex-col items-start self-end max-md:mr-2.5">
                        <div className="flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                        <div className="mt-2.5 flex w-[92px] max-w-full items-start justify-between gap-5 self-end">
                          <div className="flex h-3 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                          <div className="flex h-1 flex-1 shrink-0 flex-col rounded-[50%]" />
                        </div>
                      </div>
                      <div className="z-[1] mt-0 flex items-center gap-1.5 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                        <div className="flex grow basis-[0%] flex-col self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 px-20 py-11 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                          <div className="ml-7 mt-1.5 flex w-[292px] max-w-full items-end justify-between gap-5 self-start max-md:ml-2.5">
                            <div className="mt-36 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                            <div className="flex grow basis-[0%] flex-col items-center self-stretch">
                              <div className="flex items-stretch gap-5">
                                <div className="flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 pl-5 pr-2.5 shadow-sm backdrop-blur-[3px]">
                                  <img
                                    loading="lazy"
                                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/fcb0ddf29b0a33f42f007dd925327c8958d592f9deb243fea383ba47810d17f1?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                    className="aspect-square w-full overflow-hidden object-contain object-center"
                                  />
                                </div>
                                <div className="mt-11 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%] max-md:mt-10" />
                              </div>
                              <div className="mt-4 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%]" />
                              <div className="mt-16 flex w-[153px] max-w-full items-stretch justify-between gap-5 self-end px-px max-md:mt-10">
                                <div className="text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                  {cancelledBookings && cancelledBookings?.data?.bookings.length}
                                </div>
                                <div className="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-9 self-stretch text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                            Meetings canceled – Damn, that&apos;s crazy.
                          </div>
                          <div className="mr-28 mt-2 flex h-3 w-3 shrink-0 flex-col self-end rounded-[50%] blur-[1.5px] max-md:mr-2.5" />
                          <div className="self-stretch max-md:max-w-full">
                            <div className="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                              <div className="flex w-[43%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                <div className="flex flex-col items-end max-md:mt-2">
                                  <div className="flex h-3 w-[13px] shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                  <div className="mt-16 flex h-1 shrink-0 flex-col self-stretch rounded-[50%] max-md:mt-10" />
                                  <div className="ml-9 mt-6 flex h-3 w-[21px] shrink-0 flex-col self-start rounded-[50%] blur-[1.5px] max-md:ml-2.5" />
                                </div>
                              </div>
                              <div className="ml-5 flex w-[57%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                <div className="mt-5 flex grow flex-col items-stretch max-md:mt-7">
                                  <div className="flex flex-col items-start pl-20 max-md:pl-5">
                                    <div className="ml-4 flex h-1 w-[141px] shrink-0 flex-col rounded-[50%] max-md:ml-2.5" />
                                    <div className="mt-5 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                  </div>
                                  <div className="mt-16 flex items-stretch justify-between gap-5 pr-20 max-md:mt-10 max-md:pr-5">
                                    <div className="grow items-stretch justify-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 py-3 pl-4 pr-6 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:pr-5">
                                      Share
                                    </div>
                                    <div className="mt-3 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%]" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="my-auto flex items-end gap-0">
                          <div className="mt-8 flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                          <div className="flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%]" />
                        </div>
                        <div className="flex grow basis-[0%] flex-col self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 py-11 pl-8 pr-14 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                          <div className="z-[1] mt-1.5 flex w-[62px] max-w-full flex-col items-stretch self-center">
                            <div className="flex aspect-[1.0333333333333334] h-[61px] w-full flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                              <img
                                loading="lazy"
                                src="https://cdn.builder.io/api/v1/image/assets/TEMP/d25794f56219b31fbbed7a97188690de7621ad114de3ebd16f8f99a9a175e8fc?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                className="aspect-[1.06] w-full overflow-hidden object-contain object-center"
                              />
                            </div>
                            <div className="mt-4 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                          </div>
                          <div className="-mt-6 ml-8 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                          <div className="z-[1] mt-20 max-w-[347px] self-center text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:mt-10 max-md:text-4xl max-md:leading-10">
                            30min
                          </div>
                          <div className="-mt-10 ml-20 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                          <div className="mt-16 flex items-end justify-between gap-5 self-stretch max-md:mt-10 max-md:max-w-full max-md:flex-wrap">
                            <div className="mt-56 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                            <div className="flex grow basis-[0%] flex-col items-stretch self-stretch max-md:max-w-full">
                              <div className="flex items-stretch justify-between gap-3 max-md:max-w-full max-md:flex-wrap">
                                <div className="shrink grow basis-auto text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                                  Your average event duration – short, sweet, and everyone leaves with a smile
                                </div>
                                <div className="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                              </div>
                              <div className="ml-9 mt-2 flex w-[236px] max-w-full flex-col items-stretch self-start max-md:ml-2.5">
                                <div className="flex items-stretch justify-between gap-5">
                                  <div className="flex grow basis-[0%] flex-col items-center">
                                    <div className="flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                                    <div className="mt-5 flex h-1 shrink-0 flex-col self-stretch rounded-[50%]" />
                                    <div className="mt-4 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                  </div>
                                  <div className="flex h-3 w-3 shrink-0 flex-col self-start rounded-[50%] blur-[1.5px]" />
                                </div>
                                <div className="mr-3 mt-10 flex w-[82px] max-w-full flex-col items-stretch self-end rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 pb-0.5 pt-3 shadow-sm backdrop-blur-[3px] max-md:mr-2.5">
                                  <div className="whitespace-nowrap text-center text-base font-semibold leading-6 text-gray-50">
                                    Share
                                  </div>
                                  <div className="mt-1.5 flex h-1 w-px shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="my-auto flex h-[9px] w-2 shrink-0 flex-col self-center rounded-[50%] blur-[1.0836269855499268px] max-md:mt-0" />
                  </div>
                  <div className="mt-7 flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                </div>
                <div className="mt-[2231px] flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%] max-md:mt-10" />
              </div>
              <div className="mr-36 mt-14 flex w-[158px] max-w-full flex-col items-end self-end max-md:mr-2.5 max-md:mt-10">
                <div className="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                <div className="ml-9 flex w-[30px] max-w-full items-start gap-1.5 self-start max-md:ml-2.5">
                  <div className="flex h-3 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                  <div className="flex h-3 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                </div>
                <div className="mt-2 flex h-3 shrink-0 flex-col self-stretch rounded-[50%] blur-[1.5px]" />
              </div>
            </div>
          </div>
        </div>
        <div className="my-auto flex basis-[0%] flex-col items-stretch self-center max-md:hidden">
          <div className="flex flex-col items-start pl-4 max-md:hidden">
            <div className="flex h-0.5 shrink-0 flex-col self-stretch rounded-[50%]" />
            <div className="ml-5 mt-[1449px] flex h-3 w-px shrink-0 flex-col rounded-[50%] blur-[1.5px] max-md:ml-2.5 max-md:mt-10" />
            <div className="mt-36 flex h-1 shrink-0 flex-col self-stretch rounded-[50%] max-md:mt-10" />
          </div>
          <div className="mt-7 flex h-1 shrink-0 flex-col rounded-[50%]" />
          <div className="mt-80 flex h-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
          <div className="mt-9 flex flex-col items-stretch pl-8 max-md:pl-5">
            <div className="flex h-1 shrink-0 flex-col rounded-[50%]" />
            <div className="mt-48 flex h-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
          </div>
        </div>
      </div>
    </ShellMain>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  await ssr.viewer.me.prefetch();
  const session = await getServerSession({ req: context.req, res: context.res });
  const token = Array.isArray(context.query?.token) ? context.query.token[0] : context.query?.token;

  const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;

  if (!session) {
    return {
      redirect: {
        destination: callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login",
        permanent: false,
      },
      props: {},
    };
  }

  return { props: { trpcState: ssr.dehydrate() } };
};

TimeCapsule.requiresLicense = false;
TimeCapsule.PageWrapper = PageWrapper;
TimeCapsule.getLayout = getLayout;
export default TimeCapsule;

// CTA={
//   (!user.organizationId || user.organization.isOrgAdmin) && (
//     <Button
//       data-testid="new-team-btn"
//       variant="fab"
//       StartIcon={Plus}
//       type="button"
//       href={`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`}>
//       {t("new")}
//     </Button>
//   )
// }
