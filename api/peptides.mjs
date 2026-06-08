// Peptide catalogue for the injection dropdown.
//
// NOTE: this is a curated built-in list (no auth needed to read it). The request
// was to source these "from peptides.xxx" — once you confirm the exact vendor URL
// I can swap this static array for a live fetch/scrape of that catalogue. Until
// then, edit PEPTIDES below to match what you actually run.
const PEPTIDES = [
  // GLP-1 / GIP / glucagon — weight-loss class
  'Retatrutide',
  'Tirzepatide',
  'Semaglutide',
  'Cagrilintide',
  'Survodutide',
  'Mazdutide',
  'Liraglutide',
  // metabolic / fat-loss
  'AOD-9604',
  'Tesofensine',
  '5-Amino-1MQ',
  'MOTS-c',
  // growth-hormone secretagogues
  'Ipamorelin',
  'CJC-1295',
  'Tesamorelin',
  'Sermorelin',
  'Hexarelin',
  'GHRP-2',
  'GHRP-6',
  // healing / recovery
  'BPC-157',
  'TB-500',
  'GHK-Cu',
  'KPV',
  // other commonly-stacked
  'PT-141',
  'Melanotan II',
  'NAD+',
];

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({ peptides: PEPTIDES });
}
