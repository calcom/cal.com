import Link from "next/link";

const LINKS = [
  {
    title: "Drop Off",
    href: "/settings/admin/playground/dropoff",
  },
];

export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Playground</h1>

      <ul className="mt-8">
        {LINKS.map((link) => (
          <li key={link.title}>
            <Link href={link.href} className="list-item list-disc font-medium underline">
              {link.title} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
