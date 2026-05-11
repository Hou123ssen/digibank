import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bot, BrainCircuit, Loader2, MessageSquare, Mic, Minimize2,
  Plus, Send, ShieldCheck, Sparkles, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../landing/ThemeContext';
import aiService from '../../services/aiService';
import { cn } from '../../utils/cn';

const starterPrompts = [
  'How much did I spend this month?',
  'Is my KYC approved?',
  'Show my last transactions',
  'Why is my Trust Score low?',
];

const pageHints = {
  '/transfer': 'Transfer assistant ready',
  '/transactions': 'Transaction analyst ready',
  '/kyc': 'KYC assistant ready',
  '/trust-score': 'Trust Score analyst ready',
  '/darets': 'Daret assistant ready',
  '/cagnottes': 'Cagnotte assistant ready',
  '/tickets': 'Support assistant ready',
};

const initialMessage = {
  role: 'assistant',
  content: 'Bonjour. I’m DigiBank AI. Ask me about your balance, transactions, KYC, Trust Score, tickets, Cagnottes, Darets, or spending insights.',
};

const AIBankingAssistant = () => {
  const { isAuthenticated, loading } = useAuth();
  const { dark } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef(null);

  const pageContext = location.pathname;
  const pageHint = useMemo(() => {
    const key = Object.keys(pageHints).find(path => pageContext.startsWith(path));
    return key ? pageHints[key] : 'Account assistant ready';
  }, [pageContext]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming, open]);

  useEffect(() => {
    if (!open || historyLoaded) return;

    const loadLatestConversation = async () => {
      try {
        const conversations = await aiService.getConversations();
        const latest = conversations?.[0];
        if (!latest?.id) return;

        const conversation = await aiService.getConversation(latest.id);
        if (conversation?.messages?.length) {
          setConversationId(conversation.id);
          setMessages(conversation.messages);
        }
      } catch {
        // History is helpful, not required for the assistant to work.
      } finally {
        setHistoryLoaded(true);
      }
    };

    loadLatestConversation();
  }, [open, historyLoaded]);

  if (loading || !isAuthenticated) {
    return null;
  }

  const resetConversation = () => {
    setConversationId(null);
    setMessages([initialMessage]);
    setError('');
    setHistoryLoaded(true);
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const assistantId = `assistant-${Date.now()}`;
    setInput('');
    setError('');
    setStreaming(true);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      await aiService.streamChat({
        message: text,
        conversation_id: conversationId,
        page_context: pageContext,
      }, {
        onDelta: (delta) => {
          setMessages(prev => prev.map(message =>
            message.id === assistantId
              ? { ...message, content: `${message.content}${delta}` }
              : message
          ));
        },
        onDone: (data) => {
          setConversationId(data.conversation?.id ?? conversationId);
        },
      });
    } catch (err) {
      try {
        const result = await aiService.chat({
          message: text,
          conversation_id: conversationId,
          page_context: pageContext,
        });
        setConversationId(result?.conversation?.id ?? conversationId);
        setMessages(prev => prev.map(message =>
          message.id === assistantId
            ? { ...message, content: result?.message?.content || 'I could not generate a response right now.' }
            : message
        ));
      } catch (fallbackErr) {
        setError(fallbackErr.message || err.message || 'AI assistant unavailable.');
        setMessages(prev => prev.filter(message => message.id !== assistantId));
      }
    } finally {
      setStreaming(false);
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceActive(true);
    recognition.onend = () => setVoiceActive(false);
    recognition.onerror = () => {
      setVoiceActive(false);
      setError('Voice capture failed. Try typing your question.');
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setInput(transcript);
    };
    recognition.start();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-5 right-5 z-[220] h-14 w-14 rounded-2xl',
          'bg-emerald-500 text-white shadow-2xl shadow-emerald-950/50',
          'border border-white/20 flex items-center justify-center transition-transform hover:scale-105'
        )}
        aria-label="Open DigiBank AI"
      >
        <Sparkles size={24} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'fixed bottom-5 right-5 z-[230] w-[calc(100vw-2rem)] sm:w-[calc(100vw-2rem)] max-w-[430px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 backdrop-blur-xl',
              dark ? 'bg-[#071411]/95' : 'bg-white/95'
            )}
          >
            <div className="border-b border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <BrainCircuit size={21} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">DigiBank AI</h2>
                    <p className="text-[11px] text-slate-400">{pageHint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={resetConversation} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="New chat">
                    <Plus size={15} />
                  </button>
                  <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Minimize">
                    <Minimize2 size={15} />
                  </button>
                  <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Close">
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100">
                <ShieldCheck size={13} className="text-emerald-300" />
                Authenticated, account-aware, and privacy scoped.
              </div>
            </div>

            <div className="max-h-[40vh] sm:max-h-[48vh] min-h-[180px] sm:min-h-[300px] space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message, index) => (
                <div key={message.id || index} className={cn('flex gap-2', message.role === 'user' && 'justify-end')}>
                  {message.role !== 'user' && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                      <Bot size={14} />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'bg-emerald-500 text-white'
                        : dark
                          ? 'border border-white/8 bg-white/[0.04] text-slate-100'
                          : 'border border-white/8 bg-white/[0.04] text-slate-700'
                    )}
                  >
                    {message.content || (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Loader2 size={13} className="animate-spin" /> Thinking
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="border-t border-white/10 p-4">
              {messages.length === 1 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {starterPrompts.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300 hover:border-emerald-500/30 hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={startVoice}
                  className={cn(
                    'mb-0.5 h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white',
                    voiceActive && 'border-emerald-500/40 text-emerald-300'
                  )}
                  title="Voice input"
                >
                  <Mic size={16} className="mx-auto" />
                </button>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Ask about your account..."
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || streaming}
                  className="mb-0.5 h-10 w-10 shrink-0 rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send"
                >
                  {streaming ? <Loader2 size={16} className="mx-auto animate-spin" /> : <Send size={16} className="mx-auto" />}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
                <MessageSquare size={11} />
                Persistent conversation history is stored securely on your DigiBank account.
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIBankingAssistant;
