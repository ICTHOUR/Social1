import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  Filter,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Edit3,
  Plus,
  BarChart3,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Shield,
  Eye,
  X,
  Sparkles,
  Zap,
  Check,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  NotificationCampaign,
  NotificationCampaignLog,
  NotificationTemplate,
  CampaignTargetType,
  CampaignTargetFilter,
} from '../../types';

interface NotificationStats {
  totalSent: number;
  totalCampaigns: number;
  activeCampaigns: number;
  deliveredQueueCount: number;
  readQueueCount: number;
  failedQueueCount: number;
  templatesCount: number;
}

export const AdminNotificationCenter: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'campaigns' | 'templates' | 'analytics'>('create');

  // Stats & Lists
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Campaign & Logs Modal
  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaign | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<NotificationCampaignLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form State for Creating Campaign
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [targetType, setTargetType] = useState<CampaignTargetType>('all');
  const [targetFilter, setTargetFilter] = useState<CampaignTargetFilter>('active');
  const [targetId, setTargetId] = useState('');
  const [customUserIds, setCustomUserIds] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const [formSending, setFormSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [tmplName, setTmplName] = useState('');
  const [tmplCategory, setTmplCategory] = useState('general');
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplMessage, setTmplMessage] = useState('');
  const [tmplImageUrl, setTmplImageUrl] = useState('');
  const [tmplDeepLink, setTmplDeepLink] = useState('');
  const [tmplPriority, setTmplPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Fetch Stats
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/notification-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notification-campaigns?search=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/notification-templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCampaigns();
    fetchTemplates();
  }, [token]);

  // Periodic Refresh for active campaign status updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'campaigns' || activeTab === 'analytics') {
        fetchCampaigns();
        fetchStats();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, token]);

  // Handle Campaign Submit
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setFormError('');
    setFormSuccess('');

    if (!title.trim() || !message.trim()) {
      setFormError('Please enter a notification title and body message');
      return;
    }

    setFormSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        deepLink: deepLink.trim() || undefined,
        priority,
        targetType,
        targetFilter: targetType === 'filtered' ? targetFilter : undefined,
        targetId: targetId.trim() || undefined,
        customUserIds: customUserIds.trim() || undefined,
        scheduledAt: scheduledAt || undefined,
        expiresAt: expiresAt || undefined,
        saveAsTemplate,
        templateName: templateName.trim() || undefined,
      };

      const res = await fetch('/api/admin/notification-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch notification campaign');
      }

      setFormSuccess(`🎉 Notification campaign dispatched successfully to ${data.campaign.totalRecipients} target recipient(s)!`);
      
      // Reset form
      setTitle('');
      setMessage('');
      setImageUrl('');
      setDeepLink('');
      setPriority('normal');
      setTargetType('all');
      setTargetId('');
      setCustomUserIds('');
      setScheduledAt('');
      setExpiresAt('');
      setSaveAsTemplate(false);
      setTemplateName('');

      fetchStats();
      fetchCampaigns();
      fetchTemplates();

      // Switch to campaigns tab after brief moment
      setTimeout(() => {
        setActiveTab('campaigns');
        setFormSuccess('');
      }, 2000);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while creating campaign');
    } finally {
      setFormSending(false);
    }
  };

  // View Delivery Logs
  const handleViewLogs = async (campaign: NotificationCampaign) => {
    setSelectedCampaign(campaign);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/notification-campaigns/${campaign.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaignLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Cancel Campaign
  const handleCancelCampaign = async (campaignId: string) => {
    if (!token || !window.confirm('Are you sure you want to cancel this notification campaign?')) return;
    try {
      const res = await fetch(`/api/admin/notification-campaigns/${campaignId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCampaigns();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!token || !window.confirm('Delete this campaign and all its history?')) return;
    try {
      const res = await fetch(`/api/admin/notification-campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCampaigns();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Apply Template
  const handleApplyTemplate = (tmpl: NotificationTemplate) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setImageUrl(tmpl.imageUrl || '');
    setDeepLink(tmpl.deepLink || '');
    setPriority(tmpl.priority || 'normal');
    setActiveTab('create');
  };

  // Template Modal Save
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tmplName || !tmplTitle || !tmplMessage) return;

    try {
      const payload = {
        name: tmplName.trim(),
        category: tmplCategory,
        title: tmplTitle.trim(),
        message: tmplMessage.trim(),
        imageUrl: tmplImageUrl.trim() || undefined,
        deepLink: tmplDeepLink.trim() || undefined,
        priority: tmplPriority,
      };

      const url = editingTemplate
        ? `/api/admin/notification-templates/${editingTemplate.id}`
        : '/api/admin/notification-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
        fetchTemplates();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (tmplId: string) => {
    if (!token || !window.confirm('Delete this notification template?')) return;
    try {
      const res = await fetch(`/api/admin/notification-templates/${tmplId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTemplates();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-4 h-4" /> Real-Time Transmission Hub
          </div>
          <h2 className="text-2xl font-black text-white">Admin Notification Center</h2>
          <p className="text-xs text-slate-400">
            Dispatch announcements, system alerts, custom target broadcasts, and automated batch campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              fetchCampaigns();
              fetchTemplates();
            }}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Dispatch New
          </button>
        </div>
      </div>

      {/* Analytics Summary Banner */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Delivered</span>
              <Bell className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats.totalSent.toLocaleString()}</p>
            <p className="text-[10px] text-cyan-400/80">Socket & In-App Transmissions</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active Campaigns</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">{stats.activeCampaigns}</p>
            <p className="text-[10px] text-slate-400">In Batch Processing Queue</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Queue Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">
              {stats.deliveredQueueCount + stats.failedQueueCount > 0
                ? `${Math.round(
                    (stats.deliveredQueueCount / (stats.deliveredQueueCount + stats.failedQueueCount)) * 100
                  )}%`
                : '100%'}
            </p>
            <p className="text-[10px] text-slate-400">{stats.deliveredQueueCount} delivered in queue</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Templates</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-purple-400">{stats.templatesCount}</p>
            <p className="text-[10px] text-slate-400">Reusable Presets</p>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'create', label: 'Create Campaign', icon: Send },
          { id: 'campaigns', label: `Campaigns & Queue (${campaigns.length})`, icon: Layers },
          { id: 'templates', label: `Templates (${templates.length})`, icon: FileText },
          { id: 'analytics', label: 'Delivery Analytics', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CREATE CAMPAIGN FORM */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <form onSubmit={handleCreateCampaign} className="lg:col-span-7 space-y-5 bg-slate-900/40 p-6 rounded-3xl border border-white/10">
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Target Audience Filter Group */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-cyan-400" /> Target Audience & Criteria
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Users', desc: 'Global Broadcast' },
                  { id: 'filtered', label: 'Filtered Users', desc: 'Segmented Criteria' },
                  { id: 'group', label: 'Group Members', desc: 'Specific Group' },
                  { id: 'individual', label: 'Single User', desc: 'Direct Message' },
                  { id: 'bulk', label: 'Custom List', desc: 'Selected User IDs' },
                ].map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setTargetType(type.id as CampaignTargetType)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      targetType === type.id
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                        : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{type.label}</p>
                    <p className="text-[10px] text-slate-400">{type.desc}</p>
                  </button>
                ))}
              </div>

              {/* Sub-filters for 'filtered' */}
              {targetType === 'filtered' && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <label className="text-xs font-medium text-slate-400">Select Filter Segment:</label>
                  <select
                    value={targetFilter}
                    onChange={(e) => setTargetFilter(e.target.value as CampaignTargetFilter)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="active">Active Users Only (status = active)</option>
                    <option value="inactive">Suspended / Inactive Users</option>
                    <option value="verified">Verified Badge Creators (is_verified = 1)</option>
                    <option value="new_users">New Users (Joined in last 30 days)</option>
                    <option value="creators">Verified Creators (role = creator)</option>
                    <option value="coin_users">Coin Holders (coins_balance &gt; 0)</option>
                  </select>
                </div>
              )}

              {/* Input for Group or Page targetId */}
              {targetType === 'group' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Target Group ID:</label>
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="e.g. grp_123456789"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Input for Custom User IDs */}
              {(targetType === 'individual' || targetType === 'bulk') && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">
                    {targetType === 'individual' ? 'Target User ID:' : 'User IDs (comma separated):'}
                  </label>
                  <textarea
                    rows={2}
                    value={customUserIds}
                    onChange={(e) => setCustomUserIds(e.target.value)}
                    placeholder={targetType === 'individual' ? 'user_admin' : 'user_marcus, user_elena, user_sophia'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500 custom-scrollbar"
                  />
                </div>
              )}
            </div>

            {/* Notification Title & Body */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Bell className="w-3.5 h-3.5 text-cyan-400" /> Transmission Details
              </label>

              <div className="space-y-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification Headline / Title (e.g. 🎉 Flash Coin Bonus Today!)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-cyan-500 placeholder:font-normal"
                />
              </div>

              <div className="space-y-1">
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Main announcement message body..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-cyan-500 custom-scrollbar"
                />
              </div>
            </div>

            {/* Rich Attributes: Priority, Image, Deep Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Priority Level:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="low">Low (Silent)</option>
                  <option value="normal">Normal (Standard)</option>
                  <option value="high">High (Featured Alert)</option>
                  <option value="urgent">Urgent (Bypasses Non-Essential Caps)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Deep Link Route:</label>
                <input
                  type="text"
                  value={deepLink}
                  onChange={(e) => setDeepLink(e.target.value)}
                  placeholder="e.g. /wallet, /posts/123, /explore"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-400">Banner Image URL (Optional):</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Scheduling & Expiration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Schedule Delivery (Optional):</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Expiration Time (Optional):</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Save as Preset Template */}
            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-500 focus:ring-cyan-500"
                />
                Save settings as reusable Preset Template
              </label>

              {saveAsTemplate && (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template Preset Name"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={formSending}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {formSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Batch Queueing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Dispatch Transmission Campaign
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live Mobile / In-App Notification Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" /> Live In-App Preview
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {priority.toUpperCase()} PRIORITY
                </span>
              </div>

              {/* Glass Notification Card Mockup */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-white space-y-3 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Shield className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-bold text-white leading-snug">
                      {title.trim() || 'Notification Headline Preview'}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {message.trim() || 'This is how your live broadcast announcement will appear on user feeds and drawer notifications...'}
                    </p>
                  </div>
                </div>

                {imageUrl.trim() && (
                  <div className="rounded-xl overflow-hidden border border-white/10 max-h-36">
                    <img src={imageUrl.trim()} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/5">
                  <span>Target: {targetType.toUpperCase()}</span>
                  <span className="text-cyan-400 font-semibold">{deepLink || 'In-App Link'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 text-[11px] text-slate-400 space-y-1.5">
                <p className="font-bold text-slate-200">🛡️ Safe Batch Queue Engine:</p>
                <p>
                  This campaign will be processed asynchronously in background chunks of 50-100 items per 3 seconds. It will not block Express request threads or overload Socket connections.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS LIST & QUEUE AUDIT */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={fetchCampaigns}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh List
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-white/10 text-slate-400 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">No notification campaigns dispatched yet</p>
              </div>
            ) : (
              campaigns.map((c) => {
                const progressPct = c.totalRecipients > 0 ? Math.round((c.sentCount / c.totalRecipients) * 100) : 100;
                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-3xl bg-slate-900/40 border border-white/10 hover:border-white/20 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{c.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              c.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : c.status === 'processing' || c.status === 'queued'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{c.message}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleViewLogs(c)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Recipient Logs
                        </button>

                        {['queued', 'processing'].includes(c.status) && (
                          <button
                            onClick={() => handleCancelCampaign(c.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteCampaign(c.id)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Stat Badges */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Target: <strong className="text-white">{c.targetType}</strong>
                        </span>
                        <span>
                          Progress: <strong className="text-cyan-400">{c.sentCount}</strong> / {c.totalRecipients} ({progressPct}%)
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                        <span className="text-emerald-400">Delivered: {c.deliveredCount}</span>
                        <span className="text-cyan-400">Read: {c.readCount}</span>
                        <span className="text-rose-400">Failed: {c.failedCount}</span>
                        <span className="ml-auto">Dispatched: {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES CATALOG */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reusable Presets Catalog</h3>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTmplName('');
                setTmplCategory('general');
                setTmplTitle('');
                setTmplMessage('');
                setTmplImageUrl('');
                setTmplDeepLink('');
                setTmplPriority('normal');
                setIsTemplateModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 rounded-3xl bg-slate-900/40 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase">
                      {tmpl.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{new Date(tmpl.createdAt).toLocaleDateString()}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{tmpl.name}</h4>
                  <p className="text-xs text-slate-300 font-semibold">{tmpl.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{tmpl.message}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    Use Template <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY ANALYTICS */}
      {activeTab === 'analytics' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Queue Efficiency</span>
              <p className="text-3xl font-black text-cyan-400">{stats.deliveredQueueCount}</p>
              <p className="text-xs text-slate-400">Total batch queue delivery tasks completed successfully.</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Audited Read Count</span>
              <p className="text-3xl font-black text-emerald-400">{stats.readQueueCount}</p>
              <p className="text-xs text-slate-400">Confirmed open/read user interactions.</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Filtered / Muted</span>
              <p className="text-3xl font-black text-amber-400">{stats.failedQueueCount}</p>
              <p className="text-xs text-slate-400">Opted-out by user notification settings or anti-spam cap.</p>
            </div>
          </div>
        </div>
      )}

      {/* RECIPIENT LOGS MODAL */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Campaign Delivery Logs</h3>
                <p className="text-xs text-slate-400">{selectedCampaign.title}</p>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {loadingLogs ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading queue log entries...</div>
              ) : campaignLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No delivery log entries recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {campaignLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            log.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                          }
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <p className="font-bold text-white">{log.fullName}</p>
                          <p className="text-[10px] text-slate-400">@{log.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.status === 'delivered' || log.status === 'read'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.errorMessage && (
                            <p className="text-[10px] text-rose-400 max-w-xs truncate">{log.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW/EDIT TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingTemplate ? 'Edit Preset Template' : 'New Preset Template'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400">Template Name:</label>
                <input
                  type="text"
                  required
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  placeholder="e.g. Creator Welcome"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Headline Title:</label>
                <input
                  type="text"
                  required
                  value={tmplTitle}
                  onChange={(e) => setTmplTitle(e.target.value)}
                  placeholder="Notification Headline"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Message Text:</label>
                <textarea
                  rows={3}
                  required
                  value={tmplMessage}
                  onChange={(e) => setTmplMessage(e.target.value)}
                  placeholder="Message body..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500 custom-scrollbar"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-sm"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
