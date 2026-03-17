"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/members/dashboard";
  const hasError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  }

  return (
    <>
      <Nav />
      <main className="pt-16 min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-linen">
            <div className="text-center mb-8">
              <div className="text-3xl mb-3">🌿</div>
              <h1 className="font-serif text-2xl text-soil mb-2">
                Member Sign In
              </h1>
              <p className="text-sm text-charcoal/60">
                Enter your email and we'll send you a magic link.
              </p>
            </div>

            {hasError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 text-center">
                Authentication failed. Please try again.
              </div>
            )}

            {submitted ? (
              <div className="text-center space-y-4">
                <div className="bg-moss/10 border border-moss/20 rounded-xl p-4">
                  <p className="text-sm text-moss font-medium mb-1">
                    Check your inbox
                  </p>
                  <p className="text-sm text-charcoal/70">
                    We sent a sign-in link to{" "}
                    <strong>{email}</strong>. Click it to continue.
                  </p>
                </div>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-sm text-charcoal/50 hover:text-clay transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-linen rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send Magic Link"}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-charcoal/40 mt-6">
            New to Hammock Earth?{" "}
            <a href="/members" className="text-clay hover:underline">
              Learn about membership
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MembersLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
