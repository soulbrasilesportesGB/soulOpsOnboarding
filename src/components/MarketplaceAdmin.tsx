import { useState, useEffect, useRef } from 'react';
import { supabase as _supabase } from '../lib/supabase';
import { Download, Upload } from 'lucide-react';

// Tipos gerados pelo Supabase ainda não incluem as tabelas marketplace_*
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Parceiro {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  beneficio: string | null;
  contato: string | null;
  logo_url: string | null;
  registro_profissional: string | null;
  ativo: boolean;
  criado_em: string;
  // pricing
  valor_original: number | null;
  valor_unidade: string | null;
  desconto_tipo: 'percent' | 'valor' | null;
  desconto_valor: number | null;
  // delivery
  modalidade: 'presencial' | 'online' | 'híbrido' | null;
  cidade_estado: string | null;
  // comissão padrão Soul para este parceiro
  comissao_percent: number;
  // financeiro Soul
  mensalidade_valor: number | null;
  mensalidade_status: 'ativo' | 'pendente' | 'inadimplente';
  // admin-only
  link_agendamento: string | null;
}

interface Transacao {
  id: string;
  parceiro_id: string;
  atleta_email: string | null;
  valor_unitario: number | null;
  quantidade: number;
  valor_bruto: number;
  comissao_percent: number;
  valor_liquido: number;
  status_repasse: 'pendente' | 'pago';
  status_repasse_parceiro: 'pendente' | 'pago';
  criado_em: string;
}

