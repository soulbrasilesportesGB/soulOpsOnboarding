// src/components/CSVImport.tsx
import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';

interface CSVImportProps {
  onImportComplete: () => void;
}

type StatusType = 'success' | 'error' | null;

type CompletionStatus = 'stalled' | 'incomplete' | 'almost' | 'acceptable' | 'complete';

// Opção A: IDs fixos (sem subir activation_types_rows)
// "Palestras e Mentorias" (mesmo id serve pra palestra/mentoria na v1)
const ACTIVATION_TALK_MENTOR_ID = 'ed814423-9e20-4184-880c-f45be1383c40';

// “presença/eventos/ações de marca” (usando seus IDs)
const ACTIVATION_BRAND_EVENT_IDS = new Set<string>([
  'ef3f5b58-56a3-40bf-bd8c-e828d5507551', // Eventos Presenciais
  '17d496f1-c463-4521-af3b-9cec0b4376cf', // Sessões de Fotos
  '32cf2527-2e88-4178-a22e-a148c685a9d9', // Ações Sociais
  '5d464c2d-224a-43e1-9e06-9d9520addf6a', // Criação de Conteúdo
  '75231237-6474-4386-8756-9f6184865dfb', // Campanhas Digitais
  'a3ae4e4b-1b6a-4b1e-bd4b-b3bb70e03eba', // Workshops e Clínicas Esportivas
  'fe313495-64b6-405a-a070-f8050f292c62', // Campanhas Publicitárias
]);

