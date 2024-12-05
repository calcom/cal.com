interface DomainWideDelegation {
  id: string;
  workspacePlatform: {
    slug: string;
  };
}

interface User {
  email: string;
  id: number;
}

export async function checkIfSuccessfullyConfiguredInWorkspace({
  domainWideDelegation,
  user,
}: {
  domainWideDelegation: DomainWideDelegation;
  user: User;
}) {
  if (domainWideDelegation.workspacePlatform.slug === "google") {
    const googleCalendar = await getCalendar(
      buildDomainWideDelegationCalendarCredential({ domainWideDelegation, user })
    );
    if (!googleCalendar) {
      throw new Error("Google Calendar App not found");
    }
    return await googleCalendar?.testDomainWideDelegationSetup?.();
  }
  return false;
}
