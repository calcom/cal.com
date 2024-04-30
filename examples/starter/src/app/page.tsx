import { Loader } from "lucide-react";
import { Suspense } from "react";
import { Balancer } from "react-wrap-balancer";
import { AutocompleteSearch } from "~/app/_components/autocomplete";
import ProCard from "~/app/_components/pro-card";
import WelcomeCard from "~/app/_components/welcome-card";
import { SignedIn, SignedOut } from "~/auth";
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
        <div className="my-10">
          <Suspense
            fallback={
              <div className="relative h-max w-full max-w-sm place-self-center">
                <div className=" absolute inset-0 z-40  grid rounded-2xl bg-slate-900 text-white">
                  <Loader className="z-50 animate-spin place-self-center" />
                </div>
              </div>
            }
          >
            <SignedIn>
              {({ user }) => <WelcomeCard username={user.name} />}
            </SignedIn>
            <SignedOut>
              <ProCard />
            </SignedOut>
          </Suspense>
        </div>
      </div>
    </main>
  );
}
