import React, { useState } from 'react';
import CompanyMachinesSettings from './CompanyMachinesSettings';
import CustomCatalogManager from '../../components/CustomCatalogManager';
import WordExportTemplateSettings from '../../components/WordExportTemplateSettings';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'machines' | 'catalog' | 'word'>('machines');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-hairline">
        <button
          onClick={() => setActiveTab('machines')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'machines'
              ? 'text-primary border-b-2 border-primary'
              : 'text-latte hover:text-text'
          }`}
        >
          إدارة الماكينات
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'catalog'
              ? 'text-primary border-b-2 border-primary'
              : 'text-latte hover:text-text'
          }`}
        >
          الكتالوج المخصص
        </button>
        <button
          onClick={() => setActiveTab('word')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'word'
              ? 'text-primary border-b-2 border-primary'
              : 'text-latte hover:text-text'
          }`}
        >
          قالب تصدير Word
        </button>
      </div>
      {activeTab === 'machines' ? (
        <CompanyMachinesSettings />
      ) : activeTab === 'catalog' ? (
        <CustomCatalogManager />
      ) : (
        <WordExportTemplateSettings />
      )}
    </div>
  );
};

export default SettingsView;
