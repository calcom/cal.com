import { Logo } from "@calcom/ui/components/logo";
import Loader from "@components/Loader";
import classNames from "classnames";

interface Props {
  footerText?: React.ReactNode | string;
  showLogo?: boolean;
  heading?: string;
  loading?: boolean;
}

export default function AuthContainer(props: React.PropsWithChildren<Props>) {
  return (
    <div className="bg-subtle dark:bg-default flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      {props.showLogo && <Logo small inline={false} className="mx-auto mb-auto" />}

      <div className={classNames(props.showLogo ? "text-center" : "", "sm:mx-auto sm:w-full sm:max-w-md")}>
        {props.heading && <h2 className="font-cal text-emphasis text-center text-3xl">{props.heading}</h2>}
      </div>
      {props.loading && (
        <div className="bg-cal-muted absolute z-50 flex h-screen w-full items-center">
          <Loader />
        </div>
      )}
      <div className="mb-auto mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-default dark:bg-cal-muted border-subtle mx-2 rounded-md border px-4 py-10 sm:px-10">
          {props.children}
        </div>
        <div className="text-default mt-8 text-center text-sm">{props.footerText}</div>
      </div>
    </div>
  );
}
