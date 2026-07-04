import React from 'react';
import BaristasPage from '../../components/BaristasPage';
import { FormData } from '../../types';

export interface BaristasViewProps {
  submissions: (FormData & { created_at: string })[];
  setSelectedBarista: React.Dispatch<React.SetStateAction<string | null>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
  handleDeleteBarista: (sources: any[]) => void;
  handleUpdateBarista: (sources: any[], newDetails: { name: string; phone: string }) => void;
}

const BaristasView: React.FC<BaristasViewProps> = ({
  submissions, setSelectedBarista, setView, handleDeleteBarista, handleUpdateBarista
}) => {
  return (
    <BaristasPage
      submissions={submissions}
      onViewDetails={(name) => {
        setSelectedBarista(name);
        setView("barista-details");
      }}
      onDelete={handleDeleteBarista}
      onUpdate={handleUpdateBarista}
    />
  );
};

export default BaristasView;
