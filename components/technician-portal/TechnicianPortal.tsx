/** @format */

import React, { useState, useEffect, useCallback } from "react";
import { useTechnicianAuth } from "../TechnicianAuthContext";
import { useToast } from "../ToastContext";
import TechnicianLogin from "../TechnicianLogin";
import Step1_Context, { Step1ContextData } from "./Step1_Context";
import Step2_WorkLog, { Step2WorkLogData } from "./Step2_WorkLog";
import Step3_Summary from "./Step3_Summary";
import TechnicianLayout from "./ui/TechnicianLayout";
import TechnicianFooter from "./TechnicianFooter";
import FloatingCameraFAB from "./FloatingCameraFAB";
import CameraBottomSheet from "./CameraBottomSheet";
import { ar } from "../../utils/arabicTranslations";
import { supabase } from "../../supabaseClient";
import { logger } from "../../utils/logger";
import { partsList, servicesList, problemCategories } from "../../constants";
import { Part, Service, PortalPhotoEntry } from "../../types";
import { generateMockTechnicianStep1, generateMockTechnicianStep2 } from "../../utils/mockData";
import { useVisitZones } from "../../utils/visitZones";

interface TechnicianPortalProps {
  onBackToMain?: () => void;
}

interface PortalBranch {
  id: string;
  branchName?: string;
  location?: string;
}

interface PortalCompany {
  id: string;
  companyName: string;
  branches: PortalBranch[];
}

interface CompanyRow {
  id: string | number;
  form_data?: {
    companyName?: string;
    branches?: PortalBranch[];
  };
}

const steps = [
  { id: 1, name: ar.steps.step1 },
  { id: 2, name: ar.steps.step2 },
  { id: 3, name: ar.steps.step3 },
];

