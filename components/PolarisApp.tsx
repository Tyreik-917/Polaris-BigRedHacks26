"use client";

import { Dashboard } from "@/components/Dashboard";
import { DemoLogin } from "@/components/DemoLogin";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useNessieCustomer } from "@/hooks/useNessieCustomer";
import { DEMO_PERSONA } from "@/lib/demo/persona";
import { Loader2 } from "lucide-react";
import { useGoal } from "@/hooks/useGoal";
import type { Goal } from "@/lib/goals/types";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

type Phase = "login" | "welcome" | "app";

export function PolarisApp() {
  const config = useAppConfig();
  const {
    session,
    hydrated: authHydrated,
    signInDemo,
    signOut,
  } = useAuthSession();
  const {
    customerId,
    hydrated: customerHydrated,
    setCustomerId,
    clearCustomerId,
  } = useNessieCustomer();
  const { setGoal } = useGoal();
  const [phaseOverride, setPhaseOverride] = useState<Phase | null>(null);

  const bootstrapping = !config || !authHydrated || !customerHydrated;

  const defaultPhase = useMemo((): Phase => {
    if (!config?.demoLoginAvailable) return "app";
    if (session || customerId) return "app";
    return "login";
  }, [config?.demoLoginAvailable, session, customerId]);

  const phase = phaseOverride ?? defaultPhase;

  const handleWelcomeDestination = useCallback(
    (goal: Goal) => {
      setGoal(goal);
      toast.success("Destination set — plotting route.");
      setPhaseOverride("app");
    },
    [setGoal],
  );

  const completeDemoLogin = useCallback(
    (payload: {
      customerId: string | null;
      fixtureMode: boolean;
      displayName: string;
    }) => {
      if (payload.customerId) {
        setCustomerId(payload.customerId);
      }
      signInDemo(payload.displayName);
      setPhaseOverride("welcome");
    },
    [setCustomerId, signInDemo],
  );

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (phase === "login") {
    return <DemoLogin onDemoSuccess={completeDemoLogin} />;
  }

  if (phase === "welcome") {
    return (
      <WelcomeScreen
        displayName={session?.displayName ?? DEMO_PERSONA.fullName}
        firstName={DEMO_PERSONA.firstName}
        onDestination={handleWelcomeDestination}
      />
    );
  }

  return (
    <Dashboard
      demoDisplayName={session?.displayName}
      onDemoSignOut={
        config.demoLoginAvailable
          ? () => {
              signOut();
              clearCustomerId();
              setPhaseOverride("login");
            }
          : undefined
      }
    />
  );
}
