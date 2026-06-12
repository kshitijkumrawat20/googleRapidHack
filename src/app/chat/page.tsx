'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Target, 
  CheckSquare, 
  Sparkles, 
  Database, 
  Send, 
  Plus, 
  MessageSquare, 
  Trash2, 
  LayoutDashboard, 
  ChevronRight, 
  ArrowLeft,
  Settings,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface DBStats {
  isFallback: boolean;
  dbName: string;
  counts: {
    users: number;
    conversations: number;
    messages: number;
    memories: number;
    goals: number;
    tasks: number;
    reflections: number;
  };
}

export default function ChatPage() {
  const router = useRouter();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DBStats | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [retrievedContext, setRetrievedContext] = useState<any[]>([]);
  
  // Settings Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dbUriInput, setDbUriInput] = useState('');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; hasCustomDb: boolean } | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Authentication check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);

        // Fetch initial data once authenticated
        fetchConversations();
        fetchDbStatus();
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const handleSaveDbSettings = async (uri: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDbUri: uri }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update database configuration.');
      }

      setCurrentUser(prev => prev ? { ...prev, hasCustomDb: data.user.hasCustomDb } : null);

      // Reset conversation states for the new database context
      setCurrentConversationId(null);
      setMessages([]);
      setLastSearchQuery('');
      setRetrievedContext([]);
      
      // Fetch fresh data from the new DB
      fetchConversations();
      fetchDbStatus();
    } catch (err: any) {
      console.error('Failed to update DB settings:', err);
      alert(err.message || 'Failed to save database configuration.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Fetch messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        // Default to first conversation if none selected
        if (data.conversations.length > 0 && !currentConversationId) {
          setCurrentConversationId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      console.error('Failed to fetch DB status:', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${convId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setLastSearchQuery('');
    setRetrievedContext([]);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    
    try {
      const res = await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
        fetchConversations();
        fetchDbStatus();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text || isLoading) return;

    // Trigger visual confetti if completing a task/goal in text
    if (text.toLowerCase().includes('finish') || text.toLowerCase().includes('accomplish') || text.toLowerCase().includes('done')) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    }

    setInputValue('');
    setIsLoading(true);

    // Save prompt search query for debugging inspector
    setLastSearchQuery(text);

    // Append User Message to UI instantly
    const tempUserMsg: Message = {
      id: Math.random().toString(),
      conversationId: currentConversationId || '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Fetch matching memories in the background so the user can inspect what is being retrieved!
    try {
      const memRes = await fetch(`/api/memories?query=${encodeURIComponent(text)}`);
      const memData = await memRes.json();
      if (memData.memories) {
        setRetrievedContext(memData.memories);
      }
    } catch (e) {
      console.warn('Could not inspect retrieved memories:', e);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: currentConversationId || undefined
        })
      });

      if (!response.ok) throw new Error('API request failed');

      // Update current conversation ID if this was a new conversation
      const returnedConvId = response.headers.get('X-Conversation-Id');
      const isNewConversation = !currentConversationId && returnedConvId;
      if (returnedConvId && returnedConvId !== currentConversationId) {
        setCurrentConversationId(returnedConvId);
      }

      // Read response stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      // Append temporary Assistant message
      const assistantMsgId = Math.random().toString();
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        conversationId: returnedConvId || '',
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString()
      }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        
        // Update streaming text in UI
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantText } : m));
      }

      // Refresh listings
      if (isNewConversation) {
        await fetchConversations();
      } else {
        // Just reload message logs to replace mock message IDs with DB ones
        if (returnedConvId) {
          await fetchMessages(returnedConvId);
        }
      }
      
      await fetchDbStatus();

    } catch (err) {
      console.error('Error in send handler:', err);
      // Append error message to logs
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        conversationId: currentConversationId || '',
        role: 'assistant',
        content: 'Sorry, I encountered an error communicating with the server. Please check your console or database logs.',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const samplePrompts = [
    { title: "Indicate startup goals", prompt: "I am building a SaaS startup called Memoria AI and my goal is to launch the MVP and get 20 beta users in 30 days." },
    { title: "Define tech stack preference", prompt: "For my project, I prefer using TypeScript, Next.js, and MongoDB Atlas because they allow us to build agentic memory architectures." },
    { title: "Ask for task guidance", prompt: "What should I focus on next based on my objectives and preferences?" },
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] font-sans overflow-hidden">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-80 bg-[#0c0c0e] border-r border-[#1e1e24] flex flex-col shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#1e1e24] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-sm">Memoria AI</span>
          </Link>
          <button 
            onClick={startNewChat}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all duration-200"
            title="Start New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider px-2 mb-1">
            Chat Sessions
          </div>
          {conversations.length === 0 ? (
            <div className="text-xs text-zinc-600 text-center py-8">
              No conversations started yet.
            </div>
          ) : (
            conversations.map(c => (
              <div 
                key={c.id}
                onClick={() => setCurrentConversationId(c.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                  currentConversationId === c.id 
                    ? 'bg-zinc-900 border-zinc-800 text-white' 
                    : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="text-xs font-medium truncate leading-none">
                    {c.title}
                  </span>
                </div>
                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-red-400 transition-all duration-150"
                  title="Delete Session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer Navigation */}
        <div className="p-4 border-t border-[#1e1e24] flex flex-col gap-2.5 bg-[#09090b]/50">
          {currentUser && (
            <div className="flex flex-col gap-1 px-3.5 py-2 border-b border-[#1e1e24] mb-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Logged In As</span>
              <span className="text-xs text-zinc-300 font-bold truncate leading-none">{currentUser.name}</span>
              <span className="text-[10px] text-zinc-500 truncate leading-none mt-1">{currentUser.email}</span>
            </div>
          )}
          <Link 
            href="/dashboard"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 hover:bg-indigo-950/40 text-indigo-300 font-medium text-xs transition-all duration-200"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-indigo-400" />
            Go to Admin Dashboard
          </Link>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-3.5 py-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs text-left transition-all duration-200"
          >
            <Settings className="h-4 w-4 text-zinc-500" />
            Database Settings
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2 hover:bg-red-950/15 hover:text-red-400 rounded-xl text-xs text-left transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-500 hover:text-red-400" />
            Log Out Session
          </button>
          <Link 
            href="/"
            className="flex items-center gap-3 px-3.5 py-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-500" />
            Back to Landing Page
          </Link>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
        
        {/* Workspace Header */}
        <header className="h-16 border-b border-[#1e1e24] px-6 flex items-center justify-between bg-[#0a0a0c]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold truncate max-w-sm">
              {currentConversationId 
                ? conversations.find(c => c.id === currentConversationId)?.title || 'Active Conversation'
                : 'New Conversation Session'
              }
            </h2>
            {dbStatus && dbStatus.counts && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1.5 font-medium ${
                dbStatus.isFallback
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              }`}>
                <Database className="h-3 w-3 shrink-0" />
                {dbStatus.isFallback ? 'Local JSON Fallback' : 'MongoDB Atlas Connected'}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-zinc-400">
            {dbStatus && dbStatus.counts && (
              <div className="text-[11px] font-semibold text-zinc-500 hidden sm:inline-flex items-center gap-2">
                <span>Memory Store Size:</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                  {dbStatus.counts.memories} records
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Split Panel: Messages and Live Context Debugger */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 2a. CHAT LOGS */}
          <div className="flex-1 flex flex-col overflow-y-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center max-w-xl mx-auto text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                  <Brain className="h-8 w-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
                  Meet your Personal Chief of Staff
                </h2>
                <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                  Start conversing below. As you chat, I will automatically extract important details, preferences, goals, and tasks, saving them in long-term memory.
                </p>

                <div className="w-full flex flex-col gap-3.5">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left pl-1">
                    Try these sample prompts:
                  </div>
                  {samplePrompts.map((sp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(sp.prompt)}
                      className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 text-left transition-all duration-200 text-xs text-zinc-300 flex items-start gap-3.5"
                    >
                      <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-zinc-200 block mb-0.5">{sp.title}</span>
                        {sp.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto w-full">
                {messages.map((m) => (
                  <div 
                    key={m.id}
                    className={`flex gap-4 p-4 rounded-2xl border ${
                      m.role === 'user'
                        ? 'bg-zinc-900/40 border-zinc-800/80 ml-8 md:ml-16'
                        : 'bg-indigo-950/5 border-indigo-900/10 mr-8 md:mr-16 glow-effect'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      m.role === 'user' 
                        ? 'bg-zinc-800 text-zinc-300' 
                        : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                    }`}>
                      {m.role === 'user' ? 'U' : <Brain className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-semibold text-zinc-400 capitalize mb-1">
                        {m.role === 'user' ? 'You' : 'Chief of Staff'}
                      </div>
                      <div className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-4 p-4 rounded-2xl border border-indigo-900/10 mr-8 md:mr-16 bg-indigo-950/5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center animate-spin">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-zinc-400 mb-1">Chief of Staff</div>
                      <div className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* 2b. COGNITIVE INSPECTOR SIDE PANEL */}
          {lastSearchQuery && (
            <aside className="w-80 border-l border-[#1e1e24] bg-[#0b0b0e] p-5 overflow-y-auto hidden xl:flex flex-col gap-5 shrink-0">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1e1e24]">
                <Brain className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Cognitive Context</h3>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Last Prompt Query</span>
                <p className="text-xs text-zinc-400 truncate bg-zinc-900/50 p-2 rounded border border-zinc-800 italic">
                  "{lastSearchQuery}"
                </p>
              </div>

              <div className="flex-grow flex flex-col gap-3.5">
                <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-indigo-400" />
                  Semantic Memories Retrieved
                </span>

                {retrievedContext.length === 0 ? (
                  <div className="text-xs text-zinc-600 text-center py-4 bg-zinc-900/10 rounded border border-dashed border-zinc-950">
                    No relevant memories returned for this input vector.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {retrievedContext.map((m: any, idx: number) => (
                      <div 
                        key={m.id}
                        className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800 text-[11px] relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase ${
                            m.category === 'goal' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            m.category === 'task' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                            m.category === 'preference' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {m.category}
                          </span>
                          {m.metadata.score && (
                            <span className="text-[9px] text-zinc-500 font-mono">
                              {(m.metadata.score * 100).toFixed(0)}% match
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-300 leading-normal">{m.content}</p>
                        <div className="mt-2 text-[9px] text-zinc-500 truncate">
                          Tags: {m.tags.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-zinc-600 leading-normal bg-zinc-900/20 p-3 rounded-lg border border-zinc-900/40">
                💡 <strong className="text-zinc-400">How it works:</strong> Gemini embeds the user prompt. We perform an Atlas Vector Search on the embedded query, fetching the top semantic memories. These are appended directly into the Gemini context in real-time, yielding memory-aware replies.
              </div>
            </aside>
          )}

        </div>

        {/* Chat Input Bar Area */}
        <footer className="p-4 border-t border-[#1e1e24] bg-[#0a0a0c]/60">
          <div className="max-w-3xl mx-auto w-full relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message your Chief of Staff... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full rounded-2xl bg-[#121215] border border-[#1f1f26] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-200 placeholder-zinc-500 text-sm py-4 pl-4 pr-12 resize-none max-h-48 overflow-y-auto leading-relaxed focus:outline-none transition-all duration-200"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-3.5 bottom-3.5 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all duration-200"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="text-[10px] text-zinc-600 text-center mt-2.5">
            Memoria AI uses long-term vector-injected context to make better recommendations. Try telling it details about your preferences!
          </div>
        </footer>

      </main>

      {/* 3. SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-6 text-[#fafafa] shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-tight text-white">Database Settings</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-500 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-zinc-300">Bring Your Own Database (BYODB)</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Connect Memoria AI directly to your own MongoDB Atlas cluster! By storing data on your cluster, you maintain 100% data ownership, zero storage limits, and can query or export your AI's memory bank using MongoDB Compass directly.
              </p>

              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col gap-2 bg-[#0d0d12]">
                <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Merits & Advantages</h5>
                <ul className="text-[10px] text-zinc-300 list-disc list-inside space-y-1 leading-normal">
                  <li><strong>Data Privacy</strong>: Conversations and memories reside completely inside your private cluster.</li>
                  <li><strong>Unlimited Memory</strong>: Scale your AI's memory bank infinitely on your own free-tier or paid cluster.</li>
                  <li><strong>Direct Access</strong>: Connect via MongoDB Compass or charts to run custom queries or export records.</li>
                  <li><strong>Stateless Security</strong>: Connection string remains in your browser's local storage and is never stored on our servers.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="db-uri-input" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                MongoDB Atlas Connection String
              </label>
              <textarea
                id="db-uri-input"
                value={dbUriInput}
                onChange={(e) => setDbUriInput(e.target.value)}
                placeholder="mongodb+srv://<user>:<password>@cluster.mongodb.net/memoria_ai"
                rows={2}
                className="w-full rounded-xl bg-[#121215] border border-[#1f1f26] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 p-3 resize-none leading-relaxed focus:outline-none transition-all duration-200"
              />
              <span className="text-[9px] text-zinc-600">
                Note: Standard <code>mongodb+srv://</code> connection URIs are supported. Leave empty to use the default shared demonstration cluster.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  handleSaveDbSettings(dbUriInput);
                  setIsSettingsOpen(false);
                  confetti({ particleCount: 50, spread: 30 });
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/10"
              >
                Save Connection Settings
              </button>
              <button
                onClick={() => {
                  setDbUriInput('');
                  handleSaveDbSettings('');
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-colors text-xs font-semibold"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
