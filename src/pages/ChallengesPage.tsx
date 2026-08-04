import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { Trophy, Check, Plus, Flame, Footprints, Droplets, Sunrise, Target, Zap, Shield, Crown, Swords, Dumbbell, Activity, Calendar, Video, Award, Download } from 'lucide-react';
import type { Challenge, ChallengeParticipant, Achievement, UserAchievement } from '@/types';

const ICONS: Record<string, typeof Trophy> = {
  Flame, Footprints, Droplets, Sunrise, Target, Zap, Shield, Crown, Swords, Dumbbell, Activity, Calendar, Video, Trophy,
};

export function ChallengesPage() {
  const { user, profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participations, setParticipations] = useState<ChallengeParticipant[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [tab, setTab] = useState<'challenges' | 'achievements'>('challenges');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cRes, pRes, aRes, uaRes] = await Promise.all([
        supabase.from('challenges').select('*').eq('is_active', true),
        supabase.from('challenge_participants').select('*').eq('user_id', user.id),
        supabase.from('achievements').select('*'),
        supabase.from('user_achievements').select('*').eq('user_id', user.id),
      ]);
      setChallenges((cRes.data as Challenge[]) ?? []);
      setParticipations((pRes.data as ChallengeParticipant[]) ?? []);
      setAchievements((aRes.data as Achievement[]) ?? []);
      setUserAchievements((uaRes.data as UserAchievement[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const isJoined = (cid: string) => participations.some((p) => p.challenge_id === cid);
  const getParticipation = (cid: string) => participations.find((p) => p.challenge_id === cid);
  const isEarned = (aid: string) => userAchievements.some((ua) => ua.achievement_id === aid);

  const handleJoin = async (challenge: Challenge) => {
    if (!user || isJoined(challenge.id)) return;
    setJoining(challenge.id);
    const { data } = await supabase.from('challenge_participants').insert({
      challenge_id: challenge.id,
      user_id: user.id,
    }).select('*').single();
    if (data) setParticipations((prev) => [...prev, data as ChallengeParticipant]);
    setJoining(null);
  };

  const handleUpdateProgress = async (challenge: Challenge, participant: ChallengeParticipant) => {
    if (!user) return;
    const newProgress = Math.min(challenge.target_value, participant.progress + Math.ceil(challenge.target_value / 10));
    const completed = newProgress >= challenge.target_value;
    const { data } = await supabase.from('challenge_participants').update({
      progress: newProgress,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', participant.id).select('*').single();
    if (data) {
      setParticipations((prev) => prev.map((p) => p.id === data.id ? data as ChallengeParticipant : p));
    }
  };

  if (loading) return <div className="text-ink-300">Loading...</div>;

  const downloadCertificate = (challengeTitle: string, userName: string, points: number) => {
    const date = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1117"/>
      <stop offset="100%" stop-color="#1a1d28"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="800" height="560" fill="url(#bg)" rx="12"/>
  <rect x="20" y="20" width="760" height="520" fill="none" stroke="url(#gold)" stroke-width="3" rx="8"/>
  <rect x="32" y="32" width="736" height="496" fill="none" stroke="#fbbf24" stroke-width="1" opacity="0.4" rx="4"/>
  <text x="400" y="80" text-anchor="middle" fill="#fbbf24" font-family="Georgia, serif" font-size="16" letter-spacing="6">CERTIFICATE OF COMPLETION</text>
  <line x1="250" y1="100" x2="550" y2="100" stroke="#fbbf24" stroke-width="1" opacity="0.5"/>
  <text x="400" y="160" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="14" opacity="0.7">This certificate is proudly presented to</text>
  <text x="400" y="220" text-anchor="middle" fill="#f8fafc" font-family="Georgia, serif" font-size="42" font-weight="bold">${userName}</text>
  <line x1="200" y1="250" x2="600" y2="250" stroke="#fbbf24" stroke-width="2" opacity="0.6"/>
  <text x="400" y="300" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="16">for successfully completing the</text>
  <text x="400" y="340" text-anchor="middle" fill="#fbbf24" font-family="Georgia, serif" font-size="28" font-weight="bold">${challengeTitle}</text>
  <text x="400" y="390" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="14">challenge and earning ${points} points</text>
  <text x="400" y="460" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="13">Awarded on ${date}</text>
  <text x="400" y="490" text-anchor="middle" fill="#475569" font-family="Arial, sans-serif" font-size="11" letter-spacing="3">TRAINX AI SPORTS &amp; FITNESS</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${challengeTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const earnedCount = userAchievements.length;
  const totalPoints = userAchievements.reduce((s, ua) => {
    const a = achievements.find((x) => x.id === ua.achievement_id);
    return s + (a?.points ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Challenges & Achievements</h1>
        <p className="text-ink-300 text-sm mt-1">Stay motivated and earn rewards</p>
      </div>

      {/* Certificate eligibility info */}
      <div className="card p-4 bg-gradient-to-r from-brand-500/10 to-lime-500/5 border-brand-500/20">
        <div className="flex items-start gap-3">
          <Award size={20} className="text-brand-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">How to earn certificates here</p>
            <p className="text-xs text-ink-300 mt-1">
              Complete any challenge by reaching its target to earn a Challenge Certificate.
              Unlock achievements by meeting their criteria to earn Achievement Certificates.
              Each certificate includes your name, the challenge title, and points earned.
            </p>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <Trophy size={24} className="mx-auto text-lime-400 mb-2" />
          <p className="font-display text-2xl font-bold text-white">{participations.filter(p => p.completed).length}</p>
          <p className="text-xs text-ink-400">Completed</p>
        </div>
        <div className="card p-5 text-center">
          <Crown size={24} className="mx-auto text-brand-400 mb-2" />
          <p className="font-display text-2xl font-bold text-white">{earnedCount}</p>
          <p className="text-xs text-ink-400">Achievements</p>
        </div>
        <div className="card p-5 text-center">
          <Zap size={24} className="mx-auto text-coral-400 mb-2" />
          <p className="font-display text-2xl font-bold text-white">{totalPoints.toLocaleString()}</p>
          <p className="text-xs text-ink-400">Total Points</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('challenges')}
          className={`chip ${tab === 'challenges' ? 'bg-brand-500/20 text-brand-300' : 'bg-ink-800/50 text-ink-300'}`}
        >
          <Trophy size={14} /> Challenges
        </button>
        <button
          onClick={() => setTab('achievements')}
          className={`chip ${tab === 'achievements' ? 'bg-brand-500/20 text-brand-300' : 'bg-ink-800/50 text-ink-300'}`}
        >
          <Crown size={14} /> Achievements
        </button>
      </div>

      {tab === 'challenges' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((c) => {
            const part = getParticipation(c.id);
            const Icon = c.icon ? ICONS[c.icon] ?? Trophy : Trophy;
            return (
              <div key={c.id} className="card card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/5">
                    <Icon size={20} className="text-brand-400" />
                  </div>
                  <span className={`chip text-xs ${c.difficulty === 'beginner' ? 'bg-lime-500/10 text-lime-400' : c.difficulty === 'intermediate' ? 'bg-brand-500/10 text-brand-400' : 'bg-coral-500/10 text-coral-400'}`}>
                    {c.difficulty}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-white mb-1">{c.title}</h3>
                <p className="text-sm text-ink-300 mb-3">{c.description}</p>
                <div className="flex items-center gap-2 mb-3 text-xs text-ink-400">
                  <Calendar size={12} /> {c.duration_days} days
                  <span>•</span>
                  <Zap size={12} /> {c.points} pts
                </div>

                {part ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-ink-400">{part.progress} / {c.target_value} {c.target_unit}</span>
                      {part.completed ? (
                        <span className="chip bg-lime-500/10 text-lime-400 text-xs"><Check size={12} /> Done</span>
                      ) : (
                        <button
                          onClick={() => handleUpdateProgress(c, part)}
                          className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                        >
                          + Log Progress
                        </button>
                      )}
                    </div>
                    <ProgressBar value={part.progress} max={c.target_value} color={part.completed ? 'lime' : 'brand'} />
                    {part.completed && (
                      <button
                        onClick={() => downloadCertificate(c.title, profile?.full_name ?? 'Athlete', c.points)}
                        className="btn-secondary w-full text-sm py-2.5 mt-2"
                      >
                        <Award size={16} /> Download Certificate
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleJoin(c)}
                    disabled={joining === c.id}
                    className="btn-secondary w-full text-sm py-2.5"
                  >
                    {joining === c.id ? <Spinner size={16} /> : <><Plus size={16} /> Join Challenge</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'achievements' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((a) => {
            const earned = isEarned(a.id);
            const Icon = a.icon ? ICONS[a.icon] ?? Trophy : Trophy;
            const tierColors = {
              bronze: 'from-orange-700/30 to-orange-900/10 text-orange-400',
              silver: 'from-gray-400/30 to-gray-600/10 text-gray-300',
              gold: 'from-yellow-500/30 to-yellow-700/10 text-yellow-400',
              platinum: 'from-cyan-400/30 to-cyan-600/10 text-cyan-300',
            };
            return (
              <div key={a.id} className={`card p-5 ${earned ? '' : 'opacity-50 grayscale'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tierColors[a.tier]}`}>
                    <Icon size={20} />
                  </div>
                  {earned ? (
                    <span className="chip bg-lime-500/10 text-lime-400 text-xs"><Check size={12} /> Earned</span>
                  ) : (
                    <span className="chip bg-ink-700/50 text-ink-400 text-xs capitalize">{a.tier}</span>
                  )}
                </div>
                <h3 className="font-display text-base font-bold text-white mb-1">{a.title}</h3>
                <p className="text-sm text-ink-300 mb-2">{a.description}</p>
                <div className="flex items-center justify-between text-xs text-ink-400">
                  <span className="capitalize">{a.tier} tier</span>
                  <span className="flex items-center gap-1"><Zap size={12} /> {a.points} pts</span>
                </div>
                {earned && (
                  <button
                    onClick={() => downloadCertificate(a.title, profile?.full_name ?? 'Athlete', a.points)}
                    className="btn-secondary w-full text-sm py-2.5 mt-3"
                  >
                    <Award size={16} /> Download Certificate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
