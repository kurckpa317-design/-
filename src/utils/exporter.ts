/**
 * Standalone Offline HTML exporter for the Clash of Gemini Game
 * Packages the entire optimized game into a single high-performance .html file
 */
export function exportStandaloneHTML(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clash of Gemini - Offline Edition</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    }
                }
            }
        }
    </script>
    <!-- React & ReactDOM CDN -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <!-- Babel for on-the-fly JSX compilation (super safe for offline single-file apps) -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #020617;
            color: #f1f5f9;
            user-select: none;
            overflow-x: hidden;
        }
        @keyframes floatDamage {
            0% { transform: translateY(0) scale(0.8); opacity: 1; }
            100% { transform: translateY(-45px) scale(1.2); opacity: 0; }
        }
        .damage-popup {
            animation: floatDamage 0.6s ease-out forwards;
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef } = React;

        // --- Sound Synthesizer via Web Audio API (Runs perfectly offline without external assets) ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playSynthSound(freqStart, freqEnd, duration, type = "sine", volume = 0.1) {
            try {
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = type;
                osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
                if (freqEnd !== freqStart) {
                    osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
                }
                
                gain.gain.setValueAtTime(volume, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch(e) {
                console.log("Audio play blocked/unsupported", e);
            }
        }

        const SOUNDS = {
            spawn: (type) => {
                if (type === 'sword') playSynthSound(150, 300, 0.15, 'triangle', 0.12);
                else if (type === 'archer') playSynthSound(400, 800, 0.12, 'sine', 0.1);
                else if (type === 'tank') playSynthSound(100, 200, 0.25, 'sawtooth', 0.08);
                else if (type === 'mage') playSynthSound(600, 1200, 0.2, 'sine', 0.12);
                else if (type === 'assassin') playSynthSound(300, 150, 0.1, 'triangle', 0.1);
                else playSynthSound(500, 900, 0.3, 'sine', 0.15); // healer
            },
            hit: () => playSynthSound(220, 80, 0.08, 'triangle', 0.15),
            castleDamage: () => playSynthSound(80, 40, 0.4, 'sawtooth', 0.25),
            heal: () => playSynthSound(440, 880, 0.25, 'sine', 0.12),
            towerShoot: () => playSynthSound(350, 700, 0.1, 'sine', 0.08),
            victory: () => {
                playSynthSound(261.63, 523.25, 0.15, 'sine', 0.15);
                setTimeout(() => playSynthSound(329.63, 659.25, 0.15, 'sine', 0.15), 150);
                setTimeout(() => playSynthSound(392.00, 784.00, 0.15, 'sine', 0.15), 300);
                setTimeout(() => playSynthSound(523.25, 1046.50, 0.4, 'sine', 0.2), 450);
            },
            defeat: () => {
                playSynthSound(196.00, 98.00, 0.3, 'sawtooth', 0.2);
                setTimeout(() => playSynthSound(164.81, 82.41, 0.4, 'sawtooth', 0.2), 300);
            }
        };

        const UNIT_CONFIGS = {
            sword: { hp: 120, dmg: 20, speed: 0.15, range: 4, cost: 50, name: "Рыцарь", emoji: "💂‍♂️", description: "Надежный воин ближнего боя с хорошим уроном." },
            archer: { hp: 75, dmg: 12, speed: 0.18, range: 22, cost: 75, name: "Эльфийская Лучница", emoji: "🧝‍♀️", description: "Стреляет быстрыми стрелами по врагам издалека. Очень эффективна на дистанции!" },
            tank: { hp: 300, dmg: 15, speed: 0.08, range: 4, cost: 150, name: "Защитник", emoji: "🛡️", description: "Огромное здоровье, сдерживает волны врагов." },
            mage: { hp: 90, dmg: 35, speed: 0.11, range: 26, cost: 110, name: "Маг", emoji: "🧙‍♂️", description: "Наносит высокий урон магическими снарядами на дистанции." },
            assassin: { hp: 100, dmg: 45, speed: 0.26, range: 4, cost: 95, name: "Убийца", emoji: "🥷", description: "Сверхскоростной скрытный воин с огромным уроном вблизи." },
            healer: { hp: 110, dmg: 18, speed: 0.13, range: 16, cost: 100, name: "Целитель", emoji: "🧚‍♀️", description: "Лечит союзников впереди себя на линии во время боя." }
        };

        // --- Custom Beautiful Castle Component ---
        function Castle({ side, hp, maxHp, name }) {
            const hpPercentage = Math.max(0, (hp / maxHp) * 100);
            const isLowHp = hpPercentage < 30;
            const isPlayer = side === "left";

            return (
                <div className={\`absolute top-0 bottom-0 w-24 flex flex-col justify-between items-center z-10 transition-all duration-300 \${
                    isPlayer
                        ? "left-0 bg-gradient-to-r from-emerald-950/30 via-slate-950/20 to-transparent border-r border-emerald-500/10"
                        : "right-0 bg-gradient-to-l from-rose-950/30 via-slate-950/20 to-transparent border-l border-rose-500/10"
                }\`}>
                    {/* Watchtower platform */}
                    <div className="w-full flex flex-col items-center pt-2">
                        {/* Crenellations Row */}
                        <div className="flex gap-1 justify-center w-16 h-2">
                            <div className={\`w-3 h-2 rounded-t-sm \${isPlayer ? "bg-emerald-850 border border-emerald-500/40" : "bg-rose-850 border border-rose-500/40"}\`} />
                            <div className="w-3 h-2 bg-transparent" />
                            <div className={\`w-3 h-2 rounded-t-sm \${isPlayer ? "bg-emerald-850 border border-emerald-500/40" : "bg-rose-850 border border-rose-500/40"}\`} />
                        </div>

                        {/* Watchtower */}
                        <div className={\`w-16 h-9 rounded-md bg-slate-950 border-2 flex flex-col items-center justify-center relative shadow-xl \${
                            isPlayer ? "border-emerald-500/60 shadow-emerald-950/50" : "border-rose-500/60 shadow-rose-950/50"
                        }\`}>
                            <div className="flex items-center gap-0.5 animate-bounce">
                                <span className="text-xs">🧝‍♀️</span>
                                <span className="text-[9px]">🏹</span>
                            </div>
                            <div className={\`absolute -bottom-2 px-1.5 py-0.5 rounded-md text-[6px] font-mono font-extrabold tracking-widest bg-slate-950 border \${
                                isPlayer ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
                            }\`}>
                                {isPlayer ? "ГВАРДИЯ" : "АВТО-ЛУЧНИК"}
                            </div>
                        </div>
                    </div>

                    {/* Main Fortress Tower Body */}
                    <div className="relative flex flex-col items-center justify-center my-auto px-2 w-full">
                        <div className={\`p-3 rounded-xl border-2 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 w-20 bg-slate-950 \${
                            isPlayer ? "border-emerald-500 text-emerald-400" : "border-rose-500 text-rose-400"
                        }\`}>
                            <span className="text-xl">{isPlayer ? "🛡️" : "🔥"}</span>
                            <span className="text-[9px] font-bold mt-1 uppercase text-center text-slate-100 whitespace-nowrap overflow-hidden">
                                {name}
                            </span>
                            <div className={\`absolute -bottom-3 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold border bg-slate-950 \${
                                isPlayer ? "text-emerald-300 border-emerald-500" : "text-rose-300 border-rose-500"
                            }\`}>
                                {Math.ceil(hp)} HP
                            </div>
                        </div>
                    </div>

                    {/* Base Foundations */}
                    <div className="w-full flex flex-col items-center pb-2">
                        <div className="w-16 bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                            <div className={\`h-full transition-all duration-300 \${isLowHp ? "bg-red-500 animate-pulse" : isPlayer ? "bg-emerald-500" : "bg-rose-500"}\`}
                                 style={{ width: \`\${hpPercentage}%\` }} />
                        </div>
                    </div>
                </div>
            );
        }

        // --- Main Game App ---
        function App() {
            const [units, setUnits] = useState([]);
            const [projectiles, setProjectiles] = useState([]);
            const [floatingTexts, setFloatingTexts] = useState([]);
            const [selectedLane, setSelectedLane] = useState(0);

            // Resources
            const [gold, setGold] = useState(150);
            const [playerIncome, setPlayerIncome] = useState(4);
            const [aiGold, setAiGold] = useState(150);
            const [aiIncome, setAiIncome] = useState(4);
            const [intelPoints, setIntelPoints] = useState(0);

            // Castle HP
            const [playerCastleHp, setPlayerCastleHp] = useState(2000);
            const [aiCastleHp, setAiCastleHp] = useState(2000);

            // Game state
            const [isGameOver, setIsGameOver] = useState(false);
            const [victory, setVictory] = useState(null);

            // Chat Messages
            const [chatMessages, setChatMessages] = useState([
                { id: "1", sender: "advisor", text: "Мой Лорд! Замки находятся под угрозой! Нанимайте эльфийских лучниц и рыцарей для защиты линий!", timestamp: "Вводный" },
                { id: "2", sender: "overlord", text: "Ах, смертный! Мои легионы Тьмы уничтожат твои башни! Готовься к поражению!", timestamp: "Вводный" }
            ]);

            // Upgrades costs
            const incomeUpgradeCost = 200;
            const castleUpgradeCost = 300;

            const lanes = ["Верхний Лес 🌲", "Средний Ров 🕳️", "Нижние Скалы 🪨"];

            // Refs for simulation loop
            const unitsRef = useRef([]);
            const playerTowerLastShoot = useRef([0, 0, 0]);
            const aiTowerLastShoot = useRef([0, 0, 0]);

            useEffect(() => {
                unitsRef.current = units;
            }, [units]);

            // --- Game Physics & Battle Tick Loop ---
            useEffect(() => {
                if (isGameOver) return;

                const gameInterval = setInterval(() => {
                    const now = Date.now();
                    const dt = 0.05;

                    let goldEarned = playerIncome * dt;
                    let aiGoldEarned = aiIncome * dt;
                    let intelEarned = 0;
                    let playerCastleDmg = 0;
                    let aiCastleDmg = 0;

                    const newFloatingTexts = [];
                    const newProjectiles = [];

                    let currentUnits = [...unitsRef.current];

                    // 1. Update Projectiles
                    setProjectiles((prev) => {
                        const remaining = [];
                        prev.forEach((p) => {
                            let newX = p.x;
                            let isHit = false;
                            const speed = 4.5;

                            if (!p.enemy) {
                                newX += speed;
                                if (newX >= p.targetX || newX >= 100) isHit = true;
                            } else {
                                newX -= speed;
                                if (newX <= p.targetX || newX <= 0) isHit = true;
                            }

                            if (isHit) {
                                let hitApplied = false;
                                currentUnits = currentUnits.map((u) => {
                                    if (u.lane === p.lane && u.enemy === !p.enemy) {
                                        if (Math.abs(u.x - p.targetX) <= 12 && !hitApplied) {
                                            hitApplied = true;
                                            SOUNDS.hit();

                                            const damage = p.type === 'mage' ? 25 : p.type === 'archer' ? 15 : 20;

                                            newFloatingTexts.push({
                                                id: Math.random().toString(),
                                                lane: p.lane,
                                                x: p.targetX,
                                                text: p.type === 'mage' ? \`🔮 -\${damage}\` : \`🏹 -\${damage}\`,
                                                color: p.enemy ? "#f43f5e" : "#10b981",
                                                createdAt: now
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

                    // 2. Towers automated attacks
                    for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
                        const laneEnemies = currentUnits.filter((u) => u.enemy && u.lane === laneIdx);
                        if (laneEnemies.length > 0) {
                            const closest = laneEnemies.reduce((cls, cur) => cur.x < cls.x ? cur : cls, laneEnemies[0]);
                            if (now - playerTowerLastShoot.current[laneIdx] >= 1800) {
                                playerTowerLastShoot.current[laneIdx] = now;
                                SOUNDS.towerShoot();
                                newProjectiles.push({
                                    id: Math.random().toString(),
                                    lane: laneIdx,
                                    x: 6,
                                    targetX: closest.x,
                                    enemy: false,
                                    type: "tower"
                                });
                            }
                        }

                        const lanePlayers = currentUnits.filter((u) => !u.enemy && u.lane === laneIdx);
                        if (lanePlayers.length > 0) {
                            const closest = lanePlayers.reduce((cls, cur) => cur.x > cls.x ? cur : cls, lanePlayers[0]);
                            if (now - aiTowerLastShoot.current[laneIdx] >= 1800) {
                                aiTowerLastShoot.current[laneIdx] = now;
                                SOUNDS.towerShoot();
                                newProjectiles.push({
                                    id: Math.random().toString(),
                                    lane: laneIdx,
                                    x: 94,
                                    targetX: closest.x,
                                    enemy: true,
                                    type: "tower"
                                });
                            }
                        }
                    }

                    // 3. Unit Physics and Movement
                    let updatedUnits = currentUnits.map((u) => {
                        let isAttacking = false;
                        let newX = u.x;

                        if (!u.enemy) {
                            const enemies = currentUnits.filter((e) => e.enemy && e.lane === u.lane && e.x > u.x);
                            let closest = null;
                            let minDist = Infinity;
                            for (const e of enemies) {
                                if (e.x - u.x < minDist) {
                                    minDist = e.x - u.x;
                                    closest = e;
                                }
                            }

                            const friendlyAhead = u.type === "healer" && currentUnits.some((p) => !p.enemy && p.lane === u.lane && p.x > u.x && (p.x - u.x) <= 8);

                            if (friendlyAhead) {
                                isAttacking = true;
                            } else if (closest && minDist <= u.range) {
                                isAttacking = true;
                                if (now - u.lastAttackTime >= 1000) {
                                    u.lastAttackTime = now;
                                    if (u.type === "archer" || u.type === "mage") {
                                        SOUNDS.towerShoot();
                                        newProjectiles.push({
                                            id: Math.random().toString(),
                                            lane: u.lane,
                                            x: u.x,
                                            targetX: closest.x,
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
                                        SOUNDS.castleDamage();
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
                                                text: \`-\${u.dmg}\`,
                                                color: "#f43f5e",
                                                createdAt: now
                                            });
                                        }
                                    }
                                }
                            } else {
                                newX += u.speed;
                            }
                        } else {
                            const players = currentUnits.filter((p) => !p.enemy && p.lane === u.lane && p.x < u.x);
                            let closest = null;
                            let minDist = Infinity;
                            for (const p of players) {
                                if (u.x - p.x < minDist) {
                                    minDist = u.x - p.x;
                                    closest = p;
                                }
                            }

                            const friendlyAhead = u.type === "healer" && currentUnits.some((p) => p.enemy && p.lane === u.lane && p.x < u.x && (u.x - p.x) <= 8);

                            if (friendlyAhead) {
                                isAttacking = true;
                            } else if (closest && minDist <= u.range) {
                                isAttacking = true;
                                if (now - u.lastAttackTime >= 1000) {
                                    u.lastAttackTime = now;
                                    if (u.type === "archer" || u.type === "mage") {
                                        SOUNDS.towerShoot();
                                        newProjectiles.push({
                                            id: Math.random().toString(),
                                            lane: u.lane,
                                            x: u.x,
                                            targetX: closest.x,
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
                                        SOUNDS.castleDamage();
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
                                                text: \`-\${u.dmg}\`,
                                                color: "#10b981",
                                                createdAt: now
                                            });
                                        }
                                    }
                                }
                            } else {
                                newX -= u.speed;
                            }
                        }

                        return { ...u, x: Math.min(100, Math.max(0, newX)), isAttacking };
                    });

                    // 4. Resolve melee & healing combat (healers and continuous melee hits)
                    updatedUnits = updatedUnits.map((u) => {
                        let damageReceived = 0;
                        let healingReceived = 0;

                        if (!u.enemy) {
                            const attackers = updatedUnits.filter((e) => e.enemy && e.lane === u.lane && e.x > u.x && (e.x - u.x) <= e.range && now - e.lastAttackTime < 100);
                            attackers.forEach((a) => {
                                if (a.type !== "archer" && a.type !== "mage") {
                                    damageReceived += a.dmg * 0.12;
                                }
                            });

                            const healers = updatedUnits.filter((h) => !h.enemy && h.type === "healer" && h.lane === u.lane && h.x <= u.x && (u.x - h.x) <= h.range && now - h.lastAttackTime < 100);
                            healers.forEach((h) => {
                                healingReceived += h.dmg * 0.12;
                            });
                        } else {
                            const attackers = updatedUnits.filter((p) => !p.enemy && p.lane === u.lane && p.x < u.x && (u.x - p.x) <= p.range && now - p.lastAttackTime < 100);
                            attackers.forEach((p) => {
                                if (p.type !== "archer" && p.type !== "mage") {
                                    damageReceived += p.dmg * 0.12;
                                }
                            });

                            const healers = updatedUnits.filter((h) => h.enemy && h.type === "healer" && h.lane === u.lane && h.x >= u.x && (h.x - u.x) <= h.range && now - h.lastAttackTime < 100);
                            healers.forEach((h) => {
                                healingReceived += h.dmg * 0.12;
                            });
                        }

                        if (damageReceived > 0 && Math.random() < 0.22) {
                            newFloatingTexts.push({
                                id: Math.random().toString(),
                                lane: u.lane,
                                x: u.x,
                                text: \`-\${Math.round(damageReceived)}\`,
                                color: u.enemy ? "#f43f5e" : "#fbbf24",
                                createdAt: now
                            });
                            SOUNDS.hit();
                        }

                        if (healingReceived > 0 && u.hp < u.maxHp && Math.random() < 0.18) {
                            newFloatingTexts.push({
                                id: Math.random().toString(),
                                lane: u.lane,
                                x: u.x,
                                text: \`+\${Math.round(healingReceived)} HP\`,
                                color: "#10b981",
                                createdAt: now
                            });
                            SOUNDS.heal();
                        }

                        return { ...u, hp: Math.min(u.maxHp, u.hp - damageReceived + healingReceived) };
                    });

                    // 5. Survivors & Dead unit rewards
                    const survivors = updatedUnits.filter((u) => {
                        if (u.hp <= 0) {
                            if (u.enemy) {
                                goldEarned += 25;
                                intelEarned += 8;
                                newFloatingTexts.push({
                                    id: Math.random().toString(),
                                    lane: u.lane,
                                    x: u.x,
                                    text: "+25 Золото",
                                    color: "#f59e0b",
                                    createdAt: now
                                });
                            }
                            return false;
                        }
                        return true;
                    });

                    // Batch update states cleanly
                    setUnits(survivors);
                    if (goldEarned !== 0) setGold((g) => g + goldEarned);
                    if (aiGoldEarned !== 0) setAiGold((g) => g + aiGoldEarned);
                    if (intelEarned !== 0) setIntelPoints((pts) => Math.min(100, pts + intelEarned));

                    if (playerCastleDmg > 0) {
                        setPlayerCastleHp((prev) => {
                            const next = prev - playerCastleDmg;
                            if (next <= 0) {
                                setIsGameOver(true);
                                setVictory(false);
                                SOUNDS.defeat();
                            }
                            return Math.max(0, next);
                        });
                    }

                    if (aiCastleDmg > 0) {
                        setAiCastleHp((prev) => {
                            const next = prev - aiCastleDmg;
                            if (next <= 0) {
                                setIsGameOver(true);
                                setVictory(true);
                                SOUNDS.victory();
                            }
                            return Math.max(0, next);
                        });
                    }

                    // Floating text cleanup (older than 1000ms)
                    setFloatingTexts((prev) => {
                        const kept = prev.filter((t) => now - t.createdAt < 1000);
                        return [...kept, ...newFloatingTexts];
                    });

                    if (newProjectiles.length > 0) {
                        setProjectiles((prev) => [...prev, ...newProjectiles]);
                    }

                }, 50);

                return () => clearInterval(gameInterval);
            }, [isGameOver, playerIncome, aiIncome]);

            // --- AI Enemy Spawner Loop (Dynamic & Adaptive) ---
            useEffect(() => {
                if (isGameOver) return;

                const aiInterval = setInterval(() => {
                    const lanesCount = [0, 0, 0];
                    unitsRef.current.forEach((u) => {
                        if (!u.enemy) lanesCount[u.lane] += 1;
                    });

                    // Find lane with most player units
                    let bestLane = 0;
                    let maxCount = -1;
                    for (let i = 0; i < 3; i++) {
                        if (lanesCount[i] > maxCount) {
                            maxCount = lanesCount[i];
                            bestLane = i;
                        }
                    }

                    // Choose an appropriate counter unit
                    const types = ["sword", "tank", "assassin", "archer", "healer", "mage"];
                    const randomType = types[Math.floor(Math.random() * types.length)];
                    const stats = UNIT_CONFIGS[randomType];

                    if (aiGold >= stats.cost) {
                        setAiGold((g) => g - stats.cost);
                        const newId = Math.random().toString();
                        const newEnemy = {
                            id: newId,
                            lane: bestLane,
                            type: randomType,
                            enemy: true,
                            x: 95,
                            hp: stats.hp,
                            maxHp: stats.hp,
                            dmg: stats.dmg,
                            speed: stats.speed * 0.9,
                            range: stats.range,
                            isAttacking: false,
                            lastAttackTime: 0
                        };
                        setUnits((prev) => [...prev, newEnemy]);
                        SOUNDS.spawn(randomType);
                    }
                }, 3800);

                return () => clearInterval(aiInterval);
            }, [isGameOver, aiGold]);

            // --- Offline AI Advisors Strategic Dialog Loop ---
            useEffect(() => {
                if (isGameOver) return;

                const dialogueInterval = setInterval(() => {
                    // Decide dialog based on current lane pressure
                    const unitsArr = unitsRef.current;
                    const pCount = unitsArr.filter(u => !u.enemy).length;
                    const eCount = unitsArr.filter(u => u.enemy).length;

                    let advText = "";
                    let ovrText = "";

                    if (eCount > pCount + 2) {
                        advText = "Мой Лорд! Врагов слишком много! Мы должны расширить рудники и нанять защитников!";
                        ovrText = "Ха-ха-ха! Мои полчища разорвут ваши башни на куски!";
                    } else if (pCount > eCount + 2) {
                        advText = "Отличный штурм! Наши воины теснят врагов! Давите изо всех сил!";
                        ovrText = "Ничтожества! Немедленно защищайте ворота цитадели!";
                    } else {
                        advText = "Битва идет на равных. Мой Лорд, выберите линию и отправьте туда превосходящие силы!";
                        ovrText = "Вы держитесь неплохо... Но это лишь отсрочка вашей гибели!";
                    }

                    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    setChatMessages((prev) => [
                        ...prev,
                        { id: Math.random().toString(), sender: "advisor", text: advText, timestamp },
                        { id: Math.random().toString(), sender: "overlord", text: ovrText, timestamp }
                    ].slice(-15)); // keep last 15 messages for high performance
                }, 13000);

                return () => clearInterval(dialogueInterval);
            }, [isGameOver]);

            // Spawn action
            const handleSpawnUnit = (type) => {
                const stats = UNIT_CONFIGS[type];
                if (gold < stats.cost) return;

                setGold((g) => g - stats.cost);
                const newId = Math.random().toString();
                const newUnit = {
                    id: newId,
                    lane: selectedLane,
                    type,
                    enemy: false,
                    x: 5,
                    hp: stats.hp,
                    maxHp: stats.hp,
                    dmg: stats.dmg,
                    speed: stats.speed,
                    range: stats.range,
                    isAttacking: false,
                    lastAttackTime: 0
                };
                setUnits((prev) => [...prev, newUnit]);
                SOUNDS.spawn(type);

                // Add text floating
                setFloatingTexts((prev) => [
                    ...prev,
                    { id: Math.random().toString(), lane: selectedLane, x: 5, text: \`Призыв: \${stats.emoji}\`, color: "#10b981", createdAt: Date.now() }
                ]);
            };

            const handleUpgradeIncome = () => {
                if (gold < incomeUpgradeCost) return;
                setGold((g) => g - incomeUpgradeCost);
                setPlayerIncome((inc) => inc + 2);
                SOUNDS.heal();
                setFloatingTexts((prev) => [
                    ...prev,
                    { id: Math.random().toString(), lane: 1, x: 5, text: "Шахта расширена (+2 золота/сек)", color: "#10b981", createdAt: Date.now() }
                ]);
            };

            const handleUpgradeCastle = () => {
                if (gold < castleUpgradeCost) return;
                setGold((g) => g - castleUpgradeCost);
                setPlayerCastleHp((hp) => Math.min(2000, hp + 500));
                SOUNDS.heal();
                setFloatingTexts((prev) => [
                    ...prev,
                    { id: Math.random().toString(), lane: 1, x: 5, text: "Замок укреплен (+500 HP)", color: "#10b981", createdAt: Date.now() }
                ]);
            };

            const handleRestart = () => {
                setUnits([]);
                setProjectiles([]);
                setFloatingTexts([]);
                setGold(150);
                setAiGold(150);
                setPlayerIncome(4);
                setAiIncome(4);
                setIntelPoints(0);
                setPlayerCastleHp(2000);
                setAiCastleHp(2000);
                setIsGameOver(false);
                setVictory(null);
                setChatMessages([
                    { id: "1", sender: "advisor", text: "Сражение началось заново! Мудро распределяйте силы по трем линиям!", timestamp: "Старт" }
                ]);
            };

            return (
                <div class="flex flex-col min-h-screen">
                    {/* Header */}
                    <header class="bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center justify-between shadow-xl">
                        <div class="flex items-center gap-2.5">
                            <span class="text-2xl animate-spin" style={{ animationDuration: '8s' }}>💫</span>
                            <div>
                                <h1 class="text-lg font-black tracking-tight text-white flex items-center gap-2">
                                    CLASH OF GEMINI <span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/10">ОФФЛАЙН-ВЕРСИЯ</span>
                                </h1>
                                <p class="text-[10px] text-slate-400 font-medium">Полноценная игра без лагов прямо из файла!</p>
                            </div>
                        </div>

                        <button onClick={handleRestart} class="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all font-mono font-bold text-xs flex items-center gap-1.5 border border-slate-700/50">
                            <span>🔄</span> Сброс
                        </button>
                    </header>

                    {/* Main Layout */}
                    <main class="flex-grow max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Battle lanes */}
                        <div class="lg:col-span-2 space-y-4">
                            {lanes.map((laneName, laneIndex) => {
                                const laneUnits = units.filter((u) => u.lane === laneIndex);
                                const isSelected = selectedLane === laneIndex;

                                return (
                                    <div key={laneIndex} onClick={() => setSelectedLane(laneIndex)}
                                         class={\`flex items-center gap-3 w-full transition-all duration-300 cursor-pointer \${isSelected ? "scale-[1.01]" : "opacity-90"}\`}>
                                        
                                        {/* Selector badge left */}
                                        <div class={\`w-20 h-32 rounded-xl flex flex-col justify-center items-center gap-1 border transition-all duration-300 shadow-md \${
                                            isSelected ? "bg-emerald-950/40 border-emerald-500 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-500"
                                        }\`}>
                                            <span class="text-lg">{isSelected ? "🎯" : "⚪"}</span>
                                            <span class="text-[8px] font-mono font-bold uppercase text-center leading-tight">
                                                Линия {laneIndex + 1}<br/>
                                                <span class="text-[7px] text-slate-400">{isSelected ? "АКТИВНА" : "ВЫБРАТЬ"}</span>
                                            </span>
                                        </div>

                                        {/* Lane Battlefield */}
                                        <div class={\`flex-1 relative h-32 bg-slate-900/60 rounded-xl border overflow-hidden flex items-center transition-all duration-300 \${
                                            isSelected ? "border-emerald-500/40 bg-slate-900/80 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]" : "border-slate-800"
                                        }\`}>
                                            <div class="absolute left-20 right-20 h-0.5 border-t border-dashed border-slate-700/30 top-1/2" />
                                            
                                            {/* Lane Label */}
                                            <div class="absolute top-1.5 left-1/2 -translate-x-1/2 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-full z-10 text-[8px] uppercase tracking-wider text-slate-400 font-bold">
                                                {laneName}
                                            </div>

                                            {/* Castle towers */}
                                            <Castle side="left" hp={playerCastleHp} maxHp={2000} name="Твой Замок" />
                                            <Castle side="right" hp={aiCastleHp} maxHp={2000} name="Трон ИИ" />

                                            {/* Units */}
                                            <div class="absolute left-20 right-20 top-0 bottom-0 overflow-hidden">
                                                {laneUnits.map((u) => {
                                                    const hpPercent = Math.max(0, (u.hp / u.maxHp) * 100);
                                                    return (
                                                        <div key={u.id} class="absolute top-1/2 -translate-y-1/2 transition-all duration-75 ease-linear"
                                                             style={{ left: \`\${u.x}%\`, transform: "translate(-50%, -50%)" }}>
                                                            
                                                            <div class={\`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 bg-slate-950 shadow-lg \${
                                                                u.enemy ? "border-rose-500 text-rose-300" : "border-emerald-500 text-emerald-300"
                                                            }\`}>
                                                                <span class={u.isAttacking ? "animate-bounce" : ""}>
                                                                    {UNIT_CONFIGS[u.type].emoji}
                                                                </span>

                                                                {/* HP tiny bar */}
                                                                <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-6 bg-slate-950 h-1 rounded-full border border-slate-800 overflow-hidden">
                                                                    <div class={\`h-full \${u.enemy ? "bg-rose-500" : "bg-emerald-500"}\`} style={{ width: \`\${hpPercent}%\` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Projectiles */}
                                                {projectiles.filter((p) => p.lane === laneIndex).map((p) => (
                                                    <div key={p.id} class="absolute top-[45%] -translate-y-1/2 text-sm z-30 select-none pointer-events-none filter drop-shadow-md"
                                                         style={{ left: \`\${p.x}%\`, transform: \`translate(-50%, -50%) \${p.enemy ? "scaleX(-1)" : "scaleX(1)"}\` }}>
                                                        {p.type === 'mage' ? '🔮' : '🏹'}
                                                    </div>
                                                ))}

                                                {/* Floating Texts */}
                                                {floatingTexts.filter((t) => t.lane === laneIndex).map((t) => (
                                                    <div key={t.id} class="absolute damage-popup font-mono font-bold text-[10px] tracking-tight z-50 pointer-events-none bg-slate-950/80 px-1 py-0.2 rounded border border-slate-800"
                                                         style={{ left: \`\${t.x}%\`, top: "35%", color: t.color }}>
                                                        {t.text}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Control Panel */}
                            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
                                {/* Resources */}
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div class="bg-slate-950 border border-amber-500/10 rounded-lg p-2.5 flex items-center justify-between">
                                        <div>
                                            <p class="text-[9px] font-mono text-slate-500 uppercase">Золотая казна</p>
                                            <h4 class="text-base font-bold text-amber-400">{Math.floor(gold)} монет</h4>
                                        </div>
                                        <span class="text-[9px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/10 font-bold">
                                            +{playerIncome}/сек
                                        </span>
                                    </div>

                                    <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between sm:col-span-2">
                                        <div>
                                            <p class="text-[9px] font-mono text-slate-500 uppercase">Крепость Замка</p>
                                            <h4 class="text-xs font-mono font-bold text-emerald-400">{Math.ceil(playerCastleHp)} / 2000 HP</h4>
                                        </div>
                                        <div class="w-32 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                            <div class="h-full bg-emerald-500" style={{ width: \`\${(playerCastleHp / 2000) * 100}%\` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Spawning Buttons Grid */}
                                <div class="space-y-2">
                                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        ⚔️ ОБУЧЕНИЕ ВОЙСК (СПАВН НА ЛИНИИ {selectedLane + 1})
                                    </h4>
                                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {Object.keys(UNIT_CONFIGS).map((type) => {
                                            const cfg = UNIT_CONFIGS[type];
                                            const canAfford = gold >= cfg.cost;

                                            return (
                                                <button key={type} onClick={() => handleSpawnUnit(type)} disabled={!canAfford}
                                                        class={\`relative flex flex-col items-center p-2 rounded-lg border text-center transition-all duration-200 \${
                                                            canAfford ? "bg-slate-950 border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 text-slate-200" : "bg-slate-950/40 border-slate-950 text-slate-600 cursor-not-allowed"
                                                        }\`}>
                                                    <span class="text-xl mb-1">{cfg.emoji}</span>
                                                    <span class="text-[11px] font-semibold leading-tight">{cfg.name}</span>
                                                    <span class={\`text-[9px] font-mono font-bold mt-0.5 \${canAfford ? "text-amber-400" : "text-slate-500"}\`}>
                                                        {cfg.cost} золота
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Economy and Wall Upgrades */}
                                <div class="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                                    <button onClick={handleUpgradeIncome} disabled={gold < incomeUpgradeCost}
                                            class="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 p-2 rounded-lg text-center transition-all disabled:opacity-40">
                                        <p class="text-[9px] text-slate-400">📈 РАСШИРИТЬ РУДНИКИ</p>
                                        <p class="text-xs font-bold text-slate-200">+2 Доход/сек</p>
                                        <p class="text-[9px] text-amber-400 font-mono mt-0.5">{incomeUpgradeCost} золота</p>
                                    </button>

                                    <button onClick={handleUpgradeCastle} disabled={gold < castleUpgradeCost}
                                            class="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 p-2 rounded-lg text-center transition-all disabled:opacity-40">
                                        <p class="text-[9px] text-slate-400">🧱 УКРЕПИТЬ ВОРОТА</p>
                                        <p class="text-xs font-bold text-slate-200">+500 Прочность Замка</p>
                                        <p class="text-[9px] text-amber-400 font-mono mt-0.5">{castleUpgradeCost} золота</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: Chat Terminal & Game Info */}
                        <div class="space-y-4">
                            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-[400px]">
                                <div class="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-2">
                                    <span class="text-lg">💬</span>
                                    <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Тактическая связь</h4>
                                </div>

                                <div class="flex-grow overflow-y-auto space-y-2.5 pr-1 text-[11px] font-mono">
                                    {chatMessages.map((msg) => {
                                        const isAdvisor = msg.sender === 'advisor';
                                        return (
                                            <div key={msg.id} class={\`p-2.5 rounded-lg border \${
                                                isAdvisor ? "bg-emerald-950/20 border-emerald-500/10 text-emerald-300" : "bg-rose-950/20 border-rose-500/10 text-rose-300"
                                            }\`}>
                                                <div class="flex justify-between font-bold mb-0.5 text-[9px] opacity-80">
                                                    <span>{isAdvisor ? "🧙‍♂️ Советник Илларион" : "😈 Владыка Крон"}</span>
                                                    <span class="text-[8px]">{msg.timestamp}</span>
                                                </div>
                                                <p class="leading-relaxed">{msg.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Game instructions footer box */}
                            <div class="bg-indigo-950/10 border border-indigo-500/10 rounded-xl p-4 text-xs text-indigo-300 space-y-1.5">
                                <h4 class="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">💡 СОВЕТЫ ПОБЕДИТЕЛЯ</h4>
                                <p>• 🧝‍♀️ <strong>Лучницы</strong> стреляют с огромного расстояния, размещайте их позади танков!</p>
                                <p>• 🧚‍♀️ <strong>Целители</strong> непрерывно лечат ваших рыцарей во время боя.</p>
                                <p>• 📈 Всегда покупайте расширение рудников в самом начале игры для быстрого старта!</p>
                            </div>
                        </div>
                    </main>

                    {/* Game Over modal */}
                    {isGameOver && (
                        <div class="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div class="bg-slate-900 border-2 border-slate-700 max-w-sm w-full rounded-2xl p-6 text-center space-y-4 shadow-2xl">
                                <span class="text-5xl">{victory ? "🏆" : "💀"}</span>
                                <h2 class="text-2xl font-black text-white">{victory ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</h2>
                                <p class="text-sm text-slate-300">
                                    {victory ? "Поздравляем! Вы разгромили крепость ИИ и спасли королевство!" : "Ваша крепость разрушена легионами Тьмы. Попробуйте еще раз!"}
                                </p>
                                <button onClick={handleRestart} class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer">
                                    Играть Снова
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        const container = document.getElementById('root');
        const root = ReactDOM.createRoot(container);
        root.render(<App />);
    </script>
</body>
</html>`;
}
