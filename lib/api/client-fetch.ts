"use client";

import { getStoredCustomerId } from "@/lib/client/nessie-customer";

export function polarisFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const customerId = getStoredCustomerId();
  if (customerId) {
    headers.set("x-polaris-customer-id", customerId);
  }
  return fetch(input, { credentials: "include", ...init, headers });
}
