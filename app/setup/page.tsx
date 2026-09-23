import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "@/components/setup-form";
import { BrandMark } from "@/components/brand-mark";

export default async function SetupPage() {
  const users = await prisma.user.count();
  if (users > 0) redirect("/login");

  return (
    <main className="surface-grid flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-rule bg-white/80 p-8 shadow-card">
        <BrandMark showWordmark />
        <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted">First run</p>
        <h1 className="mt-2 font-serif text-4xl">Open your studio</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          ClientDeck is single-tenant per instance. This first account becomes the agency admin.
        </p>
        <div className="mt-8">
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
