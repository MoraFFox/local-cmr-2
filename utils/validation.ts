import { FormData, MaintenanceRecord, Branch, Barista } from '../types';

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

// Company validation
export const validateCompany = (data: Partial<FormData>): ValidationResult => {
    const errors: ValidationError[] = [];
    
    if (!data.companyName?.trim()) {
        errors.push({ field: 'companyName', message: 'Company name is required' });
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
    
    if (data.taxNumber && !/^\d+$/.test(data.taxNumber)) {
        errors.push({ field: 'taxNumber', message: 'Tax number must contain only digits' });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Branch validation
export const validateBranch = (branch: Partial<Branch>): ValidationResult => {
    const errors: ValidationError[] = [];
    
    if (!branch.branchName?.trim()) {
        errors.push({ field: 'branchName', message: 'Branch name is required' });
    }
    
    if (branch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branch.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Maintenance record validation
export const validateMaintenanceRecord = (record: Partial<MaintenanceRecord>): ValidationResult => {
    const errors: ValidationError[] = [];
    
    if (!record.maintenanceDate) {
        errors.push({ field: 'maintenanceDate', message: 'Maintenance date is required' });
    }
    
    if (record.hadProblem) {
        if (!record.problems || record.problems.length === 0) {
            errors.push({ field: 'problems', message: 'Please specify at least one problem' });
        }
        
        if (record.partsWereReplaced && (!record.partsReplaced || record.partsReplaced.length === 0)) {
            errors.push({ field: 'partsReplaced', message: 'Please specify which parts were replaced' });
        }
    }
    
    if (record.dailyLeaseCost && record.dailyLeaseCost < 0) {
        errors.push({ field: 'dailyLeaseCost', message: 'Daily lease cost cannot be negative' });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Barista validation
export const validateBarista = (barista: Partial<Barista>): ValidationResult => {
    const errors: ValidationError[] = [];
    
    if (!barista.name?.trim()) {
        errors.push({ field: 'name', message: 'Staff name is required' });
    }
    
    // Fixed phone regex - removed invalid `<` character
    if (barista.phone && !/^[0\d\s\-\+\(\)]{8,}$/.test(barista.phone)) {
        errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate entire form
export const validateForm = (data: FormData): ValidationResult => {
    const errors: ValidationError[] = [];
    
    // Validate company
    const companyValidation = validateCompany(data);
    errors.push(...companyValidation.errors);
    
    // Validate branches if hasBranches is true
    if (data.hasBranches && Array.isArray(data.branches)) {
        data.branches.forEach((branch, index) => {
            const branchValidation = validateBranch(branch);
            branchValidation.errors.forEach(error => {
                errors.push({
                    field: `branches[${index}].${error.field}`,
                    message: `Branch ${index + 1}: ${error.message}`
                });
            });
        });
    }
    
    // Validate maintenance records
    const validateRecords = (records: MaintenanceRecord[], path: string) => {
        records.forEach((record, index) => {
            const recordValidation = validateMaintenanceRecord(record);
            recordValidation.errors.forEach(error => {
                errors.push({
                    field: `${path}[${index}].${error.field}`,
                    message: `${path} ${index + 1}: ${error.message}`
                });
            });
            
            // Validate follow-up visits recursively
            if (record.followUpVisits && record.followUpVisits.length > 0) {
                validateRecords(record.followUpVisits, `${path}[${index}].followUpVisits`);
            }
        });
    };
    
    validateRecords(data.maintenanceHistory, 'maintenanceHistory');
    
    if (data.hasBranches) {
        data.branches.forEach((branch, branchIndex) => {
            validateRecords(branch.maintenanceHistory, `branches[${branchIndex}].maintenanceHistory`);
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Helper to get error message for a specific field
export const getFieldError = (errors: ValidationError[], field: string): string | undefined => {
    const error = errors.find(e => e.field === field);
    return error?.message;
};

// Helper to check if a field has an error
export const hasFieldError = (errors: ValidationError[], field: string): boolean => {
    return errors.some(e => e.field === field);
};

// ============================================
// ID Validation Helpers
// ============================================

export interface IdValidationResult {
  valid: boolean;
  action: 'insert' | 'update' | 'skip';
  error?: string;
}

/**
 * Validate submission ID and determine appropriate action
 * @param id - The submission ID (can be undefined, null, negative, or positive)
 * @returns IdValidationResult with action recommendation
 */
export const validateSubmissionId = (
  id: number | undefined | null
): IdValidationResult => {
  // No ID provided - treat as new insert
  if (id === undefined || id === null) {
    return { valid: true, action: 'insert' };
  }
  
  // Negative ID indicates locally created pending item
  if (id < 0) {
    return { 
      valid: false, 
      action: 'skip', 
      error: 'Pending local item - will sync when online' 
    };
  }
  
  // Positive ID indicates existing database record
  if (id > 0) {
    return { valid: true, action: 'update' };
  }
  
  // ID is 0 - invalid
  return { 
    valid: false, 
    action: 'skip', 
    error: 'Invalid ID: 0' 
  };
};

/**
 * Check if ID is a valid database ID (positive number)
 */
export const isValidDbId = (id: number | undefined | null): boolean => {
  return typeof id === 'number' && id > 0;
};

/**
 * Check if ID is a local/pending ID (negative number)
 */
export const isLocalId = (id: number | undefined | null): boolean => {
  return typeof id === 'number' && id < 0;
};

/**
 * Generate a unique local ID (negative timestamp)
 */
export const generateLocalId = (): number => {
  return -Date.now();
};
