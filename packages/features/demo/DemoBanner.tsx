import { IS_DEMO } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function DemoBanner() {
  // TODO
  const { t } = useLocale();

  if (!IS_DEMO) return null;

  return (
    <div className="relative isolate z-50 flex items-center gap-x-6 overflow-hidden bg-gray-50 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
      <div
        className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        aria-hidden="true">
        <div
          className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
          style={{
            clipPath:
              "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
          }}
        />
      </div>
      <div
        className="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        aria-hidden="true">
        <div
          className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
          style={{
            clipPath:
              "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm leading-6 text-gray-900">
          <strong className="font-semibold uppercase">Demo</strong>
          <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
            <circle cx={1} cy={1} r={1} />
          </svg>
          Welcome to the Cal.com Demo for Organizations
        </p>
        <div className="flex gap-2">
          <a
            href="https://cal.com/signup"
            className="bg-brand-default text-brand flex-none rounded-full px-3.5 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            Sign up
          </a>
          <a
            href="https://cal.com/signup"
            className="text-brandcontrast flex-none rounded-full bg-white px-3.5 py-1 text-sm hover:shadow-sm  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            Contact Sales
          </a>
        </div>
      </div>
      <div className="flex flex-1 justify-end" />
    </div>
  );
}
