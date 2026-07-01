import React, { useState, useEffect, useRef } from "react";
import LaneView from "./components/LaneView";
import ControlPanel from "./components/ControlPanel";
import ChatTerminal from "./components/ChatTerminal";
import { Unit, UnitType, ChatMessage, UNIT_CONFIGS } from "./types";
import { Bot, RefreshCw, Trophy, ShieldAlert, Sparkles, AlertCircle, HelpCircle, Download } from "lucide-react";
import {
  playSpawnSound,
  playHitSound,
  playCastleDamageSound,
  playHealSound,
  playTowerShootSound,
  playVictorySound,
  playDefeatSound,
} from "./utils/audio";
import { exportStandaloneHTML } from "./utils/exporter";

interface FloatingText {
  id: string;
  lane: number;
  x: number;
  y: number;
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

const MAX_CASTLE_HP = 2000;

export default function App() {
  // Game simulation state
  const [units, setUnits] = useState<Unit[]>([]);
  const [playerCastleHp, setPlayerCastleHp] = useState<number>(MAX_CASTLE_HP);
  const [aiCastleHp, setAiCastleHp] = useState<number>(MAX_CASTLE_HP);
  const [gold, setGold] = useState<number>(300);
  const [aiGold, setAiGold] = useState<number>(300);
  const [intelPoints, setIntelPoints] = useState<number>(30); // starts with some points
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);

  // Upgrade rates
  const [playerIncome, setPlayerIncome] = useState<number>(5);
  const [aiIncome, setAiIncome] = useState<number>(5);

