"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Sign in failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      const role = json.role ?? "viewer";
      if (role === "admin") {
        router.replace(searchParams.get("redirect") || "/dashboard");
      } else {
        router.replace(searchParams.get("redirect") || "/raffle");
      }
      router.refresh();
    } catch {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface via-surface-container-low to-surface-dim px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-ambient mb-4">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-headline-md text-on-surface">RaffleAdmin</h1>
          <p className="text-body-md text-on-surface-variant">Raffle Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface p-8 space-y-5">
          <div>
            <label className="label-uppercase block mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
            />
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-body-md text-error bg-error-container/50 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-body-md text-on-surface-variant mt-6">
          Access is restricted to authorized raffle administrators and live raffle users.
        </p>
      </div>
    </div>
  );
}