const TechnicianPortal: React.FC<TechnicianPortalProps> = ({
  onBackToMain,
}) => {
  const { technician, isAuthenticated, isLoading, authBootstrapError, retryAuthBootstrap, logout } = useTechnicianAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [step1Data, setStep1Data] = useState<Step1ContextData>({
    date: new Date().toISOString().split("T")[0],
    companyId: null,
    branchId: null,
    visitZone: null,
    clientBaristaName: "",
    clientBaristaRating: 0,
  });

  const [step2Data, setStep2Data] = useState<Step2WorkLogData>({
    visitType: 'problem',
    hadProblem: true,
    problems: [],
    servicesPerformed: [],
    partsWereReplaced: false,
    partsReplaced: [],
    problemSolved: true,
    photos: [],
    notes: "",
    clientSupervisorName: "",
    clientSupervisorPhone: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [companies, setCompanies] = useState<PortalCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [sortedServices, setSortedServices] = useState<Service[]>(servicesList);
  const [sortedParts, setSortedParts] = useState<Part[]>(partsList);
  const [sortedProblemCategories, setSortedProblemCategories] = useState<typeof problemCategories>(problemCategories);
  const { zones: allVisitZones } = useVisitZones();

  const [sortedZones, setSortedZones] = useState<{value: string, label: string}[]>(
    allVisitZones.map(z => ({ value: z.key, label: z.label }))
  );

  const [companyName, setCompanyName] = useState("");
  const [branchName, setBranchName] = useState("");

  // Dev-only listener to fill mock technician data
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handleMockData = () => {
      if (!isAuthenticated) return; // don't mock if not logged in
      const step1Mock = generateMockTechnicianStep1(companies);
      setStep1Data(prev => ({ ...prev, ...step1Mock }));
      
      const step2Mock = generateMockTechnicianStep2();
      setStep2Data(prev => ({ ...prev, ...step2Mock }));
      
      // Auto-advance to review step
      setCurrentStep(3);
      showToast("تم ملء بيانات التقرير التجريبية", "success");
    };
    window.addEventListener('MOCK_TECHNICIAN_DATA', handleMockData);
    return () => window.removeEventListener('MOCK_TECHNICIAN_DATA', handleMockData);
  }, [isAuthenticated, companies, showToast]);

  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true);

    try {
      const { data: companiesData, error } = await supabase
        .from("companies")
        .select("id, form_data");

      if (error) throw error;

      const mappedCompanies = (companiesData || [])
        .map((c: CompanyRow) => ({
          id: String(c.id),
          companyName: c.form_data?.companyName || `Company ${c.id}`,
          branches: c.form_data?.branches || [],
        }))
        .sort((a, b) => a.companyName.localeCompare(b.companyName, 'ar'));

      setCompanies(mappedCompanies);
    } catch (error) {
      logger.error("Error fetching companies", error, "technician");
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies();
    }
  }, [fetchCompanies, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUsageStats = async () => {
      try {
        const { data, error } = await supabase
          .from('usage_stats')
          .select('type, name, count');

        if (error) {
          logger.error('Error fetching usage stats', error, 'technician');
          return;
        }

        if (!data || data.length === 0) return;

        const statsMap = new Map<string, number>();
        data.forEach((stat) => {
          statsMap.set(`${stat.type}:${stat.name}`, stat.count);
        });

        const getCount = (type: string, name: string) => statsMap.get(`${type}:${name}`) || 0;

        const newSortedServices = [...servicesList].sort((a, b) => {
          const countA = getCount('service', a.value);
          const countB = getCount('service', b.value);
          return countB - countA;
        });
        setSortedServices(newSortedServices);

        const newSortedParts = [...partsList].sort((a, b) => {
          const countA = getCount('part', a.value);
          const countB = getCount('part', b.value);
          return countB - countA;
        });
        setSortedParts(newSortedParts);

        const newSortedCategories = problemCategories.map(cat => ({
          ...cat,
          options: [...cat.options].sort((a, b) => {
            const countA = getCount('problem', a.value);
            const countB = getCount('problem', b.value);
            return countB - countA;
          })
        })).sort((a, b) => {
          const countA = getCount('problem_category', a.title);
          const countB = getCount('problem_category', b.title);
          return countB - countA;
        });
        setSortedProblemCategories(newSortedCategories);

        const newSortedZones = allVisitZones
          .map(z => ({ value: z.key, label: z.label }))
          .sort((a, b) => {
          const countA = getCount('visit_zone', a.value);
          const countB = getCount('visit_zone', b.value);
          return countB - countA;
        });
        setSortedZones(newSortedZones);

      } catch (err) {
        logger.error('Failed to sort lists', err, 'technician');
      }
    };

    fetchUsageStats();
  }, [isAuthenticated]);

  const DRAFT_KEY = technician ? `technician_draft_${technician.id}` : null;

  useEffect(() => {
    if (!DRAFT_KEY) return;
    
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const { currentStep: savedStep, step1Data: s1, step2Data: s2 } = JSON.parse(savedDraft);
        if (savedStep) setCurrentStep(savedStep);
        if (s1) setStep1Data(s1);
        if (s2) setStep2Data({ ...s2, photos: [] });
      } catch (e) {
        logger.error("Failed to load draft", e, "technician");
      }
    }
  }, [technician]);

  useEffect(() => {
    if (!DRAFT_KEY || isSubmitting || submitSuccess) return;

    const draft = {
      currentStep,
      step1Data,
      step2Data: { ...step2Data, photos: [] },
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [currentStep, step1Data, step2Data, DRAFT_KEY, isSubmitting, submitSuccess]);

  useEffect(() => {
    if (!step1Data.companyId) {
      setCompanyName("");
      setBranchName("");
      return;
    }

    const selectedCompany = companies.find(c => c.id === String(step1Data.companyId));
    if (selectedCompany) {
      setCompanyName(selectedCompany.companyName);
      
      if (step1Data.branchId) {
        const selectedBranch = selectedCompany.branches.find((branch) => String(branch.id) === String(step1Data.branchId));
        if (selectedBranch) {
          setBranchName(selectedBranch.branchName || selectedBranch.location || "");
        } else {
          setBranchName("");
        }
      } else {
        setBranchName("");
      }
    }
  }, [step1Data.companyId, step1Data.branchId, companies]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return step1Data.companyId !== null && step1Data.branchId !== null && step1Data.visitZone !== null;
      case 2: {
        const hasRequiredWork = step2Data.visitType === 'problem'
          ? (step2Data.problems.length > 0 || step2Data.servicesPerformed.length > 0)
          : step2Data.servicesPerformed.length > 0;
        const hasBeforePhoto = step2Data.photos.some(p => p.type === 'before');
        const hasAfterPhoto = step2Data.photos.some(p => p.type === 'after');
        const hasSupervisor = !!(step2Data.clientSupervisorName?.trim() && step2Data.clientSupervisorPhone?.trim());
        return hasRequiredWork && hasBeforePhoto && hasAfterPhoto && hasSupervisor;
      }
      case 3: {
        const hasBeforePhoto = step2Data.photos.some(p => p.type === 'before');
        const hasAfterPhoto = step2Data.photos.some(p => p.type === 'after');
        const hasSupervisor = !!(step2Data.clientSupervisorName?.trim() && step2Data.clientSupervisorPhone?.trim());
        return hasBeforePhoto && hasAfterPhoto && hasSupervisor;
      }
      default:
        return false;
    }
  }, [currentStep, step1Data, step2Data]);

  const getValidationError = useCallback((): string | null => {
    switch (currentStep) {
      case 1:
        if (!step1Data.companyId) return ar.errors.selectCompany;
        if (!step1Data.branchId) return ar.errors.selectBranch;
        if (!step1Data.visitZone) return ar.errors.selectZone;
        return null;
      case 2: {
        if (step2Data.visitType === 'problem') {
          if (step2Data.problems.length === 0 && step2Data.servicesPerformed.length === 0) {
            return ar.errors.selectProblems;
          }
        } else {
          if (step2Data.servicesPerformed.length === 0) {
            return ar.errors.selectServices;
          }
        }
        if (!step2Data.photos.some(p => p.type === 'before')) return ar.errors.requireBeforePhoto;
        if (!step2Data.photos.some(p => p.type === 'after')) return ar.errors.requireAfterPhoto;
        if (!step2Data.clientSupervisorName?.trim()) return ar.errors.requireSupervisorName;
        if (!step2Data.clientSupervisorPhone?.trim()) return ar.errors.requireSupervisorPhone;
        return null;
      }
      case 3: {
        if (!step2Data.photos.some(p => p.type === 'before')) return ar.errors.requireBeforePhoto;
        if (!step2Data.photos.some(p => p.type === 'after')) return ar.errors.requireAfterPhoto;
        if (!step2Data.clientSupervisorName?.trim()) return ar.errors.requireSupervisorName;
        if (!step2Data.clientSupervisorPhone?.trim()) return ar.errors.requireSupervisorPhone;
        return null;
      }
      default:
        return null;
    }
  }, [currentStep, step1Data, step2Data]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
    }
  };

  const handleEditStep = (step: 1 | 2) => {
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    // Validation: require before/after photos and supervisor info
    const beforePhotos = step2Data.photos.filter(p => p.type === 'before');
    const afterPhotos = step2Data.photos.filter(p => p.type === 'after');

    const errors: string[] = [];
    if (beforePhotos.length === 0) errors.push('صورة قبل الصيانة مطلوبة');
    if (afterPhotos.length === 0) errors.push('صورة بعد الصيانة مطلوبة');
    if (!step2Data.clientSupervisorName?.trim()) errors.push('اسم مشرف العميل مطلوب');
    if (!step2Data.clientSupervisorPhone?.trim()) errors.push('رقم هاتف المشرف مطلوب');

    if (errors.length > 0) {
      showToast(errors.join('\n'), 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const photoUrls: string[] = [];
      const photoEntries: PortalPhotoEntry[] = [];
      
      for (const photo of step2Data.photos) {
        const fileName = `${Date.now()}-${photo.file.name}`;
        
        // Retry upload up to 3 times for network resilience
        let uploadError: Error | null = null;
        let uploadData: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const result = await supabase.storage
            .from("maintenance-photos")
            .upload(fileName, photo.file);
          
          if (!result.error) {
            uploadData = result.data;
            uploadError = null;
            break;
          }
          
          logger.warn(`Photo upload attempt ${attempt}/3 failed`, result.error, 'upload');
          uploadError = result.error;
          
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("maintenance-photos")
          .getPublicUrl(fileName);

        photoUrls.push(urlData.publicUrl);
        photoEntries.push({
          url: urlData.publicUrl,
          type: photo.type,
        });
      }

      const usageUpdates: { type: string; name: string }[] = [];
      
      step2Data.servicesPerformed.forEach(s => {
        usageUpdates.push({ type: 'service', name: s.name });
      });

      if (step2Data.partsWereReplaced) {
        step2Data.partsReplaced.forEach(p => {
          usageUpdates.push({ type: 'part', name: p.name });
        });
      }

      if (step2Data.hadProblem) {
        step2Data.problems.forEach(p => {
          usageUpdates.push({ type: 'problem', name: p });
          
          const category = problemCategories.find(cat => 
            cat.options.some(opt => opt.value === p)
          );
          if (category) {
            usageUpdates.push({ type: 'problem_category', name: category.title });
          }
        });
      }

      if (step1Data.visitZone) {
        usageUpdates.push({ type: 'visit_zone', name: step1Data.visitZone });
      }

      if (usageUpdates.length > 0) {
        try {
          const { error } = await supabase.rpc('increment_usage_stats', { items: usageUpdates });
          if (error) {
            logger.error('Error updating usage stats', error, 'technician');
          }
        } catch (err) {
          logger.error('Failed to update usage stats', err, 'technician');
        }
      }

      const maintenanceRecord = {
        maintenance_date: step1Data.date,
        type: step2Data.visitType === 'problem' ? "requested" : "scheduled",
        had_problem: step2Data.visitType === 'problem',
        parts_were_replaced: step2Data.partsWereReplaced,
        problem_solved: step2Data.problemSolved,
        parts_replaced: step2Data.partsReplaced,
        paid_by: "company",
        barista_name: technician?.name || "",
        client_barista_name: step1Data.clientBaristaName,
        visit_rating: step1Data.clientBaristaRating,
        problems: step2Data.problems,
        visit_zone: step1Data.visitZone,
        services_performed: step2Data.servicesPerformed,
        machines: [],
        notes: step2Data.notes,
        photo_urls: photoUrls,
        photo_entries: photoEntries,
        company_id: step1Data.companyId,
        branch_id: step1Data.branchId,
        technician_id: technician?.id,
        client_supervisor_name: step2Data.clientSupervisorName,
        client_supervisor_phone: step2Data.clientSupervisorPhone,
      };

      const { error } = await supabase
        .from("maintenance_submissions")
        .insert([maintenanceRecord]);

      if (error) throw error;

      setSubmitSuccess(true);

      setTimeout(() => {
        if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY);
        setCurrentStep(1);
        setStep1Data({
          date: new Date().toISOString().split("T")[0],
          companyId: null,
          branchId: null,
          visitZone: null,
          clientBaristaName: "",
          clientBaristaRating: 0,
        });
        setStep2Data({
          visitType: 'problem',
          hadProblem: true,
          problems: [],
          servicesPerformed: [],
          partsWereReplaced: false,
          partsReplaced: [],
          problemSolved: true,
          photos: [],
          notes: "",
          clientSupervisorName: "",
          clientSupervisorPhone: "",
        });
        setSubmitSuccess(false);
      }, 2000);
    } catch (error: any) {
      const errMsg = error?.message || error?.statusText || String(error);
      logger.error("Error submitting maintenance record", error, "submission");
      logger.error("Error submitting maintenance record", error, "submission");
      showToast(`حدث خطأ أثناء إرسال التقرير: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return <TechnicianLogin onBack={onBackToMain} />;
  }

  // Define step Title dynamically
  const stepTitles = {
    1: ar.tactical.missionIntel,
    2: ar.tactical.fieldOps,
    3: ar.tactical.debrief,
  };

  return (
    <TechnicianLayout
        technicianName={technician?.name}
        onLogout={logout}
        title={stepTitles[currentStep]}
        step={currentStep}
        totalSteps={3}
        onBack={onBackToMain}
    >
        {currentStep === 1 && (
            <Step1_Context
                data={step1Data}
                onChange={setStep1Data}
                companies={companies}
                loadingCompanies={loadingCompanies}
                sortedZones={sortedZones}
            />
        )}
        
        {currentStep === 2 && (
            <Step2_WorkLog
                data={step2Data}
                onChange={setStep2Data}
                onCameraOpen={() => setIsCameraOpen(true)}
                sortedServices={sortedServices}
                sortedParts={sortedParts}
                sortedProblemCategories={sortedProblemCategories}
            />
        )}
        
        {currentStep === 3 && (
            <Step3_Summary
                step1Data={step1Data}
                step2Data={step2Data}
                companyName={companyName}
                branchName={branchName}
                onEditStep={handleEditStep}
                onUpdateRating={(rating) => setStep1Data(prev => ({ ...prev, clientBaristaRating: rating }))}

                onUpdateProblemSolved={(solved) => setStep2Data(prev => ({ ...prev, problemSolved: solved }))}
                onUpdateSupervisorName={(name) => setStep2Data(prev => ({ ...prev, clientSupervisorName: name }))}
                onUpdateSupervisorPhone={(phone) => setStep2Data(prev => ({ ...prev, clientSupervisorPhone: phone }))}
            />
        )}

        <TechnicianFooter
            currentStep={currentStep}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            canProceed={canProceed()}
            isSubmitting={isSubmitting}
            validationError={!canProceed() ? getValidationError() : undefined}
        />
        
        {/* Floating elements */}
        {currentStep === 2 && (
            <FloatingCameraFAB
                onCameraOpen={() => setIsCameraOpen(true)}
                photoCount={step2Data.photos.length}
            />
        )}

        <CameraBottomSheet
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            photos={step2Data.photos}
            onPhotosChange={(photos) => setStep2Data(prev => ({ ...prev, photos }))}
        />

    </TechnicianLayout>
  );
};

export default TechnicianPortal;
