
import { Balancer } from "react-wrap-balancer";
import { getServerAuthSession } from "~/server/auth";
import { SearchForm } from "./_components/search-form";
import ProCard from "~/app/_components/pro-card";

export default async function Home() {
  // const session = await getServerAuthSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center"
    style={{backgroundImage: "url('/hero.jpg')", backgroundRepeat: "no-repeat"}}>
      <div className="flex-1">
        <div className="container mt-16 flex flex-col items-center justify-center gap-12 px-4 py-6" 
        >
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            <Balancer>
              Cal.com{" "}
              <span className="underline underline-offset-4 drop-shadow-glow">
                Platform
              </span>
            </Balancer>
          </h1>
          <SearchForm />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 mt-24">
        <ProCard/>
        </div>
      </div>
    </main>
  );
};

