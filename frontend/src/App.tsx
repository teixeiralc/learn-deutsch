import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Lesson from './pages/Lesson';
import Results from './pages/Results';
import Vocabulary from './pages/Vocabulary';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lesson/:level" element={<Lesson />} />
        <Route path="/results" element={<Results />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
      </Routes>
    </Layout>
  );
}
