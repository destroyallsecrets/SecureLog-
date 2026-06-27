import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Settings,
  Download,
  Plus,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  AlertTriangle,
  Moon,
  Sun,
  BookOpen,
} from 'lucide-react';
import { VisitorRecord, AppSettings } from './types';
import VoiceWizard from './components/VoiceWizard';
import VisitorTable from './components/VisitorTable';
import SettingsModal from './components/SettingsModal';
import { speakText, playBeep } from './utils/audioHelper';

// Default mock records to populate on very first load so the dashboard is not completely blank (looks active and premium!)
const INITIAL_VISITOR_MOCKS: VisitorRecord[] = [
  {
    id: 'mock-1',
    name: 'Marcus Rashford',
    passType: 'Grey Card',
    affiliation: 'Player',
    timestamp: new Date(Date.now() - 3600000 * 2.4).toISOString(),
  },
  {
    id: 'mock-2',
    name: 'Rebecca Harrington',
    passType: 'QR Code',
    affiliation: 'Adidas Representative',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'mock-3',
    name: 'Darnell Johnson',
    passType: 'VIP Pass',
    affiliation: 'Coach Staff',
    timestamp: new Date(Date.now() - 3600000 * 0.8).toISOString(),
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  capacityLimit: 100,
  useVoiceGuidance: true,
  voiceVolume: 0.7,
  highContrastMode: false,
  theme: 'light',
};

export default function App() {
  const [entries, setEntries] = useState<VisitorRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Load state from local storage on mount
  useEffect(() => {
    try {
      const storedEntries = localStorage.getItem('vvl_entries');
      const storedSettings = localStorage.getItem('vvl_settings');

      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      } else {
        // First-time users get a couple of initial mock records so they see how the table operates immediately!
        setEntries(INITIAL_VISITOR_MOCKS);
      }

      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.error('Failed to load storage state:', e);
    }
    setIsFirstLoad(false);
  }, []);

  // Save to local storage whenever state changes
  useEffect(() => {
    if (isFirstLoad) return;
    try {
      localStorage.setItem('vvl_entries', JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save entries to storage:', e);
    }
  }, [entries, isFirstLoad]);

  useEffect(() => {
    if (isFirstLoad) return;
    try {
      localStorage.setItem('vvl_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to storage:', e);
    }
  }, [settings, isFirstLoad]);

  const handleSaveEntry = (draft: { name: string; passType: string; affiliation: string }) => {
    const newRecord: VisitorRecord = {
      id: `visitor-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: draft.name,
      passType: draft.passType,
      affiliation: draft.affiliation,
      timestamp: new Date().toISOString(),
    };

    setEntries(prev => [newRecord, ...prev]);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleUpdateEntry = (id: string, updated: Partial<VisitorRecord>) => {
    setEntries(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, ...updated } : entry))
    );
  };

  const handleImportEntries = (newEntries: Array<{ name: string; passType: string; affiliation: string }>) => {
    const recordsToAppend: VisitorRecord[] = newEntries.map((ne, idx) => ({
      id: `visitor-import-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      name: ne.name,
      passType: ne.passType,
      affiliation: ne.affiliation,
      timestamp: new Date(Date.now() - idx * 60000).toISOString(), // slightly staggered times
    }));

    setEntries(prev => [...recordsToAppend, ...prev]);
  };

  const handleClearAll = () => {
    setEntries([]);
  };

  // Export entries array into a downloadable standard CSV report
  const handleExportCSV = () => {
    if (entries.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Name,Pass Type,Affiliation,Timestamp (Local)\n';

    entries.forEach(r => {
      const date = new Date(r.timestamp);
      const formattedDate = date.toLocaleString().replace(/,/g, ''); // avoid breaking commas in columns
      
      // Escape commas or quotes in values
      const nameEscaped = r.name.replace(/"/g, '""');
      const passEscaped = r.passType.replace(/"/g, '""');
      const affiliationEscaped = r.affiliation.replace(/"/g, '""');

      csvContent += `"${nameEscaped}","${passEscaped}","${affiliationEscaped}","${formattedDate}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    
    // Stamp the download filename with today's date
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `gate_visitor_log_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick action to add a manual entry on demand (direct click trigger)
  const handleAddManualOnDemand = () => {
    if (entries.length >= settings.capacityLimit) return;
    
    const manualDraft = {
      name: 'New Attendee',
      passType: 'Standard Code',
      affiliation: 'Guest',
    };
    handleSaveEntry(manualDraft);
  };

  const isCapacityFull = entries.length >= settings.capacityLimit;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      settings.theme === 'dark' 
        ? 'dark bg-slate-950 text-slate-100' 
        : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Visual Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Voice Log Pro
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Hands-Free Visitor Gatekeeper
              </p>
            </div>
          </div>

          {/* Configuration toolbar */}
          <div className="flex items-center gap-3">
            
            {/* Quick volume control indicator */}
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  useVoiceGuidance: !settings.useVoiceGuidance,
                });
                speakText('Audio toggle', !settings.useVoiceGuidance, settings.voiceVolume);
              }}
              className={`p-2 rounded-xl border transition ${
                settings.useVoiceGuidance
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-400'
              }`}
              title={settings.useVoiceGuidance ? "Mute audio guidance" : "Unmute audio guidance"}
            >
              {settings.useVoiceGuidance ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Quick Theme Switcher */}
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  theme: settings.theme === 'light' ? 'dark' : 'light',
                });
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition"
              title="Toggle view color theme"
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-500 animate-spin-slow" />
              Settings
            </button>

          </div>

        </div>
      </header>

      {/* Main Layout Stage */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Split Sections: Instruction Banner + Voice sequence Wizard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Quick Manual Guidelines Left Side Panel */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              Gatekeeper Playbook
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Maintain full visual security with visitors while performing instant, automated dictations. Connect a Bluetooth microphone or headset for the complete hands-free experience.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-xs">
                  <p className="font-bold">Tap Microphone or [Spacebar]</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Launches the local voice dictation pipeline.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-xs">
                  <p className="font-bold">Follow Audio Guidance Prompts</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Speak visitor's name, their ticket type, and their affiliation clearly.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="text-xs">
                  <p className="font-bold">Auto-Saves to Log Report</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Records are loaded directly into the directory list below for download.</p>
                </div>
              </div>
            </div>

            {/* Quick manual entry bypass */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 dark:text-slate-500">Need manual override?</span>
              <button
                onClick={handleAddManualOnDemand}
                disabled={isCapacityFull}
                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-40 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg border border-indigo-500/20 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Quick Insert Row
              </button>
            </div>
          </div>

          {/* Large Voice sequence Wizard Panel */}
          <div className="lg:col-span-8">
            <VoiceWizard
              settings={settings}
              onSaveEntry={handleSaveEntry}
              isCapacityFull={isCapacityFull}
            />
          </div>

        </div>

        {/* Live Visitor Directory Section (Search, Filters, CSV upload and download) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Visitor Attendee Directory
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Manage, edit, or search previous entries. Drag-and-drop a CSV to import logs.
              </p>
            </div>
            
            {entries.length > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/15">
                Database Live • {entries.length} Records
              </span>
            )}
          </div>

          <VisitorTable
            entries={entries}
            onDeleteEntry={handleDeleteEntry}
            onUpdateEntry={handleUpdateEntry}
            onImportEntries={handleImportEntries}
            onExportCSV={handleExportCSV}
            capacityLimit={settings.capacityLimit}
          />
        </section>

      </main>

      {/* Settings Dialog Overlay Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onClearAll={handleClearAll}
        entriesCount={entries.length}
      />

    </div>
  );
}
