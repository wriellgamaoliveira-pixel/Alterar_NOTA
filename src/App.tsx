import { Routes, Route } from 'react-router-dom';
import { ModuleProvider } from '@/context/ModuleContext';
import Navbar from '@/components/shared/Navbar';
import Home from '@/pages/Home';
import NotaUnica from '@/pages/NotaUnica';
import ResumoCClass from '@/pages/ResumoCClass';
import ResumoImposto from '@/pages/ResumoImposto';
import AlteracaoLote from '@/pages/AlteracaoLote';
import RelatorioCST from '@/pages/RelatorioCST';

function App() {
  return (
    <ModuleProvider>
      <div className="min-h-screen bg-[#0f172a]">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nota-unica" element={<NotaUnica />} />
            <Route path="/resumo-cclass" element={<ResumoCClass />} />
            <Route path="/resumo-imposto" element={<ResumoImposto />} />
            <Route path="/alteracao-lote" element={<AlteracaoLote />} />
            <Route path="/relatorio-cst" element={<RelatorioCST />} />
          </Routes>
        </main>
      </div>
    </ModuleProvider>
  );
}

export default App;
