"use client";

import { useEffect, useState } from "react";

export type AppConfig = {
  fixtureMode: boolean;
  hasServerDefaultCustomer: boolean;
  features: {
    nessie: boolean;
    grokChat: boolean;
    grokVoice: boolean;
    grokImagine: boolean;
  };
};

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    void fetch("/api/config")
      .then((r) => r.json())
      .then((data: AppConfig) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  return config;
}
