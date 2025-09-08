import Link from "next/link";

const LINKS = [
  {
    title: "Routing Funnel",
    href: "/settings/admin/playground/routing-funnel",
  },
  {
    title: "Bookings by Hour",
    href: "/settings/admin/playground/bookings-by-hour",
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
