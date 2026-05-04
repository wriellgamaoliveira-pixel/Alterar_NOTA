import { Routes, Route } from "react-router-dom"

import Home from "@/pages/Home"
import DashboardApuracao from "@/pages/DashboardApuracao"
import NotaUnica from "@/pages/NotaUnica"
import AlteracaoLote from "@/pages/AlteracaoLote"
import ResumoCClass from "@/pages/ResumoCClass"
import ResumoImposto from "@/pages/ResumoImposto"
import RelatorioCST from "@/pages/RelatorioCST"
import ExportarXmlPorIE from "@/pages/ExportarXmlPorIE"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard-apuracao" element={<DashboardApuracao />} />
      <Route path="/nota-unica" element={<NotaUnica />} />
      <Route path="/alteracao-lote" element={<AlteracaoLote />} />
      <Route path="/cclass" element={<ResumoCClass />} />
      <Route path="/imposto" element={<ResumoImposto />} />
      <Route path="/relatorio-cst" element={<RelatorioCST />} />
      <Route path="/exportar-xml" element={<ExportarXmlPorIE />} />
    </Routes>
  )
}
