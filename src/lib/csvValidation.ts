import { isFilled, isEmptyArrayLike, pick, hasValue } from '../lib/utils';
import { ACTIVATION_TALK_MENTOR_ID, ACTIVATION_BRAND_EVENT_IDS } from '../constants/activationIds';
import type { CompletionStatus } from '../types/common';

// Athlete Scoring Functions

export const calcAthleteMustBase = (athlete: any) => {
  const missing: string[] = [];

  const checks: Array<[boolean, string]> = [
    [hasValue(athlete, ['foto_url', 'foto', 'photo_url', 'avatar_url']), 'must:foto'],
    [hasValue(athlete, ['bio', 'biografia', 'about']), 'must:bio'],
    [!isEmptyArrayLike(pick(athlete, ['modalidade', 'modalities', 'sports'])), 'must:modalidade'],
    [hasValue(athlete, ['nivel', 'level']), 'must:nivel'],
    [hasValue(athlete, ['state_id', 'estado', 'uf', 'state']), 'must:estado'],
    [hasValue(athlete, ['city_id', 'cidade', 'city']), 'must:cidade'],
    [hasValue(athlete, ['telefone', 'phone', 'celular', 'whatsapp']), 'must:telefone'],
    [hasValue(athlete, ['instagram', 'insta', 'instagram_url']), 'must:instagram'],
  ];

  let points = 0;
  for (const [ok, label] of checks) {
    if (ok) points++;
    else missing.push(label);
  }

  return { points, total: checks.length, missing };
};

export const calcAthleteMustCards = (athleteId: string | null, counts: any) => {
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

export const calcAthleteNice = (
  athlete: any,
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
    [hasValue(athlete, ['youtube', 'youtube_url', 'youtube_link', 'youtubeChannel']), 'nice:youtube'],
    [hasValue(athlete, ['tiktok', 'tiktok_url', 'tiktok_link']), 'nice:tiktok'],
    [hasValue(athlete, ['linkedin', 'linkedin_url', 'linkedin_link']), 'nice:linkedin'],
  ];

  let points = 0;
  for (const [ok, label] of checks) {
    if (ok) points++;
    else missing.push(label);
  }

  return { points, total: checks.length, missing };
};

// Company/Partner Scoring

export const calcCompanyCompletion = (company: any) => {
  const missing: string[] = [];
  let points = 0;

  const hasLinks = isFilled(company?.website) || isFilled(company?.linkedin) || isFilled(company?.instagram);
  const hasContact = !isEmptyArrayLike(company?.contact);
  const tipo = (company?.tipo_entidade || '').toString().trim();

  const identityOk =
    (tipo === 'pj' && (isFilled(company?.cnpj) || isFilled(company?.razao_social))) ||
    (tipo === 'pf' && isFilled(company?.cpf));

  const checks: Array<[boolean, string]> = [
    [isFilled(company?.logo_url), 'must:logo'],
    [isFilled(company?.descricao), 'must:descricao'],
    [isFilled(company?.cidade), 'must:cidade'],
    [isFilled(company?.estado), 'must:estado'],
    [hasContact, 'must:contato'],
    [hasLinks, 'must:links'],
    [isFilled(company?.nome_fantasia), 'must:nome_fantasia'],
    [isFilled(company?.username), 'must:username'],
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

// SOUL Commercial Score (v1) Functions

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const tierFromTotal = (total: number): string => {
  if (total >= 90) return 'Atleta Âncora';
  if (total >= 75) return 'Atleta Comercial Forte';
  if (total >= 60) return 'Atleta Comercial Potencial';
  return 'Ainda não comercializável';
};

export const calcP1Performance = (
  athleteId: string | null,
  perfCounts: { ranking: any; results: any; achievements: any }
): number => {
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

export const calcP2Narrative = (
  athlete: any,
  athleteId: string | null,
  causeCountByAthleteId: Record<string, number>
): number => {
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

export const calcP3Maturity = (
  onboardingStatus: CompletionStatus | null,
  athleteId: string | null,
  maturityCounts: { education: any; partners: any }
): number => {
  if (!athleteId) return 0;

  const must100 = onboardingStatus === 'acceptable' || onboardingStatus === 'complete';
  if (!must100) return 0;

  let p = 10;
  if ((maturityCounts.education?.[athleteId] ?? 0) > 0) p += 5;
  if ((maturityCounts.partners?.[athleteId] ?? 0) > 0) p += 5;

  return clamp(p, 0, 20);
};

export const calcP4Activation = (
  athleteId: string | null,
  activationTypesByAthleteId: Record<string, Set<string>>
): number => {
  const manual = 0;
  if (!athleteId) return 0;

  const types = activationTypesByAthleteId[athleteId];
  if (!types) return manual;

  let bonus = 0;

  // talk/mentoring => +5
  if (types.has(ACTIVATION_TALK_MENTOR_ID)) bonus += 5;

  // presence/events/brand actions => +2 (if any)
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

export const calcP5Fit = (athlete: any): number => {
  const manual = 0;

  const hasCity = hasValue(athlete, ['city_id', 'cidade', 'city']);
  const hasState = hasValue(athlete, ['state_id', 'estado', 'uf', 'state']);

  const autoBase = hasCity && hasState ? 3 : 0;

  return clamp(manual + autoBase, 0, 15);
};
