export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function demoGuard(): { error: string; status: number } | null {
  if (!isDemoMode()) {
    return { error: "Demo controls disabled.", status: 404 };
  }
  return null;
}