  // UI state
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isThinkingAdvisor, setIsThinkingAdvisor] = useState<boolean>(false);
  const [isThinkingOverlord, setIsThinkingOverlord] = useState<boolean>(false);
  const [overlordComment, setOverlordComment] = useState<string>(
    "Твои деревянные стены не устоят перед моей стальной армией!"
  );
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [selectedLane, setSelectedLane] = useState<number>(0);

  // Refs to store latest states for continuous timers without resetting intervals
  const unitsRef = useRef<Unit[]>([]);
  const goldRef = useRef<number>(300);
  const aiGoldRef = useRef<number>(300);
  const playerCastleHpRef = useRef<number>(MAX_CASTLE_HP);
  const aiCastleHpRef = useRef<number>(MAX_CASTLE_HP);
  const playerIncomeRef = useRef<number>(5);
  const aiIncomeRef = useRef<number>(5);

  const playerTowerLastShootRef = useRef<number[]>([0, 0, 0]);
  const aiTowerLastShootRef = useRef<number[]>([0, 0, 0]);

  // Keep refs updated
  useEffect(() => { unitsRef.current = units; }, [units]);
  useEffect(() => { goldRef.current = gold; }, [gold]);
  useEffect(() => { aiGoldRef.current = aiGold; }, [aiGold]);
  useEffect(() => { playerCastleHpRef.current = playerCastleHp; }, [playerCastleHp]);
  useEffect(() => { aiCastleHpRef.current = aiCastleHp; }, [aiCastleHp]);
  useEffect(() => { playerIncomeRef.current = playerIncome; }, [playerIncome]);
  useEffect(() => { aiIncomeRef.current = aiIncome; }, [aiIncome]);

  // Lane Names (Russian/Medieval themes)
  const laneNames = [
    "Верхний перевал (Северный тракт)",
    "Центральный мост (Главная дорога)",
    "Нижняя застава (Лесной брод)",
  ];

  // Ref to track last combat timestamps for performance
  const lastAttackTimestampRef = useRef<number>(Date.now());

  // Initialize atmospheric greetings from AI Advisor and AI Overlord
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const welcomeMessages: ChatMessage[] = [
      {
        id: "welcome-advisor",
        sender: "advisor",
        text: "Добро пожаловать в командный пункт, Командир! 🛡️ Я ваш Тактический ИИ-Советник.\n\nНаша крепость находится слева, а вражеский ИИ Сверхразум укрепился справа. Ваша задача — нанимать воинов (Рыцарей, Лучников, Защитников), развивать золотые рудники и разрушить замок врага!\n\nКаждый раз, когда наши войска уничтожают врагов, мы перехватываем зашифрованные данные, заряжая шкалу 'Тактических Данных'. При заряде свыше 35% вы можете запросить у меня совет или материальную поддержку! Желаю удачи!",
        timestamp: timeStr,
      },
      {
        id: "welcome-overlord",
        sender: "overlord",
        text: "Ха-ха-ха! Глупый человек... Твой примитивный кремниевый советник не спасет тебя от моих вычислений. Мои тактические паттерны безупречны. Приготовься к поражению!",
        timestamp: timeStr,
      },
    ];
    setChatMessages(welcomeMessages);
  }, []);

  // --- Fractional Physics & State Loop (Optimized to prevent lag and support archer projectiles) ---
  useEffect(() => {
    if (isGameOver) return;

    const gameTick = setInterval(() => {
      const now = Date.now();
      const dt = 0.05; // 50ms tick interval is 0.05s

      // 1. Collect all state adjustments locally to apply them once at the very end
      let goldEarned = playerIncomeRef.current * dt;
      let aiGoldEarned = aiIncomeRef.current * dt;
      let intelEarned = 0;
      let playerCastleDmg = 0;
      let aiCastleDmg = 0;
      const newFloatingTexts: FloatingText[] = [];
      const newProjectiles: Projectile[] = [];

      // We will operate on a mutable copy of current units from unitsRef to avoid stale closures
      let currentUnits = [...unitsRef.current];

      // 1.1 Update existing projectiles and resolve hits
      setProjectiles((prevProjectiles) => {
        const remaining: Projectile[] = [];

        prevProjectiles.forEach((p) => {
          let newX = p.x;
          let isHit = false;

          // Projectile speed: snappy and responsive!
          const speed = 4.5; 
          if (!p.enemy) {
            newX += speed;
            if (newX >= p.targetX) isHit = true;
          } else {
            newX -= speed;
            if (newX <= p.targetX) isHit = true;
          }

          if (isHit) {
            // Damage the unit nearest to targetX
            let hitApplied = false;
            currentUnits = currentUnits.map((u) => {
              if (u.lane === p.lane && u.enemy === !p.enemy) {
                if (Math.abs(u.x - p.targetX) <= 12 && !hitApplied) {
                  hitApplied = true;
                  playHitSound();
                  
                  // Projectile damage config
                  const damage = p.type === "mage" ? 25 : p.type === "archer" ? 15 : 20;
                  
                  newFloatingTexts.push({
                    id: Math.random().toString(),
                    lane: p.lane,
                    x: p.targetX,
                    y: -20,
                    text: p.type === "mage" ? `🔮 -${damage}` : p.type === "archer" ? `🏹 -${damage}` : `🎯 -${damage}`,
                    color: p.enemy ? "#f43f5e" : "#10b981"
                  });

                  return { ...u, hp: Math.max(0, u.hp - damage) };
                }
              }
              return u;
            });
          } else {
            remaining.push({ ...p, x: newX });
          }
        });

        return remaining;
      });

      // 1.2 Tower shooting logic (every 1800ms)
      for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
        // Player Tower check
        const laneEnemies = currentUnits.filter((u) => u.enemy && u.lane === laneIdx);
        if (laneEnemies.length > 0) {
          const targetUnit = laneEnemies.reduce((closest, current) => current.x < closest.x ? current : closest, laneEnemies[0]);
          if (now - playerTowerLastShootRef.current[laneIdx] >= 1800) {
            playerTowerLastShootRef.current[laneIdx] = now;
            playTowerShootSound();
            newProjectiles.push({
              id: Math.random().toString(),
              lane: laneIdx,
              x: 6,
              targetX: targetUnit.x,
              enemy: false,
              type: "tower"
            });
          }
        }

        // AI Tower check
        const lanePlayers = currentUnits.filter((u) => !u.enemy && u.lane === laneIdx);
        if (lanePlayers.length > 0) {
          const targetUnit = lanePlayers.reduce((closest, current) => current.x > closest.x ? current : closest, lanePlayers[0]);
          if (now - aiTowerLastShootRef.current[laneIdx] >= 1800) {
            aiTowerLastShootRef.current[laneIdx] = now;
            playTowerShootSound();
            newProjectiles.push({
              id: Math.random().toString(),
              lane: laneIdx,
              x: 94,
              targetX: targetUnit.x,
              enemy: true,
              type: "tower"
            });
          }
        }
      }

      // 2. Physics & Battle math on units
      let updatedUnits = currentUnits.map((u) => {
        let isAttacking = false;
        let newX = u.x;

        if (!u.enemy) {
          // Player unit: moves right (x increases)
          const laneEnemies = currentUnits.filter((e) => e.enemy && e.lane === u.lane && e.x > u.x);
          let closestEnemy: Unit | null = null;
          let minDist = Infinity;

          for (const e of laneEnemies) {
            const dist = e.x - u.x;
            if (dist < minDist) {
              minDist = dist;
              closestEnemy = e;
            }
          }

          const friendlyAhead = u.type === "healer" && currentUnits.some((p) => !p.enemy && p.lane === u.lane && p.x > u.x && (p.x - u.x) <= 8);

          if (friendlyAhead) {
            isAttacking = true;
            if (now - u.lastAttackTime >= 1000) {
              u.lastAttackTime = now;
            }
          } else if (closestEnemy && minDist <= u.range) {
            isAttacking = true;
            if (now - u.lastAttackTime >= 1000) {
              u.lastAttackTime = now;
              // If ranged, spawn a gorgeous projectile!
              if (u.type === "archer" || u.type === "mage") {
                playTowerShootSound();
                newProjectiles.push({
                  id: Math.random().toString(),
                  lane: u.lane,
                  x: u.x,
                  targetX: closestEnemy.x,
                  enemy: false,
                  type: u.type
                });
              }
            }
          } else if (u.x >= 95) {
            isAttacking = true;
            if (now - u.lastAttackTime >= 1000) {
              u.lastAttackTime = now;
              if (u.type !== "healer") {
                playCastleDamageSound();
                if (u.type === "archer" || u.type === "mage") {
                  newProjectiles.push({
                    id: Math.random().toString(),
                    lane: u.lane,
                    x: u.x,
                    targetX: 95,
                    enemy: false,
                    type: u.type
                  });
                } else {
                  aiCastleDmg += u.dmg;
                  newFloatingTexts.push({
                    id: Math.random().toString(),
                    lane: u.lane,
                    x: 95,
                    y: -20,
                    text: `-${u.dmg}`,
                    color: "#f43f5e"
                  });
                }
              }
            }
          } else {
            newX += u.speed;
          }

        } else {
          // AI/Enemy unit: moves left (x decreases)
          const lanePlayers = currentUnits.filter((p) => !p.enemy && p.lane === u.lane && p.x < u.x);
          let closestPlayer: Unit | null = null;
          let minDist = Infinity;

          for (const p of lanePlayers) {
            const dist = u.x - p.x;
            if (dist < minDist) {
              minDist = dist;
              closestPlayer = p;
            }
          }

          const friendlyAhead = u.type === "healer" && currentUnits.some((p) => p.enemy && p.lane === u.lane && p.x < u.x && (u.x - p.x) <= 8);

          if (friendlyAhead) {
            isAttacking = true;
            if (now - u.lastAttackTime >= 1000) {
              u.lastAttackTime = now;
            }
          } else if (closestPlayer && minDist <= u.range) {
            isAttacking = true;
            if (now - u.lastAttackTime >= 1000) {
              u.lastAttackTime = now;
              // If ranged, spawn projectile!
              if (u.type === "archer" || u.type === "mage") {
                playTowerShootSound();
                newProjectiles.push({
                  id: Math.random().toString(),
                  lane: u.lane,
                  x: u.x,
                  targetX: closestPlayer.x,
                  enemy: true,
                  type: u.type
                });
              }
            }
          } else if (u.x <= 5) {
            isAttacking = true;
            if (now - u.lastAttackTime >= 1000) {
              u.lastAttackTime = now;
              if (u.type !== "healer") {
                playCastleDamageSound();
                if (u.type === "archer" || u.type === "mage") {
                  newProjectiles.push({
                    id: Math.random().toString(),
                    lane: u.lane,
                    x: u.x,
                    targetX: 5,
                    enemy: true,
                    type: u.type
                  });
                } else {
                  playerCastleDmg += u.dmg;
                  newFloatingTexts.push({
                    id: Math.random().toString(),
                    lane: u.lane,
                    x: 5,
                    y: -20,
                    text: `-${u.dmg}`,
                    color: "#10b981"
                  });
                }
              }
            }
          } else {
            newX -= u.speed;
          }
        }

        return {
          ...u,
          x: Math.min(100, Math.max(0, newX)),
          isAttacking,
        };
      });

      // 3. Resolve combat damage and healing between units (melee and healing continues continuously, ranged is handled via projectiles)
      updatedUnits = updatedUnits.map((u) => {
        let damageReceived = 0;
        let healingReceived = 0;
        let floatColor = u.enemy ? "#f43f5e" : "#10b981";

        if (!u.enemy) {
          // Find enemies in range attacking this player unit
          const attackers = updatedUnits.filter(
            (e) => e.enemy && e.lane === u.lane && e.x > u.x && (e.x - u.x) <= e.range && now - e.lastAttackTime < 100
          );
          attackers.forEach((a) => {
            if (a.type !== "archer" && a.type !== "mage") {
              damageReceived += a.dmg * 0.12;
            }
          });

          const hasMage = attackers.some(a => a.type === "mage");
          const hasAssassin = attackers.some(a => a.type === "assassin");
          if (hasMage) floatColor = "#c084fc";
          else if (hasAssassin) floatColor = "#f97316";
          else floatColor = "#f43f5e";

          const healers = updatedUnits.filter(
            (h) => !h.enemy && h.type === "healer" && h.lane === u.lane && h.x <= u.x && (u.x - h.x) <= h.range && now - h.lastAttackTime < 100
          );
          healers.forEach((h) => {
            healingReceived += h.dmg * 0.12;
          });

        } else {
          // Find player units attacking this enemy unit
          const attackers = updatedUnits.filter(
            (p) => !p.enemy && p.lane === u.lane && p.x < u.x && (u.x - p.x) <= p.range && now - p.lastAttackTime < 100
          );
          attackers.forEach((p) => {
            if (p.type !== "archer" && p.type !== "mage") {
              damageReceived += p.dmg * 0.12;
            }
          });

          const hasMage = attackers.some(p => p.type === "mage");
          const hasAssassin = attackers.some(p => p.type === "assassin");
          if (hasMage) floatColor = "#c084fc";
          else if (hasAssassin) floatColor = "#fbbf24";
          else floatColor = "#34d399";

          const healers = updatedUnits.filter(
            (h) => h.enemy && h.type === "healer" && h.lane === u.lane && h.x >= u.x && (h.x - u.x) <= h.range && now - h.lastAttackTime < 100
          );
          healers.forEach((h) => {
            healingReceived += h.dmg * 0.12;
          });
        }

        if (damageReceived > 0) {
          const roundedDmg = Math.round(damageReceived * 10) / 10;
          if (Math.random() < 0.22) {
            newFloatingTexts.push({
              id: Math.random().toString(),
              lane: u.lane,
              x: u.x,
              y: -20,
              text: `-${Math.round(roundedDmg)}`,
              color: floatColor
            });
            playHitSound();
          }
        }

        if (healingReceived > 0 && u.hp < u.maxHp) {
          const roundedHeal = Math.round(healingReceived * 10) / 10;
          if (Math.random() < 0.18) {
            newFloatingTexts.push({
              id: Math.random().toString(),
              lane: u.lane,
              x: u.x,
              y: -20,
              text: `+${Math.round(roundedHeal)} HP`,
              color: "#10b981"
            });
            playHealSound();
          }
        }

        return {
          ...u,
          hp: Math.min(u.maxHp, u.hp - damageReceived + healingReceived),
        };
      });

      // 4. Filter out dead units and reward gold
      const survivors = updatedUnits.filter((u) => {
        if (u.hp <= 0) {
          if (u.enemy) {
            goldEarned += 25;
            intelEarned += 8;
            newFloatingTexts.push({
              id: Math.random().toString(),
              lane: u.lane,
              x: u.x,
              y: -20,
              text: "+25 Золото",
              color: "#f59e0b"
            });
          }
          return false;
        }
        return true;
      });

      // 5. BATCh STATE UPDATES AT THE END OF TICK (NO NESTING!)
      setUnits(survivors);
      
      if (goldEarned !== 0) setGold((g) => g + goldEarned);
      if (aiGoldEarned !== 0) setAiGold((g) => g + aiGoldEarned);
      if (intelEarned !== 0) setIntelPoints((pts) => Math.min(100, pts + intelEarned));

      if (playerCastleDmg !== 0) {
        setPlayerCastleHp((prev) => {
          const next = prev - playerCastleDmg;
          if (next <= 0) {
            setIsGameOver(true);
            setVictory(false);
          }
          return Math.max(0, next);
        });
      }

      if (aiCastleDmg !== 0) {
        setAiCastleHp((prev) => {
          const next = prev - aiCastleDmg;
          if (next <= 0) {
            setIsGameOver(true);
            setVictory(true);
          }
          return Math.max(0, next);
        });
      }

      // 6. Optimally clean up and batch floating texts (Older than 800ms are cleared)
      setFloatingTexts((prev) => {
        const kept = prev.filter((t) => !t.createdAt || now - t.createdAt < 800);
        if (newFloatingTexts.length > 0) {
          const annotated = newFloatingTexts.map((nft) => ({
            ...nft,
            createdAt: now
          }));
          return [...kept, ...annotated];
        }
        return kept;
      });

      if (newProjectiles.length > 0) {
        setProjectiles((prev) => [...prev, ...newProjectiles]);
      }

    }, 50);

    return () => clearInterval(gameTick);
  }, [isGameOver, playerIncome, aiIncome]);

  // Trigger game over sounds when state changes
  useEffect(() => {
    if (isGameOver) {
      if (victory) {
        playVictorySound();
      } else {
        playDefeatSound();
      }
    }
  }, [isGameOver, victory]);

  const triggerFloatingText = (lane: number, x: number, text: string, color: string) => {
    setFloatingTexts((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        lane,
        x,
        y: Math.random() * 20 - 10,
        text,
        color,
        createdAt: Date.now()
      },
    ]);
  };

  // --- Continuous Enemy Spawning Heuristic (keeps the battle active) ---
  useEffect(() => {
    if (isGameOver) return;

    const baseSpawnInterval = setInterval(() => {
      // AI opponent evaluates which lane needs reinforcements
      // Count player units per lane
      const laneCounts = [0, 0, 0];
      unitsRef.current.forEach((u) => {
        if (!u.enemy) {
          laneCounts[u.lane] += 1;
        }
      });

      // Find lane with most player threat
      let targetLane = 0;
      let maxThreat = -1;
      for (let i = 0; i < 3; i++) {
        if (laneCounts[i] > maxThreat) {
          maxThreat = laneCounts[i];
          targetLane = i;
        }
      }

      // If threat is 0, pick a random lane
      if (maxThreat === 0) {
        targetLane = Math.floor(Math.random() * 3);
      }

      // Spend AI gold to spawn appropriate counters (using the full medieval roster!)
      const counterTypes: UnitType[] = ["tank", "sword", "archer", "mage", "assassin", "healer"];
      const chosenType = counterTypes[Math.floor(Math.random() * counterTypes.length)];
      const cost = UNIT_CONFIGS[chosenType].cost;

      setAiGold((g) => {
        if (g >= cost) {
          spawnUnit(chosenType, true, targetLane);
          return g - cost;
        }
        return g;
      });
    }, 3800);

    return () => clearInterval(baseSpawnInterval);
  }, [isGameOver]);

  // --- Adaptive Gemini AI Strategic Opponent Loop (Triggers every 13 seconds) ---
  useEffect(() => {
    if (isGameOver) return;

    const triggerStrategicOverlord = async () => {
      setIsThinkingOverlord(true);
      try {
        const payload = {
          gameState: {
            playerCastleHp: playerCastleHpRef.current,
            aiCastleHp: aiCastleHpRef.current,
            playerGold: Math.floor(goldRef.current),
            playerIncome: playerIncomeRef.current,
            aiGold: Math.floor(aiGoldRef.current),
            aiIncome: aiIncomeRef.current,
            playerUnits: unitsRef.current.filter((u) => !u.enemy).map((u) => ({ type: u.type, lane: u.lane, x: u.x, hp: u.hp })),
            aiUnits: unitsRef.current.filter((u) => u.enemy).map((u) => ({ type: u.type, lane: u.lane, x: u.x, hp: u.hp })),
          },
        };

        const response = await fetch("/api/ai/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Strategic API failed");
        const decision = await response.json();

        // 1. Set AI commentary
        setOverlordComment(decision.dialogue);
        
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages((prev) => [
          ...prev,
          {
            id: `overlord-${Date.now()}`,
            sender: "overlord",
            text: decision.dialogue,
            timestamp: timeStr,
          },
        ]);

        // 2. Execute Strategic actions
        const targetLane = decision.targetLane ?? Math.floor(Math.random() * 3);
        const unitType: UnitType = decision.recommendedUnitType ?? "sword";

        if (decision.action === "spawn_wave") {
          // Force spawn tactical wave
          spawnUnit(unitType, true, targetLane);
          spawnUnit(unitType, true, targetLane);
          
          setChatMessages((prev) => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              sender: "system",
              text: `Вражеский ИИ запустил волну на ${laneNames[targetLane]}!`,
              timestamp: timeStr,
            },
          ]);
        } else if (decision.action === "upgrade_income") {
          setAiIncome((inc) => inc + 2);
          setChatMessages((prev) => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              sender: "system",
              text: "Вражеский ИИ оптимизировал алгоритмы добычи (+2 к пассивному доходу ИИ)!",
              timestamp: timeStr,
            },
          ]);
        } else if (decision.action === "upgrade_castle") {
          setAiCastleHp((hp) => Math.min(MAX_CASTLE_HP, hp + 400));
          setChatMessages((prev) => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              sender: "system",
              text: "Вражеский ИИ перенаправил нанороботов на укрепление своих стен (+400 HP заграждений)!",
              timestamp: timeStr,
            },
          ]);
        }

      } catch (err) {
        console.error("Failed to run Gemini Overlord strategy:", err);
      } finally {
        setIsThinkingOverlord(false);
      }
    };

    // First trigger after 8 seconds, then every 13 seconds
    const initialDelay = setTimeout(() => {
      triggerStrategicOverlord();
    }, 8000);

    const interval = setInterval(triggerStrategicOverlord, 13000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isGameOver]);


  // --- Helper Spawn Function ---
  const spawnUnit = (type: UnitType, enemy: boolean = false, customLane?: number) => {
    const stats = UNIT_CONFIGS[type];
    const lane = customLane !== undefined ? customLane : Math.floor(Math.random() * 3);

    const newUnit: Unit = {
      id: Math.random().toString(),
      lane,
      type,
      enemy,
      x: enemy ? 95 : 5, // Start on respective castle edges
      hp: stats.hp,
      maxHp: stats.hp,
      dmg: stats.dmg,
      speed: stats.speed * (enemy ? 0.9 : 1.0), // AI units are slightly slower for fairness
      range: stats.range,
      isAttacking: false,
      lastAttackTime: 0,
    };

    setUnits((prev) => [...prev, newUnit]);
    playSpawnSound(type);
  };

  const handlePlayerSpawn = (type: UnitType) => {
    const stats = UNIT_CONFIGS[type];
    if (gold < stats.cost) return;

    setGold((g) => g - stats.cost);
    // Spawn exactly in the selectedLane!
    spawnUnit(type, false, selectedLane);
    triggerFloatingText(selectedLane, 5, `Сбор! ${stats.emoji}`, "#10b981");
  };

  const handleUpgradeIncome = () => {
    if (gold < 200) return;
    setGold((g) => g - 200);
    setPlayerIncome((inc) => inc + 2);
    // Show text effect on first lane
    triggerFloatingText(1, 5, "Шахта Расширена (+2 Доход)", "#10b981");
    playHealSound();
  };

  const handleUpgradeCastle = () => {
    if (gold < 300) return;
    setGold((g) => g - 300);
    setPlayerCastleHp((hp) => Math.min(MAX_CASTLE_HP, hp + 500));
    triggerFloatingText(1, 5, "Ремонт Стен (+500 HP)", "#10b981");
    playHealSound();
  };


  // --- Friendly AI Advisor Communication handler (Ask advice / Custom chat prompts) ---
  const handleAdvisorQuery = async (query: string) => {
    if (intelPoints < 35 || isThinkingAdvisor) return;

    setIsThinkingAdvisor(true);
    // Deduct intel points cost
    setIntelPoints((prev) => Math.max(0, prev - 35));

    // Register user's query locally in chat
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [
      ...prev,
      {
        id: `player-${Date.now()}`,
        sender: "player",
        text: query,
        timestamp: timeStr,
      },
    ]);

    try {
      const payload = {
        gameState: {
          playerCastleHp,
          aiCastleHp,
          playerGold: Math.floor(gold),
          playerIncome,
          aiGold: Math.floor(aiGold),
          playerUnits: units.filter((u) => !u.enemy).map((u) => ({ type: u.type, lane: u.lane, x: u.x, hp: u.hp })),
          aiUnits: units.filter((u) => u.enemy).map((u) => ({ type: u.type, lane: u.lane, x: u.x, hp: u.hp })),
        },
        userQuery: query,
      };

      const response = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Advisor API failed");
      const result = await response.json();

      // Show advice in terminal
      setChatMessages((prev) => [
        ...prev,
        {
          id: `advisor-${Date.now()}`,
          sender: "advisor",
          text: result.advice,
          timestamp: timeStr,
        },
      ]);

      // Apply the support gift!
      if (result.gift && result.gift.type !== "none") {
        const giftType = result.gift.type;
        const amt = result.gift.amount || 0;
        const ln = result.gift.lane !== undefined ? result.gift.lane : Math.floor(Math.random() * 3);

        setTimeout(() => {
          if (giftType === "gold") {
            setGold((g) => g + amt);
            setChatMessages((prev) => [
              ...prev,
              {
                id: `gift-gold-${Date.now()}`,
                sender: "system",
                text: `ИИ-Советник прислал материальную помощь: +${amt} золотых монет!`,
                timestamp: timeStr,
              },
            ]);
            triggerFloatingText(1, 5, `+${amt} Золото ИИ`, "#f59e0b");
          } else if (giftType === "castle_repair") {
            setPlayerCastleHp((hp) => Math.min(MAX_CASTLE_HP, hp + amt));
            setChatMessages((prev) => [
              ...prev,
              {
                id: `gift-repair-${Date.now()}`,
                sender: "system",
                text: `ИИ-Советник отремонтировал наши заграждения на +${amt} HP!`,
                timestamp: timeStr,
              },
            ]);
            triggerFloatingText(1, 5, `+${amt} Оборона ИИ`, "#10b981");
          } else if (giftType === "reinforcements") {
            // Spawn a powerful Knight/Defender
            spawnUnit("tank", false, ln);
            spawnUnit("sword", false, ln);
            setChatMessages((prev) => [
              ...prev,
              {
                id: `gift-spawn-${Date.now()}`,
                sender: "system",
                text: `ИИ-Советник телепортировал штурмовые подкрепления на ${laneNames[ln]}!`,
                timestamp: timeStr,
              },
            ]);
            triggerFloatingText(ln, 5, "Резервы ИИ!", "#c084fc");
          }
        }, 800);
      }

    } catch (err) {
      console.error("Advisor API error:", err);
      // Fallback
      setChatMessages((prev) => [
        ...prev,
        {
          id: `advisor-err-${Date.now()}`,
          sender: "advisor",
          text: "Извините, Командир. Связь временно прервана из-за электромагнитных помех вражеского ИИ. Тем не менее, держите оборону и готовьте контратаку!",
          timestamp: timeStr,
        },
      ]);
    } finally {
      setIsThinkingAdvisor(false);
    }
  };


  // --- Reset Game handler ---
  const handleRestart = () => {
    setUnits([]);
    setPlayerCastleHp(MAX_CASTLE_HP);
    setAiCastleHp(MAX_CASTLE_HP);
    setGold(300);
    setAiGold(300);
    setIntelPoints(30);
    setPlayerIncome(5);
    setAiIncome(5);
    setIsGameOver(false);
    setVictory(null);
    setOverlordComment("Твои деревянные стены не устоят перед моей стальной армией!");
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages([
      {
        id: `advisor-${Date.now()}`,
        sender: "advisor",
        text: "Симуляция перезапущена! Командный пункт в полной боевой готовности. Отдавайте приказы, Командир!",
        timestamp: timeStr,
      },
    ]);
  };

  const handleDownloadStandalone = () => {
    const htmlContent = exportStandaloneHTML();
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clash_of_gemini_offline.html";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans">
      
      {/* Title Header bar */}
      <header className="bg-slate-900 border-b border-slate-800 py-3 px-4 sm:px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-950/50">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-display font-bold tracking-tight text-slate-100 uppercase">
              AI Castle Defense
            </h1>
            <p className="text-[10px] font-mono text-slate-400">
              Adapting Tactical Gemini Engine • v2.5
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadStandalone}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all border border-amber-500/30 flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/20 animate-pulse hover:animate-none"
            title="Скачать игру одним файлом (.html)"
          >
            <Download className="w-3.5 h-3.5" />
            Скачать игру (.html)
          </button>

          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 text-slate-300 hover:bg-slate-750 transition-all border border-slate-700/50 flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showGuide ? "Скрыть Руководство" : "Инструкции"}
          </button>
          
          <button
            onClick={handleRestart}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50 cursor-pointer"
            title="Перезапустить симуляцию"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Battle lanes & Control Deck */}
        <div className="col-span-1 lg:col-span-2 space-y-4 flex flex-col">
          
          {/* Quick Guide overlay */}
          {showGuide && (
            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 text-xs leading-relaxed space-y-2 text-indigo-200">
              <h3 className="font-display font-semibold text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Инструкция Главнокомандующего:
              </h3>
              <p>
                1. ⚔️ <strong>Обучайте войска</strong> на нижней панели. Ваши воины спавнятся на вашей базе слева и идут направо штурмовать Базу ИИ.
              </p>
              <p>
                2. 📈 <strong>Улучшайте экономику</strong>: Рудники золота дают пассивный доход каждую секунду. Тратьте золото с умом.
              </p>
              <p>
                3. 🧠 <strong>Задействуйте ИИ-Советника</strong>: Победы ваших воинов приносят <strong>Тактические Данные</strong>. Используйте их в чате справа для получения мощных даров (золота, бесплатных армий или мгновенного ремонта)!
              </p>
              <p>
                4. ⚡ <strong>Реагируйте на Врага</strong>: Каждые 13 секунд Вражеский ИИ-Сверхразум анализирует поле боя и наносит разрушительные контрудары или спавнит волны!
              </p>
            </div>
          )}

          {/* AI Overlord Dialogue Bubble above the battlefield */}
          <div className="bg-slate-900 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-rose-500/5 to-transparent pointer-events-none" />
            <div className="w-8 h-8 rounded-full bg-rose-950/80 border border-rose-500/60 flex items-center justify-center shrink-0 text-rose-400 shadow-md">
              <AlertCircle className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-rose-400 tracking-wider uppercase block mb-0.5">
                УГРОЗА: Вражеский ИИ Сверхразум
              </span>
              <p className="text-xs italic text-slate-300 leading-normal">
                &ldquo;{overlordComment}&rdquo;
              </p>
            </div>
            {isThinkingOverlord && (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center text-rose-400 text-[10px] font-mono tracking-wider gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Враг рассчитывает траекторию...
              </div>
            )}
          </div>

          {/* Lanes Battlefield */}
          <div className="flex-1 space-y-1">
            {laneNames.map((name, idx) => (
              <LaneView
                key={idx}
                laneIndex={idx}
                laneName={name}
                playerCastleHp={playerCastleHp}
                aiCastleHp={aiCastleHp}
                maxCastleHp={MAX_CASTLE_HP}
                units={units}
                floatingTexts={floatingTexts.filter((t) => t.lane === idx)}
                isSelected={selectedLane === idx}
                onSelect={() => setSelectedLane(idx)}
                projectiles={projectiles}
              />
            ))}
          </div>

          {/* Player Command Controller Deck */}
          <ControlPanel
            gold={gold}
            income={playerIncome}
            playerCastleHp={playerCastleHp}
            maxCastleHp={MAX_CASTLE_HP}
            onSpawnUnit={handlePlayerSpawn}
            onUpgradeIncome={handleUpgradeIncome}
            onUpgradeCastle={handleUpgradeCastle}
            incomeUpgradeCost={200}
            castleUpgradeCost={300}
            selectedLane={selectedLane}
          />
        </div>

        {/* Right 1 Column: Chat terminal with Advisor and Overlord */}
        <div className="col-span-1 flex flex-col h-full">
          <ChatTerminal
            messages={chatMessages}
            intelPoints={intelPoints}
            onSendQuery={handleAdvisorQuery}
            isThinkingAdvisor={isThinkingAdvisor}
            isThinkingOverlord={isThinkingOverlord}
          />
        </div>

      </main>

      {/* Game Over modal backdrop overlay */}
      {isGameOver && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-5 animate-scale-in border-slate-700/60">
            <div className="flex justify-center">
              <div className={`p-4 rounded-full border-2 ${
                victory
                  ? "bg-emerald-950 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/50 animate-bounce"
                  : "bg-rose-950 border-rose-500 text-rose-400 shadow-lg shadow-rose-950/50 animate-pulse"
              }`}>
                {victory ? <Trophy className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className={`text-2xl font-display font-bold uppercase tracking-wider ${victory ? "text-emerald-400" : "text-rose-400"}`}>
                {victory ? "ПОБЕДА!" : "ПОРАЖЕНИЕ!"}
              </h2>
              <p className="text-xs font-sans text-slate-400 leading-relaxed px-2">
                {victory
                  ? "Потрясающая победа! Вы превзошли вражеский ИИ Сверхразум тактически и разрушили его опорный пункт. Ваши стратегические способности превосходны!"
                  : "Вражеский ИИ взломал ваши защитные системы и разрушил замок. Не унывайте, Командир, это была лишь симуляция!"}
              </p>
            </div>

            <button
              onClick={handleRestart}
              className={`w-full py-2.5 px-4 rounded-xl font-display font-bold text-sm uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer ${
                victory
                  ? "bg-emerald-600 hover:bg-emerald-500 text-slate-100 shadow-emerald-950/40"
                  : "bg-rose-600 hover:bg-rose-500 text-slate-100 shadow-rose-950/40"
              }`}
            >
              Начать Заново
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
