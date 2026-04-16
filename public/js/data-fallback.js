/* ========================================
   BANDI DASHBOARD · DONNÉES
   Source : flixpatrol.com/title/bandi/
   Dernière MAJ : 16 avril 2026
   ======================================== */

const BANDI = {
  titre: "Bandi",
  sortie: "2026-04-09",
  episodes: 8,
  genre: "Drame · Cartel",
  plateforme: "Netflix",
  langue: "Français / Créole martiniquais",

  createurs: ["Éric Rochant", "Capucine Rochant"],
  realisateurs: ["Jimmy Laporal-Trésor", "Mathilde Vallet"],

  casting: [
    "Rudgy Pajany",
    "Jonathan Zaccaï",
    "Rémy Laquittant",
    "Djody Grimeau",
    "William Paul-Joseph",
    "Evan Lienafa",
    "Ambre Bozza",
    "Souane Rosamont",
    "Steeven Mornet",
    "Lucas Pernock",
    "Rodney Dijon",
    "Patrick Trieste",
    "Cédric Camille"
  ],

  // Score / rang actuel (16/04/2026) — source FlixPatrol
  current: {
    score: 539,
    rang: 1,
    paysN1: 27,
    paysTop10: 57,
    rangMoyen: 2.7,
    date: '2026-04-16'
  },

  // Jour précédent pour calculer les deltas
  previous: {
    score: 471,
    rang: 2,
    paysN1: 27,
    paysTop10: 57,
    rangMoyen: 2.7
  },

  // Historique jour par jour depuis la sortie
  // Source : FlixPatrol "Bandi on Netflix TOP 10 this week"
  historique: [
    { jour: "09/04", label: "Sortie",  score: null, rang: null, paysN1: 0,  paysTop10: 0,  rangMoyen: null },
    { jour: "10/04", label: "J+1",     score: 107,  rang: 10,   paysN1: 3,  paysTop10: 17, rangMoyen: 5.9 },
    { jour: "11/04", label: "J+2",     score: 170,  rang: 8,    paysN1: 7,  paysTop10: 28, rangMoyen: 5.5 },
    { jour: "12/04", label: "J+3",     score: 209,  rang: 7,    paysN1: 8,  paysTop10: 37, rangMoyen: 5.4 },
    { jour: "13/04", label: "J+4",     score: 348,  rang: 6,    paysN1: 13, paysTop10: 37, rangMoyen: 4.8 },
    { jour: "14/04", label: "J+5",     score: 391,  rang: 5,    paysN1: 15, paysTop10: 39, rangMoyen: 3.5 },
    { jour: "15/04", label: "J+6",     score: 471,  rang: 2,    paysN1: 27, paysTop10: 57, rangMoyen: 2.7 },
    { jour: "16/04", label: "J+7",     score: 539,  rang: 1,    paysN1: 27, paysTop10: 57, rangMoyen: 2.7 }
  ],

  // Détail par pays (13/04/2026)
  // Position actuelle + historique des 4 derniers jours (10, 11, 12, 13 avril)
  pays: [
    // --- PAYS EN #1 ---
    { pays: "Martinique",        code: "MQ", flag: "🇲🇶", region: "Caraïbes",           rang: 1,  entree: "10/04", historique: [1, 1, 1, 1],   trend: "stable" },
    { pays: "Guadeloupe",        code: "GP", flag: "🇬🇵", region: "Caraïbes",           rang: 1,  entree: "10/04", historique: [1, 1, 1, 1],   trend: "stable" },
    { pays: "Bahamas",           code: "BS", flag: "🇧🇸", region: "Caraïbes",           rang: 1,  entree: "10/04", historique: [1, 1, 1, 1],   trend: "stable" },
    { pays: "France",            code: "FR", flag: "🇫🇷", region: "Europe",             rang: 1,  entree: "10/04", historique: [2, 1, 1, 1],   trend: "up" },
    { pays: "Réunion",           code: "RE", flag: "🇷🇪", region: "Océan Indien",       rang: 1,  entree: "10/04", historique: [2, 1, 1, 1],   trend: "up" },
    { pays: "Jamaïque",          code: "JM", flag: "🇯🇲", region: "Caraïbes",           rang: 1,  entree: "10/04", historique: [2, 1, 1, 1],   trend: "up" },
    { pays: "Rép. Dominicaine",  code: "DO", flag: "🇩🇴", region: "Caraïbes",           rang: 1,  entree: "10/04", historique: [3, 1, 1, 1],   trend: "up" },
    { pays: "Trinidad & Tobago", code: "TT", flag: "🇹🇹", region: "Caraïbes",           rang: 1,  entree: "10/04", historique: [3, 3, 1, 1],   trend: "up" },
    { pays: "Panama",            code: "PA", flag: "🇵🇦", region: "Amérique Centrale",  rang: 1,  entree: "10/04", historique: [4, 4, 2, 1],   trend: "up" },
    { pays: "Nouvelle-Calédonie",code: "NC", flag: "🇳🇨", region: "Océanie",            rang: 1,  entree: "11/04", historique: [null, 6, 4, 1],trend: "up" },
    { pays: "Hongrie",           code: "HU", flag: "🇭🇺", region: "Europe",             rang: 1,  entree: "10/04", historique: [10, 6, 5, 1],  trend: "up" },
    { pays: "Honduras",          code: "HN", flag: "🇭🇳", region: "Amérique Centrale",  rang: 1,  entree: "10/04", historique: [8, 8, 6, 1],   trend: "up" },
    { pays: "Venezuela",         code: "VE", flag: "🇻🇪", region: "Amérique du Sud",    rang: 1,  entree: "10/04", historique: [10, 8, 8, 1],  trend: "up" },

    // --- PAYS TOP 10 (hors #1) ---
    { pays: "Nigeria",           code: "NG", flag: "🇳🇬", region: "Afrique",            rang: 2,  entree: "10/04", historique: [5, 4, 2, 2],   trend: "stable" },
    { pays: "Portugal",          code: "PT", flag: "🇵🇹", region: "Europe",             rang: 3,  entree: "10/04", historique: [7, 6, 3, 3],   trend: "stable" },
    { pays: "Argentine",         code: "AR", flag: "🇦🇷", region: "Amérique du Sud",    rang: 4,  entree: "10/04", historique: [10, 7, 4, 4],  trend: "stable" },
    { pays: "Brésil",            code: "BR", flag: "🇧🇷", region: "Amérique du Sud",    rang: 4,  entree: "10/04", historique: [7, 6, 4, 4],   trend: "stable" },
    { pays: "Maurice",           code: "MU", flag: "🇲🇺", region: "Océan Indien",       rang: 4,  entree: "10/04", historique: [10, 5, 4, 4],  trend: "stable" },
    { pays: "Slovaquie",         code: "SK", flag: "🇸🇰", region: "Europe",             rang: 5,  entree: "10/04", historique: [8, 5, 5, 5],   trend: "stable" },
    { pays: "Uruguay",           code: "UY", flag: "🇺🇾", region: "Amérique du Sud",    rang: 5,  entree: "11/04", historique: [null, 9, 5, 5],trend: "stable" },
    { pays: "Espagne",           code: "ES", flag: "🇪🇸", region: "Europe",             rang: 5,  entree: "11/04", historique: [null, 8, 6, 5],trend: "up" },
    { pays: "Luxembourg",        code: "LU", flag: "🇱🇺", region: "Europe",             rang: 6,  entree: "11/04", historique: [null, 7, 6, 6],trend: "stable" },
    { pays: "Costa Rica",        code: "CR", flag: "🇨🇷", region: "Amérique Centrale",  rang: 6,  entree: "11/04", historique: [null, 9, 6, 6],trend: "stable" },
    { pays: "Colombie",          code: "CO", flag: "🇨🇴", region: "Amérique du Sud",    rang: 7,  entree: "10/04", historique: [10, 8, 7, 7],  trend: "stable" },
    { pays: "Kenya",             code: "KE", flag: "🇰🇪", region: "Afrique",            rang: 7,  entree: "11/04", historique: [null, 7, 7, 7],trend: "stable" },
    { pays: "Chili",             code: "CL", flag: "🇨🇱", region: "Amérique du Sud",    rang: 8,  entree: "12/04", historique: [null, null, 8, 8], trend: "stable" },
    { pays: "Suisse",            code: "CH", flag: "🇨🇭", region: "Europe",             rang: 8,  entree: "11/04", historique: [null, 10, 8, 8],trend: "stable" },
    { pays: "Maroc",             code: "MA", flag: "🇲🇦", region: "Afrique",            rang: 8,  entree: "11/04", historique: [null, 6, 8, 8], trend: "down" },
    { pays: "Rép. Tchèque",      code: "CZ", flag: "🇨🇿", region: "Europe",             rang: 8,  entree: "10/04", historique: [10, 7, 8, 8],  trend: "down" },
    { pays: "Nicaragua",         code: "NI", flag: "🇳🇮", region: "Amérique Centrale",  rang: 8,  entree: "10/04", historique: [10, 8, 8, 8],  trend: "stable" },
    { pays: "Belgique",          code: "BE", flag: "🇧🇪", region: "Europe",             rang: 9,  entree: "11/04", historique: [null, 9, 9, 9], trend: "stable" },
    { pays: "Équateur",          code: "EC", flag: "🇪🇨", region: "Amérique du Sud",    rang: 9,  entree: "12/04", historique: [null, null, 9, 9], trend: "up" },
    { pays: "Pays-Bas",          code: "NL", flag: "🇳🇱", region: "Europe",             rang: 9,  entree: "12/04", historique: [null, null, 9, 9], trend: "up" },
    { pays: "Roumanie",          code: "RO", flag: "🇷🇴", region: "Europe",             rang: 9,  entree: "11/04", historique: [null, 8, 9, 9], trend: "down" },
    { pays: "Italie",            code: "IT", flag: "🇮🇹", region: "Europe",             rang: 10, entree: "12/04", historique: [null, null, 10, 10], trend: "stable" },
    { pays: "Salvador",          code: "SV", flag: "🇸🇻", region: "Amérique Centrale",  rang: 10, entree: "12/04", historique: [null, null, 10, 10], trend: "stable" },
    { pays: "États-Unis",        code: "US", flag: "🇺🇸", region: "Amérique du Nord",   rang: 8,  entree: "12/04", historique: [null, null, 10, 8],  trend: "up" }
  ],

  // Top TV Shows Netflix Monde au 16/04 — source FlixPatrol
  rivals: [
    { titre: "Bandi",                        score: 539, isBandi: true  },
    { titre: "Trust Me: The False Prophet",  score: 498, isBandi: false },
    { titre: "Salish & Jordan Matter",       score: 458, isBandi: false },
    { titre: "Bloodhounds",                  score: 445, isBandi: false },
    { titre: "The Cleaning Lady",            score: 386, isBandi: false },
    { titre: "Detective Hole",               score: 215, isBandi: false },
    { titre: "Big Mistakes",                 score: 180, isBandi: false },
    { titre: "Something Very Bad...",        score: 153, isBandi: false },
    { titre: "Beauty in Black",              score: 136, isBandi: false }
  ],

  // ── Données stratégiques B2B ──────────────────────────────────────────
  // Hardcodées · À valider manuellement par la production
  strategique: {
    // Rang USA Top 10 Netflix — valeur de fallback uniquement.
    // Le rang live prioritaire provient de bandi_country_rankings WHERE pays='États-Unis'
    // et est lu à la fois par renderBreakthroughUSA() et renderForecastS2()
    // pour garantir la cohérence entre les deux modules.
    usaRang: 8,
    usaDate: '15/04/2026',
    usaEntry: true,
    usaNote: 'First French-Caribbean series to break US Top 10',

    // 91% du casting est martiniquais · Source : Maui Entertainment / casting interne
    // À VALIDER par la production avant toute présentation officielle
    authenticite: {
      pctCasting: 91,
      acteursLocaux: 75,
      totalRoles: 82,
      comparaisons: [
        { titre: 'Top Boy (UK)', pct: 50 },
        { titre: 'Narcos (CO)',  pct: 40 }
      ]
    },

    // Forecast Saison 2 · modèle probabiliste interne · NON OFFICIEL
    forecastS2: {
      probabilite: 85,
      indicateurs: [
        // Taux de complétion estimé — remplacé dynamiquement par computeCompletionScore() au rendu
        // Le fallback ci-dessous ne s'affiche que si tout le calcul échoue
        { label: 'Taux de complétion estimé', valeur: '—/100', seuil: '≥ 70',  ok: false },
        // Rang USA remplacé dynamiquement par renderForecastS2() depuis BANDI.pays
        { label: 'Top 10 USA atteint',      valeur: '#8',    seuil: '~3%',    ok: true  },
        { label: '#1 dans 13+ pays',        valeur: '13+',   seuil: 'signal', ok: true  },
        { label: 'Score popularité',        valeur: '+108%', seuil: '4 jours',ok: true  },
        { label: 'Renouvellement officiel', valeur: '—',     seuil: 'Netflix',ok: false }
      ],
      disclaimer: 'Estimation interne · non officielle — Modèle basé sur l\'historique des renouvellements Netflix de séries non-anglophones ayant atteint le top 10 mondial dès la S1.'
    }
  }
};

// Couleurs régions
const REGION_COLORS = {
  "Caraïbes":           "#CE1126",
  "Europe":             "#D4A017",
  "Amérique du Sud":    "#009739",
  "Amérique Centrale":  "#FF6B35",
  "Amérique du Nord":   "#4A90E2",
  "Océan Indien":       "#00B4D8",
  "Océanie":            "#7209B7",
  "Afrique":            "#F77F00"
};
