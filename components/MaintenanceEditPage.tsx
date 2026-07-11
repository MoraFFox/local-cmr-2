import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FormData, Branch, MaintenanceRecord } from '../types';
import {
  ArrowLeftIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import MaintenanceRecordList from './MaintenanceRecordList';
import MaintenanceRecordEditor from './MaintenanceRecordEditor';
import { getNewMaintenanceRecord } from './MaintenanceRecordCard';

/**
 * Generate a collision-resistant record id.
 *
 * Bare Date.now() collides if two records are created in the same millisecond
 * (e.g. rapid double-add) and also collides with the supervisor id, which
 * `getNewMaintenanceRecord` also derives from Date.now(). Combine the timestamp
 * with a monotonic counter so every id in a session is unique.
 */
const recordIdCounter = { n: 0 };
const generateRecordId = (): number => {
  // epoch-ms * 1000 + counter(0..999) → unique within 1000 ids per ms
  return Date.now() * 1000 + (recordIdCounter.n++ % 1000);
};

interface MaintenanceEditPageProps {
  submission: FormData;
  onBack: () => void;
  onSave: (updatedSubmission: FormData) => void;
  partsList: any[];
  servicesList: any[];
  problemCategories: any[];
  allPredefinedProblems: string[];
  isSidebarExpanded: boolean;
}

const MaintenanceEditPage: React.FC<MaintenanceEditPageProps> = ({
  submission,
  onBack,
  onSave,
  partsList,
  servicesList,
  problemCategories,
  allPredefinedProblems,
  isSidebarExpanded
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [editingRecordIndex, setEditingRecordIndex] = useState<number>(-1);
  const [localSubmission, setLocalSubmission] = useState<FormData>(submission);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Staging model (Change 2): a brand-new record is held here until the user
  // Saves (then it is appended to the branch's history) or Cancels (then it is
  // discarded). This avoids leaving an empty "ghost" record in localSubmission
  // when the user cancels out of the editor.
  // `branchId === -1` denotes the Main Office.
  const [stagingNewRecord, setStagingNewRecord] = useState<{ branchId: number } | null>(null);

  // Track which company we're currently rendering so a switch to a different
  // company resyncs localSubmission from props (Change 5). Using a ref avoids
  // resyncing on every parent re-render within the same company.
  const currentCompanyIdRef = useRef<number | string | undefined>(submission.id);

  useEffect(() => {
    if (submission.id !== currentCompanyIdRef.current) {
      currentCompanyIdRef.current = submission.id;
      setLocalSubmission(submission);
    }
  }, [submission]);

  const branches = useMemo(() => {
    const allBranches: (Branch & { isMainOffice: boolean })[] = [];

    // Main Office is always selectable, even with zero records, so users can
    // add the first maintenance record. (Previously gated on
    // maintenanceHistory.length > 0, which hid empty branches entirely and made
    // it impossible to reach them to add the first record.)
    allBranches.push({
      id: -1,
      branchName: 'Main Office',
      email: localSubmission.email,
      taxNumber: localSubmission.taxNumber,
      location: localSubmission.location,
      contacts: localSubmission.contacts,
      baristas: localSubmission.baristas,
      clientBaristas: localSubmission.clientBaristas || [],
      usesOurMachines: localSubmission.usesOurMachines,
      machineOwnershipType: localSubmission.machineOwnershipType,
      dailyLeaseCost: localSubmission.dailyLeaseCost,
      maintenanceHistory: localSubmission.maintenanceHistory,
      isMainOffice: true
    });

    // Every branch is always selectable, regardless of record count, so users
    // can add the first maintenance record to any branch.
    localSubmission.branches.forEach(branch => {
      allBranches.push({
        ...branch,
        isMainOffice: false
      });
    });

    return allBranches;
  }, [localSubmission]);

  const selectedBranch = useMemo(() => {
    if (selectedBranchId === null) return null;
    return branches.find(b => b.id === selectedBranchId) || null;
  }, [selectedBranchId, branches]);

  // Calculate average days between maintenance for the selected branch
  const averageDaysBetweenMaintenance = useMemo(() => {
    if (!selectedBranch || selectedBranch.maintenanceHistory.length < 2) return null;
    
    const sortedDates = selectedBranch.maintenanceHistory
      .map(r => new Date(r.maintenanceDate).getTime())
      .filter(time => !isNaN(time))
      .sort((a, b) => a - b);
    
    if (sortedDates.length < 2) return null;
    
    let totalDays = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const diffTime = sortedDates[i] - sortedDates[i - 1];
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      totalDays += diffDays;
    }
    
    return Math.round(totalDays / (sortedDates.length - 1));
  }, [selectedBranch]);

  // Get last visit date for the selected branch
  const lastVisitDate = useMemo(() => {
    if (!selectedBranch || selectedBranch.maintenanceHistory.length === 0) return null;
    
    const sortedDates = selectedBranch.maintenanceHistory
      .map(r => new Date(r.maintenanceDate))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    
    return sortedDates[0] || null;
  }, [selectedBranch]);

  const handleBranchSelect = (branchId: number) => {
    setSelectedBranchId(branchId);
    setEditingRecord(null);
    setEditingRecordIndex(-1);
  };

  const handleEditRecord = (record: MaintenanceRecord, index: number) => {
    setEditingRecord(record);
    setEditingRecordIndex(index);
  };

  const handleCloseEditor = () => {
    // A staged new record has NOT been written to localSubmission yet, so
    // cancelling simply discards it — no ghost record is left behind.
    if (stagingNewRecord) {
      setStagingNewRecord(null);
    }

    setEditingRecord(null);
    setEditingRecordIndex(-1);
  };

  const handleSaveRecord = (updatedRecord: MaintenanceRecord) => {
    // Deep-clone so nested arrays/objects (branches[].maintenanceHistory) are
    // never mutated in place on the existing state (Change 4).
    const newSubmission = structuredClone(localSubmission) as FormData;

    const isStagedNew = !!stagingNewRecord;
    const targetIsMainOffice = isStagedNew
      ? stagingNewRecord!.branchId === -1
      : !!selectedBranch?.isMainOffice;

    if (targetIsMainOffice) {
      if (isStagedNew) {
        // Append the newly-added record.
        newSubmission.maintenanceHistory = [...newSubmission.maintenanceHistory, updatedRecord];
      } else {
        const newHistory = [...newSubmission.maintenanceHistory];
        newHistory[editingRecordIndex] = updatedRecord;
        newSubmission.maintenanceHistory = newHistory;
      }
    } else {
      const targetBranchId = isStagedNew ? stagingNewRecord!.branchId : selectedBranch!.id;
      const branchIndex = newSubmission.branches.findIndex(b => b.id === targetBranchId);
      if (branchIndex !== -1) {
        if (isStagedNew) {
          newSubmission.branches[branchIndex].maintenanceHistory = [
            ...newSubmission.branches[branchIndex].maintenanceHistory,
            updatedRecord
          ];
        } else {
          const newHistory = [...newSubmission.branches[branchIndex].maintenanceHistory];
          newHistory[editingRecordIndex] = updatedRecord;
          newSubmission.branches[branchIndex].maintenanceHistory = newHistory;
        }
      }
    }

    setLocalSubmission(newSubmission);
    onSave(newSubmission);

    // Clear editing + staging state
    setEditingRecord(null);
    setEditingRecordIndex(-1);
    setStagingNewRecord(null);

    // Show a success message for new records
    if (isStagedNew) {
      const branchName = targetIsMainOffice
        ? 'Main Office'
        : (newSubmission.branches.find(b => b.id === stagingNewRecord!.branchId)?.branchName) || 'this branch';
      setSuccessMessage(`New maintenance record saved successfully for ${branchName}!`);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  };

  const handleQuickUpdate = (recordId: number, updates: Partial<MaintenanceRecord>) => {
    const newSubmission = structuredClone(localSubmission) as FormData;

    if (selectedBranch?.isMainOffice) {
      const recordIndex = newSubmission.maintenanceHistory.findIndex(r => r.id === recordId);
      if (recordIndex !== -1) {
        newSubmission.maintenanceHistory[recordIndex] = {
          ...newSubmission.maintenanceHistory[recordIndex],
          ...updates
        };
      }
    } else if (selectedBranch) {
      const branchIndex = newSubmission.branches.findIndex(b => b.id === selectedBranch.id);
      if (branchIndex !== -1) {
        const recordIndex = newSubmission.branches[branchIndex].maintenanceHistory.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
          newSubmission.branches[branchIndex].maintenanceHistory[recordIndex] = {
            ...newSubmission.branches[branchIndex].maintenanceHistory[recordIndex],
            ...updates
          };
        }
      }
    }

    setLocalSubmission(newSubmission);
    onSave(newSubmission);
  };

  const handleDeleteRecord = (recordId: number) => {
    const newSubmission = structuredClone(localSubmission) as FormData;

    if (selectedBranch?.isMainOffice) {
      newSubmission.maintenanceHistory = newSubmission.maintenanceHistory.filter(r => r.id !== recordId);
    } else if (selectedBranch) {
      const branchIndex = newSubmission.branches.findIndex(b => b.id === selectedBranch.id);
      if (branchIndex !== -1) {
        newSubmission.branches[branchIndex].maintenanceHistory = 
          newSubmission.branches[branchIndex].maintenanceHistory.filter(r => r.id !== recordId);
      }
    }
    
    setLocalSubmission(newSubmission);
    onSave(newSubmission);
    
    // Show success message
    const branchName = selectedBranch?.isMainOffice 
      ? 'Main Office' 
      : selectedBranch?.branchName || 'this branch';
    setSuccessMessage(`Maintenance record deleted successfully from ${branchName}.`);
    
    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const handleNavigateRecord = (direction: 'prev' | 'next') => {
    if (!selectedBranch || editingRecordIndex === -1) return;

    // A staged new record isn't part of the history yet, so there is nothing to
    // navigate to — just bail (the prev/next buttons are disabled in this case).
    if (stagingNewRecord) return;

    const records = selectedBranch.maintenanceHistory;
    const newIndex = direction === 'prev'
      ? editingRecordIndex - 1
      : editingRecordIndex + 1;

    if (newIndex >= 0 && newIndex < records.length) {
      setEditingRecord(records[newIndex]);
      setEditingRecordIndex(newIndex);
    }
  };

  const handleAddNewRecord = async () => {
    if (!selectedBranch) return;

    // Collision-resistant id (Change 3). `getNewMaintenanceRecord` also derives
    // a supervisor id from Date.now(); the counter entropy keeps them distinct.
    const newId = generateRecordId();
    const newRecord = getNewMaintenanceRecord(newId);

    // Staging model (Change 2): do NOT mutate localSubmission yet — the record
    // is only persisted when the user Saves. On Cancel it is discarded.
    setStagingNewRecord({ branchId: selectedBranch.isMainOffice ? -1 : selectedBranch.id });

    // Open the editor immediately. The new record will be appended at save time,
    // so its index isn't known until then; use -1 to signal "new/unsaved".
    setEditingRecord(newRecord);
    setEditingRecordIndex(-1);
  };

  if (editingRecord && selectedBranch) {
    return (
      <div className="min-h-screen bg-surface dark:bg-chrome">
        {/* Redesigned Header */}
        <div className="sticky top-0 z-50 rounded-lg bg-gradient-to-r from-espresso-light to-espresso dark:from-espresso dark:to-black border-1 border-brass shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCloseEditor}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Back</span>
                </button>
                
                <div className="hidden sm:block h-8 w-px bg-chrome-light" />
                
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {localSubmission.companyName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary/70">
                    <span>{selectedBranch.branchName}</span>
                    <span className="text-secondary">•</span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {stagingNewRecord ? (
                        'New record'
                      ) : (
                        <>Record {editingRecordIndex + 1} of {selectedBranch.maintenanceHistory.length}</>
                      )}
                    </span>
                    {stagingNewRecord && (
                      <>
                        <span className="text-secondary">•</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                          New (Unsaved)
                        </span>
                      </>
                    )}
                    {averageDaysBetweenMaintenance && (
                      <>
                        <span className="text-secondary">•</span>
                        <span className="flex items-center gap-1 text-brand-red-400">
                          <ClockIcon className="w-4 h-4" />
                          Avg: {averageDaysBetweenMaintenance} days
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigateRecord('prev')}
                  disabled={stagingNewRecord || editingRecordIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10 text-white transition-colors backdrop-blur-sm"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <div className="hidden sm:block px-4 py-2 bg-white/5 rounded-lg text-white font-medium min-w-[80px] text-center">
                  {stagingNewRecord ? 'NEW' : `${editingRecordIndex + 1} / ${selectedBranch.maintenanceHistory.length}`}
                </div>
                <button
                  onClick={() => handleNavigateRecord('next')}
                  disabled={stagingNewRecord || editingRecordIndex === selectedBranch.maintenanceHistory.length - 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10 text-white transition-colors backdrop-blur-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
                
                <div className="hidden sm:block h-8 w-px bg-chrome-light" />
                
                <button
                  onClick={handleAddNewRecord}
                  className="btn-primary rounded-lg shadow-lg backdrop-blur-sm"
                  title="إضافة سجل صيانة جديد لهذا الفرع"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Add Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MaintenanceRecordEditor
            record={editingRecord}
            onSave={handleSaveRecord}
            onCancel={handleCloseEditor}
            partsList={partsList}
            servicesList={servicesList}
            problemCategories={problemCategories}
            allPredefinedProblems={allPredefinedProblems}
            baristas={selectedBranch.baristas}
            clientBaristas={selectedBranch.clientBaristas}
            lastVisitDate={lastVisitDate}
            averageDays={averageDaysBetweenMaintenance}
            isSidebarExpanded={isSidebarExpanded}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-chrome">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-espresso-light to-espresso dark:from-espresso dark:to-black border-b border-brass shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Back</span>
            </button>
            
            <div className="h-8 w-px bg-chrome-light" />
            
            <div>
              <h1 className="text-xl font-bold text-white">
                Edit Maintenance Records
              </h1>
              <p className="text-sm text-secondary/70">
                {localSubmission.companyName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedBranch ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-surface dark:bg-chrome rounded-xl p-4 border border-default dark:border-default">
              <button
                onClick={() => setSelectedBranchId(null)}
                className="flex items-center gap-2 text-brand-red dark:text-brand-red-400 hover:text-brand-red dark:hover:text-brand-red-400 font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Select Different Branch
              </button>
              <div className="flex items-center gap-4">
                {averageDaysBetweenMaintenance && (
                  <div className="flex items-center gap-2 text-sm text-primary dark:text-secondary">
                    <ClockIcon className="w-4 h-4 text-brand-red" />
                    Average: {averageDaysBetweenMaintenance} days between visits
                  </div>
                )}
                <span className="text-sm font-medium text-primary dark:text-secondary/70 px-3 py-1 bg-surface dark:bg-chrome-light rounded-full">
                  {selectedBranch.maintenanceHistory.length} records
                </span>
                <button
                  onClick={handleAddNewRecord}
                  className="btn-primary rounded-lg shadow-lg"
                  title="إضافة سجل صيانة جديد لهذا الفرع"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Add Record</span>
                </button>
              </div>
            </div>
            
            {successMessage && (
              <div className="flex items-center gap-3 px-4 py-3 bg-leaf-50 dark:bg-leaf-500/10 border border-leaf-500/30 dark:border-leaf-500/30 rounded-xl text-leaf-700 dark:text-leaf-300 animate-content-fade-in">
                <CheckCircleIcon className="w-5 h-5 text-leaf-600 dark:text-leaf-300 flex-shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}
            
            <MaintenanceRecordList
              records={selectedBranch.maintenanceHistory}
              branchName={selectedBranch.branchName || 'Unnamed Branch'}
              onEdit={handleEditRecord}
              onQuickUpdate={handleQuickUpdate}
              onDelete={handleDeleteRecord}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-primary dark:text-white">
              Select a Branch
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch.id)}
                  className="flex items-start gap-4 p-6 bg-surface dark:bg-chrome rounded-xl border border-default dark:border-default hover:border-copper-500 dark:hover:border-copper-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="p-3 bg-gradient-to-br from-copper-500 to-copper-600 rounded-lg group-hover:from-copper-400 group-hover:to-copper-500 transition-colors shadow-lg">
                    {branch.isMainOffice ? (
                      <BuildingOfficeIcon className="w-6 h-6 text-white" />
                    ) : (
                      <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-primary dark:text-white truncate">
                      {branch.branchName || 'Unnamed Branch'}
                    </h3>
                    <p className="text-sm text-secondary dark:text-secondary mt-1">
                      {branch.maintenanceHistory.length} maintenance records
                    </p>
                    <p className="text-xs text-secondary dark:text-secondary mt-2 truncate">
                      {branch.location}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceEditPage;
