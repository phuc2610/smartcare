import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Prescribe from './pages/Prescribe.tsx';
import PatientDetails from './pages/PatientDetails.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import './index.css';

function App() {
  // Simple auth check mock for now
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/prescribe/:patientId" 
          element={isAuthenticated ? <Prescribe /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/patients/:patientId" 
          element={isAuthenticated ? <PatientDetails /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
