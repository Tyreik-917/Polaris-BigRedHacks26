"use client";

import { PhoneFrame } from "@/components/PhoneFrame";
import { PageTransition } from "@/components/PageTransition";
import { useDemoLogin } from "@/lib/api";
import { setStoredCustomerId } from "@/lib/client/nessie-customer";
import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LOGIN_STARS: { x: number; y: number; r: number; o: number }[] = [
  { x: 8, y: 12, r: 1.2, o: 0.35 },
  { x: 22, y: 28, r: 1, o: 0.25 },
  { x: 78, y: 8, r: 1.3, o: 0.3 },
  { x: 92, y: 22, r: 1, o: 0.2 },
  { x: 15, y: 55, r: 1.1, o: 0.28 },
  { x: 85, y: 48, r: 1.2, o: 0.22 },
  { x: 45, y: 18, r: 1, o: 0.18 },
  { x: 62, y: 72, r: 1.3, o: 0.32 },
  { x: 30, y: 82, r: 1, o: 0.24 },
  { x: 88, y: 88, r: 1.1, o: 0.26 },
  { x: 5, y: 78, r: 1, o: 0.2 },
  { x: 52, y: 42, r: 0.9, o: 0.15 },
  { x: 70, y: 35, r: 1, o: 0.2 },
  { x: 38, y: 65, r: 1.2, o: 0.22 },
];

export function LoginScreen() {
  const router = useRouter();
  const demo = useDemoLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const goDemo = () => {
    demo.mutate(undefined, {
      onSuccess: (data) => {
        if (data.customerId) setStoredCustomerId(data.customerId);
        router.push("/destination");
      },
    });
  };

  return (
    <PhoneFrame>
      <PageTransition>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            aria-hidden
          >
            <svg
              className="h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {LOGIN_STARS.map((d, i) => (
                <circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  fill="#F5C451"
                  opacity={d.o}
                />
              ))}
            </svg>
            <div className="absolute inset-0 bg-gradient-to-b from-night/20 via-transparent to-night/60" />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center px-6 py-12 sm:px-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-panel/90 shadow-[0_0_40px_rgba(245,196,81,0.12)]">
                <Star
                  className="h-10 w-10 fill-star text-star"
                  aria-hidden
                />
              </div>
              <h1 className="font-heading mt-6 text-[44px] font-bold leading-none tracking-tight text-ink">
                Polaris
              </h1>
              <p className="mt-3 max-w-[280px] text-[16px] leading-relaxed text-muted">
                A GPS for your money.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-sm">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  goDemo();
                }}
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-[13px] font-medium text-muted"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                    className="h-[52px] w-full rounded-xl border border-border bg-panel px-4 text-[15px] text-ink placeholder:text-muted/60 focus:border-star focus:outline-none focus:ring-2 focus:ring-star/25"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-[13px] font-medium text-muted"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-[52px] w-full rounded-xl border border-border bg-panel px-4 text-[15px] text-ink placeholder:text-muted/60 focus:border-star focus:outline-none focus:ring-2 focus:ring-star/25"
                  />
                </div>
                <button
                  type="submit"
                  className="h-[52px] w-full rounded-xl bg-star text-[16px] font-semibold text-star-ink transition-opacity hover:opacity-95"
                >
                  Log in
                </button>
                <p className="text-center text-[14px] text-muted">
                  New here?{" "}
                  <Link
                    href="/destination"
                    className="font-medium text-star underline-offset-2 hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              </form>

              <div className="my-5 flex items-center gap-3 text-[13px] text-muted">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                disabled={demo.isPending}
                onClick={goDemo}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-star/80 bg-star/5 text-[15px] font-medium text-star transition-colors hover:bg-star/10 disabled:opacity-60"
              >
                {demo.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Connecting…
                  </>
                ) : (
                  "Continue as Maya (demo)"
                )}
              </button>
            </div>

            <p className="mt-8 text-center text-[12px] leading-relaxed text-muted">
              Demo data from the Capital One Nessie sandbox.
            </p>
          </div>
        </div>
      </PageTransition>
    </PhoneFrame>
  );
}
