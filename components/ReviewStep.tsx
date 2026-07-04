import React, { useState } from "react";
import {
  FormData,
  Contact,
  MaintenanceRecord,
  Part,
  Branch,
  Service,
  PartRecord,
  ServiceRecord,
} from "../types";
import Card from "./Card";
import Avatar from "./Avatar";
import { StarIcon } from "@heroicons/react/24/solid";
import CostBreakdownModal from "./CostBreakdownModal";

interface ReviewStepProps {
  formData: FormData;
  partsList: Part[];
  servicesList: Service[];
  embedded?: boolean;
}

const visitZoneFees: Record<"cairo" | "outside_cairo" | "el_sahel", number> = {
  cairo: 500,
  outside_cairo: 1500,
  el_sahel: 4000,
};

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) =>
  value || value === 0 || value === "لا" || value === "نعم" ? (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100 sm:col-span-2 sm:mt-0 break-words">
        {value}
      </dd>
    </div>
  ) : null;

const ContactReview: React.FC<{ contacts: Contact[] }> = ({ contacts }) => {
  if (!contacts || contacts.length === 0) {
    return <Detail label="Contacts" value="No contacts provided." />;
  }

  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Contacts
      </dt>
      <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100 sm:col-span-2 sm:mt-0 space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id}>
            <p className="font-semibold">{contact.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">
              {contact.position === "custom"
                ? contact.customPosition
                : contact.position.replace("_", " ")}
            </p>
            <ul className="mt-1 space-y-1">
              {contact.phoneNumbers.map((phone) => (
                <li
                  key={phone.id}
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  {phone.number}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </dd>
    </div>
  );
};

const getMachineOwnershipStatus = (entity: {
  usesOurMachines: boolean | null;
  machineOwnershipType?: "bought" | "leased";
  dailyLeaseCost?: number;
}) => {
  if (
    entity.usesOurMachines === null ||
    typeof entity.usesOurMachines === "undefined"
  ) {
    return "Not specified";
  }
  if (entity.usesOurMachines === false) {
    return "لا";
  }
  if (entity.usesOurMachines === true) {
    if (entity.machineOwnershipType) {
      const type =
        entity.machineOwnershipType.charAt(0).toUpperCase() +
        entity.machineOwnershipType.slice(1);
      let status = `Yes (${type})`;
      if (entity.machineOwnershipType === "leased" && entity.dailyLeaseCost) {
        status += ` - ${new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(entity.dailyLeaseCost)} / day`;
      }
      return status;
    }
    return "Yes (Acquisition type not specified)";
  }
  return "Not specified";
};

const MaintenanceRecordReview: React.FC<{
  record: MaintenanceRecord;
  partsList: Part[];
  servicesList: Service[];
  isFollowUp?: boolean;
}> = ({ record, partsList, servicesList, isFollowUp = false }) => {
  if (!record) return null;

  const getPartCost = (part: PartRecord): number => {
    if (part.cost !== undefined) return part.cost;
    return partsList.find((p) => p.value === part.name)?.cost || 0;
  };
  const getServiceCost = (service: ServiceRecord): number => {
    if (service.cost !== undefined) return service.cost;
    return servicesList.find((s) => s.value === service.name)?.cost || 0;
  };

  const calculateRecordTotal = (rec: MaintenanceRecord): number => {
    const visitFee = rec.visitZone ? visitZoneFees[rec.visitZone] : 0;

    const partsCost =
      rec.partsWereReplaced && rec.partsReplaced
        ? rec.partsReplaced
            .filter((p) => !p.paidByClient)
            .reduce(
              (subTotal, part) => subTotal + getPartCost(part) * part.count,
              0,
            )
        : 0;

    const servicesCost = rec.servicesPerformed
      ? rec.servicesPerformed
          .filter((s) => !s.paidByClient)
          .reduce(
            (subTotal, service) =>
              subTotal + getServiceCost(service) * service.count,
            0,
          )
      : 0;

    const followUpsCost = (rec.followUpVisits || []).reduce(
      (total, followUp) => total + calculateRecordTotal(followUp),
      0,
    );
    return visitFee + partsCost + servicesCost + followUpsCost;
  };

  const singleRecordPartsCost = (record.partsReplaced || [])
    .filter((p) => !p.paidByClient)
    .reduce((subTotal, part) => subTotal + getPartCost(part) * part.count, 0);

  const singleRecordServicesCost = (record.servicesPerformed || [])
    .filter((s) => !s.paidByClient)
    .reduce(
      (subTotal, service) => subTotal + getServiceCost(service) * service.count,
      0,
    );

  const singleRecordVisitFee = record.visitZone
    ? visitZoneFees[record.visitZone]
    : 0;
  const singleRecordTotal =
    singleRecordVisitFee + singleRecordPartsCost + singleRecordServicesCost;

  const totalCostForThisAndChildren = calculateRecordTotal(record);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(value);

  const getVisitZoneLabel = (zone: string | null) => {
    if (!zone) return "Not Specified";
    switch (zone) {
      case "cairo":
        return "القاهرة الكبرى";
      case "outside_cairo":
        return "خارج القاهرة";
      case "el_sahel":
        return "الساحل الشمالي";
      default:
        return zone;
    }
  };

  return (
    <div
      className={`p-3 my-2 border dark:border-slate-600 rounded-md ${isFollowUp ? "bg-slate-100/50 dark:bg-slate-800/40" : "bg-slate-50/50 dark:bg-slate-800/20"}`}
    >
      <div className="flex justify-between items-center">
        <h5 className="font-semibold text-slate-700 dark:text-slate-300">
          {isFollowUp ? "Follow-up Visit:" : "Record from"}{" "}
          {record.maintenanceDate}
        </h5>
        {record.nextVisitDate && (
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
            Next Visit: {record.nextVisitDate}
          </span>
        )}
      </div>
      <dl className="mt-2 text-xs divide-y divide-slate-200 dark:divide-slate-700">
        <Detail label="الموظفون" value={record.baristaName} />
        <Detail label="النوع" value={record.type} />
        <Detail
          label="Daily Lease Cost"
          value={
            record.dailyLeaseCost
              ? `${formatCurrency(record.dailyLeaseCost)}`
              : null
          }
        />
        <Detail
          label="Problem Reported"
          value={record.hadProblem ? "نعم" : "لا"}
        />
        {record.hadProblem && (
          <>
            <Detail
              label="تم حل المشكلة"
              value={record.problemSolved ? "نعم" : "لا"}
            />
            <Detail
              label="Parts Replaced"
              value={record.partsWereReplaced ? "نعم" : "لا"}
            />
          </>
        )}
        {record.problems && record.problems.length > 0 && (
          <Detail
            label="Identified Issues"
            value={
              <ul className="list-disc pl-5">
                {record.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            }
          />
        )}
        <Detail label="Recommendations" value={record.recommendations} />
        <Detail label="Notes" value={record.notes} />
        <Detail
          label="الدفع بواسطة"
          value={record.paidBy === "company" ? "Mido's" : "الشركة"}
        />

        {record.machines && record.machines.length > 0 && (
          <Detail
            label="Machines Maintained"
            value={
              <ul className="list-disc pl-5">
                {record.machines.map((m) => (
                  <li key={m.id}>
                    {m.count > 1 ? `${m.count}x ` : ""}
                    {m.name}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {record.supervisors && record.supervisors.length > 0 && (
          <Detail
            label="Supervisors"
            value={
              <ul className="space-y-2">
                {record.supervisors.map((s) => (
                  <li
                    key={s.id}
                    className="border-l-2 pl-2 border-slate-200 dark:border-slate-600"
                  >
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs">{s.phone}</p>
                  </li>
                ))}
              </ul>
            }
          />
        )}

        <div className="pt-3 mt-3 border-t dark:border-slate-700">
          <h6 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Cost Breakdown for this Visit
          </h6>
          <dl className="mt-1 text-xs">
            <Detail
              label="Visit Zone & Fee"
              value={`${getVisitZoneLabel(record.visitZone)} (${formatCurrency(singleRecordVisitFee)})`}
            />
            {record.servicesPerformed &&
              record.servicesPerformed.length > 0 && (
                <Detail
                  label="Services Performed"
                  value={
                    <ul className="list-disc pl-5">
                      {record.servicesPerformed.map((s) => (
                        <li key={s.name}>
                          {s.count}x {s.name}{" "}
                          {s.paidByClient && (
                            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                              (Paid by Client)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  }
                />
              )}
            <Detail
              label="Total Services Cost"
              value={formatCurrency(singleRecordServicesCost)}
            />

            {record.partsReplaced && record.partsReplaced.length > 0 && (
              <Detail
                label="Parts Used"
                value={
                  <ul className="list-disc pl-5">
                    {record.partsReplaced.map((p) => (
                      <li key={p.name}>
                        {p.count}x {p.name}{" "}
                        {p.paidByClient && (
                          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                            (Paid by Client)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}
            <Detail
              label="Total Parts Cost"
              value={formatCurrency(singleRecordPartsCost)}
            />

            <Detail
              label="This Visit Total"
              value={
                <span className="font-bold text-base text-slate-800 dark:text-slate-200">
                  {formatCurrency(singleRecordTotal)}
                </span>
              }
            />
          </dl>
        </div>
        {record.followUpVisits && record.followUpVisits.length > 0 && (
          <div className="pl-4 mt-2 pt-2 border-t dark:border-slate-600">
            <h6 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Follow-up Visits:
            </h6>
            <div className="space-y-2 mt-1">
              {record.followUpVisits.map((followUp) => (
                <MaintenanceRecordReview
                  key={followUp.id}
                  record={followUp}
                  partsList={partsList}
                  servicesList={servicesList}
                  isFollowUp={true}
                />
              ))}
            </div>
          </div>
        )}
        {!isFollowUp && (record.followUpVisits || []).length > 0 && (
          <Detail
            label="Total For Issue (incl. follow-ups)"
            value={
              <span className="font-bold text-lg text-teal-800 dark:text-teal-300">
                {formatCurrency(totalCostForThisAndChildren)}
              </span>
            }
          />
        )}
      </dl>
    </div>
  );
};

const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  partsList,
  servicesList,
  embedded = false,
}) => {
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);

  const getPartCost = (part: PartRecord): number => {
    if (part.cost !== undefined) return part.cost;
    return partsList.find((p) => p.value === part.name)?.cost || 0;
  };

  const getServiceCost = (service: ServiceRecord): number => {
    if (service.cost !== undefined) return service.cost;
    return servicesList.find((s) => s.value === service.name)?.cost || 0;
  };

  const calculateRecordTreeCost = (record: MaintenanceRecord): number => {
    const visitFee = record.visitZone ? visitZoneFees[record.visitZone] : 0;

    const partsCost =
      record.partsWereReplaced && record.partsReplaced
        ? record.partsReplaced
            .filter((p) => !p.paidByClient)
            .reduce(
              (subTotal, part) => subTotal + getPartCost(part) * part.count,
              0,
            )
        : 0;

    const servicesCost = record.servicesPerformed
      ? record.servicesPerformed
          .filter((s) => !s.paidByClient)
          .reduce(
            (subTotal, service) =>
              subTotal + getServiceCost(service) * service.count,
            0,
          )
      : 0;

    const followUpsCost = (record.followUpVisits || []).reduce(
      (total, followUp) => total + calculateRecordTreeCost(followUp),
      0,
    );

    return visitFee + partsCost + servicesCost + followUpsCost;
  };

  const calculateTotalMaintenanceCost = (
    records: MaintenanceRecord[],
  ): number => {
    return records.reduce(
      (total, record) => total + calculateRecordTreeCost(record),
      0,
    );
  };

  const totalMaintenanceCost =
    calculateTotalMaintenanceCost(formData.maintenanceHistory) +
    formData.branches.reduce(
      (acc, branch) =>
        acc + calculateTotalMaintenanceCost(branch.maintenanceHistory),
      0,
    );
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(value);

  const Content = () => (
    <div className="space-y-8">
      {/* Main Company Info */}
      <section>
        <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400 border-b dark:border-slate-600 pb-2 mb-3">
          Company Details
        </h3>
        <dl className="divide-y divide-slate-200 dark:divide-slate-700">
          <Detail label="اسم الشركة" value={formData.companyName} />
          <Detail label="Email" value={formData.email} />
          <Detail label="الرقم الضريبي" value={formData.taxNumber} />
          <Detail label="الموقع" value={formData.location} />
          <ContactReview contacts={formData.contacts} />
          <Detail
            label="Has Branches"
            value={formData.hasBranches ? "نعم" : "لا"}
          />
          {formData.hasBranches === false && (
            <Detail
              label="Using Our Machines"
              value={getMachineOwnershipStatus(formData)}
            />
          )}
        </dl>
      </section>

      {/* Branches */}
      {formData.hasBranches && formData.branches.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400 border-b dark:border-slate-600 pb-2 mb-3">
            Branches
          </h3>
          <div className="space-y-4">
            {formData.branches.map((branch, index) => (
              <div
                key={branch.id}
                className="p-4 border dark:border-slate-700 rounded-lg bg-slate-50/70 dark:bg-slate-800/30"
              >
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  {formData.companyName}
                  {branch.branchName
                    ? ` ${branch.branchName}`
                    : ` (Branch ${index + 1})`}
                </h4>
                <dl className="divide-y divide-slate-200 dark:divide-slate-700">
                  <Detail
                    label="Branch Specific Name"
                    value={branch.branchName || "N/A"}
                  />
                  <Detail label="Email" value={branch.email} />
                  <Detail label="الرقم الضريبي" value={branch.taxNumber} />
                  <Detail label="الموقع" value={branch.location} />
                  <ContactReview contacts={branch.contacts} />
                  <Detail
                    label="Using Our Machines"
                    value={getMachineOwnershipStatus(branch)}
                  />
                </dl>
                {branch.baristas && branch.baristas.length > 0 && (
                  <div className="mt-4 pt-3 border-t dark:border-slate-700">
                    <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Baristas at this Branch:
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {branch.baristas.map((barista) => (
                        <div
                          key={barista.id}
                          className="flex flex-col items-center text-center p-2 rounded-lg bg-white/50 dark:bg-slate-900/20"
                        >
                          <Avatar name={barista.name} />
                          <p className="font-medium text-slate-800 dark:text-slate-100 text-sm mt-2">
                            {barista.name}
                          </p>
                          <div className="flex mt-1">
                            {Array.from({ length: barista.rating }).map(
                              (_, i) => (
                                <StarIcon
                                  key={i}
                                  className="h-4 w-4 text-yellow-400"
                                />
                              ),
                            )}
                            {Array.from({ length: 5 - barista.rating }).map(
                              (_, i) => (
                                <StarIcon
                                  key={i}
                                  className="h-4 w-4 text-slate-300 dark:text-slate-600"
                                />
                              ),
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Warehouse */}
      <section>
        <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400 border-b dark:border-slate-600 pb-2 mb-3">
          Warehouse
        </h3>
        <dl className="divide-y divide-slate-200 dark:divide-slate-700">
          <Detail
            label="الموقع"
            value={formData.warehouse.location || "Not specified"}
          />
          <ContactReview contacts={formData.warehouse.contacts} />
        </dl>
      </section>

      {/* Baristas */}
      {formData.baristas.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400 border-b dark:border-slate-600 pb-2 mb-3">
            Baristas (Main Office)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.baristas.map((barista) => (
              <div
                key={barista.id}
                className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <Avatar name={barista.name} />
                <p className="font-medium text-slate-800 dark:text-slate-100 text-sm mt-2">
                  {barista.name}
                </p>
                <div className="flex mt-1">
                  {Array.from({ length: barista.rating }).map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
                  ))}
                  {Array.from({ length: 5 - barista.rating }).map((_, i) => (
                    <StarIcon
                      key={i}
                      className="h-4 w-4 text-slate-300 dark:text-slate-600"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Maintenance */}
      <section>
        <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400 border-b dark:border-slate-600 pb-2 mb-3">
          Maintenance
        </h3>
        {formData.maintenanceHistory.length === 0 &&
        formData.branches.every((b) => b.maintenanceHistory.length === 0) ? (
          <dl className="divide-y divide-slate-200 dark:divide-slate-700">
            <Detail label="History" value="No maintenance records found." />
          </dl>
        ) : (
          <>
            {formData.maintenanceHistory.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Main Office Records
                </h4>
                {formData.maintenanceHistory.map((record) => (
                  <MaintenanceRecordReview
                    key={record.id}
                    record={record}
                    partsList={partsList}
                    servicesList={servicesList}
                  />
                ))}
              </div>
            )}
            {formData.branches.map(
              (branch, index) =>
                branch.maintenanceHistory.length > 0 && (
                  <div key={branch.id} className="mb-4">
                    <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      {formData.companyName}
                      {branch.branchName
                        ? ` ${branch.branchName}`
                        : ` (Branch ${index + 1})`}{" "}
                      Records
                    </h4>
                    {branch.maintenanceHistory.map((record) => (
                      <MaintenanceRecordReview
                        key={record.id}
                        record={record}
                        partsList={partsList}
                        servicesList={servicesList}
                      />
                    ))}
                  </div>
                ),
            )}
            <div className="mt-4 p-4 rounded-lg bg-teal-50/50 dark:bg-teal-900/20">
              <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total Maintenance Cost
                </dt>
                <dd className="mt-1 text-slate-900 dark:text-slate-100 sm:col-span-2 sm:mt-0 flex justify-between items-center">
                  <span className="font-bold text-teal-800 dark:text-teal-300 text-base">
                    {formatCurrency(totalMaintenanceCost)}
                  </span>
                  {totalMaintenanceCost > 0 && (
                    <button
                      onClick={() => setIsCostModalOpen(true)}
                      className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-500 transition-colors transform active:scale-95"
                    >
                      View Details
                    </button>
                  )}
                </dd>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );

  return (
    <>
      {embedded ? (
        <div className="animate-content-fade-in">
          <Content />
        </div>
      ) : (
        <Card title="Review Your Submission">
          <Content />
        </Card>
      )}

      <CostBreakdownModal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        formData={formData}
        partsList={partsList}
        servicesList={servicesList}
      />
    </>
  );
};

export default ReviewStep;
