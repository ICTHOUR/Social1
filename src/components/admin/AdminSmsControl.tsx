import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  Terminal,
  Zap,
  Users,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface SmsSettings {
  gatewayId: string;
  name: string;
  isEnabled: boolean;
  isTestMode: boolean;
  senderId: string;
  apiUrl: string;
  rateLimitPerMinute: number;
  apiKeyMasked: string;
  updatedAt?: string;
}

export const AdminSmsControl: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'config' | 'broadcast' | 'templates' | 'audit'>('broadcast');

  // Config State
  const [settings, setSettings] = useState<SmsSettings | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testCustomMsg, setTestCustomMsg] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Campaign Broadcast State
  const [campaignTitle, setCampaignTitle] = useState('');
  const [audienceType, setAudienceType] = useState<
    'all_users' | 'active_users' | 'suspended_users' | 'specific_users' | 'group_members' | 'custom_numbers'
  >('all_users');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [customNumbersInput, setCustomNumbersInput] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  // Data Lists
  const [templates, setTemplates] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [groupsData, setGroupsData] = useState<{ communities: any[]; users: any[] }>({
    communities: [],
    users: [],
  });

  // Filtering & Pagination
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ id?: string; name: string; category: string; content: string }>({
    name: '',
    category: 'custom',
    content: '',
  });

  // -------------------------------------------------------------
  // FETCHING APIS
  // -------------------------------------------------------------
  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/sms/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
      console.error('Error fetching SMS settings:', e);
    }
  };

  const fetchBalance = async () => {
    if (!token) return;
    setIsCheckingBalance(true);
    try {
      const res = await fetch('/api/admin/sms/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (e) {
      console.error('Error fetching balance:', e);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/sms/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  };

  const fetchCampaigns = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/sms/campaigns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (e) {
      console.error('Error fetching campaigns:', e);
    }
  };

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const url = auditStatusFilter
        ? `/api/admin/sms/messages?status=${auditStatusFilter}`
        : '/api/admin/sms/messages';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setDeliveryLogs(data.deliveryLogs || []);
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  };

  const fetchGroups = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/sms/groups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroupsData(data);
      }
    } catch (e) {
      console.error('Error fetching targeting groups:', e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBalance();
    fetchTemplates();
    fetchCampaigns();
    fetchMessages();
    fetchGroups();
  }, [token]);

  useEffect(() => {
    fetchMessages();
  }, [auditStatusFilter]);

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !token) return;

    setIsLoading(true);
    setAlertMsg(null);

    try {
      const payload: any = {
        isEnabled: settings.isEnabled,
        isTestMode: settings.isTestMode,
        senderId: settings.senderId,
        apiUrl: settings.apiUrl,
        rateLimitPerMinute: settings.rateLimitPerMinute,
      };

      if (newApiKey.trim()) {
        payload.apiKey = newApiKey.trim();
      }

      const res = await fetch('/api/admin/sms/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setNewApiKey('');
        setAlertMsg({ type: 'success', text: 'Bulk SMS BD credentials saved & synced successfully!' });
        fetchBalance();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Server error saving settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim() || !token) return;

    setIsSendingTest(true);
    setAlertMsg(null);

    try {
      const res = await fetch('/api/admin/sms/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: testPhone.trim(),
          customMessage: testCustomMsg.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAlertMsg({ type: 'success', text: `Test SMS sent successfully to ${testPhone}!` });
        fetchMessages();
      } else {
        setAlertMsg({ type: 'error', text: data.error || data.result?.error || 'Test SMS failed' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Test SMS error' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setBroadcastMessage(tmpl.content);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim() || !broadcastMessage.trim() || !token) return;

    setIsCreatingCampaign(true);
    setAlertMsg(null);

    let filterJson: any = null;
    if (audienceType === 'specific_users') {
      filterJson = { userIds: selectedUserIds };
    } else if (audienceType === 'group_members') {
      filterJson = { communityId: selectedCommunityId };
    } else if (audienceType === 'custom_numbers') {
      const nums = customNumbersInput
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      filterJson = { phoneNumbers: nums };
    }

    try {
      const res = await fetch('/api/admin/sms/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: campaignTitle.trim(),
          audienceType,
          filterJson,
          templateId: selectedTemplateId || undefined,
          messageContent: broadcastMessage.trim(),
          scheduleAt: scheduleAt || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlertMsg({
          type: 'success',
          text: `Campaign "${campaignTitle}" created! Reaching ${data.totalRecipients} recipients.`,
        });
        setCampaignTitle('');
        setBroadcastMessage('');
        setScheduleAt('');
        fetchCampaigns();
        fetchMessages();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'Campaign creation failed' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Error triggering campaign' });
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate.name || !editingTemplate.content || !token) return;

    try {
      const res = await fetch('/api/admin/sms/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingTemplate),
      });

      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Template saved successfully!' });
        setIsTemplateModalOpen(false);
        setEditingTemplate({ name: '', category: 'custom', content: '' });
        fetchTemplates();
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Failed to save template' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!token || !confirm('Are you sure you want to delete this custom template?')) return;
    try {
      const res = await fetch(`/api/admin/sms/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Template deleted' });
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/sms/retry/${messageId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertMsg({ type: 'success', text: `Message retry successful!` });
        fetchMessages();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'Retry failed' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Retry error' });
    }
  };

  if (!settings) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        <span>Loading Bulk SMS BD Engine...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/20 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">Bulk SMS BD Engine</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  settings.isEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {settings.isEnabled ? 'Active Engine' : 'Disabled'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  settings.isTestMode
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {settings.isTestMode ? 'Test / Sandbox Mode' : 'Live Production'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Official BulkSMSBD API Gateway • Single SMS, Campaign Broadcast, OTP & Transactional Audits
            </p>
          </div>
        </div>

        {/* Balance Badge & Test Action */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-xs">
            <span className="text-slate-400">SMS Balance:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {isCheckingBalance ? '...' : balance?.balance !== undefined ? `${balance.balance} Credits` : 'N/A'}
            </span>
            <button
              onClick={fetchBalance}
              disabled={isCheckingBalance}
              title="Refresh Balance"
              className="text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {alertMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
            alertMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          {alertMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'broadcast'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" /> SMS Campaign & Broadcast
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> SMS Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" /> Audit Log & Delivery Status
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'config'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" /> Provider Settings & Test SMS
        </button>
      </div>

      {/* TAB 1: CAMPAIGN BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Form */}
          <form
            onSubmit={handleCreateCampaign}
            className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" /> Create SMS Campaign Broadcast
              </h3>
              <span className="text-[11px] text-slate-400">Supports Bangladeshi 13-Digit MSISDN</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Campaign Title</label>
              <input
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. Eid Discount Announcement or Security Policy Update"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Target Audience Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Target Audience Filter</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { id: 'all_users', label: 'All Users', desc: 'Every registered user' },
                  { id: 'active_users', label: 'Active Users', desc: 'Non-suspended members' },
                  { id: 'suspended_users', label: 'Suspended Users', desc: 'Accounts under ban' },
                  { id: 'specific_users', label: 'Specific Users', desc: 'Pick individual users' },
                  { id: 'group_members', label: 'Group Members', desc: 'Community group' },
                  { id: 'custom_numbers', label: 'Custom Phone Numbers', desc: 'Manual numbers input' },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setAudienceType(aud.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      audienceType === aud.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{aud.label}</div>
                    <div className="text-[10px] opacity-70">{aud.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Audience Options */}
            {audienceType === 'specific_users' && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-300">Select Users ({selectedUserIds.length} chosen)</label>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                  {groupsData.users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:bg-slate-900 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUserIds([...selectedUserIds, u.id]);
                          else setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500"
                      />
                      <span className="font-medium text-white">{u.full_name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">({u.phone})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {audienceType === 'group_members' && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-300">Select Community Group</label>
                <select
                  value={selectedCommunityId}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Group --</option>
                  {groupsData.communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.member_count} Members)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audienceType === 'custom_numbers' && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-300">Custom Phone Numbers (Comma or Newline separated)</label>
                <textarea
                  value={customNumbersInput}
                  onChange={(e) => setCustomNumbersInput(e.target.value)}
                  placeholder="8801700000000, 8801800000000, 01900000000"
                  className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Template Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Pre-fill Message From Template</label>
                <span className="text-[10px] text-slate-400">Optional</span>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Custom Message (No Template) --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.category.toUpperCase()}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Content */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">SMS Message Content</label>
                <span className="text-[10px] text-slate-400">
                  {broadcastMessage.length} chars (
                  {Math.ceil(broadcastMessage.length / (/[^\x00-\x7F]/.test(broadcastMessage) ? 70 : 160))} SMS unit)
                </span>
              </div>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your SMS broadcast content here. You can use placeholders like {user_name} and {app_name}."
                className="w-full h-28 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-[10px] text-slate-500">
                Available Placeholders: <code className="text-blue-400">{'{user_name}'}</code>,{' '}
                <code className="text-blue-400">{'{app_name}'}</code>
              </p>
            </div>

            {/* Schedule Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Execution Schedule (Leave empty to send now)</label>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingCampaign}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isCreatingCampaign ? 'Triggering Campaign...' : 'Launch SMS Campaign Broadcast'}
            </button>
          </form>

          {/* Campaign History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Recent Campaign History
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {campaigns.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No SMS campaigns launched yet.</p>
              ) : (
                campaigns.map((c) => (
                  <div key={c.id} className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-white">{c.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : c.status === 'processing'
                            ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">{c.message_content}</p>

                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/60 text-[10px] font-mono text-center">
                      <div className="bg-slate-900 p-1 rounded">
                        <span className="text-slate-500 block">Total</span>
                        <span className="text-white font-bold">{c.total_recipients}</span>
                      </div>
                      <div className="bg-slate-900 p-1 rounded">
                        <span className="text-slate-500 block">Sent</span>
                        <span className="text-emerald-400 font-bold">{c.sent_count}</span>
                      </div>
                      <div className="bg-slate-900 p-1 rounded">
                        <span className="text-slate-500 block">Failed</span>
                        <span className="text-red-400 font-bold">{c.failed_count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMS TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Reusable SMS Message Templates
            </h3>
            <button
              onClick={() => {
                setEditingTemplate({ name: '', category: 'custom', content: '' });
                setIsTemplateModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Custom Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-blue-400 text-[10px] font-bold rounded-full uppercase">
                    {tmpl.category}
                  </span>
                  {tmpl.isSystem ? (
                    <span className="text-[10px] text-slate-500 font-semibold">System Default</span>
                  ) : (
                    <button
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h4 className="text-xs font-bold text-white">{tmpl.name}</h4>
                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono leading-relaxed">
                  {tmpl.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOG & DELIVERY STATUS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> Audited SMS Dispatch & Delivery History
            </h3>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={fetchMessages}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Message</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Provider Tx ID</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        No SMS audit logs matching current filter.
                      </td>
                    </tr>
                  ) : (
                    messages.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/50">
                        <td className="p-3 font-mono text-[11px] text-slate-400">{m.created_at}</td>
                        <td className="p-3 font-bold text-white">
                          {m.phone_number}
                          {m.user_name && <span className="block text-[10px] text-slate-400">{m.user_name}</span>}
                        </td>
                        <td className="p-3 uppercase text-[10px] font-bold text-blue-400">{m.sms_type}</td>
                        <td className="p-3 max-w-xs truncate text-slate-300" title={m.message}>
                          {m.message}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.status === 'delivered' || m.status === 'sent'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : m.status === 'failed' || m.status === 'rejected'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-cyan-300 text-[11px]">{m.provider_msg_id || 'N/A'}</td>
                        <td className="p-3">
                          {(m.status === 'failed' || m.status === 'rejected') && (
                            <button
                              onClick={() => handleRetryMessage(m.id)}
                              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROVIDER SETTINGS & TEST SMS */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" /> Bulk SMS BD API Credentials
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Enabled toggle */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Gateway Active Status</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, isEnabled: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      settings.isEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, isEnabled: false })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !settings.isEnabled ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {/* Test Mode toggle */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Environment Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, isTestMode: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      settings.isTestMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Test / Sandbox Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, isTestMode: false })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !settings.isTestMode ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Live Production
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">
                  BulkSMSBD API Key {settings.apiKeyMasked && <span className="text-emerald-400">(Saved)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder={settings.apiKeyMasked ? 'Leave empty to keep saved API Key' : 'Enter API Key'}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sender ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Sender ID (Approved Masking)</label>
                <input
                  type="text"
                  value={settings.senderId}
                  onChange={(e) => setSettings({ ...settings, senderId: e.target.value })}
                  placeholder="e.g. NixoBD or 8801700000000"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Rate Limit */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Rate Limit (SMS / Minute)</label>
                <input
                  type="number"
                  value={settings.rateLimitPerMinute}
                  onChange={(e) => setSettings({ ...settings, rateLimitPerMinute: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* API Endpoint URL */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">API Endpoint URL</label>
                <input
                  type="text"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Credentials & Update Config'}
              </button>
            </div>
          </form>

          {/* Test SMS Function Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Admin "Test SMS" Function</h3>
                <p className="text-xs text-slate-400">Verify SMS delivery to a real phone number</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Recipient Phone Number</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="01700000000 or 8801700000000"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Custom Test Message (Optional)</label>
              <textarea
                value={testCustomMsg}
                onChange={(e) => setTestCustomMsg(e.target.value)}
                placeholder="Leave blank for default system ping message"
                className="w-full h-20 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={isSendingTest || !testPhone.trim()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isSendingTest ? 'Dispatching Test SMS...' : 'Send Test SMS'}
            </button>
          </div>
        </div>
      )}

      {/* Modal for Creating Template */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-white">Create Custom SMS Template</h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Template Name</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                placeholder="e.g. Weekly Digest SMS"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Category</label>
              <select
                value={editingTemplate.category}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="otp">OTP Code</option>
                <option value="welcome">Welcome</option>
                <option value="transactional">Transactional</option>
                <option value="announcement">Announcement</option>
                <option value="alert">Alert</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Template Content</label>
              <textarea
                value={editingTemplate.content}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                placeholder="Type template text. Use {user_name} or {app_name} as placeholders."
                className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
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
