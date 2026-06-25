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
      <ul className="space-y-2">
        {messages.length === 0 && <li className="text-sm text-ink-3">אין הודעות עדיין.</li>}
        {messages.map((m) => (
          <li key={m.id} className={`max-w-[80%] border border-rule px-3 py-2 text-sm ${m.mine ? "mr-auto bg-paper-2" : "ml-auto"}`}>
            <p className="lbl mb-0.5">{m.authorName}</p>
            <p>{m.body}</p>
          </li>
        ))}
      </ul>
      <form action={sendMessage.bind(null, requestId)} className="mt-3 flex gap-2">
        <input name="body" placeholder="כתבו הודעה…" className="flex-1 border border-rule bg-paper-2 px-3 py-2 outline-none focus:border-ink" />
        <button className="bg-ink px-4 font-bold text-paper hover:bg-ink-2">שלח</button>
      </form>
    </div>
  );
}
