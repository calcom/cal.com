export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  return (
    <h1 className="inline">
      <strong>
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="mx-auto w-9" alt="Cal" title="Cal" src="/cal-com-icon-white.svg" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
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
}
