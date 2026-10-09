import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight,
  Crown, Flag, Hash, Home, Lock, LogOut, Menu, MessageCircle, MoreHorizontal,
  Paperclip, Plus, Radio, Search, Send, Settings, Shield, Sparkles, Users, X,
  UserPlus, UserRound, ArrowUpRight, CheckCheck, Trash2, Reply, Edit3, PanelRight,
  Ban, UserMinus, Volume2, VolumeX,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Category, Channel, ClassMember, FriendRequest, Friendship, Message, Notification, Profile, Role, SchoolClass } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { TermsGate } from '@/components/TermsGate';
import { ClassSelection } from '@/components/ClassSelection';
import { DirectMessages } from '@/components/DirectMessages';
import { AdminDashboard } from '@/components/AdminDashboard';
import { SettingsView } from '@/components/SettingsView';
import { ReportModal } from '@/components/ReportModal';
import { ServerSettings } from '@/components/ServerSettings';
import { isOwner, ownerNameClass } from '@/lib/owner';

type View = 'home' | 'class' | 'friends' | 'messages' | 'notifications' | 'profile' | 'settings' | 'admin';

const canManageServer = (members: ClassMember[], userId: string) => members.some(m => m.user_id === userId && (m.class_role === 'owner' || m.class_role === 'moderator'));

const avatarColors = ['#2777b8', '#0c8f80', '#7b5e9d', '#b86934', '#a44865'];
const fallbackClasses: SchoolClass[] = [];
const formatTime = (date: string) => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date));

function Avatar({ profile, size = 'md' }: { profile?: Partial<Profile> | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (profile?.display_name || profile?.username || '?').slice(0, 2).toUpperCase();
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-16 w-16 text-lg' };
  return <div className={`${sizes[size]} shrink-0 rounded-2xl flex items-center justify-center font-display font-bold text-white shadow-lg`} style={{ background: profile?.avatar_color || avatarColors[0] }}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" /> : initials}</div>;
}

function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) { setError('Email and password are required.'); return; }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!emailOk) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setBusy(true);

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      setBusy(false);
      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials')) setError('Incorrect email or password.');
        else if (msg.includes('rate')) setError('Too many attempts. Please wait a moment before trying again.');
        else { setError('Unable to sign in. Please try again.'); console.error('Sign in error:', signInError.message); }
        return;
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: trimmed, password });
      setBusy(false);
      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes('already') || msg.includes('exists')) setError('An account with this email already exists. Try signing in instead.');
        else if (msg.includes('rate')) setError('Too many attempts. Please wait a moment before trying again.');
        else if (msg.includes('weak') || msg.includes('password')) setError('Password is too weak. Use at least 6 characters.');
        else { setError('Unable to create account. Please try again.'); console.error('Sign up error:', signUpError.message); }
        return;
      }
      if (!data.session) setError('Account created. Please sign in with your new credentials.');
    }
  };

  const switchMode = (next: 'signin' | 'signup') => { setMode(next); setError(''); setPassword(''); };

  return <div className="min-h-screen bg-[#09111e] flex items-center justify-center px-5 py-10 relative overflow-hidden">
    <div className="absolute -top-40 -left-24 h-96 w-96 rounded-full bg-[#165a8f]/25 blur-3xl" /><div className="absolute -bottom-48 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#126d69]/20 blur-3xl" />
    <div className="relative w-full max-w-[1050px] grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
      <div className="hidden lg:block px-6"><div className="flex items-center gap-3 mb-10"><div className="h-12 w-12 rounded-[15px] bg-[#1f75b6] flex items-center justify-center shadow-xl shadow-[#1f75b6]/20"><Radio size={25} /></div><div><div className="font-display text-xl font-bold text-white">SchoolChat <span className="text-[#65b8ff]">BETA</span></div><div className="text-xs text-[#7590ae]">Connect. Communicate. Learn.</div></div></div><h1 className="font-display text-5xl font-bold leading-[1.08] text-white max-w-xl">A calmer place to <span className="text-[#63b7ff]">learn together.</span></h1><p className="mt-6 text-lg leading-8 text-[#91a7c2] max-w-lg">School-approved conversations for classes, clubs, and the people who make your school community.</p><div className="mt-10 flex items-center gap-4 text-sm text-[#7791ab]"><div className="flex -space-x-2"><div className="h-9 w-9 rounded-full border-2 border-[#09111e] bg-[#2777b8]"/><div className="h-9 w-9 rounded-full border-2 border-[#09111e] bg-[#0c8f80]"/><div className="h-9 w-9 rounded-full border-2 border-[#09111e] bg-[#a44865]"/></div><span>Made for your school community</span></div></div>
      <div className="glass rounded-[28px] border border-[#263a54] shadow-2xl p-7 sm:p-10"><div className="lg:hidden flex items-center gap-3 mb-8"><div className="h-10 w-10 rounded-xl bg-[#1f75b6] flex items-center justify-center"><Radio size={21} /></div><div className="font-display font-bold text-white">SchoolChat <span className="text-[#65b8ff]">BETA</span></div></div>
        <div className="mb-8"><div className="text-sm text-[#6e8baa] mb-2">{mode === 'signin' ? 'Welcome back' : 'Join your school'}</div><h2 className="font-display text-3xl font-bold text-white">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2><p className="mt-2 text-sm text-[#7e98b4]">{mode === 'signin' ? 'Enter your email and password to continue.' : 'Choose an email and password to get started.'}</p></div>
        <div className="flex gap-1 rounded-xl border border-[#263a54] bg-[#101d2e] p-1 mb-6"><button onClick={() => switchMode('signin')} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'signin' ? 'bg-[#247bbb] text-white' : 'text-[#7993ac] hover:text-white'}`}>Sign in</button><button onClick={() => switchMode('signup')} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'signup' ? 'bg-[#247bbb] text-white' : 'text-[#7993ac] hover:text-white'}`}>Sign up</button></div>
        <form onSubmit={handleSubmit} className="space-y-5"><label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-[#7f99b5]">School email</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" className="mt-2 w-full rounded-xl border border-[#30455f] bg-[#101d2e] px-4 py-3.5 text-white outline-none transition focus:border-[#4ca8ef]" /></label><label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-[#7f99b5]">Password</span><input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signin' ? 'Your password' : 'At least 6 characters'} className="mt-2 w-full rounded-xl border border-[#30455f] bg-[#101d2e] px-4 py-3.5 text-white outline-none transition focus:border-[#4ca8ef]" /></label>{error && <div className="rounded-xl border border-[#7e3b4c] bg-[#3a1d2a] px-4 py-3 text-sm text-[#ffb8c6]">{error}</div>}<button disabled={busy} className="w-full rounded-xl bg-[#247bbb] py-3.5 font-semibold text-white transition hover:bg-[#2e8bcf] disabled:opacity-50">{busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowUpRight className="inline ml-1" size={17} /></button></form>
        <div className="mt-7 border-t border-[#293c53] pt-5 text-center text-[11px] leading-5 text-[#637b96]">By continuing, you agree to your school approved Terms and Conditions and Privacy Notice.</div>
      </div>
    </div>
  </div>;
}

