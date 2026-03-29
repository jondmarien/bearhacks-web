import Link from "next/link";
import { ApiStatus } from "@/components/api-status";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--bearhacks-fg)">BearHacks</h1>
        <p className="mt-1 text-sm text-(--bearhacks-muted)">Participant portal (DEV-18–20).</p>
      </div>
      <nav className="flex flex-col gap-2 text-sm">
        <Link className="inline-flex min-h-(--bearhacks-touch-min) items-center underline" href="/dashboard">
          Dashboard
        </Link>
        <Link className="inline-flex min-h-(--bearhacks-touch-min) items-center underline" href="/contacts/demo-id">
          Sample contact
        </Link>
      </nav>
      <section className="rounded-(--bearhacks-radius-md) border border-(--bearhacks-border) bg-(--bearhacks-bg) p-4">
        <h2 className="text-sm font-medium text-(--bearhacks-fg)">Backend health</h2>
        <div className="mt-2">
          <ApiStatus />
        </div>
      </section>
    </main>
  );
}
