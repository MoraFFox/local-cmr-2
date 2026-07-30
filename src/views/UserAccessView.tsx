import React, { useState } from 'react';
import UserAccessManagement from '../../components/UserAccessManagement';
import CustomCatalogManager from '../../components/CustomCatalogManager';

const UserAccessView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'catalog'>('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-hairline">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-primary border-b-2 border-primary'
              : 'text-latte hover:text-text'
          }`}
        >
          إدارة الوصول
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
      </div>
      {activeTab === 'users' ? <UserAccessManagement /> : <CustomCatalogManager />}
    </div>
  );
};

export default UserAccessView;
