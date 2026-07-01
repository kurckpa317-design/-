import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Bot, Send, Sparkles, ShieldCheck, Zap, HelpCircle } from "lucide-react";

interface ChatTerminalProps {
  messages: ChatMessage[];
  intelPoints: number; // 0 to 100
  onSendQuery: (query: string) => void;
  isThinkingAdvisor: boolean;
  isThinkingOverlord: boolean;
}

export default function ChatTerminal({
  messages,
  intelPoints,
  onSendQuery,
  isThinkingAdvisor,
  isThinkingOverlord,
}: ChatTerminalProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinkingAdvisor, isThinkingOverlord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinkingAdvisor || intelPoints < 35) return;
    onSendQuery(input);
    setInput("");
  };

  const handleQuickAdvice = () => {
    if (isThinkingAdvisor || intelPoints < 35) return;
    onSendQuery("Дай мне тактический совет по текущему бою.");
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-display font-semibold text-slate-200 tracking-wide uppercase">
              Центр связи ИИ
            </h3>
            <p className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Подключено к Gemini-3.5
            </p>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          SECURE_COMMS
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px] max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-700 animate-bounce" />
            <p className="text-xs font-sans text-slate-500 leading-relaxed">
              Журнал связи пуст. Набирай очки <span className="text-indigo-400 font-bold">Тактических Данных</span> в битвах, чтобы разблокировать помощь ИИ-Советника!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdvisor = msg.sender === "advisor";
            const isOverlord = msg.sender === "overlord";
            const isPlayer = msg.sender === "player";
            const isSystem = msg.sender === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-slate-900/80 border border-amber-500/20 px-3 py-1 rounded-md text-[10px] font-mono text-amber-400 text-center max-w-[85%] shadow-sm">
                    ✨ {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isPlayer ? "justify-end" : "justify-start"}`}
              >
                {/* Avatars */}
                {!isPlayer && (
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-md ${
                      isAdvisor
                        ? "bg-indigo-950/80 border-indigo-500 text-indigo-400"
                        : "bg-rose-950/80 border-rose-500 text-rose-400"
                    }`}
                  >
                    {isAdvisor ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>
                )}

                <div className={`max-w-[80%] flex flex-col`}>
                  {/* Sender title */}
                  <span
                    className={`text-[9px] font-mono mb-0.5 tracking-wider font-bold uppercase ${
                      isPlayer
                        ? "text-right text-emerald-400"
                        : isAdvisor
                        ? "text-indigo-300"
                        : "text-rose-400"
                    }`}
                  >
                    {isPlayer ? "Игрок (Вы)" : isAdvisor ? "ИИ-Советник" : "Вражеский ИИ"}
                  </span>

                  {/* Message bubble */}
                  <div
                    className={`px-3.5 py-2 rounded-xl text-xs leading-relaxed shadow-sm border ${
                      isPlayer
                        ? "bg-slate-900 border-emerald-500/20 text-slate-100 rounded-tr-none"
                        : isAdvisor
                        ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-100 rounded-tl-none shadow-indigo-950/20"
                        : "bg-rose-950/40 border-rose-500/30 text-rose-100 rounded-tl-none shadow-rose-950/20"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className="block text-[8px] font-mono text-slate-500 text-right mt-1.5 opacity-70">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Advisor Thinking state */}
        {isThinkingAdvisor && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-indigo-950/80 border border-indigo-500 text-indigo-400 flex items-center justify-center animate-spin">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-indigo-300 mb-0.5 tracking-wider font-bold uppercase">
                ИИ-Советник анализирует бой...
              </span>
              <div className="bg-indigo-950/20 border border-indigo-500/10 px-3.5 py-2 rounded-xl rounded-tl-none text-slate-400 flex items-center gap-2 text-xs">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-300" />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Intel Progress bar & Control Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
        {/* Progress Gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              ТАКТИЧЕСКИЕ ДАННЫЕ:
            </span>
            <span className={`${intelPoints >= 35 ? "text-indigo-400 font-bold" : "text-slate-500"}`}>
              {Math.floor(intelPoints)}%
            </span>
          </div>
          <div className="h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                intelPoints >= 100
                  ? "bg-linear-to-r from-indigo-500 to-fuchsia-500 animate-pulse"
                  : intelPoints >= 35
                  ? "bg-indigo-500"
                  : "bg-slate-700"
              }`}
              style={{ width: `${intelPoints}%` }}
            />
          </div>
          <p className="text-[8px] font-mono text-slate-500 leading-tight">
            Потребуется минимум <span className="text-indigo-400">35%</span> данных для отправки запроса или получения тактической поддержки. Зарабатывай в боях.
          </p>
        </div>

        {/* Fast strategic action button */}
        <button
          onClick={handleQuickAdvice}
          disabled={intelPoints < 35 || isThinkingAdvisor}
          className={`w-full py-2.5 px-4 rounded-lg font-display font-semibold text-xs tracking-wide uppercase transition-all duration-250 flex items-center justify-center gap-2 border ${
            intelPoints >= 35 && !isThinkingAdvisor
              ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-950/50 cursor-pointer active:scale-98"
              : "bg-slate-800/50 text-slate-500 border-slate-800/80 cursor-not-allowed"
          }`}
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          Попросить Тактический Совет & Дар
        </button>

        {/* Text Input form for custom prompts */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={intelPoints < 35 || isThinkingAdvisor}
            placeholder={
              intelPoints < 35
                ? "Зарядите радар тактики на 35%..."
                : "Задай тактический вопрос советнику..."
            }
            className={`flex-1 px-3 py-2 text-xs bg-slate-950 border rounded-lg focus:outline-hidden focus:ring-1 transition-all ${
              intelPoints < 35
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-slate-700 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || intelPoints < 35 || isThinkingAdvisor}
            className={`p-2 rounded-lg transition-all flex items-center justify-center ${
              input.trim() && intelPoints >= 35 && !isThinkingAdvisor
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer active:scale-95"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
