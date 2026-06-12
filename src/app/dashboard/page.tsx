'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Target, 
  CheckSquare, 
  Sparkles, 
  Database, 
  Trash2, 
  ArrowLeft,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  Network,
  Binary,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Info,
  Terminal,
  Play,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Memory {
  id: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  metadata: {
    confidence: number;
    score?: number;
    [key: string]: any;
  };
}

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'abandoned';
  progress: number;
  targetDate?: string;
  linkedMemoryIds: string[];
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  linkedGoalId?: string;
  createdAt: string;
}

interface Reflection {
  id: string;
  insight: string;
  category: string;
  evidence: string[];
  createdAt: string;
}

interface Entity {
  id: string;
  name: string;
  type: 'technology' | 'person' | 'concept' | 'organization' | 'project';
  description: string;
  createdAt: string;
}

interface Relationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  description: string;
  createdAt: string;
}

interface EmbeddingRecord {
  id: string;
  text: string;
  model: string;
  dimensions: number;
  vector: number[];
  sourceCollection: 'memories' | 'entities';
  sourceId: string;
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
    entities: number;
    relationships: number;
    embeddings: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'memories' | 'goals' | 'tasks' | 'reflections' | 'graph' | 'embeddings' | 'resources' | 'settings'>('overview');
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  
  // Data lists
  const [memories, setMemories] = useState<Memory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [embeddings, setEmbeddings] = useState<EmbeddingRecord[]>([]);
  
