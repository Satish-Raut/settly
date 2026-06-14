import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ImportWizard from './pages/ImportWizard';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'auth' | 'dashboard' | 'import'
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Simple route router
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home setCurrentPage={setCurrentPage} />;
      case 'auth':
        return <Auth setCurrentPage={setCurrentPage} />;
      case 'dashboard':
        return isAuthenticated ? (
          <Dashboard setCurrentPage={setCurrentPage} />
        ) : (
          <Auth setCurrentPage={setCurrentPage} />
        );
      case 'import':
        return isAuthenticated ? (
          <ImportWizard setCurrentPage={setCurrentPage} />
        ) : (
          <Auth setCurrentPage={setCurrentPage} />
        );
      default:
        return <Home setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {renderPage()}
    </div>
  );
};

export default App;

