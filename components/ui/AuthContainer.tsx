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
    <div className="flex flex-col justify-center min-h-screen py-12 bg-neutral-50 sm:px-6 lg:px-8">
      <HeadSeo title={props.title} description={props.description} />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {props.showLogo && (
          <img className="h-6 mx-auto" src="/calendso-logo-white-word.svg" alt="Cal.com Logo" />
        )}
        {props.heading && (
          <h2 className="mt-6 text-3xl font-bold text-center font-cal text-neutral-900">{props.heading}</h2>
        )}
      </div>
      {props.loading && (
        <div className="absolute z-50 flex items-center w-full h-screen bg-gray-50">
          <Loader />
        </div>
      )}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-8 mx-2 bg-white border rounded-sm sm:px-10 border-neutral-200">
          {props.children}
        </div>
        <div className="mt-4 text-sm text-center text-neutral-600">{props.footerText}</div>
      </div>
    </div>
  );
}
