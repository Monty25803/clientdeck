import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const users = await prisma.user.count();
  if (users === 0) redirect("/setup");
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect("/dashboard");
}
