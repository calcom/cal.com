import Link from "next/link";

const PoweredByCalendso = () => (
  <div className="p-1 text-center text-xs sm:text-right">
    <Link href={`https://calendso.com?utm_source=embed&utm_medium=powered-by-button`}>
      <a target="_blank" className="text-gray-500 dark:text-white hover:opacity-100 opacity-50">
        powered by{" "}
        <img
          style={{ top: -2 }}
          className="relative dark:hidden inline w-auto h-3"
          src="/calendso-logo-word.svg"
          alt="Calendso Logo"
        />
        <img
          style={{ top: -2 }}
          className="relative hidden dark:inline w-auto h-3"
          src="/calendso-logo-word-dark.svg"
          alt="Calendso Logo"
        />
      </a>
    </Link>
  </div>
);

export default PoweredByCalendso;
