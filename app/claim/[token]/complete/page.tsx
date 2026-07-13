"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Waveform } from "@/components/brand";
import { Card, Button } from "@/components/ui";

export default function ClaimComplete({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/claim/${params.token}/complete`, { method: "POST" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Something went wrong.");
        setStatus("done");
        setTimeout(() => router.push("/received"), 1400);
      })
      .catch((e) => {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Something went wrong.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-parchment px-6 text-center">
      <Logo />
      <div className="my-8 text-amber-soft/70">
        <Waveform bars={40} className="!h-8" />
      </div>
      {status === "working" && <p className="text-sm text-sage">Opening what was left for you…</p>}
      {status === "done" && <p className="font-display text-xl text-ink">Welcome. Taking you there now.</p>}
      {status === "error" && (
        <Card className="max-w-sm p-5">
          <p className="text-sm text-clay">{error}</p>
          <div className="mt-4">
            <Button onClick={() => router.push("/received")}>Go to my dashboard</Button>
          </div>
        </Card>
      )}
    </main>
  );
}
