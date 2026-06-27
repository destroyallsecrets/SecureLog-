import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Download,
  Upload,
  UserCheck,
  Calendar,
  AlertCircle,
  TrendingUp,
  SlidersHorizontal,
  X,
  Check,
  FileCheck2,
} from 'lucide-react';
import { VisitorRecord } from '../types';

interface VisitorTableProps {
  entries: VisitorRecord[];
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, updated: Partial<VisitorRecord>) => void;
  onImportEntries: (newEntries: Array<{ name: string; passType: string; affiliation: string }>) => void;
  onExportCSV: () => void;
  capacityLimit: number;
}

export default function VisitorTable({
  entries,
  onDeleteEntry,
  onUpdateEntry,
  onImportEntries,
  onExportCSV,
  capacityLimit,
}: VisitorTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [passFilter, setPassFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'timestamp' | 'name'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Drag and Drop state for CSV upload
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Row Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', passType: '', affiliation: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive unique Pass Types for filter dropdown
  const passTypes = ['ALL', ...Array.from(new Set(entries.map(e => e.passType.toUpperCase())))];

  // Filter and sort entries
  const processedEntries = entries
    .filter(entry => {
      const matchSearch =
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.passType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.affiliation.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchPass = passFilter === 'ALL' || entry.passType.toUpperCase() === passFilter;
      
      return matchSearch && matchPass;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Capacity calculations
  const capacityPercent = Math.min((entries.length / capacityLimit) * 100, 100);
  const isNearingCapacity = entries.length >= capacityLimit * 0.8 && entries.length < capacityLimit;
  const isAtCapacity = entries.length >= capacityLimit;

  // CSV Parsing
  const handleCSVTextParse = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length === 0) throw new Error('CSV is empty');

      // Detect if we have header
      const headerIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
      const parsedRecords: Array<{ name: string; passType: string; affiliation: string }> = [];

      for (let i = headerIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Comma separation, account for quotes
        const cols = line.split(',').map(col => {
          let c = col.trim();
          if (c.startsWith('"') && c.endsWith('"')) {
            c = c.slice(1, -1);
          }
          return c;
        });

        if (cols.length >= 3) {
          parsedRecords.push({
            name: cols[0] || 'Unknown',
            passType: cols[1] || 'QR',
            affiliation: cols[2] || 'General',
          });
        }
      }

      if (parsedRecords.length === 0) {
        throw new Error('No valid visitor records found in CSV file.');
      }

      onImportEntries(parsedRecords);
      setImportStatus({
        type: 'success',
        text: `Successfully imported ${parsedRecords.length} visitor records!`,
      });
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: err.message || 'Failed to parse CSV.',
      });
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleCSVTextParse(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    } else {
      setImportStatus({
        type: 'error',
        text: 'Only standard .csv files are supported for import.',
      });
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleCSVTextParse(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  // Editing controls
  const startEditing = (record: VisitorRecord) => {
    setEditingId(record.id);
    setEditForm({
      name: record.name,
      passType: record.passType,
      affiliation: record.affiliation,
    });
  };

  const saveEditing = (id: string) => {
    onUpdateEntry(id, {
      name: editForm.name.trim() || 'Unknown',
      passType: editForm.passType.trim() || 'Standard',
      affiliation: editForm.affiliation.trim() || 'General',
    });
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Capacity & Statistics Banner */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-xs flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="space-y-1.5 grow w-full">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Live Gate Counter
            </span>
            <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
              {entries.length} / {capacityLimit} Checked In
            </span>
          </div>
          
          {/* Capacity Progress Bar */}
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isAtCapacity
                  ? 'bg-rose-500'
                  : isNearingCapacity
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Capacity Utilization: <b>{Math.round(capacityPercent)}%</b></span>
            {isAtCapacity ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold ml-2 flex items-center gap-0.5 animate-pulse">
                <AlertCircle className="w-3 h-3" /> FULL CAPACITY REACHED
              </span>
            ) : isNearingCapacity ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2">
                NEARING CAPACITY WARNING
              </span>
            ) : null}
          </div>
        </div>

        {/* Big Action Buttons */}
        <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Import CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleManualFileSelect}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={onExportCSV}
            disabled={entries.length === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            Download CSV Report
          </button>
        </div>
      </div>

      {/* CSV Drag and Drop Zone Container */}
      <AnimatePresence>
        {(isDragging || importStatus) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/[0.04]'
                  : importStatus?.type === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/[0.02]'
                    : 'border-rose-500/50 bg-rose-500/[0.02]'
              }`}
            >
              {importStatus ? (
                <div className="space-y-1.5">
                  <div className="flex justify-center">
                    {importStatus.type === 'success' ? (
                      <FileCheck2 className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-rose-500" />
                    )}
                  </div>
                  <p className={`text-sm font-semibold ${
                    importStatus.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {importStatus.text}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Will close automatically in a moment...
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Drop your CSV file here!
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Accepts standard spreadsheets with Name, Pass Type, and Affiliation columns.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid Filters & Table Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        
        {/* Table Filters & Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, pass, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Pass:</span>
              <select
                value={passFilter}
                onChange={(e) => setPassFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                {passTypes.map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Sort:</span>
              <button
                onClick={() => {
                  if (sortField === 'timestamp') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField('timestamp');
                    setSortOrder('desc');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  sortField === 'timestamp'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Time {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              
              <button
                onClick={() => {
                  if (sortField === 'name') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField('name');
                    setSortOrder('asc');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  sortField === 'name'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>

          </div>

        </div>

        {/* Drag and Drop Hover overlay */}
        <div
          onDragOver={handleDragOver}
          className="relative"
        >
          {isDragging && (
            <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-xs z-20 flex items-center justify-center pointer-events-none border-2 border-emerald-500 border-dashed m-1.5 rounded-xl">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-lg border border-emerald-500/30 text-center">
                <Upload className="w-8 h-8 text-emerald-500 mx-auto animate-bounce mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Drop CSV file to import
                </span>
              </div>
            </div>
          )}

          {/* Responsive table element */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/30 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Visitor Identity</th>
                  <th className="py-3 px-4">Pass Credentials</th>
                  <th className="py-3 px-4">Corporate/Affiliation</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {processedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="space-y-1.5">
                        <Calendar className="w-8 h-8 mx-auto stroke-1" />
                        <p className="font-semibold text-xs">No visitor records found</p>
                        <p className="text-[10px]">
                          {entries.length === 0 
                            ? 'Run the voice sequence above to log your first attendee'
                            : 'Adjust your search query or filter controls'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedEntries.map(entry => {
                    const isEditing = editingId === entry.id;
                    const logDate = new Date(entry.timestamp);
                    const formattedTime = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors group"
                      >
                        {/* Name Column */}
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-md focus:outline-hidden text-xs font-semibold"
                            />
                          ) : (
                            entry.name
                          )}
                        </td>

                        {/* Pass Type Column */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.passType}
                              onChange={(e) => setEditForm({ ...editForm, passType: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-md focus:outline-hidden text-xs font-semibold"
                            />
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                              {entry.passType}
                            </span>
                          )}
                        </td>

                        {/* Affiliation Column */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.affiliation}
                              onChange={(e) => setEditForm({ ...editForm, affiliation: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-md focus:outline-hidden text-xs font-semibold"
                            />
                          ) : (
                            entry.affiliation
                          )}
                        </td>

                        {/* Timestamp Column */}
                        <td className="py-3 px-4 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {formattedTime}
                        </td>

                        {/* Operations Actions Column */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditing(entry.id)}
                                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer transition"
                                  title="Save corrections"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                                  title="Cancel changes"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(entry)}
                                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                                  title="Edit log entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteEntry(entry.id)}
                                  className="p-1 rounded-md hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                                  title="Remove log entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
