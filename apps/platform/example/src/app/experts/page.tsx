import { Balancer } from "react-wrap-balancer";
import { AutocompleteSearch } from "~/app/_components/autocomplete";
import { sorting, defaultSort, professions } from "~/lib/constants";
import ExpertList from "~/app/experts/_components/result";
export type Expert = Awaited<ReturnType<typeof getExperts>>[number];

const getExperts = async ({
  sortKey,
  reverse,
  query,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}) => {
  // TODO: replace w/ db call using sortKey, reverse, query
  // const response = await fetch("https://jsonplaceholder.typicode.com/posts");
  // return response.json();

  // return an array of 100 results of type Expert:
  return Array.from({ length: 100 }, (_, i) => ({
    id: i,
    profession: { name: "Hair dresser", isRemote: false },
    services: [{ name: "Haircut" }],
    image: {
      url: "https://picsum.photos/200",
      alt: "A profile picture",
    },
    location: "Berlin",
    name: "John Doe",
    updatedAt: new Date(),
    availableAt: new Date(),
  }));
};

export const runtime = "edge";

export const metadata = {
  title: "Search",
  description: "Search for experts on the marketplace.",
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { sort, q: searchValue } = searchParams as { [key: string]: string };
  const { sortKey, reverse } =
    sorting?.find((item) => item.slug === sort) || defaultSort;

  const experts = await getExperts({
    sortKey,
    reverse,
    query: searchValue,
  });
  const resultsText = experts.length > 1 ? "results" : "result";
  return (
    <>
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

              {/* <ExpertList experts={experts} /> */}
              <ExpertList experts={experts} />
            </div>
          </div>
        </main>
      ) : null}
    </>
  );
}
