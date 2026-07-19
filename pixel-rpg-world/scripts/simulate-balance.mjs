import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { balanceGateFailures, runBalanceSimulation } from "../game/balance/BalanceSimulation.ts";

function listArgument(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  return (raw ?? fallback).split(",").map(Number);
}

function scalarArgument(name, fallback) {
  return listArgument(name, String(fallback))[0];
}

const report = runBalanceSimulation({
  seeds: scalarArgument("seeds", 100),
  players: listArgument("players", "1,2"),
  levels: listArgument("levels", "1,10,20,30"),
});
const failures = balanceGateFailures(report);

console.log(`Balance simulation: ${report.seedCount} seeds`);
console.table(report.ttk);
console.table(report.dropsPerDungeon);
console.table(report.forgeTimeToLevel);
console.log("Rarity distribution", report.rarityDistribution);

if (process.argv.includes("--write")) {
  const destination = resolve("docs/balance/latest.json");
  await mkdir(resolve("docs/balance"), { recursive: true });
  await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote ${destination}`);
}

if (failures.length > 0) {
  console.error("Balance gates failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
