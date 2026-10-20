"use client";

import { Alert, Button, Panel } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <Alert>{error.message}</Alert>
      <div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </Panel>
  );
}
