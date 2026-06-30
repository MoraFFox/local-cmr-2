/** @format */

import React, { useState, useMemo } from "react";
import { FormData, MaintenanceRecord } from "../types";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  BuildingOffice2Icon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  BanknotesIcon,
  UserIcon,
  ChevronDownIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import Avatar from "./Avatar";
import {
  aggregateBaristaData,
  AggregatedBarista,
} from "../utils/baristaAnalytics";

interface BaristaDetailsPageProps {
  baristaName: string;
  submissions: FormData[];
  onBack: () => void;
}

const BaristaDetailsPage: React.FC<BaristaDetailsPageProps> = ({
  baristaName,
  submissions,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [selectedRecord, setSelectedRecord] =
    useState<MaintenanceRecord | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(value);

  const baristaProfile = useMemo(() => {
    const allBaristas = aggregateBaristaData(submissions);
    return allBaristas.find((b) => b.name === baristaName);
  }, [submissions, baristaName]);

  const clientsList = useMemo(() => {
    const clients = new Set<string>();
    baristaProfile?.records?.forEach((r) => clients.add(r.companyName));
    return Array.from(clients).sort();
  }, [baristaProfile]);

  const filteredRecords = useMemo(() => {
    if (!baristaProfile?.records) return [];

    return baristaProfile.records.filter((rec) => {
      const matchesSearch =
        rec.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.machines?.some((m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      const matchesType = filterType === "all" || rec.type === filterType;
      const matchesClient =
        filterClient === "all" || rec.companyName === filterClient;

      let matchesDate = true;
      if (dateRange.start) {
        matchesDate =
          matchesDate &&
          new Date(rec.maintenanceDate) >= new Date(dateRange.start);
      }
      if (dateRange.end) {
        matchesDate =
          matchesDate &&
          new Date(rec.maintenanceDate) <= new Date(dateRange.end);
      }

      return matchesSearch && matchesType && matchesClient && matchesDate;
    });
  }, [baristaProfile, searchTerm, filterType, filterClient, dateRange]);

  if (!baristaProfile) {
    return (
      <div className='text-center py-20'>
        <UserIcon className='w-16 h-16 text-slate-300 mx-auto mb-4' />
        <h2 className='text-2xl font-bold text-slate-900 dark:text-white'>
          Barista Not Found
        </h2>
        <button
          onClick={onBack}
          className='mt-4 text-teal-600 font-bold hover:underline'
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className='w-full max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      {/* Header / Navigation */}
      <div className='flex items-center gap-4'>
        <button
          onClick={onBack}
          className='p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors'
        >
          <ArrowLeftIcon className='w-5 h-5' />
        </button>
        <div>
          <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>
            Staff Details
          </h1>
          <p className='text-sm text-slate-500'>
            Comprehensive performance and work history for {baristaName}
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden'>
        <div className='p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left'>
          <Avatar
            name={baristaName}
            className='w-32 h-32 text-4xl shadow-2xl border-4 border-white dark:border-slate-700'
          />

          <div className='flex-grow space-y-4'>
            <div className='flex flex-col md:flex-row md:items-center gap-2 md:gap-4'>
              <h2 className='text-3xl font-black text-slate-900 dark:text-white tracking-tight'>
                {baristaName}
              </h2>
              {baristaProfile.isAutoDetected && (
                <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase gap-1'>
                  <SparklesIcon className='w-3 h-3' /> Auto-Detected
                </span>
              )}
            </div>

            <div className='flex flex-wrap items-center gap-6 justify-center md:justify-start'>
              <div className='flex items-center gap-2'>
                <span className='text-2xl font-bold text-teal-600 dark:text-teal-400'>
                  {baristaProfile.averageVisitRating.toFixed(1)}
                </span>
                <div className='flex'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StarIconSolid
                      key={i}
                      className={`w-5 h-5 ${i <= Math.round(baristaProfile.averageVisitRating) ? "text-amber-400" : "text-slate-200 dark:text-slate-700"}`}
                    />
                  ))}
                </div>
                <span className='text-slate-400 text-sm font-medium'>
                  Rating
                </span>
              </div>
              <div className='h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block'></div>
              <div className='flex items-center gap-2'>
                <span className='text-xl font-bold text-slate-900 dark:text-white'>
                  {baristaProfile.visitCount}
                </span>
                <span className='text-slate-500 text-sm'>Total Visits</span>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700'>
              <div>
                <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                  Main Office / Last Client
                </p>
                <p className='font-semibold text-slate-700 dark:text-slate-300 truncate'>
                  {baristaProfile.companyName}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                  Company Paid (Accumulated)
                </p>
                <p className='font-mono font-bold text-amber-600 dark:text-amber-400'>
                  {formatCurrency(baristaProfile.companyCost)}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                  Client Paid (Accumulated)
                </p>
                <p className='font-mono font-bold text-teal-600 dark:text-teal-400'>
                  {formatCurrency(baristaProfile.clientCost)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit History Section */}
      <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden'>
        <div className='p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <h3 className='text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <WrenchScrewdriverIcon className='w-5 h-5 text-teal-500' />
            Detailed Visit History
          </h3>

          {/* Filters Toolbar */}
          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative'>
              <MagnifyingGlassIcon className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
              <input
                type='text'
                placeholder='Search machines, notes...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-9 pr-3 py-1.5 text-xs rounded-full border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-teal-500 focus:border-teal-500'
              />
            </div>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className='text-xs rounded-full border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 py-1.5 focus:ring-teal-500'
            >
              <option value='all'>All Clients</option>
              {clientsList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className='text-xs rounded-full border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 py-1.5 focus:ring-teal-500'
            >
              <option value='all'>All Types</option>
              <option value='scheduled'>Scheduled</option>
              <option value='requested'>Requested / Emergency</option>
            </select>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider'>
                <th className='px-6 py-4'>Date</th>
                <th className='px-6 py-4'>Client / Branch</th>
                <th className='px-6 py-4'>Machine / Asset</th>
                <th className='px-6 py-4'>Type</th>
                <th className='px-6 py-4 text-center'>Rating</th>
                <th className='px-6 py-4'>Status / Follow-up</th>
                <th className='px-6 py-4 text-right'>View</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 dark:divide-slate-700'>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className='hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <CalendarIcon className='w-4 h-4 text-slate-300' />
                        <span className='text-sm text-slate-700 dark:text-slate-300 font-medium'>
                          {rec.maintenanceDate}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='text-sm font-bold text-slate-900 dark:text-white'>
                        {rec.companyName}
                      </div>
                      <div className='text-[10px] text-slate-500 flex items-center gap-1'>
                        <MapPinIcon className='w-3 h-3' /> {rec.branchName}
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-wrap gap-1'>
                        {rec.machines && rec.machines.length > 0 ? (
                          rec.machines.map((m, i) => (
                            <span
                              key={i}
                              className='text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600'
                            >
                              {m.name}
                            </span>
                          ))
                        ) : (
                          <span className='text-slate-400 text-xs italic'>
                            N/A
                          </span>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase  ${rec.type === "requested" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
                      >
                        {rec.type === "requested" ? "Emergency" : "Preventive"}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-center'>
                      {rec.visitRating ? (
                        <div className='flex justify-center items-center gap-1'>
                          <span className='text-sm font-bold text-teal-600 dark:text-teal-400'>
                            {rec.visitRating}
                          </span>
                          <StarIconSolid className='w-3.5 h-3.5 text-amber-400' />
                        </div>
                      ) : (
                        <span className='text-slate-300'>-</span>
                      )}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-col gap-1'>
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${rec.problemSolved ? "text-teal-600" : "text-amber-600"}`}
                        >
                          {rec.problemSolved ? (
                            <CheckCircleIcon className='w-4 h-4' />
                          ) : (
                            <ExclamationTriangleIcon className='w-4 h-4' />
                          )}
                          {rec.problemSolved ? "Resolved" : "Needs Work"}
                        </div>
                        {rec.followUpVisits &&
                          rec.followUpVisits.length > 0 && (
                            <div className='text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-200/50 w-fit flex items-center gap-1'>
                              <ClipboardDocumentCheckIcon className='w-3 h-3' />
                              Follow-up Required
                            </div>
                          )}
                      </div>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className='text-slate-400 group-hover:text-teal-600 transition-colors p-2 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/20'
                        title='View Details'
                      >
                        <MagnifyingGlassIcon className='w-5 h-5' />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center'>
                    <div className='text-slate-300 mb-2 whitespace-pre-wrap'>
                      No records match your filters.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Section */}
        <div className='p-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-700'>
          <div>Showing {filteredRecords.length} maintenance visits</div>
          <div className='flex items-center gap-2'>
            <button
              className='px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-50'
              disabled
            >
              Previous
            </button>
            <span className='font-bold text-slate-900 dark:text-white'>1</span>
            <button
              className='px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-50'
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300'>
          <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col xl:scale-100 scale-95 transition-transform'>
            {/* Modal Header */}
            <div className='px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50'>
              <div>
                <h4 className='font-bold text-slate-900 dark:text-white'>
                  Visit Details
                </h4>
                <p className='text-xs text-slate-500'>
                  {selectedRecord.maintenanceDate} •{" "}
                  {selectedRecord.type === "requested"
                    ? "Emergency"
                    : "Preventive"}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className='p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors'
              >
                <XMarkIcon className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Body */}
            <div className='p-6 overflow-y-auto space-y-6 custom-scrollbar'>
              {/* Machines Section */}
              {selectedRecord.machines &&
                selectedRecord.machines.length > 0 && (
                  <section>
                    <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3'>
                      Machines Maintained
                    </h5>
                    <div className='flex flex-wrap gap-2'>
                      {selectedRecord.machines.map((m, i) => (
                        <div
                          key={i}
                          className='flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600'
                        >
                          <WrenchScrewdriverIcon className='w-4 h-4 text-teal-500' />
                          <span className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
                            {m.name}
                          </span>
                          <span className='text-xs bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-slate-500'>
                            x{m.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Services Section */}
                {selectedRecord.servicesPerformed &&
                  selectedRecord.servicesPerformed.length > 0 && (
                    <section>
                      <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3'>
                        Services Performed
                      </h5>
                      <ul className='space-y-2'>
                        {selectedRecord.servicesPerformed.map((s, i) => (
                          <li
                            key={i}
                            className='flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-700'
                          >
                            <span className='text-slate-700 dark:text-slate-300'>
                              {s.name}
                            </span>
                            <span className='text-xs font-bold text-teal-600'>
                              x{s.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                {/* Parts Section */}
                {selectedRecord.partsReplaced &&
                  selectedRecord.partsReplaced.length > 0 && (
                    <section>
                      <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3'>
                        Parts Replaced
                      </h5>
                      <ul className='space-y-2'>
                        {selectedRecord.partsReplaced.map((p, i) => (
                          <li
                            key={i}
                            className='flex items-center justify-between text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-700/50'
                          >
                            <span className='text-slate-700 dark:text-slate-300'>
                              {p.name}
                            </span>
                            <span className='text-xs font-bold text-amber-600'>
                              x{p.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
              </div>

              {/* Problems & Notes */}
              <section className='space-y-4'>
                <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-2'>
                  Observations & Results
                </h5>

                {selectedRecord.problems &&
                  selectedRecord.problems.length > 0 && (
                    <div>
                      <p className='text-xs font-bold text-slate-500 mb-2'>
                        Identified Issues:
                      </p>
                      <div className='flex flex-wrap gap-1.5'>
                        {selectedRecord.problems.map((p, i) => (
                          <span
                            key={i}
                            className='text-[10px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-md border border-red-100 dark:border-red-900/50'
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedRecord.notes && (
                  <div>
                    <p className='text-xs font-bold text-slate-500 mb-2'>
                      Maintenance Notes:
                    </p>
                    <div className='text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-4 rounded-xl italic'>
                      "{selectedRecord.notes}"
                    </div>
                  </div>
                )}

                {selectedRecord.recommendations && (
                  <div>
                    <p className='text-xs font-bold text-slate-500 mb-2'>
                      Technician's Recommendations:
                    </p>
                    <div className='text-sm text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50'>
                      {selectedRecord.recommendations}
                    </div>
                  </div>
                )}
              </section>

              <div className='grid grid-cols-2 gap-4 pt-4'>
                <div className='p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700'>
                  <p className='text-[10px] font-bold text-slate-400 uppercase mb-1'>
                    Status
                  </p>
                  <p
                    className={`text-sm font-bold ${selectedRecord.problemSolved ? "text-teal-600" : "text-amber-600"}`}
                  >
                    {selectedRecord.problemSolved
                      ? "Successfully Resolved"
                      : "Partially Resolved / Pending"}
                  </p>
                </div>
                <div className='p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700'>
                  <p className='text-[10px] font-bold text-slate-400 uppercase mb-1'>
                    Visit Rating
                  </p>
                  <p className='text-sm font-bold text-slate-900 dark:text-white'>
                    {selectedRecord.visitRating
                      ? `${selectedRecord.visitRating} / 5`
                      : "Not Rated"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='px-6 py-4 border-t border-slate-100 dark:border-slate-700 text-right'>
              <button
                onClick={() => setSelectedRecord(null)}
                className='px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-95 px-8'
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaristaDetailsPage;
