"use client";

import {
  clearStoredCustomerId,
  getStoredCustomerId,
  isValidNessieCustomerId,
  NESSIE_CUSTOMER_ID_PATTERN,
  setStoredCustomerId,
} from "@/lib/client/nessie-customer";
import { useCallback, useEffect, useState } from "react";

export {
  isValidNessieCustomerId,
  NESSIE_CUSTOMER_ID_PATTERN,
};

export function useNessieCustomer() {
  const [customerId, setCustomerIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCustomerIdState(getStoredCustomerId());
    setHydrated(true);
  }, []);

  const setCustomerId = useCallback((id: string) => {
    setStoredCustomerId(id);
    setCustomerIdState(id.trim());
  }, []);

  const clearCustomerId = useCallback(() => {
    clearStoredCustomerId();
    setCustomerIdState(null);
  }, []);

  return {
    customerId,
    hydrated,
    setCustomerId,
    clearCustomerId,
    hasCustomerId: Boolean(customerId),
  };
}
