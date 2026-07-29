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
import { FormProgress } from "@/packages/form-progress";
import ReviewStep from "../../components/ReviewStep";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  EyeIcon, EyeSlashIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

import { partsList, servicesList } from "../../constants";
import {
  initialFormData, steps, getNewMaintenanceRecord,
} from "../../utils/sharedConstants";
import { generateUniqueId } from "../../utils/idGenerator";
import { formatPhoneNumber } from "../../utils/mappers";

import { Step1_CompanyInfo } from "./wizard/Step1_CompanyInfo";
import { Step2_Branches } from "./wizard/Step2_Branches";
import { Step3_Warehouse } from "./wizard/Step3_Warehouse";
import { Step4_Baristas } from "./wizard/Step4_Baristas";
import { Step4_5_ClientBaristas } from "./wizard/Step4_5_ClientBaristas";
import { Step5_MaintenanceHistory } from "./wizard/Step5_MaintenanceHistory";
import { Step6_Review } from "./wizard/Step6_Review";
import { WizardJumpContext } from "@/src/views/wizard/WizardJumpContext";
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
  setView: (view: any) => void;
  setSubmissions: React.Dispatch<React.SetStateAction<any[]>>;
  refreshSubmissions: () => Promise<void>;
  createSubmission: (formData: FormData) => Promise<boolean>;
  allKnownMachineNames?: string[];
  allKnownMachineTypes?: string[];
  allKnownMachineOptions?: string[];
}

