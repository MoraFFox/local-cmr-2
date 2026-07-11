/** @format */

import React, { useState, useMemo } from "react";
import { FormData } from "../types";
import { useToast } from "./ToastContext";
import { ConfirmDialog } from "./ui/ConfirmDialog";
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
import EmptyState from "./EmptyState";
import Button from "./ui/Button";
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
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [includeLogOnly, setIncludeLogOnly] = useState(false);
  const [includeZeroVisits, setIncludeZeroVisits] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm: () => void; message: string } | null>(null);

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
      showToast("لا يمكن حذف هذا الباريستا (لا يوجد مصدر).", "error");
      return;
    }

    const count = barista.sources.length;
    const confirmMsg =
      count > 1
        ? `هذا الباريستا يظهر في ${count} أماكن. هل أنت متأكد من حذفه من كل المواقع؟`
        : `هل أنت متأكد من حذف ${barista.name}؟`;

    setConfirmState({
      open: true,
      message: confirmMsg,
      onConfirm: () => {
        onDelete(barista.sources!);
        setConfirmState(null);
      }
    });
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
          <h1 className='text-2xl sm:text-3xl font-bold text-primary'>
            أداء الباريستا
          </h1>
          <p className='text-secondary mt-1'>
            تتبع تقييمات الموظفين والزيارات والمالية الخاصة بالصيانة.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-md transition-colors ${showDebug ? "bg-ember-50 text-ember-700" : "bg-surface text-secondary"}`}
            title='تبديل وضع التصحيح'
          >
            <BugAntIcon className='w-5 h-5' />
          </button>
          <button
            onClick={() => setIncludeLogOnly(!includeLogOnly)}
            className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${includeLogOnly ? "bg-blue-100 text-blue-700" : "bg-surface text-secondary"}`}
            title='Include baristas detected only from maintenance logs'
          >
            Include Log-Only
          </button>
          <button
            onClick={() => setIncludeZeroVisits(!includeZeroVisits)}
            className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${includeZeroVisits ? "bg-surface-elevated text-primary" : "bg-surface text-secondary"}`}
            title='Include client staff with zero visits'
          >
            Include 0 Visits
          </button>
          <div className='relative w-full sm:w-72'>
            <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
              <MagnifyingGlassIcon className='h-5 w-5 text-secondary' />
            </div>
            <input
              type='search'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='block w-full rounded-lg border-default bg-surface py-2.5 pl-10 pr-3 text-primary placeholder:text-secondary focus:border-brand-red focus:ring-brand-red sm:text-sm shadow-sm transition-colors'
              placeholder='Search baristas...'
            />
          </div>
        </div>
      </div>

      {showDebug && (
        <div className='bg-chrome text-leaf-500 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-leaf-500 shadow-lg mb-6'>
          <h3 className='text-white font-bold text-sm mb-2 border-b border-leaf-500 pb-1'>
            Debug: Profile Aggregation Logic
          </h3>
          <table className='w-full text-left'>
            <thead>
              <tr className='text-secondary/70'>
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
                  className='border-b border-default hover:bg-chrome-light/50'
                >
                  <td className='p-1 text-xs text-secondary font-mono'>
                    {b.id}
                  </td>
                  <td className='p-1 font-bold'>{b.name}</td>
                  <td className='p-1 text-secondary'>{normalize(b.name)}</td>
                  <td className='p-1'>
                    {Array.from(b._companiesVisited || []).join(", ")}
                  </td>
                  <td className='p-1 text-xs'>
                    {Array.from(b._rawNames || []).join(", ")}
                  </td>
                  <td className='p-1 text-right font-bold text-brand-red-400'>
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
        <div className='bg-surface p-4 rounded-xl shadow-sm border border-default flex items-center gap-4'>
          <div className='p-3 bg-brand-red/10 text-brand-red rounded-full'>
            <UserIcon className='w-6 h-6' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase text-secondary'>
              Total Staff
            </p>
            <p className='text-2xl font-bold text-primary'>
              {filteredBaristas.length}
            </p>
          </div>
        </div>
        <div className='bg-surface p-4 rounded-xl shadow-sm border border-default flex items-center gap-4'>
          <div className='p-3 bg-surface-elevated text-primary rounded-full'>
            <WrenchScrewdriverIcon className='w-6 h-6' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase text-secondary'>
              Total Visits
            </p>
            <p className='text-2xl font-bold text-primary'>
              {totalVisits}
            </p>
          </div>
        </div>
        <div className='bg-surface p-4 rounded-xl shadow-sm border border-default flex items-center gap-4'>
          <div className='p-3 bg-amber-500/10 text-amber-500 rounded-full'>
            <BanknotesIcon className='w-6 h-6' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase text-secondary'>
              Total Company Paid
            </p>
            <p
              className='text-xl font-bold text-primary truncate'
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
              className='bg-surface rounded-xl shadow-md border border-default overflow-hidden flex flex-col hover:shadow-lg hover:border-brand-red/50 cursor-pointer transition-all duration-300 relative group'
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
              <div className='p-5 border-b border-default flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <Avatar name={barista.name} />
                  <div>
                    <h3 className='font-bold text-primary dark:text-white text-lg group-hover:text-brand-red dark:group-hover:text-brand-red-400 transition-colors'>
                      {barista.name}
                    </h3>
                    <div className='flex flex-col gap-0.5 mt-0.5'>
                      {barista.averageVisitRating > 0 ? (
                        <div
                          className='flex items-center gap-1.5'
                          title='Average performance from maintenance visits'
                        >
                          <span className='font-bold text-brand-red dark:text-brand-red-400 text-sm'>
                            {barista.averageVisitRating.toFixed(1)}
                          </span>
                          <div className='flex'>
                            {Array.from({ length: 5 }).map((_, i) =>
                              i < Math.round(barista.averageVisitRating) ? (
                                <StarIconSolid
                                  key={i}
                                  className='w-3.5 h-3.5 text-brand-red-400'
                                />
                              ) : (
                                <StarIcon
                                  key={i}
                                  className='w-3.5 h-3.5 text-secondary/70 dark:text-secondary/70'
                                />
                              ),
                            )}
                          </div>
                          <span className='text-[10px] text-secondary font-medium bg-surface dark:bg-chrome-light px-1.5 rounded'>
                            Perf.
                          </span>
                        </div>
                      ) : (
                        <div
                          className='flex items-center gap-1.5'
                          title='Initial Profile Rating'
                        >
                          {barista.isAutoDetected ? (
                            <span className='text-[10px] text-secondary italic'>
                              No Rating Yet
                            </span>
                          ) : (
                            <>
                              <span className='text-[10px] text-secondary font-medium bg-surface dark:bg-chrome-light px-1.5 rounded'>
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
                    className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${barista.visitCount > 0 ? "bg-surface-elevated text-brand-red dark:bg-brand-red/20 dark:text-brand-red-400" : "bg-surface text-secondary dark:bg-chrome-light dark:text-secondary/70"}`}
                  >
                    {barista.visitCount} Visit
                    {barista.visitCount !== 1 ? "s" : ""}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter ${
                      barista.isAutoDetected
                        ? "border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:bg-blue-900/20"
                        : "border-brand-red/30 text-brand-red bg-surface-elevated dark:border-brand-red/30 dark:text-brand-red-400 dark:bg-brand-red/10"
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
                      <BriefcaseIcon className='w-4 h-4 text-secondary mt-0.5 shrink-0' />
                      <span
                        className='font-semibold text-primary dark:text-secondary/70 line-clamp-1'
                        title={barista.companyName}
                      >
                        {barista.companyName}
                      </span>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-secondary dark:text-secondary/70 ml-6'>
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
                      className='p-1.5 text-secondary hover:text-brand-red hover:bg-surface-elevated dark:hover:bg-brand-red/20 rounded-lg transition-colors'
                      title='Edit Details'
                    >
                      <PencilIcon className='w-5 h-5' />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, barista)}
                      className='p-1.5 text-secondary hover:text-ember-700 hover:bg-ember-50 dark:hover:bg-ember-500/20 rounded-lg transition-colors'
                      title='Delete Barista'
                    >
                      <TrashIcon className='w-5 h-5' />
                    </button>
                  </div>
                </div>

                {/* Financial Stats */}
                <div className='bg-surface rounded-lg p-3 space-y-2 text-sm border border-default'>
                  <div className='flex justify-between items-center'>
                    <span className='text-secondary text-xs uppercase font-bold'>
                      Company Paid (Saved)
                    </span>
                    <span
                      className={`font-mono font-bold ${barista.companyCost > 0 ? "text-amber-500" : "text-secondary"}`}
                    >
                      {formatCurrency(barista.companyCost)}
                    </span>
                  </div>
                  <div className='w-full h-px bg-surface-elevated'></div>
                  <div className='flex justify-between items-center'>
                    <span className='text-secondary text-xs uppercase font-bold'>
                      Client Paid (Rev)
                    </span>
                    <span
                      className={`font-mono font-bold ${barista.clientCost > 0 ? "text-brand-red" : "text-secondary"}`}
                    >
                      {formatCurrency(barista.clientCost)}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between mt-2 pt-2 border-t border-default'>
                  {barista.lastActive ? (
                    <span className='text-[10px] text-secondary italic'>
                      Last active: {barista.lastActive}
                    </span>
                  ) : (
                    <span></span>
                  )}
                  <span className='text-brand-red text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    View Work History <ArrowRightIcon className='w-3 h-3' />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            variant={searchTerm ? "search" : "primary"}
            icon={<UserIcon />}
            title="لا يوجد باريستا"
            message={searchTerm ? "لم يتم العثور على باريستا يطابق بحثك." : "لم يتم إضافة باريستا حتى الآن."}
          >
            {searchTerm && (
                <Button variant="secondary" onClick={() => setSearchTerm('')}>
                    <XMarkIcon className="w-4 h-4" />
                    مسح البحث
                </Button>
            )}
          </EmptyState>
        </div>
      )}

      {/* Edit Modal */}
      {editingBarista && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200'>
          <div
            className='bg-surface border border-default rounded-xl shadow-xl w-full max-w-md p-6'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-bold text-primary'>
                تعديل التفاصيل
              </h3>
              <button
                onClick={() => setEditingBarista(null)}
                className='text-secondary hover:text-primary transition-colors'
              >
                <XMarkIcon className='w-6 h-6' />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-primary mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className='w-full rounded-lg border-default bg-surface p-2.5 text-primary focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors outline-none'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-primary mb-1'>
                  Phone
                </label>
                <input
                  type='tel'
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className='w-full rounded-lg border-default bg-surface p-2.5 text-primary focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors outline-none'
                />
              </div>

              {editingBarista.sources && editingBarista.sources.length > 1 && (
                <div className='p-3 bg-amber-500/10 text-amber-500 text-xs rounded-lg border border-amber-500/20'>
                  <span className='font-bold'>Note:</span> This barista appears
                  in {editingBarista.sources.length} locations. Updating here
                  will update all records.
                </div>
              )}

              <div className='flex gap-3 pt-4 border-t border-default mt-6'>
                <button
                  onClick={() => setEditingBarista(null)}
                  className='flex-1 py-2.5 border border-default text-primary rounded-lg font-semibold hover:bg-surface-elevated transition-colors'
                >
                  إلغاء
                </button>
                <button
                  onClick={saveEdit}
                  className='btn-primary flex-1 py-2.5 rounded-lg font-bold transition-colors'
                >
                  حفظ التغييرات
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
