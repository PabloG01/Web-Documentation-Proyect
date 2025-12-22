import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import DocumentsListPage from './pages/DocumentsListPage';
import DocumentViewPage from './pages/DocumentViewPage';
import ProjectsPage from './pages/ProjectsPage';
import './styles/global.css';

function App() {
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/crear" element={<CreatePage />} />
          <Route path="/mis-documentos" element={<DocumentsListPage />} />
          <Route path="/documento/:id" element={<DocumentViewPage />} />
          <Route path="/proyectos" element={<ProjectsPage />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
