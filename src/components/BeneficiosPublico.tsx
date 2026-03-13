import { useState, useEffect } from 'react';
import { supabase as _supabase } from '../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;

// ─── SOUL IDENTITY (light theme) ─────────────────────────────────────────────
const GREEN = '#00C896';
const GREEN_DARK = '#00A87C';
const BG = '#F4F7F6';
const WHITE = '#FFFFFF';
const TEXT = '#111827';
const TEXT2 = '#6B7280';
const BORDER = '#E5E7EB';
const SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Parceiro {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  beneficio: string | null;
  logo_url: string | null;
  registro_profissional: string | null;
  // pricing
  valor_original: number | null;
  valor_unidade: string | null;
  desconto_tipo: 'percent' | 'valor' | null;
  desconto_valor: number | null;
  // delivery
  modalidade: 'presencial' | 'online' | 'híbrido' | null;
  cidade_estado: string | null;
  // interno
  comissao_percent: number | null;
}

function calcPrecoComDesconto(p: Parceiro): number | null {
  if (!p.valor_original || !p.desconto_tipo || !p.desconto_valor) return null;
  if (p.desconto_tipo === 'percent') return p.valor_original * (1 - p.desconto_valor / 100);
  return p.valor_original - p.desconto_valor;
}

type ResgateStep = 'form' | 'validating' | 'success' | 'duplicate' | 'error';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  'Todos',
  'Saúde e Performance',
  'Equipamentos e Suplementos',
  'Estilo de Vida e Logística',
  'Mentorias Soul',
];

const CAT_CODE: Record<string, string> = {
  'Saúde e Performance': 'SAU',
  'Equipamentos e Suplementos': 'EQU',
  'Estilo de Vida e Logística': 'EST',
  'Mentorias Soul': 'MNT',
};

