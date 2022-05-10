export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  /* eslint-disable @next/next/no-img-element */
  return (
    <h1 className="inline">
      <strong>
        {icon ? (
          <img className="mx-auto w-9" alt="Cal" title="Cal" src="/cal-com-icon-white.svg" />
        ) : (
          <img
            className={small ? "h-4 w-auto" : "h-5 w-auto"}
            alt="Cal"
            title="Cal"
            src="/calendso-logo-white-word.svg"
          />
        )}
      </strong>
    </h1>
  );
  /* eslint-enable @next/next/no-img-element */
}
