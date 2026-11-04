import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '5563992038278';
const BROWSER_ID_KEY = 'portal-fiscal-access-browser-id';

function browserId() {
  const saved = localStorage.getItem(BROWSER_ID_KEY);
  if (saved) return saved;
  const created = crypto.randomUUID();
  localStorage.setItem(BROWSER_ID_KEY, created);
  return created;
}

export default function SolicitarAcesso() {
  const [username, setUsername] = useState('');
  const [request, setRequest] = useState<{ username: string; code: string; message: string }>();
  const [feedback, setFeedback] = useState('');

  function generateRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = username.trim();
    if (!name) return;
    try {
      const code = browserId();
      const message = [
        'Solicitação de acesso — Portal Fiscal XML',
        `Usuário: ${name}`,
        `Código do navegador: ${code}`,
        'Solicito a liberação de acesso. Aguardo a aprovação e o prazo definido pelo responsável.',
      ].join('\n');
      setRequest({ username: name, code, message });
      setFeedback('Pedido preparado. Abra o WhatsApp e toque em Enviar para encaminhá-lo ao responsável.');
    } catch {
      setFeedback('Não foi possível guardar o código deste navegador. Verifique se o armazenamento local está permitido e tente novamente.');
    }
  }

  async function copyRequest() {
    if (!request) return;
    try {
      await navigator.clipboard.writeText(request.message);
      setFeedback('Pedido copiado. Cole na conversa com o responsável pelo acesso.');
    } catch {
      setFeedback('Não foi possível copiar automaticamente. Selecione e copie o texto do pedido abaixo.');
    }
  }

  return <div className="mx-auto max-w-2xl space-y-6 px-6 py-8 text-slate-200">
    <div>
      <h1 className="text-2xl font-bold text-white">Solicitar acesso</h1>
      <p className="mt-2 text-sm text-slate-400">Informe seu usuário e envie o pedido ao responsável pelo WhatsApp.</p>
    </div>
    <form onSubmit={generateRequest} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/70 p-5">
      <label className="bk-label">Nome de usuário
        <input required maxLength={80} autoComplete="username" className="bk-input" value={username} onChange={(event) => { setUsername(event.target.value); setRequest(undefined); setFeedback(''); }} placeholder="Ex.: gama" />
      </label>
      <button type="submit" disabled={!username.trim()} className="bk-button disabled:opacity-50">Preparar pedido</button>
      <p className="text-xs text-slate-400">O pedido contém somente o nome informado e um código aleatório deste navegador. Nenhum XML ou dado fiscal será incluído.</p>
    </form>
    {request && <section className="space-y-4 rounded-xl border border-sky-500/30 bg-slate-900/70 p-5">
      <h2 className="font-semibold text-white">Pedido de {request.username}</h2>
      <textarea aria-label="Mensagem do pedido" readOnly rows={6} value={request.message} className="bk-input w-full resize-y text-sm" />
      <div className="flex flex-wrap gap-3">
        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(request.message)}`} target="_blank" rel="noopener noreferrer" className="bk-button"><MessageCircle className="h-4 w-4" />Abrir WhatsApp para enviar</a>
        <button type="button" onClick={copyRequest} className="bk-button-secondary"><Copy className="h-4 w-4" />Copiar pedido</button>
      </div>
      <p className="text-xs text-slate-400">Destino: +55 63 99203-8278. A mensagem abre preenchida; confirme o envio no WhatsApp. Enviar o pedido não libera o acesso automaticamente.</p>
    </section>}
    {feedback && <p role="status" className="text-sm text-sky-200">{feedback}</p>}
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">Esta tela prepara a solicitação. A ativação por código e o bloqueio por vencimento ainda não estão disponíveis.</p>
  </div>;
}
