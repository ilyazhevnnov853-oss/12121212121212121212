import React, { useState } from 'react';
import { StoreProvider } from './store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Builder } from './pages/Builder';
import { Generator } from './pages/Generator';
import { Registry } from './pages/Registry';
import { Dictionaries } from './pages/Dictionaries';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'builder': return <Builder />;
      case 'generator': return <Generator />;
      case 'registry': return <Registry />;
      case 'dictionaries': return <Dictionaries />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
