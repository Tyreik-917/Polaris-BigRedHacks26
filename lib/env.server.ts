export type ServerConfig = {
  nessieApiKey: string | null;
  defaultCustomerId: string | null;
  xaiApiKey: string | null;
  useFixture: boolean;
  isProduction: boolean;
};

export function getServerConfig(): ServerConfig {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    nessieApiKey: process.env.NESSIE_API_KEY?.trim() || null,
    defaultCustomerId: process.env.NESSIE_CUSTOMER_ID?.trim() || null,
    xaiApiKey: process.env.XAI_API_KEY?.trim() || null,
    useFixture: process.env.POLARIS_USE_FIXTURE === "true",
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
