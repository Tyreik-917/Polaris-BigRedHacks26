const DEFAULT_CUSTOMER_ID_PATTERN =
  /^([a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export type ServerConfig = {
  nessieApiKey: string | null;
  defaultCustomerId: string | null;
  xaiApiKey: string | null;
  useFixture: boolean;
  demoMode: boolean;
  isProduction: boolean;
};

/** Hackathon demo login — seeded Nessie customer or fixture mode. */
export function isDemoLoginAvailable(cfg: ServerConfig = getServerConfig()): boolean {
  if (cfg.useFixture) return true;
  const id = cfg.defaultCustomerId;
  return Boolean(id && DEFAULT_CUSTOMER_ID_PATTERN.test(id));
}

export function getServerConfig(): ServerConfig {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    nessieApiKey: process.env.NESSIE_API_KEY?.trim() || null,
    defaultCustomerId: process.env.NESSIE_CUSTOMER_ID?.trim() || null,
    xaiApiKey: process.env.XAI_API_KEY?.trim() || null,
    useFixture: process.env.POLARIS_USE_FIXTURE === "true",
    demoMode: process.env.DEMO_MODE === "true",
    isProduction,
  };
}

export function assertNessieConfigured(): void {
  const { nessieApiKey, useFixture, isProduction } = getServerConfig();
  if (useFixture) return;
  if (!nessieApiKey) {
    throw new Error(
      isProduction
        ? "Server missing NESSIE_API_KEY. Configure environment variables on your host."
        : "NESSIE_API_KEY is not set. Use .env.local or POLARIS_USE_FIXTURE=true for demo.",
    );
  }
}
