"use client";

import { AccountSetup } from "@/components/AccountSetup";
import { ConstellationView } from "@/components/ConstellationView";
import { StarRouteMap } from "@/components/StarRouteMap";
import { DirectionsPanel } from "@/components/DirectionsPanel";
import { NextMoveCard } from "@/components/NextMoveCard";
import { RecoveryPlanCard } from "@/components/RecoveryPlanCard";
import { TripStatusBar } from "@/components/TripStatusBar";
import { EtaCard } from "@/components/EtaCard";
import { FinancialCheckInCard } from "@/components/FinancialCheckInCard";
import { NewPurchaseDetectedCard } from "@/components/NewPurchaseDetectedCard";
import { GoalInput } from "@/components/GoalInput";
import { ImaginePostcard } from "@/components/ImaginePostcard";
import { P2pRequestButton } from "@/components/P2pRequestButton";
import { UserReportedSpendingCard } from "@/components/UserReportedSpendingCard";
import { ChatHistoryPanel } from "@/components/ChatHistoryPanel";
import { VoiceNavigator } from "@/components/VoiceNavigator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import { useGoal } from "@/hooks/useGoal";
import { useNessieCustomer } from "@/hooks/useNessieCustomer";
import { usePurchaseWatch } from "@/hooks/usePurchaseWatch";
import { useP2pRequests } from "@/hooks/useP2pRequests";
import { useUserReportedSpending } from "@/hooks/useUserReportedSpending";
import { readApiError } from "@/lib/api/read-error";
import { polarisFetch } from "@/lib/api/client-fetch";
import type { NextMove } from "@/lib/advice/next-move";
import type { RecoveryPlan } from "@/lib/advice/recovery-plan";
import type { TipCandidate } from "@/lib/advice/rules";
import type { Goal } from "@/lib/goals/types";
import type {
  FinancialSnapshot,
  NormalizedPurchase,
} from "@/lib/nessie/types";
import { formatPurchaseDetectionLine } from "@/lib/nessie/purchase-detection";
import type { ProjectionResult } from "@/lib/projection/engine";
import { newChatMessage } from "@/lib/chat/types";
import { formatRerouteEtaChange } from "@/lib/projection/eta-copy";
import {
  p2pActionFromReceivableTip,
  primaryP2pAction,
  type P2pAction,
} from "@/lib/p2p/actions";
import {
  applyP2pCollectionsToSnapshot,
  collectedReceivableKeys,
} from "@/lib/p2p/apply";
import { receivableKey } from "@/lib/p2p/types";
import { applyUserReportsToSnapshot } from "@/lib/user-reports/apply";
import type { UserReportedSpend } from "@/lib/user-reports/types";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type DashboardProps = {
  demoDisplayName?: string;
  onDemoSignOut?: () => void;
};

