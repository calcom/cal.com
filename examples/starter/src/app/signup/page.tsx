import { db } from "prisma/client";
import { SignupForm } from "~/app/signup/_components/signup";

export default async function SignupPage() {
  const services = await db.service.findMany();
  const professions = await db.profession.findMany();
  return (
    <div className="flex items-center justify-center p-10">
      <SignupForm services={services} professions={professions}/>
    </div>
  );
}
