import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Road from './pages/Road';
import Dashboard from './pages/Dashboard';
import Lesson from './pages/Lesson';
import Results from './pages/Results';
import Vocabulary from './pages/Vocabulary';
import RoadLesson from './pages/RoadLesson';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Road />} />
        <Route path="/practice" element={<Dashboard />} />
        <Route path="/lesson/:level" element={<Lesson />} />
        <Route path="/road/:level/node/:nodeId" element={<RoadLesson />} />
        <Route path="/results" element={<Results />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
      </Routes>
    </Layout>
  );
}
