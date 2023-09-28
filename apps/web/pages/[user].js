import { Button } from "@shadcdn/ui";
import RichContentParser from "@ui/fayaz/RichContentParser";
import insertNonBreakingSpaces from "@ui/utilities/insert-non-breaking-spaces";
import BioLink from "@ui/valery/bio-link";
import BookItem from "@ui/valery/book-item";
import CirclesBackground from "@ui/valery/circles-background";
import ExperienceItem from "@ui/valery/experience-item";
import FactItem from "@ui/valery/fact-item";
import PodcastItem from "@ui/valery/podcast-item";
import ProjectItem from "@ui/valery/project-item";
import Publication from "@ui/valery/publication-item";
import VideoItem from "@ui/valery/video-item";
import { cva } from "class-variance-authority";
// import { createCheckoutSession } from "lib/stripe";
import { useAuthContext } from "context/authContext";
import { getProfile } from "lib/firebase/utils";
import { NextSeo } from "next-seo";
import Link from "next/link";
import { CalendarPlus } from "react-bootstrap-icons";
import { titleCase } from "title-case";

import { Tooltip } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Section = ({ title, tileLayout = false, children }) => {
  const childrenLayoutClasses = cva([], {
    variants: {
      tileLayout: {
        true: ["sm:columns-2", "gap-14"],
        false: ["flex", "flex-col", "gap-7"],
      },
    },
  });
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-gray-500">{title}</h2>
      <div className={childrenLayoutClasses({ tileLayout })}>{children}</div>
    </section>
  );
};

// Two-part links section.
// Top: Links to social media, etc. (Icon-only.)
// Bottom: Generic links
const LinksSection = ({ links }) => {
  const iconLinks = links?.filter(
    ({ type, url }) => type !== "generic_link" && type !== "website" && url !== ""
  );
  const genericLinks = links?.filter(
    ({ type, url }) => type === "generic_link" || (type === "website" && url !== "")
  );

  // Two-part variant
  // return (
  //   <div className="flex max-w-md flex-col gap-3">
  //     {/* Icon links */}
  //     <div className="flex flex-wrap gap-x-4 gap-y-1">
  //       {iconLinks.map(({ key, url, name }, index) => (
  //         <BioLink key={index} {...{ type: key, url, name }} />
  //       ))}
  //     </div>
  //     {/* Generic links */}
  //     <div className="flex flex-wrap gap-x-3.5 gap-y-1">
  //       {genericLinks.map(({ key, url, name }, index) => (
  //         <BioLink key={index} {...{ type: key, url, name }} />
  //       ))}
  //     </div>
  //   </div>
  // );

  // One-part variant
  return (
    <div className="flex max-w-md flex-col gap-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {iconLinks.map(({ type, url, name }, index) => (
          <BioLink key={"0" + index} {...{ type, url, name }} />
        ))}
        {genericLinks.map(({ type, url, name }, index) => (
          <BioLink key={"1" + index} {...{ type, url, name }} />
        ))}
      </div>
    </div>
  );
};

