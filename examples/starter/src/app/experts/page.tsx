import { Balancer } from "react-wrap-balancer";
import { AutocompleteSearch } from "~/app/_components/autocomplete";
import { sorting, defaultSort, professions } from "~/lib/constants";
import ExpertList from "~/app/experts/_components/result";
import { db } from "prisma/client";


export const runtime = "edge";

export const metadata = {
  title: "Search",
  description: "Search for experts on the marketplace.",
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { sort, q: searchValue } = searchParams as Record<string, string>;
  const { sortKey, reverse } =
    sorting?.find((item) => item.slug === sort) ?? defaultSort;

    const experts = await db.user.findMany({
      where: {
        professions: {
          some: {
            slug: {
              equals: searchParams?.profession as string,
            },
          },
        },
      },
      include: {
        professions: true,
        services: true,
      }
    });

  return (
    <div className="flex flex-1 flex-col">
      {experts.length > 0 ? (
        <main className="flex min-h-screen flex-col items-center justify-center">
          <div className="flex-1">
            <div
              className="flex min-h-96 w-screen flex-col justify-center bg-cover bg-center bg-no-repeat py-20"
              style={{ backgroundImage: "url('/hero.jpg')" }}
            >
              <div className="container mt-16 flex flex-col items-center justify-center gap-12 px-4 py-6">
                <h1 className="font-display text-5xl font-extrabold tracking-tight text-white">
                  <Balancer>Find your Cal.com Expert</Balancer>
                </h1>
                <div>
                  <AutocompleteSearch
                    options={professions}
                    initialSearch={searchValue}
                  />
                </div>
              </div>
            </div>
            <div className="mx-auto flex max-w-[980px] flex-col items-center justify-center gap-12 px-4 py-6 md:min-w-[50vw]">
              <ExpertList experts={experts} />
            </div>
          </div>
        </main>
      ) : null}
    </div>
  );
}
