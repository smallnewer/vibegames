import type { ToastMessage } from "../../game/ui/ToastQueue";

export function ToastStack({ messages }: { readonly messages: readonly ToastMessage[] }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
      {messages.map((message) => (
        <div className="toast-message" data-tone={message.tone} key={message.id}>
          <strong>{message.title}</strong>
          {message.detail && <span>{message.detail}</span>}
        </div>
      ))}
    </div>
  );
}
