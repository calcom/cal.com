import Link from "next/link";

const PoweredByCalendso = () => (
  <div className="p-1 text-xs text-center sm:text-right">
    <Link href={`https://a.genda.me?utm_source=embed&utm_medium=powered-by-button`}>
      <a target="_blank" className="text-gray-500 opacity-50 dark:text-white hover:opacity-100">
        powered by{" "}
        <img
          style={{ top: -2 }}
          className="relative inline w-auto h-3 dark:hidden"
          src="/genda-logo-word.svg"
          alt="Genda Logo"
        />
        <img
          style={{ top: -2 }}
          className="relative hidden w-auto h-3 dark:inline"
          src="/genda-logo-word-dark.svg"
          alt="Genda Logo"
        />
      </a>
    </Link>
  </div>
);

export default PoweredByCalendso;
