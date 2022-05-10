import Image from "next/image";

export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  return (
    <h1 className="inline">
      <strong>
        {icon ? (
          <Image width={36} height={36} alt="Cal" title="Cal" src="/cal-com-icon-white.svg" layout="fixed" />
        ) : (
          <Image
            className={small ? "h-4 w-auto" : "h-5 w-auto"}
            alt="Cal"
            title="Cal"
            width={74}
            height={16}
            layout="fixed"
            src="/calendso-logo-white-word.svg"
          />
        )}
      </strong>
    </h1>
  );
}
