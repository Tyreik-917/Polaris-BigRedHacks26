const STORAGE_KEY = "polaris:nessieCustomerId";

export const NESSIE_CUSTOMER_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function getStoredCustomerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function setStoredCustomerId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id.trim());
}

export function clearStoredCustomerId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isValidNessieCustomerId(id: string): boolean {
  return NESSIE_CUSTOMER_ID_PATTERN.test(id.trim());
}
