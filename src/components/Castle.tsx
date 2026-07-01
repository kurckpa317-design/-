import React from "react";
import { Shield, Flame, Sword, Sparkles } from "lucide-react";

interface CastleProps {
  side: "left" | "right";
  hp: number;
  maxHp: number;
  name: string;
}

export default function Castle({ side, hp, maxHp, name }: CastleProps) {
  const hpPercentage = Math.max(0, (hp / maxHp) * 100);
  const isLowHp = hpPercentage < 30;
  const isPlayer = side === "left";

  return (
    <div
      className={`absolute top-0 bottom-0 w-24 flex flex-col justify-between items-center z-15 transition-all duration-300 ${
        isPlayer
          ? "left-0 bg-linear-to-r from-emerald-950/30 via-slate-950/20 to-transparent border-r border-emerald-500/10"
          : "right-0 bg-linear-to-l from-rose-950/30 via-slate-950/20 to-transparent border-l border-rose-500/10"
      }`}
    >
      {/* 1. Watchtower Ridge (Crenellations / Зубцы крепостной стены) */}
      <div className="w-full flex flex-col items-center pt-2">
        {/* Crenellations Row */}
        <div className="flex gap-1 justify-center w-16 h-2">
          <div className={`w-3 h-2 rounded-t-sm ${isPlayer ? "bg-emerald-750 border border-emerald-500/40" : "bg-rose-750 border border-rose-500/40"}`} />
          <div className="w-3 h-2 bg-transparent" />
          <div className={`w-3 h-2 rounded-t-sm ${isPlayer ? "bg-emerald-750 border border-emerald-500/40" : "bg-rose-750 border border-rose-500/40"}`} />
          <div className="w-3 h-2 bg-transparent" />
          <div className={`w-3 h-2 rounded-t-sm ${isPlayer ? "bg-emerald-750 border border-emerald-500/40" : "bg-rose-750 border border-rose-500/40"}`} />
        </div>

        {/* Watchtower platform */}
        <div className={`w-18 h-9 rounded-md bg-slate-950 border-2 flex flex-col items-center justify-center relative shadow-xl ${
          isPlayer 
            ? "border-emerald-500/60 bg-linear-to-b from-slate-950 to-emerald-950/60 shadow-emerald-950/50" 
            : "border-rose-500/60 bg-linear-to-b from-slate-950 to-rose-950/60 shadow-rose-950/50"
        }`}>
          {/* Active Archer Character standing on tower */}
          <div className="flex items-center gap-0.5 animate-bounce" style={{ animationDuration: '2.5s' }}>
            <span className="text-xs">🧝‍♀️</span>
            <span className="text-[10px] animate-pulse">🏹</span>
          </div>

          <div className={`absolute -bottom-2.5 px-2 py-0.5 rounded-md text-[7px] font-mono font-extrabold tracking-widest text-slate-200 border bg-slate-950/90 whitespace-nowrap shadow-md ${
            isPlayer ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            {isPlayer ? "ГВАРДИЯ" : "АВТО-ЛУЧНИК"}
          </div>

          {/* Little flag waving above tower */}
          <div className={`absolute -top-3.5 ${isPlayer ? "left-2" : "right-2"} flex flex-col items-center`}>
            <div className={`w-0.5 h-4 ${isPlayer ? "bg-emerald-600" : "bg-rose-600"}`} />
            <div className={`w-4 h-2.5 rounded-r-xs -mt-4 ml-2.5 animate-pulse ${
              isPlayer ? "bg-emerald-500" : "bg-rose-500"
            }`} style={{ clipPath: "polygon(0% 0%, 100% 50%, 0% 100%)" }} />
          </div>
        </div>
      </div>

      {/* 2. Main Fortress Tower Body (Middle) */}
      <div className="relative flex flex-col items-center justify-center my-auto px-2 w-full">
        {/* Stone texture & glowing force shield circle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-20 h-20 rounded-full border border-dashed animate-spin ${
            isPlayer 
              ? "border-emerald-500/10 bg-emerald-500/[0.01]" 
              : "border-rose-500/10 bg-rose-500/[0.01]"
          }`} style={{ animationDuration: '30s' }} />

          {/* Glowing pulse aura based on health */}
          {!isLowHp && (
            <div className={`absolute w-16 h-16 rounded-full border animate-ping opacity-20 ${
              isPlayer ? "border-emerald-400 bg-emerald-500/5" : "border-rose-400 bg-rose-500/5"
            }`} style={{ animationDuration: '4s' }} />
          )}
        </div>

        {/* Castle Flag / Emblem Signboard */}
        <div
          className={`relative p-3.5 rounded-xl border-2 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 z-10 w-20 ${
            isPlayer
              ? "bg-slate-950 border-emerald-500 text-emerald-400 shadow-emerald-950/60 bg-linear-to-br from-slate-950 to-emerald-950/40"
              : "bg-slate-950 border-rose-500 text-rose-400 shadow-rose-950/60 bg-linear-to-br from-slate-950 to-rose-950/40"
          }`}
        >
          {/* Emblems */}
          {isPlayer ? (
            <div className="relative">
              <Shield className="w-7 h-7 text-emerald-400 animate-pulse" />
              <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-ping" />
            </div>
          ) : (
            <div className="relative">
              <Flame className="w-7 h-7 text-rose-400 animate-bounce" style={{ animationDuration: '3s' }} />
              <Sword className="w-3 h-3 text-red-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}
          
          <span className="text-[9px] font-display font-black mt-2 tracking-wider uppercase text-center text-slate-100 whitespace-nowrap">
            {name}
          </span>

          {/* Floating health badge (Highly visible) */}
          <div
            className={`absolute -bottom-3 px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border shadow-lg ${
              isPlayer
                ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                : "bg-rose-950 text-rose-300 border-rose-500"
            }`}
          >
            {Math.ceil(hp)} HP
          </div>
        </div>
      </div>

      {/* 3. Base Foundations of the Castle (Bottom) */}
      <div className="w-full flex flex-col items-center pb-2">
        {/* Visual stone foundation slab */}
        <div className={`w-20 h-3 rounded-t-md border-t border-x ${
          isPlayer ? "bg-emerald-950/60 border-emerald-500/20" : "bg-rose-950/60 border-rose-500/20"
        }`} />

        {/* Tiny progress health bar indicator */}
        <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 shadow-inner">
          <div
            className={`h-full transition-all duration-300 ${
              isLowHp
                ? "bg-red-500 animate-pulse"
                : isPlayer
                ? "bg-emerald-500"
                : "bg-rose-500"
            }`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
