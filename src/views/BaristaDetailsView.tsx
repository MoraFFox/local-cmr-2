import React from 'react';
import BaristaDetailsPage from '../../components/BaristaDetailsPage';
import { FormData } from '../../types';

export interface BaristaDetailsViewProps {
  selectedBarista: string | null;
  submissions: (FormData & { created_at: string })[];
  setView: React.Dispatch<React.SetStateAction<string>>;
}

const BaristaDetailsView: React.FC<BaristaDetailsViewProps> = ({
  selectedBarista, submissions, setView
}) => {
  if (!selectedBarista) return null;
  return (
    <BaristaDetailsPage
      baristaName={selectedBarista}
      submissions={submissions}
      onBack={() => setView("baristas")}
    />
  );
};

export default BaristaDetailsView;
