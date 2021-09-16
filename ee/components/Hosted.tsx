// DRAFT: show <Hosted>{children}</Hosted> only on the hosted plan of Cal.com
export default function Hosted({ children, pro }: { children: JSX.Element; pro?: boolean }) {
  console.log("is Pro: " + pro); // likely use getServerSideProps and user.plan !== "PRO"
  return process.env.BASE_URL === "https://app.cal.com" ? children : null;
}
