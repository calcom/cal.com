import Link from "next/link";

const PoweredByCal = () => (
  <div className="p-1 text-xs text-center sm:text-right">
    <Link href={`https://yac.com`}>
      <a target="_blank" className="text-gray-500 opacity-50 hover:opacity-100">
        powered by{" "}
        <img
          style={{ top: -2 }}
          className="relative inline w-auto h-3 "
          src="/yac-logo-white-word.svg"
          alt="Yac Logo"
        />
      </a>
    </Link>
  </div>
);

export default PoweredByCal;
