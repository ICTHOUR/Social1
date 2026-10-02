import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Globe,
  Users,
  Bell,
  BellRing,
  UserPlus,
  MessageSquare,
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Event, EventDiscussion } from '../../types';

interface EventDetailModalProps {
  eventId: string;
  onClose: () => void;
  onEventUpdated?: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ eventId, onClose, onEventUpdated }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'discussions'>('details');
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [interested, setInterested] = useState<any[]>([]);
  const [userRsvp, setUserRsvp] = useState<'going' | 'interested' | 'none'>('none');
  const [hasReminder, setHasReminder] = useState(false);

  // Discussions
  const [discussions, setDiscussions] = useState<EventDiscussion[]>([]);
  const [newDiscussion, setNewDiscussion] = useState('');
  const [submittingDiscussion, setSubmittingDiscussion] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteeUsername, setInviteeUsername] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setAttendees(data.attendees || []);
        setInterested(data.interested || []);
        setUserRsvp(data.userRsvp || 'none');
        setHasReminder(!!data.hasReminder);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussions = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/discussions`);
      if (res.ok) {
        setDiscussions((await res.json()).discussions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEventDetails();
    fetchDiscussions();
  }, [eventId, token]);

  const handleRsvp = async (status: 'going' | 'interested' | 'not_going') => {
    if (!token) {
      showToast('Please sign in to RSVP');
      return;
    }
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const d = await res.json();
        setUserRsvp(d.status);
        fetchEventDetails();
        showToast(status === 'going' ? "You're Going!" : status === 'interested' ? "Marked as Interested!" : "RSVP removed");
        if (onEventUpdated) onEventUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleReminder = async () => {
    if (!token) {
      showToast('Please sign in to set reminders');
      return;
    }
    try {
      const res = await fetch(`/api/events/${eventId}/reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const d = await res.json();
        setHasReminder(d.hasReminder);
        showToast(d.hasReminder ? 'Reminder scheduled!' : 'Reminder cleared');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDiscussion.trim()) return;
    setSubmittingDiscussion(true);
    try {
      const res = await fetch(`/api/events/${eventId}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newDiscussion }),
      });
      if (res.ok) {
        setNewDiscussion('');
        fetchDiscussions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingDiscussion(false);
    }
  };

  const handleSendInvite = async () => {
    if (!token || !inviteeUsername) return;
    try {
      const sRes = await fetch(`/api/search?q=${encodeURIComponent(inviteeUsername)}&category=users`);
      const sData = await sRes.json();
      const target = (sData.users || [])[0];
      if (!target) {
        setInviteStatus('User not found');
        return;
      }

      const res = await fetch(`/api/events/${eventId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteeId: target.id }),
      });

      if (res.ok) {
        setInviteStatus('Invitation sent!');
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteStatus(null);
          setInviteeUsername('');
        }, 1500);
      } else {
        const d = await res.json();
        setInviteStatus(d.error || 'Invite failed');
      }
    } catch (e: any) {
      setInviteStatus(e.message || 'Error inviting');
    }
  };

  if (loading || !event) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="glass-card p-8 rounded-3xl text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Loading Event Experience...</p>
        </div>
      </div>
    );
  }

  const isOnline = event.eventType === 'online' || event.location.toLowerCase().startsWith('http');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Toast */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-cyan-500 text-slate-950 text-xs font-black shadow-xl flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Cover Image */}
        <div className="relative h-48 sm:h-64 w-full shrink-0">
          <img src={event.coverUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-black/30" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border border-white/10 transition-all cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Type Badge */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold flex items-center gap-1.5">
              {isOnline ? <Globe className="w-3.5 h-3.5 text-cyan-400" /> : <MapPin className="w-3.5 h-3.5 text-rose-400" />}
              {isOnline ? 'Online Event' : 'In-Person Event'}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-cyan-500/30 backdrop-blur-md text-cyan-300 border border-cyan-400/40 text-xs font-black">
              {event.category}
            </span>
          </div>

          {/* Event Header Info */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{event.title}</h1>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1 font-bold text-cyan-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(event.startTime).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>•</span>
                <span>Hosted by {event.creatorName}</span>
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRsvp(userRsvp === 'going' ? 'not_going' : 'going')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  userRsvp === 'going'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Going ({attendees.length})</span>
              </button>

              <button
                onClick={() => handleRsvp(userRsvp === 'interested' ? 'not_going' : 'interested')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  userRsvp === 'interested'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
                }`}
              >
                Interested ({interested.length})
              </button>

              <button
                onClick={handleToggleReminder}
                title="Toggle Event Reminder"
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  hasReminder
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/15 hover:text-white'
                }`}
              >
                {hasReminder ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowInviteModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 bg-slate-900/90 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'details' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Event Details & Attendees
            </button>
            <button
              onClick={() => setActiveTab('discussions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'discussions' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Discussion ({discussions.length})
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Date & Time</p>
                    <p className="text-xs font-black text-white mt-0.5">
                      {new Date(event.startTime).toLocaleString([], {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Location / Link</p>
                    {isOnline ? (
                      <a
                        href={event.location}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        Join Stream Meeting <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-xs font-black text-white mt-0.5">{event.location}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
                <h3 className="text-sm font-bold text-white">About this Event</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>

              {/* Confirmed Attendees */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Confirmed Attendees ({attendees.length})
                </h3>
                {attendees.length === 0 ? (
                  <p className="text-xs text-slate-500">No attendees confirmed yet. Be the first to join!</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {attendees.map((a) => (
                      <div key={a.id} className="p-2 rounded-xl glass-card border border-white/10 flex items-center gap-2">
                        <img src={a.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                        <span className="text-xs font-bold text-white truncate">{a.fullName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DISCUSSIONS */}
          {activeTab === 'discussions' && (
            <div className="space-y-4">
              {/* Post Discussion Input */}
              <form onSubmit={handleAddDiscussion} className="glass-card p-4 rounded-2xl border border-cyan-500/20 space-y-2">
                <p className="text-xs font-bold text-white">Coordinate & Chat with Attendees</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDiscussion}
                    onChange={(e) => setNewDiscussion(e.target.value)}
                    placeholder="Ask a question or share a ride note..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={submittingDiscussion || !newDiscussion.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50 hover:bg-cyan-400"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Discussion Thread */}
              <div className="space-y-3">
                {discussions.length === 0 ? (
                  <div className="text-center py-10 glass-card rounded-2xl border border-white/10">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold">No discussions yet.</p>
                  </div>
                ) : (
                  discussions.map((d) => (
                    <div key={d.id} className="p-3.5 rounded-2xl glass-card border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <img src={d.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                        <div>
                          <span className="text-xs font-bold text-white">{d.fullName}</span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 pl-9.5">{d.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invite Friends Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-cyan-400" /> Invite Friend to Event
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300">Username</label>
                <input
                  type="text"
                  value={inviteeUsername}
                  onChange={(e) => setInviteeUsername(e.target.value)}
                  placeholder="e.g. marcus_dev"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                {inviteStatus && (
                  <p className="text-[11px] text-cyan-300 font-bold mt-2">{inviteStatus}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={!inviteeUsername.trim()}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black cursor-pointer disabled:opacity-50 hover:bg-cyan-400"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
