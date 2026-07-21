import React from 'react';
import SubmissionDetails from '../../components/SubmissionDetails';

export interface SubmissionDetailsViewProps {
  selectedSubmission: any;
  setSelectedSubmission: React.Dispatch<React.SetStateAction<any>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
  onUpdate?: (updated: any) => void;
}

const SubmissionDetailsView: React.FC<SubmissionDetailsViewProps> = ({
  selectedSubmission, setSelectedSubmission, setView, onUpdate
}) => {
  if (!selectedSubmission) return null;
  return (
    <SubmissionDetails
      submission={selectedSubmission}
      onBack={() => {
        setSelectedSubmission(null);
        setView("history");
      }}
      onUpdate={onUpdate}
    />
  );
};

export default SubmissionDetailsView;