export function Dashboard({ demoDisplayName, onDemoSignOut }: DashboardProps) {
  const appConfig = useAppConfig();
  const { customerId, hydrated: customerHydrated, hasCustomerId } =
    useNessieCustomer();
  const { goal, hydrated: goalHydrated, setGoal, updateGoal, clearGoal } =
    useGoal();
  const chat = useChatHistory(goal);
  const {
    snapshot,
    sync,
    syncSilent,
    loading: syncLoading,
    error: syncError,
  } = useFinancialSnapshot();
  const {
    reports: userReports,
    addReport,
    removeReport,
    pruneSyncedWithNessie,
    pendingForSnapshot,
  } = useUserReportedSpending(customerId);
  const {
    records: p2pRecords,
    upsertPending: upsertP2pRequest,
    markPaid: markP2pPaid,
    syncWithSnapshot: syncP2pWithNessie,
  } = useP2pRequests(customerId);

  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [tips, setTips] = useState<TipCandidate[]>([]);
  const [narration, setNarration] = useState("");
  const [nextMoves, setNextMoves] = useState<NextMove[]>([]);
  const [nextMoveIndex, setNextMoveIndex] = useState(0);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [recoveryAfterReroute, setRecoveryAfterReroute] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [p2pBusy, setP2pBusy] = useState(false);
  const [imaginePending, setImaginePending] = useState(false);
  const [detectedPurchase, setDetectedPurchase] =
    useState<NormalizedPurchase | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [previousProjection, setPreviousProjection] =
    useState<ProjectionResult | null>(null);
  const pipelineGen = useRef(0);
  const rerouteNextRef = useRef(false);
  const projectionRef = useRef<ProjectionResult | null>(null);
  const imagineAttemptLabel = useRef<string | null>(null);

  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);

  useEffect(() => {
    if (!previousProjection) return;
    const id = window.setTimeout(() => setPreviousProjection(null), 12_000);
    return () => window.clearTimeout(id);
  }, [previousProjection, projection?.etaDate]);

  const fetchDestinationPostcard = useCallback(
    async (label: string) => {
      setImaginePending(true);
      try {
        const imagineRes = await polarisFetch("/api/imagine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label }),
        });
        if (imagineRes.ok) {
          const img = (await imagineRes.json()) as { url?: string | null };
          if (img.url) updateGoal({ imagineUrl: img.url });
        }
      } finally {
        setImaginePending(false);
      }
    },
    [updateGoal],
  );

  const canSync =
    appConfig?.fixtureMode ||
    appConfig?.hasServerDefaultCustomer ||
    hasCustomerId;

  const pendingUserReports = useMemo(
    () => (snapshot ? pendingForSnapshot(snapshot) : userReports),
    [snapshot, pendingForSnapshot, userReports],
  );

  const routeSnapshot = useMemo(() => {
    if (!snapshot) return null;
    let snap = applyUserReportsToSnapshot(snapshot, pendingUserReports);
    snap = applyP2pCollectionsToSnapshot(snap, p2pRecords);
    return snap;
  }, [snapshot, pendingUserReports, p2pRecords]);

  const p2pCollectedKeys = useMemo(
    () => collectedReceivableKeys(p2pRecords, snapshot),
    [p2pRecords, snapshot],
  );

  const primaryP2p = useMemo(
    () =>
      snapshot && goal
        ? primaryP2pAction(routeSnapshot ?? snapshot, tips, p2pRecords)
        : null,
    [snapshot, routeSnapshot, goal, tips, p2pRecords],
  );

  const nextMoveP2p = useMemo((): P2pAction | null => {
    if (!snapshot) return null;
    const move = nextMoves[nextMoveIndex];
    if (!move) return null;
    const tip = tips.find((t) => t.id === move.tipId);
    if (!tip) return null;
    return p2pActionFromReceivableTip(tip, p2pRecords, snapshot);
  }, [snapshot, nextMoves, nextMoveIndex, tips, p2pRecords]);

  const showSimulateP2pPaid = Boolean(
    appConfig?.fixtureMode || appConfig?.demoLoginAvailable,
  );

  const receivableHintsForMap = useMemo(() => {
    if (!snapshot) return [];
    const hints = [...snapshot.receivables];
    for (const r of p2pRecords) {
      if (!hints.some((h) => receivableKey(h.name, h.amount) === r.key)) {
        hints.push({
          name: r.counterpartyName,
          amount: r.amount,
          note: r.note ?? "P2P request",
        });
      }
    }
    return hints;
  }, [snapshot, p2pRecords]);

  const beginReroute = useCallback(() => {
    rerouteNextRef.current = true;
    setRerouting(true);
    toast("Rerouting…", { description: "Refreshing Nessie data and ETA." });
  }, []);

  const sendP2pRequest = useCallback(
    async (action: P2pAction) => {
      if (!canSync) {
        toast.error("Link your Nessie customer ID first.");
        return;
      }
      setP2pBusy(true);
      try {
        const res = await polarisFetch("/api/transfers/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            counterpartyName: action.counterpartyName,
            amount: action.amount,
            note: action.note,
          }),
        });
        if (!res.ok) {
          toast.error(await readApiError(res));
          return;
        }
        const data = (await res.json()) as { transferId?: string };
        upsertP2pRequest({
          counterpartyName: action.counterpartyName,
          amount: action.amount,
          note: action.note,
          nessieTransferId: data.transferId,
        });
        toast.success(`Request sent to ${action.counterpartyName}`, {
          description: `$${action.amount} pending on Nessie P2P transfers.`,
        });
        beginReroute();
        await sync();
      } finally {
        setP2pBusy(false);
      }
    },
    [beginReroute, canSync, sync, upsertP2pRequest],
  );

  const simulateP2pPaid = useCallback(
    (action: P2pAction) => {
      markP2pPaid(action.key);
      rerouteNextRef.current = true;
      setRerouting(true);
      toast.success(`${action.counterpartyName} paid you $${action.amount}`, {
        description: "ETA and your star route are updating.",
      });
    },
    [markP2pPaid],
  );

  const recordRouteUpdateRef = useRef(chat.recordRouteUpdate);
  recordRouteUpdateRef.current = chat.recordRouteUpdate;

  const runPipeline = useCallback(async (g: Goal, snap: FinancialSnapshot) => {
    const isReroute = rerouteNextRef.current;
    rerouteNextRef.current = false;
    const prior = isReroute ? projectionRef.current : null;
    if (isReroute && prior) {
      setPreviousProjection(prior);
    } else if (!isReroute) {
      setPreviousProjection(null);
    }
    if (isReroute) {
      setRerouting(true);
      setRecoveryAfterReroute(true);
    } else {
      setRecoveryAfterReroute(false);
    }

    const gen = ++pipelineGen.current;
    const projRes = await polarisFetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: g, snapshot: snap }),
    });
    if (!projRes.ok) {
      toast.error(await readApiError(projRes));
      if (isReroute) setRerouting(false);
      return;
    }
    const projData = (await projRes.json()) as { projection: ProjectionResult };
    if (gen !== pipelineGen.current) return;
    setProjection(projData.projection);
    if (
      isReroute &&
      prior &&
      prior.etaDate?.slice(0, 10) === projData.projection.etaDate?.slice(0, 10)
    ) {
      setPreviousProjection(null);
    }

    setNavLoading(true);
    const navRes = await polarisFetch("/api/navigate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: g, snapshot: snap }),
    });
    setNavLoading(false);
    if (gen !== pipelineGen.current) return;
    if (isReroute) setRerouting(false);
    if (navRes.ok) {
      const nav = (await navRes.json()) as {
        lines: string[];
        tips: TipCandidate[];
        narration: string;
        nextMoves?: NextMove[];
        recoveryPlan?: RecoveryPlan | null;
      };
      setLines(nav.lines);
      setTips(nav.tips);
      setNarration(nav.narration);
      setNextMoves(nav.nextMoves ?? []);
      setNextMoveIndex(0);
      setRecoveryPlan(nav.recoveryPlan ?? null);
      const rerouteNote =
        isReroute && prior
          ? formatRerouteEtaChange(prior.etaDate, projData.projection.etaDate)
          : null;
      recordRouteUpdateRef.current({
        narration: nav.narration,
        lines: nav.lines,
        rerouteNote,
      });
    } else {
      toast.error(await readApiError(navRes));
    }
  }, []);

  const handleGoal = useCallback(
    async (g: Goal) => {
      if (!canSync) {
        toast.error("Link your Nessie customer ID first.");
        return;
      }
      setGoal(g);
      toast.success("Destination set — plotting route.");
      imagineAttemptLabel.current = g.label;
      void fetchDestinationPostcard(g.label);
      const snap = snapshot ?? (await sync());
      if (snap) {
        let route = applyUserReportsToSnapshot(
          snap,
          pendingForSnapshot(snap),
        );
        route = applyP2pCollectionsToSnapshot(route, p2pRecords);
        await runPipeline(g, route);
      }
    },
    [
      canSync,
      fetchDestinationPostcard,
      pendingForSnapshot,
      p2pRecords,
      runPipeline,
      setGoal,
      snapshot,
      sync,
    ],
  );

  const reroute = useCallback(async () => {
    if (!canSync) return;
    beginReroute();
    await sync();
  }, [beginReroute, canSync, sync]);

  const handleUserReport = useCallback(
    (report: UserReportedSpend) => {
      addReport(report);
      rerouteNextRef.current = true;
      setRerouting(true);
      toast.success("Added to your route", {
        description: `${report.description} · $${report.amount}`,
      });
    },
    [addReport],
  );

  useEffect(() => {
    if (!goalHydrated || !customerHydrated || !canSync) return;
    void sync();
  }, [goalHydrated, customerHydrated, canSync, sync]);

  useEffect(() => {
    if (snapshot) pruneSyncedWithNessie(snapshot);
  }, [snapshot, pruneSyncedWithNessie]);

  useEffect(() => {
    if (snapshot) syncP2pWithNessie(snapshot);
  }, [snapshot, syncP2pWithNessie]);

  useEffect(() => {
    if (goal && routeSnapshot) void runPipeline(goal, routeSnapshot);
  }, [goal, routeSnapshot, runPipeline]);

  const handlePurchaseDetected = useCallback(
    (purchase: NormalizedPurchase) => {
      setDetectedPurchase(purchase);
      beginReroute();
      toast(formatPurchaseDetectionLine(purchase), {
        description: "Rerouting from your latest Nessie activity.",
      });
    },
    [beginReroute],
  );

  usePurchaseWatch({
    goal,
    enabled: Boolean(goal && canSync && customerHydrated),
    customerId,
    snapshot,
    syncSilent,
    onDetected: handlePurchaseDetected,
  });

  useEffect(() => {
    if (!goal) {
      imagineAttemptLabel.current = null;
      return;
    }
    if (goal.imagineUrl) return;
    if (imagineAttemptLabel.current === goal.label) return;
    imagineAttemptLabel.current = goal.label;
    void fetchDestinationPostcard(goal.label);
  }, [goal, fetchDestinationPostcard]);

  const handleChatSend = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || !goal || !routeSnapshot || !projection) return;
      const userMsg = newChatMessage("user", question, "chat");
      chat.appendMessage("user", question, "chat");
      const historyForApi = [...chat.messages, userMsg];
      setChatLoading(true);
      try {
        const res = await polarisFetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            goal,
            snapshot: routeSnapshot,
            projection,
            directionLines: lines,
            history: historyForApi,
          }),
        });
        if (!res.ok) {
          toast.error(await readApiError(res));
          return;
        }
        const data = (await res.json()) as { reply?: string };
        if (data.reply) {
          chat.appendMessage("assistant", data.reply, "chat");
        }
      } finally {
        setChatLoading(false);
      }
    },
    [chat, goal, lines, projection, routeSnapshot],
  );

  const progress = projection?.progressPercent ?? 0;
  const ready = goalHydrated && customerHydrated;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-3 text-center">
        <div className="flex justify-center">
          <AccountSetup
            hasServerDefault={Boolean(appConfig?.hasServerDefaultCustomer)}
            onLinked={() => void sync()}
            required={ready && !canSync}
          />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400/80">
          Navigation for your finances
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">
          Polaris
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-400">
          Ancient sailors navigated by the stars — Polaris navigates by yours.
        </p>
        {demoDisplayName && (
          <p className="text-sm text-sky-300/90">
            Signed in as {demoDisplayName}
            {onDemoSignOut && (
              <>
                {" · "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-sky-200"
                  onClick={onDemoSignOut}
                >
                  Sign out
                </button>
              </>
            )}
          </p>
        )}
        {appConfig?.fixtureMode && (
          <p className="text-xs text-amber-400/90">Demo data mode (fixture)</p>
        )}
        {customerId && (
          <p className="font-mono text-xs text-slate-600">
            Customer ···{customerId.slice(-6)}
          </p>
        )}
      </header>

      {syncError && (
        <Alert variant="destructive" className="border-red-900/50 bg-red-950/20">
          <AlertTitle>Could not sync accounts</AlertTitle>
          <AlertDescription>{syncError}</AlertDescription>
        </Alert>
      )}

      {!canSync && ready && (
        <AccountSetup
          hasServerDefault={false}
          onLinked={() => void sync()}
          required
        />
      )}

      {goal && (
        <TripStatusBar
          projection={projection}
          previousProjection={previousProjection}
          goalLabel={goal.label}
          loading={syncLoading || navLoading}
          rerouting={rerouting}
        />
      )}

      {goal && detectedPurchase && (
        <NewPurchaseDetectedCard
          purchase={detectedPurchase}
          rerouting={rerouting || syncLoading || navLoading}
          onDismiss={() => setDetectedPurchase(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {goal && (
            <StarRouteMap
              goal={goal}
              seriesStartDate={projection?.dailySeries[0]?.date}
              snapshot={routeSnapshot ?? snapshot}
              projection={projection}
              previousProjection={previousProjection}
              rerouting={rerouting}
              imagineUrl={goal.imagineUrl}
              imaginePending={imaginePending && !goal.imagineUrl}
              collectedReceivableKeys={p2pCollectedKeys}
              receivableHints={receivableHintsForMap}
            />
          )}
          {goal && chat.hydrated && (
            <ChatHistoryPanel
              messages={chat.messages}
              onSend={handleChatSend}
              loading={chatLoading}
              disabled={!projection || syncLoading || navLoading}
              onClear={chat.clearHistory}
            />
          )}
          <ConstellationView progressPercent={progress} />
          {!goal ? (
            <GoalInput
              onSubmit={(g) => void handleGoal(g)}
              disabled={syncLoading || !canSync}
            />
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
              <p className="font-medium text-slate-100">{goal.label}</p>
              <p>
                ${goal.targetAmount} by {goal.targetDate}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-700"
                  onClick={() => void reroute()}
                  disabled={syncLoading || !canSync}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Reroute
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearGoal();
                    chat.clearHistory();
                    imagineAttemptLabel.current = null;
                    setDetectedPurchase(null);
                    setProjection(null);
                    setPreviousProjection(null);
                    setRerouting(false);
                    rerouteNextRef.current = false;
                    setLines([]);
                    setNextMoves([]);
                    setNextMoveIndex(0);
                    setRecoveryPlan(null);
                    setRecoveryAfterReroute(false);
                    pipelineGen.current += 1;
                  }}
                >
                  New destination
                </Button>
              </div>
            </div>
          )}
          <VoiceNavigator
            mode="set_goal"
            onGoalHeard={(g) => void handleGoal(g)}
            disabled={syncLoading || !canSync}
          />
        </div>

        <div className="space-y-4">
          {canSync && (
            <FinancialCheckInCard
              snapshot={snapshot}
              loading={syncLoading}
              error={syncError}
              goalTargetDate={goal?.targetDate}
              contextLine={
                pendingUserReports.length > 0
                  ? `${pendingUserReports.length} reported purchase${pendingUserReports.length === 1 ? "" : "s"} folded into your route below — Nessie totals above stay as synced.`
                  : undefined
              }
            />
          )}
          {canSync && goal && primaryP2p && (
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/15 p-4">
              <p className="mb-2 text-sm font-medium text-emerald-100/95">
                One-tap P2P request
              </p>
              <P2pRequestButton
                action={primaryP2p}
                busy={p2pBusy}
                showSimulatePaid={showSimulateP2pPaid}
                onRequest={() => void sendP2pRequest(primaryP2p)}
                onSimulatePaid={() => simulateP2pPaid(primaryP2p)}
              />
            </div>
          )}
          {canSync && goal && (
            <UserReportedSpendingCard
              reports={pendingUserReports}
              disabled={syncLoading || !canSync}
              onReportAdded={handleUserReport}
              onRemove={removeReport}
            />
          )}
          <EtaCard
            projection={projection}
            previousProjection={previousProjection}
            rerouting={rerouting}
            goalLabel={goal?.label}
          />
          {goal && recoveryPlan && (
            <RecoveryPlanCard
              plan={recoveryPlan}
              afterReroute={recoveryAfterReroute}
              loading={navLoading}
            />
          )}
          {goal && (
            <NextMoveCard
              moves={nextMoves}
              index={nextMoveIndex}
              onIndexChange={setNextMoveIndex}
              loading={navLoading}
              p2pAction={nextMoveP2p}
              p2pBusy={p2pBusy}
              showSimulateP2pPaid={showSimulateP2pPaid}
              onP2pRequest={
                nextMoveP2p
                  ? () => void sendP2pRequest(nextMoveP2p)
                  : undefined
              }
              onP2pSimulatePaid={
                nextMoveP2p
                  ? () => simulateP2pPaid(nextMoveP2p)
                  : undefined
              }
            />
          )}
          {goal && (
            <ImaginePostcard
              label={goal.label}
              imageUrl={goal.imagineUrl}
              progressPercent={progress}
              pending={imaginePending && !goal.imagineUrl}
            />
          )}
          <DirectionsPanel lines={lines} tips={tips} loading={navLoading} />
          {narration && goal && (
            <VoiceNavigator
              mode="read_directions"
              narration={narration}
              disabled={navLoading}
            />
          )}
        </div>
      </div>

      <footer className="border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500">
        Projection math runs on our servers; Grok narrates your numbers without
        changing them. Goals, reported spending, and customer ID stay in your
        browser.
      </footer>
    </div>
  );
}
