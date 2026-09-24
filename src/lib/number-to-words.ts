// V3.30 - Montant en lettres (français) pour les factures et documents imprimés.
// Utilisé pour la mention légale "Montant total TTC dû est de : ...".

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

// 0 à 99
const belowHundred = (n: number, noPlural = false): string => {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  // 70-79 et 90-99 : soixante-dix / quatre-vingt-dix
  if (t === 7 || t === 9) {
    return TENS[t] + (u === 1 && t === 7 ? '-et-' : '-') + UNITS[10 + u];
  }
  if (u === 0) return TENS[t] + (t === 8 && !noPlural ? 's' : '');
  if (u === 1 && t !== 8) return `${TENS[t]}-et-un`;
  return `${TENS[t]}-${UNITS[u]}`;
};

// 0 à 999
const belowThousand = (n: number, noPlural = false): string => {
  if (n < 100) return belowHundred(n, noPlural);
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = h === 1 ? 'cent' : `${UNITS[h]} cent`;
  if (r === 0) {
    if (h > 1 && !noPlural) out += 's';
    return out;
  }
  return `${out} ${belowHundred(r, noPlural)}`;
};

/** Nombre entier en lettres (0 → 999 999 999 999). */
export function nombreEnLettres(value: number): string {
  const n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return 'zéro';

  const parts: string[] = [];
  const milliards = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  if (milliards > 0) parts.push(milliards === 1 ? 'un milliard' : `${belowThousand(milliards, true)} milliards`);
  if (millions > 0) parts.push(millions === 1 ? 'un million' : `${belowThousand(millions, true)} millions`);
  if (milliers > 0) parts.push(milliers === 1 ? 'mille' : `${belowThousand(milliers, true)} mille`);
  if (reste > 0) parts.push(belowThousand(reste));

  return parts.join(' ');
}

/**
 * Montant en lettres avec devise (arrondi au centime).
 * 1234.5 → "mille deux cent trente-quatre dirhams et cinquante centimes"
 */
export function montantEnLettres(
  value: number | string | null | undefined,
  devise = 'dirham',
  sousDevise = 'centime',
): string {
  // Accepte aussi les chaînes du type "12 345,67" (formulaires)
  const n = typeof value === 'string'
    ? Number(value.replace(/\s/g, '').replace(',', '.'))
    : Number(value);
  if (!isFinite(n) || value === null || value === undefined || value === '') return '';

  const totalCentimes = Math.round(Math.abs(n) * 100);
  const entier = Math.floor(totalCentimes / 100);
  const centimes = totalCentimes % 100;

  const signe = n < 0 ? 'moins ' : '';
  let out = `${signe}${nombreEnLettres(entier)} ${entier === 1 ? devise : `${devise}s`}`;
  if (centimes > 0) out += ` et ${nombreEnLettres(centimes)} ${centimes === 1 ? sousDevise : `${sousDevise}s`}`;
  return out;
}
