import { ReactNode } from "react";

export function PageHeading(props: { heading: ReactNode; subtitle: ReactNode; CTA?: ReactNode }) {
  return (
    <div className="block sm:flex justify-between px-4 sm:px-6 md:px-8 min-h-[80px]">
      <div className="mb-8">
        <h1 className="font-cal text-xl font-bold text-gray-900">{props.heading}</h1>
        <p className="text-sm text-neutral-500 mr-4">{props.subtitle}</p>
      </div>
      {props.CTA && <div className="mb-4 flex-shrink-0">{props.CTA}</div>}
    </div>
  );
}
