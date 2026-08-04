import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { generateVideoFeedback, generateVideoQA } from '@/lib/ai';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { SPORTS, type VideoAnalysis, type Sport } from '@/types';
import { Video, Upload, Play, Check, X, Clock, Sparkles, Trash2, TrendingUp, Send, MessageSquare } from 'lucide-react';

interface QAEntry { question: string; answer: string; }

export function AnalysisPage() {
  const { profile, user } = useAuth();
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<VideoAnalysis | null>(null);
  const [sport, setSport] = useState<Sport>(profile?.sport ?? 'general_fitness');
  const fileRef = useRef<HTMLInputElement>(null);

  // Q&A state
  const [qaHistory, setQaHistory] = useState<Record<string, QAEntry[]>>({});
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const qaScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('video_analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setAnalyses((data as VideoAnalysis[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (qaScrollRef.current) {
      qaScrollRef.current.scrollTop = qaScrollRef.current.scrollHeight;
    }
  }, [qaHistory, selected]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const fileName = file.name;

    const { data: record } = await supabase.from('video_analyses').insert({
      user_id: user.id,
      sport,
      video_url: URL.createObjectURL(file),
      status: 'processing',
    }).select('*').single();

    if (record) {
      setAnalyses((prev) => [record as VideoAnalysis, ...prev]);

      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1500));
      const result = generateVideoFeedback(sport, fileName);

      const { data: updated } = await supabase.from('video_analyses').update({
        status: 'completed',
        feedback: result.feedback,
        score: result.score,
        analysis: result.analysis,
      }).eq('id', record.id).select('*').single();

      if (updated) {
        setAnalyses((prev) => prev.map((a) => a.id === updated.id ? updated as VideoAnalysis : a));
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    await supabase.from('video_analyses').delete().eq('id', id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    setSelected(null);
  };

  const handleAskQuestion = async () => {
    if (!selected || !qaInput.trim() || qaLoading) return;
    const question = qaInput.trim();
    setQaInput('');
    setQaLoading(true);

    await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));
    const answer = generateVideoQA(question, selected.sport, selected.score ?? 75, selected.analysis ?? {});

    setQaHistory((prev) => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] ?? []), { question, answer }],
    }));
    setQaLoading(false);
  };

  if (loading) return <div className="text-ink-300">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">AI Video Analysis</h1>
        <p className="text-ink-300 text-sm mt-1">Upload training clips, get a technique score, and ask follow-up questions</p>
      </div>

      {/* Upload zone */}
      <div className="card p-6">
        <div className="mb-4">
          <label className="label">Select Sport</label>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <button key={s.value} onClick={() => setSport(s.value)}
                className={`chip border capitalize ${sport === s.value ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'bg-ink-800/50 border-ink-700 text-ink-300'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div onClick={() => !uploading && fileRef.current?.click()}
          className="border-2 border-dashed border-ink-600 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-all">
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner className="text-brand-400" size={28} />
              <p className="text-ink-300 text-sm">Analyzing your video with AI...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-500/10"><Upload size={24} className="text-brand-400" /></div>
              <div>
                <p className="font-semibold text-white">Upload a training video</p>
                <p className="text-sm text-ink-300 mt-1">Click to select a video file. MP4, MOV, WebM supported.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis history */}
      {analyses.length === 0 ? (
        <div className="card p-12 text-center">
          <Video size={36} className="mx-auto text-ink-500 mb-3" />
          <p className="text-ink-300">No videos analyzed yet. Upload one above to get started.</p>
        </div>
      ) : (
        <div>
          <h2 className="font-display text-lg font-bold text-white mb-3">Analysis History</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((a) => (
              <button key={a.id} onClick={() => setSelected(a)} className="card card-hover p-5 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="chip bg-ink-700/50 text-ink-300 capitalize">{a.sport.replace('_', ' ')}</span>
                  {a.status === 'processing' ? (
                    <span className="chip bg-brand-500/10 text-brand-400"><Clock size={12} /> Processing</span>
                  ) : a.status === 'completed' ? (
                    <span className="chip bg-lime-500/10 text-lime-400"><Check size={12} /> Done</span>
                  ) : (
                    <span className="chip bg-coral-500/10 text-coral-400"><X size={12} /> Failed</span>
                  )}
                </div>
                {a.status === 'completed' && a.score !== null && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <p className="text-xs text-ink-400 mb-1">Technique Score</p>
                      <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lime-400" style={{ width: `${a.score}%` }} />
                      </div>
                    </div>
                    <span className="font-display text-xl font-bold text-white">{a.score}</span>
                  </div>
                )}
                <p className="text-xs text-ink-400">{new Date(a.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detail modal with Q&A */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="AI Video Analysis" size="xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="chip bg-ink-700/50 text-ink-300 capitalize">{selected.sport.replace('_', ' ')}</span>
                <span className="text-xs text-ink-400">{new Date(selected.created_at).toLocaleString()}</span>
              </div>
              {selected.status === 'completed' && (
                <div className="text-right">
                  <p className="text-xs text-ink-400">Technique Score</p>
                  <p className="font-display text-2xl font-bold text-lime-400">{selected.score}/100</p>
                </div>
              )}
            </div>

            {selected.video_url && (
              <div className="rounded-xl overflow-hidden border border-ink-700/60 aspect-video bg-ink-900">
                <video src={selected.video_url} controls className="w-full h-full" />
              </div>
            )}

            {selected.status === 'processing' ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Spinner className="text-brand-400" size={28} />
                <p className="text-ink-300">AI is analyzing your technique...</p>
              </div>
            ) : selected.feedback ? (
              <>
                {/* Feedback */}
                <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
                  <h4 className="font-display font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-brand-400" /> AI Coach Feedback
                  </h4>
                  <p className="text-sm text-ink-200 whitespace-pre-line leading-relaxed">{selected.feedback}</p>
                </div>

                {/* Analysis breakdown */}
                {selected.analysis && (
                  <div>
                    <h4 className="font-display font-bold text-white mb-3 flex items-center gap-2">
                      <TrendingUp size={16} className="text-lime-400" /> Technique Breakdown
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selected.analysis)
                        .filter(([k]) => typeof selected.analysis![k] === 'number')
                        .map(([key, val]) => (
                          <div key={key} className="p-3 rounded-xl bg-ink-800/50">
                            <p className="text-xs text-ink-400 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-ink-700 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lime-400" style={{ width: `${val}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-white">{val as number}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Q&A Section */}
                <div className="border-t border-ink-700/60 pt-4">
                  <h4 className="font-display font-bold text-white mb-3 flex items-center gap-2">
                    <MessageSquare size={16} className="text-brand-400" /> Ask About This Analysis
                  </h4>

                  {/* Q&A history */}
                  {(qaHistory[selected.id]?.length ?? 0) > 0 && (
                    <div ref={qaScrollRef} className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                      {(qaHistory[selected.id] ?? []).map((qa, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-end">
                            <div className="max-w-[85%] px-3.5 py-2 rounded-2xl bg-brand-500 text-ink-950 text-sm rounded-br-md">
                              {qa.question}
                            </div>
                          </div>
                          <div className="flex justify-start gap-2">
                            <div className="shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                              <Sparkles size={13} className="text-ink-950" />
                            </div>
                            <div className="max-w-[85%] px-3.5 py-2 rounded-2xl bg-ink-800/80 border border-ink-700/60 text-ink-100 text-sm rounded-bl-md whitespace-pre-line">
                              {qa.answer}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested questions */}
                  {(qaHistory[selected.id]?.length ?? 0) === 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-ink-400 mb-2">Try asking:</p>
                      <div className="flex flex-wrap gap-2">
                        {['How do I fix my technique?', 'What drills should I do?', 'How is my footwork?', 'What should I work on next?'].map((q) => (
                          <button key={q} onClick={() => { setQaInput(q); }}
                            className="chip bg-ink-800/50 border border-ink-700 text-ink-300 text-xs hover:border-brand-500 hover:text-brand-300 transition-all">
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Q&A input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={qaInput}
                      onChange={(e) => setQaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                      placeholder="Ask a question about your technique..."
                      className="input flex-1 text-sm"
                      disabled={qaLoading}
                    />
                    <button onClick={handleAskQuestion} disabled={qaLoading || !qaInput.trim()} className="btn-primary px-4 py-3 shrink-0">
                      {qaLoading ? <Spinner size={16} /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex justify-end pt-2">
              <button onClick={() => handleDelete(selected.id)} className="btn-ghost text-coral-400 text-sm">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
