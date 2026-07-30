import React from 'react';
import GlobalRecordsPage from '../../components/GlobalRecordsPage';
import { FormData, MaintenanceRecord } from '../../types';

export interface GlobalRecordsViewProps {
  submissions: (FormData & { created_at: string })[];
  getTechnicianDisplayName: (record: MaintenanceRecord) => string;
  isLoading?: boolean;
}

const GlobalRecordsView: React.FC<GlobalRecordsViewProps> = ({
  submissions,
  getTechnicianDisplayName,
  isLoading,
}) => {
  return (
    <GlobalRecordsPage
      submissions={submissions}
      getTechnicianDisplayName={getTechnicianDisplayName}
      isLoading={isLoading}
    />
  );
};

export default GlobalRecordsView;
