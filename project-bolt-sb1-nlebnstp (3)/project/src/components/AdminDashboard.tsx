import { useEffect, useState } from 'react';
import { Users, BookOpen, MessageSquare, Flag, Shield, Activity, ChevronRight, Search, Ban, VolumeX, Crown, Volume2, CircleCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isOwner } from '@/lib/owner';
import type { Profile, Role, SchoolClass } from '@/types';

interface ClassWithOwner {
  id: string;
  name: string;
  icon_emoji: string;
  icon_color: string;
  owner_id: string | null;
  owner_name: string | null;
}

export function AdminDashboard({ profile, classes, onToast }: { profile: Profile; classes: SchoolClass[]; onToast: (msg: string) => void }) {
  const [stats, setStats] = useState({ users: 0, students: 0, teachers: 0, classes: 0, channels: 0, messagesToday: 0, pendingReports: 0 });
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users' | 'classes'>('overview');
  const [classOwners, setClassOwners] = useState<ClassWithOwner[]>([]);
  const [classSearch, setClassSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadStats(); loadUsers(); loadClassOwners(); }, []);

  const loadStats = async () => {
    const [{ count: users }, { count: classCount }, { count: channels }, { count: reports }, { count: messages }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
      supabase.from('channels').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ]);
    setStats(s => ({ ...s, users: users || 0, classes: classCount || 0, channels: channels || 0, pendingReports: reports || 0, messagesToday: messages || 0 }));
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
    setAllUsers((data || []) as Profile[]);
    const students = (data || []).filter((u: Profile) => u.role === 'student').length;
    const teachers = (data || []).filter((u: Profile) => u.role === 'teacher').length;
    setStats(s => ({ ...s, students, teachers }));
    setLoading(false);
  };

  const loadClassOwners = async () => {
    const { data } = await supabase
      .from('class_members')
      .select('class_id, class_role, profiles(id, display_name), classes(id, name, icon_emoji, icon_color)')
      .eq('class_role', 'owner');
    const owners: ClassWithOwner[] = [];
    for (const row of data || []) {
      const cls = (row as Record<string, unknown>).classes as SchoolClass | null;
      const prof = (row as Record<string, unknown>).profiles as Profile | null;
      if (cls) {
        owners.push({
          id: cls.id,
          name: cls.name,
          icon_emoji: cls.icon_emoji,
          icon_color: cls.icon_color,
          owner_id: prof?.id || null,
          owner_name: prof?.display_name || null,
        });
      }
    }
    // Add classes that have no owner yet
    for (const cls of classes) {
      if (!owners.some(o => o.id === cls.id)) {
        owners.push({ id: cls.id, name: cls.name, icon_emoji: cls.icon_emoji, icon_color: cls.icon_color, owner_id: null, owner_name: null });
      }
    }
    setClassOwners(owners);
  };

  const changeRole = async (userId: string, role: Role) => {
    const { error } = await supabase.rpc('set_user_role', { target_uuid: userId, new_role: role });
    if (error) onToast(error.message);
    else { setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u)); onToast('Role updated.'); }
  };

  const banUser = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_ban_user', { target_uuid: userId });
    if (error) onToast(error.message);
    else { setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: true } : u)); onToast('User has been banned.'); }
    setActionLoading(null);
  };

  const unbanUser = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_unban_user', { target_uuid: userId });
    if (error) onToast(error.message);
    else { setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: false } : u)); onToast('User has been unbanned.'); }
    setActionLoading(null);
  };

  const muteInClass = async (classId: string, userId: string) => {
    setActionLoading(`${classId}:${userId}`);
    const { error } = await supabase.rpc('admin_mute_user_in_class', { class_uuid: classId, target_uuid: userId });
    if (error) onToast(error.message);
    else onToast('User muted in this class.');
    setActionLoading(null);
  };

  const unmuteInClass = async (classId: string, userId: string) => {
    setActionLoading(`${classId}:${userId}`);
    const { error } = await supabase.rpc('admin_unmute_user_in_class', { class_uuid: classId, target_uuid: userId });
    if (error) onToast(error.message);
    else onToast('User unmuted in this class.');
    setActionLoading(null);
  };

  const setOwner = async (classId: string, userId: string) => {
    setActionLoading(`owner:${classId}:${userId}`);
    const { error } = await supabase.rpc('admin_set_class_owner', { class_uuid: classId, target_uuid: userId });
    if (error) onToast(error.message);
    else { onToast('Class owner updated.'); await loadClassOwners(); }
    setActionLoading(null);
  };

  const filteredUsers = allUsers.filter(u =>
    u.display_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredClasses = classOwners.filter(c =>
    c.name.toLowerCase().includes(classSearch.toLowerCase())
  );

  const cards = [
    { label: 'Total Users', value: stats.users, icon: <Users size={18} />, accent: 'blue' },
    { label: 'Students', value: stats.students, icon: <Users size={18} />, accent: 'green' },
    { label: 'Teachers', value: stats.teachers, icon: <Users size={18} />, accent: 'amber' },
    { label: 'Classes', value: stats.classes, icon: <BookOpen size={18} />, accent: 'blue' },
    { label: 'Channels', value: stats.channels, icon: <MessageSquare size={18} />, accent: 'green' },
    { label: 'Messages Today', value: stats.messagesToday, icon: <Activity size={18} />, accent: 'amber' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: <Flag size={18} />, accent: 'red' },
  ];

  const tabs = [['overview', 'Overview'], ['users', 'User Management'], ['classes', 'Classes & Owners']] as const;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-12 pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-[#173e62] flex items-center justify-center text-[#71c2ff]"><Shield size={22} /></div>
          <div>
            <h2 className="font-display text-3xl font-bold text-white">Admin Dashboard</h2>
            <p className="text-sm text-[#718ba6] mt-1">Manage your school's SchoolChat platform</p>
          </div>
        </div>

        <div className="flex gap-1 border-b border-[#263b54] mb-6 overflow-x-auto">
          {tabs.map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap px-4 py-3 text-xs font-semibold transition border-b-2 ${tab === value ? 'border-[#62bbfb] text-[#d5eeff]' : 'border-transparent text-[#718ba6] hover:text-white'}`}>{label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
              {cards.map(card => (
                <div key={card.label} className="rounded-2xl border border-[#243a53] bg-[#101d2e] p-4">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${card.accent === 'blue' ? 'bg-[#173e62] text-[#71c2ff]' : card.accent === 'green' ? 'bg-[#174c43] text-[#61d3ad]' : card.accent === 'amber' ? 'bg-[#55401e] text-[#f1bd62]' : 'bg-[#4a2233] text-[#ff9eb0]'}`}>{card.icon}</div>
                  <div className="text-2xl font-display font-bold text-white">{card.value}</div>
                  <div className="text-xs text-[#738ca6] mt-0.5">{card.label}</div>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <button onClick={() => setTab('users')} className="flex items-center gap-3 rounded-2xl border border-[#243a53] bg-[#101d2e] p-5 text-left hover:border-[#4d98ca] transition">
                <div className="h-10 w-10 rounded-xl bg-[#1d3045] flex items-center justify-center text-[#72c4ff]"><Users size={19} /></div>
                <div className="flex-1"><div className="font-semibold text-white text-sm">Manage Users</div><div className="text-xs text-[#738ca6] mt-0.5">Ban, mute, and change roles</div></div>
                <ChevronRight size={16} className="text-[#557693]" />
              </button>
              <button onClick={() => setTab('classes')} className="flex items-center gap-3 rounded-2xl border border-[#243a53] bg-[#101d2e] p-5 text-left hover:border-[#4d98ca] transition">
                <div className="h-10 w-10 rounded-xl bg-[#1d3045] flex items-center justify-center text-[#72c4ff]"><BookOpen size={19} /></div>
                <div className="flex-1"><div className="font-semibold text-white text-sm">Manage Classes</div><div className="text-xs text-[#738ca6] mt-0.5">Set owners and mute members</div></div>
                <ChevronRight size={16} className="text-[#557693]" />
              </button>
            </div>
          </>
        )}

        {tab === 'users' && (
          <section className="rounded-2xl border border-[#243a53] bg-[#101d2e] p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-white">User Management</h3>
              <div className="flex items-center gap-2 rounded-lg border border-[#304b67] bg-[#14253a] px-2">
                <Search size={14} className="text-[#7192ad]" />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users" className="w-32 bg-transparent py-2 text-xs text-white outline-none" />
              </div>
            </div>
            {loading ? <div className="flex justify-center py-8"><div className="h-6 w-6 rounded-full border-2 border-[#3e8abc] border-t-transparent animate-spin" /></div> :
             <div className="space-y-2">
               {filteredUsers.map(user => (
                 <div key={user.id} className="flex items-center gap-3 rounded-xl border border-[#29435e] bg-[#13263b] p-3">
                   <div className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: user.avatar_color }}>{user.display_name.slice(0, 2).toUpperCase()}</div>
                   <div className="min-w-0 flex-1">
                     <div className="flex items-center gap-2">
                       <span className="font-semibold text-white text-sm truncate">{isOwner(user.id) ? <span className="owner-name">{user.display_name}</span> : user.display_name}</span>
                       {user.is_banned && <span className="rounded bg-[#4a2233] px-1.5 py-0.5 text-[10px] font-bold text-[#ff9eb0]">BANNED</span>}
                     </div>
                     <div className="text-xs text-[#7793ad]">@{user.username}</div>
                   </div>
                   <select value={user.role} onChange={e => changeRole(user.id, e.target.value as Role)} className="rounded-lg border border-[#3b5874] bg-[#0c1828] px-2 py-1.5 text-xs text-white outline-none" disabled={user.id === profile.id}>
                     <option value="student">Student</option>
                     <option value="teacher">Teacher</option>
                     <option value="moderator">Moderator</option>
                     <option value="admin">Admin</option>
                   </select>
                   {user.id !== profile.id && (
                     user.is_banned ? (
                       <button onClick={() => unbanUser(user.id)} disabled={actionLoading === user.id} className="rounded-lg border border-[#2d4e1f] bg-[#1a2e16] px-3 py-2 text-xs font-semibold text-[#7dd662] hover:bg-[#213a14] transition disabled:opacity-40 flex items-center gap-1.5">
                         <CircleCheck size={13} /> Unban
                       </button>
                     ) : (
                       <button onClick={() => banUser(user.id)} disabled={actionLoading === user.id} className="rounded-lg border border-[#4b2c38] bg-[#2a1620] px-3 py-2 text-xs font-semibold text-[#ff9eb0] hover:bg-[#3a1f2a] transition disabled:opacity-40 flex items-center gap-1.5">
                         <Ban size={13} /> Ban
                       </button>
                     )
                   )}
                 </div>
               ))}
               {!filteredUsers.length && <div className="text-sm text-[#7189a3] text-center py-6">No users found</div>}
             </div>}
          </section>
        )}

        {tab === 'classes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-white">Classes & Owners</h3>
              <div className="flex items-center gap-2 rounded-lg border border-[#304b67] bg-[#14253a] px-2">
                <Search size={14} className="text-[#7192ad]" />
                <input value={classSearch} onChange={e => setClassSearch(e.target.value)} placeholder="Search classes" className="w-32 bg-transparent py-2 text-xs text-white outline-none" />
              </div>
            </div>
            {filteredClasses.map(cls => (
              <ClassManagementCard
                key={cls.id}
                cls={cls}
                allUsers={allUsers}
                currentAdminId={profile.id}
                actionLoading={actionLoading}
                onMute={muteInClass}
                onUnmute={unmuteInClass}
                onSetOwner={setOwner}
                onToast={onToast}
              />
            ))}
            {!filteredClasses.length && <div className="text-sm text-[#7189a3] text-center py-6">No classes found</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassManagementCard({ cls, allUsers, currentAdminId, actionLoading, onMute, onUnmute, onSetOwner, onToast }: {
  cls: ClassWithOwner;
  allUsers: Profile[];
  currentAdminId: string;
  actionLoading: string | null;
  onMute: (classId: string, userId: string) => void;
  onUnmute: (classId: string, userId: string) => void;
  onSetOwner: (classId: string, userId: string) => void;
  onToast: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<{ user_id: string; class_role: string; is_muted_in_class: boolean; profiles: Profile | null }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');

  const loadMembers = async () => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from('class_members')
      .select('user_id, class_role, is_muted_in_class, profiles(*)')
      .eq('class_id', cls.id);
    setMembers((data || []) as unknown as { user_id: string; class_role: string; is_muted_in_class: boolean; profiles: Profile | null }[]);
    setLoadingMembers(false);
  };

  const toggleExpand = () => {
    if (!expanded) loadMembers();
    setExpanded(!expanded);
  };

  const filteredOwnerCandidates = allUsers.filter(u =>
    u.id !== cls.owner_id &&
    (u.display_name.toLowerCase().includes(ownerSearch.toLowerCase()) || u.username.toLowerCase().includes(ownerSearch.toLowerCase()))
  );

  return (
    <div className="rounded-2xl border border-[#243a53] bg-[#101d2e] overflow-hidden">
      <button onClick={toggleExpand} className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#13253a] transition">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: cls.icon_color }}>{cls.icon_emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white text-sm">{cls.name}</div>
          <div className="text-xs text-[#7793ad] mt-0.5 flex items-center gap-1.5">
            <Crown size={12} className="text-[#f1bd62]" />
            {cls.owner_name || 'No owner assigned'}
          </div>
        </div>
        <ChevronRight size={16} className={`text-[#557693] transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-[#243a53] p-4 space-y-4">
          {loadingMembers ? (
            <div className="flex justify-center py-4"><div className="h-5 w-5 rounded-full border-2 border-[#3e8abc] border-t-transparent animate-spin" /></div>
          ) : (
            <>
              <div>
                <div className="text-[10px] font-bold tracking-[.13em] text-[#6f8da8] mb-2">MEMBERS — {members.length}</div>
                <div className="space-y-1.5">
                  {members.map(m => (
                    <div key={m.user_id} className="flex items-center gap-2.5 rounded-lg bg-[#13263b] px-3 py-2">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: m.profiles?.avatar_color || '#3b82f6' }}>{(m.profiles?.display_name || '?').slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white truncate">{m.profiles?.display_name || 'Unknown'}</span>
                          {m.class_role === 'owner' && <span className="rounded bg-[#4a3c1e] px-1 py-0.5 text-[9px] font-bold text-[#f1bd62]">OWNER</span>}
                          {m.is_muted_in_class && <span className="rounded bg-[#4a2233] px-1 py-0.5 text-[9px] font-bold text-[#ff9eb0]">MUTED</span>}
                        </div>
                        <div className="text-[10px] text-[#7089a4]">@{m.profiles?.username || 'unknown'}</div>
                      </div>
                      {m.user_id !== currentAdminId && m.class_role !== 'owner' && (
                        m.is_muted_in_class ? (
                          <button onClick={() => onUnmute(cls.id, m.user_id)} disabled={actionLoading === `${cls.id}:${m.user_id}`} className="rounded-lg border border-[#2d4e1f] bg-[#1a2e16] px-2.5 py-1.5 text-[10px] font-semibold text-[#7dd662] hover:bg-[#213a14] transition disabled:opacity-40 flex items-center gap-1">
                            <Volume2 size={12} /> Unmute
                          </button>
                        ) : (
                          <button onClick={() => onMute(cls.id, m.user_id)} disabled={actionLoading === `${cls.id}:${m.user_id}`} className="rounded-lg border border-[#4b2c38] bg-[#2a1620] px-2.5 py-1.5 text-[10px] font-semibold text-[#ff9eb0] hover:bg-[#3a1f2a] transition disabled:opacity-40 flex items-center gap-1">
                            <VolumeX size={12} /> Mute
                          </button>
                        )
                      )}
                    </div>
                  ))}
                  {!members.length && <div className="text-xs text-[#7189a3] text-center py-3">No members in this class yet.</div>}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold tracking-[.13em] text-[#6f8da8] mb-2">ASSIGN NEW OWNER</div>
                <div className="flex items-center gap-2 rounded-lg border border-[#304b67] bg-[#14253a] px-2 mb-2">
                  <Search size={13} className="text-[#7192ad]" />
                  <input value={ownerSearch} onChange={e => setOwnerSearch(e.target.value)} placeholder="Search users to assign as owner" className="w-full bg-transparent py-2 text-xs text-white outline-none" />
                </div>
                {ownerSearch && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredOwnerCandidates.slice(0, 8).map(u => (
                      <button key={u.id} onClick={() => { onSetOwner(cls.id, u.id); setOwnerSearch(''); }} disabled={actionLoading === `owner:${cls.id}:${u.id}`} className="w-full flex items-center gap-2.5 rounded-lg bg-[#13263b] px-3 py-2 text-left hover:bg-[#1a2f48] transition disabled:opacity-40">
                        <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: u.avatar_color }}>{u.display_name.slice(0, 2).toUpperCase()}</div>
                        <span className="text-xs text-white flex-1 truncate">{u.display_name}</span>
                        <span className="text-[10px] text-[#7089a4]">@{u.username}</span>
                        <Crown size={13} className="text-[#f1bd62]" />
                      </button>
                    ))}
                    {!filteredOwnerCandidates.length && <div className="text-[10px] text-[#7189a3] text-center py-2">No matching users</div>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