interface UserSuggestion {
  email: string;
  full_name: string | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  'Saúde e Performance',
  'Equipamentos e Suplementos',
  'Estilo de Vida e Logística',
  'Mentorias Soul',
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function emptyParceiroForm() {
  return {
    nome: '',
    categoria: CATEGORIAS[0],
    descricao: '',
    beneficio: '',
    contato: '',
    logo_url: '',
    registro_profissional: '',
    valor_original: '',
    valor_unidade: '',
    desconto_tipo: 'percent' as 'percent' | 'valor',
    desconto_valor: '',
    modalidade: 'online' as 'presencial' | 'online' | 'híbrido',
    cidade_estado: '',
    mensalidade_valor: '',
    mensalidade_status: 'ativo' as 'ativo' | 'pendente' | 'inadimplente',
    comissao_percent: '',
    link_agendamento: '',
  };
}

function emptyTransForm() {
  return {
    parceiro_id: '',
    atleta_email: '',
    valor_unitario: '',
    quantidade: '1',
    comissao_percent: '',
  };
}

function calcPrecoComDesconto(form: ReturnType<typeof emptyParceiroForm>): number | null {
  const orig = parseFloat(form.valor_original);
  const desc = parseFloat(form.desconto_valor);
  if (!orig || !desc) return null;
  if (form.desconto_tipo === 'percent') return orig * (1 - desc / 100);
  return orig - desc;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const content = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export function MarketplaceAdmin() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [cuponsCounts, setCuponsCounts] = useState<Record<string, number>>({});
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const [showParceiroForm, setShowParceiroForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parceiroForm, setParceiroForm] = useState(emptyParceiroForm());
  const [logoUploading, setLogoUploading] = useState(false);

  const [showTransForm, setShowTransForm] = useState(false);
  const [transForm, setTransForm] = useState(emptyTransForm());

  // Email autocomplete
  const [emailSuggestions, setEmailSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('marketplace_parceiros').select('*').order('nome'),
      supabase.from('marketplace_cupons').select('id, parceiro_id'),
      supabase.from('marketplace_transacoes').select('*').order('criado_em', { ascending: false }),
    ]);
    setParceiros(p ?? []);
    const counts: Record<string, number> = {};
    (c ?? []).forEach((r: { id: string; parceiro_id: string }) => {
      counts[r.parceiro_id] = (counts[r.parceiro_id] ?? 0) + 1;
    });
    setCuponsCounts(counts);
    setTransacoes(t ?? []);
    setLoading(false);
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `logo-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('marketplace-logos')
      .upload(path, file, { upsert: true });
    if (error) {
      setStatus('Erro no upload: ' + error.message);
      setLogoUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('marketplace-logos')
      .getPublicUrl((data as { path: string }).path);
    setParceiroForm((f) => ({ ...f, logo_url: publicUrl }));
    setLogoUploading(false);
  }

  // ── Auto-fill transação ao selecionar parceiro ─────────────────────────────
  function handleParceiroSelect(parceiroId: string) {
    const p = parceiros.find((x) => x.id === parceiroId);
    if (!p) return;
    const precoFinal = (() => {
      if (!p.valor_original || !p.desconto_tipo || !p.desconto_valor) return p.valor_original;
      if (p.desconto_tipo === 'percent') return p.valor_original * (1 - p.desconto_valor / 100);
      return p.valor_original - p.desconto_valor;
    })();
    setTransForm((f) => ({
      ...f,
      parceiro_id: parceiroId,
      valor_unitario: precoFinal != null ? String(precoFinal) : f.valor_unitario,
      comissao_percent: p.comissao_percent != null ? String(p.comissao_percent) : f.comissao_percent,
    }));
  }

  // ── Email autocomplete ──────────────────────────────────────────────────────
  function handleEmailInput(value: string) {
    setTransForm((f) => ({ ...f, atleta_email: value }));
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setEmailSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('email, full_name')
        .or(`email.ilike.%${value}%,full_name.ilike.%${value}%`)
        .limit(8);
      setEmailSuggestions(data ?? []);
    }, 300);
  }

  function selectSuggestion(suggestion: UserSuggestion) {
    setTransForm((f) => ({ ...f, atleta_email: suggestion.email }));
    setEmailSuggestions([]);
    setShowSuggestions(false);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  async function toggleAtivo(p: Parceiro) {
    const { error } = await supabase.from('marketplace_parceiros').update({ ativo: !p.ativo }).eq('id', p.id);
    if (!error) setParceiros((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !p.ativo } : x)));
  }

  async function saveParceiro() {
    if (!parceiroForm.nome.trim()) { setStatus('Nome obrigatório'); return; }
    const payload = {
      nome: parceiroForm.nome.trim(),
      categoria: parceiroForm.categoria,
      descricao: parceiroForm.descricao || null,
      beneficio: parceiroForm.beneficio || null,
      contato: parceiroForm.contato || null,
      logo_url: parceiroForm.logo_url || null,
      registro_profissional: parceiroForm.registro_profissional || null,
      valor_original: parceiroForm.valor_original ? parseFloat(parceiroForm.valor_original) : null,
      valor_unidade: parceiroForm.valor_unidade || null,
      desconto_tipo: parceiroForm.desconto_valor ? parceiroForm.desconto_tipo : null,
      desconto_valor: parceiroForm.desconto_valor ? parseFloat(parceiroForm.desconto_valor) : null,
      modalidade: parceiroForm.modalidade,
      cidade_estado: parceiroForm.cidade_estado || null,
      comissao_percent: parseFloat(parceiroForm.comissao_percent) || 0,
      mensalidade_valor: parceiroForm.mensalidade_valor ? parseFloat(parceiroForm.mensalidade_valor) : null,
      mensalidade_status: parceiroForm.mensalidade_status,
      link_agendamento: parceiroForm.link_agendamento || null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('marketplace_parceiros').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('marketplace_parceiros').insert({ ...payload, ativo: true }));
    }
    if (error) { setStatus('Erro: ' + error.message); return; }
    setStatus(editingId ? '✓ Atualizado' : '✓ Cadastrado');
    setShowParceiroForm(false);
    setEditingId(null);
    setParceiroForm(emptyParceiroForm());
    fetchAll();
  }

  async function saveTransacao() {
    if (!transForm.parceiro_id || !transForm.valor_unitario) {
      setStatus('Fornecedor e valor unitário são obrigatórios');
      return;
    }
    const valorUnitario = parseFloat(transForm.valor_unitario);
    const quantidade = parseInt(transForm.quantidade) || 1;
    const valorBruto = parseFloat((valorUnitario * quantidade).toFixed(2));
    const { error } = await supabase.from('marketplace_transacoes').insert({
      parceiro_id: transForm.parceiro_id,
      atleta_email: transForm.atleta_email || null,
      valor_unitario: valorUnitario,
      quantidade,
      valor_bruto: valorBruto,
      comissao_percent: parseFloat(transForm.comissao_percent) || 0,
      status_repasse: 'pendente',
      status_repasse_parceiro: 'pendente',
    });
    if (error) { setStatus('Erro: ' + error.message); return; }
    setStatus('✓ Transação registrada');
    setShowTransForm(false);
    setTransForm(emptyTransForm());
    fetchAll();
  }

  async function toggleRepasse(t: Transacao) {
    const next = t.status_repasse === 'pendente' ? 'pago' : 'pendente';
    await supabase.from('marketplace_transacoes').update({ status_repasse: next }).eq('id', t.id);
    setTransacoes((prev) => prev.map((x) => (x.id === t.id ? { ...x, status_repasse: next } : x)));
  }

  async function toggleRepaseParceiro(t: Transacao) {
    const next = t.status_repasse_parceiro === 'pendente' ? 'pago' : 'pendente';
    await supabase.from('marketplace_transacoes').update({ status_repasse_parceiro: next }).eq('id', t.id);
    setTransacoes((prev) => prev.map((x) => (x.id === t.id ? { ...x, status_repasse_parceiro: next } : x)));
  }

  async function deleteTransacao(id: string) {
    if (!confirm('Excluir esta transação?')) return;
    const { error } = await supabase.from('marketplace_transacoes').delete().eq('id', id);
    if (error) { setStatus('Erro ao excluir: ' + error.message); return; }
    setTransacoes((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  async function exportCupons() {
    const { data } = await supabase
      .from('marketplace_cupons')
      .select('codigo, atleta_email, atleta_cpf, criado_em, marketplace_parceiros(nome)');
    if (!data) return;
    downloadCSV('cupons.csv',
      ['Fornecedor', 'Email', 'CPF', 'Código', 'Data'],
      data.map((r: any) => [
        r.marketplace_parceiros?.nome ?? '',
        r.atleta_email ?? '',
        r.atleta_cpf ?? '',
        r.codigo,
        new Date(r.criado_em).toLocaleDateString('pt-BR'),
      ]),
    );
  }

  function exportTransacoes() {
    const pNome: Record<string, string> = {};
    parceiros.forEach((p) => (pNome[p.id] = p.nome));
    downloadCSV('transacoes.csv',
      ['Fornecedor', 'Atleta Email', 'Qtd', 'Valor Unitário', 'Valor Bruto', 'Comissão %', 'Valor Líquido', 'Repasse Atleta', 'Repasse Fornecedor', 'Data'],
      transacoes.map((t) => [
        pNome[t.parceiro_id] ?? t.parceiro_id,
        t.atleta_email ?? '',
        String(t.quantidade ?? 1),
        t.valor_unitario != null ? Number(t.valor_unitario).toFixed(2) : '',
        Number(t.valor_bruto).toFixed(2),
        String(t.comissao_percent),
        Number(t.valor_liquido).toFixed(2),
        t.status_repasse,
        t.status_repasse_parceiro ?? 'pendente',
        new Date(t.criado_em).toLocaleDateString('pt-BR'),
      ]),
    );
  }

  // ── Start edit ──────────────────────────────────────────────────────────────
  function startEdit(p: Parceiro) {
    setEditingId(p.id);
    setParceiroForm({
      nome: p.nome,
      categoria: p.categoria,
      descricao: p.descricao ?? '',
      beneficio: p.beneficio ?? '',
      contato: p.contato ?? '',
      logo_url: p.logo_url ?? '',
      registro_profissional: p.registro_profissional ?? '',
      valor_original: p.valor_original != null ? String(p.valor_original) : '',
      valor_unidade: p.valor_unidade ?? '',
      desconto_tipo: p.desconto_tipo ?? 'percent',
      desconto_valor: p.desconto_valor != null ? String(p.desconto_valor) : '',
      modalidade: p.modalidade ?? 'online',
      cidade_estado: p.cidade_estado ?? '',
      comissao_percent: p.comissao_percent != null ? String(p.comissao_percent) : '',
      mensalidade_valor: p.mensalidade_valor != null ? String(p.mensalidade_valor) : '',
      mensalidade_status: p.mensalidade_status ?? 'ativo',
      link_agendamento: p.link_agendamento ?? '',
    });
    setShowParceiroForm(true);
  }

  // ── Pricing preview ─────────────────────────────────────────────────────────
  const precoComDesconto = calcPrecoComDesconto(parceiroForm);

  if (loading) return <div className="text-center py-8 text-gray-500">Carregando marketplace...</div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Marketplace Soul Benefícios</h2>
          <p className="text-sm text-gray-500 mt-1">Gestão de fornecedores, cupons e transações</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {status && (
            <span className={`text-sm px-3 py-1 rounded-md ${status.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {status}
            </span>
          )}
          <button onClick={exportCupons}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition">
            <Download size={16} /> Cupons CSV
          </button>
          <button onClick={exportTransacoes}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition">
            <Download size={16} /> Transações CSV
          </button>
        </div>
      </div>

      {/* ── Parceiros ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Fornecedores ({parceiros.length})</h3>
          <button
            onClick={() => {
              if (showParceiroForm && !editingId) {
                setShowParceiroForm(false);
              } else {
                setEditingId(null);
                setParceiroForm(emptyParceiroForm());
                setShowParceiroForm(true);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition">
            {showParceiroForm && !editingId ? '✕ Cancelar' : '+ Novo fornecedor'}
          </button>
        </div>

        {/* Parceiro form */}
        {showParceiroForm && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Nome *" value={parceiroForm.nome}
                onChange={(e) => setParceiroForm((f) => ({ ...f, nome: e.target.value }))} />
              <select className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={parceiroForm.categoria}
                onChange={(e) => setParceiroForm((f) => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <textarea className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2} placeholder="Descrição do fornecedor" value={parceiroForm.descricao}
                onChange={(e) => setParceiroForm((f) => ({ ...f, descricao: e.target.value }))} />
              <textarea className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2} placeholder="Benefício oferecido (texto visível para o atleta)" value={parceiroForm.beneficio}
                onChange={(e) => setParceiroForm((f) => ({ ...f, beneficio: e.target.value }))} />
            </div>

            {/* Pricing */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Precificação</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Valor original (R$)" type="number" min="0" step="0.01"
                  value={parceiroForm.valor_original}
                  onChange={(e) => setParceiroForm((f) => ({ ...f, valor_original: e.target.value }))} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">O que está incluído no preço</label>
                  <input className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Ex: 4 sessões, mensal, 1 consulta"
                    value={parceiroForm.valor_unidade}
                    onChange={(e) => setParceiroForm((f) => ({ ...f, valor_unidade: e.target.value }))} />
                </div>
                <select className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={parceiroForm.desconto_tipo}
                  onChange={(e) => setParceiroForm((f) => ({ ...f, desconto_tipo: e.target.value as 'percent' | 'valor' }))}>
                  <option value="percent">% de desconto</option>
                  <option value="valor">R$ de desconto</option>
                </select>
                <input className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={parceiroForm.desconto_tipo === 'percent' ? 'Ex: 20 (= 20% OFF)' : 'Ex: 40 (= R$40 OFF)'}
                  type="number" min="0" step="0.01"
                  value={parceiroForm.desconto_valor}
                  onChange={(e) => setParceiroForm((f) => ({ ...f, desconto_valor: e.target.value }))} />
              </div>
              {precoComDesconto != null && parceiroForm.valor_original && (
                <div className="mt-2 text-sm text-gray-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  Exibição pública: <span className="line-through text-gray-400">
                    R$ {parseFloat(parceiroForm.valor_original).toFixed(2)}
                  </span>
                  {' '}→ <strong className="text-green-700">
                    R$ {precoComDesconto.toFixed(2)}
                  </strong>
                  {parceiroForm.valor_unidade && (
                    <span className="ml-1 text-gray-500">por {parceiroForm.valor_unidade}</span>
                  )}
                  {parceiroForm.desconto_tipo === 'percent' && (
                    <span className="ml-2 text-green-600 font-semibold">{parceiroForm.desconto_valor}% OFF</span>
                  )}
                </div>
              )}
            </div>

            {/* Delivery */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Modalidade</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={parceiroForm.modalidade}
                  onChange={(e) => setParceiroForm((f) => ({ ...f, modalidade: e.target.value as 'presencial' | 'online' | 'híbrido' }))}>
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                  <option value="híbrido">Híbrido</option>
                </select>
                {parceiroForm.modalidade !== 'online' && (
                  <input className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Cidade / Estado (ex: São Paulo, SP)"
                    value={parceiroForm.cidade_estado}
                    onChange={(e) => setParceiroForm((f) => ({ ...f, cidade_estado: e.target.value }))} />
                )}
              </div>
            </div>

            {/* Logo upload */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Logomarca</div>
              <div className="flex items-center gap-3">
                {parceiroForm.logo_url && (
                  <img src={parceiroForm.logo_url} alt="logo preview"
                    className="h-12 w-auto object-contain rounded border border-gray-200 bg-gray-50 p-1" />
                )}
                <label className={`flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50 transition ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={15} className="text-gray-400" />
                  <span className="text-gray-600">{logoUploading ? 'Enviando...' : 'Enviar imagem'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <span className="text-gray-400 text-xs">ou</span>
                <input className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="URL da logo" value={parceiroForm.logo_url}
                  onChange={(e) => setParceiroForm((f) => ({ ...f, logo_url: e.target.value }))} />
              </div>
            </div>

            {/* Contact & registration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Contato público (email ou WhatsApp)" value={parceiroForm.contato}
                onChange={(e) => setParceiroForm((f) => ({ ...f, contato: e.target.value }))} />
              <input className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Registro profissional (CRM, CREF...)" value={parceiroForm.registro_profissional}
                onChange={(e) => setParceiroForm((f) => ({ ...f, registro_profissional: e.target.value }))} />
            </div>

            {/* Admin-only fields */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Admin / Interno</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Link de agendamento (Calendly, site, WA)</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="https://..." value={parceiroForm.link_agendamento}
                    onChange={(e) => setParceiroForm((f) => ({ ...f, link_agendamento: e.target.value }))} />
                </div>
                <div className="relative">
                  <label className="block text-xs text-gray-500 mb-1">Comissão Soul (% retida pela Soul em cada transação)</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm pr-12"
                    placeholder="Ex: 20" type="number" min="0" max="100" step="0.1"
                    value={parceiroForm.comissao_percent}
                    onChange={(e) => setParceiroForm((f) => ({ ...f, comissao_percent: e.target.value }))} />
                  <span className="absolute right-3 bottom-2.5 text-gray-400 text-sm">%</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={saveParceiro}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition">
                Salvar
              </button>
              <button onClick={() => { setShowParceiroForm(false); setEditingId(null); }}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Parceiros table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['Nome', 'Categoria', 'Modalidade', 'Desconto', 'Cupons', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parceiros.map((p) => {
                const descPreview = (() => {
                  if (!p.valor_original || !p.desconto_valor || !p.desconto_tipo) return null;
                  const preco = p.desconto_tipo === 'percent'
                    ? p.valor_original * (1 - p.desconto_valor / 100)
                    : p.valor_original - p.desconto_valor;
                  return `R$${p.valor_original.toFixed(0)} → R$${preco.toFixed(0)}${p.valor_unidade ? `/${p.valor_unidade}` : ''}`;
                })();
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {p.logo_url && <img src={p.logo_url} alt="" className="h-6 w-auto object-contain rounded" />}
                        <span className="font-medium text-gray-800">{p.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{p.categoria}</td>
                    <td className="px-3 py-3">
                      {p.modalidade && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {p.modalidade}
                        </span>
                      )}
                      {p.cidade_estado && <div className="text-xs text-gray-400 mt-0.5">{p.cidade_estado}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{descPreview ?? '—'}</td>
                    <td className="px-3 py-3 font-semibold text-blue-600">{cuponsCounts[p.id] ?? 0}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => startEdit(p)}
                          className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 transition">
                          Editar
                        </button>
                        <button onClick={() => toggleAtivo(p)}
                          className={`px-3 py-1 text-xs rounded-md transition ${p.ativo ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'}`}>
                          {p.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {parceiros.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Nenhum fornecedor cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Transações ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Transações ({transacoes.length})</h3>
          <button onClick={() => { setTransForm(emptyTransForm()); setEmailSuggestions([]); setShowTransForm((v) => !v); }}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition">
            {showTransForm ? '✕ Cancelar' : '+ Nova transação'}
          </button>
        </div>

        {/* Transaction form */}
        {showTransForm && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Registrar Transação Manual
            </div>

            {/* Row 1: Parceiro + Atleta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={transForm.parceiro_id}
                onChange={(e) => handleParceiroSelect(e.target.value)}>
                <option value="">Fornecedor *</option>
                {parceiros.filter((p) => p.ativo).map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>

              {/* Email autocomplete */}
              <div ref={autocompleteRef} className="relative">
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Email do atleta"
                  type="text"
                  value={transForm.atleta_email}
                  onChange={(e) => handleEmailInput(e.target.value)}
                  onFocus={() => transForm.atleta_email.length >= 2 && setShowSuggestions(true)}
                  autoComplete="off"
                />
                {showSuggestions && emailSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {emailSuggestions.map((s) => (
                      <li key={s.email}
                        onMouseDown={() => selectSuggestion(s)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                        <span className="font-medium text-gray-800">{s.email}</span>
                        {s.full_name && <span className="text-gray-500 ml-2 text-xs">{s.full_name}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Row 2: Valor unitário + Quantidade + Comissão */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valor unitário (R$) *</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={parceiros.find(p => p.id === transForm.parceiro_id)?.valor_unidade
                    ? `R$ por ${parceiros.find(p => p.id === transForm.parceiro_id)?.valor_unidade}`
                    : 'Ex: 200,00'}
                  type="number" min="0" step="0.01"
                  value={transForm.valor_unitario}
                  onChange={(e) => setTransForm((f) => ({ ...f, valor_unitario: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Quantidade{parceiros.find(p => p.id === transForm.parceiro_id)?.valor_unidade
                    ? ` (${parceiros.find(p => p.id === transForm.parceiro_id)?.valor_unidade}s)`
                    : ''}
                </label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  type="number" min="1" step="1"
                  value={transForm.quantidade}
                  onChange={(e) => setTransForm((f) => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comissão Soul (%)</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  type="number" min="0" max="100" step="0.1"
                  value={transForm.comissao_percent}
                  onChange={(e) => setTransForm((f) => ({ ...f, comissao_percent: e.target.value }))} />
              </div>
            </div>

            {/* Computed preview */}
            {transForm.valor_unitario && transForm.quantidade && (
              <div className="bg-white border border-gray-200 rounded-md px-4 py-3 flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Valor bruto</span>
                  <div className="font-semibold text-gray-800">
                    R$ {(parseFloat(transForm.valor_unitario) * (parseInt(transForm.quantidade) || 1)).toFixed(2)}
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      ({transForm.quantidade} × R$ {parseFloat(transForm.valor_unitario).toFixed(2)})
                    </span>
                  </div>
                </div>
                {transForm.comissao_percent && (
                  <div>
                    <span className="text-gray-500 text-xs">Valor líquido (após comissão)</span>
                    <div className="font-semibold text-green-700">
                      R$ {(
                        parseFloat(transForm.valor_unitario) *
                        (parseInt(transForm.quantidade) || 1) *
                        (1 - parseFloat(transForm.comissao_percent) / 100)
                      ).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={saveTransacao}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition">
                Salvar
              </button>
              <button onClick={() => setShowTransForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Transactions table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['Fornecedor', 'Atleta', 'Bruto', 'Comissão', 'Líquido', 'Repasse atleta', 'Repasse fornecedor', 'Data', ''].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transacoes.map((t) => {
                const nome = parceiros.find((p) => p.id === t.parceiro_id)?.nome ?? '—';
                const repaseParceiro = t.status_repasse_parceiro ?? 'pendente';
                return (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-800">{nome}</td>
                    <td className="px-3 py-3 text-gray-600">{t.atleta_email ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-700">
                      R$ {Number(t.valor_bruto).toFixed(2)}
                      {t.quantidade > 1 && (
                        <div className="text-xs text-gray-400">{t.quantidade}× R$ {Number(t.valor_unitario).toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{t.comissao_percent}%</td>
                    <td className="px-3 py-3 font-semibold text-gray-800">R$ {Number(t.valor_liquido).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleRepasse(t)}
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer border ${t.status_repasse === 'pago' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'}`}>
                        {t.status_repasse === 'pago' ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleRepaseParceiro(t)}
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer border ${repaseParceiro === 'pago' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'}`}>
                        {repaseParceiro === 'pago' ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{new Date(t.criado_em).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => toggleRepasse(t)}
                          className="px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 transition whitespace-nowrap">
                          {t.status_repasse === 'pendente' ? '✓ Atleta pago' : 'Reabrir atleta'}
                        </button>
                        <button onClick={() => toggleRepaseParceiro(t)}
                          className="px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 transition whitespace-nowrap">
                          {repaseParceiro === 'pendente' ? '✓ Fornecedor pago' : 'Reabrir fornecedor'}
                        </button>
                        <button onClick={() => deleteTransacao(t.id)}
                          className="px-2 py-1 border border-red-200 text-red-500 text-xs rounded-md hover:bg-red-50 transition">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {transacoes.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Nenhuma transação registrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
