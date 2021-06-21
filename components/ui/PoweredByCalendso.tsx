import Link from "next/link";

const PoweredByCalendso = (props) => (
  <div className="text-xs text-right pt-1">
    <Link href="https://calendso.com">
      <a
        style={{ color: "#104D86" }}
        className="opacity-50 hover:opacity-100"
      >
        powered by{" "}
        <img
          style={{ top: -2 }}
          className="w-auto inline h-3 relative"
          src="/calendso-logo-word.svg"
          alt="Calendso Logo"
        />
      </a>
    </Link>
  </div>
);

export default PoweredByCalendso;