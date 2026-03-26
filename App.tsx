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
import { Toaster } from 'sonner';

const AppContent: React.FC = () => {
  const { currentUser, currentProjectId } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  // 1. Not Logged In
  if (!currentUser) {
      return <Login />;
  }

  // 2. Logged In, No Project Selected
  if (!currentProjectId) {
      return <ProjectsDashboard />;
  }

  // 3. Project Selected (Main App)
  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className={activeTab === 'dashboard' ? 'h-full w-full' : 'hidden'}>
        <Dashboard />
      </div>
      <div className={activeTab === 'builder' ? 'h-full w-full' : 'hidden'}>
        <Builder />
      </div>
      <div className={activeTab === 'generator' ? 'h-full w-full' : 'hidden'}>
        <Generator />
      </div>
      <div className={activeTab === 'registry' ? 'h-full w-full' : 'hidden'}>
        <Registry />
      </div>
      <div className={activeTab === 'dictionaries' ? 'h-full w-full' : 'hidden'}>
        <Dictionaries />
      </div>
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <Toaster position="top-right" richColors />
      <AppContent />
    </StoreProvider>
  );
}