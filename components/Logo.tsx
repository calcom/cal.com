export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  return (
    <h1 className="inline">
      <strong>
        {icon ? (
          <img className="w-9 mx-auto" alt="Cal" title="Cal" src="/cal-com-icon-white.svg" />
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
}
