import NavTabs from "./NavTabs";

export default function BookingsShell(props) {
  const tabs = [
    {
      name: "Upcoming",
      href: "/bookings/upcoming",
    },
    {
      name: "Past",
      href: "/bookings/past",
    },
    {
      name: "Cancelled",
      href: "/bookings/cancelled",
    },
  ];

  return (
    <div>
      <div className="sm:mx-auto">
        <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
        <hr />
      </div>
      <main className="max-w-4xl">{props.children}</main>
    </div>
  );
}
