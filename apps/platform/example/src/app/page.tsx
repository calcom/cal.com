import { Balancer } from "react-wrap-balancer";
import { AutocompleteSearch } from "~/app/_components/autocomplete";
import ProCard from "~/app/_components/pro-card";
import { professions } from "~/lib/constants";



export default async function Home() {
  return (
    <main>
      <div
        className="flex min-h-96 flex-col justify-center bg-cover bg-center bg-no-repeat py-20"
        style={{ backgroundImage: "url('/hero.jpg')" }}
      >
        <div className="container mt-16 flex flex-col items-center justify-center gap-12 px-4 py-6">
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-white">
            <Balancer>Find your Cal.com Expert</Balancer>
          </h1>
          <div>
            <AutocompleteSearch options={professions} />
          </div>
        </div>
      </div>
      <div className="flex-1">
        <div className="mt-24 flex flex-col items-center justify-center gap-4">
          <ProCard />
        </div>
      </div>
    </main>
  );
}
