import { useState } from 'react';
import { Activity, ArrowRight, Brain, Trophy, Video, Calendar, Heart, Footprints } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';

export function LandingPage() {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [hovered, setHovered] = useState<number | null>(null);

  const features = [
    { icon: Brain, title: 'AI Training Plans', desc: 'Personalized daily, weekly & monthly plans that adapt to your progress.' },
    { icon: Video, title: 'AI Video Analysis', desc: 'Upload training clips and get instant technique feedback from AI.' },
    { icon: Calendar, title: 'Sport-Specific Drills', desc: 'Step-by-step coaching with embedded video for 7 sports.' },
    { icon: Activity, title: 'Fitness Tracking', desc: 'Monitor BMI, steps, calories, sleep, hydration & recovery.' },
    { icon: Trophy, title: 'Challenges & Achievements', desc: 'Stay motivated with challenges and unlock achievements.' },
    { icon: Heart, title: 'AI Coach Chat', desc: 'Ask your AI coach anything, anytime — personalized guidance 24/7.' },
  ];

  const sports = ['Football', 'Cricket', 'Basketball', 'Tennis', 'Badminton', 'Athletics', 'General Fitness'];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-40 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/image copy.png" alt="TrainX" className="h-9 w-9 rounded-xl object-cover shadow-lg" />
            <span className="font-display text-xl font-bold text-white">TrainX</span>
          </div>
          <button
            onClick={() => navigate(user ? (profile ? '/dashboard' : '/onboarding') : '/auth')}
            className="btn-primary text-sm"
          >
            {user ? 'Open App' : 'Get Started'}
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-lime-500/5 blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 chip bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-6 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            AI-Powered Sports Training
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight animate-slide-up">
            Train smarter.
            <br />
            <span className="text-gradient">Perform stronger.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-300 max-w-2xl mx-auto leading-relaxed animate-slide-up">
            Your personal AI coach for football, cricket, basketball, tennis, badminton,
            athletics and general fitness. Get adaptive training plans, video analysis, and
            real-time guidance — all in one premium app.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <button onClick={() => navigate('/auth')} className="btn-primary text-base px-7 py-3.5">
              Start Training Free
              <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/auth')} className="btn-secondary text-base px-7 py-3.5">
              Explore Drills
            </button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 animate-fade-in">
            {sports.map((s) => (
              <span key={s} className="chip bg-ink-800/60 text-ink-200 border border-ink-700/50">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Everything you need to <span className="text-gradient">level up</span>
            </h2>
            <p className="mt-3 text-ink-300 max-w-xl mx-auto">
              A complete training ecosystem designed for athletes who want to win.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="card card-hover p-6 group cursor-default"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br transition-all duration-300 ${hovered === i ? 'from-brand-500/20 to-brand-700/5 scale-110' : 'from-ink-700/30 to-ink-800/5'}`}>
                  <f.icon size={24} className={hovered === i ? 'text-brand-400' : 'text-ink-200'} />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-ink-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-lime-500/5" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Ready to become your best?
            </h2>
            <p className="mt-3 text-ink-300">
              Join TrainX today. Build your athlete profile and get your first AI plan in minutes.
            </p>
            <button onClick={() => navigate('/auth')} className="btn-primary mt-6 text-base px-7 py-3.5">
              Create Your Profile
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-sm text-ink-400">
        TrainX — AI Sports & Fitness. Built for athletes.
      </footer>
    </div>
  );
}
