// V3.33 - Pré-remplissage OCR des bons de commande.
// tesseract.js n'est PAS ajouté aux dépendances : il est chargé depuis le CDN
// uniquement quand l'utilisateur clique sur « Pré-remplir (OCR) », pour ne
// pas alourdir le bundle ni toucher aux lockfiles. Si le CDN est injoignable,
// l'application reste utilisable en saisie manuelle.

const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

function loadTesseract(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.Tesseract) return resolve(w.Tesseract);
    const existing = document.querySelector(`script[src="${TESSERACT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(w.Tesseract));
      existing.addEventListener('error', () => reject(new Error('OCR indisponible (CDN)')));
      return;
    }
    const script = document.createElement('script');
    script.src = TESSERACT_SRC;
    script.async = true;
    script.onload = () => resolve(w.Tesseract);
    script.onerror = () => reject(new Error('OCR indisponible (CDN)'));
    document.head.appendChild(script);
  });
}

// Renvoie le texte brut d'une image ou d'une URL d'image (scan du bon de commande)
export async function lireTexteOCR(source: File | Blob | string): Promise<string> {
  const Tesseract = await loadTesseract();
  if (!Tesseract || typeof Tesseract.recognize !== 'function') {
    throw new Error('OCR indisponible');
  }
  const result = await Tesseract.recognize(source, 'fra');
  return result?.data?.text || '';
}

export interface LignePrevue {
  articleId?: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  totalHT: number;
}

const MOTS_IGNORES = /désignation|designation|quantit|q\.té|qte|prix|montant|total|tva|article|réf|reference|règlement|page|bon de commande|date|client/i;

// Heuristique de pré-remplissage : on ne garde que les lignes exploitables,
// l'utilisateur valide/modifie ensuite dans le formulaire (pré-remplissage seul).
export function lignesDepuisTexte(texte: string, articles: { id: string; code: string; designation: string; prixUnitaire: number }[]): LignePrevue[] {
  const lignes: LignePrevue[] = [];
  const nettoie = (v: string) => v.replace(/\s+/g, ' ').trim();
  const nb = (v: string) => parseFloat(v.replace(/\s/g, '').replace(',', '.'));

  for (const brutte of (texte || '').split(/\r?\n/)) {
    if (lignes.length >= 60) break;
    const ligne = nettoie(brutte);
    if (!ligne || ligne.length < 4 || MOTS_IGNORES.test(ligne)) continue;

    // 1) "designation qte pu" en fin de ligne
    let m = ligne.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/);
    let designation = '', quantite = 0, pu = 0;
    if (m) {
      designation = m[1]; quantite = nb(m[2]); pu = nb(m[3]);
    } else {
      // 2) "designation qte"
      m = ligne.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:x|pce|pcs|u|m|kg)?$/i);
      if (!m) continue;
      designation = m[1]; quantite = nb(m[2]); pu = 0;
    }
    designation = nettoie(designation);
    if (!designation || designation.length < 2 || quantite <= 0) continue;

    // 3) Le token de tête peut être un code article
    let articleId: string | undefined;
    const premierMot = designation.split(' ')[0];
    const article = articles.find((a) => a.code?.trim().toLowerCase() === premierMot.toLowerCase());
    if (article) {
      articleId = article.id;
      if (pu <= 0) pu = article.prixUnitaire || 0;
      designation = nettoie(designation.slice(premierMot.length)) || article.designation;
    }

    lignes.push({
      articleId,
      designation,
      quantite,
      prixUnitaire: pu,
      totalHT: Math.round(quantite * pu * 100) / 100,
    });
  }
  return lignes;
}
