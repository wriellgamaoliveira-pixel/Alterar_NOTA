export function parseApuracaoHTML(html: string) {
  try {
    if (typeof window === "undefined") {
      return null
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    const linhas = Array.from(doc.querySelectorAll("table tr"))

    const dados = linhas.map((tr) => {
      const cols = tr.querySelectorAll("td")
      return {
        col1: cols[0]?.textContent?.trim() || "",
        col2: cols[1]?.textContent?.trim() || "",
        col3: cols[2]?.textContent?.trim() || "",
      }
    })

    return dados.filter(l => l.col1 !== "")
  } catch (e) {
    console.error("Erro ao parsear HTML:", e)
    return []
  }
}
