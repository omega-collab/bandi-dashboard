/* ========================================
   BANDI DASHBOARD · AUTH B2B
   Sécurité basique dissuasive — côté client
   Liste : 192 noms équipe technique (générique)
   ======================================== */

// ⚠️ Flag global : mettre à true pour réactiver la protection
// Quand false : toutes les pages sont publiques, aucune redirection
window.AUTH_ENABLED = false;

const PASSWORD = "bandi972";

// Identifiant spécial pour les personnes externes à l'équipe production
// Usage : identifiant "public" + mot de passe "bandi972"
const PUBLIC_ID = "public";

// Liste normalisée (lowercase, sans accents, tirets → espaces)
const VALID_NAMES = [
  "alex meignan", "alexandre denjoy", "alexia lecerf",
  "alexis blanc", "allan humeau", "alphonse gamiette",
  "alyss aelle ferjul", "ambre bozza", "andre rigaut",
  "anouk marin", "antek graczyk", "anthony pierre louis",
  "antoine petton", "armelle calonne", "arnaud le roy",
  "axel icarre", "bastien blockx", "benedicte guillaume",
  "briac lessard", "britta demasse", "bryan borne",
  "capucine rochant", "caroline dieusaert",
  "cedric subra montaggioni", "celia aude marie julie",
  "celine lodziak", "charlotte bovinelli", "cheika lin",
  "chloe leonil", "christel vadeleux", "christophe roblin",
  "christopher robert", "corinne bisso", "crystel fournier",
  "cyril raffaelli", "damien tessandier", "daphne girault",
  "david donat", "david julienne", "david moulin",
  "dimitri borne", "dimitri haulet", "dimitri meruz",
  "dimitry jeannette", "djessy coco", "domitille gas",
  "eddy nohile", "eddy surena", "elisabeth peron",
  "elisia douillet", "emmanuel sajot", "eric rochant",
  "eric schauer", "estelle babut gay", "eva toula",
  "eve abrosi", "fabienne palix", "facene romain",
  "frantz lonete", "frederic guillaume paruta",
  "frederic ronne", "frederik folkeringa", "gianny tayalay",
  "gigi akoka", "gilbertha edwards", "guillaume deviercy",
  "gwenola balmelle", "hannelore estachy", "harry julius",
  "heloise grandu", "herve lezin", "idriss duleme",
  "isabelle planelles", "isabelle ribis",
  "jack alexandre soufflard", "jade nguyen van tinh",
  "janil auguste virginie", "jean benoit guillon",
  "jean christophe mahe", "jean claude banys",
  "jean hugues miredin", "jean marc clemente",
  "jean pierre garbin", "jeanne beaudry",
  "jennifer lafuma", "jeremie leloup", "jerome miel",
  "jessie claude", "jimmy fixy", "jimmy laporal tresor",
  "joel jean laurent", "joelle padou", "johann sorin",
  "jonathan claude", "joseph abeille", "jules barbier",
  "julie bruchert", "karl trebla", "kathleen gros",
  "kathleen josephine", "kevin suard", "khris burton",
  "laura de souza", "laure monrreal", "laure sauton",
  "laurent giboyeau", "lea mormin", "lena sorbier",
  "leopold bara", "lidgy gaston", "lily le van quang",
  "linda martial", "lionel guy", "lionel lepage",
  "loelia fernandez", "lydia ney", "manon alirol",
  "marie akoka", "marie aubert", "marie france michel",
  "marie giustinati", "marin graviou", "marine chaillan",
  "marine foreau", "maroua gaber", "mathieu gillier",
  "mathilde vallet", "max garnier", "maximilien denoyelle",
  "medy vallade", "melody moutama", "michaele chenard",
  "micheline mona", "mona audisio", "muriel erdual",
  "nadia charlery", "nadine palix", "naima gervinet",
  "nicolas babilon", "nicolas sainville", "noemie certain",
  "noemie noyon", "olivier helie", "ophelie gelber",
  "pascal belfan", "pascal catayee", "pascale bouquiere",
  "pascale fenouillet", "pauline cabidoche",
  "pauline cacciaguerra", "peggy marcatel", "pepita merret",
  "philippe lamartiniere", "philippe nijean",
  "pierre andre noel", "pierre assenat", "priska celeste",
  "raphael aknin", "rodrigue villeronce",
  "roger marie joseph", "roxane carcreff", "rudy rabau",
  "satinem bazit", "sebastien ithurbide", "shanna gamiette",
  "stephane leray", "stephane rhinan", "sylvain scheubel",
  "sylvanie louisy daniel", "sylviane rano", "sylvie greco",
  "theo bayssette", "thibaud steinle",
  "thibaut bonifassi mougeolle", "thomas gastinel",
  "thomas pilon", "tristan rodriguez", "valentin da camara",
  "valerie farthouat", "vanessa fourgeaud",
  "veronique zuber", "vincent breau", "vladimir houbart",
  "wilde rome", "will yann bellame", "yaniss sainte rose",
  "yann ricordeau", "yann riffard", "yasmina sinseau",
  "yohan richard", "yorick bettaver"
];

// ── Helpers ─────────────────────────────────────────────────

function normalizeName(input) {
  return (input || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // retire accents combinants
    .replace(/-/g, " ")               // tirets → espaces
    .replace(/\s+/g, " ");            // compresse espaces multiples
}

function validateName(input) {
  const n = normalizeName(input);
  // Accès externe : identifiant "public" (un seul mot autorisé uniquement pour lui)
  if (n === PUBLIC_ID) return true;
  // Équipe production : exige au moins un espace (prénom + nom)
  if (!n.includes(" ")) return false;
  return VALID_NAMES.includes(n);
}

function validatePassword(input) {
  return input === PASSWORD;
}

function checkAuth() {
  // Si auth désactivée : tout le monde est autorisé
  if (window.AUTH_ENABLED === false) return true;
  return sessionStorage.getItem("bandi_auth") === "ok";
}

function logout() {
  // Si auth désactivée : bouton masqué dans l'UI, mais au cas où
  if (window.AUTH_ENABLED === false) return;
  sessionStorage.removeItem("bandi_auth");
  window.location.href = "login.html";
}

// ── Handler login ───────────────────────────────────────────
function handleLogin(event) {
  if (event) event.preventDefault();

  // Si auth désactivée : bypass direct vers le dashboard
  if (window.AUTH_ENABLED === false) {
    window.location.href = "index.html";
    return;
  }

  const nameEl = document.getElementById("nameInput");
  const pwdEl  = document.getElementById("passwordInput");
  const errEl  = document.getElementById("loginError");
  const form   = document.getElementById("loginForm");

  const name = nameEl ? nameEl.value : "";
  const pwd  = pwdEl  ? pwdEl.value  : "";

  if (validateName(name) && validatePassword(pwd)) {
    sessionStorage.setItem("bandi_auth", "ok");
    window.location.href = "index.html";
    return;
  }

  // Échec — message générique (pas de hint)
  if (errEl) {
    errEl.textContent = "Identifiants incorrects ou nom non reconnu dans la liste de production.";
    errEl.classList.add("visible");
  }
  // Shake animation
  if (form) {
    form.classList.remove("shake");
    void form.offsetWidth; // reflow force
    form.classList.add("shake");
  }
  // Reset password pour retry rapide
  if (pwdEl) { pwdEl.value = ""; pwdEl.focus(); }
}
