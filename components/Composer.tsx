"use client";

import { MicButton } from "@/components/MicButton";
import { Send } from "lucide-react";
import { useId, type RefObject } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicToggle?: () => void;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  onMicToggle,
  placeholder = "Message Polaris…",
  inputRef,
}: Props) {
  const id = useId();

  return (
    <div className="sticky bottom-0 border-t border-line bg-night/95 px-4 py-3 backdrop-blur-sm">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit();
        }}
      >
        <label htmlFor={id} className="sr-only">
          Message
        </label>
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 flex-1 rounded-xl border border-border bg-panel px-4 text-[15px] text-ink placeholder:text-muted"
        />
        <button
          type="submit"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel text-star disabled:opacity-40"
          aria-label="Send message"
          disabled={!value.trim()}
        >
          <Send className="h-5 w-5" />
        </button>
        <MicButton onToggle={onMicToggle} />
      </form>
    </div>
  );
}
