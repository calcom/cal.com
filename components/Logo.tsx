export default function Logo({ small }: { small?: boolean }) {
  return (
    <h1 className="inline brand-logo">
      <strong>
        <img
          className={small ? "h-4 w-auto dark:hidden" : "h-5 w-auto dark:hidden"}
          alt="Cal"
          title="Cal"
          src="/calendso-logo-white-word.svg"
        />
        <img
          className={small ? "h-4 w-auto hidden dark:inline" : "h-5 w-auto hidden dark:inline"}
          alt="Cal"
          title="Cal"
          src="/calendso-logo-word-dark.svg"
        />
      </strong>
    </h1>
  );
}
