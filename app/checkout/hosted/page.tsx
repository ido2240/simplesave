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
    <main className="flex min-h-screen items-center justify-center p-6" style={{ background: "linear-gradient(135deg,#0c1838,#22409b)" }}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <p className="lbl mb-1">תשלום מאובטח (סביבת בדיקה · Sandbox)</p>
        <h1 className="display mb-4 text-2xl font-bold">SimpleSave מלא</h1>
        <div className="mb-5 flex justify-between border-y border-rule py-3">
          <span>לתשלום</span><span className="num display font-bold">{shekel(SERVICE_PRICE_ILS)}</span>
        </div>
        <div className="mb-5 space-y-2 text-sm text-ink-3">
          <div className="rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5">•••• •••• •••• 4242</div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5">12 / 34</div>
            <div className="w-20 rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5">123</div>
          </div>
        </div>
        <form action={confirmPayment.bind(null, rid)}>
          <button className="btn-primary press w-full py-3.5">שלם {shekel(SERVICE_PRICE_ILS)}</button>
        </form>
      </div>
    </main>
  );
}
