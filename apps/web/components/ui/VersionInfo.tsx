import { COMPANY_NAME, CalComVersion } from "@calcom/lib/constants";

export default function VersionInfo() {
  return (
    <small
      style={{
        fontSize: "0.5rem",
      }}
      className="mx-3 mt-1 mb-2 hidden opacity-50 lg:block">
      &copy; {new Date().getFullYear()} {COMPANY_NAME} {CalComVersion}
    </small>
  );
}
