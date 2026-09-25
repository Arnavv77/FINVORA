import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const CopilotDrawer: React.FC = () => {
  const {
    copilotOpen,
    setCopilotOpen,
    copilotMessages,
    sendCopilotMessage
  } = useFinancial();

  const navigate = useNavigate();
  const location = useLocation();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Why is next month’s cash balance expected to fall?',
    'Which invoices need review?',
    'What happens if customer payments arrive 15 days late?',
    'Why is the marketing department over budget?'
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

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    
    setInputText('');
    setIsTyping(true);
    sendCopilotMessage(text);
    
    setTimeout(() => {
      setIsTyping(false);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!copilotOpen || location.pathname === '/what-if') return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-[var(--dialog-bg)] border-l border-[var(--divider)] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--divider)] bg-[var(--card-bg-elevated)] backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">FINVORA Copilot</h2>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800/50 px-1.5 py-0.2 rounded">
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Contextual Financial Intelligence</p>
          </div>
        </div>
        <button
          onClick={() => setCopilotOpen(false)}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
          aria-label="Close Copilot"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {copilotMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[var(--text-muted)]">
              {msg.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-[var(--text-muted)]" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-[var(--accent)]" />
                  <span className="text-[var(--accent)] font-semibold">FINVORA</span>
                </>
              )}
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[92%] shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-[#F59E0B] text-black font-medium'
                  : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] space-y-2'
              }`}
            >
              <div className="whitespace-pre-line">
                {msg.text}
              </div>

              {/* Citations / Evidence cards */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[var(--divider)] space-y-1.5">
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                    Source Citations
                  </div>
                  {msg.citations.map((cite, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider)] text-[11px] text-[var(--text-primary)] hover:border-[var(--accent-border)] transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <span className="truncate">{cite.title}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 ml-2">
                        {cite.referenceId}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[var(--divider)] flex flex-wrap gap-1.5">
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (action.actionType === 'navigate') {
                          navigate(action.payload);
                        } else if (action.actionType === 'filter') {
                          handleSend(action.label);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent-border)] hover:brightness-105 transition-colors"
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--divider)] text-xs text-[var(--text-secondary)] w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />
            <span>FINVORA is evaluating telemetry...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Carousel */}
      <div className="px-4 py-2.5 bg-[var(--dialog-bg)] border-t border-[var(--divider)]">
        <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">
          Suggested Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-border)] border border-[var(--divider)] transition-colors truncate max-w-full"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-[var(--divider)] bg-[var(--card-bg-elevated)]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FINVORA about cash, invoices, or budget..."
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-[#F59E0B] text-black hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1.5">
          <span>Connected to enterprise ledger</span>
          <span>Press Enter ↵</span>
        </div>
      </div>
    </div>
  );
};
