import React from 'react';
import MaintenanceEditPage from '../../components/MaintenanceEditPage';
import { partsList, servicesList, problemCategories } from '../../constants';

export interface MaintenanceEditViewProps {
  selectedSubmission: any;
  setSelectedSubmission: React.Dispatch<React.SetStateAction<any>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
  handleUpdateCompany: (updatedCompany: any) => void;
  allPredefinedProblems: string[];
  isSidebarExpanded: boolean;
}

const MaintenanceEditView: React.FC<MaintenanceEditViewProps> = ({
  selectedSubmission, setSelectedSubmission, setView, handleUpdateCompany,
  allPredefinedProblems, isSidebarExpanded
}) => {
  if (!selectedSubmission) return null;
  return (
    <MaintenanceEditPage
      submission={selectedSubmission}
      onBack={() => {
        setSelectedSubmission(null);
        setView("history");
      }}
      onSave={(updatedSubmission) => {
        handleUpdateCompany(updatedSubmission);
        setSelectedSubmission(updatedSubmission as any);
      }}
      partsList={partsList}
      servicesList={servicesList}
      problemCategories={problemCategories}
      allPredefinedProblems={allPredefinedProblems}
      isSidebarExpanded={isSidebarExpanded}
    />
  );
};

export default MaintenanceEditView;
