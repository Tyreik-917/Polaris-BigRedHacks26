const STORAGE_KEY = "polaris:authSession";

export type DemoAuthSession = {
  kind: "demo";
  displayName: string;
  signedInAt: string;
};

export type AuthSession = DemoAuthSession;

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.kind !== "demo" || !parsed.displayName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDemoAuthSession(displayName: string): void {
  const session: DemoAuthSession = {
    kind: "demo",
    displayName,
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
