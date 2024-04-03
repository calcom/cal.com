
import { Balancer } from "react-wrap-balancer";
import { getServerAuthSession } from "~/server/auth";
import { SearchForm } from "./_components/search-form";
import ProCard from "~/app/_components/pro-card";

export default async function Home() {
  // const session = await getServerAuthSession();

  return (
    <main>
      <div className="flex min-h-96 py-20 flex-col bg-center justify-center bg-no-repeat bg-cover" style={{backgroundImage: "url('/hero.jpg')"}}>
      <div className="container mt-16 flex flex-col items-center justify-center gap-12 px-4 py-6">
            <h1 className="font-display text-white text-5xl font-extrabold tracking-tight">
              <Balancer>
                Find your Cal.com Expert
              </Balancer>
            </h1>
            <SearchForm />
          </div>
        </div>
        <div className="flex-1">
          
          <div className="flex flex-col items-center justify-center gap-4 mt-24">
          <ProCard/>
          </div>
        </div>
    </main>
  );
};

