import { Balancer } from "react-wrap-balancer";
import { AutocompleteSearch, ComboboxDemo, Option } from "~/app/_components/autocomplete";
import ProCard from "~/app/_components/pro-card";
const services = [
  { label: "Hair dresser", value: "hair dresser" },
  { label: "Therapist", value: "therapist" },
  { label: "Dermatologist", value: "dermatologist" },
] as const satisfies Array<Option>;

export default async function Home() {
  console.log("options: ");

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
            {/* <AutocompleteSearch options={services} /> */}
            {/* The below is a copy-past from shadcn and all options are disabled (idk why) */}
            <ComboboxDemo />
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
