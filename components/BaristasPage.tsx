/** @format */

import React, { useState, useMemo } from "react";
import { FormData } from "../types";
import {
  MagnifyingGlassIcon,
  UserIcon,
  BriefcaseIcon,
  BanknotesIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  SparklesIcon,
  BugAntIcon,
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid, StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import Avatar from "./Avatar";
import {
  aggregateBaristaData,
  normalize,
  AggregatedBarista,
} from "../utils/baristaAnalytics";

interface BaristasPageProps {
  submissions: FormData[];
  onViewDetails: (baristaName: string) => void;
  onDelete: (
    sources: {
      submissionId: number;
      branchIndex: number | null;
      baristaIndex: number;
    }[],
  ) => void;
  onUpdate: (
    sources: {
      submissionId: number;
      branchIndex: number | null;
      baristaIndex: number;
    }[],
    newDetails: { name: string; phone: string },
  ) => void;
}

const BaristasPage: React.FC<BaristasPageProps> = ({
  submissions,
  onViewDetails,
  onDelete,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [includeLogOnly, setIncludeLogOnly] = useState(false);
  const [includeZeroVisits, setIncludeZeroVisits] = useState(false);

  // Edit State
  const [editingBarista, setEditingBarista] =
    useState<AggregatedBarista | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });

  const startEdit = (e: React.MouseEvent, barista: AggregatedBarista) => {
    e.stopPropagation();
    setEditingBarista(barista);
    setEditForm({
      name: barista.name,
      phone: barista.phone || "",
    });
  };

  const handleDelete = (e: React.MouseEvent, barista: AggregatedBarista) => {
    e.stopPropagation();
    if (!barista.sources || barista.sources.length === 0) {
      alert("لا يمكن حذف هذا الباريستا (لا يوجد مصدر).");
      return;
    }

    const count = barista.sources.length;
    const confirmMsg =
      count > 1
        ? `هذا الباريستا يظهر في ${count} أماكن. هل أنت متأكد من حذفه من كل المواقع؟`
        : `هل أنت متأكد من حذف ${barista.name}؟`;

    if (window.confirm(confirmMsg)) {
      onDelete(barista.sources);
    }
  };

  const saveEdit = () => {
    if (!editingBarista || !editingBarista.sources) return;
    if (!editForm.name.trim()) return;
    onUpdate(editingBarista.sources, editForm);
    setEditingBarista(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(value);

  // --- MAIN AGGREGATION LOGIC (Delegated to Utility) ---
  const aggregatedBaristas = useMemo(
    () => aggregateBaristaData(submissions),
    [submissions],
  );

  const filteredBaristas = useMemo(() => {
    let base = includeLogOnly
      ? aggregatedBaristas
      : aggregatedBaristas.filter((b) => !b.isAutoDetected);
    if (!includeZeroVisits) {
      base = base.filter((b) => b.visitCount > 0);
    }
    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.companyName.toLowerCase().includes(term) ||
        b.branchName.toLowerCase().includes(term),
    );
  }, [aggregatedBaristas, includeLogOnly, includeZeroVisits, searchTerm]);

  const totalVisits = filteredBaristas.reduce(
    (acc, b) => acc + b.visitCount,
    0,
  );
  const totalCompanyCost = filteredBaristas.reduce(
    (acc, b) => acc + b.companyCost,
    0,
  );

  return (
    <div className='w-full max-w-7xl mx-auto space-y-6'>
      {/* Header Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50'>
            أداء الباريستا
          </h1>
          <p className='text-slate-600 dark:text-slate-400 mt-1'>
            تتبع تقييمات الموظفين والزيارات والمالية الخاصة بالصيانة.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-md transition-colors ${showDebug ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}
            title='تبديل وضع التصحيح'
          >
            <BugAntIcon className='w-5 h-5' />
          </button>
          <button
            onClick={() => setIncludeLogOnly(!includeLogOnly)}
            className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${includeLogOnly ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
            title='Include baristas detected only from maintenance logs'
          >
            Include Log-Only
          </button>
          <button
            onClick={() => setIncludeZeroVisits(!includeZeroVisits)}
            className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${includeZeroVisits ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"}`}
            title='Include client staff with zero visits'
          >
            Include 0 Visits
          </button>
          <div className='relative w-full sm:w-72'>
            <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
              <MagnifyingGlassIcon className='h-5 w-5 text-slate-400' />
            </div>
            <input
              type='search'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500 sm:text-sm shadow-sm'
              placeholder='Search baristas...'
            />
          </div>
        </div>
      </div>

      {showDebug && (
        <div className='bg-slate-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-green-900 shadow-lg mb-6'>
          <h3 className='text-white font-bold text-sm mb-2 border-b border-green-800 pb-1'>
            Debug: Profile Aggregation Logic
          </h3>
          <table className='w-full text-left'>
            <thead>
              <tr className='text-slate-400'>
                <th className='p-1'>ID</th>
                <th className='p-1'>Displayed Name</th>
                <th className='p-1'>Norm. Name Key</th>
                <th className='p-1'>Companies Merged</th>
                <th className='p-1'>Raw Names Merged</th>
                <th className='p-1 text-right'>Is Auto?</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedBaristas.map((b) => (
                <tr
                  key={b.id}
                  className='border-b border-slate-800 hover:bg-slate-800'
                >
                  <td className='p-1 text-xs text-slate-500 font-mono'>
                    {b.id}
                  </td>
                  <td className='p-1 font-bold'>{b.name}</td>
                  <td className='p-1 text-slate-500'>{normalize(b.name)}</td>
                  <td className='p-1'>
                    {Array.from(b._companiesVisited || []).join(", ")}
                  </td>
                  <td className='p-1 text-xs'>
                    {Array.from(b._rawNames || []).join(", ")}
                  </td>
                  <td className='p-1 text-right font-bold text-teal-400'>
                    {b.isAutoDetected ? "YES" : "NO"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4'>
          <div className='p-3 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full'>
            <UserIcon className='w-6 h-6' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase text-slate-500 dark:text-slate-400'>
              Total Staff
            </p>
            <p className='text-2xl font-bold text-slate-900 dark:text-white'>
              {filteredBaristas.length}
            </p>
          </div>
        </div>
        <div className='bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4'>
          <div className='p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full'>
            <WrenchScrewdriverIcon className='w-6 h-6' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase text-slate-500 dark:text-slate-400'>
              Total Visits
            </p>
            <p className='text-2xl font-bold text-slate-900 dark:text-white'>
              {totalVisits}
            </p>
          </div>
        </div>
        <div className='bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4'>
          <div className='p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full'>
            <BanknotesIcon className='w-6 h-6' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase text-slate-500 dark:text-slate-400'>
              Total Company Paid
            </p>
            <p
              className='text-xl font-bold text-slate-900 dark:text-white truncate'
              title={formatCurrency(totalCompanyCost)}
            >
              {new Intl.NumberFormat("en-US", {
                notation: "compact",
                compactDisplay: "short",
                style: "currency",
                currency: "EGP",
              }).format(totalCompanyCost)}
            </p>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {filteredBaristas.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filteredBaristas.map((barista) => (
            <div
              key={`${barista.id}-${barista.name}`}
              onClick={() => onViewDetails(barista.name)}
              className='bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-lg hover:border-teal-500/50 dark:hover:border-teal-500/50 cursor-pointer transition-all duration-300 relative group'
            >
              {/* Auto Detected Badge */}
              {barista.isAutoDetected && (
                <div
                  className='absolute top-0 right-0 bg-blue-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg shadow-sm z-10 flex items-center gap-1'
                  title='This barista was found in maintenance logs but is not in the team list.'
                >
                  <SparklesIcon className='w-3 h-3' /> Auto-Detected
                </div>
              )}

              {/* Card Header */}
              <div className='p-5 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <Avatar name={barista.name} />
                  <div>
                    <h3 className='font-bold text-slate-900 dark:text-white text-lg group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors'>
                      {barista.name}
                    </h3>
                    <div className='flex flex-col gap-0.5 mt-0.5'>
                      {barista.averageVisitRating > 0 ? (
                        <div
                          className='flex items-center gap-1.5'
                          title='Average performance from maintenance visits'
                        >
                          <span className='font-bold text-teal-600 dark:text-teal-400 text-sm'>
                            {barista.averageVisitRating.toFixed(1)}
                          </span>
                          <div className='flex'>
                            {Array.from({ length: 5 }).map((_, i) =>
                              i < Math.round(barista.averageVisitRating) ? (
                                <StarIconSolid
                                  key={i}
                                  className='w-3.5 h-3.5 text-teal-400'
                                />
                              ) : (
                                <StarIcon
                                  key={i}
                                  className='w-3.5 h-3.5 text-slate-300 dark:text-slate-600'
                                />
                              ),
                            )}
                          </div>
                          <span className='text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-1.5 rounded'>
                            Perf.
                          </span>
                        </div>
                      ) : (
                        <div
                          className='flex items-center gap-1.5'
                          title='Initial Profile Rating'
                        >
                          {barista.isAutoDetected ? (
                            <span className='text-[10px] text-slate-400 italic'>
                              No Rating Yet
                            </span>
                          ) : (
                            <>
                              <span className='text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-1.5 rounded'>
                                Profile
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className='flex flex-col items-end gap-2'>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${barista.visitCount > 0 ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}
                  >
                    {barista.visitCount} Visit
                    {barista.visitCount !== 1 ? "s" : ""}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter ${
                      barista.isAutoDetected
                        ? "border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:bg-blue-900/20"
                        : "border-teal-200 text-teal-600 bg-teal-50 dark:border-teal-900/50 dark:text-teal-400 dark:bg-teal-900/20"
                    }`}
                    title={
                      barista.isAutoDetected
                        ? "Detected from maintenance logs"
                        : "Listed in client staff"
                    }
                  >
                    {barista.isAutoDetected ? "Log-Only" : "Client Staff"}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className='p-5 flex-grow space-y-4'>
                <div className='flex justify-between items-start'>
                  {/* Location Context */}
                  <div>
                    <div className='flex items-start gap-2 text-sm mb-1'>
                      <BriefcaseIcon className='w-4 h-4 text-slate-400 mt-0.5 shrink-0' />
                      <span
                        className='font-semibold text-slate-700 dark:text-slate-300 line-clamp-1'
                        title={barista.companyName}
                      >
                        {barista.companyName}
                      </span>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ml-6'>
                      {barista.branchName === "Main Office" ? (
                        <BuildingStorefrontIcon className='w-3 h-3' />
                      ) : (
                        <MapPinIcon className='w-3 h-3' />
                      )}
                      <span className='line-clamp-1'>{barista.branchName}</span>
                    </div>
                  </div>

                  <div className='flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-2'>
                    <button
                      onClick={(e) => startEdit(e, barista)}
                      className='p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors'
                      title='Edit Details'
                    >
                      <PencilIcon className='w-5 h-5' />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, barista)}
                      className='p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors'
                      title='Delete Barista'
                    >
                      <TrashIcon className='w-5 h-5' />
                    </button>
                  </div>
                </div>

                {/* Financial Stats */}
                <div className='bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-2 text-sm border border-slate-100 dark:border-slate-700'>
                  <div className='flex justify-between items-center'>
                    <span className='text-slate-500 dark:text-slate-400 text-xs uppercase font-bold'>
                      Company Paid (Saved)
                    </span>
                    <span
                      className={`font-mono font-bold ${barista.companyCost > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}
                    >
                      {formatCurrency(barista.companyCost)}
                    </span>
                  </div>
                  <div className='w-full h-px bg-slate-200 dark:bg-slate-700'></div>
                  <div className='flex justify-between items-center'>
                    <span className='text-slate-500 dark:text-slate-400 text-xs uppercase font-bold'>
                      Client Paid (Rev)
                    </span>
                    <span
                      className={`font-mono font-bold ${barista.clientCost > 0 ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`}
                    >
                      {formatCurrency(barista.clientCost)}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700'>
                  {barista.lastActive ? (
                    <span className='text-[10px] text-slate-400 italic'>
                      Last active: {barista.lastActive}
                    </span>
                  ) : (
                    <span></span>
                  )}
                  <span className='text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    View Work History <ArrowRightIcon className='w-3 h-3' />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700'>
          <UserIcon className='w-12 h-12 text-slate-300 mx-auto mb-3' />
          <h3 className='text-lg font-medium text-slate-900 dark:text-white'>
            No Baristas Found
          </h3>
          <p className='text-slate-500 dark:text-slate-400 mt-1'>
            Try adjusting your search or add baristas to companies.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editingBarista && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200'>
          <div
            className='bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-bold text-slate-900 dark:text-white'>
                Edit Staff Details
              </h3>
              <button
                onClick={() => setEditingBarista(null)}
                className='text-slate-400 hover:text-slate-600'
              >
                <XMarkIcon className='w-6 h-6' />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className='w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Phone
                </label>
                <input
                  type='tel'
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className='w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white'
                />
              </div>

              {editingBarista.sources && editingBarista.sources.length > 1 && (
                <div className='p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs rounded-lg border border-amber-200 dark:border-amber-800'>
                  <span className='font-bold'>Note:</span> This barista appears
                  in {editingBarista.sources.length} locations. Updating here
                  will update all records.
                </div>
              )}

              <div className='flex gap-3 pt-4'>
                <button
                  onClick={() => setEditingBarista(null)}
                  className='flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className='flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20'
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaristasPage;
