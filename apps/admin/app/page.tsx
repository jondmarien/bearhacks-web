"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSupabase } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createStructuredLogger } from "@/lib/structured-logging";

const log = createStructuredLogger("admin/home-dashboard");

export default function AdminHome() {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const actor = user?.id ?? "anonymous";

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      log("debug", {
        event: "admin_home_session",
        actor: data.session?.user?.id ?? "anonymous",
        resourceId: "/",
        result: "loaded",
      });
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      log("debug", {
        event: "admin_home_session",
        actor: session?.user?.id ?? "anonymous",
        resourceId: "/",
        result: "auth_state_changed",
      });
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Admin"
        subtitle="Tools for the BearHacks 2026 staff team."
        actions={
          user ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (!supabase) return;
                log("info", {
                  event: "admin_home_sign_out",
                  actor,
                  resourceId: "/",
                  result: "submitted",
                });
                void supabase.auth.signOut().catch((error: unknown) => {
                  log("error", {
                    event: "admin_home_sign_out",
                    actor,
                    resourceId: "/",
                    result: "error",
                    error,
                  });
                  toast.error("Unable to sign out");
                });
              }}
            >
              Sign out
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/qr" className="no-underline">
          <Card className="h-full transition-shadow hover:shadow-lg">
            <CardTitle>QR fulfillment</CardTitle>
            <CardDescription className="mt-1">
              Generate, search, reprint, and inspect attendee QR codes.
            </CardDescription>
            <span className="mt-4 inline-flex text-sm font-medium text-(--bearhacks-primary)">
              Open QR tools →
            </span>
          </Card>
        </Link>
        <Link href="/profiles" className="no-underline">
          <Card className="h-full transition-shadow hover:shadow-lg">
            <CardTitle>Profile directory</CardTitle>
            <CardDescription className="mt-1">
              Search and edit attendee profiles (super-admin only).
            </CardDescription>
            <span className="mt-4 inline-flex text-sm font-medium text-(--bearhacks-primary)">
              Open profiles →
            </span>
          </Card>
        </Link>
      </div>
    </main>
  );
}
