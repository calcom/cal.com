import React from "react";

import Loader from "@components/Loader";
import { HeadSeo } from "@components/seo/head-seo";

interface Props {
  title: string;
  description: string;
  footerText?: React.ReactNode | string;
  showLogo?: boolean;
  heading?: string;
  loading?: boolean;
}

export default function AuthContainer(props: React.PropsWithChildren<Props>) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-neutral-50 py-12 sm:px-6 lg:px-8">
      <HeadSeo title={props.title} description={props.description} />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {props.showLogo && (
          <img className="mx-auto h-6" src="/calendso-logo-white-word.svg" alt="Cal.com Logo" />
        )}
        {props.heading && (
          <h2 className="font-cal mt-6 text-center text-3xl font-bold text-neutral-900">{props.heading}</h2>
        )}
      </div>
      {props.loading && (
        <div className="absolute z-50 flex h-screen w-full items-center bg-gray-50">
          <Loader />
        </div>
      )}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-2 rounded-sm border border-neutral-200 bg-white px-4 py-8 sm:px-10">
          {props.children}
        </div>
        <div className="mt-4 text-center text-sm text-neutral-600">{props.footerText}</div>
      </div>
    </div>
  );
}
