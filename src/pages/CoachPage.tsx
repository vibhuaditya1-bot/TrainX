import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { generateCoachResponse } from '@/lib/ai';
import { Spinner } from '@/components/ui/Spinner';
import { Send, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import type { ChatMessage } from '@/types';

const SUGGESTIONS = [
  'How do I improve my recovery?',
  'What should I eat before training?',
  'Help me with my technique',
  'Create a training plan for me',
  'How do I build more muscle?',
  'What are the best warm-up drills?',
];

export function CoachPage() {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setMessages((data as ChatMessage[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !user || sending) return;
    setInput('');
    setSending(true);
    inputRef.current?.focus();

    const { data: userMsg } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'user',
      content,
    }).select('*').single();

    if (userMsg) setMessages((prev) => [...prev, userMsg as ChatMessage]);

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    const historyForAI = [...messages, { role: 'user' as const, content }].map((m) => ({ role: m.role, content: m.content }));
    const response = generateCoachResponse(content, profile, historyForAI);

    const { data: aiMsg } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: response,
    }).select('*').single();

    if (aiMsg) setMessages((prev) => [...prev, aiMsg as ChatMessage]);
    setSending(false);
  };

  const handleClear = async () => {
    if (!user) return;
    await supabase.from('chat_messages').delete().eq('user_id', user.id);
    setMessages([]);
  };

  if (loading) return <div className="text-ink-300">Loading conversation...</div>;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 5rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Sparkles size={22} className="text-brand-400" />
            AI Coach
          </h1>
          <p className="text-ink-300 text-sm mt-0.5">
            Personalized guidance
            {profile?.diet_preference && profile.diet_preference !== 'non-vegetarian' && (
              <span className="text-brand-400"> · {profile.diet_preference} diet</span>
            )}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="btn-ghost text-coral-400 text-sm">
            <Trash2 size={16} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3 overscroll-contain">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="p-4 rounded-2xl bg-brand-500/10 mb-4">
              <MessageSquare size={28} className="text-brand-400" />
            </div>
            <h3 className="font-display text-base font-bold text-white mb-2">Ask your AI Coach anything</h3>
            <p className="text-ink-300 text-sm mb-5 max-w-sm">
              Get personalized advice on training, nutrition, recovery, technique, and motivation — tailored to your profile.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="p-2.5 rounded-xl border border-ink-700 bg-ink-800/50 hover:border-brand-500 hover:bg-brand-500/5 text-xs text-ink-200 transition-all text-left leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-0.5">
                <Sparkles size={14} className="text-ink-950" />
              </div>
            )}
            <div
              className={`max-w-[85%] sm:max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-brand-500 text-ink-950 rounded-br-md font-medium'
                  : 'bg-ink-800/80 border border-ink-700/60 text-ink-100 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-end gap-2 justify-start animate-fade-in">
            <div className="shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Sparkles size={14} className="text-ink-950" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-ink-800/80 border border-ink-700/60">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="pt-3 shrink-0 border-t border-ink-700/60">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Ask about ${profile?.sport?.replace('_', ' ') ?? 'training'}, diet, recovery...`}
            className="input flex-1 text-sm"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="btn-primary px-4 py-3 shrink-0"
          >
            {sending ? <Spinner size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
