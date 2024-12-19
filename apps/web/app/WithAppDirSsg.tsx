import type { GetStaticProps, GetStaticPropsContext } from "next";
import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";

export const withAppDirSsg =
  <T extends Record<string, any>>(getStaticProps: GetStaticProps<T>, routePath: string) =>
  async (context: GetStaticPropsContext) => {
    const cacheKey = JSON.stringify({
      route: routePath,
      params: context.params || {},
    });

    const getCachedProps = unstable_cache(async () => {
      const ssgResponse = await getStaticProps(context);

      if ("redirect" in ssgResponse) {
        redirect(ssgResponse.redirect.destination);
      }

      if ("notFound" in ssgResponse) {
        notFound();
      }

      const props = await Promise.resolve(ssgResponse.props);

      return {
        ...props,
        ...("trpcState" in props && { dehydratedState: props.trpcState }),
      };
    }, [`ssg-${cacheKey}`]);

    return getCachedProps();
  };
