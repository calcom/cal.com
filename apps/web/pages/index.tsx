import { NextPageContext } from "next";
import { useRouter } from "next/router";
import React from "react";

import { getSession } from "@lib/auth";

import { HeadSeo } from "@components/seo/head-seo";

function RedirectPage() {
  const router = useRouter();

  return (
    <div className="bg-sunny-200 flex min-h-screen flex-col justify-center">
      <HeadSeo title="about" description="" />
      <div className="flex items-center justify-between p-2">
        <img
          src="https://mento-space.nyc3.digitaloceanspaces.com/logo.svg"
          alt="logo"
          width="110"
          height="40"
          className="p-4"
        />
        <div>
          <div
            onClick={() => router.push("/auth/login")}
            className="font-basis-mono bg-sage-500 cursor-pointer rounded-md py-4 px-8 text-center text-xs uppercase leading-relaxed tracking-wider text-white transition duration-150 ease-in-out hover:shadow-lg">
            Login
          </div>
        </div>
      </div>

      <div className="flex flex-1 bg-white">
        <div className="flex w-full items-center justify-center lg:w-6/12">
          <div className="flex w-10/12 flex-col items-center md:items-start 2xl:w-full">
            <div className="text-3_5xl md:text-3_75xl 2xl:text-5_5xl lHeader md:text-3_75xl text-softBlack mb-6 text-left  font-bold  lg:mb-8 lg:text-5xl">
              <h1>Coaching and community to grow your career with care</h1>
            </div>
            <div className="text-deepBlue pb-6 text-left sm:mt-3 md:text-sm lg:mt-5 lg:text-lg">
              <p>
                Everyone (yes, everyone!) needs help growing personally and professionally, but it’s hard to
                do on your own. That’s why we created Mento.
              </p>
            </div>
            <div className="flex">
              <a
                href="https://mento.co"
                target="_blank"
                className="font-basis-mono bg-sunny-500 w-full cursor-pointer rounded-md py-4 px-8 text-center text-xs uppercase leading-relaxed tracking-wider text-black transition duration-150 ease-in-out hover:shadow-lg"
                rel="noreferrer">
                Learn more
              </a>
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-center py-6 px-8 md:py-12 md:px-0 lg:w-6/12 lg:pb-0">
          <img
            src="https://mento-space.nyc3.cdn.digitaloceanspaces.com/assets/coaches.png"
            className="mx-auto"
            alt="heroImage"
          />
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { props: {} };
  }

  return { redirect: { permanent: false, destination: "/event-types" } };
}

export default RedirectPage;
