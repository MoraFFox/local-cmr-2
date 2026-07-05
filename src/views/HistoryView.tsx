import React from 'react';
import HistoryPage from '../../components/HistoryPage';
import { FormData, MaintenanceRecord } from '../../types';

export interface HistoryViewProps {
  isLoading: boolean;
  submissions: (FormData & { created_at: string })[];
  handleEdit: (submission: FormData) => void;
  requestDelete: (id: number) => void;
  handleAddNew: () => void;
  handlePrintRequest: () => void;
  handleViewDetails: (submission: FormData & { created_at: string }) => void;
  handleUpdateCompany: (updatedCompany: FormData) => void;
  setSelectedSubmission: React.Dispatch<React.SetStateAction<any>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
  getTechnicianDisplayName: (record: MaintenanceRecord) => string;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  isLoading, submissions, handleEdit, requestDelete, handleAddNew,
  handlePrintRequest, handleViewDetails, handleUpdateCompany,
  setSelectedSubmission, setView, getTechnicianDisplayName
}) => {
  return (
    <div className="w-full">
      <HistoryPage
        submissions={submissions}
        onEdit={handleEdit}
        onDelete={requestDelete}
        onAddNew={handleAddNew}
        onPrint={handlePrintRequest}
        onViewDetails={handleViewDetails}
        onUpdateCompany={handleUpdateCompany}
        onEditMaintenance={(submission) => {
          setSelectedSubmission(submission);
          setView("maintenance-edit");
        }}
        getTechnicianDisplayName={getTechnicianDisplayName}
        isLoading={isLoading}
      />
    </div>
  );
}

export default HistoryView;
