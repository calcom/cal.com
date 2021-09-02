import Link from "next/link";

const PoweredByCalendso = () => (
  <div className="text-xs text-center sm:text-right p-1">
    <Link href={`https://calendso.com?utm_source=embed&utm_medium=powered-by-button`}>
      <a target="_blank" className="dark:text-white text-gray-500 opacity-50 hover:opacity-100">
        powered by{" "}
        <img
          style={{ top: -2 }}
          className="dark:hidden w-auto inline h-3 relative"
          src="/calendso-logo-word.svg"
          alt="Calendso Logo"
        />
        <img
          style={{ top: -2 }}
          className="hidden dark:inline w-auto h-3 relative"
          src="/calendso-logo-word-dark.svg"
          alt="Calendso Logo"
        />
      </a>
    </Link>
  </div>
);

export default PoweredByCalendso;
