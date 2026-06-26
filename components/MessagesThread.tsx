import { sendMessage } from "@/lib/messages";

export interface ThreadMessage {
  id: string;
  body: string;
  authorName: string;
  mine: boolean;
}

export default function MessagesThread({ requestId, messages }: { requestId: string; messages: ThreadMessage[] }) {
  return (
    <div>
      <ul className="flex flex-col gap-2.5">
        {messages.length === 0 && <li className="text-sm text-ink-3">אין הודעות עדיין.</li>}
        {messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[78%] px-3.5 py-2.5 text-sm ${
              m.mine
                ? "self-end rounded-2xl rounded-bl-md bg-gradient-to-l from-primary-2 to-primary-deep text-white"
                : "self-start rounded-2xl rounded-br-md bg-paper-2 text-ink"
            }`}
          >
            <p className={`mb-0.5 text-[11px] font-bold ${m.mine ? "text-white/70" : "text-ink-3"}`}>{m.authorName}</p>
            <p>{m.body}</p>
          </li>
        ))}
      </ul>
      <form action={sendMessage.bind(null, requestId)} className="mt-4 flex gap-2">
        <input name="body" placeholder="כתבו הודעה…" className="flex-1 rounded-xl border border-rule-strong bg-paper px-4 py-2.5 outline-none focus:border-primary" />
        <button className="btn-primary press px-5">שלח</button>
      </form>
    </div>
  );
}
