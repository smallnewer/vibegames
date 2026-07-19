import type { CombatHudModel } from "../../game/ui/HudTypes";

export function InteractionPrompt({ prompt }: { readonly prompt: CombatHudModel["prompt"] }) {
  if (!prompt) return null;
  return (
    <section className="interaction-prompt" data-testid="interaction-prompt">
      <kbd>B</kbd>
      <span>P{prompt.player} · {prompt.text}</span>
      {prompt.action === "revive" && (
        <i style={{ width: `${(prompt.progress ?? 0) * 100}%` }} />
      )}
    </section>
  );
}
