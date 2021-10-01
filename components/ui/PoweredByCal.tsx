import Link from "next/link";

const PoweredByCal = () => (
  <div className="p-1 text-xs text-center sm:text-right">
    <Link href={`cal.com?utm_source=embed&utm_medium=powered-by-button`}>
      <a target="_blank" className="text-gray-500 opacity-50 hover:opacity-100">
        powered by{" "}
        <img
          className="w-auto inline h-[10px] relative -mt-px"
          src="https://cal.com/logo.svg"
          alt="Cal.com Logo"
        />
      </a>
    </Link>
  </div>
);

export default PoweredByCal;
