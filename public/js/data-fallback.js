/* ========================================
   BANDI DASHBOARD · DONNÉES (FALLBACK STATIQUE)
   Source : flixpatrol.com/title/bandi/ + Netflix Tudum + presse
   Dernière MAJ : 02 mai 2026
   ⚠️ Ce fichier sert UNIQUEMENT de fallback si Supabase est KO.
      En prod, les valeurs `current` / `previous` / `historique` sont écrasées
      par les données live (Object.assign après fetch). Si tu vois des valeurs
      d'avril ici, c'est OK : elles sont juste là pour qu'un dashboard lancé
      hors-ligne reste lisible. Le `_fallback: true` flag aide health-guard
      à afficher un bandeau d'avertissement dans ce cas.
   ======================================== */

// M1 (audit) : marqueur explicite du fallback statique. Il est remis à false
// par loadLiveData() dès qu'on reçoit un snapshot live depuis Supabase. Le
// health-guard s'appuie sur ce flag (plutôt que sur une date figée) pour
// détecter un fallback silencieux.
const BANDI = {
  _fallback: true,
  titre: "Bandi",
  sortie: "2026-04-09",
  episodes: 8,
  genre: "Drame · Cartel",
  plateforme: "Netflix",
  langue: "Français / Créole martiniquais",

  createurs: ["Éric Rochant", "Capucine Rochant"],
  realisateurs: ["Jimmy Laporal-Trésor", "Mathilde Vallet"],
  // Scénaristes locaux additionnels — source : rapport Gemini 19/04/2026
  scenaristesLocaux: ["Khris Burton"],

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
    "Cédric Camille",
    "Evil P (Sherkhan)"
  ],

  // Performance semaine de lancement — sources officielles Netflix Tudum
  // Chronologie : voir rapports/.
  launchWeek: {
    // Semaine 1 (06–12/04/2026, partielle — Bandi sort le 09/04)
    // Tudum officiel : #6 non-English, 2.1M vues
    // Gemini : 16.2M heures (source secondaire, cohérent avec 2.1M vues)
    vuesMillions: 2.1,
    heuresMillions: 16.2,
    paysTop10: 57,
    entreeNonEnglish: 6,
    peakNonEnglish: 2,
    periode: '06–12/04/2026',
    source: 'Netflix Tudum · Top 10 officiel'
  },

  // Semaine 2 (13–19/04/2026, première semaine complète)
  // Source : Netflix Tudum officiel https://www.netflix.com/tudum/articles/top-10-april-13-2026
  // Bandi #1 non-English, 5.2M vues, +150% d'heures vues vs S1 → ~40.5M heures
  // #1 dans 27 pays · Top 10 dans 57 pays · #2 Netflix mondial tous types confondus
  launchWeek2: {
    rangNonEnglish: 1,
    vuesMillions: 5.2,
    heuresMillionsEstim: 40.5,    // +150% vs 16.2M → Netflix ne publie que les vues S2
    croissanceHeuresPct: 150,
    paysN1: 27,
    paysTop10: 57,
    rangMondeTous: 2,              // #2 tous types (TV EN + Non-EN + Films)
    periode: '13–19/04/2026',
    source: 'Netflix Tudum · Top 10 officiel'
  },

  // Cumul 3 semaines au Top 10 mondial (sources whats-on-netflix.com + Tudum)
  // Bandi détrôné par Sold Out on You (KR, 4.7M vues) en S3 (20-26/04/2026)
  // S3 : ~1.9M vues / ~14.7M heures estimées (calcul cumul - S1 - S2)
  cumulTudum: {
    semainesTop10: 3,
    heuresMillions: 71.4,
    vuesMillions: 9.2,
    semaine3: {
      rangNonEnglishEstim: 5,     // estimation ; Sold Out #1, Ronaldinho #2
      vuesMillionsEstim: 1.9,
      heuresMillionsEstim: 14.7,
      periode: '20–26/04/2026',
      detroneePar: 'Sold Out on You (K-drama, 4.7M vues)'
    },
    source: 'Netflix Tudum + What\'s on Netflix · cumul 3 semaines',
    fetchedAt: '2026-05-02'
  },

  // IMDb : note série consolidée (mai 2026)
  // L'aggregateRating série est désormais publié — plus besoin du fallback per-épisode
  // qui faisait sens à la sortie (8.7-8.9 par ép.). La note série globale est plus
  // sévère car elle pondère les épisodes par nombre de votes (la 1re tendance, plus
  // de votes, dominent). Voir aussi screenrant.com 6.2/10.
  imdbCurrent: { rating: 6.2, max: 10 },

  // Plage de notes IMDb par épisode (S1) — rapport Gemini 19/04/2026
  // Conservé pour le contexte historique (pic d'enthousiasme à la sortie)
  imdbPerEpisode: { min: 8.7, max: 8.9 },

  // Hashtag viral identifié — TikTok / X
  viralHashtag: '#BandiNetflix',

  // Réception critique presse — 12 sources documentées (24/04/2026)
  // Compense l'absence de Tomatometer officiel chez Rotten Tomatoes
  // (RT n'a qu'1 critique seule = pas assez pour un score consensus).
  // Verdict : 'positif' | 'mitige' | 'negatif' — agrégation maison.
  criticReviews: {
    fetchedAt: '2026-05-02',
    total: 12,
    positifs: 9,
    mitiges: 3,
    negatifs: 0,
    scorePct: 75,           // 9/12 = 75 % critiques favorables
    notePresseAlloMoy: 3.9, // note presse Allociné (sur 5) — base 7 critiques (à jour 02/05)
    notePresseAlloN: 7,     // nb critiques presse Allociné
    noteSpectAlloMoy: 4.0,  // note spectateurs Allociné
    noteSpectAlloN: 284,    // nb notes spectateurs (avec 83 critiques rédigées)
    sources: [
      { media: 'Le Parisien',           pays: 'FR', verdict: 'positif',
        citation: '« Thriller social intense », tensions familiales et sociales brillamment captées.',
        url: 'https://www.allocine.fr/series/ficheserie-1000000157/critiques/presse/' },
      { media: 'Le Monde',              pays: 'FR', verdict: 'positif',
        citation: 'Immersion dans l\'envers du décor paradisiaque · « souci d\'authenticité » réel.',
        url: 'https://www.allocine.fr/series/ficheserie-1000000157/critiques/presse/' },
      { media: 'Les Inrockuptibles',    pays: 'FR', verdict: 'positif',
        citation: 'L\'art de Rochant s\'affirme avec « force et finesse » — mise en scène, complexité des personnages.',
        url: 'https://www.allocine.fr/series/ficheserie-1000000157/critiques/presse/' },
      { media: 'NoPopCorn',             pays: 'FR', verdict: 'positif',
        citation: 'Rochant « réinvente le polar familial » dans une Martinique post-drame.',
        url: 'https://www.nopopcorn.fr/series/bandi-netflix-2026-une-plongee-dans-la-martinique-post-drame-eric-rochant-reinvente-le-polar-familial/' },
      { media: 'NRJ Antilles',          pays: 'MQ', verdict: 'positif',
        citation: '« La série Netflix qui change la donne » pour la représentation antillaise.',
        url: 'https://nrjantilles.com/bandi-la-serie-netflix-qui-change-la-donne/' },
      { media: 'Decider',               pays: 'US', verdict: 'positif',
        citation: 'Stream It · « Drame intéressant sur une famille qui essaie de rester soudée. » (Joel Keller)',
        url: 'https://decider.com' },
      { media: 'Screen Rant',           pays: 'US', verdict: 'positif',
        citation: '« Gritty new 8-part crime series taking over streaming worldwide. »',
        url: 'https://screenrant.com/netflix-bandi-streaming-success-april-2026/' },
      { media: 'K-waves and Beyond',    pays: 'INT', verdict: 'positif',
        citation: '« Compelling and Emotional, Even When It Feels Uneven. »',
        url: 'https://kwavesandbeyond.com/bandi-review/' },
      { media: 'SensCritique (presse)', pays: 'FR', verdict: 'positif',
        citation: 'Représentation fidèle de la Martinique, profondeur des thèmes abordés.',
        url: 'https://www.senscritique.com/serie/bandi/133850632' },
      { media: 'What\'s on Netflix',    pays: 'INT', verdict: 'mitige',
        citation: '« Brave and Heartfelt Project Muddled By Various Clichés. » Jeu inégal des nouveaux acteurs.',
        url: 'https://www.whats-on-netflix.com/what-to-watch/bandi-french-crime-drama-review/' },
      { media: 'MoviesR.net',           pays: 'INT', verdict: 'mitige',
        citation: '« Struggles to Balance Crime and Family. » Rythme glacial reproché.',
        url: 'https://moviesr.net/p-bandi-2026-netflix-series-review-struggles-to-balance-crime-and-family' },
      { media: 'Fnac Leclaireur',       pays: 'FR', verdict: 'mitige',
        citation: 'Pose la question : « Bandi est-elle surcotée ? » · synthèse des avis presse.',
        url: 'https://leclaireur.fnac.com/article/667828-bandi-la-serie-est-elle-surcotee-ce-quen-disent-les-critiques/' }
    ]
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SIGNAUX DE RENOUVELLEMENT SAISON 2 (analyse défendable, mai 2026)
  // ═════════════════════════════════════════════════════════════════════════
  // Source : prompt analytique Allan 06/05/2026 — toutes les valeurs sont
  // accompagnées d'un statut de fiabilité (6 catégories) pour distinguer
  // strictement données officielles, calculées, estimées, hypothèses.
  //
  // RÈGLE D'OR : ne JAMAIS afficher l'annulation S2 comme une certitude.
  // Hypothèse uniquement, basée sur signaux publics. Cause réelle = Not Public.
  bandiPerformance: {
    title: 'BANDI',
    platform: 'Netflix',
    releaseDate: '2026-04-09',
    season: 1,
    episodes: 8,
    runtimeHours: 7.8,
    episodeDurations: [
      { episode: 1, durationMinutes: 59 },
      { episode: 2, durationMinutes: 61 },
      { episode: 3, durationMinutes: 62 },
      { episode: 4, durationMinutes: 62 },
      { episode: 5, durationMinutes: 54 },
      { episode: 6, durationMinutes: 51 },
      { episode: 7, durationMinutes: 52 },
      { episode: 8, durationMinutes: 63 }
    ],
    weeklyNetflixTop10: [
      {
        weekLabel: '06–12 avril 2026',
        weekNumber: 1,
        rank: 6,
        hoursViewed: 16_200_000,
        viewsCVE: 2_100_000,
        territoriesTop10: null,
        numberOneTerritories: null,
        weekOverWeekDrop: null,
        reliability: { status: 'Official', score: 95, explanation: 'Classements publics Netflix Top 10 (Tudum).' }
      },
      {
        weekLabel: '13–19 avril 2026',
        weekNumber: 2,
        rank: 1,
        hoursViewed: 40_500_000,
        viewsCVE: 5_200_000,
        territoriesTop10: 48,
        numberOneTerritories: 13,
        weekOverWeekDrop: +150,
        reliability: { status: 'Official / Verified', score: 90, explanation: 'Heures vues et rang : Netflix officiel. Territoires : presse locale + Tudum.' }
      },
      {
        weekLabel: '20–26 avril 2026',
        weekNumber: 3,
        rank: 8,
        hoursViewed: 14_700_000,
        viewsCVE: 1_900_000,
        territoriesTop10: 19,
        numberOneTerritories: 3,    // Martinique, Guadeloupe, La Réunion
        weekOverWeekDrop: -63.7,
        reliability: { status: 'Official / Calculated', score: 90, explanation: 'Chute calculée à partir des heures vues publiques Netflix.' }
      }
    ],
    totalsPublicTop10: {
      hoursViewed: 71_400_000,
      viewsCVE: 9_200_000,
      reliability: { status: 'Official / Calculated', score: 95, explanation: 'Total calculé à partir des trois semaines publiques Netflix Top 10.' }
    },
    completionEstimate: {
      central: 53,
      low: 47,
      high: 59,
      reliability: { status: 'Estimated', score: 62, explanation: 'Estimation : heures vues / durée totale + chute hebdo + modèle de rétention. Netflix ne publie pas le taux réel.' }
    },
    retentionByEpisodeEstimate: [
      { episode: 1, retention: 100 },
      { episode: 2, retention: 80  },
      { episode: 3, retention: 72  },
      { episode: 4, retention: 66  },
      { episode: 5, retention: 61  },
      { episode: 6, retention: 58  },
      { episode: 7, retention: 55  },
      { episode: 8, retention: 53  }
    ],
    retentionReliability: { status: 'Estimated', score: 45, explanation: 'Modélisation. Netflix ne publie pas les abandons par épisode.' },
    audienceEstimate: {
      startersLow: 13.4,    // millions
      startersHigh: 15,
      completersLow: 7.1,
      completersHigh: 8,
      reliability: { status: 'Estimated', score: 50, explanation: 'Estimation indirecte : durée saison + heures vues + modèle complétion.' }
    },
    instagramNetflixFrance: {
      account: '@netflixfr',
      followersOnReleaseDate: 10_954_043,
      followersOnMay01: 11_013_888,
      measuredGain: 59_845,
      growthPct: 0.55,
      projectedGainToMay06Low: 70_000,
      projectedGainToMay06High: 80_000,
      postsOnReleaseDate: 11_235,
      postsOnMay01: 11_327,
      postsGain: 92,
      reliabilityGain: { status: 'Verified', score: 75, explanation: 'Gain mesuré sur @netflixfr entre 09/04 et 01/05.' },
      reliabilityProjection: { status: 'Estimated', score: 55, explanation: 'Projection prudente après le 01/05.' },
      reliabilityAttribution: { status: 'Weak Signal', score: 30, explanation: 'Période BANDI mais Netflix France publie aussi sur d\'autres titres — attribution directe impossible.' }
    },
    subscriberImpact: {
      reliability: { status: 'Not Public', score: 15, explanation: 'Netflix ne publie plus les abonnés trimestriels depuis 2025. Aucun chiffre attribuable à un titre.' }
    },
    season2Status: {
      publicStatus: 'not_officially_confirmed',
      hypothesisReliability: { status: 'Weak Signal', score: 25, explanation: 'Hypothèse analytique basée sur les signaux publics. Aucune source publique ne confirme le non-renouvellement.' },
      realCauseReliability: { status: 'Not Public', score: 15, explanation: 'Les vraies métriques de décision (rétention réelle, ROI, acquisition abonnés) restent internes Netflix.' }
    },
    renewalRiskMatrix: [
      { signal: 'Pic #1 mondial non-anglophone (S2)',         direction: 'favorable',    status: 'Official',                   score: 95 },
      { signal: '40,5 M heures vues sur la meilleure semaine',direction: 'favorable',    status: 'Official',                   score: 95 },
      { signal: 'Top 10 dans 48 pays au pic',                 direction: 'favorable',    status: 'Verified',                   score: 80 },
      { signal: 'Ancrage Caraïbes / Outre-mer / France',      direction: 'favorable',    status: 'Verified',                   score: 75 },
      { signal: 'Visibilité médiatique régionale',            direction: 'favorable',    status: 'Analytical / Verified',      score: 65 },
      { signal: 'Chute -63,7 % en semaine 3',                 direction: 'défavorable', status: 'Calculated from Official',   score: 90 },
      { signal: 'Sortie probable du Top 10 après 3 semaines', direction: 'défavorable', status: 'Verified / Observed',        score: 75 },
      { signal: 'Completion Score estimé ≈ 53 %',             direction: 'mitigé',       status: 'Estimated',                  score: 62 },
      { signal: 'Série longue (8 ép · 7,8 h)',                direction: 'défavorable', status: 'Analytical',                 score: 55 },
      { signal: 'Impact abonnés Netflix non prouvable',       direction: 'inconnu',      status: 'Not Public',                 score: 15 },
      { signal: 'Attribution Instagram Netflix FR à BANDI',   direction: 'mitigé',       status: 'Weak Signal',                score: 30 },
      { signal: 'Cause réelle d\'un éventuel non-renouvellement', direction: 'inconnu', status: 'Not Public',                 score: 15 }
    ],
    confidenceIndex: [
      { label: 'Heures vues Netflix Top 10',                score: 95 },
      { label: 'Vues Netflix / CVE',                        score: 95 },
      { label: 'Rang mondial Netflix',                      score: 95 },
      { label: 'Pays Top 10',                               score: 80 },
      { label: 'Completion Score estimé',                   score: 62 },
      { label: 'Rétention épisode par épisode',             score: 45 },
      { label: 'Starters estimés',                          score: 50 },
      { label: 'Completers estimés',                        score: 50 },
      { label: 'Impact Instagram global Netflix France',    score: 75 },
      { label: 'Attribution Instagram à BANDI',             score: 30 },
      { label: 'Impact abonnés Netflix',                    score: 15 },
      { label: 'Cause réelle de non-renouvellement',        score: 15 },
      { label: 'Hypothèse analytique de non-renouvellement',score: 25 }
    ]
  },

  // Catégories de fiabilité (6 niveaux) — utilisées par renderReliabilityBadge()
  // pour afficher un badge cohérent partout dans le dashboard.
  dataReliabilityCategories: {
    official:    { label: 'Official',    minScore: 90, maxScore: 100, color: '#22c55e', desc: 'Source primaire ou officielle.' },
    verified:    { label: 'Verified',    minScore: 75, maxScore: 89,  color: '#3b82f6', desc: 'Source secondaire fiable ou recoupée.' },
    calculated:  { label: 'Calculated',  minScore: 70, maxScore: 95,  color: '#10b981', desc: 'Calculée à partir de données officielles.' },
    estimated:   { label: 'Estimated',   minScore: 45, maxScore: 74,  color: '#f59e0b', desc: 'Estimée à partir de plusieurs signaux publics.' },
    weakSignal:  { label: 'Weak Signal', minScore: 20, maxScore: 44,  color: '#f97316', desc: 'Signal possible mais fragile ou difficilement attribuable.' },
    notPublic:   { label: 'Not Public',  minScore: 0,  maxScore: 19,  color: '#6b7280', desc: 'Donnée non publiée ou impossible à connaître publiquement.' }
  },

  // Score / rang actuel (16/04/2026) — source FlixPatrol
  // Note : paysN1 et paysTop10 sont recalculés à partir de la liste `pays`
  //        côté app.js (Object.assign après fetch Supabase) — les valeurs
  //        ci-dessous servent uniquement de fallback offline.
  current: {
    score: 539,
    rang: 1,
    paysN1: 13,
    paysTop10: 37,
    rangMoyen: 4.7,
    date: '2026-04-16'
  },

  // Jour précédent pour calculer les deltas
  previous: {
    score: 471,
    rang: 2,
    paysN1: 12,
    paysTop10: 36,
    rangMoyen: 4.9
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
    { jour: "15/04", label: "J+6",     score: 471,  rang: 2,    paysN1: 12, paysTop10: 36, rangMoyen: 4.9 },
    { jour: "16/04", label: "J+7",     score: 539,  rang: 1,    paysN1: 13, paysTop10: 37, rangMoyen: 4.7 }
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
    // _verified: passer à `true` une fois confirmé par la production — health-guard
    // affichera un flag "non vérifié" tant que ce flag n'est pas à true.
    authenticite: {
      pctCasting: 91,
      acteursLocaux: 75,
      totalRoles: 82,
      _verified: false,
      _source: 'Estimation interne Maui Entertainment — à confirmer',
      comparaisons: [
        { titre: 'Top Boy (UK)', pct: 50 },
        { titre: 'Narcos (CO)',  pct: 40 }
      ]
    },

    // Forecast Saison 2 · modèle probabiliste interne · NON OFFICIEL
    // _validated: passer à true une fois la formule calibrée sur un historique réel.
    // Tant que false, le health-guard affiche un badge "heuristique non validée".
    forecastS2: {
      probabilite: 85,
      _validated: false,
      _model: 'Heuristique additive (base 30 + bonus empiriques)',
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

// Exposition sur window — nécessaire car `const` ne s'attache pas à globalThis.
// monitoring.js et health-guard.js y accèdent via window.BANDI / window.REGION_COLORS.
window.BANDI         = BANDI;
window.REGION_COLORS = REGION_COLORS;
