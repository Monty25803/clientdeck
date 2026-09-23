import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/brand-mark";

export default async function LoginPage() {
  const users = await prisma.user.count();
  if (users === 0) redirect("/setup");
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="surface-grid flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-rule bg-white/80 p-8 shadow-card">
        <BrandMark showWordmark />
        <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted">Studio portal</p>
        <h1 className="mt-2 font-serif text-4xl">Welcome back</h1>
        <p className="mt-3 text-sm text-muted">Sign in to deliver work or approve a milestone.</p>
        <div className="mt-8">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
