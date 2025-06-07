import type { Prisma } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import { withAxiomGetServerSideProps } from "next-axiom";

import { prisma } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

// taken from @link: https://nextjs.org/learn/seo/crawling-and-indexing/xml-sitemaps
function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

function generateSiteMap(paths: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       ${paths
         .map((path) => {
           return `
         <url>
             <loc>${`${path}`}</loc>
         </url>
       `;
         })
         .join("")}
     </urlset>
   `;
}

export const getServerSideProps = withAxiomGetServerSideProps(async ({ res }: GetServerSidePropsContext) => {
  // - pages/apps/[slug].tsx getStaticPaths from `apps/web`
  const appStore = await prisma.app.findMany({ select: { slug: true }, where: { enabled: true } });
  const pathsAppStore = appStore.map(({ slug }) => `${process.env.NEXT_PUBLIC_WEBSITE_URL}/apps/${slug}`);

  // - pages/apps/categories/[category].tsx getStaticPaths from `apps/web`
  const appStoreCategories = Object.keys(AppCategories);
  const pathsAppStoreCategories = appStoreCategories.map(
    (category) => `${process.env.NEXT_PUBLIC_WEBSITE_URL}/apps/categories/${category}`
  );

  // ==================== INDEX USERS WITH ENOUGH CONTENT ====================
  // NB: we need to first fetch the user query in chunks to avoid exceeding prisma's max query size of 5MB (not possible to filter on our conditions).
  // https://github.com/prisma/prisma/issues/8935
  // https://github.com/prisma/prisma/issues/7872
  const usersWithEnoughContentWhere: Prisma.UserWhereInput = {
    avatarUrl: { not: null },
    bio: { not: null },
    eventTypes: { some: { AND: { eventName: { not: null }, description: { not: null } } } },
  };

  // count all users so that we can chunk the query
  const totalUsers = await prisma.user.count({
    where: usersWithEnoughContentWhere,
  });
  // chunk the query so that we can run in parallel
  const pageSize = 1000; // Example page size
  const numberOfQueries = Math.ceil(totalUsers / pageSize);
  const userQueries = Array.from({ length: numberOfQueries }, (_, index) => {
    return prisma.user.findMany({
      skip: index * pageSize,
      take: pageSize,
      where: usersWithEnoughContentWhere,
      select: {
        username: true,
        bio: true,
        eventTypes: {
          select: {
            slug: true,
            eventName: true,
            description: true,
          },
        },
      },
    });
  });
  // run the queries in parallel
  const allUsers = (await Promise.all(userQueries)).flat();

  // Filter the users that meet the content criteria
  // - they have an avatar set
  // - they have a description provided with at least 50 characters
  // - they have at least 2 eventTypes
  // - at least 2 of their event types have a description with at least 50 characters
  const usersWithEnoughContent = allUsers.filter((user) => {
    const hasLenghtyBio = Boolean(user?.bio?.length && user.bio.length >= 50);
    const hasEnoughEventTypes = user.eventTypes.length >= 2;
    const hasEnoughEventTypesWithLenghtyDescriptions =
      user.eventTypes.filter((eventType) =>
        // filter out events without or short description
        Boolean(eventType?.description?.length && eventType.description.length >= 50)
      ).length >= 2;

    return hasLenghtyBio && hasEnoughEventTypes && hasEnoughEventTypesWithLenghtyDescriptions;
  });

  const usersWithEnoughContentPaths = usersWithEnoughContent.map((user) => {
    return `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${user.username}`;
  });
  // ====================  ====================

  // note: excluding the /[user] & /[team] pages as they currently don't have a lot of content
  const paths = [
    // /apps
    ...pathsAppStore,
    ...pathsAppStoreCategories,
    // users with enough content
    ...usersWithEnoughContentPaths,
  ];

  // We generate the XML sitemap with the posts data
  const sitemap = generateSiteMap(paths);

  res.setHeader("Content-Type", "text/xml");
  // we send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
});

export default SiteMap;
