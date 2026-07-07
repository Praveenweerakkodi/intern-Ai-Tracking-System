'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiFetch, cleanErrorMessage } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import { ChatMessage, CoachConversation } from '@internai/shared';
import { GlowCard } from '@/components/animations/GlowCard';
import {
  Send, MessageSquare, Plus, Trash2, Brain, Loader2,
  ChevronRight, Sparkles, User, AlertCircle, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-4 mb-2" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold text-[var(--text-primary)] mt-3 mb-2" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold text-[var(--text-primary)] mt-2 mb-1" {...props} />,
  h4: ({ node, ...props }: any) => <h4 className="text-base font-bold text-[var(--text-primary)] mt-2 mb-1" {...props} />,
  h5: ({ node, ...props }: any) => <h5 className="font-bold text-[var(--text-primary)] mt-2 mb-1" {...props} />,
  h6: ({ node, ...props }: any) => <h6 className="font-semibold text-[var(--text-primary)] mt-2 mb-1" {...props} />,
  p: ({ node, ...props }: any) => <p className="text-[var(--text-secondary)] leading-relaxed mb-2" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc list-inside text-[var(--text-secondary)] mb-2" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-2" {...props} />,
  li: ({ node, ...props }: any) => <li className="text-[var(--text-secondary)] mb-1" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-[var(--text-primary)]" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic text-[var(--text-secondary)]" {...props} />,
  code: ({ node, inline, ...props }: any) => 
    inline ? (
      <code className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[#a78bfa] text-sm font-mono" {...props} />
    ) : (
      <code className="block bg-[var(--bg-elevated)] p-2 rounded text-[#e0e7ff] text-sm font-mono overflow-x-auto mb-2" {...props} />
    ),
  pre: ({ node, ...props }: any) => <pre className="bg-[var(--bg-elevated)] p-3 rounded text-[#e0e7ff] text-sm font-mono overflow-x-auto mb-2" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-[var(--brand-from)] pl-3 italic text-[var(--text-secondary)] my-2" {...props} />,
  a: ({ node, ...props }: any) => <a className="text-[#818cf8] hover:text-[#a78bfa] underline" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="border-t border-[var(--border-subtle)] my-3" {...props} />,
};

export function CoachChat() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingToken, setStreamingToken] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConv = conversations.find(c => c.id === activeConvId);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingToken]);

  // Load conversations list
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const data = await apiFetch<CoachConversation[]>('/coach/conversations', {}, session.access_token);
        setConversations(data);
        if (data.length > 0) {
          // On desktop, default to first chat; on mobile, keep it null initially so we see the list
          if (window.innerWidth >= 768) {
            setActiveConvId(data[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingList(false);
      }
    }
    load();
  }, [supabase]);

  // Load messages when conversation active changes
  useEffect(() => {
    if (!activeConvId) return;
    async function loadMessages() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const data = await apiFetch<CoachConversation>(`/coach/conversations/${activeConvId}`, {}, session.access_token);
        setMessages(data.messages || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadMessages();
  }, [activeConvId, supabase]);

  // Create new conversation
  const handleNewConversation = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await apiFetch<CoachConversation>('/coach/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: `Coaching Session ${conversations.length + 1}` }),
      }, session.access_token);
      setConversations(prev => [data, ...prev]);
      setActiveConvId(data.id);
      setMessages([]);
    } catch {
      toast.error('Failed to start new session');
    } finally {
      setCreating(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this coaching session?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await apiFetch(`/coach/conversations/${id}`, { method: 'DELETE' }, session.access_token);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !activeConvId || sending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const newMessagesList = [...messages, userMessage];
    setMessages(newMessagesList);
    setInput('');
    setSending(true);
    setStreamingToken('');

    // Prepare history structure for Gemini payload
    // role: 'user' | 'model', parts: [{ text: string }]
    const payloadHistory = newMessagesList.map(msg => ({
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: msg.content }],
    }));

    const socket = getSocket();
    const systemPrompt = `You are InternAI Coach, an expert career coach for tech students and graduates. Help them land internships. Reference their application history, match score logic, and ATS keyword tips. Be extremely helpful, encouraging, and clear.`;

    socket.emit('coach-chat', {
      messages: payloadHistory,
      systemPrompt,
      conversationId: activeConvId,
    });

    let currentStream = '';

    const onToken = (data: { content: string; conversationId: string }) => {
      if (data.conversationId !== activeConvId) return;
      currentStream += data.content;
      setStreamingToken(currentStream);
    };

    const onDone = async (data: { fullContent: string; conversationId: string }) => {
      if (data.conversationId !== activeConvId) return;
      setStreamingToken('');
      setSending(false);

      const coachMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.fullContent,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessagesList, coachMessage];
      setMessages(finalMessages);

      // Persist update in DB
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await apiFetch(`/coach/conversations/${activeConvId}/messages`, {
            method: 'PATCH',
            body: JSON.stringify({ messages: finalMessages }),
          }, session.access_token);
        }
      } catch (err) {
        console.error('Error saving messages:', err);
      }

      cleanup();
    };

    const onError = (data: { error: string }) => {
      toast.error(cleanErrorMessage(data.error || 'Connection error'));
      setSending(false);
      cleanup();
    };

    const cleanup = () => {
      socket.off('stream:token', onToken);
      socket.off('stream:done', onDone);
      socket.off('stream:error', onError);
    };

    socket.on('stream:token', onToken);
    socket.on('stream:done', onDone);
    socket.on('stream:error', onError);
  };  return (
    <div className="flex flex-col md:flex-row gap-6 items-stretch min-h-[500px] h-[calc(100dvh-260px)] md:h-[calc(100vh-220px)] overflow-hidden w-full">
      {/* Sidebar List */}
      <div className={`w-full md:w-72 shrink-0 glass-card flex flex-col p-4 overflow-hidden h-full ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        <button
          onClick={handleNewConversation}
          disabled={creating}
          className="btn-gradient w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs shrink-0 animate-fade-in animate-pulse-glow"
        >
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          New Coaching Session
        </button>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1 scrollbar-thin">
          {loadingList ? (
            [1, 2, 3].map(i => <div key={i} className="h-10 skeleton w-full" />)
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold cursor-pointer transition-all group ${
                  activeConvId === c.id
                    ? 'bg-[var(--brand-from)]/10 border border-[var(--brand-from)]/20 text-[#818cf8]'
                    : 'border border-transparent hover:bg-[var(--glass-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}

          {!loadingList && conversations.length === 0 && (
            <div className="text-center py-8 text-xs text-[var(--text-muted)]">
              No sessions yet.
            </div>
          )}
        </div>
      </div>

      {/* Chat workspace */}
      <div className={`flex-1 glass-card flex flex-col overflow-hidden h-full ${activeConvId ? 'flex' : 'hidden md:flex'}`}>
        {activeConvId ? (
          <>
            {/* Header info */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 truncate">
                <button
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-[var(--glass-hover)] text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="truncate">
                  <h3 className="font-bold text-sm truncate">{activeConv?.title}</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Powered by Gemini career coaching context</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--brand-from)]/10 text-[#8b5cf6] border border-[var(--brand-from)]/20 rounded-full text-xs font-semibold">
                <Brain className="w-3.5 h-3.5" /> Context-Aware
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !streamingToken && (
                <div className="text-center py-12 text-[var(--text-muted)] space-y-3 flex flex-col items-center">
                  <Sparkles className="w-8 h-8 text-[var(--brand-from)] animate-pulse" />
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Start Your Coaching Conversation</h4>
                  <p className="text-xs max-w-sm leading-relaxed">
                    Ask me about your application callback predictions, CV weak points, or how to phrase your internship project details.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar bubble */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white ${
                    msg.role === 'user' ? 'bg-[#818cf8]' : 'bg-[var(--brand-from)]'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                  </div>

                  {/* Body text bubble */}
                  <div className={`p-4 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'chat-bubble-user text-white'
                      : 'chat-bubble-ai text-[var(--text-secondary)]'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming AI Bubble */}
              {streamingToken && (
                <div className="flex gap-3 max-w-[90%] md:max-w-[80%] mr-auto">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white bg-[var(--brand-from)]">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-xl text-sm leading-relaxed chat-bubble-ai text-[var(--text-secondary)]">
                    <ReactMarkdown components={markdownComponents}>{streamingToken}</ReactMarkdown>
                    <span className="typewriter-cursor" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-[var(--border-subtle)] shrink-0 bg-[var(--bg-overlay)]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask for feedback on a cv section, tips for interviews, or general career coaching..."
                  className="input-field flex-1 px-4 py-3 text-sm"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="btn-gradient px-5 py-3 flex items-center justify-center shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--text-secondary)] p-12">
            <AlertCircle className="w-10 h-10 text-[var(--text-muted)] mb-3 animate-pulse" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">No session selected</h3>
            <p className="text-xs max-w-xs mt-1">
              Select an existing coaching conversation or start a new one to begin chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
