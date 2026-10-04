import { DestinationScreen } from "@/components/screens/DestinationScreen";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Suspense } from "react";

function DestinationFallback() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 items-center justify-center text-muted">
        Loading…
      </div>
    </PhoneFrame>
  );
}

export default function DestinationPage() {
  return (
    <Suspense fallback={<DestinationFallback />}>
      <DestinationScreen />
    </Suspense>
  );
}
