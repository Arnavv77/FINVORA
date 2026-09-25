import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  TrendingDown,
  Receipt,
  PieChart,
  Clock,
  CheckCircle2,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

// Clean text and bold-parser utility
const renderFormattedText = (raw: string) => {
  const parts = raw.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Section header (### Title)
        if (trimmed.startsWith('### ')) {
          return (
            <div
              key={idx}
              className="font-bold text-[var(--text-primary)] text-xs tracking-tight pt-1 pb-1 border-b border-[var(--divider)] mb-1 flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{trimmed.replace('### ', '')}</span>
            </div>
          );
        }

        // Bullet point (• or -)
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          const content = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span className="text-amber-500 font-bold leading-tight select-none mt-0.5">•</span>
              <span className="flex-1">{renderFormattedText(content)}</span>
            </div>
          );
        }

        // Numbered list (1. 2. etc.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5 select-none">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderFormattedText(numMatch[2])}</span>
            </div>
          );
        }

        // Standard paragraph line
        return <p key={idx}>{renderFormattedText(line)}</p>;
      })}
    </div>
  );
};

export const CopilotDrawer: React.FC = () => {
  const {
    copilotOpen,
    setCopilotOpen,
    copilotMessages,
    sendCopilotMessage,
    clearCopilotMessages
  } = useFinancial();

  const navigate = useNavigate();
  const location = useLocation();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      icon: <TrendingDown className="w-3.5 h-3.5 text-rose-500" />,
      label: 'Cash flow drivers',
      query: 'Why is cash balance declining?'
    },
    {
      icon: <Receipt className="w-3.5 h-3.5 text-amber-500" />,
      label: 'Invoices to review',
      query: 'Which invoices need review?'
    },
    {
      icon: <PieChart className="w-3.5 h-3.5 text-sky-500" />,
      label: 'Marketing overrun',
      query: 'Why is marketing department over budget?'
    },
    {
      icon: <Clock className="w-3.5 h-3.5 text-purple-500" />,
      label: '15-day late payment',
      query: 'What happens if customer payments arrive 15 days late?'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (copilotOpen) {
      scrollToBottom();
      document.body.classList.add('copilot-open');
    } else {
      document.body.classList.remove('copilot-open');
    }
    return () => {
      document.body.classList.remove('copilot-open');
    };
  }, [copilotMessages, copilotOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    setInputText('');
    setIsTyping(true);
    try {
      await sendCopilotMessage(text);
    } finally {
      setIsTyping(false);
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!copilotOpen || location.pathname === '/what-if') return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[var(--dialog-bg)] border-l border-[var(--divider)] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
      {/* Clean Header */}
      <div className="px-4 py-3.5 border-b border-[var(--divider)] bg-[var(--card-bg-elevated)] backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-[var(--text-primary)] tracking-tight">FINVORA AI</h2>
              <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Autonomous Ledger Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {copilotMessages.length > 0 && (
            <button
              onClick={clearCopilotMessages}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setCopilotOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
            aria-label="Close Copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Telemetry & Quality KPIs */}
      <div className="px-4 py-2 bg-[var(--surface-subtle)] border-b border-[var(--divider)] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5" title="Model confidence evaluated against live ERP ledger reconciliations">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Accuracy</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">97.8%</span>
        </div>
        <div className="h-3 w-px bg-[var(--divider)]" />
        <div className="flex items-center gap-1.5" title="Workflow feasibility based on company approval matrix and policy">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Feasibility</span>
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">95.0%</span>
        </div>
        <div className="h-3 w-px bg-[var(--divider)]" />
        <div className="flex items-center gap-1.5" title="Continuous automated audit coverage across transactions">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Audited</span>
          <span className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">100% GL</span>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {copilotMessages.length === 0 ? (
          /* Clean Welcome Screen when empty */
          <div className="h-full flex flex-col justify-center items-center text-center px-4 py-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">How can I assist you?</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-[260px] mx-auto">
                Auditing live ledger entries, cash forecasts, and budget allocations.
              </p>
            </div>

            <div className="w-full pt-2 space-y-2">
              <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider text-left pl-1">
                Suggested Prompts
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-left">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-muted)] border border-[var(--divider)] hover:border-amber-500/30 text-xs text-[var(--text-primary)] transition-all cursor-pointer group"
                  >
                    <span className="shrink-0">{p.icon}</span>
                    <span className="flex-1 text-[11px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-medium">
                      {p.query}
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message List */
          copilotMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[var(--text-muted)]">
                {msg.sender === 'user' ? (
                  <>
                    <span>You</span>
                    <User className="w-3 h-3 text-[var(--text-muted)]" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-500 font-semibold">FINVORA</span>
                  </>
                )}
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[94%] shadow-xs transition-all ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-black font-medium text-xs rounded-tr-xs'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] rounded-tl-xs space-y-2.5'
                }`}
              >
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-line leading-relaxed text-xs">{msg.text}</div>
                ) : (
                  <FormattedMessage text={msg.text} />
                )}

                {/* Decision Quality & Feasibility KPIs */}
                {msg.kpis && (
                  <div className="pt-2 border-t border-[var(--divider)] space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                        <span>{msg.kpis.accuracy}% Accuracy</span>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Zap className="w-2.5 h-2.5 shrink-0" />
                        <span>{msg.kpis.feasibility}% Feasibility</span>
                      </div>
                      {msg.kpis.impact && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                          <span>{msg.kpis.impact}</span>
                        </div>
                      )}
                    </div>
                    {msg.kpis.feasibilityNote && (
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 pl-0.5">
                        <span className="font-medium text-[var(--text-secondary)]">Feasibility:</span>
                        <span>{msg.kpis.feasibilityNote}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sleek Source Citations footnote */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-[var(--divider)] flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">Ref:</span>
                    {msg.citations.map((cite, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--divider)]"
                        title={cite.title}
                      >
                        <ShieldAlert className="w-2.5 h-2.5 text-amber-500" />
                        <span>{cite.referenceId}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Minimal Action Pills */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-1.5 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (action.actionType === 'navigate') {
                            navigate(action.payload);
                            setCopilotOpen(false);
                          } else if (action.actionType === 'filter') {
                            handleSend(action.label);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
                      >
                        <span>{action.label}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--divider)] text-xs text-[var(--text-secondary)] w-fit">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.3s]" />
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Evaluating telemetry...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when conversation is active) */}
      {copilotMessages.length > 0 && (
        <div className="px-3.5 py-2 bg-[var(--dialog-bg)] border-t border-[var(--divider)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.slice(0, 3).map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.query)}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[var(--surface-subtle)] hover:bg-[var(--surface-muted)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--divider)] transition-colors flex items-center gap-1"
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-3.5 border-t border-[var(--divider)] bg-[var(--card-bg-elevated)]">
        <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--input-border)] focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/15 rounded-xl px-3 py-1.5 transition-all">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about cash, invoices, or budget..."
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none py-1"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="p-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1.5 px-0.5">
          <span>Enterprise GL Ledger Connected</span>
          <span className="font-mono">Enter ↵</span>
        </div>
      </div>
    </div>
  );
};
