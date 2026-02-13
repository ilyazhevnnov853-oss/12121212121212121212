import React, { useState } from 'react';
import { useStore, StoreProvider } from './store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Builder } from './pages/Builder';
import { Generator } from './pages/Generator';
import { Registry } from './pages/Registry';
import { Dictionaries } from './pages/Dictionaries';
import { Login } from './pages/Login';
import { ProjectsDashboard } from './pages/ProjectsDashboard';
import { AdminLibrary } from './pages/AdminLibrary';

const AppContent: React.FC = () => {
  const { currentUser, currentProjectId } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  // 1. Not Logged In
  if (!currentUser) {
      return <Login />;
  }

  // 2. Admin Library Mode
  // If currentProjectId is the special "ADMIN_LIB", show the Admin Library
  if (currentProjectId === 'ADMIN_LIB') {
      return <AdminLibrary />;
  }

  // 3. Logged In, No Project Selected
  if (!currentProjectId) {
      return <ProjectsDashboard />;
  }

  // 4. Project Selected (Main App)
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'builder': return <Builder />;
      case 'generator': return <Generator />;
      case 'registry': return <Registry />;
      case 'dictionaries': return <Dictionaries />;
      // Note: AdminLibrary is now a top-level route (Step 2), accessible via ADMIN_LIB "project ID"
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