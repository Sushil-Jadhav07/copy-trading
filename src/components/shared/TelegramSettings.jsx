import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Copy, CheckCircle2, RefreshCw, AlertCircle, Unlink, Bell, Send } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import { telegramService } from '@/lib/telegram';
import { useToast } from '@/components/shared/Toast';

const PREF_LABELS = {
  tradeAlerts: { label: 'Trade Alerts', desc: 'Get notified on every copy trade (success, failure, skipped)' },
  riskAlerts: { label: 'Risk Alerts', desc: 'Margin blocked, risk limit warnings' },
  dailySummary: { label: 'Daily Summary', desc: 'End-of-day P&L and trade count recap' },
  systemAlerts: { label: 'System Alerts', desc: 'Engine status, maintenance, downtime notices' },
  alertOnSuccess: { label: 'Alert on Success', desc: 'Notify when a trade is copied successfully' },
  alertOnFailure: { label: 'Alert on Failure', desc: 'Notify on trade failures' },
  alertOnSkipped: { label: 'Alert on Skipped', desc: 'Notify when a trade is skipped (e.g. market closed, no position)' },
};

const TelegramSettings = () => {
  const { addToast } = useToast();
  const [status, setStatus] = useState({ linked: false, chatId: null, preferences: {} });
  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prefs, setPrefs] = useState({});
  const [polling, setPolling] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await telegramService.getStatus();
      setStatus(data);
      setPrefs(data.preferences || {});
    } catch (e) {
      // Silently fail — not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Poll for link status when a link token is active
  useEffect(() => {
    if (!linkData || status.linked) return;
    const interval = setInterval(async () => {
      try {
        const s = await telegramService.getStatus();
        if (s.linked) {
          setStatus(s);
          setPrefs(s.preferences || {});
          setLinkData(null);
          setPolling(false);
          addToast('Telegram linked successfully!', 'success');
          clearInterval(interval);
        }
      } catch {}
    }, 4000);
    setPolling(true);
    return () => { clearInterval(interval); setPolling(false); };
  }, [linkData, status.linked, addToast]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await telegramService.generateLinkToken();
      setLinkData(data);
    } catch (e) {
      addToast(e.message || 'Failed to generate link token', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCommand = () => {
    const cmd = `/link ${linkData?.code}`;
    navigator.clipboard?.writeText(cmd).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      await telegramService.updatePreferences(prefs);
      addToast('Preferences saved', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await telegramService.sendTest();
      addToast('Test message sent! Check your Telegram.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to send test message', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink your Telegram account?')) return;
    setUnlinking(true);
    try {
      await telegramService.unlink();
      setStatus({ linked: false, chatId: null, preferences: {} });
      setPrefs({});
      setLinkData(null);
      addToast('Telegram unlinked', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to unlink Telegram', 'error');
    } finally {
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-black/10 dark:bg-white/10" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-1/3" />
            <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <GlassCard>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              status.linked ? 'bg-sky-500/10 text-sky-500' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}>
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black">Telegram Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status.linked
                  ? `Linked · Chat ID: ${status.chatId || '—'}`
                  : 'Not linked — connect to receive trade alerts'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.linked && (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Linked
                </span>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  {testing ? 'Sending...' : 'Test'}
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-rose-500 text-xs font-bold hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  <Unlink className="w-3 h-3" />
                  {unlinking ? 'Unlinking...' : 'Unlink'}
                </button>
              </>
            )}
            {!status.linked && !linkData && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-black uppercase tracking-wider hover:bg-sky-500/90 transition-colors disabled:opacity-50"
              >
                {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                {generating ? 'Generating...' : 'Connect Telegram'}
              </button>
            )}
          </div>
        </div>

        {/* Link Flow */}
        {!status.linked && linkData && (
          <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-sky-600 dark:text-sky-400">Link your Telegram account</p>
                <p className="text-xs text-muted-foreground mt-1">{linkData.instruction}</p>
              </div>
            </div>

            {/* Command to copy */}
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-xl border border-border/40 px-4 py-2.5">
              <code className="flex-1 text-sm font-mono font-bold text-foreground">
                /link {linkData.code}
              </code>
              <button
                onClick={handleCopyCommand}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-bold transition-colors ${
                  copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Open Telegram → search <strong>@{linkData.botUsername}</strong> → send the command
              </span>
              {polling && (
                <span className="flex items-center gap-1.5 text-sky-500 font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Waiting for link…
                </span>
              )}
            </div>

            {linkData.expiresAt && (
              <p className="text-[10px] text-muted-foreground">
                Code expires: {new Date(linkData.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}
      </GlassCard>

      {/* Preferences — only if linked */}
      {status.linked && (
        <GlassCard>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-brand-purple" />
              </div>
              <div>
                <p className="text-sm font-black">Alert Preferences</p>
                <p className="text-xs text-muted-foreground">Choose what you want to be notified about</p>
              </div>
            </div>
            <button
              onClick={handleSavePrefs}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-black uppercase tracking-wider hover:bg-brand-purple/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="space-y-3">
            {Object.entries(PREF_LABELS).map(([key, { label, desc }]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-black/3 dark:bg-white/3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(prefs[key])}
                  onChange={() => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))}
                  showStateText
                />
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default TelegramSettings;
