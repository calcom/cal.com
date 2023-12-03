import type { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";

import { getLayout } from "@calcom/features/MainLayout";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import PageWrapper from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

function TimeCapsule() {
  const { t } = useLocale();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const session = useSession();
  const { data: webhooks } = trpc.viewer.webhook.list.useQuery(undefined, {
    suspense: true,
    enabled: session.status === "authenticated",
  });
  console.log(webhooks);
  return (
    <ShellMain
    // heading={t("Time Capsule")}
    // hideHeadingOnMobile
    // subtitle={t("create_manage_teams_collaborative")}
    >
      <div class="flex items-end gap-5 bg-slate-900 pl-4 pt-12 max-md:flex-wrap">
        <div class="mt-16 flex grow basis-[0%] flex-col items-center max-md:mt-10 max-md:max-w-full">
          <div class="max-w-[976px] bg-clip-text text-center text-4xl font-semibold leading-10 text-neutral-50 max-md:max-w-full">
            Cal.com
          </div>
          <div class="mt-7 flex items-stretch justify-between gap-5 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
            <div class="mt-96 flex basis-[0%] flex-col items-stretch self-start max-md:mt-10">
              <div class="flex flex-col items-stretch">
                <div class="flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                <div class="mt-5 flex h-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
              </div>
              <div class="mt-1.5 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
            </div>
            <div class="mt-96 flex h-[3px] w-[3px] shrink-0 flex-col self-start rounded-[50%] max-md:mt-10" />
            <div class="flex grow basis-[0%] flex-col items-stretch max-md:max-w-full">
              <div class="flex items-center justify-between gap-0 max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                <div class="my-auto flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px] max-md:mt-10" />
                <div class="flex grow basis-[0%] flex-col items-stretch self-stretch max-md:max-w-full">
                  <div class="flex items-stretch justify-between gap-5 max-md:max-w-full max-md:flex-wrap">
                    <div class="flex grow basis-[0%] flex-col items-center max-md:max-w-full">
                      <div class="max-w-[977px] self-center text-center text-7xl font-semibold leading-[82px] text-neutral-50 max-md:max-w-full max-md:text-4xl max-md:leading-10">
                        Your year in review
                      </div>
                      <div class="mt-24 flex w-[41px] max-w-full items-start justify-between gap-5 self-center max-md:mt-10">
                        <div class="flex h-2 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                        <div class="mt-1.5 flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                      </div>
                      <div class="flex h-[3px] w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                      <div class="mt-1.5 flex items-start gap-2 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                        <div class="flex grow basis-[0%] flex-col items-end self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 pb-10 pt-2 shadow-sm backdrop-blur-[6px] max-md:max-w-full">
                          <div class="mr-16 flex w-[364px] max-w-full items-start gap-2 max-md:mr-2.5">
                            <div class="flex basis-[0%] flex-col items-end">
                              <div class="relative flex aspect-[0.030303030303030304] w-1.5 max-w-full flex-col items-stretch justify-center overflow-hidden stroke-purple-400 stroke-[1px] px-0.5 py-12">
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/048def221ce64f53c484edf12d4dc52e4d4bf04a51e65148cdf149203363e9fc?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  class="absolute inset-0 h-full w-full object-cover object-center"
                                  align="center"
                                />
                                <div class="relative mb-10 mt-8 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                              </div>
                              <div class="mt-5 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                            </div>
                            <div class="mt-1 flex grow basis-[0%] flex-col items-stretch">
                              <div class="flex flex-col items-stretch pl-16 max-md:pl-5">
                                <div class="flex items-end justify-between gap-5">
                                  <div class="mt-11 flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                                    <img
                                      loading="lazy"
                                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/60c35c97c89a92e062fe329891d971ccc6d79d8a0b0c5a9e13e705a037e9ed20?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                      class="aspect-square w-full overflow-hidden object-contain object-center"
                                    />
                                  </div>
                                  <div class="flex grow basis-[0%] flex-col items-stretch self-start">
                                    <div class="flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                                    <div class="mt-9 flex w-[17px] max-w-full flex-col items-stretch self-end">
                                      <div class="flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                                      <div class="mt-4 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                                    </div>
                                  </div>
                                </div>
                                <div class="ml-8 mt-5 flex w-[39px] max-w-full items-start justify-between gap-5 self-center">
                                  <div class="flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                                  <div class="flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                                </div>
                                <div class="mt-7 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%]" />
                              </div>
                              <div class="mt-5 flex items-start justify-between gap-0">
                                <div class="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                <div class="flex grow basis-[0%] flex-col items-end self-stretch">
                                  <div class="mr-6 flex h-[3px] w-32 shrink-0 flex-col rounded-[50%] max-md:mr-2.5" />
                                  <div class="mt-1.5 self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                    2,160
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="mt-6 flex flex-col items-stretch self-stretch pl-5 pr-16 max-md:max-w-full max-md:pr-5">
                            <div class="flex items-start justify-between gap-5 max-md:max-w-full max-md:flex-wrap">
                              <div class="mt-4 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                              <div class="shrink grow basis-auto self-stretch text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                                meeting minutes.
                                <br />
                                Gold medal for your attention span
                              </div>
                            </div>
                            <div class="mt-16 flex w-[380px] max-w-full items-center justify-between gap-5 self-center max-md:mt-10">
                              <div class="my-auto flex items-start gap-0">
                                <div class="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                                <div class="mt-6 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%]" />
                              </div>
                              <div class="flex items-start justify-between gap-3 self-stretch max-md:justify-center">
                                <div class="mt-7 grow items-stretch justify-center self-end whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px]">
                                  Share
                                </div>
                                <div class="my-auto flex h-2 w-2 shrink-0 flex-col self-center rounded-[50%] blur-[1.0836269855499268px]" />
                                <div class="flex grow basis-[0%] flex-col items-stretch self-start">
                                  <div class="flex items-start justify-between gap-5">
                                    <div class="flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                    <div class="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                  </div>
                                  <div class="mt-4 flex h-0.5 shrink-0 flex-col rounded-[50%]" />
                                </div>
                                <div class="mt-4 flex h-[9px] w-[9px] shrink-0 flex-col self-start rounded-[50%] blur-[1.0836269855499268px]" />
                                <div class="mt-3.5 flex h-2 w-2 shrink-0 flex-col self-start rounded-[50%] blur-[1.0836269855499268px]" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="mt-11 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                        <div class="flex grow basis-[0%] flex-col self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 px-20 pb-10 pt-5 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                          <div class="flex h-[3px] w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                          <div class="mt-7 flex w-[383px] max-w-full items-start justify-between gap-5 self-start pr-20 max-md:pr-5">
                            <div class="mt-1.5 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                            <div class="flex items-start justify-between gap-5 self-stretch">
                              <div class="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                              <div class="mt-1.5 flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/69d055722385a65c42943c85c0aed66be89dff7198ac970255d2d2dc6a947112?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  class="aspect-square w-full overflow-hidden object-contain object-center"
                                />
                              </div>
                            </div>
                          </div>
                          <div class="mr-16 mt-20 flex w-52 max-w-full items-stretch justify-between gap-5 self-end max-md:mr-2.5 max-md:mt-10">
                            <div class="flex items-end justify-between gap-4">
                              <div class="mt-12 flex h-2 w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px] max-md:mt-10" />
                              <div class="self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                54
                              </div>
                            </div>
                            <div class="my-auto flex h-[9px] w-2 shrink-0 flex-col self-center rounded-[50%] blur-[1.0836269855499268px]" />
                          </div>
                          <div class="mt-7 max-w-[351px] self-center text-center text-3xl font-semibold leading-8 text-white">
                            People met — your social odometer is ticking
                          </div>
                          <div class="ml-20 mt-12 flex h-[3px] w-[3px] shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5 max-md:mt-10" />
                          <div class="mt-9 flex w-[164px] max-w-full items-center justify-between gap-5 self-center">
                            <div class="my-auto flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                            <div class="grow items-stretch justify-center self-stretch whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 py-3 pl-3 pr-8 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:pr-5">
                              Share
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="z-[1] mt-5 flex flex-col items-start self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 pb-2 pl-14 pr-20 pt-5 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                        <div class="ml-24 flex w-[193px] max-w-full items-stretch justify-between gap-5 max-md:ml-2.5">
                          <div class="flex h-[9px] flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                          <div class="flex h-2 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                        </div>
                        <div class="mt-7 w-full max-w-[986px] self-center max-md:max-w-full">
                          <div class="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                            <div class="flex w-[55%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                              <div class="flex flex-col items-start max-md:mt-6 max-md:max-w-full">
                                <div class="flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                                  <img
                                    loading="lazy"
                                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/725689169310e302492ddf55a03586d5503ea80decdf878ac2c6ada80be31337?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                    class="aspect-square w-full overflow-hidden object-contain object-center"
                                  />
                                </div>
                                <div class="mt-3 flex h-[3px] w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                                <div class="flex items-start justify-between gap-3 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                                  <div class="mt-2.5 shrink grow basis-auto text-5xl font-semibold leading-10 text-white max-md:max-w-full max-md:text-4xl max-md:leading-10">
                                    You&apos;re the maestro of event variety
                                  </div>
                                  <div class="mt-3 flex h-2 w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                  <div class="flex basis-[0%] flex-col items-center">
                                    <div class="flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                    <div class="mt-4 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                                    <div class="mt-4 flex items-start justify-between gap-5 self-stretch">
                                      <div class="flex h-[9px] w-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                      <div class="flex h-[9px] w-2 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div class="ml-5 flex w-[45%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                              <div class="mt-7 flex grow flex-col items-start max-md:mt-10 max-md:max-w-full">
                                <div class="self-stretch text-2xl font-semibold leading-7 text-white text-opacity-50 max-md:max-w-full">
                                  <span class="text-white">Mentorship</span>
                                  <span class="text-white text-opacity-50">32</span>
                                </div>
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/0939c4034b5503d193f382ef75e42764964cbd924de0c791905dfd8b757a8ea8?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  class="mt-6 aspect-[215.5] w-full self-stretch overflow-hidden stroke-purple-400 stroke-[5px] object-contain object-center max-md:max-w-full"
                                />
                                <div class="mt-8 self-stretch text-2xl font-semibold leading-7 text-white text-opacity-50 max-md:max-w-full">
                                  <span class="text-white">Class</span>
                                  <span class="text-white text-opacity-50">24</span>
                                </div>
                                <div class="mr-28 mt-1.5 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%] max-md:mr-2.5" />
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/27d780b455e94897ff913f0f26f0d46fa1180d7845032a08bacb561ebb523a7c?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  class="mt-3.5 aspect-[215.5] w-full self-stretch overflow-hidden stroke-neutral-400 stroke-[5px] object-contain object-center max-md:max-w-full"
                                />
                                <div class="mt-8 self-stretch text-2xl font-semibold leading-7 text-white text-opacity-50 max-md:max-w-full">
                                  <span class="text-white">Personal</span>
                                  <span class="text-white text-opacity-50">16</span>
                                </div>
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/61013fcd54944d13bf3736934709e0c79c17a32a7af953ee08443cde89e5862e?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  class="mt-6 aspect-[99.5] w-[199px] max-w-full self-start overflow-hidden stroke-blue-300 stroke-[5px] object-contain object-center"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="mt-3 flex w-full max-w-[986px] items-stretch justify-between gap-5 self-center pr-10 max-md:max-w-full max-md:flex-wrap max-md:pr-5">
                          <div class="flex items-stretch justify-between gap-5">
                            <div class="flex grow basis-[0%] flex-col items-stretch">
                              <div class="items-stretch justify-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:pr-5">
                                Share
                              </div>
                              <div class="mt-6 flex h-[3px] shrink-0 flex-col rounded-[50%]" />
                              <div class="mt-1.5 flex flex-col items-stretch pl-11 max-md:pl-5">
                                <div class="flex h-[9px] shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                                <div class="flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%]" />
                              </div>
                            </div>
                            <div class="mt-6 flex h-[3px] w-[3px] shrink-0 flex-col self-start rounded-[50%]" />
                          </div>
                          <div class="mt-16 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%] max-md:mt-10" />
                          <div class="mt-20 flex h-2 w-[9px] shrink-0 flex-col self-end rounded-[50%] blur-[1.0836269855499268px] max-md:mt-10" />
                        </div>
                      </div>
                      <div class="ml-28 flex w-[350px] max-w-full flex-col items-center self-start max-md:ml-2.5">
                        <div class="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                        <div class="flex h-0.5 w-[3px] shrink-0 flex-col self-start rounded-[50%]" />
                        <div class="mt-3 flex w-[50px] max-w-full items-start justify-between gap-5 self-end">
                          <div class="flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                          <div class="flex h-2 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                        </div>
                      </div>
                      <div class="z-[1] mt-0 flex items-start gap-0 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                        <div class="flex grow basis-[0%] flex-col items-end self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 pb-10 pt-2.5 shadow-sm backdrop-blur-[6px] max-md:max-w-full">
                          <div class="mr-7 flex w-[166px] max-w-full items-stretch justify-between gap-5 max-md:mr-2.5">
                            <div class="flex h-[9px] flex-1 shrink-0 flex-col rounded-[50%] blur-[1.0836269855499268px]" />
                            <div class="mt-1.5 flex h-[3px] flex-1 shrink-0 flex-col rounded-[50%]" />
                          </div>
                          <div class="mt-12 flex flex-col self-stretch pl-10 pr-7 max-md:mt-10 max-md:max-w-full max-md:px-5">
                            <div class="flex items-stretch justify-between gap-3 self-stretch pr-2.5 max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                              <div class="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                S
                              </div>
                              <div class="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                S
                              </div>
                              <div class="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-5 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                M
                              </div>
                              <div class="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                T
                              </div>
                              <div class="flex h-[60px] w-[60px] basis-[0%] flex-col items-center justify-center rounded-2xl border border-solid border-slate-700 border-opacity-60 px-5 shadow-sm backdrop-blur-[3px] max-md:pl-5">
                                <div class="text-center text-xl leading-6 text-white">W</div>
                                <div class="ml-4 mt-2.5 flex h-[3px] w-full shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                              </div>
                              <div class="aspect-square h-[60px] w-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                T
                              </div>
                              <div class="aspect-square h-[60px] items-center justify-center whitespace-nowrap rounded-2xl border border-solid border-slate-700 border-opacity-60 px-6 text-center text-xl leading-6 text-white shadow-sm backdrop-blur-[3px] max-md:px-5">
                                F
                              </div>
                            </div>
                            <div class="mr-3 mt-16 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%] max-md:mr-2.5 max-md:mt-10" />
                            <div class="max-w-[347px] self-center text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                              Tuesday
                            </div>
                            <div class="mt-5 max-w-[421px] self-center text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                              The rockstar of your year, having most meetings
                            </div>
                            <div class="mr-16 mt-20 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%] max-md:mr-2.5 max-md:mt-10" />
                            <div class="mt-12 items-stretch justify-center self-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                              Share
                            </div>
                          </div>
                        </div>
                        <div class="mt-16 flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                        <div class="flex grow basis-[0%] flex-col items-start self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 py-10 shadow-sm backdrop-blur-[6px] max-md:max-w-full">
                          <div class="ml-4 flex w-[471px] max-w-full items-stretch justify-between gap-5 pr-20 max-md:flex-wrap max-md:pr-5">
                            <div class="flex grow basis-[0%] flex-col items-center">
                              <div class="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                              <div class="mt-8 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                              <div class="mt-16 flex flex-col items-end self-stretch pl-20 max-md:mt-10 max-md:pl-5">
                                <div class="flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                                <div class="mt-4 flex h-[3px] shrink-0 flex-col self-stretch rounded-[50%]" />
                                <div class="flex h-[3px] w-[3px] shrink-0 flex-col rounded-[50%]" />
                              </div>
                            </div>
                            <div class="my-auto flex basis-[0%] flex-col items-stretch self-center">
                              <div class="flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                                <img
                                  loading="lazy"
                                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/a1d313ff780976475824a88d9f9b1737a8c19e21e699ffe168ba715aefb09922?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                  class="aspect-square w-full overflow-hidden object-contain object-center"
                                />
                              </div>
                              <div class="mt-9 flex h-0.5 shrink-0 flex-col rounded-[50%]" />
                            </div>
                            <div class="mt-28 flex h-[9px] w-2 shrink-0 flex-col self-end rounded-[50%] blur-[1.0836269855499268px] max-md:mt-10" />
                          </div>
                          <div class="mt-5 flex w-full flex-col self-stretch px-20 max-md:px-5">
                            <div class="mr-20 flex h-[3px] w-[3px] shrink-0 flex-col self-end rounded-[50%] max-md:mr-2.5" />
                            <div class="mt-2 w-full self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:ml-1.5 max-md:mr-1 max-md:text-4xl max-md:leading-10">
                              September
                            </div>
                            <div class="mt-5 max-w-[319px] self-center text-center text-3xl font-semibold leading-8 text-white">
                              Meeting maestro of your year
                            </div>
                            <div class="mt-1 flex h-0.5 w-[3px] shrink-0 flex-col self-center rounded-[50%]" />
                            <div class="mt-32 items-stretch justify-center self-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-4 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                              Share
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="mr-80 mt-1.5 flex h-3 w-3 shrink-0 flex-col self-end rounded-[50%] blur-[1.5px] max-md:mr-2.5" />
                      <div class="z-[1] self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 py-3 pl-6 pr-11 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                        <div class="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                          <div class="flex w-[45%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                            <div class="mt-1.5 flex flex-col items-center max-md:mt-8 max-md:max-w-full">
                              <div class="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                              <div class="mt-11 flex items-end justify-between gap-0 self-stretch max-md:mt-10 max-md:max-w-full max-md:flex-wrap">
                                <div class="mt-60 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                                <div class="flex grow basis-[0%] flex-col items-stretch self-stretch max-md:max-w-full">
                                  <div class="relative flex min-h-[240px] w-full flex-col items-end overflow-hidden pb-7 pl-8 pr-20 pt-12 max-md:max-w-full max-md:px-5">
                                    <img
                                      loading="lazy"
                                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/b52efee6cae2c3e67a944a61fc0db41666a1479663af56fd8f4b4d225547c20b?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                      class="absolute inset-0 h-full w-full object-cover object-center"
                                    />
                                    <img
                                      loading="lazy"
                                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/3186cba5dde6722c5a03c3e2edec7dc361ad72b3e771a2f2dbff77e42b822a81?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                      class="mr-20 aspect-[0.52] w-[55px] max-w-full overflow-hidden object-contain object-center max-md:mr-2.5"
                                    />
                                    <div class="relative flex w-[293px] max-w-full items-end justify-between gap-5 self-start">
                                      <div class="mt-11 flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px] max-md:mt-10" />
                                      <div class="self-stretch text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                        2
                                      </div>
                                    </div>
                                  </div>
                                  <div class="mt-1 flex w-[211px] max-w-full flex-col self-center">
                                    <div class="self-stretch text-center text-base leading-6 text-gray-400">
                                      Schedulers timezones
                                    </div>
                                    <div class="mt-3 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                    <div class="ml-3 mt-4 flex h-1 w-[9px] shrink-0 flex-col self-center rounded-[50%]" />
                                    <div class="ml-3 mt-5 flex h-3 w-[17px] shrink-0 flex-col self-center rounded-[50%] blur-[1.5px]" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="ml-5 flex w-[55%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                            <div class="flex flex-col items-stretch max-md:mt-7 max-md:max-w-full">
                              <div class="flex flex-col items-center pl-12 max-md:max-w-full max-md:pl-5">
                                <div class="self-stretch max-md:max-w-full max-md:pr-5">
                                  <div class="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                                    <div class="flex w-[67%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                      <div class="m-auto flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px] max-md:mt-10">
                                        <img
                                          loading="lazy"
                                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/d7245a4514af04219f1ebcab01325e13cda72249546f3a40de05b0a5fb9dfbcd?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                          class="aspect-square w-full overflow-hidden object-contain object-center"
                                        />
                                      </div>
                                    </div>
                                    <div class="ml-5 flex w-[33%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                      <div class="flex grow flex-col items-stretch max-md:mt-10">
                                        <div class="flex h-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                        <div class="mt-7 flex flex-col items-end pl-11 max-md:pl-5">
                                          <div class="flex h-3 shrink-0 flex-col self-stretch rounded-[50%] blur-[1.5px]" />
                                          <div class="mt-2 flex items-start justify-between gap-1.5 self-stretch pr-6 max-md:pr-5">
                                            <div class="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                            <div class="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                          </div>
                                          <div class="mr-3 mt-10 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mr-2.5" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div class="self-stretch text-5xl font-semibold leading-10 text-white max-md:max-w-full max-md:text-4xl max-md:leading-10">
                                  Your calendar is a global time zone party
                                </div>
                                <div class="ml-6 mt-2 flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                              </div>
                              <div class="mt-1 max-md:max-w-full max-md:pr-5">
                                <div class="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                                  <div class="flex w-4/5 flex-col items-stretch max-md:ml-0 max-md:w-full">
                                    <div class="flex flex-col items-start max-md:mt-10">
                                      <div class="ml-12 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:ml-2.5" />
                                      <div class="mt-11 flex items-stretch justify-between gap-5 self-stretch max-md:mt-10">
                                        <div class="flex grow basis-[0%] flex-col items-center">
                                          <div class="items-stretch justify-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 py-3 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px]">
                                            Share
                                          </div>
                                          <div class="flex items-stretch justify-between gap-5 self-stretch">
                                            <div class="flex grow basis-[0%] flex-col items-end">
                                              <div class="flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                                              <div class="mt-8 flex h-1 shrink-0 flex-col self-stretch rounded-[50%]" />
                                            </div>
                                            <div class="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                                          </div>
                                        </div>
                                        <div class="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                                      </div>
                                    </div>
                                  </div>
                                  <div class="ml-5 flex w-1/5 flex-col items-stretch max-md:ml-0 max-md:w-full">
                                    <div class="mt-28 flex grow flex-col items-stretch max-md:mt-10">
                                      <div class="flex h-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                      <div class="mt-5 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="mr-28 flex w-[521px] max-w-full flex-col items-start self-end max-md:mr-2.5">
                        <div class="flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                        <div class="mt-2.5 flex w-[92px] max-w-full items-start justify-between gap-5 self-end">
                          <div class="flex h-3 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                          <div class="flex h-1 flex-1 shrink-0 flex-col rounded-[50%]" />
                        </div>
                      </div>
                      <div class="z-[1] mt-0 flex items-center gap-1.5 self-stretch max-md:max-w-full max-md:flex-wrap max-md:justify-center">
                        <div class="flex grow basis-[0%] flex-col self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 px-20 py-11 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                          <div class="ml-7 mt-1.5 flex w-[292px] max-w-full items-end justify-between gap-5 self-start max-md:ml-2.5">
                            <div class="mt-36 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                            <div class="flex grow basis-[0%] flex-col items-center self-stretch">
                              <div class="flex items-stretch gap-5">
                                <div class="flex aspect-square h-[60px] w-[60px] flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 pl-5 pr-2.5 shadow-sm backdrop-blur-[3px]">
                                  <img
                                    loading="lazy"
                                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/fcb0ddf29b0a33f42f007dd925327c8958d592f9deb243fea383ba47810d17f1?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                    class="aspect-square w-full overflow-hidden object-contain object-center"
                                  />
                                </div>
                                <div class="mt-11 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%] max-md:mt-10" />
                              </div>
                              <div class="mt-4 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%]" />
                              <div class="mt-16 flex w-[153px] max-w-full items-stretch justify-between gap-5 self-end px-px max-md:mt-10">
                                <div class="text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:text-4xl max-md:leading-10">
                                  46
                                </div>
                                <div class="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                              </div>
                            </div>
                          </div>
                          <div class="mt-9 self-stretch text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                            Meeting canceled – they&apos;re in a long nap this year
                          </div>
                          <div class="mr-28 mt-2 flex h-3 w-3 shrink-0 flex-col self-end rounded-[50%] blur-[1.5px] max-md:mr-2.5" />
                          <div class="self-stretch max-md:max-w-full">
                            <div class="flex gap-5 max-md:flex-col max-md:items-stretch max-md:gap-0">
                              <div class="flex w-[43%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                <div class="flex flex-col items-end max-md:mt-2">
                                  <div class="flex h-3 w-[13px] shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                                  <div class="mt-16 flex h-1 shrink-0 flex-col self-stretch rounded-[50%] max-md:mt-10" />
                                  <div class="ml-9 mt-6 flex h-3 w-[21px] shrink-0 flex-col self-start rounded-[50%] blur-[1.5px] max-md:ml-2.5" />
                                </div>
                              </div>
                              <div class="ml-5 flex w-[57%] flex-col items-stretch max-md:ml-0 max-md:w-full">
                                <div class="mt-5 flex grow flex-col items-stretch max-md:mt-7">
                                  <div class="flex flex-col items-start pl-20 max-md:pl-5">
                                    <div class="ml-4 flex h-1 w-[141px] shrink-0 flex-col rounded-[50%] max-md:ml-2.5" />
                                    <div class="mt-5 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                  </div>
                                  <div class="mt-16 flex items-stretch justify-between gap-5 pr-20 max-md:mt-10 max-md:pr-5">
                                    <div class="grow items-stretch justify-center whitespace-nowrap rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 py-3 pl-4 pr-6 text-center text-base font-semibold leading-6 text-gray-50 shadow-sm backdrop-blur-[3px] max-md:pr-5">
                                      Share
                                    </div>
                                    <div class="mt-3 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%]" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="my-auto flex items-end gap-0">
                          <div class="mt-8 flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                          <div class="flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%]" />
                        </div>
                        <div class="flex grow basis-[0%] flex-col self-stretch rounded-2xl border border-solid border-gray-700 bg-slate-900 bg-opacity-10 py-11 pl-8 pr-14 shadow-sm backdrop-blur-[6px] max-md:max-w-full max-md:px-5">
                          <div class="z-[1] mt-1.5 flex w-[62px] max-w-full flex-col items-stretch self-center">
                            <div class="flex aspect-[1.0333333333333334] h-[61px] w-full flex-col items-center justify-center rounded-[100px] border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-3.5 shadow-sm backdrop-blur-[3px]">
                              <img
                                loading="lazy"
                                src="https://cdn.builder.io/api/v1/image/assets/TEMP/d25794f56219b31fbbed7a97188690de7621ad114de3ebd16f8f99a9a175e8fc?apiKey=1f0dcdf4332645488d9ba14588bf6c94&"
                                class="aspect-[1.06] w-full overflow-hidden object-contain object-center"
                              />
                            </div>
                            <div class="mt-4 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                          </div>
                          <div class="-mt-6 ml-8 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                          <div class="z-[1] mt-20 max-w-[347px] self-center text-center text-7xl font-semibold leading-[80px] text-neutral-50 max-md:mt-10 max-md:text-4xl max-md:leading-10">
                            30min
                          </div>
                          <div class="-mt-10 ml-20 flex h-1 w-1 shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                          <div class="mt-16 flex items-end justify-between gap-5 self-stretch max-md:mt-10 max-md:max-w-full max-md:flex-wrap">
                            <div class="mt-56 flex h-1 w-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
                            <div class="flex grow basis-[0%] flex-col items-stretch self-stretch max-md:max-w-full">
                              <div class="flex items-stretch justify-between gap-3 max-md:max-w-full max-md:flex-wrap">
                                <div class="shrink grow basis-auto text-center text-3xl font-semibold leading-8 text-white max-md:max-w-full">
                                  Your average event duration – short, sweet, and everyone leaves with a smile
                                </div>
                                <div class="my-auto flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                              </div>
                              <div class="ml-9 mt-2 flex w-[236px] max-w-full flex-col items-stretch self-start max-md:ml-2.5">
                                <div class="flex items-stretch justify-between gap-5">
                                  <div class="flex grow basis-[0%] flex-col items-center">
                                    <div class="flex h-1 w-1 shrink-0 flex-col rounded-[50%]" />
                                    <div class="mt-5 flex h-1 shrink-0 flex-col self-stretch rounded-[50%]" />
                                    <div class="mt-4 flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%]" />
                                  </div>
                                  <div class="flex h-3 w-3 shrink-0 flex-col self-start rounded-[50%] blur-[1.5px]" />
                                </div>
                                <div class="mr-3 mt-10 flex w-[82px] max-w-full flex-col items-stretch self-end rounded-xl border border-solid border-slate-700 border-opacity-60 bg-white bg-opacity-0 px-5 pb-0.5 pt-3 shadow-sm backdrop-blur-[3px] max-md:mr-2.5">
                                  <div class="whitespace-nowrap text-center text-base font-semibold leading-6 text-gray-50">
                                    Share
                                  </div>
                                  <div class="mt-1.5 flex h-1 w-px shrink-0 flex-col self-start rounded-[50%] max-md:ml-2.5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="my-auto flex h-[9px] w-2 shrink-0 flex-col self-center rounded-[50%] blur-[1.0836269855499268px] max-md:mt-0" />
                  </div>
                  <div class="mt-7 flex h-1 w-1 shrink-0 flex-col self-center rounded-[50%]" />
                </div>
                <div class="mt-[2231px] flex h-1 w-1 shrink-0 flex-col self-end rounded-[50%] max-md:mt-10" />
              </div>
              <div class="mr-36 mt-14 flex w-[158px] max-w-full flex-col items-end self-end max-md:mr-2.5 max-md:mt-10">
                <div class="flex h-3 w-3 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                <div class="ml-9 flex w-[30px] max-w-full items-start gap-1.5 self-start max-md:ml-2.5">
                  <div class="flex h-3 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                  <div class="flex h-3 flex-1 shrink-0 flex-col rounded-[50%] blur-[1.5px]" />
                </div>
                <div class="mt-2 flex h-3 shrink-0 flex-col self-stretch rounded-[50%] blur-[1.5px]" />
              </div>
            </div>
          </div>
        </div>
        <div class="my-auto flex basis-[0%] flex-col items-stretch self-center max-md:hidden">
          <div class="flex flex-col items-start pl-4 max-md:hidden">
            <div class="flex h-0.5 shrink-0 flex-col self-stretch rounded-[50%]" />
            <div class="ml-5 mt-[1449px] flex h-3 w-px shrink-0 flex-col rounded-[50%] blur-[1.5px] max-md:ml-2.5 max-md:mt-10" />
            <div class="mt-36 flex h-1 shrink-0 flex-col self-stretch rounded-[50%] max-md:mt-10" />
          </div>
          <div class="mt-7 flex h-1 shrink-0 flex-col rounded-[50%]" />
          <div class="mt-80 flex h-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
          <div class="mt-9 flex flex-col items-stretch pl-8 max-md:pl-5">
            <div class="flex h-1 shrink-0 flex-col rounded-[50%]" />
            <div class="mt-48 flex h-1 shrink-0 flex-col rounded-[50%] max-md:mt-10" />
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
