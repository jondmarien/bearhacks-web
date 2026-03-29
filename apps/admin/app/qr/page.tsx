"use client";

import { ApiError } from "@bearhacks/api-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useSupabase } from "@/app/providers";
import { useApiClient } from "@/lib/use-api-client";
import { isStaffUser } from "@/lib/supabase-role";

type QrRow = {
  id?: string;
  claimed?: boolean;
  claimed_by?: string | null;
};

type GeneratedQr = {
  qr_id: string;
  url: string;
  printed: boolean;
  printer_error?: string;
  printer_skipped?: boolean;
};

export default function AdminQrPage() {
  const supabase = useSupabase();
  const client = useApiClient();
  const [user, setUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "claimed" | "unclaimed">("all");
  const [claimedBySearch, setClaimedBySearch] = useState("");
  const [generateCount, setGenerateCount] = useState("5");
  const [generated, setGenerated] = useState<GeneratedQr[]>([]);
  const [generateMode, setGenerateMode] = useState<"print" | "generate">("print");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const isStaff = isStaffUser(user);

  const listPath = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (claimedBySearch.trim()) params.set("claimed_by", claimedBySearch.trim());
    return `/admin/qr/search${params.size ? `?${params.toString()}` : ""}`;
  }, [statusFilter, claimedBySearch]);

  const qrQuery = useQuery({
    queryKey: ["admin-qr-search", statusFilter, claimedBySearch],
    queryFn: () => client!.fetchJson<QrRow[]>(listPath),
    enabled: Boolean(client && isStaff),
  });

  const generateMutation = useMutation({
    mutationFn: async ({ count, print }: { count: number; print: boolean }) =>
      client!.fetchJson<GeneratedQr[]>("/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, print }),
      }),
    onSuccess: (rows, variables) => {
      setGenerated(rows);
      void qrQuery.refetch();
      if (!variables.print) {
        toast.success(`Generated ${rows.length} QR codes without printing.`);
        return;
      }
      const failed = rows.filter((row) => !row.printed && !row.printer_skipped).length;
      if (failed > 0) {
        toast.warning(`Generated ${rows.length} QRs. ${failed} failed to print.`);
      } else {
        toast.success(`Generated and printed ${rows.length} QR codes.`);
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.status === 403 ? "Admin role required" : error.message);
      } else {
        toast.error("Failed to generate QR batch");
      }
    },
  });

  const reprintMutation = useMutation({
    mutationFn: async (qrId: string) =>
      client!.fetchJson<{ printed: boolean; printer_error?: string }>(`/qr/reprint/${qrId}`, {
        method: "POST",
      }),
    onSuccess: (result, qrId) => {
      if (result.printed) {
        toast.success(`Reprinted ${qrId}`);
      } else {
        toast.warning(result.printer_error ?? "Reprint failed");
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.status === 403 ? "Admin role required" : error.message);
      } else {
        toast.error("Failed to reprint QR");
      }
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--bearhacks-fg)">QR Management</h1>
          <p className="text-sm text-(--bearhacks-muted)">
            Generate unclaimed QR batches, search claim status, and reprint labels for jam recovery.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-(--bearhacks-touch-min) items-center justify-center rounded-(--bearhacks-radius-sm) px-3 text-sm underline"
        >
          Admin home
        </Link>
      </header>

      {!isStaff && (
        <section className="rounded-(--bearhacks-radius-md) border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Sign in with an admin account. The API enforces <code className="rounded bg-white/60 px-1">require_admin</code>{" "}
          on all QR actions.
        </section>
      )}

      {isStaff && (
        <>
          <section className="rounded-(--bearhacks-radius-md) border border-(--bearhacks-border) bg-(--bearhacks-bg) p-4">
            <h2 className="text-base font-medium text-(--bearhacks-fg)">Generate batch</h2>
            <form
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                const parsed = Number.parseInt(generateCount, 10);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  toast.error("Enter a positive count");
                  return;
                }
                const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
                const mode = submitter?.dataset.mode === "generate" ? "generate" : "print";
                setGenerateMode(mode);
                generateMutation.mutate({ count: parsed, print: mode === "print" });
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor="generate-count" className="text-sm font-medium text-(--bearhacks-fg)">
                  QR count
                </label>
                <input
                  id="generate-count"
                  name="count"
                  type="number"
                  min={1}
                  max={200}
                  value={generateCount}
                  onChange={(event) => setGenerateCount(event.target.value)}
                  className="min-h-(--bearhacks-touch-min) rounded-(--bearhacks-radius-sm) border border-(--bearhacks-border) px-3 text-base"
                />
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  type="submit"
                  data-mode="generate"
                  disabled={generateMutation.isPending}
                  className="min-h-(--bearhacks-touch-min) min-w-32 cursor-pointer rounded-(--bearhacks-radius-sm) border border-(--bearhacks-border) px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generateMutation.isPending && generateMode === "generate" ? "Generating…" : "Generate"}
                </button>
                <button
                  type="submit"
                  data-mode="print"
                  disabled={generateMutation.isPending}
                  className="min-h-(--bearhacks-touch-min) min-w-40 cursor-pointer rounded-(--bearhacks-radius-sm) bg-(--bearhacks-fg) px-4 text-sm font-medium text-(--bearhacks-bg) disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generateMutation.isPending && generateMode === "print" ? "Generating…" : "Generate + print"}
                </button>
              </div>
            </form>
            {generated.length > 0 && (
              <p className="mt-3 text-sm text-(--bearhacks-muted)">
                Latest batch: {generated.length} created, {generated.filter((row) => row.printed).length} printed.
              </p>
            )}
          </section>

          <section className="rounded-(--bearhacks-radius-md) border border-(--bearhacks-border) bg-(--bearhacks-bg) p-4">
            <h2 className="text-base font-medium text-(--bearhacks-fg)">Search by claim status</h2>
            <form
              className="mt-3 grid gap-3 sm:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                void qrQuery.refetch();
              }}
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="status-filter" className="text-sm font-medium text-(--bearhacks-fg)">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "claimed" | "unclaimed")
                  }
                  className="min-h-(--bearhacks-touch-min) rounded-(--bearhacks-radius-sm) border border-(--bearhacks-border) px-3 text-base"
                >
                  <option value="all">All</option>
                  <option value="claimed">Claimed</option>
                  <option value="unclaimed">Unclaimed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="claimed-by" className="text-sm font-medium text-(--bearhacks-fg)">
                  Claimed by (profile id, optional)
                </label>
                <input
                  id="claimed-by"
                  value={claimedBySearch}
                  onChange={(event) => setClaimedBySearch(event.target.value)}
                  className="min-h-(--bearhacks-touch-min) rounded-(--bearhacks-radius-sm) border border-(--bearhacks-border) px-3 text-base"
                  placeholder="Filter specific claimer id"
                />
              </div>
            </form>

            {qrQuery.isLoading && <p className="mt-3 text-sm text-(--bearhacks-muted)">Loading QR list…</p>}
            {qrQuery.isError && (
              <p className="mt-3 text-sm text-red-700">
                {qrQuery.error instanceof ApiError ? qrQuery.error.message : "Failed to load QR list"}
              </p>
            )}
            {qrQuery.data && (
              <div className="mt-3 overflow-x-auto rounded-(--bearhacks-radius-sm) border border-(--bearhacks-border)">
                <table className="w-full min-w-xl border-collapse text-left text-sm">
                  <thead className="border-b border-(--bearhacks-border) bg-(--bearhacks-border)/20">
                    <tr>
                      <th scope="col" className="px-3 py-3 font-medium">
                        QR id
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium">
                        Claimed by
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {qrQuery.data.map((row) => {
                      const qrId = row.id ?? "unknown";
                      const claimed = Boolean(row.claimed);
                      return (
                        <tr key={qrId} className="border-b border-(--bearhacks-border) last:border-0">
                          <td className="px-3 py-3 font-mono text-xs text-(--bearhacks-muted)">{qrId}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                claimed
                                  ? "bg-(--bearhacks-fg) text-(--bearhacks-bg)"
                                  : "bg-(--bearhacks-border)/40 text-(--bearhacks-muted)"
                              }`}
                            >
                              {claimed ? "Claimed" : "Unclaimed"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-(--bearhacks-muted)">{row.claimed_by ?? "—"}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => reprintMutation.mutate(qrId)}
                              disabled={reprintMutation.isPending}
                              className="min-h-(--bearhacks-touch-min) min-w-(--bearhacks-touch-min) cursor-pointer rounded-(--bearhacks-radius-sm) px-2 text-sm underline disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reprint
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}