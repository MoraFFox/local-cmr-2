/** @format */

import React, { useState, useCallback, useMemo } from "react";
import type {
  FormData,
  Barista,
  ClientBarista,
  MaintenanceRecord,
  Contact,
  Branch,
} from "../../types";

import Stepper from "../../components/ui/Stepper";
import Button from "../../components/ui/Button";
import NavigationButtons from "../../components/NavigationButtons";
import ReviewStep from "../../components/ReviewStep";
import {
  EyeIcon, EyeSlashIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

import { partsList, servicesList } from "../../constants";
import {
  initialFormData, steps, getNewMaintenanceRecord,
} from "../../utils/sharedConstants";
import { formatPhoneNumber } from "../../utils/mappers";
import { useAiNotes } from "../../hooks/useAiNotes";

import { Step1_CompanyInfo } from "./wizard/Step1_CompanyInfo";
import { Step2_Branches } from "./wizard/Step2_Branches";
import { Step3_Warehouse } from "./wizard/Step3_Warehouse";
import { Step4_Baristas } from "./wizard/Step4_Baristas";
import { Step4_5_ClientBaristas } from "./wizard/Step4_5_ClientBaristas";
import { Step5_MaintenanceHistory } from "./wizard/Step5_MaintenanceHistory";
import { Step6_Review } from "./wizard/Step6_Review";
import type { ContactPath, WizardStepActions, WizardStepProps } from "./wizard/types";

interface Draft {
  id: string;
  timestamp: number;
  formData: FormData;
  currentStep: number;
}

export interface FormWizardViewProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  currentDraftId: string | null;
  setCurrentDraftId: React.Dispatch<React.SetStateAction<string | null>>;
  drafts: Draft[];
  setDrafts: React.Dispatch<React.SetStateAction<Draft[]>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
  setSubmissions: React.Dispatch<React.SetStateAction<any[]>>;
  refreshSubmissions: () => void;
  createSubmission: (formData: FormData) => Promise<boolean>;
}

