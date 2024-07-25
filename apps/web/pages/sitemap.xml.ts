import { globby } from "globby";
import type { GetServerSidePropsContext } from "next";
import { withAxiomGetServerSideProps } from "next-axiom";
// import { getStaticPaths as getStaticPathsResources } from "pages/scheduling/[...slugs]";
import { z } from "zod";

import { prisma } from "@calcom/prisma";

// import { getAllBlogPaths } from "@lib/blog/server";

const locales = [
  "en",
  "es",
  "de",
  "nl",
  "pl",
  "pt-BR",
  "sr",
  "tr",
  "vi",
  "zh-CN",
  "zh-TW",
  "fr",
  "it",
  "ar",
  "cs",
  "pt",
];
export enum SiteLocale {
  Ar = "ar",
  De = "de",
  En = "en",
  Es = "es",
  Fr = "fr",
  It = "it",
  Pt = "pt",
}
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
  // - all all non-dynamic (non-[].tsx) pages
  const websitePages = await globby(
    [
      // all TSX/JSX pages
      "./**/*{.tsx,.jsx}",
    ],
    { cwd: "../../apps/website/pages" }
  );
  const pathsWebsite = websitePages
    .filter((page) => {
      // exclude dynamic pages (e.g. /[...slugs].tsx)
      // nextjs pages (e.g. _app, _document, etc.),
      // api routes (e.g. social/og.tsx)
      return !page.includes("[") && !page.includes("api/") && !page.startsWith("_");
    })
    .map((page) => {
      const slug = page.replace("pages", "").replace(".tsx", "").replace(".jsx", "");
      return `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${slug}`;
    });
  console.log(`[sitemap] 
    - ${pathsWebsite.length} website pages

    all pages: 
    ${pathsWebsite.join("\n")}`);

  // - locales versions of all non-dynamic (non-[].tsx) pages
  const pathsWebsiteNonDefaultLocales: Array<string> = [];
  for (const locale of locales) {
    if (locale === "en") continue;
    pathsWebsiteNonDefaultLocales.push(
      ...pathsWebsite.flatMap((path) => {
        if (path.includes("/blog")) return [];
        const regex = new RegExp(`^(${process.env.NEXT_PUBLIC_WEBSITE_URL})\/(.+)$`);
        return path.replace(regex, `$1/${locale}/$2`);
      })
    );
  }

  // const { allBlogPosts, allTags } = await getAllBlogPaths();
  // // - pages/blog/[slug].tsx
  // const pathsPosts = allBlogPosts
  //   .map(({ _locales, slug }) => {
  //     if (!_locales.includes(SiteLocale.En)) return null;
  //     return `${process.env.NEXT_PUBLIC_WEBSITE_URL}/blog/${slug}`;
  //   })
  //   .filter(Boolean); // remove nulls

  // // - pages/blog/category/[category].tsx
  // const pathsCategories = allTags
  //   .map(({ _locales, categorySlug }) => {
  //     if (!_locales.includes(SiteLocale.En)) return null;
  //     return `${process.env.NEXT_PUBLIC_WEBSITE_URL}/blog/category/${categorySlug}`;
  //   })
  //   .filter(Boolean); // removes nulls

  // // - pages/resources/[...slugs].tsx (nb: this already supports i18n)
  // const { paths: resourcesStaticPaths } = await getStaticPathsResources();
  // const pathsResources = resourcesStaticPaths.map(({ params: { slugs }, locale }) => {
  //   return `${process.env.NEXT_PUBLIC_WEBSITE_URL}${
  //     locale !== "en" ? `/${locale}` : ""
  //   }/scheduling/${slugs.join("/")}`;
  // });

  // Note: App store pages are excluded for now, since they display a skeleton sidebar for search engines & don't have proper i18n support (or a workflow integration to publish the page only if it contains enough content).
  // - pages/apps/[slug].tsx getStaticPaths from `apps/web`
  // const appStore = await prisma.app.findMany({ select: { slug: true }, where: { enabled: true } });
  // const pathsAppStore = appStore.map(({ slug }) => `${process.env.NEXT_PUBLIC_WEBSITE_URL}/apps/${slug}`);

  // // - pages/apps/categories/[category].tsx getStaticPaths from `apps/web`
  // const appStoreCategories = Object.keys(AppCategories);
  // const pathsAppStoreCategories = appStoreCategories.map(
  //   (category) => `${process.env.NEXT_PUBLIC_WEBSITE_URL}/apps/categories/${category}`
  // );

  const excluded: any[] = [];
  // include the /docs pages as well from motif.land
  const motifProjectFiles = await fetch(
    `${process.env.MOTIFLAND_REST_ENDPOINT}/projects/${process.env.MOTIFLAND_DOCS_PROJECT_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MOTIFLAND_DOCS_API_KEY}`,
      },
    }
  )
    .then((res) => res.json())
    .then((json) => {
      const files = [];
      for (const file of json.data.files) {
        const validation = MotifLandFileSchema.safeParse(file);
        if (!validation.success) {
          // skipe files that do not match expected schema
          console.warn("Excluded a file from sitemap because of mismatching schema:", {
            file,
            error: validation.error,
          });
          continue;
        }
        if (!validation.data.path) {
          // skip files that do not have a path
          continue;
        }
        if (!validation.data.path.startsWith("/pages/")) {
          // skip files that are not in the /pages/docs dir (note: including pages/index.mdx as we rely on pages/docs/index.mdx)
          continue;
        }
        if (!validation.data.isPublic) {
          // skip files that aren't marked as public
          excluded.push(file);
          continue;
        }
        // add this file to sitemap
        files.push(validation.data);
      }
      return files;
    });
  if (excluded.length > 0) {
    console.warn(
      `
      ==================== [SITEMAP] ====================
      ⚠️ Excluded Pages ⚠️

      
      Excluded ${excluded.length} MOTIF pages from sitemap because they are not public:

      ${JSON.stringify(excluded.map(({ id, name, isPublic, path }) => ({ id, name, isPublic, path })))}
      ==================== [SITEMAP] ====================
      `
    );
  }

  const pathsDocs = motifProjectFiles.map((file) => {
    const slug = file.path?.replace("/pages/", "");
    return `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${slug}`;
  });

  // ==================== INDEX USERS WITH ENOUGH CONTENT ====================
  // NB: we need to first fetch the user query in chunks to avoid exceeding prisma's max query size of 5MB (not possible to filter on our conditions).
  // https://github.com/prisma/prisma/issues/8935
  // https://github.com/prisma/prisma/issues/7872

  // count all users so that we can chunk the query
  const totalUsersWithMinimumContent = await prisma.user.count({
    where: {
      AND: [
        { avatarUrl: { not: null } },
        { bio: { not: null } },
        { eventTypes: { some: { AND: { title: { not: undefined }, description: { not: null } } } } },
      ],
    },
  });

  console.log(`[sitemap] 
    - ${totalUsersWithMinimumContent} users with enough content
    `);
  // chunk the query so that we can run in parallel
  // Note: this is necessary as prisma encounters a limit on accelerate otherwise
  const pageSize = 1000; // Example page size
  const numberOfQueries = Math.ceil(totalUsersWithMinimumContent / pageSize);
  const userQueries = Array.from({ length: numberOfQueries }, (_, index) => {
    return prisma.user.findMany({
      skip: index * pageSize,
      take: pageSize,
      where: {
        AND: [
          { avatarUrl: { not: null } },
          { bio: { not: null } },
          { eventTypes: { some: { AND: { eventName: { not: null }, description: { not: null } } } } },
        ],
      },
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

  // Now, filter the users that meet the content criteria
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

  // Note: we're excluding orgs, since they are hosted on subdomains, which are treated as separate domains on google.

  const paths = [
    ...pathsWebsite,
    ...pathsWebsiteNonDefaultLocales,
    ...pathsDocs,
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

export interface Sitemap {
  urlset: {
    url: Array<{ loc: Array<string> }>;
  };
}
export const MotifLandProjectDataSchema = z.object({
  data: z.object({
    id: z.string(),
    files: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        isPublic: z.boolean(),
        parentFolderId: z.string().optional(),
        ts: z.number(),
        path: z.string().optional(),
        meta: z
          .object({
            title: z.string().optional(),
            description: z.string().optional(),
            hugeTitle: z.boolean().optional(),
            fullWidth: z.boolean().optional(),
            omitFeedback: z.boolean().optional(),
            noTOC: z.boolean().optional(),
          })
          .optional(),
      })
    ),
    folders: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        parentFolderId: z.string().optional(),
        projectId: z.string(),
      })
    ),
  }),
});

const MotifLandFileSchema = MotifLandProjectDataSchema.shape.data.shape.files.element;
export default SiteMap;