const ProfilePage = ({ profileData }) => {
  const { user } = useAuthContext();
  console.log({ profileData });

  const userPhoto = () => {
    if (profileData.avatar_url) return profileData.avatar_url;
    if (profileData.name) return `https://api.dicebear.com/6.x/initials/svg?seed=${profileData.name}`;
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${profileData.uid}`;
  };

  const userPlainTextBio =
    profileData?.bio?.content?.length && profileData?.bio?.content[0]?.content
      ? profileData.bio.content[0].content.map((item) => item?.text ?? "").join("")
      : "";

  const isLoggedInUser = profileData?.uid === user?.uid;

  return (
    <div className="flex flex-col items-center bg-white leading-6 text-gray-900">
      {/* Profile header */}
      <NextSeo
        title={`${profileData?.name} – Book a call with me`}
        description={profileData?.bio ? userPlainTextBio : `${profileData?.name} profile on Borg.id`}
        openGraph={{
          site_name: "Borg.id",
          title: `${profileData?.name} – Book a call with me`,
          description: `${profileData?.bio ? userPlainTextBio : `${profileData?.name} profile on Borg.id`}`,
          images: [
            {
              url: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?p=${encodeURIComponent(userPhoto())}&n=${
                profileData?.name
              }&w=${encodeURIComponent(profileData?.company)}&r=${encodeURIComponent(
                profileData?.role
              )}&t=${encodeURIComponent(profileData?.advice_on)}`,
              // url: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?profileID=${profileID}`,
              width: 1200,
              height: 630,
            },
          ],
        }}
        twitter={{
          cardType: "summary_large_image",
        }}
      />
      {/* {process.env.NODE_ENV === "production" ? "" : <Header />} */}
      <div className="mx-[5%] mb-12 mt-20 flex w-[90%] max-w-2xl flex-col gap-8 md:w-full">
        {/* Top */}
        <div className="grid w-full grid-flow-dense grid-cols-[auto_1fr] gap-x-[18px] gap-y-4 sm:grid-cols-[auto_1fr_auto] ">
          <img
            src={userPhoto()}
            className="w-[88px] shrink-0 self-start rounded-full"
            alt={profileData?.name}
          />
          <div className="col-span-2 mr-5 flex flex-col self-center sm:col-span-1 sm:self-start sm:pt-2">
            <div className="font-bold" id="name">
              {profileData?.name}
            </div>
            {profileData?.role && (
              <div className="text-sm leading-6" id="role">
                {titleCase(profileData?.role)}
              </div>
            )}
            {profileData?.company && (
              <div className="flex flex-row items-start gap-1.5 text-sm leading-6">
                <div className="w-3 shrink-0 text-gray-400">at</div>
                <div id="company">{insertNonBreakingSpaces(profileData?.company)}</div>
              </div>
            )}
          </div>

          {/* Button block */}
          <div
            id="call-charges"
            className="flex flex-col items-center gap-1.5 self-center justify-self-end leading-6 sm:self-center">
            {user?.uid ? (
              // <Tooltip
              //   side="bottom"
              //   open={!profileData?.calendar?.calcom_event_url}
              //   content={
              //     !profileData?.calendar?.calcom_event_url
              //       ? "This user doesn't have a call booking link yet"
              //       : ""
              //   }
              // >
              <Button
                className="flex h-10 flex-row items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 text-white hover:bg-gray-800 active:bg-gray-950"
                disabled={!profileData?.calendar?.calcom_event_url}
                // onClick={() => {
                //   NProgress.set(0.4);
                //   try {
                //     createCheckoutSession({
                //       bookedByUid: user?.uid,
                //       bookingByName: user?.displayName ?? null,
                //       bookedByEmail: user?.email,
                //       bookingWithUid: profileData?.uid,
                //       bookingWithName: profileData?.name,
                //       bookingWithEmail: profileData?.email,
                //       bookingLink:
                //         profileData?.calendar?.calcom_event_url ??
                //         profileData?.calendar_link,
                //       chargeAmount: profileData?.call_charges,
                //       calUserId: profileData?.calendar?.calcom_user_id,
                //     });
                //   } catch (e) {
                //     console.log(
                //       "Error redirecting to Stripe payment page: ",
                //       e
                //     );
                //     NProgress.done();
                //   }
                // }}
              >
                <CalendarPlus size={16} />
                <div className="whitespace-nowrap ">Book a Call →</div>
              </Button>
            ) : (
              // </Tooltip>
              <Button
                className="flex h-10 flex-row items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 text-white hover:bg-gray-800 active:bg-gray-950"
                disabled={!profileData?.calendar?.calcom_event_url}
                // onClick={() => {
                //   NProgress.set(0.4);
                //   try {
                //     const auth = getAuth();
                //     signInAnonymously(auth)
                //       .then(async (data) => {
                //         const { user } = data;
                //         if (user?.uid) {
                //           try {
                //             createCheckoutSession({
                //               bookedByUid: user?.uid,
                //               bookingByName: user?.displayName ?? null,
                //               bookedByEmail: user?.email,
                //               bookingWithUid: profileData?.uid,
                //               bookingWithName: profileData?.name,
                //               bookingWithEmail: profileData?.email,
                //               bookingLink:
                //                 profileData?.calendar?.calcom_event_url ??
                //                 profileData?.calendar_link,
                //               chargeAmount: profileData?.call_charges,
                //               calUserId: profileData?.calendar?.calcom_user_id,
                //             });
                //           } catch (e) {
                //             console.log(
                //               "Error redirecting to Stripe payment page: ",
                //               e
                //             );
                //             NProgress.done();
                //           }
                //         }
                //       })
                //       .catch((error) => {
                //         toast.error(error.message);
                //         console.log("error", error);
                //       });
                //   } catch (e) {
                //     console.error(e);
                //   }
                // }}
              >
                <CalendarPlus size={16} />
                <div className="whitespace-nowrap ">Book a Call →</div>
              </Button>
            )}

            <div className="text-[15px] text-gray-900">${profileData?.call_charges}/hr</div>
          </div>
        </div>
        {/* Links */}
        {profileData.links?.length > 0 && <LinksSection links={profileData.links} />}

        <div className="flex items-center gap-2">
          {isLoggedInUser ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/edit-profile">Edit profile</Link>
            </Button>
          ) : (
            ""
          )}
          {user?.email?.includes("hive.one") || user?.email?.includes("bord.id") ? (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const filename = "data.json";
                  const jsonStr = JSON.stringify(profileData);
                  const element = document.createElement("a");
                  element.setAttribute(
                    "href",
                    "data:text/plain;charset=utf-8," + encodeURIComponent(jsonStr)
                  );
                  element.setAttribute("download", filename);
                  element.style.display = "none";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}>
                Export profile
              </Button>
            </div>
          ) : (
            ""
          )}
        </div>

        {/* About */}
        {profileData?.bio ? <RichContentParser content={profileData.bio} /> : ""}
      </div>
      {/* Gray section */}
      <div className="relative flex w-full flex-col items-center bg-gray-200 pb-[88px] pt-14">
        <div className="relative z-10 mx-[5%] flex w-[90%] max-w-2xl flex-col gap-16 md:w-full">
          {/* Facts */}
          {profileData?.facts?.length > 0 && (
            <Section title="Facts">
              <div id="facts" className="grid gap-5 sm:grid-cols-2">
                {profileData?.facts.map(({ title, description, url }, index) => (
                  <FactItem key={index} {...{ title, description, url }} />
                ))}
              </div>
            </Section>
          )}
          {/* Advise on */}
          {profileData?.advice_on?.length ? (
            <Section title="Advise On">
              <div id="advice" className="flex flex-wrap gap-2">
                {profileData?.advice_on?.map((title) => (
                  <Tooltip
                    show={title?.length > 50}
                    text={<div className="w-[400px] break-all">{title}</div>}
                    key={title}>
                    <div className="flex flex-col whitespace-nowrap rounded-lg border border-solid border-gray-300 bg-gray-50 px-[15px] py-[7px] text-lg leading-[24px] text-gray-600">
                      {title?.slice(0, 50)}
                      {title?.length > 50 ? "..." : ""}
                    </div>
                  </Tooltip>
                ))}
              </div>
            </Section>
          ) : (
            ""
          )}
        </div>
        <div className="absolute top-0 flex h-full w-full items-center justify-center overflow-hidden">
          <CirclesBackground className="absolute" />
        </div>
      </div>
      {/* Details */}
      <div className="mx-[5%] mb-40 flex w-[90%] max-w-2xl flex-col gap-28 pt-28 md:w-full">
        {profileData?.projects?.length ? (
          <Section id="projects" title="Selected Projects" tileLayout>
            {profileData?.projects?.map((project, index) => (
              <ProjectItem key={index} {...project} />
            ))}
          </Section>
        ) : (
          ""
        )}
        {profileData?.books?.length ? (
          <Section title="Books">
            <div
              id="books"
              className="grid w-full grid-cols-2 flex-row flex-wrap justify-between gap-16 max-[480px]:gap-8 sm:grid-cols-[repeat(3,_160px)] sm:gap-8">
              {profileData?.books?.map((book, index) => (
                <BookItem key={index} book={book} />
              ))}
            </div>
          </Section>
        ) : (
          ""
        )}
        {profileData?.podcast?.episodes?.length && (
          <Section title="Podcasts">
            <div id="podcasts">
              <PodcastItem podcast={profileData.podcast} />
            </div>
          </Section>
        )}
        {profileData?.appearances && profileData.appearances.length > 0 && (
          <Section title="Podcasts (appearances)">
            <div id="podcasts-appearances">
              <ul className="space-y-3">
                {profileData.appearances.map((appearance, index) => (
                  <li key={index}>
                    <a href={appearance.url} target="_blank" rel="noopener noreferrer">
                      {appearance.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}
        {profileData?.videos?.length ? (
          <Section title="Videos">
            <div
              id="videos"
              className="grid grid-cols-1 gap-x-5 gap-y-7 min-[430px]:grid-cols-2 md:grid-cols-3 ">
              {profileData?.videos?.map((video, index) => (
                <VideoItem key={index} video={video} />
              ))}
            </div>
          </Section>
        ) : (
          ""
        )}
        {profileData?.experience?.length ? (
          <Section id="experience" title="Experience">
            {profileData?.experience?.map((experience, index) => (
              <ExperienceItem
                key={index}
                experience={experience}
                trail={index === profileData?.experience?.length - 1 ? false : true}
              />
            ))}
          </Section>
        ) : (
          ""
        )}
        {profileData?.publications?.length > 0 && (
          <Section id="publications" title="Selected Publications">
            {profileData?.publications?.map((publication, index) => (
              <Publication key={index} {...publication} />
            ))}
          </Section>
        )}
      </div>
      {/* <Footer /> */}
    </div>
  );
};

export async function getServerSideProps({ params, res }) {
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=59");
  const profileID = params.user;
  console.log("profileID", profileID);
  let profileData;

  try {
    profileData = await getProfile(profileID);
    console.log("profileData", profileData);
    if (!profileData) {
      throw new Error("User not found"); // Throw an error if profileData is empty
    }
  } catch (e) {
    res.statusCode = 404; // Set the status code to 404
    return {
      props: {
        profileID,
        profileData: null, // Set profileData to null
      },
    };
  }

  return {
    props: {
      profileID,
      profileData: JSON.parse(JSON.stringify(profileData)),
    },
  };
}

ProfilePage.PageWrapper = PageWrapper;

export default ProfilePage;

// import type { DehydratedState } from "@tanstack/react-query";
// import classNames from "classnames";
// import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
// import Link from "next/link";
// import { Toaster } from "react-hot-toast";
// import type { z } from "zod";

// import {
//   sdkActionManager,
//   useEmbedNonStylesConfig,
//   useEmbedStyles,
//   useIsEmbed,
// } from "@calcom/embed-core/embed-iframe";
// import OrganizationAvatar from "@calcom/features/ee/organizations/components/OrganizationAvatar";
// import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
// import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
// import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
// import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
// import { getUsernameList } from "@calcom/lib/defaultEvents";
// import { useLocale } from "@calcom/lib/hooks/useLocale";
// import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
// import useTheme from "@calcom/lib/hooks/useTheme";
// import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
// import { stripMarkdown } from "@calcom/lib/stripMarkdown";
// import prisma from "@calcom/prisma";
// import type { EventType, User } from "@calcom/prisma/client";
// import { baseEventTypeSelect } from "@calcom/prisma/selects";
// import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
// import { HeadSeo, UnpublishedEntity } from "@calcom/ui";
// import { Verified, ArrowRight } from "@calcom/ui/components/icon";

// import type { EmbedProps } from "@lib/withEmbedSsr";

// import { ssrInit } from "@server/lib/ssr";

// export function UserPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
//   const { users, profile, eventTypes, markdownStrippedBio, entity } = props;

//   const [user] = users; //To be used when we only have a single user, not dynamic group
//   useTheme(profile.theme);
//   const { t } = useLocale();

//   const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

//   const isEmbed = useIsEmbed(props.isEmbed);
//   const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
//   const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
//   const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
//   const {
//     // So it doesn't display in the Link (and make tests fail)
//     user: _user,
//     orgSlug: _orgSlug,
//     ...query
//   } = useRouterQuery();

//   /*
//    const telemetry = useTelemetry();
//    useEffect(() => {
//     if (top !== window) {
//       //page_view will be collected automatically by _middleware.ts
//       telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/[user]"));
//     }
//   }, [telemetry, router.asPath]); */

//   if (entity?.isUnpublished) {
//     return (
//       <div className="flex h-full min-h-[100dvh] items-center justify-center">
//         <UnpublishedEntity {...entity} />
//       </div>
//     );
//   }

//   const isEventListEmpty = eventTypes.length === 0;
//   return (
//     <>
//       <HeadSeo
//         title={profile.name}
//         description={markdownStrippedBio}
//         meeting={{
//           title: markdownStrippedBio,
//           profile: { name: `${profile.name}`, image: null },
//           users: [{ username: `${user.username}`, name: `${user.name}` }],
//         }}
//         nextSeoProps={{
//           noindex: !profile.allowSEOIndexing,
//           nofollow: !profile.allowSEOIndexing,
//         }}
//       />

//       <div className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "max-w-3xl" : "")}>
//         <main
//           className={classNames(
//             shouldAlignCentrally ? "mx-auto" : "",
//             isEmbed ? "border-booker border-booker-width  bg-default rounded-md border" : "",
//             "max-w-3xl px-4 py-24"
//           )}>
//           <div className="mb-8 text-center">
//             <OrganizationAvatar
//               imageSrc={profile.image}
//               size="xl"
//               alt={profile.name}
//               organizationSlug={profile.organizationSlug}
//             />
//             <h1 className="font-cal text-emphasis mb-1 text-3xl" data-testid="name-title">
//               {profile.name}
//               {user.verified && (
//                 <Verified className=" mx-1 -mt-1 inline h-6 w-6 fill-blue-500 text-white dark:text-black" />
//               )}
//             </h1>
//             {!isBioEmpty && (
//               <>
//                 <div
//                   className="  text-subtle break-words text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
//                   dangerouslySetInnerHTML={{ __html: props.safeBio }}
//                 />
//               </>
//             )}
//           </div>

//           <div
//             className={classNames("rounded-md ", !isEventListEmpty && "border-subtle border")}
//             data-testid="event-types">
//             {user.away ? (
//               <div className="overflow-hidden rounded-sm border ">
//                 <div className="text-muted  p-8 text-center">
//                   <h2 className="font-cal text-default mb-2 text-3xl">😴{" " + t("user_away")}</h2>
//                   <p className="mx-auto max-w-md">{t("user_away_description") as string}</p>
//                 </div>
//               </div>
//             ) : (
//               eventTypes.map((type) => (
//                 <div
//                   key={type.id}
//                   style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
//                   className="bg-default border-subtle dark:bg-muted dark:hover:bg-emphasis hover:bg-muted group relative border-b first:rounded-t-md last:rounded-b-md last:border-b-0">
//                   <ArrowRight className="text-emphasis  absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
//                   {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
//                   <div className="block w-full p-5">
//                     <Link
//                       prefetch={false}
//                       href={{
//                         pathname: `/${user.username}/${type.slug}`,
//                         query,
//                       }}
//                       passHref
//                       onClick={async () => {
//                         sdkActionManager?.fire("eventTypeSelected", {
//                           eventType: type,
//                         });
//                       }}
//                       data-testid="event-type-link">
//                       <div className="flex flex-wrap items-center">
//                         <h2 className=" text-default pr-2 text-sm font-semibold">{type.title}</h2>
//                       </div>
//                       <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
//                     </Link>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>

//           {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}
//         </main>
//         <Toaster position="bottom-right" />
//       </div>
//     </>
//   );
// }

// UserPage.isBookingPage = true;
// UserPage.PageWrapper = PageWrapper;

// const getEventTypesWithHiddenFromDB = async (userId: number) => {
//   return (
//     await prisma.eventType.findMany({
//       where: {
//         AND: [
//           {
//             teamId: null,
//           },
//           {
//             OR: [
//               {
//                 userId,
//               },
//               {
//                 users: {
//                   some: {
//                     id: userId,
//                   },
//                 },
//               },
//             ],
//           },
//         ],
//       },
//       orderBy: [
//         {
//           position: "desc",
//         },
//         {
//           id: "asc",
//         },
//       ],
//       select: {
//         ...baseEventTypeSelect,
//         metadata: true,
//       },
//     })
//   ).map((eventType) => ({
//     ...eventType,
//     metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
//   }));
// };

// export type UserPageProps = {
//   trpcState: DehydratedState;
//   profile: {
//     name: string;
//     image: string;
//     theme: string | null;
//     brandColor: string;
//     darkBrandColor: string;
//     organizationSlug: string | null;
//     allowSEOIndexing: boolean;
//   };
//   users: Pick<User, "away" | "name" | "username" | "bio" | "verified">[];
//   themeBasis: string | null;
//   markdownStrippedBio: string;
//   safeBio: string;
//   entity: {
//     isUnpublished?: boolean;
//     orgSlug?: string | null;
//     name?: string | null;
//   };
//   eventTypes: ({
//     descriptionAsSafeHTML: string;
//     metadata: z.infer<typeof EventTypeMetaDataSchema>;
//   } & Pick<
//     EventType,
//     | "id"
//     | "title"
//     | "slug"
//     | "length"
//     | "hidden"
//     | "requiresConfirmation"
//     | "requiresBookerEmailVerification"
//     | "price"
//     | "currency"
//     | "recurringEvent"
//   >)[];
// } & EmbedProps;

// export const getServerSideProps: GetServerSideProps<UserPageProps> = async (context) => {
//   const ssr = await ssrInit(context);
//   const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(
//     context.req.headers.host ?? "",
//     context.params?.orgSlug
//   );
//   const usernameList = getUsernameList(context.query.user as string);
//   const dataFetchStart = Date.now();
//   const usersWithoutAvatar = await prisma.user.findMany({
//     where: {
//       username: {
//         in: usernameList,
//       },
//       organization: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
//     },
//     select: {
//       id: true,
//       username: true,
//       email: true,
//       name: true,
//       bio: true,
//       brandColor: true,
//       darkBrandColor: true,
//       organizationId: true,
//       organization: {
//         select: {
//           slug: true,
//           name: true,
//         },
//       },
//       theme: true,
//       away: true,
//       verified: true,
//       allowDynamicBooking: true,
//       allowSEOIndexing: true,
//     },
//   });

//   const isDynamicGroup = usersWithoutAvatar.length > 1;
//   if (isDynamicGroup) {
//     return {
//       redirect: {
//         permanent: false,
//         destination: `/${usernameList.join("+")}/dynamic`,
//       },
//     } as {
//       redirect: {
//         permanent: false;
//         destination: string;
//       };
//     };
//   }

//   const users = usersWithoutAvatar.map((user) => ({
//     ...user,
//     avatar: `/${user.username}/avatar.png`,
//   }));

//   if (!users.length || (!isValidOrgDomain && !users.some((user) => user.organizationId === null))) {
//     return {
//       notFound: true,
//     } as {
//       notFound: true;
//     };
//   }

//   const [user] = users; //to be used when dealing with single user, not dynamic group

//   const profile = {
//     name: user.name || user.username || "",
//     image: user.avatar,
//     theme: user.theme,
//     brandColor: user.brandColor,
//     darkBrandColor: user.darkBrandColor,
//     organizationSlug: user.organization?.slug ?? null,
//     allowSEOIndexing: user.allowSEOIndexing ?? true,
//   };

//   const eventTypesWithHidden = await getEventTypesWithHiddenFromDB(user.id);
//   const dataFetchEnd = Date.now();
//   if (context.query.log === "1") {
//     context.res.setHeader("X-Data-Fetch-Time", `${dataFetchEnd - dataFetchStart}ms`);
//   }
//   const eventTypesRaw = eventTypesWithHidden.filter((evt) => !evt.hidden);

//   const eventTypes = eventTypesRaw.map((eventType) => ({
//     ...eventType,
//     metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
//     descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
//   }));

//   const safeBio = markdownToSafeHTML(user.bio) || "";

//   const markdownStrippedBio = stripMarkdown(user?.bio || "");
//   const org = usersWithoutAvatar[0].organization;

//   return {
//     props: {
//       users: users.map((user) => ({
//         name: user.name,
//         username: user.username,
//         bio: user.bio,
//         away: user.away,
//         verified: user.verified,
//       })),
//       entity: {
//         isUnpublished: org?.slug === null,
//         orgSlug: currentOrgDomain,
//         name: org?.name ?? null,
//       },
//       eventTypes,
//       safeBio,
//       profile,
//       // Dynamic group has no theme preference right now. It uses system theme.
//       themeBasis: user.username,
//       trpcState: ssr.dehydrate(),
//       markdownStrippedBio,
//     },
//   };
// };

// export default UserPage;
