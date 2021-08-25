export default function Logo({ small }: { small?: boolean }) {
  return (
    <h1 className="inline brand-logo">
      <strong>
        <img
          className={small ? "h-4 w-auto" : "h-5 w-auto"}
          alt="Genda"
          title="Genda"
          src="/genda-logo-white-word.svg"
        />
      </strong>
    </h1>
  );
}