const FormWizardView: React.FC<FormWizardViewProps> = ({
  formData, setFormData, currentStep, setCurrentStep,
  setView, refreshSubmissions, createSubmission,
}) => {
  const [newlyAddedId, setNewlyAddedId] = useState<number | string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ── Aggregated barista names ──
  const allKnownBaristaNames = useMemo(() => {
    const names = new Set<string>();
    formData.baristas.forEach((b) => names.add(b.name));
    formData.branches.forEach((br) => br.baristas.forEach((b) => names.add(b.name)));
    return Array.from(names);
  }, [formData.baristas, formData.branches]);

  // ── Auto-clear newlyAddedId ──
  React.useEffect(() => {
    if (newlyAddedId) {
      const timer = setTimeout(() => setNewlyAddedId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedId]);

  // ── Visible steps ──
  const visibleSteps = useMemo(
    () => formData.hasBranches
      ? steps.filter((s) => s.id !== 4 && s.id !== 5)
      : steps.filter((s) => s.id !== 2),
    [formData.hasBranches],
  );

  // ── Navigation ──
  const handleNext = useCallback(() => {
    const ci = visibleSteps.findIndex((s) => s.id === currentStep);
    if (ci < visibleSteps.length - 1) setCurrentStep(visibleSteps[ci + 1].id);
  }, [visibleSteps, currentStep, setCurrentStep]);

  const handlePrev = useCallback(() => {
    const ci = visibleSteps.findIndex((s) => s.id === currentStep);
    if (ci > 0) setCurrentStep(visibleSteps[ci - 1].id);
  }, [visibleSteps, currentStep, setCurrentStep]);

  // ── Generic form handler ──
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      if (name.includes(".")) {
        const [parent, child] = name.split(".");
        setFormData((prev) => ({ ...prev, [parent]: { ...(prev[parent as keyof FormData] as object), [child]: value } }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
      }
    }, [setFormData]);

  const handleRadioChange = useCallback((name: string, value: unknown) => {
    setFormData((prev) => {
      const newState = { ...prev, [name]: value } as FormData;
      if (name === "hasBranches" && value === true) {
        newState.baristas = []; newState.maintenanceHistory = [];
        newState.usesOurMachines = null; newState.machineOwnershipType = undefined; newState.dailyLeaseCost = undefined;
      } else if (name === "hasBranches") { newState.branches = []; newState.branchCount = 0; }
      if (name === "usesOurMachines" && value === false) { newState.machineOwnershipType = undefined; newState.dailyLeaseCost = undefined; }
      if (name === "machineOwnershipType" && value !== "leased") { newState.dailyLeaseCost = undefined; }
      return newState;
    });
  }, [setFormData]);

  // ── Contact helpers ──
  const getContactsFromPath = useCallback((prev: FormData, path: ContactPath): Contact[] => {
    if (path === "main") return [...prev.contacts];
    if (path === "warehouse") return [...prev.warehouse.contacts];
    return [...prev.branches[parseInt(path.split("-")[1], 10)].contacts];
  }, []);

  const setContactsForPath = useCallback((prev: FormData, path: ContactPath, contacts: Contact[]): FormData => {
    if (path === "main") return { ...prev, contacts };
    if (path === "warehouse") return { ...prev, warehouse: { ...prev.warehouse, contacts } };
    const bi = parseInt(path.split("-")[1], 10);
    const nb = [...prev.branches]; nb[bi] = { ...nb[bi], contacts };
    return { ...prev, branches: nb };
  }, []);

  const addContact = useCallback((path: ContactPath) => {
    const nc: Contact = { id: Date.now(), name: "", position: "manager", phoneNumbers: [{ id: Date.now(), number: "" }] };
    setNewlyAddedId(nc.id);
    setFormData((prev) => {
      if (path === "main") return { ...prev, contacts: [...prev.contacts, nc] };
      if (path === "warehouse") return { ...prev, warehouse: { ...prev.warehouse, contacts: [...prev.warehouse.contacts, nc] } };
      const bi = parseInt(path.split("-")[1], 10);
      const nb = [...prev.branches]; nb[bi] = { ...nb[bi], contacts: [...nb[bi].contacts, nc] };
      return { ...prev, branches: nb };
    });
  }, [setFormData]);

  const removeContact = useCallback((path: ContactPath, ci: number) => {
    setFormData((prev) => { const c = getContactsFromPath(prev, path); c.splice(ci, 1); return setContactsForPath(prev, path, c); });
  }, [setFormData, getContactsFromPath, setContactsForPath]);

  const handleContactChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, path: ContactPath, ci: number) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const c = getContactsFromPath(prev, path);
      c[ci] = { ...c[ci], [name]: value };
      if (name === "position" && value !== "custom") c[ci].customPosition = "";
      return setContactsForPath(prev, path, c);
    });
  }, [setFormData, getContactsFromPath, setContactsForPath]);

  const addPhoneNumber = useCallback((path: ContactPath, ci: number) => {
    setFormData((prev) => {
      const c = getContactsFromPath(prev, path);
      c[ci] = { ...c[ci], phoneNumbers: [...c[ci].phoneNumbers, { id: Date.now(), number: "" }] };
      return setContactsForPath(prev, path, c);
    });
  }, [setFormData, getContactsFromPath, setContactsForPath]);

  const removePhoneNumber = useCallback((path: ContactPath, ci: number, pi: number) => {
    setFormData((prev) => {
      const c = getContactsFromPath(prev, path);
      c[ci] = { ...c[ci], phoneNumbers: c[ci].phoneNumbers.filter((_, i) => i !== pi) };
      return setContactsForPath(prev, path, c);
    });
  }, [setFormData, getContactsFromPath, setContactsForPath]);

  const handlePhoneNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, path: ContactPath, ci: number, pi: number) => {
    const fv = formatPhoneNumber(e.target.value);
    setFormData((prev) => {
      const c = getContactsFromPath(prev, path);
      const pn = [...c[ci].phoneNumbers]; pn[pi] = { ...pn[pi], number: fv };
      c[ci] = { ...c[ci], phoneNumbers: pn };
      return setContactsForPath(prev, path, c);
    });
  }, [setFormData, getContactsFromPath, setContactsForPath]);

  // ── Submission ──
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    const ok = await createSubmission(formData);
    setIsSubmitting(false);
    if (ok) { refreshSubmissions(); setView("history"); setCurrentStep(1); setFormData(initialFormData); setShowPreview(false); }
  }, [formData, createSubmission, refreshSubmissions, setView, setCurrentStep, setFormData]);

  // ── AI Notes ──
  const { suggestBaristaNotes } = useAiNotes();

  // ── List item CRUD ──
  const addListItem = useCallback((ln: "branches" | "baristas" | "maintenanceHistory") => {
    const nid = Date.now(); setNewlyAddedId(nid);
    setFormData((prev) => {
      let ni: unknown;
      switch (ln) {
        case "branches": ni = { id: nid, branchName: `Branch ${prev.branches.length + 1}`, contacts: [], email: prev.email, location: prev.location, taxNumber: prev.taxNumber, usesOurMachines: null, baristas: [], clientBaristas: [], maintenanceHistory: [] }; break;
        case "baristas": ni = { id: nid, name: "", phone: "", notes: "" }; break;
        case "maintenanceHistory": ni = getNewMaintenanceRecord(nid); break;
      }
      return { ...prev, [ln]: [...prev[ln], ni] };
    });
  }, [setFormData]);

  const removeListItem = useCallback((ln: "branches" | "baristas" | "maintenanceHistory", i: number) => {
    setFormData((prev) => ({ ...prev, [ln]: prev[ln].filter((_, ii) => ii !== i) }));
  }, [setFormData]);

  const handleListItemChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, ln: "branches" | "baristas", i: number) => {
    const { name, value, type } = e.target; const checked = (e.target as HTMLInputElement).checked;
    const list = [...formData[ln]] as Record<string, unknown>[];
    list[i] = { ...list[i], [name]: type === "checkbox" ? checked : value };
    if (ln === "branches") { const item = list[i] as Record<string, unknown>; if (name === "usesOurMachines" && value === false) { delete item.machineOwnershipType; delete item.dailyLeaseCost; } if (name === "machineOwnershipType" && value !== "leased") { delete item.dailyLeaseCost; } }
    setFormData((prev) => ({ ...prev, [ln]: list }));
  }, [formData, setFormData]);

  const addNestedListItem = useCallback((bi: number, ln: "baristas" | "maintenanceHistory" | "clientBaristas") => {
    const nid = Date.now(); setNewlyAddedId(nid);
    setFormData((prev) => {
      const nb = [...prev.branches]; const br = { ...nb[bi] };
      if (ln === "baristas") { (br as Branch & { baristas: Barista[] }).baristas = [...br.baristas, { id: nid, name: "", phone: "", notes: "" }]; }
      else if (ln === "clientBaristas") { (br as Branch & { clientBaristas: ClientBarista[] }).clientBaristas = [...br.clientBaristas, { id: nid, name: "", phone: "", notes: "" }]; }
      else { br.maintenanceHistory = [...br.maintenanceHistory, getNewMaintenanceRecord(nid)]; }
      nb[bi] = br; return { ...prev, branches: nb };
    });
  }, [setFormData]);

  const removeNestedListItem = useCallback((bi: number, ln: "baristas" | "maintenanceHistory" | "clientBaristas", ii: number) => {
    setFormData((prev) => {
      const nb = [...prev.branches]; const br = { ...nb[bi] };
      br[ln] = br[ln].filter((_: unknown, i: number) => i !== ii); nb[bi] = br; return { ...prev, branches: nb };
    });
  }, [setFormData]);

  const handleNestedListItemChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, bi: number, ln: "baristas" | "clientBaristas", ii: number) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nb = [...prev.branches]; const br = { ...nb[bi] };
      const list = br[ln] as Record<string, unknown>[];
      list[ii] = { ...list[ii], [name]: value }; br[ln] = list; nb[bi] = br;
      return { ...prev, branches: nb };
    });
  }, [setFormData]);

  const handleClientBaristaChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, bi: number | null, i: number) => {
    const { name, value } = e.target;
    if (bi === null) {
      setFormData((prev) => { const u = [...(prev.clientBaristas || [])]; u[i] = { ...u[i], [name]: value }; return { ...prev, clientBaristas: u }; });
    } else {
      setFormData((prev) => {
        const nb = [...prev.branches]; const br = { ...nb[bi] };
        const cb = [...br.clientBaristas]; cb[i] = { ...cb[i], [name]: value };
        br.clientBaristas = cb; nb[bi] = br; return { ...prev, branches: nb };
      });
    }
  }, [setFormData]);

  const handleQuickAddClientBarista = useCallback((name: string, bi: number | null) => {
    const ncb: ClientBarista = { id: Date.now(), name, phone: "", notes: "Added from maintenance record" };
    if (bi === null) setFormData((prev) => ({ ...prev, clientBaristas: [...(prev.clientBaristas || []), ncb] }));
    else setFormData((prev) => { const nb = [...prev.branches]; nb[bi] = { ...nb[bi], clientBaristas: [...nb[bi].clientBaristas, ncb] }; return { ...prev, branches: nb }; });
  }, [setFormData]);

  const removeClientBarista = useCallback((bi: number | null, i: number) => {
    if (bi === null) setFormData((prev) => ({ ...prev, clientBaristas: (prev.clientBaristas || []).filter((_, ii) => ii !== i) }));
    else setFormData((prev) => { const nb = [...prev.branches]; nb[bi] = { ...nb[bi], clientBaristas: nb[bi].clientBaristas.filter((_, ii) => ii !== i) }; return { ...prev, branches: nb }; });
  }, [setFormData]);

  // ── WizardStepActions object ──
  const actions: WizardStepActions = useMemo(() => ({
    handleChange, handleRadioChange,
    addContact, removeContact, handleContactChange,
    addPhoneNumber, removePhoneNumber, handlePhoneNumberChange,
    addListItem, removeListItem, handleListItemChange,
    addNestedListItem, removeNestedListItem, handleNestedListItemChange,
    handleClientBaristaChange, handleQuickAddClientBarista, removeClientBarista,
    suggestBaristaNotes,
    addBlankClientBarista: (bi: number | null) => {
      const ncb: ClientBarista = { id: Date.now(), name: "", phone: "", notes: "" };
      if (bi === null) setFormData((prev) => ({ ...prev, clientBaristas: [...(prev.clientBaristas || []), ncb] }));
      else setFormData((prev) => { const nb = [...prev.branches]; nb[bi] = { ...nb[bi], clientBaristas: [...nb[bi].clientBaristas, ncb] }; return { ...prev, branches: nb }; });
    },
    replaceBaristas: (baristas: Barista[]) => setFormData((prev) => ({ ...prev, baristas })),
    onMainOfficeMaintenanceChange: (i: number, r: MaintenanceRecord) => {
      const nl = [...formData.maintenanceHistory]; nl[i] = r; setFormData((prev) => ({ ...prev, maintenanceHistory: nl }));
    },
    onBranchMaintenanceChange: (bi: number, ri: number, r: MaintenanceRecord) => {
      const nb = [...formData.branches]; const br = { ...nb[bi] };
      br.maintenanceHistory = [...br.maintenanceHistory]; br.maintenanceHistory[ri] = r;
      nb[bi] = br; setFormData((prev) => ({ ...prev, branches: nb }));
    },
    onBranchAiNotesApplied: (bi: number, bari: number, notes: string) => {
      const nb = [...formData.branches]; const br = { ...nb[bi] };
      const baristas = [...br.baristas]; baristas[bari] = { ...baristas[bari], notes };
      br.baristas = baristas; nb[bi] = br; setFormData((prev) => ({ ...prev, branches: nb }));
    },
    setNewlyAddedId,
  }), [
    handleChange, handleRadioChange,
    addContact, removeContact, handleContactChange,
    addPhoneNumber, removePhoneNumber, handlePhoneNumberChange,
    addListItem, removeListItem, handleListItemChange,
    addNestedListItem, removeNestedListItem, handleNestedListItemChange,
    handleClientBaristaChange, handleQuickAddClientBarista, removeClientBarista,
    suggestBaristaNotes, setFormData, formData.branches, formData.maintenanceHistory,
  ]);

  // ── Step props ──
  const stepProps: WizardStepProps = useMemo(() => ({
    formData, actions, newlyAddedId, isSubmitting, allKnownBaristaNames,
  }), [formData, actions, newlyAddedId, isSubmitting, allKnownBaristaNames]);

  // ── Completed steps for stepper ──
  const completedSteps = useMemo(() => steps.filter((s) => s.id < currentStep).map((s) => s.id), [currentStep]);

  // ── Render step ──
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <Step1_CompanyInfo {...stepProps} />;
      case 2: return <Step2_Branches {...stepProps} />;
      case 3: return <Step3_Warehouse {...stepProps} />;
      case 4: return <Step4_Baristas {...stepProps} />;
      case 4.5: return <Step4_5_ClientBaristas {...stepProps} />;
      case 5: return <Step5_MaintenanceHistory {...stepProps} />;
      case 6: return <Step6_Review {...stepProps} />;
      default: return <div>Unknown Step</div>;
    }
  };

  return (
    <div className="flex flex-col min-h-full w-full bg-background">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 relative flex-1 p-4 lg:p-6 pb-32">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6 bg-surface border border-default rounded-xl p-4 shadow-sm">
            <Stepper steps={visibleSteps} currentStep={currentStep} completedSteps={completedSteps} />
          </div>
        </aside>
        <div className="lg:hidden mb-4 bg-surface border border-default rounded-xl py-3 px-1 shadow-sm overflow-hidden">
          <Stepper steps={visibleSteps} currentStep={currentStep} completedSteps={completedSteps} onChange={setCurrentStep} layout="horizontal" />
        </div>
        <div className={`flex-1 transition-all duration-300 ${showPreview ? "lg:w-1/2" : "w-full"}`}>
          <div className="flex justify-end mb-4">
            <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              {showPreview ? "إخفاء المعاينة" : "معاينة حية"}
            </Button>
          </div>
          <div key={currentStep} className="animate-step-in-right">{renderStepContent()}</div>
        </div>
        {showPreview && (
          <div className="hidden lg:block w-1/2 border-r border-default pr-6 h-[calc(100vh-140px)] overflow-y-auto sticky top-4 animate-item-fade-in-down custom-scrollbar">
            <div className="sticky top-0 bg-background pt-2 pb-4 z-10 border-b border-default mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2"><EyeIcon className="w-4 h-4" /> معاينة حية</h3>
            </div>
            <div className="pb-10"><ReviewStep formData={formData} partsList={partsList} servicesList={servicesList} embedded={true} /></div>
          </div>
        )}
        {showPreview && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background overflow-y-auto animate-content-fade-in">
            <div className="sticky top-0 bg-surface p-4 border-b border-default flex justify-between items-center shadow-md">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2"><EyeIcon className="w-5 h-5 text-brand-red" /> معاينة حية</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 bg-surface-elevated rounded-full text-secondary hover:text-primary transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-4 pb-20"><ReviewStep formData={formData} partsList={partsList} servicesList={servicesList} embedded={true} /></div>
          </div>
        )}
      </div>
      <footer className="fixed lg:absolute bottom-6 left-0 right-0 z-30 w-[90%] mx-auto pointer-events-none flex justify-center">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-default/20 pointer-events-auto max-w-4xl w-full">
          <div className="w-full p-4">
            <NavigationButtons currentStep={currentStep} onPrev={handlePrev} onNext={currentStep === 6 ? handleSubmit : handleNext} isLastStep={currentStep === 6} isSubmitting={isSubmitting} />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FormWizardView;
