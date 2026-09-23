import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-2 font-serif text-4xl">This page is not in the deck</h1>
        <p className="mt-3 text-sm text-muted">The project or asset you asked for is missing or you do not have access.</p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-semibold underline">
          Back to projects
        </Link>
      </div>
    </main>
  );
}