function App() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [classSelected, setClassSelected] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ messageId: string | null; userId: string } | null>(null);
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<View>('home');
  const [classes, setClasses] = useState<SchoolClass[]>(fallbackClasses);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'classes' | 'channels' | null>(null);
  const [rightOpen, setRightOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [composer, setComposer] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [friendTab, setFriendTab] = useState<'all' | 'online' | 'pending' | 'add' | 'blocked'>('all');
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<Profile[]>([]);
  const [toast, setToast] = useState('');
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [memberProfile, setMemberProfile] = useState<ClassMember | null>(null);
  const [dmTargetId, setDmTargetId] = useState<string | null>(null);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; member: ClassMember } | null>(null);

  useEffect(() => { let mounted = true; supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setAuthLoading(false); } }); const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthLoading(false); }); return () => { mounted = false; listener.subscription.unsubscribe(); }; }, []);
  useEffect(() => { if (!session?.user.id) { setProfile(null); return; } loadProfile(session.user.id); }, [session?.user.id]);
  useEffect(() => { if (profile) { loadClasses(); loadFriends(); loadRequests(); loadNotifications(); checkAdminExists(); } }, [profile]);

  const checkAdminExists = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
    setAdminExists((count ?? 0) > 0);
  };

  const claimAdmin = async () => {
    setClaimingAdmin(true);
    const { error } = await supabase.rpc('claim_first_admin');
    if (error) {
      setToast(error.message.includes('already exists') ? 'An administrator already exists.' : 'Unable to claim admin. Please try again.');
    } else {
      setToast('You are now the administrator.');
      setAdminExists(true);
      await loadProfile(session!.user.id);
    }
    setClaimingAdmin(false);
  };
  useEffect(() => { if (selectedClass) loadClassData(selectedClass.id); }, [selectedClass?.id]);
  useEffect(() => { if (selectedChannel) loadMessages(selectedChannel.id); }, [selectedChannel?.id]);
  useEffect(() => { if (!selectedChannel || !session) return; const channel = supabase.channel(`chat:${selectedChannel.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${selectedChannel.id}` }, async payload => { const { data } = await supabase.from('messages').select('*, profiles(*)').eq('id', payload.new.id).maybeSingle(); if (data) setMessages(current => current.some(message => message.id === data.id) ? current : [...current, data as Message]); }).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [selectedChannel?.id, session?.user.id]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer); }, [toast]);

  const loadProfile = async (userId: string, attempt = 0) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      await supabase.from('profiles').update({ status: 'online', updated_at: new Date().toISOString() }).eq('id', userId);
    } else if (attempt < 5) {
      // Profile row may not exist yet — the trigger that creates it can lag behind the auth session
      window.setTimeout(() => loadProfile(userId, attempt + 1), 500);
    }
  };
  const loadClasses = async () => { const { data } = await supabase.from('class_members').select('class_id, classes(*)').eq('user_id', session?.user.id); const next = (data || []).map(item => item.classes).filter(Boolean) as unknown as SchoolClass[]; setClasses(next); if (next.length && !selectedClass) setSelectedClass(next[0]); };
  const loadClassData = async (classId: string) => { const [catRes, chanRes, memRes] = await Promise.all([supabase.from('categories').select('*').eq('class_id', classId).order('position'), supabase.from('channels').select('*').eq('class_id', classId).order('position'), supabase.from('class_members').select('*, profiles(*)').eq('class_id', classId)]); if (memRes.error) console.error('loadClassData members error:', memRes.error.message); setCategories((catRes.data || []) as Category[]); setChannels((chanRes.data || []) as Channel[]); setMembers((memRes.data || []) as ClassMember[]); const chans = chanRes.data; if (chans?.length && !selectedChannel) setSelectedChannel(chans[0] as Channel); else if (chans?.length && !chans.some(channel => channel.id === selectedChannel?.id)) setSelectedChannel(chans[0] as Channel); };
  const loadMessages = async (channelId: string) => { setLoading(true); const { data } = await supabase.from('messages').select('*, profiles(*)').eq('channel_id', channelId).order('created_at', { ascending: true }).limit(100); setMessages((data || []) as Message[]); setLoading(false); };
  const loadFriends = async () => { const { data } = await supabase.from('friendships').select('*').or(`user_a_id.eq.${session?.user.id},user_b_id.eq.${session?.user.id}`); const ids = (data || []).map((row: Friendship) => row.user_a_id === session?.user.id ? row.user_b_id : row.user_a_id); if (ids.length) { const { data: people } = await supabase.from('profiles').select('*').in('id', ids); setFriends((people || []) as Profile[]); } else setFriends([]); };
  const loadRequests = async () => { const { data } = await supabase.from('friend_requests').select('*').or(`sender_id.eq.${session?.user.id},receiver_id.eq.${session?.user.id}`).eq('status', 'pending'); const rows = (data || []) as FriendRequest[]; const ids = rows.map(row => row.sender_id === session?.user.id ? row.receiver_id : row.sender_id); if (ids.length) { const { data: people } = await supabase.from('profiles').select('*').in('id', ids); const byId = new Map((people || []).map((person: Profile) => [person.id, person])); setRequests(rows.map(row => ({ ...row, profiles: byId.get(row.sender_id === session?.user.id ? row.receiver_id : row.sender_id) }))); } else setRequests([]); };
  const loadNotifications = async () => { const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30); setNotifications((data || []) as Notification[]); };
  const sendMessage = async () => { const content = composer.trim(); if (!content || !selectedChannel || !session) return; setComposer(''); const { data, error } = await supabase.from('messages').insert({ channel_id: selectedChannel.id, author_id: session.user.id, content, reply_to: replyingTo?.id || null }).select('*, profiles(*)').maybeSingle(); if (error) { setToast('Unable to send message. Please try again.'); setComposer(content); console.error('Send message error:', error.message); } else if (data) setMessages(current => current.some(message => message.id === data.id) ? current : [...current, data as Message]); setReplyingTo(null); };
  const saveEdit = async (id: string) => { const content = editText.trim(); if (!content) return; const { error } = await supabase.from('messages').update({ content, is_edited: true, updated_at: new Date().toISOString() }).eq('id', id).eq('author_id', session?.user.id); if (error) setToast(error.message); else { setMessages(current => current.map(message => message.id === id ? { ...message, content, is_edited: true } : message)); setEditingId(null); } };
  const deleteMessage = async (id: string) => { const { error } = await supabase.from('messages').update({ is_deleted: true, content: '' }).eq('id', id); if (error) setToast(error.message); else setMessages(current => current.map(message => message.id === id ? { ...message, content: '', is_deleted: true } : message)); };
  const searchUsers = async () => { const term = friendSearch.trim().replace(/^@/, ''); if (!term) { setFriendResults([]); return; } const { data } = await supabase.from('profiles').select('*').ilike('username', `%${term}%`).neq('id', session?.user.id).limit(10); setFriendResults((data || []) as Profile[]); };
  const sendFriendRequest = async (receiverId: string) => { const { error } = await supabase.from('friend_requests').insert({ sender_id: session?.user.id, receiver_id: receiverId }); if (error) setToast(error.message.includes('duplicate') ? 'A request already exists.' : error.message); else { setToast('Friend request sent.'); await loadRequests(); } };
  const respondToRequest = async (request: FriendRequest, status: 'accepted' | 'declined') => { const { error } = await supabase.from('friend_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', request.id).eq('receiver_id', session?.user.id); if (error) setToast(error.message); else { await loadRequests(); await loadFriends(); } };
  const logout = async () => { await supabase.from('profiles').update({ status: 'offline', updated_at: new Date().toISOString() }).eq('id', session?.user.id); await supabase.auth.signOut(); setProfile(null); setTermsAccepted(false); setClassSelected(false); setMemberProfile(null); setDmTargetId(null); };
  const assignModerator = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('assign_moderator', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Moderator assigned.'); await loadClassData(selectedClass.id); setMemberProfile(prev => prev && prev.user_id === targetUserId ? { ...prev, class_role: 'moderator' } : prev); } };
  const removeModerator = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('remove_moderator', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Moderator removed.'); await loadClassData(selectedClass.id); setMemberProfile(prev => prev && prev.user_id === targetUserId ? { ...prev, class_role: 'member' } : prev); } };
  const assignClassAdmin = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('assign_class_admin', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Admin assigned.'); await loadClassData(selectedClass.id); setMemberProfile(prev => prev && prev.user_id === targetUserId ? { ...prev, class_role: 'admin' } : prev); } };
  const removeClassAdmin = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('remove_class_admin', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Admin removed.'); await loadClassData(selectedClass.id); setMemberProfile(prev => prev && prev.user_id === targetUserId ? { ...prev, class_role: 'member' } : prev); } };
  const muteMember = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('admin_mute_user_in_class', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Member muted.'); await loadClassData(selectedClass.id); setMemberProfile(prev => prev && prev.user_id === targetUserId ? { ...prev, is_muted_in_class: true } : prev); } };
  const unmuteMember = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('admin_unmute_user_in_class', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Member unmuted.'); await loadClassData(selectedClass.id); setMemberProfile(prev => prev && prev.user_id === targetUserId ? { ...prev, is_muted_in_class: false } : prev); } };
  const kickMember = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('kick_member', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Member kicked.'); await loadClassData(selectedClass.id); setMemberProfile(null); } };
  const banMember = async (targetUserId: string) => { if (!selectedClass) return; const { error } = await supabase.rpc('ban_member', { class_uuid: selectedClass.id, target_uuid: targetUserId }); if (error) setToast(error.message); else { setToast('Member banned.'); await loadClassData(selectedClass.id); setMemberProfile(null); } };
  const messageMember = (targetUserId: string) => { setDmTargetId(targetUserId); setMemberProfile(null); setView('messages'); };
  const onMemberContextMenu = (e: React.MouseEvent, member: ClassMember) => {
    if (!isClassOwner && !members.some(m => m.user_id === session?.user.id && m.class_role === 'moderator')) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, member });
  };
  const uploadAttachment = async (file: File) => {
    if (!selectedChannel || !session) return;
    if (file.size > 10 * 1024 * 1024) { setToast('File is too large. Maximum size is 10 MB.'); return; }
    const userId = session.user.id;
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('attachments').upload(fileName, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) { setToast('Upload failed. Please try again.'); console.error('Upload error:', upErr.message); return; }
    const { data: pub } = supabase.storage.from('attachments').getPublicUrl(fileName);
    const fileUrl = pub.publicUrl;
    const isImage = file.type.startsWith('image/');
    const content = isImage ? `📷 ${file.name}` : `📎 ${file.name}`;
    const { data: msgData, error: msgErr } = await supabase.from('messages').insert({ channel_id: selectedChannel.id, author_id: userId, content }).select('*, profiles(*)').maybeSingle();
    if (msgErr || !msgData) { setToast('Could not send attachment message.'); console.error('Message insert error:', msgErr?.message); return; }
    await supabase.from('attachments').insert({ message_id: msgData.id, uploader_id: userId, file_name: file.name, file_type: file.type || 'application/octet-stream', file_size: file.size, storage_path: fileName });
    setMessages(current => current.some(m => m.id === msgData.id) ? current : [...current, { ...msgData, attachment_url: fileUrl, is_image: isImage } as Message]);
  };

  const unreadCount = notifications.filter(notification => !notification.is_read).length;
  const groupedChannels = useMemo(() => categories.map(category => ({ category, channels: channels.filter(channel => channel.category_id === category.id) })).filter(group => group.channels.length), [categories, channels]);
  const onlineMembers = members.filter(member => member.profiles?.status === 'online');
  const ownerMembers = members.filter(m => m.class_role === 'owner');
  const adminMembers = members.filter(m => m.class_role === 'admin');
  const moderatorMembers = members.filter(m => m.class_role === 'moderator');
  const regularMembers = members.filter(m => m.class_role === 'member' || (!m.class_role));
  const isClassOwner = members.some(m => m.user_id === session?.user.id && m.class_role === 'owner');
  const displayChannels = channels.filter(channel => channel.name.toLowerCase().includes(search.toLowerCase()));

  if (authLoading) return <div className="min-h-screen bg-[#09111e] flex items-center justify-center"><div className="h-10 w-10 rounded-xl border-2 border-[#367faf] border-t-transparent animate-spin" /></div>;
  if (!session || !profile) return <AuthScreen />;
  if (!termsAccepted) return <TermsGate userId={session.user.id} onAccepted={() => setTermsAccepted(true)} />;
  if (!classSelected) return <ClassSelection userId={session.user.id} onCompleted={() => setClassSelected(true)} />;

  return <div className="h-screen min-h-[620px] bg-[#0b1220] text-[#dbe5f3] overflow-hidden flex">
    <aside className={`${mobilePanel === 'classes' ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 lg:z-auto inset-y-0 left-0 w-[82px] bg-[#09111e] border-r border-[#1d2c41] flex flex-col items-center py-4 transition-transform duration-300`}><button onClick={() => { setView('home'); setMobilePanel(null); }} className="h-12 w-12 rounded-[17px] bg-[#1f75b6] text-white flex items-center justify-center shadow-lg shadow-[#1f75b6]/20 hover:rounded-2xl transition-all"><Radio size={24} /></button><div className="h-px w-10 bg-[#1d2c41] my-4" /><div className="flex-1 space-y-3 overflow-y-auto px-2"><button onClick={() => setView('home')} className="relative group block"><div className={`h-11 w-11 rounded-[15px] flex items-center justify-center text-xs font-display font-bold transition-all ${view === 'home' ? 'bg-[#245f8d] text-white' : 'bg-[#17263a] text-[#91a9c2] hover:bg-[#223b56]'}`}>SC</div><span className="pointer-events-none absolute left-14 top-2 hidden whitespace-nowrap rounded-lg bg-[#17283e] px-3 py-2 text-xs text-white shadow-xl group-hover:block">Home</span></button>{classes.map(schoolClass => <button key={schoolClass.id} onClick={() => { setSelectedClass(schoolClass); setView('class'); setMobilePanel(null); setSelectedChannel(null); }} className="relative group block"><div className={`h-11 w-11 rounded-[15px] flex items-center justify-center text-base transition-all ${selectedClass?.id === schoolClass.id && view === 'class' ? 'ring-2 ring-[#62baff] ring-offset-2 ring-offset-[#09111e]' : ''}`} style={{ background: schoolClass.icon_color || '#22354e' }}>{schoolClass.icon_emoji || schoolClass.name.slice(0, 2)}{schoolClass.icon_url && <img src={schoolClass.icon_url} alt="" className="absolute inset-0 h-full w-full rounded-[15px] object-cover" />}</div><span className="pointer-events-none absolute left-14 top-2 hidden whitespace-nowrap rounded-lg bg-[#17283e] px-3 py-2 text-xs text-white shadow-xl group-hover:block">{schoolClass.name}</span></button>)}</div><button onClick={() => { setView('class'); setMobilePanel(null); }} className="h-11 w-11 rounded-[15px] border border-dashed border-[#3b5874] text-[#7aa0c3] flex items-center justify-center hover:border-[#61b7f5] hover:text-white transition"><Plus size={19} /></button><div className="h-px w-10 bg-[#1d2c41] my-4" /><button onClick={() => { setView('profile'); setMobilePanel(null); }}><Avatar profile={profile} size="md" /></button></aside>

    <aside className={`${mobilePanel === 'channels' ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-30 lg:z-auto inset-y-0 left-[82px] lg:left-0 w-[268px] bg-[#101b2b] border-r border-[#20324a] flex flex-col transition-transform duration-300`}><div className="h-[74px] flex items-center justify-between border-b border-[#20324a] px-5"><button onClick={() => canManageServer(members, session?.user.id || '') && setShowServerSettings(true)} className={`text-left flex-1 min-w-0 ${canManageServer(members, session?.user.id || '') ? 'hover:bg-[#192d45] rounded-lg -mx-2 px-2 py-1 transition' : 'cursor-default'}`}><div className="font-display font-bold text-white truncate">{selectedClass?.name || 'My Classes'}</div><div className="text-[11px] text-[#6f89a6] mt-1 truncate">{selectedClass?.description || 'Your school community'}</div></button>{canManageServer(members, session?.user.id || '') && selectedClass && <button onClick={() => setShowServerSettings(true)} className="text-[#8fa7be] hover:text-white transition shrink-0" title="Server Settings"><Settings size={18} /></button>}<button className="lg:hidden text-[#8fa7be]" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>{selectedClass ? <><div className="px-4 pt-4 pb-2 flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.16em] text-[#7190ad]">SCHOOL CHANNELS</span><button className="text-[#7a95b1] hover:text-white"><Plus size={15} /></button></div><div className="flex-1 overflow-y-auto px-3">{groupedChannels.length ? groupedChannels.map(group => <div key={group.category.id} className="mb-5"><div className="flex items-center gap-1 px-2 mb-2 text-[10px] font-bold tracking-[.14em] text-[#66839f]"><ChevronDown size={12} />{group.category.name}</div>{group.channels.filter(channel => !search || displayChannels.some(item => item.id === channel.id)).map(channel => <button key={channel.id} onClick={() => { setSelectedChannel(channel); setView('class'); setMobilePanel(null); }} className={`w-full group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${selectedChannel?.id === channel.id ? 'bg-[#213c5a] text-white shadow-sm' : 'text-[#849bb4] hover:bg-[#192d45] hover:text-[#dbe9f5]'}`}>{channel.type === 'read_only' || channel.type === 'announcement' ? <Lock size={16} className={selectedChannel?.id === channel.id ? 'text-[#f1bd62]' : 'text-[#8a7a3e]'} /> : <Hash size={16} className={selectedChannel?.id === channel.id ? 'text-[#72c4ff]' : 'text-[#607f9e]'} />}<span className="truncate">{channel.name}</span>{channel.type === 'announcement' && <Lock size={12} className="ml-auto text-[#637e99]" />}</button>)}</div>) : <div className="mt-16 px-5 text-center text-sm text-[#7189a3]">{classes.length ? 'This class has no channels yet.' : 'You have not been assigned to a class yet.'}</div>}</div><div className="p-3 border-t border-[#20324a]"><button onClick={() => setView('profile')} className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#192d45] transition"><Avatar profile={profile} size="sm" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-white">{profile.display_name}</div><div className="truncate text-[11px] text-[#6f89a6]">@{profile.username}</div></div><Settings size={15} className="text-[#708ba8]" /></button></div></> : <div className="p-6 text-center text-sm text-[#7189a3]">Select a class to see its channels.</div>}</aside>

    <main className="min-w-0 flex-1 flex flex-col bg-[#0d1726] relative"><header className="h-[74px] shrink-0 border-b border-[#20324a] flex items-center gap-3 px-4 sm:px-6"><button className="lg:hidden rounded-lg p-2 text-[#91aac4] hover:bg-[#1a2b42]" onClick={() => setMobilePanel('classes')}><Menu size={20} /></button>{view === 'class' && selectedChannel ? <><div className="flex items-center gap-2"><Hash className="text-[#67bbfa]" size={21} /><h1 className="font-display font-bold text-white">{selectedChannel.name}</h1></div><div className="hidden md:block h-5 w-px bg-[#30445c]" /><p className="hidden md:block text-sm text-[#718ba6] truncate">{selectedChannel.description}</p></> : <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-[#173252] flex items-center justify-center text-[#73c4ff]"><Home size={17} /></div><div><h1 className="font-display font-bold text-white">{view === 'home' ? 'Home' : view === 'friends' ? 'School Friends' : view === 'messages' ? 'Messages' : view === 'notifications' ? 'Notifications' : view === 'profile' ? 'Your profile' : 'Admin dashboard'}</h1><p className="hidden sm:block text-xs text-[#718ba6]">{view === 'home' ? 'Your school, at a glance.' : 'Stay connected with your school community.'}</p></div></div>}<div className="ml-auto flex items-center gap-1 sm:gap-3"><div className="hidden xl:flex items-center gap-2 rounded-xl border border-[#293c54] bg-[#111f31] px-3 py-2 w-52"><Search size={15} className="text-[#6f8ca8]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SchoolChat" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#5f7893]" /><span className="text-[10px] text-[#5d7690]">⌘K</span></div><button onClick={() => setView('notifications')} className="relative rounded-xl p-2.5 text-[#86a0bb] hover:bg-[#1a2d45] hover:text-white transition"><Bell size={19} />{unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#5bb9fa] ring-2 ring-[#0d1726]" />}</button><button onClick={() => setRightOpen(!rightOpen)} className="hidden sm:block rounded-xl p-2.5 text-[#86a0bb] hover:bg-[#1a2d45] hover:text-white"><PanelRight size={19} /></button><button className="rounded-xl p-2.5 text-[#86a0bb] hover:bg-[#1a2d45] hover:text-white"><MoreHorizontal size={19} /></button></div></header>
      {view === 'home' && <HomeView profile={profile} classes={classes} requests={requests} notifications={notifications} onClass={schoolClass => { setSelectedClass(schoolClass); setView('class'); setSelectedChannel(null); }} onFriends={() => setView('friends')} />}
      {view === 'class' && <ChatView selectedClass={selectedClass} selectedChannel={selectedChannel} messages={messages} loading={loading} sessionId={session.user.id} userRole={profile?.role || 'student'} members={members} composer={composer} setComposer={setComposer} sendMessage={sendMessage} replyingTo={replyingTo} setReplyingTo={setReplyingTo} editingId={editingId} setEditingId={setEditingId} editText={editText} setEditText={setEditText} saveEdit={saveEdit} deleteMessage={deleteMessage} onReport={(messageId, userId) => setReportTarget({ messageId, userId })} onOpenChannels={() => setMobilePanel('channels')} onUpload={uploadAttachment} />}
      {view === 'friends' && <FriendsView profile={profile} friends={friends} requests={requests} tab={friendTab} setTab={setFriendTab} friendSearch={friendSearch} setFriendSearch={setFriendSearch} results={friendResults} searchUsers={searchUsers} sendRequest={sendFriendRequest} respond={respondToRequest} onMessage={messageMember} />}
      {view === 'notifications' && <NotificationsView notifications={notifications} onRead={async id => { await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', session.user.id); setNotifications(current => current.map(item => item.id === id ? { ...item, is_read: true } : item)); }} onReadAll={async () => { await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id); setNotifications(current => current.map(item => ({ ...item, is_read: true }))); }} />}
      {view === 'profile' && <ProfileView profile={profile} logout={logout} onSettings={() => setView('settings')} onAdmin={() => setView('admin')} adminExists={adminExists} claimingAdmin={claimingAdmin} onClaimAdmin={claimAdmin} />}
      {view === 'settings' && <SettingsView profile={profile} theme={theme} setTheme={setTheme} onSaved={setProfile} />}
      {view === 'messages' && <DirectMessages userId={session.user.id} friends={friends} classMembers={members} dmTargetId={dmTargetId} onDmStarted={() => setDmTargetId(null)} />}
      {view === 'admin' && <AdminDashboard profile={profile} classes={classes} onToast={setToast} />}
      {reportTarget && <ReportModal messageId={reportTarget.messageId} reportedUserId={reportTarget.userId} reporterId={session.user.id} onClose={() => setReportTarget(null)} />}
      {memberProfile && <MemberProfileCard member={memberProfile} currentUserId={session.user.id} isOwner={isClassOwner} isMod={members.some(m => m.user_id === session?.user.id && m.class_role === 'moderator')} onClose={() => setMemberProfile(null)} onMessage={() => messageMember(memberProfile.user_id)} onAssignAdmin={assignClassAdmin} onRemoveAdmin={removeClassAdmin} onAssignMod={assignModerator} onRemoveMod={removeModerator} onMute={muteMember} onUnmute={unmuteMember} onKick={kickMember} onBan={banMember} />}
      {showServerSettings && selectedClass && <ServerSettings serverClass={selectedClass} members={members} categories={categories} channels={channels} onClose={() => setShowServerSettings(false)} onChanged={async () => { if (selectedClass) { await loadClassData(selectedClass.id); await loadClasses(); const { data } = await supabase.from('classes').select('*').eq('id', selectedClass.id).maybeSingle(); if (data) setSelectedClass(data as SchoolClass); } }} />}
      {toast && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-[#365875] bg-[#17314a] px-4 py-3 text-sm text-[#d7efff] shadow-2xl">{toast}</div>}
      {contextMenu && (() => {
        const cm = contextMenu; const targetMember = cm.member; const isModOf = members.some(m => m.user_id === session?.user.id && m.class_role === 'moderator'); const canAct = (isClassOwner || isModOf) && targetMember.user_id !== session?.user.id && targetMember.class_role !== 'owner';
        if (!canAct) return null;
        return <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div className="fixed z-[61] rounded-xl border border-[#2a3f5a] bg-[#151e2e] shadow-2xl py-1.5 min-w-[160px]" style={{ left: Math.min(cm.x, window.innerWidth - 180), top: Math.min(cm.y, window.innerHeight - 220) }}>
            <button onClick={() => { setMemberProfile(targetMember); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#c2d1df] hover:bg-[#1a2d43]">View profile</button>
            <button onClick={() => { messageMember(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#c2d1df] hover:bg-[#1a2d43]">Send message</button>
            {isClassOwner && targetMember.class_role === 'member' && <>
              <button onClick={() => { assignClassAdmin(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#5bb8f5] hover:bg-[#1a2d43]">Make admin</button>
              <button onClick={() => { assignModerator(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#e74c3c] hover:bg-[#1a2d43]">Make moderator</button>
            </>}
            {isClassOwner && targetMember.class_role === 'admin' && <button onClick={() => { removeClassAdmin(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#ffadbd] hover:bg-[#1a2d43]">Remove admin</button>}
            {isClassOwner && targetMember.class_role === 'moderator' && <button onClick={() => { removeModerator(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#ffadbd] hover:bg-[#1a2d43]">Remove moderator</button>}
            {targetMember.is_muted_in_class ? <button onClick={() => { unmuteMember(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#5bb8f5] hover:bg-[#1a2d43]">Unmute</button> : <button onClick={() => { muteMember(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#f1bd62] hover:bg-[#1a2d43]">Mute</button>}
            <button onClick={() => { kickMember(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#ffadbd] hover:bg-[#1a2d43]">Kick</button>
            <button onClick={() => { banMember(targetMember.user_id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-[#ff9eb0] hover:bg-[#1a2d43]">Ban</button>
          </div>
        </>;
      })()}
    </main>
    {rightOpen && view === 'class' && <aside className="hidden lg:flex w-[260px] shrink-0 border-l border-[#20324a] bg-[#101b2b] flex-col"><div className="h-[74px] border-b border-[#20324a] flex items-center justify-between px-5"><span className="text-[10px] font-bold tracking-[.16em] text-[#7592ad]">MEMBERS — {members.length}</span><span className="text-[10px] text-[#5d7690]">{onlineMembers.length} online</span></div><div className="flex-1 overflow-y-auto p-3">{ownerMembers.length > 0 && <><div className="text-[10px] font-bold tracking-[.13em] text-[#e74c3c] mb-1.5 flex items-center gap-1 px-2"><Crown size={11} /> OWNER — {ownerMembers.length}</div>{ownerMembers.map(member => <MemberRow key={member.id} member={member} onClick={() => setMemberProfile(member)} onContextMenu={(e) => onMemberContextMenu(e, member)} />)}</>}{adminMembers.length > 0 && <><div className={`text-[10px] font-bold tracking-[.13em] text-[#3498db] mb-1.5 px-2 ${ownerMembers.length > 0 ? 'mt-4' : ''}`}>ADMINS — {adminMembers.length}</div>{adminMembers.map(member => <MemberRow key={member.id} member={member} onClick={() => setMemberProfile(member)} onContextMenu={(e) => onMemberContextMenu(e, member)} />)}</>}{moderatorMembers.length > 0 && <><div className={`text-[10px] font-bold tracking-[.13em] text-[#e74c3c] mb-1.5 px-2 ${ownerMembers.length > 0 || adminMembers.length > 0 ? 'mt-4' : ''}`}>MODERATORS — {moderatorMembers.length}</div>{moderatorMembers.map(member => <MemberRow key={member.id} member={member} onClick={() => setMemberProfile(member)} onContextMenu={(e) => onMemberContextMenu(e, member)} />)}</>}{regularMembers.length > 0 && <><div className={`text-[10px] font-bold tracking-[.13em] text-[#6d89a6] mb-1.5 px-2 ${ownerMembers.length > 0 || adminMembers.length > 0 || moderatorMembers.length > 0 ? 'mt-4' : ''}`}>MEMBERS — {regularMembers.length}</div>{regularMembers.map(member => <MemberRow key={member.id} member={member} onClick={() => setMemberProfile(member)} onContextMenu={(e) => onMemberContextMenu(e, member)} />)}</>}</div></aside>}
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 h-[68px] border-t border-[#20324a] bg-[#0c1726]/95 backdrop-blur-xl flex items-center justify-around"><MobileNavButton icon={<Home size={19} />} label="Home" active={view === 'home'} onClick={() => setView('home')} /><MobileNavButton icon={<Users size={19} />} label="Friends" active={view === 'friends'} onClick={() => setView('friends')} /><MobileNavButton icon={<MessageCircle size={19} />} label="Messages" active={view === 'messages'} onClick={() => setView('messages')} /><MobileNavButton icon={<Bell size={19} />} label="Alerts" active={view === 'notifications'} onClick={() => setView('notifications')} /><MobileNavButton icon={<UserRound size={19} />} label="Profile" active={view === 'profile'} onClick={() => setView('profile')} /></nav>
  </div>;
}

function MemberRow({ member, onClick, onContextMenu }: { member: ClassMember; onClick: () => void; onContextMenu?: (e: React.MouseEvent) => void }) {
  const roleColor = member.class_role === 'owner' ? 'text-[#e74c3c]' : member.class_role === 'admin' ? 'text-[#3498db]' : member.class_role === 'moderator' ? 'text-[#e74c3c]' : 'text-[#7d8a9a]';
  const about = member.profiles?.about?.trim();
  return <button onClick={onClick} onContextMenu={onContextMenu} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[#192d45] transition text-left group"><div className="relative shrink-0"><Avatar profile={member.profiles} size="sm" /><span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101b2b] ${member.profiles?.status === 'online' ? 'bg-[#38c999]' : 'bg-[#53657b]'}`} /></div><div className="min-w-0 flex-1"><div className={`truncate text-xs font-medium ${roleColor}`}>{member.profiles?.id && isOwner(member.profiles.id) ? <span className="owner-name">{member.profiles.display_name}</span> : (member.profiles?.display_name || 'School member')}</div><div className="truncate text-[10px] text-[#7089a4]">{about ? about : `@${member.profiles?.username || 'member'}`}</div></div></button>;
}

function MemberProfileCard({ member, currentUserId, isOwner: isOwnerProp, isMod, onClose, onMessage, onAssignAdmin, onRemoveAdmin, onAssignMod, onRemoveMod, onMute, onUnmute, onKick, onBan }: { member: ClassMember; currentUserId: string; isOwner: boolean; isMod: boolean; onClose: () => void; onMessage: () => void; onAssignAdmin: (userId: string) => void; onRemoveAdmin: (userId: string) => void; onAssignMod: (userId: string) => void; onRemoveMod: (userId: string) => void; onMute: (userId: string) => void; onUnmute: (userId: string) => void; onKick: (userId: string) => void; onBan: (userId: string) => void }) {
  const roleLabel = member.class_role === 'owner' ? 'Owner' : member.class_role === 'admin' ? 'Admin' : member.class_role === 'moderator' ? 'Moderator' : 'Member';
  const about = member.profiles?.about?.trim();
  const banner = member.profiles?.banner_url;
  const isOnline = member.profiles?.status === 'online';
  const p = member.profiles;
  const avatarInitials = (p?.display_name || p?.username || '?').slice(0, 2).toUpperCase();
  const roleBadgeClass = member.class_role === 'owner' ? 'bg-gradient-to-r from-[#8a2520] to-[#b8322a] text-white' : member.class_role === 'admin' ? 'bg-gradient-to-r from-[#1a5c8e] to-[#2374b0] text-white' : member.class_role === 'moderator' ? 'bg-gradient-to-r from-[#8a2520] to-[#b8322a] text-white' : 'bg-[#2a3a4e] text-[#7d8a9a]';
  const nameColor = member.class_role === 'owner' ? 'text-[#e74c3c]' : member.class_role === 'admin' ? 'text-[#3498db]' : member.class_role === 'moderator' ? 'text-[#e74c3c]' : 'text-[#9aa8b8]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-[360px] mx-5 rounded-[20px] border border-[#2a3f5a] bg-[#151e2e] shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-[fadeIn_0.15s_ease-out]" onClick={e => e.stopPropagation()}>
        {/* Banner */}
        <div className="h-[110px] relative overflow-hidden">
          {banner ? (
            <img src={banner} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-[#1a3a5c] via-[#246b8f] to-[#1a5c4f]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#151e2e]" />
          <button onClick={onClose} className="absolute right-3 top-3 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/80 hover:text-white transition backdrop-blur-sm">
            <X size={16} />
          </button>
        </div>

        {/* Avatar overlapping banner */}
        <div className="px-4 -mt-8 relative">
          <div className="flex items-end justify-between">
            <div className="relative">
              <div className="h-[68px] w-[68px] rounded-[16px] flex items-center justify-center font-display font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] text-xl border-[3px] border-[#151e2e] overflow-hidden" style={{ background: p?.avatar_color || '#2777b8' }}>
                {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : avatarInitials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-[#151e2e] ${isOnline ? 'bg-[#3ba55d]' : 'bg-[#74818d]'}`} />
            </div>
            <span className={`mb-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.08em] shadow-sm ${roleBadgeClass}`}>{roleLabel}</span>
          </div>
        </div>

        {/* Name + username */}
        <div className="px-4 pt-3">
          <div className={`font-display text-[22px] font-bold leading-tight ${nameColor}`}>{p?.id && isOwner(p.id) ? <span className="owner-name">{p.display_name}</span> : (p?.display_name || 'School member')}</div>
          <div className="text-sm text-[#8ea3bd] mt-0.5">@{p?.username || 'member'}</div>
        </div>

        {/* Divider */}
        <div className="mx-4 mt-3 h-px bg-[#243a53]" />

        {/* About Me section */}
        <div className="px-4 pt-3 pb-4">
          <div className="text-[11px] font-bold tracking-[.12em] text-[#6f87a3] mb-1.5">ABOUT ME</div>
          {about ? (
            <p className="text-[13.5px] leading-[1.55] text-[#b5c3d4]">{about}</p>
          ) : (
            <p className="text-[13.5px] leading-[1.55] text-[#5d7390] italic">No about me set yet.</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 space-y-2">
          {member.user_id !== currentUserId && (
            <button onClick={onMessage} className="w-full rounded-[12px] bg-gradient-to-r from-[#2e8bcf] to-[#247bbb] py-2.5 text-sm font-semibold text-white hover:from-[#3a9ee0] hover:to-[#2a8ccc] transition flex items-center justify-center gap-2 shadow-lg shadow-[#247bbb]/15">
              <MessageCircle size={16} /> Send Message
            </button>
          )}
          {isOwnerProp && member.class_role === 'member' && (
            <button onClick={() => onAssignAdmin(member.user_id)} className="w-full rounded-[12px] border border-[#1a5c8e] bg-[#122e44] py-2.5 text-sm font-semibold text-[#5bb8f5] hover:bg-[#173a55] transition flex items-center justify-center gap-2">
              <Shield size={16} /> Make Admin
            </button>
          )}
          {isOwnerProp && member.class_role === 'member' && (
            <button onClick={() => onAssignMod(member.user_id)} className="w-full rounded-[12px] border border-[#8a2520] bg-[#2a1518] py-2.5 text-sm font-semibold text-[#e74c3c] hover:bg-[#3a1d22] transition flex items-center justify-center gap-2">
              <Shield size={16} /> Make Moderator
            </button>
          )}
          {isOwnerProp && member.class_role === 'admin' && (
            <button onClick={() => onRemoveAdmin(member.user_id)} className="w-full rounded-[12px] border border-[#593d4c] bg-[#3a1d2a] py-2.5 text-sm font-semibold text-[#ffadbd] hover:bg-[#412437] transition flex items-center justify-center gap-2">
              <X size={16} /> Remove Admin
            </button>
          )}
          {isOwnerProp && member.class_role === 'moderator' && (
            <button onClick={() => onRemoveMod(member.user_id)} className="w-full rounded-[12px] border border-[#593d4c] bg-[#3a1d2a] py-2.5 text-sm font-semibold text-[#ffadbd] hover:bg-[#412437] transition flex items-center justify-center gap-2">
              <X size={16} /> Remove Moderator
            </button>
          )}
          {(isOwnerProp || isMod) && member.user_id !== currentUserId && member.class_role !== 'owner' && (
            <>
              <div className="flex gap-2">
                {member.is_muted_in_class ? (
                  <button onClick={() => onUnmute(member.user_id)} className="flex-1 rounded-[12px] border border-[#1a5c8e] bg-[#122e44] py-2.5 text-sm font-semibold text-[#5bb8f5] hover:bg-[#173a55] transition flex items-center justify-center gap-2">
                    <Volume2 size={16} /> Unmute
                  </button>
                ) : (
                  <button onClick={() => onMute(member.user_id)} className="flex-1 rounded-[12px] border border-[#55401e] bg-[#2a2316] py-2.5 text-sm font-semibold text-[#f1bd62] hover:bg-[#3a3018] transition flex items-center justify-center gap-2">
                    <VolumeX size={16} /> Mute
                  </button>
                )}
                <button onClick={() => onKick(member.user_id)} className="flex-1 rounded-[12px] border border-[#593d4c] bg-[#3a1d2a] py-2.5 text-sm font-semibold text-[#ffadbd] hover:bg-[#412437] transition flex items-center justify-center gap-2">
                  <UserMinus size={16} /> Kick
                </button>
              </div>
              <button onClick={() => onBan(member.user_id)} className="w-full rounded-[12px] border border-[#4a2233] bg-[#2a1620] py-2.5 text-sm font-semibold text-[#ff9eb0] hover:bg-[#3a1f2a] transition flex items-center justify-center gap-2">
                <Ban size={16} /> Ban
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function MobileNavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex flex-col items-center gap-1 text-[10px] ${active ? 'text-[#6cc2ff]' : 'text-[#718aa6]'}`}>{icon}<span>{label}</span></button>; }

function HomeView({ profile, classes, requests, notifications, onClass, onFriends }: { profile: Profile; classes: SchoolClass[]; requests: FriendRequest[]; notifications: Notification[]; onClass: (schoolClass: SchoolClass) => void; onFriends: () => void }) { return <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-12"><div className="max-w-6xl mx-auto"><div className="flex flex-col md:flex-row md:items-end justify-between gap-5"><div><div className="flex items-center gap-2 text-[#63baff] text-sm font-medium mb-3"><Sparkles size={15} /> Your school dashboard</div><h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Good morning, {isOwner(profile.id) ? <span className="owner-name">{profile.display_name.split(' ')[0]}</span> : profile.display_name.split(' ')[0]}.</h2><p className="mt-2 text-[#819ab4]">Keep up with your classes and conversations.</p></div><div className="flex items-center gap-2 rounded-xl border border-[#294158] bg-[#122237] px-3 py-2 text-xs text-[#91aac3]"><div className="h-2 w-2 rounded-full bg-[#39c999]" /> All systems operational</div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-9"><StatCard label="My classes" value={classes.length.toString()} icon={<BookOpen size={18} />} accent="blue" /><StatCard label="Unread alerts" value={notifications.filter(item => !item.is_read).length.toString()} icon={<Bell size={18} />} accent="amber" /><StatCard label="Friend requests" value={requests.filter(item => item.receiver_id === profile.id).length.toString()} icon={<UserPlus size={18} />} accent="green" /></div><div className="grid lg:grid-cols-[1.35fr_.85fr] gap-5 mt-7"><section className="rounded-2xl border border-[#243a53] bg-[#101d2e] p-5 sm:p-6"><div className="flex items-center justify-between mb-5"><div><h3 className="font-display font-bold text-white">Your classes</h3><p className="text-xs text-[#718ba6] mt-1">Jump back into a space</p></div><button onClick={onFriends} className="text-xs font-semibold text-[#6cbfff] hover:text-white">View friends <ChevronRight className="inline" size={14} /></button></div>{classes.length ? <div className="grid sm:grid-cols-2 gap-3">{classes.map(schoolClass => <button key={schoolClass.id} onClick={() => onClass(schoolClass)} className="group flex items-center gap-3 rounded-xl border border-[#29425d] bg-[#13253a] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#4d98ca] hover:bg-[#17304a]"><div className="h-11 w-11 rounded-xl flex items-center justify-center text-xl overflow-hidden relative" style={{ background: schoolClass.icon_color }}>{schoolClass.icon_emoji || schoolClass.name.slice(0, 2)}{schoolClass.icon_url && <img src={schoolClass.icon_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="font-semibold text-white truncate">{schoolClass.name}</div><div className="text-xs text-[#7692ad] truncate mt-1">{schoolClass.description}</div></div><ArrowUpRight size={16} className="text-[#557693] group-hover:text-[#75c5ff]" /></button>)}</div> : <EmptyState icon={<Lock size={19} />} title="Class access is pending" text="Your school administrator will add you to classes and sections here." />}</section><section className="rounded-2xl border border-[#243a53] bg-[#101d2e] p-5 sm:p-6"><div className="flex items-center gap-2 mb-5"><div className="h-8 w-8 rounded-lg bg-[#253b58] flex items-center justify-center text-[#72c4ff]"><Bell size={16} /></div><div><h3 className="font-display font-bold text-white">Recent alerts</h3><p className="text-xs text-[#718ba6] mt-1">SchoolChat updates</p></div></div>{notifications.length ? notifications.slice(0, 4).map(notification => <div key={notification.id} className="border-t border-[#21354d] py-3"><div className="text-sm text-[#d5e2ee]">{notification.title}</div><div className="text-xs text-[#738ca6] mt-1">{notification.body || formatDate(notification.created_at)}</div></div>) : <EmptyState icon={<CheckCheck size={19} />} title="You're all caught up" text="New updates will appear here." />}</section></div></div></div>; }
function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) { return <div className="rounded-2xl border border-[#243a53] bg-[#101d2e] p-4 flex items-center gap-4"><div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent === 'blue' ? 'bg-[#173e62] text-[#71c2ff]' : accent === 'amber' ? 'bg-[#55401e] text-[#f1bd62]' : 'bg-[#174c43] text-[#61d3ad]'}`}>{icon}</div><div><div className="text-2xl font-display font-bold text-white">{value}</div><div className="text-xs text-[#738ca6]">{label}</div></div></div>; }
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="py-8 text-center"><div className="mx-auto h-10 w-10 rounded-xl bg-[#1a2d43] flex items-center justify-center text-[#72b8e7]">{icon}</div><div className="mt-3 text-sm font-semibold text-[#c6d6e4]">{title}</div><div className="mt-1 text-xs text-[#7089a5] leading-5">{text}</div></div>; }

function ChatView({ selectedClass, selectedChannel, messages, loading, sessionId, userRole, members, composer, setComposer, sendMessage, replyingTo, setReplyingTo, editingId, setEditingId, editText, setEditText, saveEdit, deleteMessage, onReport, onOpenChannels, onUpload }: { selectedClass: SchoolClass | null; selectedChannel: Channel | null; messages: Message[]; loading: boolean; sessionId: string; userRole: Role; members: ClassMember[]; composer: string; setComposer: (value: string) => void; sendMessage: () => void; replyingTo: Message | null; setReplyingTo: (message: Message | null) => void; editingId: string | null; setEditingId: (id: string | null) => void; editText: string; setEditText: (value: string) => void; saveEdit: (id: string) => void; deleteMessage: (id: string) => void; onReport: (messageId: string | null, userId: string) => void; onOpenChannels: () => void; onUpload: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const authorMap = new Map(members.map(member => [member.user_id, member.profiles]));
  const isLockedChannel = selectedChannel?.type === 'read_only' || selectedChannel?.type === 'announcement';
  const isClassOwner = members.some(m => m.user_id === sessionId && m.class_role === 'owner');
  const isSiteAdmin = userRole === 'admin';
  const canPostInLocked = isClassOwner || isSiteAdmin;
  const canPost = !isLockedChannel || canPostInLocked;
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUpload(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };
  return <div className="flex-1 min-h-0 flex flex-col">{!selectedChannel ? <div className="flex-1 flex items-center justify-center px-8"><EmptyState icon={<Hash size={23} />} title={selectedClass ? 'Choose a channel' : 'Choose a class'} text={selectedClass ? 'Select a school channel from the sidebar to start a conversation.' : 'Select a class from the left to see its channels.'} /></div> : <><div className="lg:hidden px-4 py-3 border-b border-[#20324a]"><button onClick={onOpenChannels} className="flex items-center gap-2 text-sm text-[#91aac2]"><ChevronLeft size={16} /> Browse channels</button></div><div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6">{loading ? <div className="h-full flex items-center justify-center"><div className="h-7 w-7 rounded-full border-2 border-[#3e8abc] border-t-transparent animate-spin" /></div> : messages.length ? <div className="max-w-4xl mx-auto space-y-5">{messages.map(message => { const author = message.profiles || authorMap.get(message.author_id); const own = message.author_id === sessionId; return <div key={message.id} className="group flex gap-3"><Avatar profile={author} /><div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><span className={`font-semibold text-[#d9e7f2] ${ownerNameClass(author?.id)}`}>{author?.display_name || 'School member'}</span><span className="text-[11px] text-[#6d88a3]">{formatTime(message.created_at)}{message.is_edited && ' · edited'}</span></div>{message.reply_to && <div className="mt-1 border-l-2 border-[#3b7ba7] pl-2 text-xs text-[#7696b2]">Replying to a previous message</div>}{message.is_deleted ? <div className="mt-1 text-sm italic text-[#667e97]">Message removed</div> : editingId === message.id ? <div className="mt-2 flex gap-2"><input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(message.id); }} className="min-w-0 flex-1 rounded-lg border border-[#3e7194] bg-[#14283d] px-3 py-2 text-sm text-white outline-none" /><button onClick={() => saveEdit(message.id)} className="rounded-lg bg-[#277eb8] px-3 text-xs font-semibold">Save</button></div> : <><div className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-7 text-[#c2d2e1]">{message.content}</div>{(message as Message & { attachment_url?: string; is_image?: boolean }).attachment_url && <div className="mt-2 rounded-xl border border-[#243a53] overflow-hidden">{(message as Message & { is_image?: boolean }).is_image ? <img src={(message as Message & { attachment_url?: string }).attachment_url} alt="attachment" className="max-w-sm max-h-72 object-cover" /> : <a href={(message as Message & { attachment_url?: string }).attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#7ec4ff] hover:bg-[#192d45] transition"><Paperclip size={16} /> {(message as Message & { attachment_url?: string }).attachment_url?.split('/').pop() || 'Download file'}</a>}</div>}</>}<div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => setReplyingTo(message)} className="rounded-md p-1.5 text-[#7693ad] hover:bg-[#1c344d] hover:text-white" title="Reply"><Reply size={14} /></button>{own && !message.is_deleted && <><button onClick={() => { setEditingId(message.id); setEditText(message.content); }} className="rounded-md p-1.5 text-[#7693ad] hover:bg-[#1c344d] hover:text-white" title="Edit"><Edit3 size={14} /></button><button onClick={() => deleteMessage(message.id)} className="rounded-md p-1.5 text-[#b67889] hover:bg-[#412437] hover:text-[#ffb8c6]" title="Delete"><Trash2 size={14} /></button></>}{!own && !message.is_deleted && <button onClick={() => onReport(message.id, message.author_id)} className="rounded-md p-1.5 text-[#b67889] hover:bg-[#412437] hover:text-[#ffb8c6]" title="Report"><Flag size={14} /></button>}</div></div></div>; })}</div> : <div className="h-full flex items-center justify-center"><EmptyState icon={<MessageCircle size={23} />} title={`Welcome to #${selectedChannel.name}`} text={canPost ? 'This is the beginning of this school channel. Start the conversation.' : 'This is a read-only channel. You can view messages but only the class owner and admins can post.'} /></div>}</div><div className="px-4 sm:px-8 pb-4 sm:pb-6"><div className="max-w-4xl mx-auto">{canPost ? <>{replyingTo && <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#2f526d] bg-[#13283d] px-3 py-2 text-xs text-[#91abc1]"><Reply size={13} className="text-[#62b8f5]" /><span className="truncate flex-1">Replying to {replyingTo.profiles?.display_name || 'message'}</span><button onClick={() => setReplyingTo(null)}><X size={14} /></button></div>}<div className="flex items-end gap-2 rounded-2xl border border-[#2a4661] bg-[#132439] p-2 shadow-lg focus-within:border-[#4389b6] transition"><input ref={fileRef} type="file" onChange={handleFileSelect} className="hidden" /><button onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-xl p-2.5 text-[#7c99b2] hover:bg-[#1d3852] hover:text-white disabled:opacity-50 transition" title="Attach file">{uploading ? <div className="h-[18px] w-[18px] rounded-full border-2 border-[#7c99b2] border-t-transparent animate-spin" /> : <Paperclip size={18} />}</button><textarea value={composer} onChange={e => setComposer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={1} placeholder={`Message #${selectedChannel.name}`} className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-[#6e88a2]" /><button onClick={sendMessage} disabled={!composer.trim()} className="rounded-xl bg-[#277eb8] p-2.5 text-white transition hover:bg-[#3591cf] disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button></div><div className="mt-2 text-center text-[10px] text-[#627d98]">Messages are visible to authorized members of {selectedClass?.name || 'this class'}.</div></> : <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#2a4661] bg-[#132439] py-4 text-sm text-[#7e97b3]"><Lock size={16} className="text-[#6882a0]" /> This channel is read-only. Only the class owner and admins can post here.</div>}</div></div></>}</div>;
}

function FriendsView({ profile, friends, requests, tab, setTab, friendSearch, setFriendSearch, results, searchUsers, sendRequest, respond, onMessage }: { profile: Profile; friends: Profile[]; requests: FriendRequest[]; tab: 'all' | 'online' | 'pending' | 'add' | 'blocked'; setTab: (tab: 'all' | 'online' | 'pending' | 'add' | 'blocked') => void; friendSearch: string; setFriendSearch: (value: string) => void; results: Profile[]; searchUsers: () => void; sendRequest: (id: string) => void; respond: (request: FriendRequest, status: 'accepted' | 'declined') => void; onMessage: (userId: string) => void }) { const tabs = [['all', 'All friends'], ['online', 'Online'], ['pending', 'Pending'], ['add', 'Add friend'], ['blocked', 'Blocked']] as const; const shown = tab === 'online' ? friends.filter(friend => friend.status === 'online') : friends; return <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-12"><div className="max-w-5xl mx-auto"><div className="flex items-end justify-between"><div><div className="text-sm text-[#63baff] mb-2 flex items-center gap-2"><Users size={15} /> School community</div><h2 className="font-display text-3xl font-bold text-white">Friends</h2><p className="mt-2 text-[#819ab4]">Connect with people in your school.</p></div><div className="hidden sm:flex h-11 w-11 rounded-2xl bg-[#173550] items-center justify-center text-[#73c2fa]"><UserPlus size={20} /></div></div><div className="mt-8 flex gap-1 border-b border-[#263b54] overflow-x-auto">{tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap px-4 py-3 text-xs font-semibold transition border-b-2 ${tab === value ? 'border-[#62bbfb] text-[#d5eeff]' : 'border-transparent text-[#718ba6] hover:text-white'}`}>{label}{value === 'pending' && requests.length > 0 && <span className="ml-2 rounded-full bg-[#2b638e] px-1.5 py-0.5 text-[10px] text-white">{requests.length}</span>}</button>)}</div>{tab === 'add' ? <div className="mt-6 max-w-2xl rounded-2xl border border-[#243e59] bg-[#101e30] p-5 sm:p-7"><h3 className="font-display text-lg font-bold text-white">Find a school friend</h3><p className="mt-1 text-sm text-[#7892ad]">Search by SchoolChat username. Private contact details stay private.</p><div className="mt-5 flex gap-2"><div className="flex flex-1 items-center rounded-xl border border-[#304b67] bg-[#14253a] px-3"><Search size={16} className="text-[#7192ad]" /><input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUsers()} placeholder="@username" className="w-full bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-[#607c99]" /></div><button onClick={searchUsers} className="rounded-xl bg-[#277eb8] px-4 text-sm font-semibold text-white hover:bg-[#3591cf]">Search</button></div><div className="mt-5 space-y-2">{results.map(result => <div key={result.id} className="flex items-center gap-3 rounded-xl border border-[#29435e] bg-[#13263b] p-3"><Avatar profile={result} /><div className="min-w-0 flex-1"><div className="font-semibold text-white">{isOwner(result.id) ? <span className="owner-name">{result.display_name}</span> : result.display_name}</div><div className="text-xs text-[#7793ad]">@{result.username}</div></div><button onClick={() => sendRequest(result.id)} className="rounded-lg border border-[#376d94] px-3 py-2 text-xs font-semibold text-[#8bd0fb] hover:bg-[#1d4361]">Add friend</button></div>)}</div></div> : tab === 'pending' ? <div className="mt-6 space-y-3 max-w-2xl">{requests.length ? requests.map(request => <div key={request.id} className="flex items-center gap-3 rounded-2xl border border-[#29435d] bg-[#101f31] p-4"><Avatar profile={request.profiles} /><div className="min-w-0 flex-1"><div className="font-semibold text-white">{isOwner(request.profiles?.id) ? <span className="owner-name">{request.profiles?.display_name}</span> : request.profiles?.display_name}</div><div className="text-xs text-[#7792ac]">@{request.profiles?.username} · {request.receiver_id === profile.id ? 'Incoming request' : 'Request sent'}</div></div>{request.receiver_id === profile.id ? <div className="flex gap-2"><button onClick={() => respond(request, 'accepted')} className="rounded-lg bg-[#237d68] px-3 py-2 text-xs font-semibold text-white">Accept</button><button onClick={() => respond(request, 'declined')} className="rounded-lg border border-[#4b6178] px-3 py-2 text-xs text-[#b6c7d7]">Decline</button></div> : <span className="text-xs text-[#7894ad]">Waiting for response</span>}</div>) : <EmptyState icon={<Check size={21} />} title="No pending requests" text="Friend requests you receive or send will appear here." />}</div> : <div className="mt-6 max-w-3xl">{shown.length ? <div className="grid sm:grid-cols-2 gap-3">{shown.map(friend => <div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-[#29435d] bg-[#101f31] p-4"><div className="relative"><Avatar profile={friend} /><span className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#101f31] ${friend.status === 'online' ? 'bg-[#3dcc9c]' : friend.status === 'away' ? 'bg-[#e2b75c]' : 'bg-[#53677f]'}`} /></div><div className="min-w-0 flex-1"><div className="font-semibold text-white">{isOwner(friend.id) ? <span className="owner-name">{friend.display_name}</span> : friend.display_name}</div><div className="text-xs text-[#7893ac]">@{friend.username} · {friend.status}</div></div><button onClick={() => onMessage(friend.id)} className="rounded-lg p-2 text-[#7898b2] hover:bg-[#1d3852] hover:text-white"><MessageCircle size={17} /></button></div>)}</div> : <EmptyState icon={<Users size={21} />} title={tab === 'blocked' ? 'No blocked users' : 'Your friend list is empty'} text="Use Add friend to connect with a classmate by username." />}</div>}</div></div>; }

function NotificationsView({ notifications, onRead, onReadAll }: { notifications: Notification[]; onRead: (id: string) => void; onReadAll: () => void }) { return <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-12"><div className="max-w-3xl mx-auto"><div className="flex items-end justify-between"><div><div className="text-sm text-[#63baff] mb-2 flex items-center gap-2"><Bell size={15} /> SchoolChat updates</div><h2 className="font-display text-3xl font-bold text-white">Notifications</h2></div><button onClick={onReadAll} className="text-xs font-semibold text-[#6cbfff]">Mark all as read</button></div><div className="mt-7 space-y-2">{notifications.length ? notifications.map(notification => <button key={notification.id} onClick={() => onRead(notification.id)} className={`w-full text-left flex gap-3 rounded-2xl border p-4 transition ${notification.is_read ? 'border-[#23394f] bg-[#101d2d]' : 'border-[#315875] bg-[#132b43]'}`}><div className={`h-9 w-9 rounded-xl flex items-center justify-center ${notification.is_read ? 'bg-[#1d3045] text-[#718da7]' : 'bg-[#1d547c] text-[#89d2ff]'}`}><Bell size={16} /></div><div className="flex-1"><div className="font-semibold text-[#d8e6f2]">{notification.title}</div><div className="mt-1 text-sm text-[#8099b1]">{notification.body}</div><div className="mt-2 text-[11px] text-[#627c98]">{formatDate(notification.created_at)}</div></div>{!notification.is_read && <div className="mt-2 h-2 w-2 rounded-full bg-[#5ebeff]" />}</button>) : <EmptyState icon={<Bell size={21} />} title="Nothing new" text="You'll see friend requests, replies, and mentions here." />}</div></div></div>; }

function ProfileView({ profile, logout, onSettings, onAdmin, adminExists, claimingAdmin, onClaimAdmin }: { profile: Profile; logout: () => void; onSettings: () => void; onAdmin: () => void; adminExists: boolean | null; claimingAdmin: boolean; onClaimAdmin: () => void }) { return <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-12"><div className="max-w-3xl mx-auto">{adminExists === false && profile.role !== 'admin' && <div className="mb-5 rounded-2xl border border-[#3d5a24] bg-[#1a2e16] p-5"><div className="flex items-start gap-3"><div className="h-9 w-9 rounded-xl bg-[#2d4e1f] flex items-center justify-center text-[#7dd662] shrink-0"><Shield size={18} /></div><div className="flex-1"><div className="font-semibold text-white text-sm">Claim administrator</div><div className="text-xs text-[#91a874] mt-1">No administrator has been set up yet. Claim admin to manage users, classes, channels, and reports. Only the first person to claim this role will get it.</div></div><button onClick={onClaimAdmin} disabled={claimingAdmin} className="shrink-0 rounded-xl bg-[#3a6b1f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#457f26] disabled:opacity-50">{claimingAdmin ? 'Claiming...' : 'Claim admin'}</button></div></div>}<div className="rounded-3xl border border-[#29435d] bg-[#101f31] overflow-hidden"><div className="h-36 relative overflow-hidden">{profile.banner_url ? <img src={profile.banner_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-r from-[#16416a] via-[#1c638e] to-[#145b61]" />}<div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#101f31]/80" /><div className="absolute -bottom-8 left-6"><Avatar profile={profile} size="lg" /></div></div><div className="px-6 pt-12 pb-7"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><h2 className="font-display text-2xl font-bold text-white">{isOwner(profile.id) ? <span className="owner-name">{profile.display_name}</span> : profile.display_name}</h2><div className="text-sm text-[#7e99b3] mt-1">@{profile.username}</div><div className="mt-4 flex items-center gap-2 text-xs text-[#7f9ab3]"><span className="h-2 w-2 rounded-full bg-[#3dcc9c]" /> {profile.status} · {profile.role}</div></div><button onClick={logout} className="self-start flex items-center gap-2 rounded-xl border border-[#593d4c] px-3 py-2 text-xs font-semibold text-[#ffadbd] hover:bg-[#3c2230]"><LogOut size={14} /> Sign out</button></div><div className="mt-7 border-t border-[#273d55] pt-5"><div className="text-[10px] font-bold tracking-[.15em] text-[#6f8da8]">ABOUT ME</div><p className="mt-2 text-sm leading-6 text-[#a0b4c7]">{profile.about || profile.bio || 'Your SchoolChat profile. Keep conversations kind, clear, and school-approved.'}</p></div></div></div><div className="mt-5 space-y-2"><button onClick={onSettings} className="w-full rounded-2xl border border-[#29435d] bg-[#101f31] p-5 text-left hover:border-[#4d98ca] transition"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-[#1d3955] flex items-center justify-center text-[#76c3f7]"><Settings size={17} /></div><div><div className="font-semibold text-white">Profile & privacy</div><div className="text-xs text-[#7993ac] mt-1">Manage your profile, appearance, and notification preferences.</div></div><ChevronRight size={17} className="ml-auto text-[#557693]" /></div></button>{profile.role === 'admin' && <button onClick={onAdmin} className="w-full rounded-2xl border border-[#29435d] bg-[#101f31] p-5 text-left hover:border-[#4d98ca] transition"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-[#4a3c1e] flex items-center justify-center text-[#f1bd62]"><Shield size={17} /></div><div><div className="font-semibold text-white">Administrator dashboard</div><div className="text-xs text-[#7993ac] mt-1">Manage users, classes, channels, and reports.</div></div><ChevronRight size={17} className="ml-auto text-[#557693]" /></div></button>}</div></div></div>; }
export default App;
