import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BeneficiosPublico } from './components/BeneficiosPublico.tsx';
import './index.css';

// Página pública: renderizada quando acessada via beneficios.soulbrasil.co
// (Cloudflare aponta o subdomínio para Railway; Railway serve index.html na raiz)
const isPublicBeneficios =
  window.location.hostname === 'beneficios.soulbrasil.co' ||
  window.location.pathname === '/beneficios';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPublicBeneficios ? <BeneficiosPublico /> : <App />}
  </StrictMode>
);
