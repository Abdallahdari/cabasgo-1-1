"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="rounded-lg border bg-card p-10 text-center">
      <h1 className="text-xl font-bold">Cillad ayaa dhacday</h1>
      <p className="mt-2 text-muted-foreground">Fadlan mar kale isku day. Haddii ay sii socoto, la xiriir maamulka.</p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-muted-foreground">Tixraac: {error.digest}</p> : null}
      <Button onClick={reset} className="mt-6 h-11 rounded-xl px-6">
        Isku day mar kale
      </Button>
    </div>
  );
}
