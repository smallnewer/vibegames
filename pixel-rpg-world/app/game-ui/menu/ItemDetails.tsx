import type { InventoryPageModel } from "../../../game/ui/InventoryPageModel";
import type { UiInput } from "../../../game/ui/UiInput";
import type { UiState } from "../../../game/ui/UiState";
import { GameIcon } from "../GameIcon";

const STAT_LABEL: Record<string, string> = {
  maxHealth: "生命",
  meleePower: "近战强度",
  rangedPower: "远程强度",
  skillPower: "技能强度",
  armor: "护甲",
  critRating: "暴击等级",
  critDamage: "暴击伤害",
  attackSpeed: "攻击速度",
  cooldownRecovery: "冷却恢复",
  fireResist: "火抗",
  iceResist: "冰抗",
  poisonResist: "毒抗",
  stormResist: "雷抗",
  might: "力量",
  finesse: "灵巧",
  vitality: "体魄",
  resolve: "意志",
  moveSpeed: "移动速度",
  pickupRadius: "拾取范围",
};

export function ItemDetails({
  state,
  model,
  dispatch,
}: {
  readonly state: UiState;
  readonly model: InventoryPageModel;
  readonly dispatch: (input: UiInput) => void;
}) {
  const item = model.selected;
  if (!item) return <aside className="item-details empty">选择一件物品查看详情</aside>;
  const salvageFocus = `inventory:salvage:${item.id}`;
  return (
    <aside className="item-details" data-rarity={item.rarity}>
      <header>
        <GameIcon id={item.icon} label={item.name} />
        <div>
          <small>{item.rarity.toUpperCase()} · ILVL {item.itemLevel}</small>
          <h2>{item.name}{item.reinforce > 0 ? ` +${item.reinforce}` : ""}</h2>
        </div>
        <span>{item.favorite ? "◆ 收藏" : item.equipped ? "已装备" : ""}</span>
      </header>
      <dl>
        {item.base ? <div><dt>{STAT_LABEL[item.base.stat] ?? item.base.stat}</dt><dd>{item.base.value.toFixed(1)}</dd></div> : null}
        {item.affixes.map((affix) => (
          <div key={affix.id}><dt>{STAT_LABEL[affix.stat] ?? affix.stat}</dt><dd>+{affix.value}</dd></div>
        ))}
      </dl>
      <p>{item.canEquip ? "A 装备" : item.inRecovery && model.mainCount < model.mainCapacity ? "A 移回背包" : item.equipReason}</p>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: "select_focus", id: `inventory:item:${item.id}` });
          dispatch({ type: "secondary" });
        }}
      >X 比较{model.compareActive ? "（开启）" : ""}</button>
      {model.compareActive ? (
        <section className="item-comparison" aria-label="装备比较">
          <h3>替换后变化</h3>
          {item.comparison.deltas.length === 0 ? <p>没有数值变化</p> : (
            <ul>{item.comparison.deltas.map((delta) => (
              <li key={delta.stat} data-positive={delta.value > 0 ? "true" : "false"}>
                <span>{STAT_LABEL[delta.stat] ?? delta.stat}</span>
                <strong>{delta.value > 0 ? "+" : ""}{delta.value.toFixed(2)}</strong>
              </li>
            ))}</ul>
          )}
        </section>
      ) : null}
      {!item.inRecovery ? (
        <button
          type="button"
          className="salvage-action"
          disabled={!item.canSalvage}
          data-focus-id={salvageFocus}
          data-controller-focus={state.focusId === salvageFocus ? "true" : undefined}
          onClick={() => {
            dispatch({ type: "select_focus", id: salvageFocus });
            dispatch({ type: "confirm" });
          }}
        >分解物品</button>
      ) : null}
    </aside>
  );
}
