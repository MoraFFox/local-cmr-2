import React, { useState, useMemo } from 'react';
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
  const [unsavedNewRecord, setUnsavedNewRecord] = useState<MaintenanceRecord | null>(null);

  const branches = useMemo(() => {
    const allBranches: (Branch & { isMainOffice: boolean })[] = [];
    
    if (localSubmission.maintenanceHistory.length > 0) {
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
    }
    
    localSubmission.branches.forEach(branch => {
      if (branch.maintenanceHistory.length > 0) {
        allBranches.push({
          ...branch,
          isMainOffice: false
        });
      }
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
    // Warn if closing editor with unsaved new record
    if (editingRecord?.id === unsavedNewRecord) {
      if (!window.confirm('This new record has not been saved yet. Are you sure you want to leave? It will be saved as a draft.')) {
        return;
      }
    }

    setEditingRecord(null);
    setEditingRecordIndex(-1);
    setUnsavedNewRecord(null);
  };

  const handleSaveRecord = (updatedRecord: MaintenanceRecord) => {
    const newSubmission = { ...localSubmission };

    if (selectedBranch?.isMainOffice) {
      const newHistory = [...newSubmission.maintenanceHistory];
      newHistory[editingRecordIndex] = updatedRecord;
      newSubmission.maintenanceHistory = newHistory;
    } else if (selectedBranch) {
      const branchIndex = newSubmission.branches.findIndex(b => b.id === selectedBranch.id);
      if (branchIndex !== -1) {
        const newHistory = [...newSubmission.branches[branchIndex].maintenanceHistory];
        newHistory[editingRecordIndex] = updatedRecord;
        newSubmission.branches[branchIndex].maintenanceHistory = newHistory;
      }
    }

    // Check if we're saving a new unsaved record
    const wasNewRecord = editingRecord?.id === unsavedNewRecord;

    setLocalSubmission(newSubmission);
    onSave(newSubmission);

    // Clear editing state and unsaved tracking
    setEditingRecord(null);
    setEditingRecordIndex(-1);
    setUnsavedNewRecord(null);

    // Show appropriate success message
    if (wasNewRecord) {
      const branchName = selectedBranch?.isMainOffice
        ? 'Main Office'
        : selectedBranch?.branchName || 'this branch';
      setSuccessMessage(`New maintenance record saved successfully for ${branchName}!`);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  };

  const handleQuickUpdate = (recordId: number, updates: Partial<MaintenanceRecord>) => {
    const newSubmission = { ...localSubmission };
    
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
    const newSubmission = { ...localSubmission };
    
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

    // Warn if navigating away from unsaved new record
    if (editingRecord?.id === unsavedNewRecord) {
      if (!window.confirm('This new record has not been saved yet. Are you sure you want to navigate away? It will be saved as a draft.')) {
        return;
      }
    }
    if (!selectedBranch || editingRecordIndex === -1) return;
    
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

    const newId = Date.now();
    const newRecord = getNewMaintenanceRecord(newId);

    // Add to local state without saving to database
    const newSubmission = { ...localSubmission };

    if (selectedBranch.isMainOffice) {
      newSubmission.maintenanceHistory = [...newSubmission.maintenanceHistory, newRecord];
    } else {
      const branchIndex = newSubmission.branches.findIndex(b => b.id === selectedBranch.id);
      if (branchIndex !== -1) {
        newSubmission.branches[branchIndex].maintenanceHistory = [
          ...newSubmission.branches[branchIndex].maintenanceHistory,
          newRecord
        ];
      }
    }

    setLocalSubmission(newSubmission);
    setUnsavedNewRecord(newId);

    // Open editor for the new record immediately
    const newIndex = (selectedBranch.isMainOffice
      ? newSubmission.maintenanceHistory
      : newSubmission.branches.find(b => b.id === selectedBranch.id)?.maintenanceHistory || []
    ).length - 1;

    setEditingRecord(newRecord);
    setEditingRecordIndex(newIndex);
  };

  if (editingRecord && selectedBranch) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Redesigned Header */}
        <div className="sticky top-0 z-50 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black border-1 border-slate-700 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCloseEditor}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Back</span>
                </button>
                
                <div className="h-8 w-px bg-slate-600" />
                
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {localSubmission.companyName}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <span>{selectedBranch.branchName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      Record {editingRecordIndex + 1} of {selectedBranch.maintenanceHistory.length}
                    </span>
                    {editingRecord.id === unsavedNewRecord && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                          New (Unsaved)
                        </span>
                      </>
                    )}
                    {averageDaysBetweenMaintenance && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="flex items-center gap-1 text-teal-400">
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
                  disabled={editingRecordIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10 text-white transition-colors backdrop-blur-sm"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <div className="px-4 py-2 bg-white/5 rounded-lg text-white font-medium min-w-[80px] text-center">
                  {editingRecordIndex + 1} / {selectedBranch.maintenanceHistory.length}
                </div>
                <button
                  onClick={() => handleNavigateRecord('next')}
                  disabled={editingRecordIndex === selectedBranch.maintenanceHistory.length - 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10 text-white transition-colors backdrop-blur-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
                
                <div className="h-8 w-px bg-slate-600" />
                
                <button
                  onClick={handleAddNewRecord}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white transition-all backdrop-blur-sm shadow-lg"
                  title="Add new maintenance record for this branch"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Add Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Back</span>
            </button>
            
            <div className="h-8 w-px bg-slate-600" />
            
            <div>
              <h1 className="text-xl font-bold text-white">
                Edit Maintenance Records
              </h1>
              <p className="text-sm text-slate-300">
                {localSubmission.companyName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedBranch ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedBranchId(null)}
                className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Select Different Branch
              </button>
              <div className="flex items-center gap-4">
                {averageDaysBetweenMaintenance && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <ClockIcon className="w-4 h-4 text-teal-500" />
                    Average: {averageDaysBetweenMaintenance} days between visits
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                  {selectedBranch.maintenanceHistory.length} records
                </span>
              </div>
            </div>
            
            {successMessage && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-200 animate-content-fade-in">
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Select a Branch
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch.id)}
                  className="flex items-start gap-4 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg group-hover:from-teal-400 group-hover:to-teal-500 transition-colors shadow-lg">
                    {branch.isMainOffice ? (
                      <BuildingOfficeIcon className="w-6 h-6 text-white" />
                    ) : (
                      <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {branch.branchName || 'Unnamed Branch'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {branch.maintenanceHistory.length} maintenance records
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 truncate">
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
