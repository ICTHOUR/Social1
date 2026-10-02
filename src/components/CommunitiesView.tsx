import React, { useState, useEffect } from 'react';
import {
  Users,
  Flag,
  Calendar,
  Plus,
  MapPin,
  Globe,
  Sparkles,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  Heart,
  Video,
  ExternalLink,
  MessageSquare,
  Shield,
  Filter,
} from 'lucide-react';
import { Group, Page, Event as AppEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { GroupDetailModal } from './community/GroupDetailModal';
import { PageDetailModal } from './community/PageDetailModal';
import { EventDetailModal } from './community/EventDetailModal';
import { AdMobBanner } from './ads/AdMobBanner';

interface CommunitiesViewProps {
  initialTab?: 'groups' | 'pages' | 'events';
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({ initialTab = 'groups' }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'groups' | 'pages' | 'events'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'online' | 'offline' | 'going'>('all');

  const [groups, setGroups] = useState<Group[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected for Details Modal
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Creation Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<'public' | 'private'>('public');
  const [newGroupAvatar, setNewGroupAvatar] = useState('');
  const [newGroupCover, setNewGroupCover] = useState('');
  const [newGroupRules, setNewGroupRules] = useState([
    { title: 'Be Respectful', description: 'Treat every community member with dignity and courtesy.' },
    { title: 'No Spam or Solicitation', description: 'Do not post self-promotional spam or unauthorized ads.' },
  ]);

  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageCategory, setNewPageCategory] = useState('Creator & Artist');
  const [newPageDesc, setNewPageDesc] = useState('');
  const [newPageAvatar, setNewPageAvatar] = useState('');
  const [newPageCover, setNewPageCover] = useState('');

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventType, setNewEventType] = useState<'online' | 'offline'>('online');
  const [newEventLocation, setNewEventLocation] = useState('https://stream.nixo.network/live/global');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('Music & Live Stream');
  const [newEventCover, setNewEventCover] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'groups') {
        const url = `/api/groups${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setGroups((await res.json()).groups || []);
      } else if (activeTab === 'pages') {
        const url = `/api/pages${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setPages((await res.json()).pages || []);
      } else if (activeTab === 'events') {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (eventFilter !== 'all') params.append('filter', eventFilter);
        const res = await fetch(`/api/events?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setEvents((await res.json()).events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [activeTab, searchQuery, eventFilter, token]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newGroupName.trim() || !newGroupDesc.trim()) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          privacy: newGroupPrivacy,
          avatarUrl: newGroupAvatar.trim() || undefined,
          coverUrl: newGroupCover.trim() || undefined,
          rules: newGroupRules,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setNewGroupName('');
        setNewGroupDesc('');
        setShowCreateGroup(false);
        fetchCommunityData();
        showToast('Community Group Established!');
        if (d.groupId) setSelectedGroupId(d.groupId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create group');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPageName.trim() || !newPageDesc.trim()) return;

    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPageName,
          category: newPageCategory,
          description: newPageDesc,
          avatarUrl: newPageAvatar.trim() || undefined,
          coverUrl: newPageCover.trim() || undefined,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setNewPageName('');
        setNewPageDesc('');
        setShowCreatePage(false);
        fetchCommunityData();
        showToast('Page Created Successfully!');
        if (d.pageId) setSelectedPageId(d.pageId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create page');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newEventTitle.trim() || !newEventStartTime) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newEventTitle,
          description: newEventDesc,
          eventType: newEventType,
          location: newEventLocation,
          startTime: new Date(newEventStartTime).toISOString(),
          category: newEventCategory,
          coverUrl: newEventCover.trim() || undefined,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setNewEventTitle('');
        setNewEventDesc('');
        setShowCreateEvent(false);
        fetchCommunityData();
        showToast('Event Scheduled and Broadcasted!');
        if (d.eventId) setSelectedEventId(d.eventId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create event');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleQuickJoinGroup = async (e: React.MouseEvent, gId: string) => {
    e.stopPropagation();
    if (!token) {
      showToast('Please sign in to join groups');
      return;
    }
    try {
      const res = await fetch(`/api/groups/${gId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: 'Join from explore' }),
      });
      if (res.ok) {
        fetchCommunityData();
        showToast('Group membership updated');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickFollowPage = async (e: React.MouseEvent, pId: string) => {
    e.stopPropagation();
    if (!token) {
      showToast('Please sign in to follow pages');
      return;
    }
    try {
      const res = await fetch(`/api/pages/${pId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchCommunityData();
        showToast('Follow status updated');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto my-4 px-2 sm:px-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-cyan-500 text-slate-950 text-xs font-black shadow-2xl flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">Community Ecosystem</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Explore collaborative groups, verified creator pages, and live event gatherings
          </p>
        </div>

        {/* Tab Selector & Create Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-black/40 rounded-2xl border border-white/10">
            <button
              onClick={() => {
                setActiveTab('groups');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'groups'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Groups
            </button>
            <button
              onClick={() => {
                setActiveTab('pages');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pages'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flag className="w-3.5 h-3.5" /> Pages
            </button>
            <button
              onClick={() => {
                setActiveTab('events');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Events
            </button>
          </div>

          {/* Primary Create Button for Active Tab */}
          {activeTab === 'groups' && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-cyan-400" /> Create Group
            </button>
          )}
          {activeTab === 'pages' && (
            <button
              onClick={() => setShowCreatePage(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-cyan-400" /> Create Page
            </button>
          )}
          {activeTab === 'events' && (
            <button
              onClick={() => setShowCreateEvent(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-cyan-400" /> Host Event
            </button>
          )}
        </div>
      </div>

      {/* Google AdMob Sponsored Banner */}
      <AdMobBanner placement="communities_banner" variant="compact" className="my-2" />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {activeTab === 'events' && (
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10 w-full sm:w-auto overflow-x-auto">
            {(['all', 'online', 'offline', 'going'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setEventFilter(f)}
                className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  eventFilter === f ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading communities...</p>
        </div>
      )}

      {/* SECTION 1: GROUPS TAB */}
      {activeTab === 'groups' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.length === 0 ? (
            <div className="col-span-full text-center py-16 glass-card rounded-3xl border border-white/10">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No Groups Found</p>
              <p className="text-xs text-slate-400 mt-1">Start your own community group and bring creators together.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className="group glass-card rounded-3xl border border-white/10 overflow-hidden hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col"
              >
                {/* Cover & Avatar */}
                <div className="relative h-28 w-full bg-slate-800">
                  <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-slate-300 flex items-center gap-1 border border-white/10">
                    {g.privacy === 'private' ? <Lock className="w-3 h-3 text-amber-400" /> : <Globe className="w-3 h-3 text-emerald-400" />}
                    {g.privacy}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between -mt-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <img
                        src={g.avatarUrl}
                        alt={g.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-slate-900 shadow-lg bg-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                          {g.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-cyan-400" /> {g.membersCount} members
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">By {g.creatorName || 'Creator'}</span>
                    {g.memberStatus === 'active' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase">
                        {g.memberRole || 'Member'}
                      </span>
                    ) : g.memberStatus === 'pending' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Pending
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleQuickJoinGroup(e, g.id)}
                        className="px-3 py-1 rounded-xl bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white text-[11px] font-bold transition-all cursor-pointer"
                      >
                        {g.privacy === 'private' ? 'Request' : 'Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 2: PAGES TAB */}
      {activeTab === 'pages' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.length === 0 ? (
            <div className="col-span-full text-center py-16 glass-card rounded-3xl border border-white/10">
              <Flag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No Pages Found</p>
              <p className="text-xs text-slate-400 mt-1">Create an official Page to broadcast your brand or creative projects.</p>
            </div>
          ) : (
            pages.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPageId(p.id)}
                className="group glass-card rounded-3xl border border-white/10 overflow-hidden hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col"
              >
                <div className="relative h-28 w-full bg-slate-800">
                  <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-white/10">
                    {p.category}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between -mt-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-slate-900 shadow-lg bg-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Heart className="w-3 h-3 text-cyan-400" /> {p.followersCount} followers
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">By {p.ownerName || 'Creator'}</span>
                    <button
                      onClick={(e) => handleQuickFollowPage(e, p.id)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        p.isFollowing
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white'
                      }`}
                    >
                      {p.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 3: EVENTS TAB */}
      {activeTab === 'events' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-16 glass-card rounded-3xl border border-white/10">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No Upcoming Events</p>
              <p className="text-xs text-slate-400 mt-1">Host an online livestream or in-person workshop gathering.</p>
            </div>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                onClick={() => setSelectedEventId(e.id)}
                className="group glass-card rounded-3xl border border-white/10 overflow-hidden hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col"
              >
                <div className="relative h-32 w-full bg-slate-800">
                  <img src={e.coverUrl} alt={e.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-slate-200 flex items-center gap-1 border border-white/10">
                    {e.eventType === 'online' ? <Globe className="w-3 h-3 text-cyan-400" /> : <MapPin className="w-3 h-3 text-rose-400" />}
                    {e.eventType === 'online' ? 'Online' : 'In-Person'}
                  </span>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-cyan-500/30 text-cyan-300 text-[10px] font-black">
                    {e.category}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-black text-cyan-400">
                      {new Date(e.startTime).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors mt-0.5 truncate">
                      {e.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {e.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-cyan-400" /> {e.attendeesCount} Going
                    </span>
                    <span className="text-cyan-400 font-bold hover:underline flex items-center gap-1 text-xs">
                      View Event <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DETAIL MODALS */}
      {selectedGroupId && (
        <GroupDetailModal
          groupId={selectedGroupId}
          onClose={() => setSelectedGroupId(null)}
          onGroupUpdated={fetchCommunityData}
        />
      )}

      {selectedPageId && (
        <PageDetailModal
          pageId={selectedPageId}
          onClose={() => setSelectedPageId(null)}
          onPageUpdated={fetchCommunityData}
        />
      )}

      {selectedEventId && (
        <EventDetailModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          onEventUpdated={fetchCommunityData}
        />
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleCreateGroup}
            className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" /> Create Community Group
              </h2>
              <button type="button" onClick={() => setShowCreateGroup(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. AI Creative Builders & Synthesizers"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Describe the mission, topics, and expectations..."
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300">Privacy Setting</label>
                  <select
                    value={newGroupPrivacy}
                    onChange={(e) => setNewGroupPrivacy(e.target.value as any)}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="public">Public (Anyone can join)</option>
                    <option value="private">Private (Requires approval)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300">Avatar Image URL</label>
                  <input
                    type="url"
                    value={newGroupAvatar}
                    onChange={(e) => setNewGroupAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300">Cover Banner URL</label>
                <input
                  type="url"
                  value={newGroupCover}
                  onChange={(e) => setNewGroupCover(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold cursor-pointer hover:bg-white/15 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black cursor-pointer hover:bg-cyan-400 text-xs shadow-lg shadow-cyan-500/20"
              >
                Launch Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE PAGE MODAL */}
      {showCreatePage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleCreatePage}
            className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-cyan-400" /> Create Official Page
              </h2>
              <button type="button" onClick={() => setShowCreatePage(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300">Page Name *</label>
                <input
                  type="text"
                  required
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder="e.g. Hyperion Audio Labs"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300">Category *</label>
                  <input
                    type="text"
                    required
                    value={newPageCategory}
                    onChange={(e) => setNewPageCategory(e.target.value)}
                    placeholder="e.g. Design Studio"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300">Avatar Image URL</label>
                  <input
                    type="url"
                    value={newPageAvatar}
                    onChange={(e) => setNewPageAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300">About / Description *</label>
                <textarea
                  required
                  rows={3}
                  value={newPageDesc}
                  onChange={(e) => setNewPageDesc(e.target.value)}
                  placeholder="Overview of the studio, project, or brand..."
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Cover Banner URL</label>
                <input
                  type="url"
                  value={newPageCover}
                  onChange={(e) => setNewPageCover(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreatePage(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold cursor-pointer hover:bg-white/15 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black cursor-pointer hover:bg-cyan-400 text-xs shadow-lg shadow-cyan-500/20"
              >
                Publish Page
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleCreateEvent}
            className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" /> Host Realm Event
              </h2>
              <button type="button" onClick={() => setShowCreateEvent(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Spatial Sound Hackathon & Jam"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300">Event Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="online">Online Broadcast</option>
                    <option value="offline">In-Person Gathering</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300">Category *</label>
                  <input
                    type="text"
                    required
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                    placeholder="e.g. Technology"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300">Date & Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEventStartTime}
                    onChange={(e) => setNewEventStartTime(e.target.value)}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300">
                    {newEventType === 'online' ? 'Stream / Meeting URL *' : 'Physical Location *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder={newEventType === 'online' ? 'https://...' : '77 Spatial Way, Neo City'}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="What should attendees expect? Agenda, requirements..."
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Cover Image URL</label>
                <input
                  type="url"
                  value={newEventCover}
                  onChange={(e) => setNewEventCover(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateEvent(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold cursor-pointer hover:bg-white/15 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black cursor-pointer hover:bg-cyan-400 text-xs shadow-lg shadow-cyan-500/20"
              >
                Schedule Event
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
