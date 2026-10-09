import { useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, Loader2, Plus, Settings, Hash, ChevronDown, ChevronRight,
  Save, X, Shield, Palette, Users, MessageSquare, Eye, AtSign, Crown,
  GripVertical, Edit3, Check, Lock,
} from 'lucide-react';
import type { Category, Channel, ClassMember, ClassPermission, ClassRoleRow, SchoolClass } from '@/types';
import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ROLE_COLORS = ['#99aab5', '#f1bd62', '#3ba55d', '#e74c3c', '#e91e63', '#9b59b6', '#3498db', '#1abc9c', '#e67e22', '#95a5a6'];

const PERMISSION_LABELS: { key: ClassPermission; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'manage_server', label: 'Manage Server', desc: 'Edit name, icon, and description', icon: <Settings size={15} /> },
  { key: 'manage_channels', label: 'Manage Channels', desc: 'Create, edit, and delete channels', icon: <Hash size={15} /> },
  { key: 'manage_roles', label: 'Manage Roles', desc: 'Create, edit, and delete roles', icon: <Shield size={15} /> },
  { key: 'manage_members', label: 'Manage Members', desc: 'Kick members and assign roles', icon: <Users size={15} /> },
  { key: 'send_messages', label: 'Send Messages', desc: 'Send messages in text channels', icon: <MessageSquare size={15} /> },
  { key: 'manage_messages', label: 'Manage Messages', desc: 'Delete other members\' messages', icon: <Trash2 size={15} /> },
  { key: 'view_channel', label: 'View Channels', desc: 'See and read channel content', icon: <Eye size={15} /> },
  { key: 'mention_everyone', label: 'Mention Everyone', desc: 'Use @everyone and @here', icon: <AtSign size={15} /> },
];

type Tab = 'overview' | 'channels' | 'roles';

