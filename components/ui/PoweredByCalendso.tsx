import Link from "next/link";

const PoweredByCalendso = () => (
  <div className="p-1 text-xs text-center sm:text-right">
    <Link href={`https://yac.com`}>
      <a target="_blank" className="text-gray-500 opacity-50 hover:opacity-100">
        powered by{" "}
        <img
          style={{ top: -2 }}
          className="relative inline w-auto h-3 "
          src="/calendso-logo-white-word.svg"
          alt="Calendso Logo"
        />
        <img
          style={{ top: -2 }}
          className="relative hidden w-auto h-3"
          src="/calendso-logo-white-word-dark.svg"
          alt="Calendso Logo"
        />
      </a>
    </Link>
  </div>
);

export default PoweredByCalendso;
