export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  return (
    <h1 className="inline">
      <strong>
        {icon ? (
          <img
            className="mx-auto w-9"
            alt="Firewood Camps Logo"
            title="Firewood Camps Logo"
            src="https://firewood-misc-storage.s3.amazonaws.com/firewood-camps-twitter-logo.png"
          />
        ) : (
          <img
            className={small ? "mx-auto w-9" : "h-5 w-auto"}
            alt="Firewood Camps Logo"
            title="Firewood Camps Logo"
            src="https://firewood-misc-storage.s3.amazonaws.com/firewood-camps-twitter-logo.png"
          />
        )}
      </strong>
    </h1>
  );
}
