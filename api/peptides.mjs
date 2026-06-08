// Peptide catalogue for the injection dropdown.
//
// SOURCE OF TRUTH: ringgroup/peptide-xxx → lib/catalog.ts (the storefront's own
// server-side CATALOG). That file lists every SKU incl. dose/pen variants; here
// we mirror it deduped to distinct *compounds* (what you actually log a pin of),
// grouped with the weight-loss/metabolic class first. Refresh this list when the
// repo's catalog changes. (Can be wired to fetch live from the repo if desired —
// needs a read-only token in Vercel since peptide-xxx is private.)
const PEPTIDES = [
  // metabolic / weight management
  'Retatrutide',
  'MOTS-c',
  'AOD-9604',
  '5-Amino-1MQ',
  'HGH',
  // growth-hormone secretagogues
  'Ipamorelin',
  'CJC-1295 (No DAC)',
  'CJC-1295 (with DAC)',
  'Tesamorelin',
  // recovery / healing
  'BPC-157',
  'TB-500',
  'KPV',
  'LL-37',
  'GHK-Cu',
  // immune / thymus
  'TA-1 (Thymosin Alpha-1)',
  'Glutathione',
  // cognitive / neuro
  'Semax',
  'Cerebrolysin',
  'FOXO4',
  'Pinealon',
  // longevity
  'Epithalon',
  'NAD+',
  // sexual health
  'PT-141 (Bremelanotide)',
  'Oxytocin',
  'Melanotan II',
  // stacks (bundles)
  'Pulse Stack',
  'Wolverine Stack',
  'Glow Stack',
];

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({ peptides: PEPTIDES, source: 'ringgroup/peptide-xxx:lib/catalog.ts' });
}
