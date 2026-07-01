import React from "react";
import Castle from "./Castle";
import { Unit } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface FloatingText {
  id: string;
  x: number; // percentage (0 to 100)
  y: number; // vertical offset (px)
  text: string;
  color: string;
  createdAt?: number;
}

interface Projectile {
  id: string;
  lane: number;
  x: number;
  targetX: number;
  enemy: boolean;
  type?: "arrow" | "magic" | "tower" | "archer" | "mage";
}

interface LaneViewProps {
  key?: any;
  laneIndex: number;
  laneName: string;
  playerCastleHp: number;
  aiCastleHp: number;
  maxCastleHp: number;
  units: Unit[];
  floatingTexts: FloatingText[];
  isSelected: boolean;
  onSelect: () => void;
  projectiles: Projectile[];
}

export default function LaneView({
  laneIndex,
  laneName,
  playerCastleHp,
  aiCastleHp,
  maxCastleHp,
  units,
  floatingTexts,
  isSelected,
  onSelect,
  projectiles = [],
}: LaneViewProps) {
  // Filter units for this specific lane
  const laneUnits = units.filter((u) => u.lane === laneIndex);

  return (
    <div 
      onClick={onSelect}
      className={`group/lane flex items-center gap-3 w-full my-3 transition-all duration-300 cursor-pointer ${
        isSelected ? "scale-[1.01]" : "opacity-90 hover:opacity-100"
      }`}
    >
      {/* 1. Left Lane Selector Panel ("выбирать линию слева от линии") */}
      <div
        className={`w-20 h-36 rounded-xl flex flex-col justify-center items-center gap-2 border transition-all duration-300 shadow-lg ${
          isSelected
            ? "bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-emerald-950/40 scale-105"
            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60"
        }`}
      >
        {/* Dynamic target icon */}
        <div className="relative">
          {isSelected ? (
            <>
              <div className="absolute -inset-1.5 bg-emerald-500/20 rounded-full animate-ping" />
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center font-bold text-xs">
                🎯
              </div>
            </>
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center font-bold text-xs opacity-60 group-hover/lane:opacity-100 group-hover/lane:border-slate-600 transition-all">
              ⚪
            </div>
          )}
        </div>

        {/* Text descriptions */}
        <div className="text-center">
          <p className="text-[10px] font-mono font-bold tracking-wider uppercase">
            Линия {laneIndex + 1}
          </p>
          <span className={`text-[8px] font-mono font-extrabold tracking-tight block px-1 py-0.2 rounded-sm mt-0.5 ${
            isSelected 
              ? "bg-emerald-500/20 text-emerald-300" 
              : "bg-slate-900 text-slate-600 group-hover/lane:text-slate-400"
          }`}>
            {isSelected ? "АКТИВНА" : "ВЫБРАТЬ"}
          </span>
        </div>
      </div>

      {/* 2. Main Lane Battlefield Container */}
      <div className={`flex-1 relative h-36 bg-slate-900/60 rounded-xl border overflow-hidden shadow-inner flex items-center transition-colors duration-300 ${
        isSelected 
          ? "border-emerald-500/40 bg-slate-900/80" 
          : "border-slate-800/80"
      }`}>
        
        {/* Visual background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.3),transparent)]" />
        
        {/* Center Pathway Lines */}
        <div className="absolute left-20 right-20 h-0.5 border-t border-dashed border-slate-700/50 top-1/2" />
        <div className="absolute left-20 right-20 h-10 bg-linear-to-r from-slate-950/20 via-transparent to-slate-950/20 top-[calc(50%-20px)] border-y border-slate-800/20" />
        
        {/* Lane Label */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/70 border border-slate-800 px-3 py-0.5 rounded-full z-10">
          <span className="text-[10px] font-display font-medium text-slate-400 tracking-wider uppercase">
            {laneName}
          </span>
        </div>

        {/* Castles */}
        <Castle side="left" hp={playerCastleHp} maxHp={maxCastleHp} name="Твоя База" />
        <Castle side="right" hp={aiCastleHp} maxHp={maxCastleHp} name="База ИИ" />

        {/* Units container */}
        <div className="absolute left-20 right-20 top-0 bottom-0 overflow-hidden">
          {laneUnits.map((unit) => {
            const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
            const isLowHp = hpPercent < 35;

            return (
              <div
                key={unit.id}
                className={`absolute top-1/2 -translate-y-1/2 transition-all duration-75 ease-linear ${
                  unit.enemy ? "z-20" : "z-30"
                }`}
                style={{
                  left: `${unit.x}%`,
                  transform: `translate(-50%, -50%) ${unit.isAttacking ? "scale(1.15)" : "scale(1)"}`,
                }}
              >
                {/* Attack effect / Wobble visual indicator */}
                {unit.isAttacking && (
                  <div
                    className={`absolute -inset-2 rounded-full animate-ping opacity-35 ${
                      unit.enemy ? "bg-red-500" : "bg-emerald-500"
                    }`}
                  />
                )}

                {/* Unit Card Body */}
                <div
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-2 cursor-default select-none shadow-md transition-all duration-150 ${
                    unit.enemy
                      ? "bg-slate-950 border-rose-500 text-rose-300 shadow-rose-950/30 hover:border-rose-400"
                      : "bg-slate-950 border-emerald-500 text-emerald-300 shadow-emerald-950/30 hover:border-emerald-400"
                  }`}
                >
                  {/* Unit Emoji */}
                  <span className={unit.isAttacking ? "animate-bounce" : ""}>
                    {unit.type === "sword"
                      ? "💂‍♂️"
                      : unit.type === "archer"
                      ? "🧝‍♀️"
                      : unit.type === "tank"
                      ? "🛡️"
                      : unit.type === "mage"
                      ? "🧙‍♂️"
                      : unit.type === "assassin"
                      ? "🥷"
                      : "🧚‍♀️"}
                  </span>

                  {/* Micro Health Bar above the unit */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-150 ${
                        isLowHp ? "bg-red-500" : unit.enemy ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>

                  {/* HP text indicator on hover */}
                  <div className="absolute -bottom-3 text-[8px] font-mono font-bold bg-slate-950/90 border border-slate-800 text-slate-300 px-1 py-0.2 rounded-sm opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {Math.ceil(unit.hp)} / {unit.maxHp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Projectiles in flight (Archer Arrow, Mage Spell, Tower Arrow) */}
          {projectiles && projectiles.filter((p) => p.lane === laneIndex).map((p) => {
            const isArrow = p.type === "archer" || p.type === "arrow";
            const isMagic = p.type === "mage" || p.type === "magic";
            return (
              <div
                key={p.id}
                className="absolute top-[45%] -translate-y-1/2 text-sm z-40 select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-semibold transition-all"
                style={{
                  left: `${p.x}%`,
                  transform: `translate(-50%, -50%) ${p.enemy ? "scaleX(-1)" : "scaleX(1)"}`,
                }}
              >
                {isArrow ? (
                  <span className="text-base filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">🏹</span>
                ) : isMagic ? (
                  <span className="text-lg filter drop-shadow-[0_0_4px_rgba(168,85,247,0.8)] animate-pulse">🔮</span>
                ) : (
                  <span className="text-base filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">🏹</span>
                )}
              </div>
            );
          })}

          {/* Floating Damage Text popups */}
          <AnimatePresence>
            {floatingTexts.map((txt) => (
              <motion.div
                key={txt.id}
                initial={{ opacity: 1, y: txt.y, scale: 0.8 }}
                animate={{ opacity: 0, y: txt.y - 45, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`absolute font-mono font-bold text-sm tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-40`}
                style={{
                  left: `${txt.x}%`,
                  top: "40%",
                  color: txt.color,
                }}
              >
                {txt.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
