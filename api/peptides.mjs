// Peptide catalogue for the injection dropdown — sourced from peptides.xxx
// ("Prometheus Research Protocol — Catalog"). The storefront is a client-rendered
// SPA, so this is a snapshot of its products (captured 2026-06-08), grouped by
// use-case with the weight-loss/metabolic class first (this app's focus).
// Re-scrape the site and edit this array to refresh.
const PEPTIDES = [
  // metabolic / weight-loss
  'Retatrutide',
  '5-Amino-1MQ',
  'AOD-9604',
  'MOTS-c',
  // growth-hormone secretagogues
  'Ipamorelin',
  'CJC-1295 (No DAC)',
  'CJC-1295 (with DAC)',
  'Tesamorelin',
  // recovery / healing
  'BPC-157',
  'TB-500',
  'GHK-Cu',
  'TA-1 (Thymosin Alpha-1)',
  // cognitive
  'Semax',
  'Cerebrolysin',
  // longevity
  'Epithalon',
  'Pinealon',
  'FOXO4',
  'NAD+',
  // stacks (bundles)
  'Wolverine Stack',
  'Pulse Stack',
  'Glow Stack',
];

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({ peptides: PEPTIDES, source: 'peptides.xxx' });
}