const FormWizardView: React.FC<FormWizardViewProps> = ({
  formData, setFormData, currentStep, setCurrentStep, currentDraftId, setCurrentDraftId,
  drafts, setDrafts, setView, refreshSubmissions, createSubmission,
  allKnownMachineNames = [], allKnownMachineTypes = [], allKnownMachineOptions = [],
}) => {
  const [newlyAddedId, setNewlyAddedId] = useState<number | string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingJumpKey, setPendingJumpKey] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number>(450);
  const [isResizing, setIsResizing] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const wizardLayoutRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const pendingDeltaRef = React.useRef(0);

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
        newState.usesOurMachines = null; newState.machines = [];
      } else if (name === "hasBranches") { newState.branches = []; newState.branchCount = 0; }
      if (name === "usesOurMachines" && value === false) { newState.machines = []; }
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

  const addContact = useCallback((path: ContactPath, position: string = "manager") => {
    const nc: Contact = { id: generateUniqueId(), name: "", position, phoneNumbers: [{ id: generateUniqueId(), number: "" }] };
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
      c[ci] = { ...c[ci], phoneNumbers: [...c[ci].phoneNumbers, { id: generateUniqueId(), number: "" }] };
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

  // ── Form reset ──
  const handleResetForm = useCallback(() => {
    // Clean up auto-save draft from localStorage if one exists
    if (currentDraftId) {
      localStorage.removeItem(`auto-save-form-${currentDraftId}`);
    }
    setFormData(initialFormData);
    setCurrentStep(1);
    setCurrentDraftId(null);
    setShowResetConfirm(false);
  }, [currentDraftId, setFormData, setCurrentStep, setCurrentDraftId]);

  // ── Submission ──
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    const ok = await createSubmission(formData);
    setIsSubmitting(false);
    if (ok) { refreshSubmissions(); setView("history"); setCurrentStep(1); setFormData(initialFormData); setShowPreview(false); }
  }, [formData, createSubmission, refreshSubmissions, setView, setCurrentStep, setFormData]);

  // ── AI Notes ──

  // ── List item CRUD ──
  const addListItem = useCallback((ln: "branches" | "baristas" | "maintenanceHistory" | "machines") => {
    const nid = generateUniqueId(); setNewlyAddedId(nid);
    setFormData((prev) => {
      let ni: unknown;
      switch (ln) {
        case "branches": ni = { id: nid, branchName: `Branch ${prev.branches.length + 1}`, contacts: [], email: prev.email, location: prev.location, taxNumber: prev.taxNumber, usesOurMachines: null, machines: [], baristas: [], clientBaristas: [], maintenanceHistory: [] }; break;
        case "baristas": ni = { id: nid, name: "", phone: "", notes: "" }; break;
        case "maintenanceHistory": ni = getNewMaintenanceRecord(nid); break;
        case "machines": ni = { id: nid, machineName: "", machineType: "", machineOption: "", machineOwnershipType: "leased", dailyLeaseCost: 0 }; break;
      }
      return { ...prev, [ln]: [...prev[ln], ni] };
    });
  }, [setFormData]);

  const removeListItem = useCallback((ln: "branches" | "baristas" | "maintenanceHistory" | "machines", i: number) => {
    setFormData((prev) => ({ ...prev, [ln]: prev[ln].filter((_, ii) => ii !== i) }));
  }, [setFormData]);

  const handleListItemChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, ln: "branches" | "baristas" | "machines", i: number) => {
    const { name, value, type } = e.target; const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => {
      const list = [...prev[ln]] as Record<string, unknown>[];
      list[i] = { ...list[i], [name]: type === "checkbox" ? checked : value };
      if (ln === "branches") { const item = list[i] as Record<string, unknown>; if (name === "usesOurMachines" && value === false) { item.machines = []; } }
      if (ln === "machines" && name === "machineOwnershipType" && value !== "leased") { delete list[i].dailyLeaseCost; }
      return { ...prev, [ln]: list };
    });
  }, [setFormData]);

  const addNestedListItem = useCallback((bi: number, ln: "baristas" | "maintenanceHistory" | "clientBaristas" | "machines") => {
    const nid = generateUniqueId(); setNewlyAddedId(nid);
    setFormData((prev) => {
      const nb = [...prev.branches]; const br = { ...nb[bi] };
      if (ln === "baristas") { (br as Branch & { baristas: Barista[] }).baristas = [...br.baristas, { id: nid, name: "", phone: "", notes: "" }]; }
      else if (ln === "clientBaristas") { (br as Branch & { clientBaristas: ClientBarista[] }).clientBaristas = [...br.clientBaristas, { id: nid, name: "", phone: "", notes: "" }]; }
      else if (ln === "machines") { br.machines = [...(br.machines || []), { id: nid, machineName: "", machineType: "", machineOption: "", machineOwnershipType: "leased", dailyLeaseCost: 0 }]; }
      else { br.maintenanceHistory = [...br.maintenanceHistory, getNewMaintenanceRecord(nid)]; }
      nb[bi] = br; return { ...prev, branches: nb };
    });
  }, [setFormData]);

  const removeNestedListItem = useCallback((bi: number, ln: "baristas" | "maintenanceHistory" | "clientBaristas" | "machines", ii: number) => {
    setFormData((prev) => {
      const nb = [...prev.branches]; const br = { ...nb[bi] };
      br[ln] = br[ln].filter((_: unknown, i: number) => i !== ii); nb[bi] = br; return { ...prev, branches: nb };
    });
  }, [setFormData]);

  const handleNestedListItemChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, bi: number, ln: "baristas" | "clientBaristas" | "machines", ii: number) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nb = [...prev.branches]; const br = { ...nb[bi] };
      const list = [...(br[ln] as Record<string, unknown>[])];
      list[ii] = { ...list[ii], [name]: value }; 
      if (ln === "machines" && name === "machineOwnershipType" && value !== "leased") { delete list[ii].dailyLeaseCost; }
      br[ln] = list; nb[bi] = br;
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
    const ncb: ClientBarista = { id: generateUniqueId(), name, phone: "", notes: "Added from maintenance record" };
    if (bi === null) setFormData((prev) => ({ ...prev, clientBaristas: [...(prev.clientBaristas || []), ncb] }));
    else setFormData((prev) => { const nb = [...prev.branches]; nb[bi] = { ...nb[bi], clientBaristas: [...nb[bi].clientBaristas, ncb] }; return { ...prev, branches: nb }; });
  }, [setFormData]);

  const removeClientBarista = useCallback((bi: number | null, i: number) => {
    if (bi === null) setFormData((prev) => ({ ...prev, clientBaristas: (prev.clientBaristas || []).filter((_, ii) => ii !== i) }));
    else setFormData((prev) => { const nb = [...prev.branches]; nb[bi] = { ...nb[bi], clientBaristas: nb[bi].clientBaristas.filter((_, ii) => ii !== i) }; return { ...prev, branches: nb }; });
  }, [setFormData]);

  // ── Live preview resize handling ──
  const MIN_PREVIEW_WIDTH = 300;

  const getMaxPreviewWidth = useCallback(
    (containerWidth: number) => Math.max(MIN_PREVIEW_WIDTH, containerWidth - 400),
    [],
  );

  const clampPreviewWidth = useCallback(
    (w: number, containerWidth: number) => {
      const maxWidth = getMaxPreviewWidth(containerWidth);
      return Math.max(MIN_PREVIEW_WIDTH, Math.min(maxWidth, w));
    },
    [getMaxPreviewWidth],
  );

  // Measure container and clamp preview width on mount/resize.
  React.useEffect(() => {
    const update = () => {
      const container = wizardLayoutRef.current;
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      setContainerSize({ width, height });
      setPreviewWidth((prev) => clampPreviewWidth(prev, width));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [clampPreviewWidth]);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = wizardLayoutRef.current;
      if (!container) return;
      pendingDeltaRef.current += e.movementX;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const containerWidth = container.clientWidth;
        const maxWidth = Math.max(MIN_PREVIEW_WIDTH, containerWidth - 400);
        setPreviewWidth((prev) => Math.max(MIN_PREVIEW_WIDTH, Math.min(maxWidth, prev + pendingDeltaRef.current)));
        pendingDeltaRef.current = 0;
        rafRef.current = null;
      });
    };

    const handleMouseUp = () => setIsResizing(false);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isResizing]);

  // ── WizardStepActions object ──
  const actions: WizardStepActions = useMemo(() => ({
    handleChange, handleRadioChange,
    addContact, removeContact, handleContactChange,
    addPhoneNumber, removePhoneNumber, handlePhoneNumberChange,
    addListItem, removeListItem, handleListItemChange,
    addNestedListItem, removeNestedListItem, handleNestedListItemChange,
    handleClientBaristaChange, handleQuickAddClientBarista, removeClientBarista,
    
    addBlankClientBarista: (bi: number | null) => {
      const ncb: ClientBarista = { id: generateUniqueId(), name: "", phone: "", notes: "" };
      if (bi === null) setFormData((prev) => ({ ...prev, clientBaristas: [...(prev.clientBaristas || []), ncb] }));
      else setFormData((prev) => { const nb = [...prev.branches]; nb[bi] = { ...nb[bi], clientBaristas: [...nb[bi].clientBaristas, ncb] }; return { ...prev, branches: nb }; });
    },
    handleQuickAddBarista: (name: string, bi: number | null) => {
      const nb: Barista = { id: generateUniqueId(), name, phone: "", notes: "Added from maintenance record" };
      if (bi === null) setFormData((prev) => ({ ...prev, baristas: [...prev.baristas, nb] }));
      else setFormData((prev) => { const nbr = [...prev.branches]; nbr[bi] = { ...nbr[bi], baristas: [...nbr[bi].baristas, nb] }; return { ...prev, branches: nbr }; });
    },
    replaceBaristas: (baristas: Barista[]) => setFormData((prev) => ({ ...prev, baristas })),
    onMainOfficeMaintenanceChange: (i: number, r: MaintenanceRecord) => {
      setFormData((prev) => {
        const nl = [...prev.maintenanceHistory]; nl[i] = r; return { ...prev, maintenanceHistory: nl };
      });
    },
    onBranchMaintenanceChange: (bi: number, ri: number, r: MaintenanceRecord) => {
      setFormData((prev) => {
        const nb = [...prev.branches]; const br = { ...nb[bi] };
        br.maintenanceHistory = [...br.maintenanceHistory]; br.maintenanceHistory[ri] = r;
        nb[bi] = br; return { ...prev, branches: nb };
      });
    },
    onBranchAiNotesApplied: (bi: number, bari: number, notes: string) => {
      setFormData((prev) => {
        const nb = [...prev.branches]; const br = { ...nb[bi] };
        const baristas = [...br.baristas]; baristas[bari] = { ...baristas[bari], notes };
        br.baristas = baristas; nb[bi] = br; return { ...prev, branches: nb };
      });
    },
    setNewlyAddedId,
  }), [
    handleChange, handleRadioChange,
    addContact, removeContact, handleContactChange,
    addPhoneNumber, removePhoneNumber, handlePhoneNumberChange,
    addListItem, removeListItem, handleListItemChange,
    addNestedListItem, removeNestedListItem, handleNestedListItemChange,
    handleClientBaristaChange, handleQuickAddClientBarista, removeClientBarista,
     setFormData,
  ]);

  // ── Step props ──
  const stepProps = useMemo(() => ({
    formData, actions, newlyAddedId, isSubmitting, allKnownBaristaNames,
    allKnownMachineNames, allKnownMachineTypes, allKnownMachineOptions,
  }), [formData, actions, newlyAddedId, isSubmitting, allKnownBaristaNames, allKnownMachineNames, allKnownMachineTypes, allKnownMachineOptions]);

  // ── Completed steps for stepper ──
  const completedSteps = useMemo(() => steps.filter((s) => s.id < currentStep).map((s) => s.id), [currentStep]);

  // ── FormProgress sections (jump navigation) ──
  const formProgressSections = useMemo(
    () =>
      visibleSteps.map((s) => ({
        id: String(s.id),
        label: s.name,
        required: false,
      })),
    [visibleSteps]
  );

  const completedSectionIds = useMemo(
    () => visibleSteps.filter((s) => s.id < currentStep).map((s) => String(s.id)),
    [visibleSteps, currentStep]
  );

  const handleJumpToStep = useCallback(
    (sectionId: string) => {
      const nextStepId = Number(sectionId);
      if (!Number.isNaN(nextStepId) && visibleSteps.some((s) => s.id === nextStepId)) {
        setCurrentStep(nextStepId);
      }
    },
    [setCurrentStep, visibleSteps]
  );

  const handleJumpToNextStep = useCallback(() => {
    const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);
    if (currentIndex === -1) return;
    const nextStep = visibleSteps[currentIndex + 1];
    if (nextStep) {
      handleJumpToStep(String(nextStep.id));
    }
  }, [visibleSteps, currentStep, handleJumpToStep]);

  const canJumpToNextStep = visibleSteps[visibleSteps.length - 1]?.id !== currentStep;

  // ── Cross-step missing-field jump ──

  /**
   * When a missing-field key points at a list item that does not exist yet,
   * create the required item(s) so the DOM element is present after the step
   * renders. Returns true if an item was created.
   */
  const ensureTargetExists = useCallback((key: string): boolean => {
    // Helper: create contacts until the target list has at least `neededCount` items.
    const ensureContactCount = (path: ContactPath, neededCount: number, position?: string) => {
      const current = (() => {
        if (path === "main") return formData.contacts;
        if (path === "warehouse") return formData.warehouse.contacts;
        const branch = formData.branches[parseInt(path.split("-")[1], 10)];
        return branch?.contacts ?? [];
      })();
      if (current.length < neededCount) {
        const deficit = neededCount - current.length;
        for (let i = 0; i < deficit; i += 1) {
          addContact(path, position);
        }
        return true;
      }
      return false;
    };

    // Company baristas
    const companyBaristasMatch = key.match(/^company\.baristas\.(\d+)\./);
    if (companyBaristasMatch) {
      const index = Number(companyBaristasMatch[1]);
      if (formData.baristas.length <= index) {
        addListItem("baristas");
        return true;
      }
      return false;
    }

    // Company client baristas
    const companyClientBaristasMatch = key.match(/^company\.clientBaristas\.(\d+)\./);
    if (companyClientBaristasMatch) {
      const index = Number(companyClientBaristasMatch[1]);
      if ((formData.clientBaristas?.length ?? 0) <= index) {
        actions.addBlankClientBarista(null);
        return true;
      }
      return false;
    }

    // Branch baristas
    const branchBaristasMatch = key.match(/^branch\.(\d+)\.baristas\.(\d+)\./);
    if (branchBaristasMatch) {
      const branchIndex = Number(branchBaristasMatch[1]);
      const itemIndex = Number(branchBaristasMatch[2]);
      const branch = formData.branches[branchIndex];
      if (branch && branch.baristas.length <= itemIndex) {
        addNestedListItem(branchIndex, "baristas");
        return true;
      }
      return false;
    }

    // Branch client baristas
    const branchClientBaristasMatch = key.match(/^branch\.(\d+)\.clientBaristas\.(\d+)\./);
    if (branchClientBaristasMatch) {
      const branchIndex = Number(branchClientBaristasMatch[1]);
      const itemIndex = Number(branchClientBaristasMatch[2]);
      const branch = formData.branches[branchIndex];
      if (branch && branch.clientBaristas.length <= itemIndex) {
        addNestedListItem(branchIndex, "clientBaristas");
        return true;
      }
      return false;
    }

    // Branch contacts (index-based or role-based)
    const branchContactsRoleMatch = key.match(/^branch\.(\d+)\.contacts\.(chief|sales|accounting|ops_manager|manager)\./);
    if (branchContactsRoleMatch) {
      const branchIndex = Number(branchContactsRoleMatch[1]);
      const role = branchContactsRoleMatch[2];
      const path = `branch-${branchIndex}` as ContactPath;
      const branch = formData.branches[branchIndex];
      if (branch && !branch.contacts.some((c) => c.position === role)) {
        addContact(path, role);
        return true;
      }
      return false;
    }
    const branchContactsIndexMatch = key.match(/^branch\.(\d+)\.contacts\.(\d+)\./);
    if (branchContactsIndexMatch) {
      const branchIndex = Number(branchContactsIndexMatch[1]);
      const itemIndex = Number(branchContactsIndexMatch[2]);
      const path = `branch-${branchIndex}` as ContactPath;
      if (ensureContactCount(path, itemIndex + 1)) return true;
      return false;
    }

    // Company / warehouse contacts (role-based or index-based)
    const contactRoleMatch = key.match(/^(company|warehouse)\.contacts\.(chief|sales|accounting|ops_manager|manager)\./);
    if (contactRoleMatch) {
      const scope = contactRoleMatch[1];
      const role = contactRoleMatch[2];
      const path: ContactPath = scope === "company" ? "main" : "warehouse";
      const contacts = scope === "company" ? formData.contacts : formData.warehouse.contacts;
      if (!contacts.some((c) => c.position === role)) {
        addContact(path, role);
        return true;
      }
      return false;
    }

    const contactIndexMatch = key.match(/^(company|warehouse)\.contacts\.(\d+)\./);
    if (contactIndexMatch) {
      const scope = contactIndexMatch[1];
      const itemIndex = Number(contactIndexMatch[2]);
      const path: ContactPath = scope === "company" ? "main" : "warehouse";
      if (ensureContactCount(path, itemIndex + 1)) return true;
      return false;
    }

    return false;
  }, [formData, addListItem, addNestedListItem, actions.addBlankClientBarista, addContact]);

  const getStepIdForFieldKey = useCallback((key: string): number => {
    if (key.startsWith("branch.")) return 2;
    if (key.startsWith("company.baristas")) return 4;
    if (key.startsWith("company.clientBaristas")) return 4.5;
    if (key.startsWith("warehouse.")) return 3;
    // company.* defaults to step 1 (company info)
    return 1;
  }, []);

  /** Convert role-based contact keys (e.g. company.contacts.chief.name) to
   *  index-based keys that match the rendered data-field attributes. */
  const resolveContactFieldKey = useCallback((key: string): string => {
    const match = key.match(/^(company\.contacts|warehouse\.contacts|branch\.(\d+)\.contacts)\.(chief|sales|accounting|ops_manager|manager)\.(name|phone|email|position|customPosition)$/);
    if (!match) return key;
    const [, prefix, branchIndex, position] = match;
    let contacts: Contact[];
    if (prefix === "company.contacts") contacts = formData.contacts;
    else if (prefix === "warehouse.contacts") contacts = formData.warehouse.contacts;
    else contacts = formData.branches[Number(branchIndex)].contacts;
    const index = contacts.findIndex((c) => c.position === position);
    if (index < 0) return key;
    return `${prefix}.${index}.${match[4]}`;
  }, [formData.branches, formData.contacts, formData.warehouse.contacts]);

  const jumpRafRef = React.useRef<number | null>(null);

  const findFieldElement = useCallback((key: string): HTMLElement | null => {
    const resolvedKey = resolveContactFieldKey(key);
    const keysToTry = key === resolvedKey ? [key] : [key, resolvedKey];

    for (const tryKey of keysToTry) {
      // Prefer the exact data-field marker; otherwise try the bare field name.
      const byData = document.querySelector(`[data-field="${CSS.escape(tryKey)}"]`);
      if (byData instanceof HTMLElement) return byData;

      const lastDot = tryKey.lastIndexOf(".");
      if (lastDot > 0) {
        const fieldName = tryKey.slice(lastDot + 1);
        const byName = document.querySelector(`[name="${CSS.escape(fieldName)}"]`);
        if (byName instanceof HTMLElement) return byName;
      }
    }

    return null;
  }, [resolveContactFieldKey]);

  const scrollToAndHighlightField = useCallback((key: string) => {
    // Ask any CollapsibleCard whose wizardKey is a prefix of this key to open.
    window.dispatchEvent(new CustomEvent("wizard:open", { detail: key }));

    const element = findFieldElement(key);
    if (element) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
      element.classList.add("wizard-field-highlight");
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        element.focus({ preventScroll: true });
      } else {
        const focusable = element.querySelector("input, textarea, select, button");
        if (focusable instanceof HTMLElement) focusable.focus({ preventScroll: true });
      }
      setTimeout(() => element.classList.remove("wizard-field-highlight"), 2000);
    }
  }, [findFieldElement]);

  const jumpToField = useCallback((key: string) => {
    // Cancel any pending scroll from a previous jump.
    if (jumpRafRef.current) {
      cancelAnimationFrame(jumpRafRef.current);
    }
    const targetStep = getStepIdForFieldKey(key);
    const created = ensureTargetExists(key);
    if (targetStep === currentStep && !created) {
      scrollToAndHighlightField(key);
    } else {
      setPendingJumpKey(key);
      if (targetStep !== currentStep) {
        setCurrentStep(targetStep);
      }
    }
  }, [currentStep, getStepIdForFieldKey, scrollToAndHighlightField, setCurrentStep, ensureTargetExists]);

  // After a step change caused by jumpToField, the new step content renders.
  // Scroll to the pending field once the DOM has been painted.
  React.useEffect(() => {
    if (!pendingJumpKey) return;
    const key = pendingJumpKey;
    jumpRafRef.current = requestAnimationFrame(() => {
      jumpRafRef.current = requestAnimationFrame(() => {
        jumpRafRef.current = null;
        scrollToAndHighlightField(key);
        setPendingJumpKey(null);
      });
    });
    return () => {
      if (jumpRafRef.current) cancelAnimationFrame(jumpRafRef.current);
    };
  }, [currentStep, pendingJumpKey, scrollToAndHighlightField]);

  // ── Context value for cross-step jumps ──
  const wizardJumpValue = useMemo(() => ({ jumpToField }), [jumpToField]);

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
    <WizardJumpContext.Provider value={wizardJumpValue}>
      <div className="flex flex-col min-h-full w-full bg-paper">
      <div
        ref={wizardLayoutRef}
        className="w-full max-w-none flex flex-col xl:flex-row gap-2 sm:gap-4 xl:gap-6 relative flex-1 p-2 sm:p-4 lg:p-5 pb-8 sm:pb-12"
      >
        <aside className="hidden xl:block w-56 2xl:w-64 shrink-0">
          <div className="sticky top-6 bg-cream border border-hairline rounded-xl p-4 shadow-sm">
            <Stepper steps={visibleSteps} currentStep={currentStep} completedSteps={completedSteps} />
          </div>
        </aside>
        <div className="xl:hidden mb-3 bg-cream border border-hairline rounded-xl py-2 px-0.5 shadow-sm overflow-hidden">
          <Stepper steps={visibleSteps} currentStep={currentStep} completedSteps={completedSteps} onChange={setCurrentStep} layout="horizontal" />
        </div>
        <div className={`flex-1 transition-all duration-300 w-full`}>
          <section aria-label="تقدم النموذج">
            <FormProgress
              sections={formProgressSections}
              completedSections={completedSectionIds}
              currentSection={String(currentStep)}
              onSectionClick={handleJumpToStep}
              onJumpToNextIncomplete={canJumpToNextStep ? handleJumpToNextStep : undefined}
              variant="horizontal"
              showPercentage
              showCount
              className="mb-3 sm:mb-6"
            />
          </section>
          <div className="flex justify-end mb-4">
            <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              {showPreview ? "إخفاء المعاينة" : "معاينة حية"}
            </Button>
          </div>
          <div key={currentStep} className="animate-step-in-right mb-8">{renderStepContent()}</div>
        </div>
        {showPreview && (
          <>
            {/* Resizable divider */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-controls="live-preview-panel"
              aria-valuemin={MIN_PREVIEW_WIDTH}
              aria-valuemax={Math.round(getMaxPreviewWidth(containerSize.width))}
              aria-valuenow={Math.round(previewWidth)}
              aria-label="تغيير عرض المعاينة"
              tabIndex={0}
              onMouseDown={() => setIsResizing(true)}
              onKeyDown={(e) => {
                const step = 30;
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const delta = e.key === "ArrowRight" ? step : -step;
                  const container = wizardLayoutRef.current;
                  if (!container) return;
                  setPreviewWidth((w) => clampPreviewWidth(w + delta, container.clientWidth));
                }
              }}
              className="hidden xl:flex shrink-0 w-4 cursor-col-resize items-center justify-center hover:bg-espresso-light/30 transition-colors rounded outline-none focus-visible:ring-2 focus-visible:ring-primary/50 z-10"
            >
              <div className={`w-1 h-10 rounded-full transition-colors ${isResizing ? "bg-primary" : "bg-hairline"}`} />
            </div>
            {/* Desktop preview panel */}
            <div
              id="live-preview-panel"
              className="hidden xl:block shrink-0 h-[calc(100vh-140px)] overflow-y-auto sticky top-4 animate-item-fade-in-down custom-scrollbar"
              style={{ width: previewWidth, minWidth: MIN_PREVIEW_WIDTH, maxWidth: getMaxPreviewWidth(containerSize.width) }}
            >
              <div className="sticky top-0 bg-paper pt-2 pb-4 z-10 border-b border-hairline mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-latte flex items-center gap-2"><EyeIcon className="w-4 h-4" /> معاينة حية</h3>
              </div>
              <div className="pb-10"><ReviewStep formData={formData} partsList={partsList} servicesList={servicesList} embedded={true} /></div>
            </div>
          </>
        )}
        {showPreview && (
          <div className="xl:hidden fixed inset-0 z-50 bg-paper overflow-y-auto animate-content-fade-in">
            <div className="sticky top-0 bg-cream p-4 border-b border-hairline flex justify-between items-center shadow-md">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2"><EyeIcon className="w-5 h-5 text-primary" /> معاينة حية</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 bg-cream-2 rounded-full text-latte hover:text-primary transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-4 pb-20"><ReviewStep formData={formData} partsList={partsList} servicesList={servicesList} embedded={true} /></div>
          </div>
        )}
      </div>
      <footer className="relative z-30 w-full sm:w-[90%] mx-auto pointer-events-none flex justify-center mt-6 sm:mt-8">
        <div className="bg-cream rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-hairline/20 pointer-events-auto max-w-4xl w-full">
          <div className="w-full p-2 sm:p-3 lg:p-4 flex items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <NavigationButtons currentStep={currentStep} onPrev={handlePrev} onNext={currentStep === 6 ? handleSubmit : handleNext} isLastStep={currentStep === 6} isSubmitting={isSubmitting} />
            </div>

            {/* Visual divider separating primary nav from destructive reset */}
            <div className="h-6 w-px bg-hairline/60 hidden sm:block" aria-hidden="true" />

            {/* Reset button (accessibility #53) */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-latte hover:text-ember-600 dark:hover:text-ember-300 hover:bg-ember-50 dark:hover:bg-ember-500/10 rounded-lg transition-colors shrink-0"
              title="إعادة تعيين النموذج"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">إعادة تعيين</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Reset confirmation dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetForm}
        title="إعادة تعيين النموذج"
        message="هل أنت متأكد من رغبتك في إعادة تعيين النموذج؟ سيتم فقدان جميع البيانات المدخلة."
        confirmLabel="نعم، إعادة تعيين"
      />
    </div>
    </WizardJumpContext.Provider>
  );
};

export default FormWizardView;
