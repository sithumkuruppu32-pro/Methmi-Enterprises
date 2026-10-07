"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, AlertTriangle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not sign in. Please try again.");
        return;
      }

      // Confirm that the browser kept the cookie before opening a protected page.
      const session = await fetch("/api/admin/session", {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!session.ok) {
        setError(session.status === 401
          ? "Your sign-in session could not be saved. Please try again."
          : "Could not verify your sign-in session. Please try again.");
        return;
      }
      const next = searchParams.get("next") || "/admin";
      const safeNext = /^\/admin(?:\/|$|\?)/.test(next) && !next.includes("\\") && !next.startsWith("/admin/login") ? next : "/admin";
      // A full navigation uses the new cookie and avoids stale router/prefetch state.
      window.location.replace(safeNext);
    } catch {
      setError(controller.signal.aborted
        ? "Sign-in took too long. Please check your connection and try again."
        : "Could not connect to the server. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-100 px-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-8 shadow-card">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-ocean-600 text-white">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-center font-display text-xl font-bold text-ink-900">
          Methmi Admin
        </h1>
        <p className="mt-1 text-center text-sm text-ink-700">
          Sign in to manage tours, vehicles, prices, and photos.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/30"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink-800">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={loading}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ocean-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ocean-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
