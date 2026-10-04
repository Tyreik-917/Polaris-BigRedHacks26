import { PhoneFrame } from "@/components/PhoneFrame";
import Link from "next/link";

/** Shown when the goal in the URL no longer exists (reset, expired, or another browser). */
export function GoalMissing({ message }: { message?: string }) {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] text-muted">
          {message ?? "I can't find that trip anymore."}
        </p>
        <Link
          href="/destination"
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-star text-[16px] font-semibold text-star-ink"
        >
          Set a new destination
        </Link>
      </div>
    </PhoneFrame>
  );
}
