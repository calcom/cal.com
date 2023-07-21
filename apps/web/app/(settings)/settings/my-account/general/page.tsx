import { getGeneralData } from "./_fetchers";

export default async function GeneralPage() {
  const user = await getGeneralData();

  return (
    <div>
      <GeneralForm user={user} />
    </div>
  );
}
