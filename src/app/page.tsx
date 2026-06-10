import Link from 'next/link';
import { 
  Brain, 
  Target, 
  CheckSquare, 
  Sparkles, 
  MessageSquareCode, 
  Database, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export const metadata = {
  title: 'Memoria AI | Personal Chief of Staff AI Agent',
  description: 'An AI assistant with long-term episodic, semantic, goal, and task memory powered by Gemini and MongoDB Atlas.',
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#07070a] overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none" />

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-35" />

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Memoria AI
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-zinc-400 text-sm font-medium">
          <a href="#features" className="hover:text-white transition-colors">Cognitive Core</a>
          <a href="#workflow" className="hover:text-white transition-colors">Memory Engine</a>
          <a href="#tech" className="hover:text-white transition-colors">Architecture</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link 
            href="/chat" 
            className="hidden sm:inline-flex text-zinc-300 hover:text-white font-medium text-sm transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/chat" 
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 flex items-center gap-1.5"
          >
            Launch Agent <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        {/* Hackathon Tagline Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-8 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Google GenAI & MongoDB Hackathon Project
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-tight sm:leading-none">
          The AI Assistant That <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Remembers and Reflects.
          </span>
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-zinc-400 max-w-3xl leading-relaxed">
          Standard chatbots forget everything once your conversation ends. 
          <strong className="text-white"> Memoria AI</strong> introduces a persistent long-term memory system.
          It extracts facts, tracks goals, structures tasks, and reflects on your progress—powered by Gemini and MongoDB Atlas.
        </p>

        {/* Action CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full max-w-md">
          <Link 
            href="/chat" 
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-base transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2"
          >
            Start Chatting <MessageSquareCode className="h-5 w-5" />
          </Link>
          <Link 
            href="/dashboard" 
            className="px-8 py-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-200 hover:text-white font-semibold text-base transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 backdrop-blur-md"
          >
            Explore Dashboard <Database className="h-5 w-5" />
          </Link>
        </div>

        {/* Interactive Dashboard Mockup Preview */}
        <div className="mt-20 w-full max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2.5 shadow-2xl shadow-indigo-500/5 backdrop-blur-md glow-effect">
          <div className="rounded-xl overflow-hidden border border-zinc-900 bg-zinc-900/10 p-6 flex flex-col md:flex-row gap-6 text-left">
            {/* Sidebar Mock */}
            <div className="w-full md:w-1/3 flex flex-col gap-4 border-r border-zinc-800/50 pr-0 md:pr-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-400">Chief of Staff Memory</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Active</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center gap-3">
                <Brain className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Semantic Preferences</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">"Prefers TypeScript, MongoDB, Next.js"</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Active Goals</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">"Acquire 100 SaaS beta customers"</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Reflective Insight</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">"Postponing customer calls; code focus bias"</p>
                </div>
              </div>
            </div>

            {/* Conversation Mock */}
            <div className="flex-1 flex flex-col justify-between min-h-[200px]">
              <div className="flex flex-col gap-3">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Live Retrieval Demo</div>
                <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800 max-w-xl">
                  <p className="text-xs text-zinc-400"><strong className="text-zinc-200">User:</strong> "What should I prioritize this week?"</p>
                </div>
                <div className="bg-indigo-950/20 p-3 rounded-lg border border-indigo-500/20 max-w-xl">
                  <p className="text-xs text-zinc-300">
                    <strong className="text-indigo-400">Chief of Staff:</strong> "Based on your active goal to <span className="text-white underline font-medium">acquire 100 beta customers</span>, and my reflection that you have deferred marketing tasks, you should prioritize setting up the email sign-up form over adding codebase features."
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 border-t border-zinc-800/50 pt-4 mt-4">
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                Injected 3 semantic memories from MongoDB Atlas using Vector Similarity search
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid Section */}
        <section id="features" className="w-full mt-32 text-left">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Four Dimensions of Long-Term Memory
            </h2>
            <p className="text-zinc-400 mt-4 text-base">
              Memoria AI categorizes interactions and structures them into specific knowledge schemas inside MongoDB, allowing the agent to reason dynamically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Episodic & Semantic</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Captures life events, milestones, and structural preferences. Remembers details like your tech stack, business metrics, or strategic pivots.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md hover:border-purple-500/30 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Goal Alignment</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Tracks your multi-month objectives. Connects conversations to high-level goals and monitors your development progress automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md hover:border-pink-500/30 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-6 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                <CheckSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Task Management</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Extracts actionable to-do items from conversations. Helps you schedule work, track completion, and stay accountable.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md hover:border-emerald-500/30 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Reflection Loop</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Periodically reviews your memory log, deduces patterns, and publishes high-level behavioral insights to guide future decision-making.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-black/40 py-12 text-center text-sm text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} Memoria AI. Built for the Google & MongoDB Agent Hackathon.</div>
          <div className="flex gap-6 text-zinc-400">
            <span className="flex items-center gap-1"><Database className="h-4 w-4 text-emerald-500" /> MongoDB Atlas</span>
            <span className="flex items-center gap-1"><Sparkles className="h-4 w-4 text-indigo-400" /> Gemini 2.5 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
