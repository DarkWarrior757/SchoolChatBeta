import { useEffect, useState } from 'react';
import { ArrowRight, Check, Radio, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SchoolClass } from '@/types';

export function ClassSelection({ userId, onCompleted }: { userId: string; onCompleted: () => void }) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });
      const classRows = (classData || []) as SchoolClass[];
      setClasses(classRows);
      setLoading(false);
    })();
  }, []);

  const selectedClass = classes.find(c => c.id === selectedClassId) || null;

  const enroll = async () => {
    if (!selectedClassId) { setError('Please select a class.'); return; }
    setError('');
    setEnrolling(true);
    const { error: enrollError } = await supabase.rpc('enroll_self', {
      class_uuid: selectedClassId,
      section_uuid: null,
    });
    if (enrollError) {
      setError(enrollError.message || 'Unable to join the class. Please try again.');
      setEnrolling(false);
      return;
    }
    setEnrolling(false);
    setDone(true);
    setTimeout(onCompleted, 800);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#09111e] flex items-center justify-center">
      <div className="h-10 w-10 rounded-xl border-2 border-[#367faf] border-t-transparent animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-[#09111e] flex items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute -top-40 -left-24 h-96 w-96 rounded-full bg-[#165a8f]/25 blur-3xl" />
      <div className="absolute -bottom-48 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#126d69]/20 blur-3xl" />
      <div className="relative glass rounded-[28px] border border-[#263a54] shadow-2xl p-10 text-center max-w-md">
        <div className="h-14 w-14 rounded-xl bg-[#174c43] flex items-center justify-center text-[#61d3ad] mx-auto mb-5"><Check size={28} /></div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">You're all set!</h2>
        <p className="text-[#91a7c2] leading-7">You've joined {selectedClass?.name}. Welcome to your class community.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09111e] flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <div className="absolute -top-40 -left-24 h-96 w-96 rounded-full bg-[#165a8f]/25 blur-3xl" />
      <div className="absolute -bottom-48 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#126d69]/20 blur-3xl" />
      <div className="relative w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-[15px] bg-[#1f75b6] flex items-center justify-center shadow-xl"><Radio size={25} /></div>
          <div>
            <div className="font-display text-xl font-bold text-white">SchoolChat <span className="text-[#65b8ff]">BETA</span></div>
            <div className="text-xs text-[#7590ae]">Connect. Communicate. Learn.</div>
          </div>
        </div>

        <div className="glass rounded-[28px] border border-[#263a54] shadow-2xl p-7 sm:p-10">
          <div className="h-12 w-12 rounded-xl bg-[#173e62] flex items-center justify-center text-[#71c2ff] mb-5"><BookOpen size={24} /></div>
          <h2 className="font-display text-3xl font-bold text-white mb-2">Join your class</h2>
          <p className="text-[#91a7c2] leading-7 mb-6">Select your class to get started. You'll be added to the right group channels automatically.</p>

          {/* Class selection grid */}
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#7f99b5] mb-3">Your class</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {classes.map(schoolClass => (
                <button
                  key={schoolClass.id}
                  onClick={() => { setSelectedClassId(schoolClass.id); }}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${selectedClassId === schoolClass.id ? 'border-[#4ca8ef] bg-[#17304a]' : 'border-[#29425d] bg-[#13253a] hover:border-[#3d6e9a] hover:bg-[#17304a]'}`}
                >
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden relative" style={{ background: schoolClass.icon_color }}>{schoolClass.icon_emoji || schoolClass.name.slice(0, 2)}{schoolClass.icon_url && <img src={schoolClass.icon_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{schoolClass.name}</div>
                    <div className="text-xs text-[#7692ad] truncate mt-0.5">{schoolClass.description}</div>
                  </div>
                  {selectedClassId === schoolClass.id && <Check size={18} className="text-[#5bb9fa] shrink-0" />}
                </button>
              ))}
            </div>
            {classes.length === 0 && (
              <div className="rounded-xl border border-[#29425d] bg-[#13253a] p-4 text-sm text-[#7189a3]">No classes are available yet. Check back soon or contact your school administrator.</div>
            )}
          </div>

          {error && <div className="mb-4 rounded-xl border border-[#7e3b4c] bg-[#3a1d2a] px-4 py-3 text-sm text-[#ffb8c6]">{error}</div>}

          <div className="flex gap-3">
            <button
              onClick={enroll}
              disabled={!selectedClassId || enrolling}
              className="flex-1 rounded-xl bg-[#247bbb] py-3.5 font-semibold text-white hover:bg-[#2e8bcf] disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {enrolling ? 'Joining...' : 'Join class'} <ArrowRight size={18} />
            </button>
          </div>
          <div className="mt-4 text-center">
            <button onClick={onCompleted} className="text-xs text-[#637b96] hover:text-[#91a7c2] transition">Skip for now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
