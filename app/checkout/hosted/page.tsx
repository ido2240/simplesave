import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { shekel } from "@/lib/format";
import { SERVICE_PRICE_ILS } from "@/lib/billing";
import { confirmPayment } from "../actions";

// Mock hosted-checkout (stands in for Stripe Checkout / a local PSP).
export default async function HostedCheckout({ searchParams }: { searchParams: Promise<{ rid?: string }> }) {
  const user = await requireRole("client");
  const { rid } = await searchParams;
  if (!rid) notFound();
  const { data: req } = await supabase().from("requests").select("id, client_id").eq("id", rid).maybeSingle();
  if (!req || req.client_id !== user.id) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink p-6">
      <div className="w-full max-w-sm bg-paper p-7">
        <p className="lbl mb-1">תשלום מאובטח (הדגמה)</p>
        <h1 className="display mb-4 text-2xl font-bold">SimpleSave מלא</h1>
        <div className="mb-5 flex justify-between border-y border-rule py-3">
          <span>לתשלום</span><span className="num font-black">{shekel(SERVICE_PRICE_ILS)}</span>
        </div>
        <div className="mb-5 space-y-2 text-sm text-ink-3">
          <div className="border border-rule bg-paper-2 px-3 py-2">•••• •••• •••• 4242</div>
          <div className="flex gap-2">
            <div className="flex-1 border border-rule bg-paper-2 px-3 py-2">12 / 34</div>
            <div className="w-20 border border-rule bg-paper-2 px-3 py-2">123</div>
          </div>
        </div>
        <form action={confirmPayment.bind(null, rid)}>
          <button className="w-full bg-ember py-3 font-bold text-paper hover:opacity-90">שלם {shekel(SERVICE_PRICE_ILS)}</button>
        </form>
      </div>
    </main>
  );
}
