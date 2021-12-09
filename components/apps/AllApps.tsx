import { getApps } from "../../lib/getApps";
import AppCard from "./AppCard";

export default function AllApps(props: any) {
  const apps = getApps();

  return (
    <div className="mb-16">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">All apps</h2>
      <div className="grid grid-cols-3 gap-3">
        {apps.map((app) => (
          <AppCard
            key={app.name}
            name={app.name}
            description={app.description}
            logo={app.logo}
            rating={app.rating}
            showModalFunction={props.showModalFunction}
            setSelectedAppFunction={props.setSelectedAppFunction}
          />
        ))}
      </div>
    </div>
  );
}
