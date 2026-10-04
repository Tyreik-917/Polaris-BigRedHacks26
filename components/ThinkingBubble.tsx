/** Polaris "typing" indicator shown while a chat reply is on its way. */
export function ThinkingBubble() {
  return (
    <div
      className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-[4px] bg-bubble px-4 py-4"
      role="status"
      aria-label="Polaris is thinking"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
