export type ChatMessageRole = "user" | "assistant";

export type ChatMessageKind = "directions" | "reroute" | "chat";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  kind?: ChatMessageKind;
};

export function goalChatStorageKey(goal: {
  label: string;
  targetAmount: number;
  targetDate: string;
}): string {
  return `polaris:chat:${goal.label}|${goal.targetAmount}|${goal.targetDate}`;
}

export function newChatMessage(
  role: ChatMessageRole,
  content: string,
  kind?: ChatMessageKind,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    kind,
  };
}
