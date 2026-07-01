import React from "react";
import { Coins, TrendingUp, Heart, Sword, ArrowUpCircle } from "lucide-react";
import { UNIT_CONFIGS, UnitType } from "../types";

interface ControlPanelProps {
  gold: number;
  income: number;
  playerCastleHp: number;
  maxCastleHp: number;
  onSpawnUnit: (type: UnitType) => void;
  onUpgradeIncome: () => void;
  onUpgradeCastle: () => void;
  incomeUpgradeCost: number;
  castleUpgradeCost: number;
  selectedLane: number;
}

export default function ControlPanel({
  gold,
  income,
  playerCastleHp,
  maxCastleHp,
  onSpawnUnit,
  onUpgradeIncome,
  onUpgradeCastle,
  incomeUpgradeCost,
  castleUpgradeCost,
  selectedLane,
}: ControlPanelProps) {
  const unitTypes: UnitType[] = ["sword", "archer", "tank", "mage", "assassin", "healer"];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Top row: Resource Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Gold Reserve */}
        <div className="bg-slate-950 border border-amber-500/10 rounded-lg p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <Coins className="w-5 h-5 animate-spin delay-1000" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Казна золота
              </p>
              <h4 className="text-lg font-display font-bold text-amber-400 tracking-tight">
                {Math.floor(gold)} <span className="text-[10px] font-mono text-amber-500/80">монет</span>
              </h4>
            </div>
          </div>
          <span className="text-xs font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
            +{income}/сек
          </span>
        </div>

        {/* Castle Health Status */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between shadow-inner col-span-1 sm:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${playerCastleHp < 500 ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-emerald-500/10 text-emerald-400"}`}>
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Защита Вашего Замка
              </p>
              <h4 className={`text-sm font-mono font-bold tracking-tight ${playerCastleHp < 500 ? "text-red-400" : "text-emerald-400"}`}>
                {Math.ceil(playerCastleHp)} / {maxCastleHp} HP
              </h4>
            </div>
          </div>

          <div className="w-24 sm:w-36 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                playerCastleHp < 500 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
              }`}
              style={{ width: `${(playerCastleHp / maxCastleHp) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Recruit Units and Upgrades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Recruit Units */}
        <div className="lg:col-span-8 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sword className="w-4 h-4 text-emerald-400" />
              Обучить войска (нажмите для призыва)
            </h4>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Призыв на Линию {selectedLane + 1}
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {unitTypes.map((type) => {
              const cfg = UNIT_CONFIGS[type];
              const canAfford = gold >= cfg.cost;

              return (
                <button
                  key={type}
                  onClick={() => onSpawnUnit(type)}
                  disabled={!canAfford}
                  className={`group relative flex flex-col items-center justify-between p-2 rounded-lg border text-center transition-all duration-200 cursor-pointer ${
                    canAfford
                      ? "bg-slate-950 border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/10 text-slate-200 shadow-md active:scale-98"
                      : "bg-slate-950/40 border-slate-950 text-slate-500 cursor-not-allowed animate-pulse"
                  }`}
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                    {cfg.emoji}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-display font-medium text-slate-200">{cfg.name}</p>
                    <p className={`text-[10px] font-mono font-bold ${canAfford ? "text-amber-400" : "text-slate-500"}`}>
                      {cfg.cost} золота
                    </p>
                  </div>

                  {/* Micro stats tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 border border-slate-800 text-left p-2.5 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-[9px] font-mono space-y-1">
                    <p className="text-xs font-display font-bold text-emerald-400 flex items-center gap-1 border-b border-slate-800 pb-1 mb-1">
                      <span>{cfg.emoji}</span> {cfg.name}
                    </p>
                    <p className="text-slate-400">{cfg.description}</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 text-slate-500">
                      <span>HP: <strong className="text-slate-300">{cfg.hp}</strong></span>
                      <span>АТК: <strong className="text-slate-300">{cfg.dmg}</strong></span>
                      <span>Дальность: <strong className="text-slate-300">{cfg.range}%</strong></span>
                      <span>Скорость: <strong className="text-slate-300">{cfg.speed}</strong></span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Base Eco/Defensive Upgrades */}
        <div className="lg:col-span-4 space-y-2">
          <h4 className="text-xs font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpCircle className="w-4 h-4 text-indigo-400" />
            Развитие инфраструктуры
          </h4>
          <div className="flex flex-col gap-2">
            {/* Upgrade Gold Mines */}
            <button
              onClick={onUpgradeIncome}
              disabled={gold < incomeUpgradeCost}
              className={`group flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                gold >= incomeUpgradeCost
                  ? "bg-slate-950 border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10 text-slate-200 active:scale-98"
                  : "bg-slate-950/40 border-slate-950 text-slate-500 cursor-not-allowed"
              }`}
            >
              <div className={`p-1.5 rounded-md ${gold >= incomeUpgradeCost ? "bg-indigo-500/10 text-indigo-400 group-hover:scale-110" : "bg-slate-900 text-slate-600"} transition-transform`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-display font-medium text-slate-200">Доходные шахты</p>
                <p className="text-[9px] font-mono text-slate-400 font-medium">Повысить (+2 к доходу)</p>
                <p className={`text-[10px] font-mono font-bold ${gold >= incomeUpgradeCost ? "text-amber-400" : "text-slate-500"}`}>
                  {incomeUpgradeCost} золота
                </p>
              </div>
            </button>

            {/* Upgrade Castle Walls */}
            <button
              onClick={onUpgradeCastle}
              disabled={gold < castleUpgradeCost}
              className={`group flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                gold >= castleUpgradeCost
                  ? "bg-slate-950 border-slate-800 hover:border-fuchsia-500/50 hover:bg-fuchsia-950/10 text-slate-200 active:scale-98"
                  : "bg-slate-950/40 border-slate-950 text-slate-500 cursor-not-allowed"
              }`}
            >
              <div className={`p-1.5 rounded-md ${gold >= castleUpgradeCost ? "bg-fuchsia-500/10 text-fuchsia-400 group-hover:scale-110" : "bg-slate-900 text-slate-600"} transition-transform`}>
                <ArrowUpCircle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-display font-medium text-slate-200">Ремонт & Укрепление</p>
                <p className="text-[9px] font-mono text-slate-400 font-medium">Восстановить (+500 HP)</p>
                <p className={`text-[10px] font-mono font-bold ${gold >= castleUpgradeCost ? "text-amber-400" : "text-slate-500"}`}>
                  {castleUpgradeCost} золота
                </p>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
