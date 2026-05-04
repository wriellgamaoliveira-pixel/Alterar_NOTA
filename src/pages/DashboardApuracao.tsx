import { useState } from "react"

export default function DashboardApuracao() {
  const [ativo, setAtivo] = useState("receitas")

  return (
    <div className="p-4">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 rounded-xl mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">📊 Dashboard de Apuração</h1>
          <span className="text-sm opacity-70">
            Sistema de Análise Financeira e Tributária
          </span>
        </div>

        <div className="flex gap-2">
          <button className="bg-white text-slate-800 px-3 py-1 rounded">
            📁 Carregar
          </button>
          <button className="bg-green-600 px-3 py-1 rounded">
            📋 Demo
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <Card titulo="🎫 Ticket Médio" valor="N/D" />
        <Card titulo="👥 Clientes" valor="N/D" cor="green" />
        <Card titulo="💧 Liquidez" valor="N/D" cor="teal" />
        <Card titulo="📈 Faturamento" valor="N/D" cor="purple" />
        <Card titulo="💰 Tributos" valor="N/D" cor="orange" />
        <Card titulo="👷 Funcionários" valor="N/D" cor="red" />
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-2">
        <Tab label="Receitas" ativo={ativo === "receitas"} onClick={() => setAtivo("receitas")} />
        <Tab label="Tributos" ativo={ativo === "tributos"} onClick={() => setAtivo("tributos")} />
        <Tab label="Folha" ativo={ativo === "folha"} onClick={() => setAtivo("folha")} />
        <Tab label="Trimestres" ativo={ativo === "trimestres"} onClick={() => setAtivo("trimestres")} />
      </div>

      {/* TABELAS */}
      <div className="bg-slate-800 rounded-xl p-4">

        {ativo === "receitas" && (
          <Tabela
            colunas={[
              "Mês",
              "Faturamento",
              "SVA",
              "Livros",
              "SCM",
              "Serviços",
            ]}
          />
        )}

        {ativo === "tributos" && (
          <Tabela
            colunas={[
              "Mês",
              "PIS",
              "COFINS",
              "ICMS",
              "IRPJ",
              "CSLL",
              "Total",
            ]}
          />
        )}

        {ativo === "folha" && (
          <Tabela
            colunas={[
              "Mês",
              "Proventos",
              "Funcionários",
            ]}
          />
        )}

        {ativo === "trimestres" && (
          <Tabela
            colunas={[
              "Período",
              "Faturamento",
              "Tributos",
            ]}
          />
        )}

      </div>

    </div>
  )
}

/* COMPONENTES */

function Card({ titulo, valor, cor }: any) {
  const cores: any = {
    green: "border-green-500",
    orange: "border-orange-500",
    purple: "border-purple-500",
    teal: "border-teal-500",
    red: "border-red-500",
  }

  return (
    <div className={`bg-slate-800 p-3 rounded border-l-4 ${cores[cor] || "border-blue-500"}`}>
      <div className="text-xs text-gray-400">{titulo}</div>
      <div className="text-lg font-bold text-white">{valor}</div>
    </div>
  )
}

function Tab({ label, ativo, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-t ${
        ativo ? "bg-slate-800 text-blue-400" : "bg-slate-600 text-white"
      }`}
    >
      {label}
    </button>
  )
}

function Tabela({ colunas }: any) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b border-slate-600">
          {colunas.map((c: string, i: number) => (
            <th key={i}>{c}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        <tr>
          <td colSpan={colunas.length} className="text-center py-6 text-gray-400">
            Nenhum dado carregado
          </td>
        </tr>
      </tbody>
    </table>
  )
}
