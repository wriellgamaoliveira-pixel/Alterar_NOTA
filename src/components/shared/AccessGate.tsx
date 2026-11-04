import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import SolicitarAcesso from '@/pages/SolicitarAcesso';
import { accessNow, getBrowserId, LICENSE_KEY, validateLicensePeriod, verifyAccessLicense } from '@/services/accessLicense';
import type { AccessLicense } from '@/services/accessLicense';

export default function AccessGate({ children }: { children: ReactNode }) {
  const [license, setLicense] = useState<AccessLicense>();
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('Acesso bloqueado. Solicite a liberação ao responsável.');

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const token = localStorage.getItem(LICENSE_KEY);
        if (!token) throw new Error('Acesso bloqueado. Solicite a liberação ao responsável.');
        const verified = await verifyAccessLicense(token, getBrowserId(), accessNow());
        if (active) setLicense(verified);
      } catch (error) {
        if (active) { setLicense(undefined); setMessage(error instanceof Error ? error.message : 'Acesso bloqueado.'); }
      } finally { if (active) setChecking(false); }
    }
    void check();
    const storage = () => { setLicense(undefined); void check(); };
    window.addEventListener('storage', storage);
    return () => { active = false; window.removeEventListener('storage', storage); };
  }, []);

  useEffect(() => {
    if (!license) return;
    function checkExpiration() {
      try { validateLicensePeriod(license!, getBrowserId(), accessNow()); }
      catch (error) { setLicense(undefined); setMessage(error instanceof Error ? error.message : 'Acesso bloqueado.'); }
    }
    const timer = window.setInterval(checkExpiration, 1000);
    window.addEventListener('focus', checkExpiration);
    document.addEventListener('visibilitychange', checkExpiration);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', checkExpiration); document.removeEventListener('visibilitychange', checkExpiration); };
  }, [license]);

  async function activate(code: string) {
    const verified = await verifyAccessLicense(code, getBrowserId(), accessNow());
    localStorage.setItem(LICENSE_KEY, code.trim());
    setLicense(verified);
  }

  if (checking) return <div className="min-h-screen bg-slate-950 p-8 text-slate-200" role="status">Verificando liberação de acesso...</div>;
  if (!license) return <div className="min-h-screen bg-[#0f172a]"><SolicitarAcesso onActivate={activate} accessMessage={message} /></div>;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-6 py-2 text-xs text-slate-300">
      <span>Usuário: {license.username} · Liberado até {new Date(license.expiresAt).toLocaleString('pt-BR')}</span>
      <button onClick={() => { localStorage.removeItem(LICENSE_KEY); setLicense(undefined); setMessage('Acesso encerrado neste navegador.'); }} className="text-sky-300">Encerrar acesso</button>
    </div>
    {children}
  </>;
}