export function ServerSettings({
  serverClass, members, categories, channels, onClose, onChanged,
}: {
  serverClass: SchoolClass;
  members: ClassMember[];
  categories: Category[];
  channels: Channel[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Settings size={16} /> },
    { key: 'channels', label: 'Channels', icon: <Hash size={16} /> },
    { key: 'roles', label: 'Roles', icon: <Shield size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-[840px] h-[88vh] mx-4 rounded-2xl border border-[#2a3f5a] bg-[#1a2332] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden flex animate-[fadeIn_0.15s_ease-out]" onClick={e => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-[210px] shrink-0 bg-[#141c2a] border-r border-[#243a53] flex flex-col">
          <div className="px-4 py-4 border-b border-[#243a53]">
            <div className="font-display font-bold text-white text-sm truncate">{serverClass.name}</div>
            <div className="text-[10px] text-[#6f87a3] mt-0.5">Server Settings</div>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${tab === t.key ? 'bg-[#2a3f5a] text-white' : 'text-[#8ea3bd] hover:bg-[#1d2b40] hover:text-white'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
          <div className="p-2 border-t border-[#243a53]">
            <button onClick={onClose} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#8ea3bd] hover:bg-[#1d2b40] hover:text-white transition">
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {tab === 'overview' && <OverviewTab serverClass={serverClass} onChanged={onChanged} />}
          {tab === 'channels' && <ChannelsTab serverClass={serverClass} categories={categories} channels={channels} onChanged={onChanged} />}
          {tab === 'roles' && <RolesTab serverClass={serverClass} members={members} onChanged={onChanged} />}
        </div>
      </div>
    </div>
  );
}

/* ============================ OVERVIEW ============================ */

function OverviewTab({ serverClass, onChanged }: { serverClass: SchoolClass; onChanged: () => void }) {
  const [name, setName] = useState(serverClass.name);
  const [description, setDescription] = useState(serverClass.description || '');
  const [iconUrl, setIconUrl] = useState(serverClass.icon_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removingIcon, setRemovingIcon] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) { setError('Only image files are supported.'); return; }
    if (file.size > MAX_FILE_SIZE) { setError('Image is too large. Maximum size is 5 MB.'); return; }
    setUploading(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setError('Not authenticated.'); setUploading(false); return; }
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('server-icons').upload(fileName, file, { contentType: file.type, upsert: false });
    if (upErr) { setError('Upload failed. Please try again.'); setUploading(false); return; }
    const { data: pub } = supabase.storage.from('server-icons').getPublicUrl(fileName);
    const publicUrl = pub.publicUrl;
    if (iconUrl) {
      const oldPath = iconUrl.split('/server-icons/')[1];
      if (oldPath && oldPath.startsWith(userId + '/')) await supabase.storage.from('server-icons').remove([oldPath]);
    }
    const { error: dbErr } = await supabase.from('classes').update({ icon_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', serverClass.id);
    setUploading(false);
    if (dbErr) { setError('Could not save server icon.'); return; }
    setIconUrl(publicUrl);
    onChanged();
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeIcon = async () => {
    setRemovingIcon(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (iconUrl && userId) {
      const oldPath = iconUrl.split('/server-icons/')[1];
      if (oldPath && oldPath.startsWith(userId + '/')) await supabase.storage.from('server-icons').remove([oldPath]);
    }
    await supabase.from('classes').update({ icon_url: null, updated_at: new Date().toISOString() }).eq('id', serverClass.id);
    setRemovingIcon(false);
    setIconUrl('');
    onChanged();
  };

  const save = async () => {
    setSaving(true); setError('');
    const { error: dbErr } = await supabase.from('classes').update({ name, description, updated_at: new Date().toISOString() }).eq('id', serverClass.id);
    setSaving(false);
    if (dbErr) { setError('Could not save changes.'); return; }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    onChanged();
  };

  return (
    <div className="p-6 max-w-[520px]">
      <h2 className="font-display text-xl font-bold text-white mb-1">Server Overview</h2>
      <p className="text-sm text-[#718ba6] mb-6">Customize your server's appearance and details.</p>

      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#7f99b5]">Server Icon</label>
        <div className="mt-3 flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl flex items-center justify-center font-display font-bold text-white text-2xl shadow-lg overflow-hidden shrink-0" style={{ background: serverClass.icon_color }}>
            {iconUrl ? <img src={iconUrl} alt="" className="h-full w-full object-cover" /> : (serverClass.icon_emoji || serverClass.name.slice(0, 2))}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleIconSelect} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading || removingIcon} className="flex items-center gap-2 rounded-lg border border-[#30455f] bg-[#1a2838] px-4 py-2 text-sm text-[#c2d2e1] hover:border-[#4ca8ef] disabled:opacity-50 transition">
              {uploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> Upload icon</>}
            </button>
            {iconUrl && <button onClick={removeIcon} disabled={removingIcon || uploading} className="flex items-center gap-2 rounded-lg border border-[#4a2233] px-4 py-2 text-sm text-[#ffadbd] hover:bg-[#3c2230] disabled:opacity-50 transition">
              {removingIcon ? <><Loader2 size={15} className="animate-spin" /> Removing…</> : <><Trash2 size={15} /> Remove</>}
            </button>}
          </div>
        </div>
        {error && <div className="mt-2 text-xs text-[#ffb8c6]">{error}</div>}
        <p className="mt-2 text-xs text-[#637b96]">JPG, PNG, or GIF up to 5 MB. Recommended 128x128.</p>
      </div>

      <div className="mb-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#7f99b5]">Server Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#30455f] bg-[#141c2a] px-4 py-3 text-white outline-none focus:border-[#4ca8ef]" />
      </div>

      <div className="mb-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#7f99b5]">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Tell people what this server is about" className="mt-2 w-full rounded-xl border border-[#30455f] bg-[#141c2a] px-4 py-3 text-white outline-none focus:border-[#4ca8ef] resize-none" />
      </div>

      <button onClick={save} disabled={saving} className="rounded-xl bg-[#247bbb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2e8bcf] disabled:opacity-50 transition flex items-center gap-2">
        {saved ? <><Check size={16} /> Saved!</> : saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
      </button>
    </div>
  );
}

/* ============================ CHANNELS ============================ */

function ChannelsTab({ serverClass, categories, channels, onChanged }: { serverClass: SchoolClass; categories: Category[]; channels: Channel[]; onChanged: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(categories.map(c => c.id)));
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingChannelFor, setAddingChannelFor] = useState<string | null>(null);
  const [newChanName, setNewChanName] = useState('');
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editChanName, setEditChanName] = useState('');
  const [editChanDesc, setEditChanDesc] = useState('');
  const [editChanType, setEditChanType] = useState('chat');
  const [newChanType, setNewChanType] = useState('chat');
  const [error, setError] = useState('');

  const toggle = (id: string) => setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const maxPos = categories.length > 0 ? Math.max(...categories.map(c => c.position)) : 0;
    const { error: err } = await supabase.from('categories').insert({ class_id: serverClass.id, name: newCatName.trim(), position: maxPos + 1 });
    if (err) { setError('Could not create category.'); return; }
    setNewCatName(''); setShowNewCat(false); onChanged();
  };

  const createChannel = async (catId: string) => {
    if (!newChanName.trim()) return;
    const catChannels = channels.filter(c => c.category_id === catId);
    const maxPos = catChannels.length > 0 ? Math.max(...catChannels.map(c => c.position)) : 0;
    const { data: chanData, error: err } = await supabase.from('channels').insert({ class_id: serverClass.id, category_id: catId, name: newChanName.trim().replace(/\s+/g, '-').toLowerCase(), description: '', type: newChanType, position: maxPos + 1 }).select('*').maybeSingle();
    if (err) { console.error('Channel create error:', err.message, err.code, err.details); setError(`Could not create channel: ${err.message}`); return; }
    setNewChanName(''); setNewChanType('chat'); setAddingChannelFor(null); onChanged();
  };

  const saveEditChannel = async () => {
    if (!editingChannel || !editChanName.trim()) return;
    const { error: err } = await supabase.from('channels').update({ name: editChanName.trim().replace(/\s+/g, '-').toLowerCase(), description: editChanDesc, type: editChanType, updated_at: new Date().toISOString() }).eq('id', editingChannel.id);
    if (err) { setError('Could not save channel.'); return; }
    setEditingChannel(null); onChanged();
  };

  const deleteChannel = async (ch: Channel) => {
    if (!confirm(`Delete #${ch.name}? This cannot be undone.`)) return;
    const { error: err } = await supabase.from('channels').delete().eq('id', ch.id);
    if (err) { setError('Could not delete channel.'); return; }
    onChanged();
  };

  const deleteCategory = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}" and all its channels?`)) return;
    const { error: err } = await supabase.from('categories').delete().eq('id', cat.id);
    if (err) { setError('Could not delete category.'); return; }
    onChanged();
  };

  const uncategorized = channels.filter(c => !c.category_id);

  return (
    <div className="p-6 max-w-[600px]">
      <h2 className="font-display text-xl font-bold text-white mb-1">Channel Management</h2>
      <p className="text-sm text-[#718ba6] mb-5">Create, edit, and organize channels and categories.</p>
      {error && <div className="mb-4 rounded-lg border border-[#7e3b4c] bg-[#3a1d2a] px-3 py-2 text-sm text-[#ffb8c6]">{error}</div>}

      <div className="space-y-1">
        {categories.map(cat => (
          <div key={cat.id}>
            <div className="group flex items-center gap-1 px-1 py-1.5">
              <button onClick={() => toggle(cat.id)} className="text-[#6f87a3] hover:text-white">
                {expanded.has(cat.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <span className="text-[10px] font-bold tracking-[.14em] text-[#66839f] flex-1">{cat.name.toUpperCase()}</span>
              <button onClick={() => setAddingChannelFor(addingChannelFor === cat.id ? null : cat.id)} className="text-[#6f87a3] hover:text-white transition"><Plus size={14} /></button>
              <button onClick={() => deleteCategory(cat)} className="text-[#6f87a3] hover:text-[#ffadbd] transition"><Trash2 size={13} /></button>
            </div>
            {expanded.has(cat.id) && (
              <div className="ml-5 space-y-0.5">
                {channels.filter(c => c.category_id === cat.id).map(ch => (
                  <div key={ch.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1d2b40] transition">
                    {ch.type === 'read_only' || ch.type === 'announcement' ? <Lock size={14} className="text-[#8a7a3e]" /> : <Hash size={14} className="text-[#607f9e]" />}
                    {editingChannel?.id === ch.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input autoFocus value={editChanName} onChange={e => setEditChanName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditChannel(); if (e.key === 'Escape') setEditingChannel(null); }} className="flex-1 rounded-md border border-[#3e7194] bg-[#14283d] px-2 py-1 text-sm text-white outline-none" />
                        <button onClick={saveEditChannel} className="rounded-md bg-[#277eb8] px-2 py-1 text-xs text-white"><Check size={13} /></button>
                        <button onClick={() => setEditingChannel(null)} className="text-[#8ea3bd]"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-[#c2d2e1] flex-1">{ch.name}</span>
                        <button onClick={() => { setEditingChannel(ch); setEditChanName(ch.name); setEditChanDesc(ch.description || ''); setEditChanType(ch.type); }} className="text-[#6f87a3] hover:text-white transition"><Edit3 size={13} /></button>
                        <button onClick={() => deleteChannel(ch)} className="text-[#6f87a3] hover:text-[#ffadbd] transition"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                ))}
                {addingChannelFor === cat.id && (
                  <div className="rounded-lg px-2 py-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-[#607f9e]" />
                      <input autoFocus value={newChanName} onChange={e => setNewChanName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createChannel(cat.id); if (e.key === 'Escape') setAddingChannelFor(null); }} placeholder="new-channel" className="flex-1 rounded-md border border-[#3e7194] bg-[#14283d] px-2 py-1 text-sm text-white outline-none" />
                      <button onClick={() => createChannel(cat.id)} className="rounded-md bg-[#277eb8] px-2 py-1 text-xs text-white"><Check size={13} /></button>
                      <button onClick={() => setAddingChannelFor(null)} className="text-[#8ea3bd]"><X size={14} /></button>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <select value={newChanType} onChange={e => setNewChanType(e.target.value)} className="rounded-md border border-[#3e7194] bg-[#14283d] px-2 py-1 text-xs text-white outline-none">
                        <option value="chat">Chat (everyone can post)</option>
                        <option value="read_only">Read-only (owner & admin only)</option>
                        <option value="announcement">Announcement (owner & admin only)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {uncategorized.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] font-bold tracking-[.14em] text-[#66839f] px-1 py-1.5">UNCATEGORIZED</div>
            <div className="ml-5 space-y-0.5">
              {uncategorized.map(ch => (
                <div key={ch.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1d2b40] transition">
                  <Hash size={14} className="text-[#607f9e]" />
                  <span className="text-sm text-[#c2d2e1] flex-1">{ch.name}</span>
                  <button onClick={() => deleteChannel(ch)} className="text-[#6f87a3] hover:text-[#ffadbd] transition"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {editingChannel && (
          <div className="mt-4 rounded-xl border border-[#30455f] bg-[#141c2a] p-4">
            <div className="text-xs font-semibold text-[#8ea3bd] mb-3">Edit Channel</div>
            <input value={editChanName} onChange={e => setEditChanName(e.target.value)} placeholder="channel-name" className="w-full rounded-lg border border-[#30455f] bg-[#101d2e] px-3 py-2 text-sm text-white outline-none focus:border-[#4ca8ef]" />
            <textarea value={editChanDesc} onChange={e => setEditChanDesc(e.target.value)} rows={2} placeholder="Channel description (optional)" className="mt-2 w-full rounded-lg border border-[#30455f] bg-[#101d2e] px-3 py-2 text-sm text-white outline-none focus:border-[#4ca8ef] resize-none" />
            <div className="mt-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#7f99b5]">Channel Type</label>
              <select value={editChanType} onChange={e => setEditChanType(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#30455f] bg-[#101d2e] px-3 py-2 text-sm text-white outline-none focus:border-[#4ca8ef]">
                <option value="chat">Chat (everyone can post)</option>
                <option value="read_only">Read-only (owner & admin only)</option>
                <option value="announcement">Announcement (owner & admin only)</option>
                <option value="homework">Homework</option>
                <option value="subject">Subject</option>
                <option value="resources">Resources</option>
                <option value="events">Events</option>
              </select>
              {editChanType === 'read_only' && <p className="mt-1.5 text-[11px] text-[#8a7a3e] flex items-center gap-1"><Lock size={11} /> Only the class owner and site admins can post messages in this channel.</p>}
              {editChanType === 'announcement' && <p className="mt-1.5 text-[11px] text-[#8a7a3e] flex items-center gap-1"><Lock size={11} /> Only the class owner and site admins can post messages in this channel.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={saveEditChannel} className="rounded-lg bg-[#277eb8] px-3 py-1.5 text-sm text-white hover:bg-[#3591cf]">Save</button>
              <button onClick={() => setEditingChannel(null)} className="rounded-lg border border-[#30455f] px-3 py-1.5 text-sm text-[#8ea3bd]">Cancel</button>
            </div>
          </div>
        )}

        {showNewCat ? (
          <div className="mt-4 flex items-center gap-2">
            <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createCategory(); if (e.key === 'Escape') setShowNewCat(false); }} placeholder="Category name" className="flex-1 rounded-lg border border-[#30455f] bg-[#141c2a] px-3 py-2 text-sm text-white outline-none focus:border-[#4ca8ef]" />
            <button onClick={createCategory} className="rounded-lg bg-[#277eb8] px-3 py-2 text-sm text-white"><Check size={15} /></button>
            <button onClick={() => setShowNewCat(false)} className="text-[#8ea3bd]"><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => setShowNewCat(true)} className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-[#3b5874] px-4 py-2.5 text-sm text-[#7aa0c3] hover:border-[#61b7f5] hover:text-white transition w-full justify-center">
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================ ROLES ============================ */

function RolesTab({ serverClass, members, onChanged }: { serverClass: SchoolClass; members: ClassMember[]; onChanged: () => void }) {
  const [roles, setRoles] = useState<ClassRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRoles = async () => {
    const { data } = await supabase.from('class_roles').select('*').eq('class_id', serverClass.id).order('position', { ascending: true });
    setRoles((data || []) as ClassRoleRow[]);
    setLoading(false);
  };

  useEffect(() => { loadRoles(); }, [serverClass.id]);

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    setSaving(true);
    const maxPos = roles.length > 0 ? Math.max(...roles.map(r => r.position)) : 0;
    const { data, error: err } = await supabase.from('class_roles').insert({ class_id: serverClass.id, name: newRoleName.trim(), color: newRoleColor, position: maxPos + 1, permissions: ['view_channel', 'send_messages'] }).select('*').maybeSingle();
    setSaving(false);
    if (err) { setError('Could not create role.'); return; }
    setNewRoleName(''); setCreating(false);
    if (data) { setSelectedRoleId(data.id); }
    onChanged(); loadRoles();
  };

  const updateRole = async (role: ClassRoleRow, updates: Partial<ClassRoleRow>) => {
    const { error: err } = await supabase.from('class_roles').update(updates).eq('id', role.id);
    if (err) { setError('Could not update role.'); return; }
    onChanged(); loadRoles();
  };

  const deleteRole = async (role: ClassRoleRow) => {
    if (!confirm(`Delete role "${role.name}"? Members with this role will lose it.`)) return;
    const { error: err } = await supabase.from('class_roles').delete().eq('id', role.id);
    if (err) { setError('Could not delete role.'); return; }
    if (selectedRoleId === role.id) setSelectedRoleId(null);
    onChanged(); loadRoles();
  };

  const togglePermission = (role: ClassRoleRow, perm: ClassPermission) => {
    const has = role.permissions.includes(perm);
    const next = has ? role.permissions.filter(p => p !== perm) : [...role.permissions, perm];
    updateRole(role, { permissions: next as ClassPermission[] });
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const roleMemberCount = (roleId: string) => members.filter(m => m.role_id === roleId).length;

  return (
    <div className="p-6 max-w-[600px]">
      <h2 className="font-display text-xl font-bold text-white mb-1">Role Management</h2>
      <p className="text-sm text-[#718ba6] mb-5">Create custom roles with permissions, like Discord.</p>
      {error && <div className="mb-4 rounded-lg border border-[#7e3b4c] bg-[#3a1d2a] px-3 py-2 text-sm text-[#ffb8c6]">{error}</div>}

      {/* Role list */}
      <div className="space-y-1 mb-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#718ba6]"><Loader2 size={15} className="animate-spin" /> Loading roles…</div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-[#6f87a3] py-4 text-center">No custom roles yet. Create one below.</p>
        ) : roles.map(role => (
          <div key={role.id} className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${selectedRoleId === role.id ? 'border-[#4ca8ef] bg-[#1a2f48]' : 'border-[#243a53] bg-[#141c2a] hover:border-[#3b5874]'}`} onClick={() => setSelectedRoleId(role.id)}>
            <div className="h-3 w-3 rounded-full shrink-0" style={{ background: role.color }} />
            <span className="text-sm font-medium flex-1" style={{ color: role.color }}>{role.name}</span>
            <span className="text-[10px] text-[#6f87a3]">{roleMemberCount(role.id)} member{roleMemberCount(role.id) !== 1 ? 's' : ''}</span>
            <span className="text-[10px] text-[#6f87a3]">{role.permissions.length} perms</span>
          </div>
        ))}
      </div>

      {/* Create new role */}
      {creating ? (
        <div className="rounded-xl border border-[#30455f] bg-[#141c2a] p-4 mb-4">
          <div className="text-xs font-semibold text-[#8ea3bd] mb-3">Create New Role</div>
          <input autoFocus value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createRole(); }} placeholder="Role name (e.g. Teacher, Student Leader)" className="w-full rounded-lg border border-[#30455f] bg-[#101d2e] px-3 py-2 text-sm text-white outline-none focus:border-[#4ca8ef]" />
          <div className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7f99b5] mb-2">Color</div>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map(c => (
                <button key={c} onClick={() => setNewRoleColor(c)} className={`h-7 w-7 rounded-lg transition ${newRoleColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141c2a]' : ''}`} style={{ background: c }}>
                  {newRoleColor === c && <Check size={14} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={createRole} disabled={saving} className="rounded-lg bg-[#277eb8] px-4 py-2 text-sm text-white hover:bg-[#3591cf] disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create Role
            </button>
            <button onClick={() => { setCreating(false); setNewRoleName(''); }} className="rounded-lg border border-[#30455f] px-4 py-2 text-sm text-[#8ea3bd]">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg border border-dashed border-[#3b5874] px-4 py-2.5 text-sm text-[#7aa0c3] hover:border-[#61b7f5] hover:text-white transition w-full justify-center mb-4">
          <Plus size={16} /> Create Role
        </button>
      )}

      {/* Role editor */}
      {selectedRole && (
        <div className="rounded-xl border border-[#30455f] bg-[#141c2a] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-4 rounded-full" style={{ background: selectedRole.color }} />
            <span className="font-display text-lg font-bold" style={{ color: selectedRole.color }}>{selectedRole.name}</span>
            <button onClick={() => deleteRole(selectedRole)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#4a2233] px-3 py-1.5 text-xs text-[#ffadbd] hover:bg-[#3c2230] transition">
              <Trash2 size={13} /> Delete Role
            </button>
          </div>

          {/* Name editor */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#7f99b5]">Role Name</label>
            <input value={selectedRole.name} onChange={e => updateRole(selectedRole, { name: e.target.value })} className="mt-1.5 w-full rounded-lg border border-[#30455f] bg-[#101d2e] px-3 py-2 text-sm text-white outline-none focus:border-[#4ca8ef]" />
          </div>

          {/* Color picker */}
          <div className="mb-5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#7f99b5] mb-2 block flex items-center gap-1"><Palette size={12} /> Role Color</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map(c => (
                <button key={c} onClick={() => updateRole(selectedRole, { color: c })} className={`h-8 w-8 rounded-lg transition ${selectedRole.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141c2a]' : ''}`} style={{ background: c }}>
                  {selectedRole.color === c && <Check size={15} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Mentionable toggle */}
          <div className="mb-5 flex items-center justify-between rounded-lg border border-[#243a53] bg-[#101d2e] px-4 py-3">
            <div>
              <div className="text-sm text-white flex items-center gap-2"><AtSign size={14} /> Allow anyone to mention this role</div>
              <div className="text-[11px] text-[#6f87a3] mt-0.5">When enabled, @role can be used in messages</div>
            </div>
            <button onClick={() => updateRole(selectedRole, { is_mentionable: !selectedRole.is_mentionable })} className={`relative h-6 w-11 rounded-full transition ${selectedRole.is_mentionable ? 'bg-[#3ba55d]' : 'bg-[#3a4a5e]'}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${selectedRole.is_mentionable ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Permissions */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7f99b5] mb-3 flex items-center gap-1"><Shield size={12} /> Permissions</div>
            <div className="space-y-1.5">
              {PERMISSION_LABELS.map(perm => {
                const has = selectedRole.permissions.includes(perm.key);
                return (
                  <button key={perm.key} onClick={() => togglePermission(selectedRole, perm.key)} className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${has ? 'border-[#2d5e1f] bg-[#162d12]' : 'border-[#243a53] bg-[#101d2e] hover:border-[#3b5874]'}`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${has ? 'bg-[#1d4a16] text-[#7dd662]' : 'bg-[#1a2d43] text-[#6f87a3]'}`}>{perm.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${has ? 'text-white' : 'text-[#a0b4c7]'}`}>{perm.label}</div>
                      <div className="text-[11px] text-[#6f87a3] mt-0.5">{perm.desc}</div>
                    </div>
                    <div className={`relative h-5 w-9 rounded-full transition shrink-0 ${has ? 'bg-[#3ba55d]' : 'bg-[#3a4a5e]'}`}>
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${has ? 'left-[18px]' : 'left-0.5'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
