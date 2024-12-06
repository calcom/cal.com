export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";
