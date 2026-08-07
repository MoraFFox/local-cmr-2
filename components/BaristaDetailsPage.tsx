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
import { useT } from "../utils/i18n";
import { useLanguage } from "../utils/LanguageContext";

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
  const t = useT();
  const { language } = useLanguage();
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
    new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
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
        <UserIcon className='w-16 h-16 text-latte/70 mx-auto mb-4' />
        <h2 className='text-2xl font-bold text-primary dark:text-white'>
          {t.admin.baristaDetails.notFoundTitle}
        </h2>
        <button
          onClick={onBack}
          className='mt-4 text-primary font-bold hover:underline'
        >
          {t.admin.baristaDetails.goBack}
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
          className='p-2 min-w-[44px] min-h-[44px] rounded-full bg-cream dark:bg-espresso-light shadow-sm border border-hairline text-primary dark:text-latte/70 hover:text-primary dark:hover:text-primary-400 transition-colors flex items-center justify-center'
        >
          <ArrowLeftIcon className='w-5 h-5' />
        </button>
        <div>
          <h1 className='text-2xl font-bold text-primary dark:text-white'>
            {t.admin.baristaDetails.staffDetails}
          </h1>
          <p className='text-sm text-latte'>
            {t.admin.baristaDetails.subtitle.replace('{{name}}', baristaName)}
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className='bg-cream dark:bg-espresso-light rounded-2xl shadow-xl border border-hairline overflow-hidden'>
        <div className='p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center md:ltr:items-start rtl:items-end text-center md:text-start'>
          <Avatar
            name={baristaName}
            className='w-32 h-32 text-4xl shadow-sm border-4 border-cream dark:border-espresso-light'
          />

          <div className='flex-grow space-y-4'>
            <div className='flex flex-col md:flex-row md:items-center gap-2 md:gap-4'>
              <h2 className='text-3xl font-black text-primary dark:text-white tracking-tight'>
                {baristaName}
              </h2>
              {baristaProfile.isAutoDetected && (
                <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase gap-1'>
                  <SparklesIcon className='w-3 h-3' /> {t.admin.baristaDetails.autoDetected}
                </span>
              )}
            </div>

            <div className='flex flex-wrap items-center gap-6 justify-center md:justify-start'>
              <div className='flex items-center gap-2'>
                <span className='text-2xl font-bold text-primary dark:text-primary-400'>
                  {baristaProfile.averageVisitRating.toFixed(1)}
                </span>
                <div className='flex'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StarIconSolid
                      key={i}
                      className={`w-5 h-5 ${i <= Math.round(baristaProfile.averageVisitRating) ? "text-amber-400" : "text-latte/70"}`}
                    />
                  ))}
                </div>
                <span className='text-latte text-sm font-medium'>
                  {t.admin.baristaDetails.rating}
                </span>
              </div>
              <div className='h-6 w-px bg-cream-2 dark:bg-espresso-light hidden sm:block'></div>
              <div className='flex items-center gap-2'>
                <span className='text-xl font-bold text-primary dark:text-white'>
                  {baristaProfile.visitCount}
                </span>
                <span className='text-latte text-sm'>{t.admin.baristaDetails.totalVisits}</span>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-hairline'>
              <div>
                <p className='text-[10px] font-bold text-latte uppercase tracking-widest'>
                  {t.admin.baristaDetails.mainOfficeLastClient}
                </p>
                <p className='font-semibold text-primary dark:text-latte/70 truncate'>
                  {baristaProfile.companyName}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold text-latte uppercase tracking-widest'>
                  {t.admin.baristaDetails.companyPaidAccumulated}
                </p>
                <p className='font-mono font-bold text-amber-600 dark:text-amber-400'>
                  {formatCurrency(baristaProfile.companyCost)}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold text-latte uppercase tracking-widest'>
                  {t.admin.baristaDetails.clientPaidAccumulated}
                </p>
                <p className='font-mono font-bold text-primary dark:text-primary-400'>
                  {formatCurrency(baristaProfile.clientCost)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit History Section */}
      <div className='bg-cream dark:bg-espresso-light rounded-2xl shadow-lg border border-hairline overflow-hidden'>
        <div className='p-6 border-b border-hairline flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <h3 className='text-lg font-bold text-primary dark:text-white flex items-center gap-2'>
            <WrenchScrewdriverIcon className='w-5 h-5 text-primary' />
            {t.admin.baristaDetails.detailedVisitHistory}
          </h3>

          {/* Filters Toolbar */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
            <div className='relative w-full sm:w-auto'>
              <MagnifyingGlassIcon className='absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-latte' />
              <input
                type='text'
                placeholder={t.admin.baristaDetails.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full sm:w-auto ps-9 pe-3 py-2.5 text-base rounded-full border-hairline bg-slate-50 dark:bg-slate-900 text-primary dark:text-white focus:ring-primary focus:border-primary'
              />
            </div>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className='w-full sm:w-auto text-base rounded-full border-hairline bg-slate-50 dark:bg-slate-900 text-primary dark:text-latte/70 py-2.5 ps-3 pe-8 focus:ring-primary'
            >
              <option value='all'>{t.admin.baristaDetails.allClients}</option>
              {clientsList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className='w-full sm:w-auto text-base rounded-full border-hairline bg-slate-50 dark:bg-slate-900 text-primary dark:text-latte/70 py-2.5 ps-3 pe-8 focus:ring-primary'
            >
              <option value='all'>{t.admin.baristaDetails.allTypes}</option>
              <option value='scheduled'>{t.admin.baristaDetails.scheduled}</option>
              <option value='requested'>{t.admin.baristaDetails.requestedEmergency}</option>
            </select>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-start border-collapse'>
            <thead>
              <tr className='bg-cream/50 dark:bg-espresso/50 text-latte text-[11px] font-bold uppercase tracking-wider'>
                <th className='px-6 py-4'>{t.admin.baristaDetails.colDate}</th>
                <th className='px-6 py-4'>{t.admin.baristaDetails.colClientBranch}</th>
                <th className='px-6 py-4'>{t.admin.baristaDetails.colMachineAsset}</th>
                <th className='px-6 py-4'>{t.admin.baristaDetails.colType}</th>
                <th className='px-6 py-4 text-center'>{t.admin.baristaDetails.colRating}</th>
                <th className='px-6 py-4'>{t.admin.baristaDetails.colStatusFollowup}</th>
                <th className='px-6 py-4 text-end'>{t.admin.baristaDetails.colView}</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-hairline'>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className='hover:bg-cream dark:hover:bg-espresso/30 transition-colors group'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <CalendarIcon className='w-4 h-4 text-latte/70' />
                        <span className='text-sm text-primary dark:text-latte/70 font-medium'>
                          {rec.maintenanceDate}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='text-sm font-bold text-primary dark:text-white'>
                        {rec.companyName}
                      </div>
                      <div className='text-[10px] text-latte flex items-center gap-1'>
                        <MapPinIcon className='w-3 h-3' /> {rec.branchName}
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-wrap gap-1'>
                        {rec.machines && rec.machines.length > 0 ? (
                          rec.machines.map((m, i) => (
                            <span
                              key={i}
                              className='text-[10px] bg-cream-2 dark:bg-espresso-light text-slate-600 dark:text-latte/70 px-1.5 py-0.5 rounded border border-hairline'
                            >
                              {m.name}
                            </span>
                          ))
                        ) : (
                          <span className='text-latte text-xs italic'>
                            N/A
                          </span>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase  ${rec.type === "requested" ? "bg-ember-50 text-ember-700 dark:bg-ember-500/20 dark:text-ember-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
                      >
                        {rec.type === "requested" ? t.admin.baristaDetails.emergency : t.admin.baristaDetails.preventive}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-center'>
                      {rec.visitRating ? (
                        <div className='flex justify-center items-center gap-1'>
                          <span className='text-sm font-semibold text-primary dark:text-latte/70'>
                            {rec.visitRating}
                          </span>
                          <StarIconSolid className='w-3.5 h-3.5 text-amber-400' />
                        </div>
                      ) : (
                        <span className='text-latte/70'>-</span>
                      )}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-col gap-1'>
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${rec.problemSolved ? "text-leaf-600" : "text-amber-600"}`}
                        >
                          {rec.problemSolved ? (
                            <CheckCircleIcon className='w-4 h-4' />
                          ) : (
                            <ExclamationTriangleIcon className='w-4 h-4' />
                          )}
                          {rec.problemSolved ? t.admin.baristaDetails.resolved : t.admin.baristaDetails.needsWork}
                        </div>
                        {rec.followUpVisits &&
                          rec.followUpVisits.length > 0 && (
                            <div className='text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-200/50 w-fit flex items-center gap-1'>
                              <ClipboardDocumentCheckIcon className='w-3 h-3' />
                              {t.admin.baristaDetails.followUpRequired}
                            </div>
                          )}
                      </div>
                    </td>
                    <td className='px-6 py-4 text-end'>
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className='text-latte group-hover:text-primary transition-colors p-2 rounded-full hover:bg-cream-2 dark:hover:bg-primary/10'
                        title={t.admin.baristaDetails.viewDetailsTitle}
                      >
                        <MagnifyingGlassIcon className='w-5 h-5' />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center'>
                    <div className='text-latte/70 mb-2 whitespace-pre-wrap'>
                      {t.admin.baristaDetails.noRecordsMatch}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Section */}
        <div className='p-4 bg-cream dark:bg-espresso/50 flex items-center justify-between text-xs text-latte border-t border-hairline'>
          <div>{t.admin.baristaDetails.showingCount.replace('{{count}}', String(filteredRecords.length))}</div>
          <div className='flex items-center gap-2'>
            <button
              className='px-3 py-1 bg-cream dark:bg-espresso-light border border-hairline rounded-md disabled:opacity-50'
              disabled
            >
              {t.admin.baristaDetails.previous}
            </button>
            <span className='font-bold text-primary dark:text-white'>1</span>
            <button
              className='px-3 py-1 bg-cream dark:bg-espresso-light border border-hairline rounded-md disabled:opacity-50'
              disabled
            >
              {t.admin.baristaDetails.next}
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/60 backdrop-blur-sm animate-in fade-in duration-300'>
          <div className='bg-cream dark:bg-espresso-light rounded-2xl shadow-sm border border-hairline w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col xl:scale-100 scale-95 transition-transform'>
            {/* Modal Header */}
            <div className='px-6 py-4 border-b border-hairline flex items-center justify-between bg-cream/50 dark:bg-espresso/50'>
              <div>
                <h4 className='font-bold text-primary dark:text-white'>
                  {t.admin.baristaDetails.visitDetails}
                </h4>
                <p className='text-xs text-latte'>
                  {selectedRecord.maintenanceDate} •{" "}
                  {selectedRecord.type === "requested"
                    ? t.admin.baristaDetails.emergency
                    : t.admin.baristaDetails.preventive}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className='p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-latte transition-colors'
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
                    <h5 className='text-[10px] font-bold text-latte uppercase tracking-widest mb-3'>
                      {t.admin.baristaDetails.machinesMaintained}
                    </h5>
                    <div className='flex flex-wrap gap-2'>
                      {selectedRecord.machines.map((m, i) => (
                        <div
                          key={i}
                          className='flex items-center gap-2 bg-cream-2 dark:bg-espresso-light px-3 py-1.5 rounded-lg border border-hairline'
                        >
                          <WrenchScrewdriverIcon className='w-4 h-4 text-primary' />
                          <span className='text-sm font-semibold text-primary dark:text-latte/70'>
                            {m.name}
                          </span>
                          <span className='text-xs bg-cream-2 dark:bg-espresso-light px-1.5 py-0.5 rounded text-latte'>
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
                      <h5 className='text-[10px] font-bold text-latte uppercase tracking-widest mb-3'>
                        {t.admin.baristaDetails.servicesPerformed}
                      </h5>
                      <ul className='space-y-2'>
                        {selectedRecord.servicesPerformed.map((s, i) => (
                          <li
                            key={i}
                            className='flex items-center justify-between text-sm p-2 bg-cream dark:bg-espresso/50 rounded-md border border-hairline'
                          >
                            <span className='text-primary dark:text-latte/70'>
                              {s.name}
                            </span>
                            <span className='text-xs font-bold text-primary'>
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
                      <h5 className='text-[10px] font-bold text-latte uppercase tracking-widest mb-3'>
                        {t.admin.baristaDetails.partsReplaced}
                      </h5>
                      <ul className='space-y-2'>
                        {selectedRecord.partsReplaced.map((p, i) => (
                          <li
                            key={i}
                            className='flex items-center justify-between text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-700/50'
                          >
                            <span className='text-primary dark:text-latte/70'>
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
                <h5 className='text-[10px] font-bold text-latte uppercase tracking-widest border-b border-hairline pb-2'>
                  {t.admin.baristaDetails.observationsResults}
                </h5>

                {selectedRecord.problems &&
                  selectedRecord.problems.length > 0 && (
                    <div>
                      <p className='text-xs font-bold text-latte mb-2'>
                        {t.admin.baristaDetails.identifiedIssues}
                      </p>
                      <div className='flex flex-wrap gap-1.5'>
                        {selectedRecord.problems.map((p, i) => (
                          <span
                            key={i}
                            className='text-[10px] bg-ember-50 dark:bg-ember-500/10 text-ember-700 dark:text-ember-300 px-2 py-0.5 rounded-md border border-ember-500/30'
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedRecord.notes && (
                  <div>
                    <p className='text-xs font-bold text-latte mb-2'>
                      {t.admin.baristaDetails.maintenanceNotes}
                    </p>
                    <div className='text-sm text-primary dark:text-latte/70 bg-cream-2 dark:bg-espresso p-4 rounded-xl italic'>
                      "{selectedRecord.notes}"
                    </div>
                  </div>
                )}

                {selectedRecord.recommendations && (
                  <div>
                    <p className='text-xs font-bold text-latte mb-2'>
                      {t.admin.baristaDetails.techRecommendations}
                    </p>
                    <div className='text-sm text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50'>
                      {selectedRecord.recommendations}
                    </div>
                  </div>
                )}
              </section>

              <div className='grid grid-cols-2 gap-4 pt-4'>
                <div className='p-3 bg-cream dark:bg-espresso/50 rounded-xl border border-hairline'>
                  <p className='text-[10px] font-bold text-latte uppercase mb-1'>
                    {t.admin.baristaDetails.status}
                  </p>
                  <p
                    className={`text-sm font-bold ${selectedRecord.problemSolved ? "text-leaf-600" : "text-amber-600"}`}
                  >
                    {selectedRecord.problemSolved
                      ? t.admin.baristaDetails.successfullyResolved
                      : t.admin.baristaDetails.partiallyResolved}
                  </p>
                </div>
                <div className='p-3 bg-cream dark:bg-espresso/50 rounded-xl border border-hairline'>
                  <p className='text-[10px] font-bold text-latte uppercase mb-1'>
                    {t.admin.baristaDetails.visitRating}
                  </p>
                  <p className='text-sm font-bold text-primary dark:text-white'>
                    {selectedRecord.visitRating
                      ? `${selectedRecord.visitRating} / 5`
                      : t.admin.baristaDetails.notRated}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='px-6 py-4 border-t border-hairline text-end'>
              <button
                onClick={() => setSelectedRecord(null)}
                className='btn-primary px-6 py-2 font-bold rounded-xl transition-all px-8'
              >
                {t.admin.baristaDetails.closeDetails}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaristaDetailsPage;
