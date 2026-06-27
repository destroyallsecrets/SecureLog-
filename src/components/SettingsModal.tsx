import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, ShieldAlert, Sparkles, RefreshCw, Moon, Sun, Keyboard, Trash2 } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClearAll: () => void;
  entriesCount: number;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAll,
  entriesCount,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const toggleTheme = () => {
    onUpdateSettings({
      ...settings,
      theme: settings.theme === 'light' ? 'dark' : 'light',
    });
  };

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onUpdateSettings({
      ...settings,
      capacityLimit: isNaN(val) ? 100 : val,
    });
  };

  const handleVoiceToggle = () => {
    onUpdateSettings({
      ...settings,
      useVoiceGuidance: !settings.useVoiceGuidance,
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({
      ...settings,
      voiceVolume: val,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className={`relative w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-2xl border ${
            settings.theme === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 mb-5 border-slate-200/50 dark:border-slate-800">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Logger Settings
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium block">Visual Theme</label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Switch between light and dark viewport
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition ${
                  settings.theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-amber-400'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-indigo-600'
                }`}
              >
                {settings.theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4" />
                    <span className="text-xs font-semibold">Sunlight Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" />
                    <span className="text-xs font-semibold">Night Gate Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Capacity Limit */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Gate Capacity Limit</label>
                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                  {settings.capacityLimit} Visitors
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={settings.capacityLimit}
                onChange={handleCapacityChange}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Triggers visual alarms when nearing or reaching target capacity.
              </span>
            </div>

            {/* Voice Guidance Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <label className="text-sm font-medium block">Audio Guidance (TTS)</label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Synthesize voice instructions at each step
                </span>
              </div>
              <button
                onClick={handleVoiceToggle}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-hidden ${
                  settings.useVoiceGuidance ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md ${
                    settings.useVoiceGuidance ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Voice Volume Control (Conditional) */}
            {settings.useVoiceGuidance && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800"
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    Guidance Volume
                  </span>
                  <span className="font-mono">{Math.round(settings.voiceVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.voiceVolume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </motion.div>
            )}

            {/* Keyboard Shortcuts Guide */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs space-y-2">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Keyboard className="w-4 h-4" />
                Physical Keyboard Shortcuts
              </span>
              <ul className="space-y-1 text-slate-500 dark:text-slate-400 font-mono">
                <li className="flex justify-between">
                  <span>[Spacebar]</span>
                  <span className="text-slate-700 dark:text-slate-300">Start / stop voice logger</span>
                </li>
                <li className="flex justify-between">
                  <span>[Escape]</span>
                  <span className="text-slate-700 dark:text-slate-300">Cancel active speaking sequence</span>
                </li>
              </ul>
            </div>

            {/* Safe Clear Data Section */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                <div className="grow">
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    Irreversible Action Area
                  </p>
                  <p className="text-[10px] text-rose-500/80 mb-2">
                    Clears all {entriesCount} locally logged visitor records from memory and local storage. Export a CSV first if needed.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you absolutely sure you want to clear all visitor log records? This cannot be undone.')) {
                        onClearAll();
                        onClose();
                      }
                    }}
                    disabled={entriesCount === 0}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe Local Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