const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  'Saúde e Performance':        { bg: '#DCFCE7', text: '#166534' },
  'Equipamentos e Suplementos': { bg: '#DBEAFE', text: '#1E40AF' },
  'Estilo de Vida e Logística': { bg: '#FEF9C3', text: '#854D0E' },
  'Mentorias Soul':             { bg: '#F3E8FF', text: '#6B21A8' },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function randomCode(n = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export function BeneficiosPublico() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('Todos');

  const [selected, setSelected] = useState<Parceiro | null>(null);
  const [resgateStep, setResgateStep] = useState<ResgateStep>('form');
  const [resgateInput, setResgateInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase
      .from('marketplace_parceiros')
      .select('id,nome,categoria,descricao,beneficio,logo_url,registro_profissional,valor_original,valor_unidade,desconto_tipo,desconto_valor,modalidade,cidade_estado,comissao_percent')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }: { data: Parceiro[] | null }) => {
        setParceiros(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = catFilter === 'Todos' ? parceiros : parceiros.filter((p) => p.categoria === catFilter);

  function openResgate(p: Parceiro) {
    setSelected(p);
    setResgateStep('form');
    setResgateInput('');
    setCouponCode('');
    setErrorMsg('');
  }

  function closeModal() { setSelected(null); }

  async function handleResgate() {
    const email = resgateInput.trim().toLowerCase();
    if (!email) { setErrorMsg('Informe seu e-mail cadastrado na Soul.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMsg('E-mail inválido.'); return; }

    setResgateStep('validating');
    setErrorMsg('');

    const { data: exists, error: rpcErr } = await supabase.rpc('check_athlete_email', { p_email: email });
    if (rpcErr || !exists) {
      setResgateStep('error');
      setErrorMsg('E-mail não encontrado na plataforma Soul. Verifique se é o mesmo e-mail do seu cadastro.');
      return;
    }

    const catCode = CAT_CODE[selected!.categoria] ?? 'GEN';
    const codigo = `SOUL-${catCode}-${randomCode(4)}`;

    const { error: insertErr } = await supabase.from('marketplace_cupons').insert({
      parceiro_id: selected!.id,
      atleta_email: email,
      codigo,
    });

    if (insertErr) {
      if (insertErr.code === '23505') { setResgateStep('duplicate'); }
      else { setResgateStep('error'); setErrorMsg('Erro ao gerar cupom. Tente novamente.'); }
      return;
    }

    setCouponCode(codigo);
    setResgateStep('success');

    // Auto-cria transação no admin
    const precoFinalAuto = calcPrecoComDesconto(selected!);
    const valorBruto = precoFinalAuto ?? selected!.valor_original ?? 0;
    supabase.from('marketplace_transacoes').insert({
      parceiro_id: selected!.id,
      atleta_email: email,
      valor_unitario: valorBruto,
      quantidade: 1,
      valor_bruto: valorBruto,
      comissao_percent: selected!.comissao_percent ?? 0,
      status_repasse: 'pendente',
      status_repasse_parceiro: 'pendente',
    }).then(({ error }: { error: unknown }) => {
      if (error) console.error('[auto-transacao] erro:', error);
    });

    // Notifica equipe Soul por e-mail (fire-and-forget)
    supabase.functions.invoke('notify-coupon', {
      body: {
        atleta_email: email,
        parceiro_nome: selected!.nome,
        parceiro_categoria: selected!.categoria,
        codigo,
        data_resgate: new Date().toISOString(),
      },
    }).catch(() => { /* falha silenciosa — cupom já foi gerado */ });
  }

  // ── Sub-components ────────────────────────────────────────────────────────
  function CatBadge({ cat }: { cat: string }) {
    const c = CAT_COLOR[cat] ?? { bg: '#F3F4F6', text: '#374151' };
    return (
      <span style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        padding: '3px 8px',
        borderRadius: 20,
        background: c.bg,
        color: c.text,
        textTransform: 'uppercase' as const,
      }}>
        {cat}
      </span>
    );
  }

  function ModalidadeBadge({ m }: { m: string }) {
    return (
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 20,
        background: '#E0F2FE',
        color: '#0369A1',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
      }}>
        {m}
      </span>
    );
  }

  function ParceiroCard({ p }: { p: Parceiro }) {
    const precoFinal = calcPrecoComDesconto(p);
    return (
      <div
        onClick={() => openResgate(p)}
        style={{
          background: WHITE,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          cursor: 'pointer',
          boxShadow: SHADOW,
          transition: 'box-shadow 0.2s, transform 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,200,150,0.15)`;
          e.currentTarget.style.borderColor = GREEN;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = SHADOW;
          e.currentTarget.style.borderColor = BORDER;
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Logo */}
        {p.logo_url ? (
          <img src={p.logo_url} alt={p.nome}
            style={{ height: 40, width: 'auto', objectFit: 'contain', borderRadius: 6 }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${GREEN}22, ${GREEN}44)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: GREEN,
          }}>
            {p.nome[0]}
          </div>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <CatBadge cat={p.categoria} />
          {p.modalidade && <ModalidadeBadge m={p.modalidade} />}
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>{p.nome}</div>

        {p.cidade_estado && p.modalidade !== 'online' && (
          <div style={{ fontSize: 12, color: TEXT2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>📍</span> {p.cidade_estado}
          </div>
        )}

        {/* Pricing block */}
        {precoFinal != null && p.valor_original != null && (
          <div style={{
            background: `linear-gradient(135deg, ${GREEN}0D, ${GREEN}1A)`,
            border: `1px solid ${GREEN}33`,
            borderRadius: 10,
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, color: GREEN_DARK, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>
              PREÇO EXCLUSIVO SOUL
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: TEXT2, textDecoration: 'line-through' }}>
                R$ {p.valor_original.toFixed(2)}{p.valor_unidade ? `/${p.valor_unidade}` : ''}
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: GREEN_DARK }}>
                R$ {precoFinal.toFixed(2)}
              </span>
              {p.valor_unidade && <span style={{ fontSize: 12, color: TEXT2 }}>/{p.valor_unidade}</span>}
              {p.desconto_tipo === 'percent' && p.desconto_valor && (
                <span style={{
                  fontSize: 11, fontWeight: 700, background: GREEN, color: WHITE,
                  padding: '2px 7px', borderRadius: 20,
                }}>
                  {p.desconto_valor}% OFF
                </span>
              )}
            </div>
          </div>
        )}

        {p.beneficio && (
          <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.6, flexGrow: 1 }}>{p.beneficio}</div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); openResgate(p); }}
          style={{
            background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`,
            color: WHITE,
            border: 'none',
            borderRadius: 10,
            padding: '11px 0',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 4,
            width: '100%',
            letterSpacing: 0.3,
          }}
        >
          Resgatar benefício →
        </button>
      </div>
    );
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function ModalContent() {
    if (!selected) return null;

    const closeBtn = (
      <button onClick={closeModal} style={{
        position: 'absolute', top: 16, right: 16,
        background: '#F3F4F6', border: 'none', borderRadius: '50%',
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: TEXT2, fontSize: 16, cursor: 'pointer', lineHeight: 1,
      }}>✕</button>
    );

    const inputStyle: React.CSSProperties = {
      background: '#F9FAFB',
      border: `1.5px solid ${BORDER}`,
      borderRadius: 10,
      color: TEXT,
      fontSize: 14,
      padding: '12px 14px',
      width: '100%',
      boxSizing: 'border-box',
      outline: 'none',
    };

    const submitStyle: React.CSSProperties = {
      background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`,
      color: WHITE,
      border: 'none',
      borderRadius: 10,
      padding: '13px 0',
      fontSize: 14,
      fontWeight: 700,
      cursor: 'pointer',
      width: '100%',
      marginTop: 12,
      letterSpacing: 0.3,
    };

    if (resgateStep === 'form') {
      const precoFinalModal = calcPrecoComDesconto(selected);
      return (
        <>
          {closeBtn}

          {/* Partner header */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            {selected.logo_url ? (
              <img src={selected.logo_url} alt={selected.nome}
                style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#F9FAFB', padding: 4 }} />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${GREEN}22, ${GREEN}44)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, color: GREEN,
              }}>
                {selected.nome[0]}
              </div>
            )}
            <div style={{ flex: 1, paddingRight: 32 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                <CatBadge cat={selected.categoria} />
                {selected.modalidade && <ModalidadeBadge m={selected.modalidade} />}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: TEXT, lineHeight: 1.2 }}>{selected.nome}</div>
              {selected.cidade_estado && selected.modalidade !== 'online' && (
                <div style={{ fontSize: 12, color: TEXT2, marginTop: 4 }}>📍 {selected.cidade_estado}</div>
              )}
            </div>
          </div>

          {selected.descricao && (
            <p style={{ fontSize: 13, color: TEXT2, lineHeight: 1.7, marginBottom: 14 }}>{selected.descricao}</p>
          )}

          {/* Pricing */}
          {precoFinalModal != null && selected.valor_original != null && (
            <div style={{
              background: `linear-gradient(135deg, ${GREEN}0D, ${GREEN}1A)`,
              border: `1px solid ${GREEN}33`,
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: GREEN_DARK, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>
                PREÇO EXCLUSIVO SOUL
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 13, color: TEXT2, textDecoration: 'line-through' }}>
                  De R$ {selected.valor_original.toFixed(2)}{selected.valor_unidade ? `/${selected.valor_unidade}` : ''}
                </span>
                <span style={{ fontSize: 26, fontWeight: 900, color: GREEN_DARK }}>
                  R$ {precoFinalModal.toFixed(2)}
                </span>
                {selected.valor_unidade && <span style={{ fontSize: 13, color: TEXT2 }}>/{selected.valor_unidade}</span>}
                {selected.desconto_tipo === 'percent' && selected.desconto_valor && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, background: GREEN, color: WHITE,
                    padding: '3px 10px', borderRadius: 20,
                  }}>
                    {selected.desconto_valor}% OFF
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Benefit */}
          {selected.beneficio && (
            <div style={{
              background: '#F0FDF4',
              border: `1px solid #BBF7D0`,
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 18,
            }}>
              <div style={{ fontSize: 10, color: '#166534', fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>
                BENEFÍCIO INCLUSO
              </div>
              <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>{selected.beneficio}</div>
            </div>
          )}

          {selected.registro_profissional && (
            <div style={{ fontSize: 11, color: TEXT2, marginBottom: 14 }}>
              Registro profissional: {selected.registro_profissional}
            </div>
          )}

          <div style={{ fontSize: 13, color: TEXT2, marginBottom: 10 }}>
            Informe seu e-mail para gerar o cupom:
          </div>

          <input
            style={inputStyle}
            type="email"
            placeholder="seu@email.com"
            value={resgateInput}
            onChange={(e) => { setResgateInput(e.target.value); setErrorMsg(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleResgate()}
            autoFocus
          />

          {errorMsg && (
            <div style={{ fontSize: 12, color: '#DC2626', marginTop: 8, padding: '8px 12px', background: '#FEF2F2', borderRadius: 8 }}>
              {errorMsg}
            </div>
          )}

          <button style={submitStyle} onClick={handleResgate}>
            Gerar meu cupom
          </button>

          <div style={{ fontSize: 11, color: TEXT2, marginTop: 14, textAlign: 'center' }}>
            Aguarde a confirmação da Soul para receber o contato do parceiro.
          </div>
        </>
      );
    }

    if (resgateStep === 'validating') {
      return (
        <>
          {closeBtn}
          <div style={{ textAlign: 'center', padding: '56px 0', color: TEXT2 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: `3px solid ${BORDER}`, borderTopColor: GREEN,
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            <div style={{ fontSize: 14 }}>Validando cadastro...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </>
      );
    }

    if (resgateStep === 'success') {
      return (
        <>
          {closeBtn}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 24,
            }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 4 }}>
              Cupom gerado com sucesso!
            </div>
            <div style={{ fontSize: 13, color: TEXT2 }}>{selected.nome}</div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${GREEN}08, ${GREEN}14)`,
            border: `2px solid ${GREEN}`,
            borderRadius: 14,
            padding: '24px 20px',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, color: TEXT2, letterSpacing: 3, marginBottom: 10 }}>SEU CUPOM EXCLUSIVO</div>
            <div style={{
              fontSize: 32, fontWeight: 900, color: GREEN_DARK,
              letterSpacing: 6, fontVariantNumeric: 'tabular-nums',
            }}>
              {couponCode}
            </div>
            <div style={{ fontSize: 12, color: TEXT2, marginTop: 12 }}>
              Apresente este código à Soul para resgatar seu benefício
            </div>
          </div>

          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
            padding: '10px 14px', fontSize: 12, color: '#92400E', textAlign: 'center', marginBottom: 16,
          }}>
            Em breve a Soul entrará em contato com o link de agendamento.
          </div>

          <button style={{
            background: WHITE, color: TEXT2, border: `1.5px solid ${BORDER}`,
            borderRadius: 10, padding: '12px 0', fontSize: 13, cursor: 'pointer', width: '100%',
          }} onClick={closeModal}>Fechar</button>
        </>
      );
    }

    if (resgateStep === 'duplicate') {
      return (
        <>
          {closeBtn}
          <div style={{ textAlign: 'center', padding: '32px 0 20px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#F0FDF4', border: `2px solid #BBF7D0`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 24, color: '#16A34A',
            }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
              Benefício já resgatado!
            </div>
            <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.7, marginBottom: 16 }}>
              Você já gerou um cupom para <strong style={{ color: TEXT }}>{selected.nome}</strong>.
              <br />Aguarde o contato da Soul para finalizar o agendamento.
            </div>
          </div>
          <button style={{
            background: WHITE, color: TEXT2, border: `1.5px solid ${BORDER}`,
            borderRadius: 10, padding: '12px 0', fontSize: 13, cursor: 'pointer', width: '100%',
          }} onClick={closeModal}>Fechar</button>
        </>
      );
    }

    // error
    return (
      <>
        {closeBtn}
        <div style={{ textAlign: 'center', padding: '32px 0 20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2', border: '2px solid #FECACA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 22, color: '#DC2626',
          }}>✕</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
            Não foi possível gerar o cupom
          </div>
          <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.7, marginBottom: 24 }}>{errorMsg}</div>
        </div>
        <button style={{
          background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`,
          color: WHITE, border: 'none', borderRadius: 10,
          padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
        }} onClick={() => { setResgateStep('form'); setErrorMsg(''); }}>
          Tentar novamente
        </button>
        <button style={{
          background: WHITE, color: TEXT2, border: `1.5px solid ${BORDER}`,
          borderRadius: 10, padding: '12px 0', fontSize: 13, cursor: 'pointer', width: '100%', marginTop: 10,
        }} onClick={closeModal}>Cancelar</button>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: TEXT }}>

      {/* Header */}
      <header style={{
        background: WHITE,
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/soul-logo.png"
              alt="Soul Brasil"
              style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div style={{ fontSize: 12, color: TEXT2 }}>
            Exclusivo para atletas cadastrados
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: `${GREEN}18`, color: GREEN_DARK,
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            padding: '5px 14px', borderRadius: 20, marginBottom: 16,
          }}>
            SOUL INDICA
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: TEXT, margin: '0 0 12px', lineHeight: 1.15 }}>
            Benefícios exclusivos<br />para atletas Soul
          </h1>
          <p style={{ fontSize: 16, color: TEXT2, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Serviços selecionados pela Soul. Use seu e-mail cadastrado na plataforma para resgatar condições únicas.
          </p>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORIAS.map((cat) => {
            const active = catFilter === cat;
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                background: active ? `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` : WHITE,
                color: active ? WHITE : TEXT2,
                border: `1.5px solid ${active ? GREEN : BORDER}`,
                borderRadius: 24,
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                boxShadow: active ? `0 2px 8px ${GREEN}44` : 'none',
                transition: 'all 0.15s',
              }}>
                {cat}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: TEXT2 }}>Carregando parceiros...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: TEXT2 }}>Nenhum parceiro disponível nesta categoria.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
            {filtered.map((p) => <ParceiroCard key={p.id} p={p} />)}
          </div>
        )}

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 64, paddingTop: 32, borderTop: `1px solid ${BORDER}`, color: TEXT2, fontSize: 12 }}>
          © 2026 Soul Brasil Esportes. Todos os direitos reservados.
          <br />
          Dúvidas? Entre em contato com a Soul Brasil Esportes por{' '}
          <a href="mailto:contato@soulbrasil.co"
            style={{ color: GREEN_DARK, textDecoration: 'none', fontWeight: 600 }}>
            e-mail
          </a>
          {' '}ou{' '}
          <a href="https://wa.me/554184079334" target="_blank" rel="noopener noreferrer"
            style={{ color: GREEN_DARK, textDecoration: 'none', fontWeight: 600 }}>
            WhatsApp
          </a>.
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
          onClick={closeModal}
        >
          <div
            style={{ background: WHITE, borderRadius: 20, padding: 32, maxWidth: 480, width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalContent />
          </div>
        </div>
      )}
    </div>
  );
}
