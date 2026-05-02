import { useState } from "react"
import { parseApuracaoHTML } from "@/parsers/htmlSafeParser"

export default function DashboardApuracao() {
  const [dados, setDados] = useState<any[]>([])

  const handleUpload = async (file: File) => {
    const text = await file.text()
    const resultado = parseApuracaoHTML(text)
    setDados(resultado || [])
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard de Apuração</h1>

      <input
        type="file"
        accept=".html"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
        }}
      />

      <table border={1} style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th>Coluna 1</th>
            <th>Coluna 2</th>
            <th>Coluna 3</th>
          </tr>
        </thead>

        <tbody>
          {dados.map((d, i) => (
            <tr key={i}>
              <td>{d.col1}</td>
              <td>{d.col2}</td>
              <td>{d.col3}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