  // Searching & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Creation inputs
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');
  const [newGoalLoading, setNewGoalLoading] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskGoalId, setNewTaskGoalId] = useState('');
  const [newTaskLoading, setNewTaskLoading] = useState(false);

  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // MCP Interactive Query Explorer states
  const [mcpPrompt, setMcpPrompt] = useState('');
  const [mcpAnswer, setMcpAnswer] = useState('');
  const [mcpToolCalls, setMcpToolCalls] = useState<any[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpError, setMcpError] = useState('');

  // Settings states
  const [dbUriInput, setDbUriInput] = useState('');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; hasCustomDb: boolean } | null>(null);

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
        
        loadAllData();
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
      // Reload dashboard statistics and lists for the new database
      loadAllData();
    } catch (err: any) {
      console.error('Failed to update DB settings:', err);
      alert(err.message || 'Failed to save database configuration.');
    }
  };

  const loadAllData = async () => {
    fetchStats();
    fetchMemories();
    fetchGoals();
    fetchTasks();
    fetchReflections();
    fetchEntities();
    fetchRelationships();
    fetchEmbeddings();
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/db-status');
      const data = await res.json();
      setDbStats(data);
    } catch (err) {
      console.error('Failed to load db status:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchMemories = async (query = '') => {
    try {
      const url = query ? `/api/memories?query=${encodeURIComponent(query)}` : '/api/memories';
      const res = await fetch(url);
      const data = await res.json();
      if (data.memories) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals');
      const data = await res.json();
      if (data.goals) {
        setGoals(data.goals);
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const fetchReflections = async () => {
    try {
      const res = await fetch('/api/reflections');
      const data = await res.json();
      if (data.reflections) {
        setReflections(data.reflections);
      }
    } catch (err) {
      console.error('Failed to load reflections:', err);
    }
  };

  const fetchEntities = async () => {
    try {
      const res = await fetch('/api/entities');
      const data = await res.json();
      if (data.entities) {
        setEntities(data.entities);
      }
    } catch (err) {
      console.error('Failed to load entities:', err);
    }
  };

  const fetchRelationships = async () => {
    try {
      const res = await fetch('/api/relationships');
      const data = await res.json();
      if (data.relationships) {
        setRelationships(data.relationships);
      }
    } catch (err) {
      console.error('Failed to load relationships:', err);
    }
  };

  const fetchEmbeddings = async () => {
    try {
      const res = await fetch('/api/embeddings');
      const data = await res.json();
      if (data.embeddings) {
        setEmbeddings(data.embeddings);
      }
    } catch (err) {
      console.error('Failed to load embeddings:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(searchQuery);
  };

  const deleteMemory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory record?')) return;
    try {
      const res = await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const deleteEntity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entity? It will also clear linked relationships.')) return;
    try {
      const res = await fetch(`/api/entities?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to delete entity:', err);
    }
  };

  const createGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || newGoalLoading) return;
    setNewGoalLoading(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoalTitle,
          description: newGoalDesc,
          targetDate: newGoalTargetDate || undefined
        })
      });
      if (res.ok) {
        setNewGoalTitle('');
        setNewGoalDesc('');
        setNewGoalTargetDate('');
        confetti({ particleCount: 60, spread: 40 });
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setNewGoalLoading(false);
    }
  };

  const updateGoalProgress = async (id: string, progress: number, completed = false) => {
    try {
      const body: any = { id, progress };
      if (completed) {
        body.status = 'completed';
        body.progress = 100;
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
      } else {
        body.status = 'active';
      }
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        fetchGoals();
      }
    } catch (err) {
      console.error('Failed to update goal progress:', err);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || newTaskLoading) return;
    setNewTaskLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          linkedGoalId: newTaskGoalId || undefined
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskGoalId('');
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setNewTaskLoading(false);
    }
  };

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    if (nextStatus === 'completed') {
      confetti({ particleCount: 50, spread: 30 });
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const triggerReflection = async () => {
    if (reflectionLoading) return;
    setReflectionLoading(true);
    try {
      const res = await fetch('/api/reflections', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to run reflection:', err);
      alert('Error triggering reflection pipeline.');
    } finally {
      setReflectionLoading(false);
    }
  };

  const handleMcpQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpPrompt.trim() || mcpLoading) return;

    setMcpLoading(true);
    setMcpError('');
    setMcpAnswer('');
    setMcpToolCalls([]);

    try {
      const res = await fetch('/api/mcp-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: mcpPrompt })
      });

      const data = await res.json();
      if (data.error) {
        setMcpError(data.error);
      } else {
        setMcpAnswer(data.answer);
        setMcpToolCalls(data.toolCalls || []);
        confetti({ particleCount: 40, spread: 30 });
      }
    } catch (err) {
      console.error('Failed to run MCP query:', err);
      setMcpError('Failed to establish contact with the backend agentic routing.');
    } finally {
      setMcpLoading(false);
    }
  };

  const getEntityName = (id: string) => {
    const ent = entities.find(e => e.id === id);
    return ent ? ent.name : 'Unknown';
  };

  const filteredMemories = memories.filter(m => {
    if (categoryFilter === 'all') return true;
    return m.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <header className="border-b border-zinc-900 bg-black/40 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/chat"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-semibold mr-4 px-2.5 py-1.5 rounded-lg border border-zinc-900 hover:border-zinc-800 transition-all duration-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Chat
            </Link>
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Memoria Console</span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="hidden md:flex flex-col items-end gap-0.5 mr-2">
                <span className="text-[10px] text-zinc-300 font-bold leading-none">{currentUser.name}</span>
                <span className="text-[9px] text-zinc-500 leading-none">{currentUser.email}</span>
              </div>
            )}
            <button 
              onClick={loadAllData}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            </button>
            {dbStats && dbStats.counts && (
              <span className="text-[10px] px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
                <Database className="h-3.5 w-3.5 shrink-0" />
                MongoDB Atlas Connected
              </span>
            )}
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="px-2.5 py-1.5 rounded-lg border border-red-950/20 hover:border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-all duration-200"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-grow flex flex-col md:flex-row gap-8 w-full">
        
        {/* Left Tab Selector */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-1.5">
          <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider px-3 mb-2">
            Control Center
          </div>
          {[
            { id: 'overview', title: 'System Overview', icon: Database },
            { id: 'memories', title: 'Memory Explorer', icon: Brain },
            { id: 'graph', title: 'Knowledge Graph', icon: Network },
            { id: 'embeddings', title: 'Embeddings Inspector', icon: Binary },
            { id: 'goals', title: 'Long-term Goals', icon: Target },
            { id: 'tasks', title: 'Action Checklist', icon: CheckSquare },
            { id: 'reflections', title: 'Behavioral Insights', icon: Sparkles },
            { id: 'resources', title: 'MongoDB & MCP Hub', icon: HelpCircle },
            { id: 'settings', title: 'Database Config', icon: Settings },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold border transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-zinc-900 border-zinc-800 text-white font-bold'
                    : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${activeTab === t.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
                {t.title}
              </button>
            );
          })}
        </aside>

        {/* Right Tab views */}
        <main className="flex-grow min-w-0">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              
              {/* Metric counts grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Long-term Memories", count: dbStats?.counts?.memories ?? 0, color: "text-indigo-400", bg: "bg-indigo-500/5", border: "border-indigo-500/10" },
                  { title: "Graph Entities", count: dbStats?.counts?.entities ?? 0, color: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/10" },
                  { title: "Raw Vectors Ledger", count: dbStats?.counts?.embeddings ?? 0, color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/10" },
                  { title: "Cognitive Insights", count: dbStats?.counts?.reflections ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
                ].map((m, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border ${m.bg} ${m.border} flex flex-col gap-1`}>
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">{m.title}</span>
                    <span className={`text-4xl font-extrabold font-mono ${m.color}`}>{m.count}</span>
                  </div>
                ))}
              </div>

              {/* Reflection Callout */}
              <div className="p-6 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 glow-effect">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">Trigger Cognitive reflection Audit</h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Triggering the reflection engine prompts Gemini to analyze all your stored memories. It extracts behavioral trends, finds where you deviate from your goals, and writes a cognitive insight record that is fed back into your memory vector database.
                  </p>
                </div>
                <button
                  onClick={triggerReflection}
                  disabled={reflectionLoading || (dbStats?.counts?.memories ?? 0) < 3}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs shrink-0 transition-all duration-200 shadow-lg shadow-indigo-600/10 flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${reflectionLoading ? 'animate-spin' : ''}`} />
                  {reflectionLoading ? 'Analyzing...' : 'Run Reflection Engine'}
                </button>
              </div>

              {/* Collections view */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
                  <Database className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">MongoDB Collections Inspector</h3>
                </div>

                <p className="text-xs text-zinc-500 mb-4">
                  Here is the active schema representation inside your MongoDB database layer:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: "users", description: "Default user Profile.", keys: ["id", "name", "email", "createdAt"] },
                    { name: "conversations", description: "Chat session headers.", keys: ["id", "userId", "title", "updatedAt"] },
                    { name: "memories", description: "Cognitive embeddings store.", keys: ["id", "userId", "content", "category", "embedding (vector)", "confidence"] },
                    { name: "entities", description: "Graph node elements.", keys: ["id", "userId", "name", "type", "description"] },
                    { name: "relationships", description: "Subject-predicate-object links.", keys: ["id", "userId", "sourceEntityId", "targetEntityId", "type"] },
                    { name: "embeddings", description: "Raw vector ledger ledger.", keys: ["id", "userId", "text", "model", "dimensions", "vector"] },
                    { name: "goals", description: "Long-term milestones.", keys: ["id", "userId", "title", "progress", "status"] },
                    { name: "tasks", description: "Daily action items.", keys: ["id", "userId", "title", "status", "dueDate"] },
                    { name: "reflections", description: "Behavioral audit outcomes.", keys: ["id", "userId", "insight", "evidence"] },
                  ].map((col, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 flex flex-col gap-2">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                        <span className="font-mono font-bold text-xs text-indigo-300">db.{col.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono">
                          {dbStats && dbStats.counts ? (dbStats.counts as any)[col.name] ?? 0 : 0} docs
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal">{col.description}</p>
                      <div className="text-[9px] text-zinc-600 leading-normal">
                        Fields: {col.keys.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MEMORIES */}
          {activeTab === 'memories' && (
            <div className="space-y-6">
              
              {/* Search Bar Form */}
              <form onSubmit={handleSearchSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memories semantically using Atlas Vector Search (e.g. 'project strategy', 'tech stack')..."
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-500 rounded-xl focus:outline-none transition-all duration-200"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-lg shadow-indigo-600/10"
                >
                  Vector Search
                </button>
              </form>

              {searchQuery && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">
                    Showing Vector Similarity matches for query: <strong className="text-zinc-300">"{searchQuery}"</strong>
                  </span>
                  <button
                    onClick={() => { setSearchQuery(''); fetchMemories(); }}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Clear Search
                  </button>
                </div>
              )}

              {/* Category filters */}
              <div className="flex gap-2 flex-wrap border-b border-zinc-900 pb-3">
                {['all', 'episodic', 'semantic', 'goal', 'task', 'preference', 'reflection'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all duration-200 ${
                      categoryFilter === cat
                        ? 'bg-zinc-900 border-zinc-700 text-white'
                        : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Memories grid */}
              {filteredMemories.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10">
                  <Brain className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                  <h4 className="text-sm font-bold text-zinc-400">No memories found</h4>
                  <p className="text-xs text-zinc-600 mt-1">
                    Start chatting or type a different query to find records.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMemories.map(m => (
                    <div 
                      key={m.id}
                      className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 flex flex-col justify-between gap-4 group hover:border-zinc-800 transition-all duration-200"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            m.category === 'goal' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            m.category === 'task' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                            m.category === 'preference' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            m.category === 'reflection' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {m.category}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            Confidence: {(m.metadata.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                          {m.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-zinc-900/50 pt-2 text-[9px] text-zinc-500">
                        <span className="truncate max-w-[140px]">
                          Tags: {m.tags.join(', ')}
                        </span>
                        <div className="flex items-center gap-2">
                          {m.metadata.score && (
                            <span className="font-mono text-indigo-400 font-bold">
                              Score: {m.metadata.score.toFixed(2)}
                            </span>
                          )}
                          <button
                            onClick={() => deleteMemory(m.id)}
                            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: KNOWLEDGE GRAPH */}
          {activeTab === 'graph' && (
            <div className="space-y-8">
              
              {/* Entities Section */}
              <div className="space-y-4">
                <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Extracted Entities (Nodes)
                  </h3>
                  <span className="text-xs text-zinc-500">{entities.length} nodes total</span>
                </div>

                {entities.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10">
                    <Network className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                    <h4 className="text-xs font-bold text-zinc-400">No entities extracted</h4>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Start a chat session. Gemini automatically populates nodes when items are mentioned.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entities.map(e => (
                      <div key={e.id} className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 relative group hover:border-zinc-800 transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                            e.type === 'technology' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            e.type === 'person' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            e.type === 'project' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {e.type}
                          </span>
                          <button
                            onClick={() => deleteEntity(e.id)}
                            className="p-1 rounded text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Node"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-200 mb-1">{e.name}</h4>
                        <p className="text-[11px] text-zinc-400 leading-normal">{e.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Relationships Section */}
              <div className="space-y-4">
                <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Semantic Linkages (Edges)
                  </h3>
                  <span className="text-xs text-zinc-500">{relationships.length} edges total</span>
                </div>

                {relationships.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10">
                    <h4 className="text-xs font-bold text-zinc-400">No relationships established</h4>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Links are created when entities are referenced together (e.g. 'Developer uses TypeScript').
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {relationships.map(rel => (
                      <div key={rel.id} className="p-3 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[10px] font-bold">
                            {getEntityName(rel.sourceEntityId)}
                          </span>
                          <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                            --[{rel.type}]--&gt;
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[10px] font-bold">
                            {getEntityName(rel.targetEntityId)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 italic max-w-sm text-right">
                          "{rel.description}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: EMBEDDINGS INSPECTOR */}
          {activeTab === 'embeddings' && (
            <div className="space-y-6">
              
              <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Binary className="h-5 w-5 text-amber-400" /> Embeddings Ledger Logs
                </h3>
                <span className="text-xs text-zinc-500">{embeddings.length} vectors stored</span>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                This ledger tracks all text blocks processed by Gemini's <strong>`gemini-embedding-001`</strong> model. 
                Each entry represents a 768-dimension vector floating point array saved inside MongoDB Atlas, making it semantically queryable.
              </p>

              {embeddings.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10">
                  <Binary className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                  <h4 className="text-sm font-bold text-zinc-400">No vectors ledger records</h4>
                  <p className="text-xs text-zinc-600 mt-1">
                    Send messages in chat to generate embeddings.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {embeddings.map(emb => (
                    <div key={emb.id} className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/15 space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-900/50 pb-2 text-[10px] text-zinc-500">
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded bg-zinc-950 font-bold uppercase tracking-wider text-amber-400">
                            {emb.sourceCollection}
                          </span>
                          <span className="font-mono text-zinc-400">
                            ID: {emb.sourceId}
                          </span>
                        </div>
                        <span className="font-mono">
                          Dimensions: {emb.dimensions} | Model: {emb.model}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">Embedded Text Content</span>
                        <p className="text-xs text-zinc-300 font-medium bg-zinc-950/40 p-2.5 rounded border border-zinc-900 italic">
                          "{emb.text}"
                        </p>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">Vector Array (First 15 dimensions)</span>
                        <div className="bg-black/40 p-2.5 rounded border border-zinc-950 font-mono text-[10px] text-indigo-300 tracking-tight leading-normal overflow-x-auto">
                          [ {emb.vector.slice(0, 15).map(v => v.toFixed(6)).join(', ')} ... + {emb.vector.length - 15} dims ]
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 5: GOALS */}
          {activeTab === 'goals' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                  Active Milestones
                </h3>

                {goals.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10">
                    <Target className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                    <h4 className="text-xs font-bold text-zinc-400">No active goals</h4>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Use the creator form to define a new objective.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {goals.map(g => (
                      <div 
                        key={g.id}
                        className="p-5 rounded-xl border border-zinc-900 bg-zinc-900/20 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-white">{g.title}</h4>
                            <p className="text-xs text-zinc-400 mt-1">{g.description}</p>
                          </div>
                          <button
                            onClick={() => deleteGoal(g.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition-colors"
                            title="Delete Goal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Progress Bar slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Progress</span>
                            <span className="font-bold text-indigo-400">{g.progress}%</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={g.progress}
                              onChange={(e) => updateGoalProgress(g.id, parseInt(e.target.value))}
                              className="flex-1 accent-indigo-500 h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                            />
                            {g.progress < 100 && (
                              <button
                                onClick={() => updateGoalProgress(g.id, 100, true)}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] uppercase transition-colors"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Linked Meta */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-600">
                          {g.targetDate ? (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" /> Target: {new Date(g.targetDate).toLocaleDateString()}
                            </span>
                          ) : <span />}
                          <span className="font-semibold text-zinc-500">
                            Linked: {g.linkedMemoryIds.length} memories
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Goal Creator form */}
              <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/60 h-fit">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-indigo-400" /> Create New Goal
                </h3>
                
                <form onSubmit={createGoal} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      placeholder="e.g. Launch enterprise AI product"
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Description</label>
                    <textarea
                      value={newGoalDesc}
                      onChange={(e) => setNewGoalDesc(e.target.value)}
                      placeholder="e.g. Set up infrastructure and gain first 5 users."
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Target Date (Optional)</label>
                    <input
                      type="date"
                      value={newGoalTargetDate}
                      onChange={(e) => setNewGoalTargetDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={newGoalLoading}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-colors"
                  >
                    {newGoalLoading ? 'Saving...' : 'Add Goal'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 6: TASKS */}
          {activeTab === 'tasks' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Task Checklist Panel */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                  Action Items Checklist
                </h3>

                {tasks.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10">
                    <CheckSquare className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                    <h4 className="text-xs font-bold text-zinc-400">No action items</h4>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Add a task manually, or say "todo finish investor deck" inside chat!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(t => (
                      <div 
                        key={t.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                          t.status === 'completed'
                            ? 'bg-zinc-900/10 border-zinc-900/80 text-zinc-500'
                            : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={t.status === 'completed'}
                            onChange={() => toggleTaskStatus(t.id, t.status)}
                            className="h-4.5 w-4.5 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
                          />
                          <span className={`text-xs font-semibold leading-normal truncate ${
                            t.status === 'completed' ? 'line-through opacity-50' : ''
                          }`}>
                            {t.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {t.dueDate && (
                            <span className="text-[9px] text-zinc-500 font-mono hidden sm:inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> {new Date(t.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task Creator Panel */}
              <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/60 h-fit">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-indigo-400" /> Add New Task
                </h3>
                
                <form onSubmit={createTask} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Task Title</label>
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Schedule enterprise feedback calls"
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Link to Goal (Optional)</label>
                    <select
                      value={newTaskGoalId}
                      onChange={(e) => setNewTaskGoalId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-400 rounded-lg focus:outline-none cursor-pointer"
                    >
                      <option value="">No goal linkage</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={newTaskLoading}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-colors"
                  >
                    {newTaskLoading ? 'Saving...' : 'Add Action Item'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 7: REFLECTIONS */}
          {activeTab === 'reflections' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Behavioral Audit Log
                </h3>
                <button
                  onClick={triggerReflection}
                  disabled={reflectionLoading || (dbStats?.counts?.memories ?? 0) < 3}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-[10px] uppercase transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${reflectionLoading ? 'animate-spin' : ''}`} />
                  Analyze Log
                </button>
              </div>

              {reflections.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10 max-w-3xl mx-auto">
                  <Sparkles className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                  <h4 className="text-sm font-bold text-zinc-400">No reflections generated yet</h4>
                  <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
                    The agent triggers reflections when there are at least 3 memories. Add some preferences, goals, and facts in chat, then click 'Analyze Log' to generate your first audit record!
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-w-3xl">
                  {reflections.map(r => (
                    <div 
                      key={r.id}
                      className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/15 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-900/50 pb-2.5">
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                          Insight: {r.category}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                        "{r.insight}"
                      </p>

                      <div className="space-y-2 pt-2 border-t border-zinc-900/40">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Evidence Base:</span>
                        <ul className="space-y-1">
                          {r.evidence.map((ev, idx) => (
                            <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                              <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 8: MONGODB & MCP HUB */}
          {activeTab === 'resources' && (
            <div className="space-y-8 max-w-4xl">
              
              {/* Intro Banner */}
              <div className="p-6 rounded-2xl border border-indigo-500/15 bg-indigo-500/5 space-y-3 relative overflow-hidden">
                <div className="absolute top-[-50px] right-[-50px] h-32 w-32 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">MongoDB Intelligent Data Platform Integration</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Memoria AI uses MongoDB Atlas as the unified, operational persistent memory layer. By consolidating operational datasets, vector search mappings, and schema relationships on a single engine, we remove data fragmentation roadblocks and empower Gemini to perform highly contextual agent reasoning.
                </p>
              </div>

              {/* MCP Natural Language Subprocess Query Box (Interactive Hackathon Feature!) */}
              <div className="p-6 rounded-2xl border border-amber-500/10 bg-amber-500/5 space-y-4 glow-effect">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
                  <Terminal className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Natural Language Database Explorer (Live MCP Agent Loop)</h4>
                </div>

                <p className="text-xs text-zinc-400 leading-normal">
                  Write a database command in plain English. We trigger an agentic loop where Gemini evaluates the prompt, selects database tools on the running <code>mongodb-mcp-server</code> process, resolves the query, and presents the result.
                </p>

                <form onSubmit={handleMcpQuerySubmit} className="flex gap-2.5">
                  <input
                    type="text"
                    required
                    value={mcpPrompt}
                    onChange={(e) => setMcpPrompt(e.target.value)}
                    placeholder="e.g. 'Show me what collections are inside the database' or 'Find technology entities'"
                    className="flex-grow px-3.5 py-2.5 bg-zinc-950 border border-zinc-900 focus:border-amber-500 text-xs text-zinc-200 placeholder-zinc-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    disabled={mcpLoading || !mcpPrompt.trim()}
                    className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" /> Execute
                  </button>
                </form>

                {mcpLoading && (
                  <div className="text-xs text-amber-400 flex items-center gap-2 font-semibold">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Spawning MCP subprocess and compiling function call parameters...
                  </div>
                )}

                {mcpError && (
                  <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400">
                    {mcpError}
                  </div>
                )}

                {mcpAnswer && (
                  <div className="space-y-4 mt-2">
                    <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 text-xs leading-relaxed space-y-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Agent Synthesized Answer:</span>
                      <p className="text-zinc-200">{mcpAnswer}</p>
                    </div>

                    {mcpToolCalls.map((tc, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                          <span>🛠️ Executed MCP Subprocess Command:</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[9px]">
                            {tc.name}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">Arguments Constructed By Gemini</span>
                            <pre className="p-3 rounded-lg bg-black/60 border border-zinc-950 font-mono text-[10px] text-zinc-400 overflow-x-auto">
                              {JSON.stringify(tc.args, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">Raw Subprocess Database Output</span>
                            <pre className="p-3 rounded-lg bg-black/60 border border-zinc-950 font-mono text-[10px] text-indigo-300 overflow-x-auto max-h-48 overflow-y-auto">
                              {JSON.stringify(tc.result, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 1. MCP Configuration */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
                  <Network className="h-4.5 w-4.5 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">MongoDB Model Context Protocol (MCP) Server Setup</h4>
                </div>

                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  You can connect your local development LLM environments (like Claude Desktop, Cursor, VS Code, or Windsurf) to your database using the official <strong>`mongodb-mcp-server`</strong>. This grants LLM assistants natural language control to inspect schemas, query collections, and run aggregations.
                </p>

                <div className="space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Add to your AI client configuration:</span>
                  <pre className="p-4 rounded-xl bg-black/60 border border-zinc-950 font-mono text-[11px] text-indigo-300 overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "mongodb-memoria": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"],
      "env": {
        "MONGODB_URI": "${dbStats ? 'mongodb+srv://...' : 'YOUR_MONGODB_URI'}"
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>

              {/* 2. Playbooks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Aggregations Playbook */}
                <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Binary className="h-4.5 w-4.5 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Aggregation Pipelines</h4>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                    We use MongoDB's pipeline execution to count, matches, and aggregate documents inside repositories. For Vector Search, we execute `$vectorSearch` alongside matching criteria, which allows retrieving user-specific cognitive records in a single database round-trip.
                  </p>
                </div>

                {/* Data Modeling Playbook */}
                <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <BookOpen className="h-4.5 w-4.5 text-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Data Modeling in MongoDB</h4>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                    Our architecture normalizes entities and relationships to build a highly queryable Knowledge Graph, while utilizing inline document arrays for light goal-to-memory links, achieving high-throughput operations.
                  </p>
                </div>

              </div>

              {/* 3. Resources Grid */}
              <div className="space-y-4">
                <div className="border-b border-zinc-900 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Developer Resources & Documentation
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "MongoDB Atlas Vector Search", desc: "Build AI-driven semantic and keyword search engines.", link: "https://www.mongodb.com/products/platform/atlas-vector-search" },
                    { title: "MongoDB AI Search & Retrieval", desc: "Explore Voyage AI and embedding models integration.", link: "https://www.mongodb.com/products/platform/ai-search-and-retrieval" },
                    { title: "MongoDB MCP Server Guide", desc: "Model Context Protocol installation details.", link: "https://www.mongodb.com/docs/mcp-server/get-started/" },
                    { title: "Sample Mflix Dataset", desc: "Access sample_mflix.embedded_movies for movie vector testing.", link: "https://www.mongodb.com/docs/atlas/sample-data/sample-mflix" },
                    { title: "MongoDB Aggregations", desc: "Master aggregation frameworks and data pipelines.", link: "https://www.mongodb.com/docs/manual/aggregation/" },
                    { title: "MongoDB Data Modeling Guide", desc: "Document structuring and relationship design patterns.", link: "https://www.mongodb.com/docs/manual/data-modeling/" },
                    { title: "MongoDB Database Tools", desc: "Optimize development and database management workflows.", link: "https://www.mongodb.com/try/download/database-tools" },
                    { title: "MongoDB Atlas Search Docs", desc: "Implement full-text and fuzzy search features in Atlas.", link: "https://www.mongodb.com/docs/atlas/atlas-search/" },
                  ].map((res, idx) => (
                    <a
                      key={idx}
                      href={res.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/20 hover:border-zinc-800 transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h5 className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors">
                            {res.title}
                          </h5>
                          <ExternalLink className="h-3.5 w-3.5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-normal">{res.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl animate-in fade-in duration-200">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Database Configuration
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Onboard your own private MongoDB cluster and keep complete control over your memories and goals.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/10 space-y-4">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-indigo-400" />
                  Bring Your Own Database (BYODB) Settings
                </h4>

                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  By connecting Memoria AI to your own cluster, the Next.js API automatically routes all collections (memories, goals, tasks, reflections, entities, and relationships) to your own database. Your connection URI is stored strictly inside your browser's local storage and is never persisted on our servers.
                </p>

                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col gap-2 bg-[#0d0d12]">
                  <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Key Advantages</h5>
                  <ul className="text-[10px] text-zinc-300 list-disc list-inside space-y-1.5 leading-normal">
                    <li><strong>Data Privacy & Sovereignty</strong>: Full compliance and control of your private details.</li>
                    <li><strong>Infinite Storage</strong>: Scale infinitely without shared storage limits.</li>
                    <li><strong>Direct Inspection</strong>: Connect with MongoDB Compass to explore the knowledge graph.</li>
                    <li><strong>Stateless Security</strong>: Pure header-based connection context.</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="dashboard-db-uri" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    MongoDB Atlas Connection URI
                  </label>
                  <textarea
                    id="dashboard-db-uri"
                    value={dbUriInput}
                    onChange={(e) => setDbUriInput(e.target.value)}
                    placeholder="mongodb+srv://<username>:<password>@cluster.mongodb.net/memoria_ai"
                    rows={3}
                    className="w-full rounded-xl bg-[#09090b] border border-[#1f1f26] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 p-3.5 resize-none leading-relaxed focus:outline-none transition-all duration-200"
                  />
                  <span className="text-[9px] text-zinc-500 leading-normal">
                    Format: <code>mongodb+srv://&lt;username&gt;:&lt;password&gt;@&lt;cluster-host&gt;/&lt;dbname&gt;</code>. Leave empty to use the default shared demonstration database.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      handleSaveDbSettings(dbUriInput);
                      confetti({ particleCount: 50, spread: 30 });
                    }}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/10"
                  >
                    Save Connection
                  </button>
                  <button
                    onClick={() => {
                      setDbUriInput('');
                      handleSaveDbSettings('');
                    }}
                    className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-xs font-semibold"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>

              {/* Vector Search Index Instructions */}
              <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Binary className="h-4.5 w-4.5 text-blue-400" />
                  Atlas Vector Search Index Configuration
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  When bringing a new MongoDB cluster, the application will automatically try to create the vector search index named <code>vector_index</code>. If your cluster tier does not support automated index creation via the driver, you can create it manually:
                </p>
                <div className="p-4 rounded-xl bg-zinc-900/60 font-mono text-[10px] text-zinc-300 border border-zinc-900 space-y-2 overflow-x-auto">
                  <p>1. Go to Atlas &gt; Database &gt; Search Indexes &gt; Create Search Index</p>
                  <p>2. Select "Atlas Vector Search" (JSON Editor)</p>
                  <p>3. Set index name to: <strong className="text-indigo-400">vector_index</strong></p>
                  <p>4. Database: <strong>[your_db]</strong>, Collection: <strong>memories</strong></p>
                  <p>5. Paste this index definition:</p>
                  <pre className="text-zinc-400 font-semibold">{JSON.stringify({
                    fields: [
                      { type: "vector", path: "embedding", numDimensions: 768, similarity: "cosine" },
                      { type: "filter", path: "userId" },
                      { type: "filter", path: "category" }
                    ]
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
