import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-amber-500/30">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <main className="relative flex flex-col items-center justify-center min-h-screen px-6 py-24 text-center z-10">
        
        {/* Herald Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-sm font-medium tracking-wide text-amber-400 bg-amber-400/10 rounded-full ring-1 ring-amber-400/20">
          <span>📜</span>
          <span>By Royal Decree</span>
        </div>

        {/* Hero Title */}
        <h1 className="max-w-4xl mb-6 text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
          The Dagmawi Dispatch
        </h1>

        {/* Tagline */}
        <p className="max-w-2xl mb-12 text-xl md:text-2xl text-zinc-400 font-light leading-relaxed">
          Babi's news, minus the scroll fatigue. <br className="hidden md:block" />
          <span className="italic text-zinc-500 text-lg">Because you have a kingdom to run, and he has a keyboard to break.</span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href="https://t.me/BabisummarizeBot"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 font-semibold text-zinc-950 bg-amber-500 rounded-full overflow-hidden transition-transform active:scale-95"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative">Summon the Bot</span>
            <svg className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          
          <a
            href="#features"
            className="inline-flex items-center justify-center px-8 py-4 font-semibold text-zinc-300 transition-colors rounded-full hover:text-white hover:bg-zinc-900"
          >
            Read the Scrolls
          </a>
        </div>

        {/* Feature Highlights */}
        <div id="features" className="grid w-full max-w-5xl grid-cols-1 gap-8 mt-32 md:grid-cols-3 text-left">
          
          <div className="flex flex-col p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-center w-12 h-12 mb-6 text-2xl bg-zinc-800 rounded-2xl text-amber-400">
              🎺
            </div>
            <h3 className="mb-3 text-xl font-bold text-zinc-100">The /babiometer</h3>
            <p className="text-zinc-400 leading-relaxed">
              Gauge the day's volume with trumpet blasts. 1 blast? A quiet day. 5 blasts? Sound the alarms, he's composing a novel.
            </p>
          </div>

          <div className="flex flex-col p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-center w-12 h-12 mb-6 text-2xl bg-zinc-800 rounded-2xl text-amber-400">
              🔥
            </div>
            <h3 className="mb-3 text-xl font-bold text-zinc-100">Royal Roasts</h3>
            <p className="text-zinc-400 leading-relaxed">
              Use <code className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">/roast</code> for affectionate jabs at how much he posts. Because someone has to hold the court jester accountable.
            </p>
          </div>

          <div className="flex flex-col p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-center w-12 h-12 mb-6 text-2xl bg-zinc-800 rounded-2xl text-amber-400">
              🛡️
            </div>
            <h3 className="mb-3 text-xl font-bold text-zinc-100">Ready-made Excuses</h3>
            <p className="text-zinc-400 leading-relaxed">
              Didn't read the summary? Hit <code className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">/excuse</code> and tell your friends a dragon ate your scrolls. We won't judge.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