export function CSVImport({ onImportComplete }: CSVImportProps) {
  const [profilesFile, setProfilesFile] = useState<File | null>(null);
  const [userRolesFile, setUserRolesFile] = useState<File | null>(null);
  const [athletesFile, setAthletesFile] = useState<File | null>(null);
  const [companiesFile, setCompaniesFile] = useState<File | null>(null);

  const [achievementsFile, setAchievementsFile] = useState<File | null>(null);
  const [activationsFile, setActivationsFile] = useState<File | null>(null);
  const [causesFile, setCausesFile] = useState<File | null>(null);
  const [educationFile, setEducationFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [partnersFile, setPartnersFile] = useState<File | null>(null);
  const [rankingFile, setRankingFile] = useState<File | null>(null);
  const [resultsFile, setResultsFile] = useState<File | null>(null);
  const [socialActionsFile, setSocialActionsFile] = useState<File | null>(null);

  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({
    type: null,
    message: '',
  });

  // ---------- CSV parsing (PapaParse: handles newlines inside quotes) ----------
  const parseCSV = (text: string): Record<string, string>[] => {
    const res = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => (h || '').replace(/^\uFEFF/, '').trim(),
    });

    if (res.errors?.length) {
      console.warn('CSV parse errors:', res.errors.slice(0, 5));
    }

    return (res.data || []).map((row) => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(row || {})) {
        clean[k] = v === null || v === undefined ? '' : String(v).trim();
      }
      return clean;
    });
  };

  // ---------- helpers ----------
  const isFilled = (v: any) =>
    v !== null &&
    v !== undefined &&
    String(v).trim() !== '' &&
    String(v).trim().toLowerCase() !== 'null';

  const isEmptyArrayLike = (v: any) => {
    if (v == null) return true;
    const s = String(v).trim();
    return s === '' || s === '[]' || s === '{}' || s === 'null';
  };

  const norm = (v: any) => {
    if (v === null || v === undefined) return '';
    return String(v).replace(/^\uFEFF/, '').trim().replace(/^"|"$/g, '');
  };

  const pick = (obj: any, keys: string[]) => {
    for (const k of keys) {
      const val = norm(obj?.[k]);
      if (val && val.toLowerCase() !== 'null') return val;
    }
    return '';
  };

  const hasValue = (obj: any, keys: string[]) => pick(obj, keys) !== '';

  const countByAthleteId = (rows: any[]) => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const id = (r.athlete_id || '').toString().trim();
      if (!id) continue;
      map[id] = (map[id] || 0) + 1;
    }
    return map;
  };

  // Opção A: cria mapa athlete_id -> Set<activation_type_id>
  const buildActivationTypeSetByAthleteId = (rows: any[]) => {
    const map: Record<string, Set<string>> = {};
    for (const r of rows) {
      const athleteId = String(r.athlete_id || '').trim();
      if (!athleteId) continue;

      const typeId = String(
        r.activation_type_id || r.type_id || r.ativacao_id || r.activation_id || ''
      ).trim();
      if (!typeId) continue;

      if (!map[athleteId]) map[athleteId] = new Set<string>();
      map[athleteId].add(typeId);
    }
    return map;
  };

  // ---------- scoring (Onboarding - Athlete must/nice) ----------
  const calcAthleteMustBase = (a: any) => {
    const missing: string[] = [];

    const checks: Array<[boolean, string]> = [
      [hasValue(a, ['foto_url', 'foto', 'photo_url', 'avatar_url']), 'must:foto'],
      [hasValue(a, ['bio', 'biografia', 'about']), 'must:bio'],
      [!isEmptyArrayLike(pick(a, ['modalidade', 'modalities', 'sports'])), 'must:modalidade'],
      [hasValue(a, ['nivel', 'level']), 'must:nivel'],
      [hasValue(a, ['state_id', 'estado', 'uf', 'state']), 'must:estado'],
      [hasValue(a, ['city_id', 'cidade', 'city']), 'must:cidade'],
      [hasValue(a, ['telefone', 'phone', 'celular', 'whatsapp']), 'must:telefone'],
      [hasValue(a, ['instagram', 'insta', 'instagram_url']), 'must:instagram'],
    ];

    let points = 0;
    for (const [ok, label] of checks) {
      if (ok) points++;
      else missing.push(label);
    }

    return { points, total: checks.length, missing };
  };

  const calcAthleteMustCards = (athleteId: string | null, counts: any) => {
    const missing: string[] = [];

    const checks: Array<[boolean, string]> = [
      [!!athleteId && (counts.achievements?.[athleteId] ?? 0) > 0, 'must:achievements'],
      [!!athleteId && (counts.activations?.[athleteId] ?? 0) > 0, 'must:activations'],
      [!!athleteId && (counts.causes?.[athleteId] ?? 0) > 0, 'must:causes'],
      [!!athleteId && (counts.education?.[athleteId] ?? 0) > 0, 'must:education'],
      [!!athleteId && (counts.media?.[athleteId] ?? 0) > 0, 'must:media'],
      [!!athleteId && (counts.results?.[athleteId] ?? 0) > 0, 'must:results'],
    ];

    let points = 0;
    for (const [ok, label] of checks) {
      if (ok) points++;
      else missing.push(label);
    }

    return { points, total: checks.length, missing };
  };

  const calcAthleteNice = (
    a: any,
    athleteId: string | null,
    niceCounts: any,
    activationTypesByAthleteId: Record<string, Set<string>>
  ) => {
    const missing: string[] = [];

    const types = athleteId ? activationTypesByAthleteId[athleteId] : undefined;
    const hasTalkMentor = !!athleteId && !!types?.has(ACTIVATION_TALK_MENTOR_ID);

    const checks: Array<[boolean, string]> = [
      [!!athleteId && (niceCounts.ranking?.[athleteId] ?? 0) > 0, 'nice:ranking'],
      [!!athleteId && (niceCounts.partners?.[athleteId] ?? 0) > 0, 'nice:partners'],
      [!!athleteId && (niceCounts.social_actions?.[athleteId] ?? 0) > 0, 'nice:social_actions'],
      [hasTalkMentor, 'nice:talks_mentorship'],
      [hasValue(a, ['youtube', 'youtube_url', 'youtube_link', 'youtubeChannel']), 'nice:youtube'],
      [hasValue(a, ['tiktok', 'tiktok_url', 'tiktok_link']), 'nice:tiktok'],
      [hasValue(a, ['linkedin', 'linkedin_url', 'linkedin_link']), 'nice:linkedin'],
    ];

    let points = 0;
    for (const [ok, label] of checks) {
      if (ok) points++;
      else missing.push(label);
    }

    return { points, total: checks.length, missing };
  };

  const calcAthleteOverall = (
    a: any,
    athleteId: string | null,
    mustCounts: any,
    niceCounts: any,
    activationTypesByAthleteId: Record<string, Set<string>>
  ) => {
    const mustBase = calcAthleteMustBase(a);
    const mustCards = calcAthleteMustCards(athleteId, mustCounts);
    const nice = calcAthleteNice(a, athleteId, niceCounts, activationTypesByAthleteId);

    const mustPoints = mustBase.points + mustCards.points;
    const mustTotal = mustBase.total + mustCards.total;

    const nicePoints = nice.points;
    const niceTotal = nice.total;

    const fullPoints = mustPoints + nicePoints;
    const fullTotal = mustTotal + niceTotal;

    const mustRatio = mustTotal === 0 ? 0 : mustPoints / mustTotal;

    let completion_status: CompletionStatus;

    if (mustPoints === mustTotal && nicePoints === niceTotal) {
      completion_status = 'complete';
    } else if (mustPoints === mustTotal) {
      completion_status = 'acceptable';
    } else if (mustRatio >= 0.8) {
      completion_status = 'almost';
    } else {
      completion_status = 'incomplete';
    }

    const score = fullTotal === 0 ? 0 : Math.round((fullPoints / fullTotal) * 100);

    return {
      score,
      completion_status,
      missing: [...mustBase.missing, ...mustCards.missing, ...nice.missing],
    };
  };

  // ---------- scoring (Company/Partner) ----------
  const calcCompanyCompletion = (c: any) => {
    const missing: string[] = [];
    let points = 0;

    const hasLinks = isFilled(c?.website) || isFilled(c?.linkedin) || isFilled(c?.instagram);
    const hasContact = !isEmptyArrayLike(c?.contact);
    const tipo = (c?.tipo_entidade || '').toString().trim();

    const identityOk =
      (tipo === 'pj' && (isFilled(c?.cnpj) || isFilled(c?.razao_social))) ||
      (tipo === 'pf' && isFilled(c?.cpf));

    const checks: Array<[boolean, string]> = [
      [isFilled(c?.logo_url), 'must:logo'],
      [isFilled(c?.descricao), 'must:descricao'],
      [isFilled(c?.cidade), 'must:cidade'],
      [isFilled(c?.estado), 'must:estado'],
      [hasContact, 'must:contato'],
      [hasLinks, 'must:links'],
      [isFilled(c?.nome_fantasia), 'must:nome_fantasia'],
      [isFilled(c?.username), 'must:username'],
      [identityOk, 'must:identidade'],
      [isFilled(tipo), 'must:tipo_entidade'],
    ];

    for (const [ok, label] of checks) {
      if (ok) points += 1;
      else missing.push(label);
    }

    const total = checks.length;
    const score = Math.round((points / total) * 100);

    const completion_status: CompletionStatus =
      score === 100 ? 'complete' : score >= 80 ? 'almost' : 'incomplete';

    return { score, completion_status, missing };
  };

  // ---------- SCORE SOUL (v1) ----------
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const tierFromTotal = (total: number) => {
    if (total >= 90) return 'Atleta Âncora';
    if (total >= 75) return 'Atleta Comercial Forte';
    if (total >= 60) return 'Atleta Comercial Potencial';
    return 'Ainda não comercializável';
  };

  // P1 (0–25): ranking/results/achievements presence
  const calcP1Performance = (
    athleteId: string | null,
    perfCounts: { ranking: any; results: any; achievements: any }
  ) => {
    if (!athleteId) return 0;
    const hasRanking = (perfCounts.ranking?.[athleteId] ?? 0) > 0;
    const hasResults = (perfCounts.results?.[athleteId] ?? 0) > 0;
    const hasAchievements = (perfCounts.achievements?.[athleteId] ?? 0) > 0;

    const present = [hasRanking, hasResults, hasAchievements].filter(Boolean).length;
    if (present === 0) return 0;
    if (present === 1) return 10;
    if (present === 2) return 18;
    return 25;
  };

  // P2 (0–20): causes count + valores_descricao length >= 80
  const calcP2Narrative = (
    athlete: any,
    athleteId: string | null,
    causeCountByAthleteId: Record<string, number>
  ) => {
    if (!athleteId) return 0;
    const rawCount = causeCountByAthleteId?.[athleteId] ?? 0;
    const count = clamp(rawCount, 0, 10);

    if (count === 0) return 0;

    let base = 0;
    if (count <= 2) base = 8;
    else if (count <= 5) base = 12;
    else base = 15;

    const desc = pick(athlete, ['valores_descricao']);
    const hasDescBonus = !!desc && desc.length >= 80;

    return clamp(base + (hasDescBonus ? 5 : 0), 0, 20);
  };

  // P3 (0–20): must-have 100% (acceptable OR complete) => 10, +education +partners
  const calcP3Maturity = (
    onboardingStatus: CompletionStatus | null,
    athleteId: string | null,
    maturityCounts: { education: any; partners: any }
  ) => {
    if (!athleteId) return 0;

    const must100 = onboardingStatus === 'acceptable' || onboardingStatus === 'complete';
    if (!must100) return 0;

    let p = 10;
    if ((maturityCounts.education?.[athleteId] ?? 0) > 0) p += 5;
    if ((maturityCounts.partners?.[athleteId] ?? 0) > 0) p += 5;

    return clamp(p, 0, 20);
  };

  // P4 (0–20): manual(0) + bonus automático cap 8
  const calcP4Activation = (
    athleteId: string | null,
    activationTypesByAthleteId: Record<string, Set<string>>
  ) => {
    const manual = 0;
    if (!athleteId) return 0;

    const types = activationTypesByAthleteId[athleteId];
    if (!types) return manual;

    let bonus = 0;

    // palestra/mentoria => +5
    if (types.has(ACTIVATION_TALK_MENTOR_ID)) bonus += 5;

    // presença/eventos/ações de marca => +2 (se tiver qualquer um)
    let hasBrand = false;
    for (const id of ACTIVATION_BRAND_EVENT_IDS) {
      if (types.has(id)) {
        hasBrand = true;
        break;
      }
    }
    if (hasBrand) bonus += 2;

    bonus = clamp(bonus, 0, 8);

    return clamp(manual + bonus, 0, 20);
  };

  // P5 (0–15): auto-base cidade+estado => +3, manual(0)
  const calcP5Fit = (athlete: any) => {
    const manual = 0;

    const hasCity = hasValue(athlete, ['city_id', 'cidade', 'city']);
    const hasState = hasValue(athlete, ['state_id', 'estado', 'uf', 'state']);

    const autoBase = hasCity && hasState ? 3 : 0;

    return clamp(manual + autoBase, 0, 15);
  };

  // ---------- import ----------
  const handleImport = async () => {
    if (
      !profilesFile ||
      !userRolesFile ||
      !athletesFile ||
      !companiesFile ||
      !achievementsFile ||
      !activationsFile ||
      !causesFile ||
      !educationFile ||
      !mediaFile ||
      !partnersFile ||
      !rankingFile ||
      !resultsFile ||
      !socialActionsFile
    ) {
      setStatus({ type: 'error', message: 'Selecione todos os CSVs antes de importar.' });
      return;
    }

    setImporting(true);
    setStatus({ type: null, message: '' });

    try {
      const [
        profilesText,
        userRolesText,
        athletesText,
        companiesText,
        achievementsText,
        activationsText,
        causesText,
        educationText,
        mediaText,
        rankingText,
        partnersText,
        resultsText,
        socialActionsText,
      ] = await Promise.all([
        profilesFile.text(),
        userRolesFile.text(),
        athletesFile.text(),
        companiesFile.text(),
        achievementsFile.text(),
        activationsFile.text(),
        causesFile.text(),
        educationFile.text(),
        mediaFile.text(),
        rankingFile.text(),
        partnersFile.text(),
        resultsFile.text(),
        socialActionsFile.text(),
      ]);

      const profiles = parseCSV(profilesText);
      const userRoles = parseCSV(userRolesText);
      const athletes = parseCSV(athletesText);
      const companies = parseCSV(companiesText);

      const achievements = parseCSV(achievementsText);
      const activations = parseCSV(activationsText);
      const causes = parseCSV(causesText);
      const education = parseCSV(educationText);
      const media = parseCSV(mediaText);
      const partners = parseCSV(partnersText);
      const results = parseCSV(resultsText);
      const socialActions = parseCSV(socialActionsText);
      const ranking = parseCSV(rankingText);

      const activationTypesByAthleteId = buildActivationTypeSetByAthleteId(activations);

      // users table (sidecar)
      const usersToUpsert = profiles.map((p) => ({
        user_id: p.id,
        email: p.email,
        full_name: p.full_name || null,
        created_at_portal: p.created_at,
        updated_at_portal: p.updated_at,
      }));

      const { error: usersError } = await (supabase.from('users') as any)
        .upsert(usersToUpsert);
      if (usersError) throw usersError;

      // role by user_id (unique)
      const roleByUserId: Record<string, string> = {};
      for (const r of userRoles) {
        const uid = (r.user_id || '').toString().trim();
        const role = (r.role || '').toString().trim();
        if (uid && role) roleByUserId[uid] = role;
      }

      // athlete mapping: user_id -> athletes.id
      const athleteIdByUserId: Record<string, string> = {};
      const athleteByUserId: Record<string, any> = {};
      for (const a of athletes) {
        const userId = (a.user_id || '').toString().trim();
        const athleteId = (a.id || '').toString().trim();
        if (userId) athleteByUserId[userId] = a;
        if (userId && athleteId) athleteIdByUserId[userId] = athleteId;
      }

      const companyByUserId: Record<string, any> = {};
      for (const c of companies) {
        const userId = (c.user_id || '').toString().trim();
        if (userId) companyByUserId[userId] = c;
      }

      // precompute counts once
      const mustCardCounts = {
        achievements: countByAthleteId(achievements),
        activations: countByAthleteId(activations),
        causes: countByAthleteId(causes),
        education: countByAthleteId(education),
        media: countByAthleteId(media),
        results: countByAthleteId(results),
      };

      const niceCounts = {
        ranking: countByAthleteId(ranking),
        partners: countByAthleteId(partners),
        social_actions: countByAthleteId(socialActions),
      };

      // For Score Soul
      const perfCounts = {
        ranking: niceCounts.ranking,
        results: mustCardCounts.results,
        achievements: mustCardCounts.achievements,
      };

      const maturityCounts = {
        education: mustCardCounts.education,
        partners: niceCounts.partners,
      };

      const causeCountByAthleteId = mustCardCounts.causes;

      // onboarding records
      const onboardingRecords: any[] = [];

      for (const p of profiles) {
        const userId = (p.id || '').toString().trim();
        if (!userId) continue;

        const role = roleByUserId[userId] || 'account';
        if (role === 'admin') continue;

        const hasAthleteRow = !!athleteByUserId[userId];
        const hasCompanyRow = !!companyByUserId[userId];

        if (!hasAthleteRow && !hasCompanyRow) {
          onboardingRecords.push({
            user_id: userId,
            profile_kind: 'account',
            entity_type: null,
            completion_status: 'stalled',
            completion_score: 0,
            missing_fields: [],
          });
          continue;
        }

        if (role === 'athlete') {
          if (!hasAthleteRow) {
            onboardingRecords.push({
              user_id: userId,
              profile_kind: 'athlete',
              entity_type: null,
              completion_status: 'stalled',
              completion_score: 0,
              missing_fields: [],
            });
          } else {
            const athlete = athleteByUserId[userId];
            const athleteId = athleteIdByUserId[userId] || null;

            const { score, completion_status, missing } = calcAthleteOverall(
              athlete,
              athleteId,
              mustCardCounts,
              niceCounts,
              activationTypesByAthleteId
            );

            onboardingRecords.push({
              user_id: userId,
              profile_kind: 'athlete',
              entity_type: null,
              completion_status,
              completion_score: score,
              missing_fields: missing,
            });
          }
        }

        if (role === 'company') {
          if (!hasCompanyRow) {
            onboardingRecords.push({
              user_id: userId,
              profile_kind: 'partner',
              entity_type: null,
              completion_status: 'stalled',
              completion_score: 0,
              missing_fields: [],
            });
          } else {
            const company = companyByUserId[userId];
            const { score, completion_status, missing } = calcCompanyCompletion(company);

            onboardingRecords.push({
              user_id: userId,
              profile_kind: 'partner',
              entity_type: company?.tipo_entidade || null,
              completion_status,
              completion_score: score,
              missing_fields: missing,
            });
          }
        }
      }

      const { error: onboardingError } = await (supabase
        .from('onboarding') as any)
        .upsert(onboardingRecords, { onConflict: 'user_id,profile_kind' });

      if (onboardingError) throw onboardingError;

      // map onboarding status per athlete user
      const onboardingStatusByUserId: Record<string, CompletionStatus> = {};
      for (const r of onboardingRecords) {
        if (r?.profile_kind === 'athlete' && r?.user_id) {
          onboardingStatusByUserId[String(r.user_id)] = r.completion_status as CompletionStatus;
        }
      }

      // ---------- COMMERCIAL SCORE upsert ----------
      const commercialRows: any[] = [];

      for (const userId of Object.keys(athleteByUserId)) {
        const athlete = athleteByUserId[userId];
        const athleteId = athleteIdByUserId[userId] || null;
        if (!athleteId) continue;

        const onboardingStatus = onboardingStatusByUserId[userId] || null;

        const p1 = calcP1Performance(athleteId, perfCounts);
        const p2 = calcP2Narrative(athlete, athleteId, causeCountByAthleteId);
        const p3 = calcP3Maturity(onboardingStatus, athleteId, maturityCounts);
        const p4 = calcP4Activation(athleteId, activationTypesByAthleteId);
        const p5 = calcP5Fit(athlete);

        const total = clamp(p1 + p2 + p3 + p4 + p5, 0, 100);
        const tier = tierFromTotal(total);

        commercialRows.push({
          athlete_id: athleteId,
          user_id: userId,
          p1_performance: p1,
          p2_narrative: p2,
          p3_maturity: p3,
          p4_activation: p4,
          p5_fit: p5,
          total_score: total,
          tier,
          // manual fields v1 (deixa null)
          notes: null,
          updated_by: null,
        });
      }

      if (commercialRows.length > 0) {
        const { error: commercialError } = await (supabase
          .from('athlete_commercial_scores') as any)
          .upsert(commercialRows, { onConflict: 'athlete_id' });

        if (commercialError) throw commercialError;
      }

      setStatus({
        type: 'success',
        message: `Import OK: ${profiles.length} profiles, ${onboardingRecords.length} onboarding records, ${commercialRows.length} commercial scores.`,
      });

      onImportComplete();
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error?.message || 'Import failed',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Import CSV Files</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">profiles_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setProfilesFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">user_roles_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setUserRolesFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">athletes_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setAthletesFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">companies_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCompaniesFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <hr className="my-2" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">athlete_achievements_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setAchievementsFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">athlete_activations_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setActivationsFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">athlete_causes_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCausesFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">athlete_education_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setEducationFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">athlete_media_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            athlete_ranking_rows (nice-to-have)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setRankingFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            athlete_partners_rows (nice-to-have)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setPartnersFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">athlete_results_rows</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setResultsFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            athlete_social_actions_rows (nice-to-have)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setSocialActionsFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={
            importing ||
            !profilesFile ||
            !userRolesFile ||
            !athletesFile ||
            !companiesFile ||
            !achievementsFile ||
            !activationsFile ||
            !causesFile ||
            !educationFile ||
            !mediaFile ||
            !rankingFile ||
            !partnersFile ||
            !resultsFile ||
            !socialActionsFile
          }
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {importing ? (
            <>Processing...</>
          ) : (
            <>
              <Upload size={20} />
              Import All Files
            </>
          )}
        </button>

        {status.type && (
          <div
            className={`flex items-center gap-2 p-4 rounded-md ${
              status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}