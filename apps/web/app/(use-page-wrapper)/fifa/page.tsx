import { getFifaCalendarData } from "~/fifa/lib/data";

import FifaCalendarView from "~/fifa/FifaCalendarView";

const ServerPageWrapper = async () => {
  const { tournament, games } = getFifaCalendarData();
  return <FifaCalendarView tournament={tournament} games={games} />;
};

export default ServerPageWrapper;
