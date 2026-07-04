import React from 'react';
import PrintableWorkOrder from '../../components/PrintableWorkOrder';
import { partsList, servicesList } from '../../constants';

export interface PrintViewProps {
  setView: React.Dispatch<React.SetStateAction<string>>;
}

const PrintView: React.FC<PrintViewProps> = ({ setView }) => {
  return (
    <PrintableWorkOrder
      onBack={() => setView("history")}
      partsList={partsList}
      servicesList={servicesList}
    />
  );
};

export default PrintView;
