import { FormData, MaintenanceRecord, Branch, Barista, Contact, PartRecord, ServiceRecord, MaintenancePhoto } from '../types';

// Maximum file size for imports (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// CSV Export Types
export interface CSVColumn {
    header: string;
    accessor: string | ((data: any) => string);
}

// Export data to CSV format
export const exportToCSV = (data: any[], columns: CSVColumn[], filename: string): void => {
    const headers = columns.map(col => col.header).join(',');
    
    const rows = data.map(row => {
        return columns.map(col => {
            const value = typeof col.accessor === 'function' 
                ? col.accessor(row)
                : getNestedValue(row, col.accessor);
            return escapeCSV(String(value ?? ''));
        }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    downloadFile(csvContent, filename, 'text/csv');
};

// Export maintenance records to CSV
export const exportMaintenanceToCSV = (records: MaintenanceRecord[], companyName: string): void => {
    const columns: CSVColumn[] = [
        { header: 'Date', accessor: 'maintenanceDate' },
        { header: 'Staff', accessor: 'baristaName' },
        { header: 'Type', accessor: 'type' },
        { header: 'Had Problem', accessor: (r) => r.hadProblem ? 'Yes' : 'No' },
        { header: 'Problems', accessor: (r) => (r.problems || []).join('; ') },
        { header: 'Parts Replaced', accessor: (r) => r.partsWereReplaced ? 'Yes' : 'No' },
        { header: 'Parts', accessor: (r) => (r.partsReplaced || []).map(p => p.partName).join('; ') },
        { header: 'Services', accessor: (r) => (r.servicesPerformed || []).map(s => s.serviceName).join('; ') },
        { header: 'Problem Solved', accessor: (r) => r.problemSolved ? 'Yes' : 'No' },
        { header: 'Paid By', accessor: 'paidBy' },
        { header: 'Visit Zone', accessor: 'visitZone' },
        { header: 'Rating', accessor: 'visitRating' },
        { header: 'Notes', accessor: 'notes' },
        { header: 'Before Photo URLs', accessor: (r) => (r.photos || []).filter(p => p.type === 'before').map(p => p.url).join(';') },
        { header: 'After Photo URLs', accessor: (r) => (r.photos || []).filter(p => p.type === 'after').map(p => p.url).join(';') },
        { header: 'Legacy Photo URLs', accessor: (r) => (r.photos || []).filter(p => p.type === 'legacy').map(p => p.url).join(';') },
    ];
    
    exportToCSV(records, columns, `${companyName}_maintenance_history.csv`);
};

// Export company data to JSON
export const exportToJSON = (data: any, filename: string): void => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
};

// Export full company data
export const exportCompanyData = (company: FormData): void => {
    const filename = `${company.companyName || 'company'}_${company.id || Date.now()}.json`;
    exportToJSON(company, filename);
};

// Export multiple companies
export const exportCompaniesData = (companies: FormData[]): void => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToJSON(companies, `companies_export_${timestamp}.json`);
};

// Import data from JSON file
export const importFromJSON = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        // Add file size validation
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                resolve(data);
            } catch (error) {
                reject(new Error('Invalid JSON file'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
};

// Import from CSV
export const importFromCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        // Add file size validation
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    reject(new Error('CSV file is empty or invalid'));
                    return;
                }
                
                const headers = parseCSVLine(lines[0]);
                const data = lines.slice(1).map(line => {
                    const values = parseCSVLine(line);
                    const row: any = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    return row;
                });
                
                resolve(data);
            } catch (error) {
                reject(new Error('Failed to parse CSV file'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
};

// Validate imported company data
export const validateImportedCompany = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data) {
        errors.push('No data provided');
        return { isValid: false, errors };
    }
    
    // Check required fields
    if (!data.companyName) {
        errors.push('Company name is required');
    }
    
    // Validate maintenance records
    if (data.maintenanceHistory && Array.isArray(data.maintenanceHistory)) {
        data.maintenanceHistory.forEach((record: any, index: number) => {
            if (!record.maintenanceDate) {
                errors.push(`Maintenance record ${index + 1} is missing a date`);
            }
        });
    }
    
    // Validate branches
    if (data.branches && Array.isArray(data.branches)) {
        data.branches.forEach((branch: any, index: number) => {
            if (!branch.branchName) {
                errors.push(`Branch ${index + 1} is missing a name`);
            }
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Transform imported data to match FormData structure
export const transformImportedCompany = (data: any): Partial<FormData> => {
    return {
        companyName: data.companyName || '',
        email: data.email || '',
        taxNumber: data.taxNumber || '',
        location: data.location || '',
        hasBranches: data.hasBranches || false,
        usesOurMachines: data.usesOurMachines || null,
        branchCount: data.branchCount || 0,
        branches: (data.branches || []).map((b: any) => ({
            ...b,
            id: b.id || Date.now() + Math.random(),
            maintenanceHistory: (b.maintenanceHistory || []).map((m: any) => ({
                ...m,
                id: m.id || Date.now() + Math.random()
            }))
        })),
        warehouse: data.warehouse || { location: '', contacts: [] },
        baristas: (data.baristas || []).map((b: any) => ({
            ...b,
            id: b.id || Date.now() + Math.random()
        })),
        maintenanceHistory: (data.maintenanceHistory || []).map((m: any) => ({
            ...m,
            id: m.id || Date.now() + Math.random()
        })),
        contacts: data.contacts || []
    };
};

// Helper functions
const downloadFile = (content: string, filename: string, mimeType: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
};

const escapeCSV = (value: string): string => {
    // Prevent CSV injection by escaping dangerous characters
    const dangerousChars = ['=', '+', '-', '@', '\t'];
    let escaped = value;
    
    // If starts with dangerous character, prepend with single quote
    if (dangerousChars.some(char => escaped.startsWith(char))) {
        escaped = "'" + escaped;
    }
    
    // Handle quotes, commas, and newlines
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
        escaped = `"${escaped.replace(/"/g, '""')}"`;
    }
    
    return escaped;
};

const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
};

// Generate Excel-compatible HTML table
export const exportToExcel = (data: any[], columns: CSVColumn[], filename: string): void => {
    const headers = columns.map(col => `<th>${col.header}</th>`).join('');
    
    const rows = data.map(row => {
        const cells = columns.map(col => {
            const value = typeof col.accessor === 'function' 
                ? col.accessor(row)
                : getNestedValue(row, col.accessor);
            return `<td>${escapeHtml(String(value ?? ''))}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    
    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <title>${filename}</title>
            <style>
                table { border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <thead><tr>${headers}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </body>
        </html>
    `;
    
    downloadFile(html, filename, 'application/vnd.ms-excel');
};

const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Export summary report
export const exportSummaryReport = (companies: FormData[]): void => {
    const summary = companies.map(company => ({
        'Company Name': company.companyName,
        'Location': company.location,
        'Has Branches': company.hasBranches ? 'Yes' : 'No',
        'Branch Count': company.branches?.length || 0,
        'Staff Count': (company.baristas?.length || 0) + company.branches?.reduce((sum, b) => sum + (b.baristas?.length || 0), 0),
        'Maintenance Records': (company.maintenanceHistory?.length || 0) + company.branches?.reduce((sum, b) => sum + (b.maintenanceHistory?.length || 0), 0),
        'Total Contacts': (company.contacts?.length || 0) + company.branches?.reduce((sum, b) => sum + (b.contacts?.length || 0), 0)
    }));
    
    const columns: CSVColumn[] = Object.keys(summary[0] || {}).map(key => ({
        header: key,
        accessor: key
    }));
    
    exportToCSV(summary, columns, `companies_summary_${new Date().toISOString().split('T')[0]}.csv`);
};
