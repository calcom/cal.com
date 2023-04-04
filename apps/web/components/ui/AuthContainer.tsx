import classNames from "classnames";

import { APP_NAME, LOGO } from "@calcom/lib/constants";
import { HeadSeo } from "@calcom/ui";

import Loader from "@components/Loader";

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
    <div className="flex min-h-screen flex-col justify-center bg-[#f3f4f6] py-12 sm:px-6 lg:px-8">
      <HeadSeo title={props.title} description={props.description} />
      {props.showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="mb-auto h-4" src={LOGO} alt={`${APP_NAME} Logo`} />
      )}

      <div className={classNames(props.showLogo ? "text-center" : "", "sm:mx-auto sm:w-full sm:max-w-md")}>
        {props.heading && <h2 className="font-cal text-emphasis text-center text-3xl">{props.heading}</h2>}
      </div>
      {props.loading && (
        <div className="bg-muted absolute z-50 flex h-screen w-full items-center">
          <Loader />
        </div>
      )}
      <div className="mb-auto mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-default border-subtle mx-2 rounded-md border px-4 py-10 sm:px-10">
          {props.children}
        </div>
        <div className="text-default mt-8 text-center text-sm">{props.footerText}</div>
      </div>
    </div>
  );
}
