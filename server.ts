import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint for AI Opponent Strategy
app.post("/api/ai/strategy", async (req, res) => {
  try {
    const { gameState } = req.body;
    
    const prompt = `
      You are the malevolent AI Overlord playing a Castle Defense strategy game against a human player.
      Analyze the current game state and determine your next move and trash-talk/commentary.
      
      Current Game State:
      - Player Castle HP: ${gameState.playerCastleHp} / 2000
      - AI Castle HP: ${gameState.aiCastleHp} / 2000
      - Player Gold: ${gameState.playerGold}
      - Player Income Rate: ${gameState.playerIncome}
      - AI Gold: ${gameState.aiGold}
      - AI Income Rate: ${gameState.aiIncome}
      - Player Units on Board: ${JSON.stringify(gameState.playerUnits)}
      - AI Units on Board: ${JSON.stringify(gameState.aiUnits)}
      
      Choose a strategic action ('spawn_wave', 'upgrade_income', 'upgrade_castle', or 'none').
      Select a target lane (0, 1, or 2) to focus your aggression or spawn units.
      Recommend a unit type to spawn ('sword', 'archer', 'tank', 'mage', 'assassin', or 'healer').
      Provide a highly immersive, smug, or tactical comment or trash-talk in Russian language to the player. Keep it under 2 sentences. Be dramatic and fun!
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dialogue: {
              type: Type.STRING,
              description: "A smug, strategic comment or trash-talk from the AI Overlord to the player in Russian."
            },
            action: {
              type: Type.STRING,
              description: "The strategic action chosen: 'spawn_wave', 'upgrade_income', 'upgrade_castle', or 'none'."
            },
            targetLane: {
              type: Type.INTEGER,
              description: "The target lane (0, 1, or 2) where the AI wants to focus or spawn units."
            },
            recommendedUnitType: {
              type: Type.STRING,
              description: "The recommended unit type to spawn: 'sword', 'archer', 'tank', 'mage', 'assassin', or 'healer'."
            }
          },
          required: ["dialogue", "action", "targetLane", "recommendedUnitType"]
        }
      }
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText.trim());
    res.json(data);
  } catch (error: any) {
    console.error("AI Strategy Error:", error);
    res.json({
      dialogue: "Твои жалкие попытки не остановят мою армию!",
      action: "spawn_wave",
      targetLane: Math.floor(Math.random() * 3),
      recommendedUnitType: ["sword", "archer", "tank", "mage", "assassin", "healer"][Math.floor(Math.random() * 6)]
    });
  }
});

// Endpoint for Friendly AI Tactical Advisor
app.post("/api/ai/advisor", async (req, res) => {
  try {
    const { gameState, userQuery } = req.body;
    
    const prompt = `
      You are the player's Friendly AI Tactical Advisor (Советник-ИИ) in a Castle Defense strategy game.
      Analyze the current game state and provide advice or answer their message.
      
      Current Game State:
      - Player Castle HP: ${gameState.playerCastleHp} / 2000
      - AI Castle HP: ${gameState.aiCastleHp} / 2000
      - Player Gold: ${gameState.playerGold}
      - Player Income Rate: ${gameState.playerIncome}
      - AI Gold: ${gameState.aiGold}
      - Player Units on Board: ${JSON.stringify(gameState.playerUnits)}
      - AI Units on Board: ${JSON.stringify(gameState.aiUnits)}
      
      User message/query (if any): "${userQuery || 'Дай мне тактический совет по текущему бою.'}"
      
      Provide tactical, helpful advice in Russian to help the player win.
      Optionally, provide a minor support gift/blessing ('gold' [adds 100 gold], 'reinforcements' [spawns a free unit in a lane], 'castle_repair' [restores 400 HP], or 'none').
      Keep the message under 3 sentences. Be supportive, smart, and strategic!
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: {
              type: Type.STRING,
              description: "Helpful, tactical advice from the friendly AI Advisor to the player in Russian."
            },
            gift: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: "The type of support gift: 'gold', 'reinforcements', 'castle_repair', or 'none'"
                },
                amount: {
                  type: Type.INTEGER,
                  description: "The amount of the gift (e.g. 100 gold, 400 castle HP, etc.)"
                },
                lane: {
                  type: Type.INTEGER,
                  description: "The lane for reinforcements, if applicable (0, 1, or 2)"
                }
              },
              required: ["type", "amount", "lane"]
            }
          },
          required: ["advice", "gift"]
        }
      }
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText.trim());
    res.json(data);
  } catch (error: any) {
    console.error("AI Advisor Error:", error);
    res.json({
      advice: "Держи оборону! Нам нужно больше ресурсов для победы. Сосредоточься на улучшении шахт.",
      gift: { type: "none", amount: 0, lane: 0 }
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
