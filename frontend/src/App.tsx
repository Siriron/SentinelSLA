import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Home from './pages/Home';
import RegisterSla from './pages/RegisterSla';
import FileCheck from './pages/FileCheck';
import CheckDetail from './pages/CheckDetail';
import Ledger from './pages/Ledger';
import Docs from './pages/Docs';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterSla />} />
          <Route path="/file" element={<FileCheck />} />
          <Route path="/checks/:checkId" element={<CheckDetail />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
