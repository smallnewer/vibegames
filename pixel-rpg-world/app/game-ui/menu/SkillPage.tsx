import type { SkillPageModel } from "../../../game/ui/SkillPageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";
import { SkillLoadoutCross } from "./SkillLoadoutCross";
import { GameIcon } from "../GameIcon";

export function SkillPage({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: SkillPageModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  return (
    <div className="skill-page">
      <section className="skill-library">
        <header><h2>技能库</h2><span>技能点 {model.unspentSkills}</span></header>
        <div>
          {model.entries.map((entry) => (
            <button
              type="button"
              key={entry.id}
              disabled={!entry.unlocked}
              data-focus-id={entry.focusId}
              data-controller-focus={state.focusId === entry.focusId ? "true" : undefined}
              aria-pressed={state.skillSelection === entry.id}
              onClick={() => {
                dispatch({ type: "select_focus", id: entry.focusId });
                dispatch({ type: "confirm" });
              }}
            >
              <GameIcon id={entry.icon} contentId={entry.id} />
              <span>{entry.name}</span>
              <small>{entry.unlocked ? `Rank ${entry.rank}` : "未解锁"}{entry.equippedSlot ? ` · ${entry.equippedSlot.replace("skill_", "")}` : ""}</small>
              <b>{Math.round(entry.current.damageMultiplier * 100)}%</b>
            </button>
          ))}
        </div>
        <header><h2>被动技能</h2><span>2 个装配槽</span></header>
        <div>
          {model.passives.map((entry) => (
            <button
              type="button"
              key={entry.id}
              disabled={!entry.unlocked}
              data-focus-id={entry.focusId}
              data-controller-focus={state.focusId === entry.focusId ? "true" : undefined}
              aria-pressed={state.skillSelection === entry.id}
              onClick={() => {
                dispatch({ type: "select_focus", id: entry.focusId });
                dispatch({ type: "confirm" });
              }}
            >
              <GameIcon id={entry.icon} contentId={entry.id} />
              <span>{entry.name}</span>
              <small>{entry.unlocked ? `Rank ${entry.rank}` : "未解锁"}{entry.equippedSlot ? ` · ${entry.equippedSlot.replace("passive_", "槽")}` : ""}</small>
              <b>被动</b>
            </button>
          ))}
        </div>
      </section>
      <section className="skill-center">
        <SkillLoadoutCross state={state} model={model} dispatch={dispatch} />
        <div className="passive-slots" aria-label="被动技能槽">
          {model.passiveSlots.map((slot) => (
            <button
              type="button"
              key={slot.slot}
              disabled={!model.passives.some((entry) => entry.id === state.skillSelection)}
              data-focus-id={slot.focusId}
              data-controller-focus={state.focusId === slot.focusId ? "true" : undefined}
              onClick={() => {
                dispatch({ type: "select_focus", id: slot.focusId });
                dispatch({ type: "confirm" });
              }}
            >
              <GameIcon id={slot.icon} contentId={slot.passive} />
              <small>{slot.slot === "passive_1" ? "被动一" : "被动二"}</small>
              <span>{slot.name}</span>
            </button>
          ))}
        </div>
        <div className="weapon-skills" aria-label="武器技能">
          {model.weapons.map((weapon) => <div key={weapon.slot}><kbd>{weapon.slot === "melee" ? "X" : "Y"}</kbd><GameIcon id={weapon.icon} /><span>{weapon.name}</span><small>由武器决定</small></div>)}
        </div>
      </section>
      <aside className="skill-details">
        {(() => {
          const entry = model.entries.find((candidate) => candidate.focusId === state.focusId)
            ?? model.entries.find((candidate) => candidate.id === state.skillSelection);
          if (entry) return <>
              <h2>{entry.name}</h2>
              <p>Rank {entry.rank || "—"} · 冷却 {entry.current.cooldown.toFixed(1)} 秒</p>
              <dl>
                <div><dt>伤害倍率</dt><dd>{Math.round(entry.current.damageMultiplier * 100)}%</dd></div>
                {entry.current.damage ? <div><dt>伤害</dt><dd>{entry.current.damage.min}～{entry.current.damage.max}</dd></div> : null}
                {entry.current.radius ? <div><dt>范围</dt><dd>{entry.current.radius.toFixed(1)} m</dd></div> : null}
                {entry.current.maxTargets ? <div><dt>目标/数量</dt><dd>{entry.current.maxTargets}</dd></div> : null}
                {entry.next ? <div><dt>下一等级</dt><dd>{Math.round(entry.next.damageMultiplier * 100)}%</dd></div> : null}
              </dl>
              <button type="button" disabled={!entry.unlocked || !entry.next || model.unspentSkills < 1} onClick={() => { dispatch({ type: "select_focus", id: entry.focusId }); dispatch({ type: "secondary" }); }}>X 升级技能</button>
            </>;
          const passive = model.passives.find((candidate) => candidate.focusId === state.focusId)
            ?? model.passives.find((candidate) => candidate.id === state.skillSelection);
          if (!passive) return <p>选择技能查看详情</p>;
          const values = [
            ...Object.entries(passive.current.modifiers.flat ?? {}).map(([name, value]) => `${name} +${value}`),
            ...Object.entries(passive.current.modifiers.percent ?? {}).map(([name, value]) => `${name} +${Math.round(value * 100)}%`),
          ];
          return <>
            <h2>{passive.name}</h2>
            <p>Rank {passive.rank || "—"} · 被动技能</p>
            <dl>{values.map((value) => <div key={value}><dt>效果</dt><dd>{value}</dd></div>)}</dl>
            <button type="button" disabled={!passive.unlocked || !passive.next || model.unspentSkills < 1} onClick={() => { dispatch({ type: "select_focus", id: passive.focusId }); dispatch({ type: "secondary" }); }}>X 升级被动</button>
          </>;
        })()}
      </aside>
    </div>
  );
}
