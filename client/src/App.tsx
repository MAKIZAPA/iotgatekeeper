import React, { useState, useEffect } from 'react';
import { GatekeeperProvider } from './context/GatekeeperContext';
import { Dashboard } from './pages/Dashboard';
import { Operator } from './pages/Operator';
import { MobileApp } from './pages/MobileApp';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderView = () => {
    if (currentPath === '/operator') {
      return <Operator onNavigate={handleNavigate} />;
    }
    if (currentPath === '/mobile') {
      return <MobileApp onNavigate={handleNavigate} />;
    }
    return <Dashboard onNavigate={handleNavigate} />;
  };

  return (
    <GatekeeperProvider>
      {renderView()}
    </GatekeeperProvider>
  );
};

export default App;
