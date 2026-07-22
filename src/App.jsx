import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { BERGER_IMG } from "./bergerImage";
import { LOGO_VH } from "./logoVH";

/* ============================================================================
   GESTION DES GEM — Étape 2 : Tribus, Départements, GEM, Membres
   ============================================================================ */

const TEAL_950 = "#0D5C52", TEAL_900 = "#116A5F", TEAL_850 = "#14776B";
const TEAL_800 = "#188478", TEAL_700 = "#1F9C8D", TEAL_600 = "#27B3A1";
const GOLD = "#E0BE2C", GOLD_LIGHT = "#F5DD5C", CREAM = "#FFFFFF";
const RED_LIGHT = "#FF7A88";

// Filet de sécurité : si un bug imprévu survient n'importe où dans l'application,
// on affiche un message clair avec un bouton pour recharger, plutôt qu'un écran blanc.
// Styles globaux : transitions douces et effets de survol, injectés une seule fois.
function StylesGlobaux() {
  return (
    <style>{`
      .btn-app { transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
      .btn-app:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
      .btn-app:active:not(:disabled) { transform: translateY(0); filter: brightness(0.95); }
      .btn-app:disabled { opacity: 0.6; cursor: not-allowed; }
      .card-app { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
      .card-app:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.25); }
      .fade-in { animation: fadeInApp 0.22s ease; }
      .barre-graphique { transition: opacity 0.15s ease; }
      .barre-graphique:hover { opacity: 0.75; }
      @keyframes fadeInApp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes tourner { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spinner-app { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(232,202,74,0.3); border-top-color: #E8CA4A; border-radius: 50%; animation: tourner 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
      @keyframes chuteConfetti {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(600deg); opacity: 0.3; }
      }
      .transition-page { animation: fadeInApp 0.28s ease; }
      input, select, textarea { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
      input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 2px rgba(208,175,28,0.4); }

      .nav-bureau { display: flex; gap: 8px; flex-wrap: wrap; }
      .bouton-hamburger { display: none; }
      @media (max-width: 860px) {
        .nav-bureau { display: none !important; }
        .bouton-hamburger { display: flex !important; }
      }

      @media print {
        body, #root { background: #fff !important; }
        * { color: #111 !important; background-color: #fff !important; box-shadow: none !important; text-shadow: none !important; }
        nav, .no-print, button, input[type="file"], .btn-app { display: none !important; }
        [style*="position: fixed"] { display: none !important; }
        div, section, article { border-color: #ccc !important; page-break-inside: avoid; }
        h1, h2, p, span, td, th { color: #111 !important; }
        a { color: #111 !important; text-decoration: none !important; }
      }
    `}</style>
  );
}

// Indicateur de chargement animé, réutilisé partout dans l'application.
function Chargement({ texte = "Chargement…" }) {
  return (
    <p style={{ color: "#a9d6cf", display: "flex", alignItems: "center" }}>
      <span className="spinner-app" />
      {texte}
    </p>
  );
}

// Affiche un nombre en comptant progressivement jusqu'à sa valeur finale — donne du dynamisme
// aux chiffres clés (tableau de bord, classements) sans surcharger l'interface.
const MOIS_NOMS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const ANNEE_FICTIVE_ANNIVERSAIRE = 2000; // année bissextile neutre, jamais affichée — seuls jour et mois comptent

// Sélecteur de date de naissance sans année — beaucoup de membres ne souhaitent pas
// communiquer leur année de naissance. On stocke quand même une date complète en base
// (avec une année fictive fixe), mais seuls le jour et le mois sont demandés et affichés.
function SelecteurJourMois({ value, onChange, style }) {
  function extraireJourMois(v) {
    if (!v) return { jour: "", mois: "" };
    const parties = v.split("-");
    if (parties.length === 3) return { mois: String(Number(parties[1])), jour: String(Number(parties[2])) };
    return { jour: "", mois: "" };
  }

  const [jour, setJour] = useState(() => extraireJourMois(value).jour);
  const [mois, setMois] = useState(() => extraireJourMois(value).mois);

  // Si la valeur externe change (ex : chargement d'une fiche différente), on resynchronise.
  useEffect(() => {
    const extrait = extraireJourMois(value);
    setJour(extrait.jour);
    setMois(extrait.mois);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emettreChangement(nouveauJour, nouveauMois) {
    setJour(nouveauJour);
    setMois(nouveauMois);
    if (!nouveauJour || !nouveauMois) { onChange(""); return; }
    const jj = String(nouveauJour).padStart(2, "0");
    const mm = String(nouveauMois).padStart(2, "0");
    onChange(`${ANNEE_FICTIVE_ANNIVERSAIRE}-${mm}-${jj}`);
  }

  const joursDuMois = mois ? new Date(ANNEE_FICTIVE_ANNIVERSAIRE, Number(mois), 0).getDate() : 31;

  return (
    <div style={{ display: "flex", gap: 8, ...style }}>
      <select
        value={jour}
        onChange={e => emettreChangement(e.target.value, mois)}
        style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
      >
        <option value="">Jour</option>
        {Array.from({ length: joursDuMois }, (_, i) => i + 1).map(j => <option key={j} value={j}>{j}</option>)}
      </select>
      <select
        value={mois}
        onChange={e => emettreChangement(jour, e.target.value)}
        style={{ flex: 2, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
      >
        <option value="">Mois</option>
        {MOIS_NOMS.map((nom, i) => <option key={i} value={i + 1}>{nom}</option>)}
      </select>
    </div>
  );
}


function NombreAnime({ valeur, suffixe = "" }) {
  const [affiche, setAffiche] = useState(0);
  const cibleValide = typeof valeur === "number" && !isNaN(valeur) ? valeur : 0;

  useEffect(() => {
    let debut = null;
    const duree = 700;
    const depart = 0;
    function etape(horodatage) {
      if (!debut) debut = horodatage;
      const progres = Math.min((horodatage - debut) / duree, 1);
      const progresAdouci = 1 - Math.pow(1 - progres, 3); // easing "ease-out"
      setAffiche(Math.round(depart + (cibleValide - depart) * progresAdouci));
      if (progres < 1) requestAnimationFrame(etape);
    }
    const id = requestAnimationFrame(etape);
    return () => cancelAnimationFrame(id);
  }, [cibleValide]);

  return <>{affiche}{suffixe}</>;
}

// Petite pluie de confettis pour célébrer un moment fort (nouveau converti intégré,
// GEM primé...). Se déclenche une fois puis disparaît d'elle-même.
function Confettis({ actif, onFin }) {
  const couleurs = ["#D0AF1C", "#E8CA4A", "#27B3A1", "#6fcf97", "#e2626d"];
  const morceaux = React.useMemo(() => (
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      gauche: Math.random() * 100,
      delai: Math.random() * 0.4,
      duree: 2 + Math.random() * 1.2,
      couleur: couleurs[i % couleurs.length],
      taille: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
    }))
  ), [actif]);

  useEffect(() => {
    if (!actif) return;
    const t = setTimeout(() => { if (onFin) onFin(); }, 3200);
    return () => clearTimeout(t);
  }, [actif]);

  if (!actif) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 3000, overflow: "hidden" }}>
      {morceaux.map(m => (
        <span
          key={m.id}
          style={{
            position: "absolute", top: -20, left: `${m.gauche}%`, width: m.taille, height: m.taille * 0.4,
            backgroundColor: m.couleur, borderRadius: 2,
            animation: `chuteConfetti ${m.duree}s ease-in ${m.delai}s forwards`,
            transform: `rotate(${m.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// Boîte de dialogue pour demander la suppression d'un membre — motif obligatoire,
// la suppression réelle n'a lieu qu'après validation par le pasteur ou un assistant.
function BoiteDemandeSuppression({ nomMembre, onEnvoyer, onAnnuler }) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");

  function valider() {
    if (!motif.trim()) { setErreur("Le motif est obligatoire."); return; }
    onEnvoyer(motif.trim());
  }

  return (
    <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,20,18,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ backgroundColor: "#14776B", border: "1px solid #1F9C8D", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
        <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, color: "#FFFFFF" }}>Demander la suppression de {nomMembre}</p>
        <p style={{ fontSize: 13, color: "#cdeae4", marginBottom: 14, lineHeight: 1.5 }}>
          Cette suppression sera soumise au pasteur et aux assistants pour validation — le membre ne sera pas retiré immédiatement.
        </p>
        <textarea
          value={motif}
          onChange={e => { setMotif(e.target.value); setErreur(""); }}
          rows={3}
          placeholder="Motif de la suppression (obligatoire)..."
          style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: "#116A5F", color: "#FFFFFF", border: "1px solid #27B3A1", resize: "vertical", fontSize: 13 }}
        />
        {erreur && <p style={{ color: "#e2626d", fontSize: 12, marginTop: 6 }}>{erreur}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn-app" onClick={onAnnuler} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: "transparent", color: "#cdeae4", border: "1px solid #27B3A1", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button className="btn-app" onClick={valider} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: "#e2626d", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
            Envoyer la demande
          </button>
        </div>
      </div>
    </div>
  );
}

// Boîte de dialogue de confirmation personnalisée — remplace les popups natives du navigateur.
function BoiteConfirmation({ titre, message, texteConfirmer, dangereux, onConfirmer, onAnnuler }) {
  return (
    <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,20,18,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ backgroundColor: "#14776B", border: "1px solid #1F9C8D", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
        <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, color: "#FFFFFF" }}>{titre}</p>
        <p style={{ fontSize: 13, color: "#cdeae4", marginBottom: 22, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
 className="btn-app"
 onClick={onAnnuler} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: "transparent", color: "#cdeae4", border: "1px solid #27B3A1", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button
 className="btn-app"
 onClick={onConfirmer} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: dangereux ? "#e2626d" : "#D0AF1C", color: dangereux ? "#fff" : "#0D5C52", border: "none", fontWeight: 700, cursor: "pointer" }}>
            {texteConfirmer}
          </button>
        </div>
      </div>
    </div>
  );
}

// Système de notifications discrètes (toasts), pour remplacer les alertes natives du navigateur.
// Utilisable depuis n'importe quel composant via toast("message", "succes"|"erreur"|"info").
function toast(message, type = "info") {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type } }));
}

function ConteneurToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function surToast(e) {
      const id = Date.now() + Math.random();
      setToasts(t => [...t, { id, ...e.detail }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
    }
    window.addEventListener("app-toast", surToast);
    return () => window.removeEventListener("app-toast", surToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, left: 20, zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            padding: "14px 18px", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, lineHeight: 1.4,
            maxWidth: 360, boxShadow: "0 10px 25px rgba(0,0,0,0.35)", pointerEvents: "auto",
            backgroundColor: t.type === "erreur" ? "#e2626d" : t.type === "succes" ? "#1F9C8D" : "#116A5F",
            border: `1px solid ${t.type === "erreur" ? "#e2626d" : "#27B3A1"}`,
          }}
        >
          {t.type === "erreur" ? "⚠️ " : t.type === "succes" ? "✓ " : ""}{t.message}
        </div>
      ))}
    </div>
  );
}

class LimiteErreurs extends React.Component {
  constructor(props) { super(props); this.state = { erreur: null }; }
  static getDerivedStateFromError(erreur) { return { erreur }; }
  componentDidCatch(erreur, info) { console.error("Erreur applicative :", erreur, info); }
  render() {
    if (this.state.erreur) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: TEAL_950, color: CREAM, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Une erreur inattendue est survenue</p>
          <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20, maxWidth: 400 }}>Aucune donnée n'a été perdue. Recharge la page pour continuer.</p>
          <button
 className="btn-app"
 onClick={() => window.location.reload()} style={{ padding: "10px 20px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Écran de verrouillage : redemande le mot de passe sans déconnecter réellement,
// pour protéger l'accès si le téléphone est repris par quelqu'un d'autre.
function EcranVerrouillage({ compte, onDeverrouille }) {
  const [motDePasse, setMotDePasse] = useState("");
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  function emailTechnique(tel) {
    return `${(tel || "").replace(/[^\d]/g, "")}@gestiongem.com`;
  }

  async function deverrouiller() {
    if (!motDePasse) { setErreur("Merci de saisir ton mot de passe."); return; }
    setErreur(""); setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailTechnique(compte.telephone), password: motDePasse });
    setChargement(false);
    if (error) { setErreur("Mot de passe incorrect."); return; }
    onDeverrouille();
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
  }

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        backgroundImage: `linear-gradient(180deg, rgba(13,92,82,0.55) 0%, rgba(13,92,82,0.92) 100%), url(${BERGER_IMG})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, backgroundColor: "rgba(17,106,95,0.92)", backdropFilter: "blur(6px)", border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>🔒</p>
        <h1 style={{ color: CREAM, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Application verrouillée</h1>
        <p style={{ color: "#cdeae4", fontSize: 13, marginBottom: 20 }}>Bienvenue {compte.nom}, ressaisis ton mot de passe pour continuer.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <input
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
            onKeyDown={e => e.key === "Enter" && deverrouiller()}
            type={motDePasseVisible ? "text" : "password"}
            placeholder="Mot de passe"
            autoFocus
            style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cdeae4", cursor: "pointer" }}>
            <input type="checkbox" checked={motDePasseVisible} onChange={e => setMotDePasseVisible(e.target.checked)} />
            Afficher le mot de passe
          </label>
          {erreur && <p style={{ color: "#e2626d", fontSize: 12 }}>{erreur}</p>}
          <button className="btn-app" disabled={chargement} onClick={deverrouiller} style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, color: TEAL_950, border: "none", cursor: "pointer" }}>
            {chargement ? "…" : "Déverrouiller"}
          </button>
          <button className="btn-app" onClick={seDeconnecter} style={{ padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 12, backgroundColor: "transparent", color: "#a9d6cf", border: "none", cursor: "pointer" }}>
            Ce n'est pas moi — Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [compte, setCompte] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) chargerCompte(session.user.id);
      else setChargement(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Une connexion explicite et réussie ne doit jamais déclencher le verrouillage
      // juste après — on marque l'activité comme "maintenant" avant toute vérification.
      if (event === "SIGNED_IN") {
        try { localStorage.setItem("gem_derniere_activite", String(Date.now())); } catch {}
      }
      setSession(session);
      if (session) chargerCompte(session.user.id);
      else { setCompte(null); setChargement(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function chargerCompte(userId) {
    const { data, error } = await supabase.from("comptes").select("*").eq("user_id", userId).single();
    if (!error) setCompte(data);
    setChargement(false);
  }

  // Déconnexion automatique après 30 minutes d'inactivité — utile sur un ordinateur partagé.
  useEffect(() => {
    if (!session) return;
    const DELAI_MS = 30 * 60 * 1000;
    let dernierMouvement = Date.now();
    const surActivite = () => { dernierMouvement = Date.now(); };
    const evenements = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    evenements.forEach(ev => window.addEventListener(ev, surActivite));
    const intervalle = setInterval(() => {
      if (Date.now() - dernierMouvement > DELAI_MS) {
        toast("Tu as été déconnecté(e) après 30 minutes d'inactivité, pour protéger ton compte.", "info");
        supabase.auth.signOut();
      }
    }, 60 * 1000);
    return () => {
      evenements.forEach(ev => window.removeEventListener(ev, surActivite));
      clearInterval(intervalle);
    };
  }, [session]);

  // Verrouillage de l'application : si l'appli est restée hors d'usage plus de 5 minutes
  // (fermée, mise en arrière-plan sur le téléphone...), on redemande le mot de passe avant
  // de laisser accéder aux données — même si la session technique reste valide.
  // Plusieurs vérifications redondantes sont utilisées car les navigateurs mobiles ne
  // signalent pas toujours de façon fiable le retour au premier plan d'une application.
  const [verrouille, setVerrouille] = useState(false);
  const DELAI_VERROUILLAGE_MS = 5 * 60 * 1000;

  function enregistrerDerniereActivite() {
    try { localStorage.setItem("gem_derniere_activite", String(Date.now())); } catch {}
  }

  function verifierVerrouillage() {
    try {
      const derniere = Number(localStorage.getItem("gem_derniere_activite") || 0);
      if (derniere && Date.now() - derniere > DELAI_VERROUILLAGE_MS) setVerrouille(true);
    } catch {}
  }

  useEffect(() => {
    if (!session) return;
    verifierVerrouillage();
    enregistrerDerniereActivite();

    const evenementsActivite = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    evenementsActivite.forEach(ev => window.addEventListener(ev, enregistrerDerniereActivite));

    // Vérification périodique indépendante de la visibilité — filet de sécurité
    // au cas où l'événement de retour au premier plan ne se déclenche pas.
    const intervalle = setInterval(verifierVerrouillage, 20000);

    function surRetourAuPremierPlan() {
      if (document.visibilityState === "visible") verifierVerrouillage();
    }
    document.addEventListener("visibilitychange", surRetourAuPremierPlan);
    window.addEventListener("focus", verifierVerrouillage);
    window.addEventListener("pageshow", verifierVerrouillage);

    return () => {
      evenementsActivite.forEach(ev => window.removeEventListener(ev, enregistrerDerniereActivite));
      clearInterval(intervalle);
      document.removeEventListener("visibilitychange", surRetourAuPremierPlan);
      window.removeEventListener("focus", verifierVerrouillage);
      window.removeEventListener("pageshow", verifierVerrouillage);
    };
    // Volontairement basé sur la présence d'une session (booléen), pas sur l'objet session
    // lui-même : celui-ci change de référence à chaque rafraîchissement technique automatique
    // du jeton (toutes les heures environ), ce qui relançait injustement cette vérification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!session]);

  if (chargement) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: TEAL_950, color: CREAM }}>
        Chargement…
      </div>
    );
  }

  if (!session || !compte) return <EcranConnexion />;

  if (verrouille) return <EcranVerrouillage compte={compte} onDeverrouille={() => { setVerrouille(false); enregistrerDerniereActivite(); }} />;

  return <TableauDeBord compte={compte} />;
}

export default function AppAvecProtection() {
  return (
    <LimiteErreurs>
      <StylesGlobaux />
      <ConteneurToasts />
      <App />
    </LimiteErreurs>
  );
}

/* --------------------------- Écran de connexion --------------------------- */

function EcranConnexion() {
  const [mode, setMode] = useState("connexion");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const [motDePasseOublieOuvert, setMotDePasseOublieOuvert] = useState(false);
  const [telephoneOubli, setTelephoneOubli] = useState("");
  const [messageOubli, setMessageOubli] = useState("");
  const [envoiOubliEnCours, setEnvoiOubliEnCours] = useState(false);

  const [tribus, setTribus] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [roleDemande, setRoleDemande] = useState("gem");
  const [parentType, setParentType] = useState("tribu");
  const [tribuId, setTribuId] = useState("");
  const [departementId, setDepartementId] = useState("");
  const [nomGem, setNomGem] = useState("");

  useEffect(() => {
    supabase.from("tribus").select("*").order("nom").then(({ data }) => {
      setTribus(data || []);
      if (data && data.length > 0) setTribuId(data[0].id);
    });
    supabase.from("departements").select("*").order("nom").then(({ data }) => {
      setDepartements(data || []);
      if (data && data.length > 0) setDepartementId(data[0].id);
    });
  }, []);

  function emailTechnique(tel) {
    return `${tel.replace(/[^\d]/g, "")}@gestiongem.com`;
  }

  async function seConnecter() {
    setErreur(""); setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailTechnique(telephone), password: motDePasse });
    if (error) setErreur("Identifiant ou mot de passe incorrect.");
    setChargement(false);
  }

  async function sInscrire() {
    setErreur(""); setChargement(true);
    if (motDePasse.length < 8) { setErreur("Le mot de passe doit contenir au moins 8 caractères."); setChargement(false); return; }
    if (roleDemande === "gem" && !nomGem.trim()) { setErreur("Merci de donner un nom au GEM souhaité."); setChargement(false); return; }

    // Empêche la création d'un compte en double si ce numéro est déjà inscrit.
    // Vérification faite via une fonction sécurisée (la personne n'est pas encore
    // connectée à ce stade, une requête directe serait bloquée par la sécurité).
    try {
      const { data: verifDoublon } = await supabase.functions.invoke("lookup-phone", { body: { telephone: telephone.trim() } });
      if (verifDoublon?.compte_id) {
        setErreur("Ce numéro est déjà inscrit. Connecte-toi plutôt avec ton mot de passe, ou utilise \"Mot de passe oublié\" si besoin.");
        setChargement(false);
        return;
      }
    } catch { /* si la fonction est indisponible, on laisse l'inscription se poursuivre normalement */ }

    const { data, error } = await supabase.auth.signUp({ email: emailTechnique(telephone), password: motDePasse });
    if (error) { setErreur(error.message); setChargement(false); return; }

    const { data: nouveauCompte, error: erreurCompte } = await supabase.from("comptes").insert({ user_id: data.user.id, nom, telephone, role: null, assistant: false }).select().single();
    if (erreurCompte) { setErreur(erreurCompte.message); setChargement(false); return; }

    const payload = {
      compte_id: nouveauCompte.id,
      role_demande: roleDemande,
      statut: "attente",
      tribu_id: roleDemande === "tribu_resp" ? tribuId : (roleDemande === "gem" && parentType === "tribu" ? tribuId : null),
      departement_id: roleDemande === "departement_resp" ? departementId : (roleDemande === "gem" && parentType === "departement" ? departementId : null),
      gem_nom_demande: roleDemande === "gem" ? nomGem.trim() : null,
    };
    await supabase.from("assignations").insert(payload);
    setChargement(false);
    toast("✓ Inscription réussie ! Ta demande a bien été envoyée — elle est en attente de validation par le pasteur ou un assistant. Tu pourras utiliser l'application dès qu'elle sera validée.", "succes");
  }

  function chiffresSeuls(tel) {
    return (tel || "").replace(/[^\d]/g, "");
  }

  async function envoyerDemandeOubli() {
    setMessageOubli("");
    if (!telephoneOubli.trim()) { setMessageOubli("Merci de saisir ton numéro de téléphone."); return; }
    setEnvoiOubliEnCours(true);
    // Enregistre une demande visible par le pasteur — l'app n'a pas de système d'e-mail,
    // la réinitialisation se fait manuellement par le pasteur ou un assistant désigné.
    // La recherche du compte correspondant se fait côté serveur (fonction sécurisée) :
    // le navigateur ne reçoit jamais la liste des comptes, seulement le résultat.
    let compteId = null;
    try {
      const { data } = await supabase.functions.invoke("lookup-phone", { body: { telephone: telephoneOubli.trim() } });
      compteId = data?.compte_id || null;
    } catch { /* si la fonction est indisponible, on enregistre quand même la demande sans lien de compte */ }
    await supabase.from("demandes_mot_de_passe").insert({
      telephone: telephoneOubli.trim(),
      compte_id: compteId,
      statut: "attente",
    });
    setEnvoiOubliEnCours(false);
    setMessageOubli("Ta demande a bien été transmise. Le Pasteur Dimitri Koffi, ou un assistant désigné, va te recontacter pour réinitialiser ton mot de passe.");
  }

  const inputPasswordStyle = { flex: 1, padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}`, width: "100%" };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        backgroundImage: `linear-gradient(180deg, rgba(13,92,82,0.55) 0%, rgba(13,92,82,0.92) 100%), url(${BERGER_IMG})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: mode === "inscription" ? 420 : 380, maxHeight: "92vh", overflowY: "auto", backgroundColor: "rgba(17,106,95,0.92)", backdropFilter: "blur(6px)", border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img src={LOGO_VH} alt="Vases d'Honneur" style={{ height: 72, width: "auto" }} />
        </div>
        <h1 style={{ color: CREAM, fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>Gestion des GEM</h1>
        <p style={{ color: "#cdeae4", fontSize: 13, marginBottom: 20, textAlign: "center" }}>Assemblée RENAISSANCE -Bouaflé</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
 className="btn-app"
 onClick={() => { setMode("connexion"); setMotDePasseOublieOuvert(false); if (telephone === "+225 ") setTelephone(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "connexion" ? TEAL_700 : "transparent", color: mode === "connexion" ? GOLD_LIGHT : "#cdeae4", border: `1px solid ${TEAL_600}` }}>Se connecter</button>
          <button
 className="btn-app"
 onClick={() => { setMode("inscription"); setMotDePasseOublieOuvert(false); if (!telephone.trim()) setTelephone("+225 "); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "inscription" ? TEAL_700 : "transparent", color: mode === "inscription" ? GOLD_LIGHT : "#cdeae4", border: `1px solid ${TEAL_600}` }}>Inscription</button>
        </div>

        {mode === "connexion" && motDePasseOublieOuvert ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ color: CREAM, fontWeight: 700, fontSize: 14 }}>Mot de passe oublié</p>
            <p style={{ color: "#cdeae4", fontSize: 12, lineHeight: 1.4 }}>
              L'application n'envoie pas d'e-mail. Indique ton numéro de téléphone : ta demande sera transmise au pasteur pour réinitialiser ton mot de passe.
            </p>
            <input value={telephoneOubli} onChange={e => setTelephoneOubli(e.target.value)} placeholder="Ton numéro de téléphone" type="tel" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
            {messageOubli && <p style={{ color: messageOubli.startsWith("Ta demande") ? GOLD_LIGHT : RED_LIGHT, fontSize: 12 }}>{messageOubli}</p>}
            <button disabled={envoiOubliEnCours} onClick={envoyerDemandeOubli} style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, color: TEAL_950, border: "none", cursor: "pointer" }}>
              {envoiOubliEnCours ? "…" : "Envoyer la demande"}
            </button>
            <button
 className="btn-app"
 onClick={() => { setMotDePasseOublieOuvert(false); setMessageOubli(""); }} style={{ padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: "transparent", color: "#cdeae4", border: "none", cursor: "pointer" }}>
              ← Retour à la connexion
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "inscription" && (
              <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
            )}
            <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" type="tel" autoComplete="tel" name="telephone" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />

            <input
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              placeholder="Mot de passe (8 car. min.)"
              type={motDePasseVisible ? "text" : "password"}
              autoComplete={mode === "inscription" ? "new-password" : "current-password"}
              name="mot-de-passe"
              style={inputPasswordStyle}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cdeae4", cursor: "pointer", marginTop: -4 }}>
              <input type="checkbox" checked={motDePasseVisible} onChange={e => setMotDePasseVisible(e.target.checked)} />
              Afficher le mot de passe
            </label>

            {mode === "connexion" && (
              <button
 className="btn-app"
 onClick={() => { setMotDePasseOublieOuvert(true); setMessageOubli(""); setTelephoneOubli(telephone); }} style={{ alignSelf: "flex-end", background: "none", border: "none", color: GOLD_LIGHT, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: -4 }}>
                Mot de passe oublié ?
              </button>
            )}

            {mode === "inscription" && (
              <>
                <p style={{ color: CREAM, fontWeight: 700, fontSize: 14, marginTop: 8 }}>Quelle responsabilité occupes-tu ?</p>
                <SelecteurRole
                  roleDemande={roleDemande} setRoleDemande={setRoleDemande}
                  parentType={parentType} setParentType={setParentType}
                  tribuId={tribuId} setTribuId={setTribuId}
                  departementId={departementId} setDepartementId={setDepartementId}
                  nomGem={nomGem} setNomGem={setNomGem}
                  tribus={tribus} departements={departements}
                />
              </>
            )}

            {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
            <button disabled={chargement} onClick={mode === "connexion" ? seConnecter : sInscrire} style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, color: TEAL_950, border: "none", cursor: "pointer" }}>
              {chargement ? "…" : mode === "connexion" ? "Accéder à mon espace" : "Créer mon compte"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Tableau de bord ----------------------------- */

function TableauDeBord({ compte }) {
  const [page, setPage] = useState("dashboard");
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [gemOuvert, setGemOuvert] = useState(null);
  const [parentOuvert, setParentOuvert] = useState(null); // { item, type } - vue d'ensemble d'une tribu/département

  // Rattache la touche "retour" du téléphone à la navigation interne de l'appli,
  // au lieu de la quitter directement. Fonctionne sans avoir à modifier chaque bouton.
  const pileNavigationInterne = useRef([]);
  const dernierEtatConnu = useRef({ page: "dashboard", gemOuvert: null, parentOuvert: null });
  const retourEnCours = useRef(false);
  const premierRenduNavigation = useRef(true);

  useEffect(() => {
    const etatActuel = { page, gemOuvert, parentOuvert };
    if (premierRenduNavigation.current) {
      premierRenduNavigation.current = false;
      dernierEtatConnu.current = etatActuel;
      return;
    }
    if (retourEnCours.current) {
      retourEnCours.current = false;
      dernierEtatConnu.current = etatActuel;
      return;
    }
    pileNavigationInterne.current.push(dernierEtatConnu.current);
    dernierEtatConnu.current = etatActuel;
    try { window.history.pushState({ appInterne: true }, ""); } catch {}
  }, [page, gemOuvert, parentOuvert]);

  useEffect(() => {
    function surRetourArriere() {
      if (pileNavigationInterne.current.length > 0) {
        const precedent = pileNavigationInterne.current.pop();
        retourEnCours.current = true;
        setPage(precedent.page);
        setGemOuvert(precedent.gemOuvert);
        setParentOuvert(precedent.parentOuvert);
        dernierEtatConnu.current = precedent;
        try { window.history.pushState({ appInterne: true }, ""); } catch {}
      }
      // Si la pile est vide, on laisse le comportement naturel du navigateur
      // (quitter l'application), puisqu'il n'y a plus rien à afficher avant.
    }
    window.addEventListener("popstate", surRetourArriere);
    return () => window.removeEventListener("popstate", surRetourArriere);
  }, []);

  const [tribus, setTribus] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [gems, setGems] = useState([]);
  const [mesAssignations, setMesAssignations] = useState([]);
  const [nbDemandesAttente, setNbDemandesAttente] = useState(0);
  const [nbDemandesMdp, setNbDemandesMdp] = useState(0);
  const [nbDemandesSuppression, setNbDemandesSuppression] = useState(0);
  const [nbMessagesNonLus, setNbMessagesNonLus] = useState(0);
  const [membres, setMembres] = useState([]);
  const [tousLesComptes, setTousLesComptes] = useState([]);
  const [responsablesParGem, setResponsablesParGem] = useState({});
  const [rapportsPresenceSemaine, setRapportsPresenceSemaine] = useState({ valides: 0, total: 0 });
  const [rapportsActivitesSemaine, setRapportsActivitesSemaine] = useState({ valides: 0, total: 0 });
  const [regulariteParMembre, setRegulariteParMembre] = useState({});
  const [rappelPointageGlobal, setRappelPointageGlobal] = useState(null);
  const [rechercheGlobale, setRechercheGlobale] = useState("");
  const [membreCible, setMembreCible] = useState(null);
  const [chargement, setChargement] = useState(true);

  const estPasteur = compte.role === "pasteur" || compte.assistant === true;
  const aResponsabilitePersonnelle = mesAssignations.some(a => a.statut === "actif");
  const [dernierMessageLu, setDernierMessageLu] = useState(compte.dernier_message_lu || null);
  const [dernierEvenementVu, setDernierEvenementVu] = useState(compte.dernier_evenement_vu || null);
  const [nbNouveauxEvenements, setNbNouveauxEvenements] = useState(0);

  useEffect(() => { chargerDonnees(); }, []);

  useEffect(() => {
    const intervalle = setInterval(() => { rafraichirCompteurs(); }, 20000);
    return () => clearInterval(intervalle);
  }, [dernierMessageLu, dernierEvenementVu, estPasteur]);

  async function rafraichirCompteurs() {
    if (estPasteur) {
      const [{ count: cDemandes }, { count: cMessages }, { count: cMdp }, { count: cSuppression }] = await Promise.all([
        supabase.from("assignations").select("*", { count: "exact", head: true }).eq("statut", "attente"),
        supabase.from("messages_directs").select("*", { count: "exact", head: true }).eq("lu", false),
        supabase.from("demandes_mot_de_passe").select("*", { count: "exact", head: true }).eq("statut", "attente"),
        supabase.from("demandes_suppression_membre").select("*", { count: "exact", head: true }).eq("statut", "attente"),
      ]);
      setNbDemandesAttente(cDemandes || 0);
      setNbMessagesNonLus(cMessages || 0);
      setNbDemandesMdp(cMdp || 0);
      setNbDemandesSuppression(cSuppression || 0);
    } else {
      const seuilMessages = dernierMessageLu || "1970-01-01T00:00:00Z";
      const { count: cDiffusion } = await supabase.from("messages").select("*", { count: "exact", head: true }).gt("date", seuilMessages);
      setNbMessagesNonLus(cDiffusion || 0);
    }
    const seuilEvenements = dernierEvenementVu || "1970-01-01T00:00:00Z";
    const { count: cEvenements } = await supabase.from("evenements").select("*", { count: "exact", head: true }).gt("debut", seuilEvenements).gt("debut", new Date().toISOString());
    setNbNouveauxEvenements(cEvenements || 0);
  }

  async function chargerDonnees() {
    setChargement(true);
    const [{ data: t }, { data: d }, { data: g }, { data: m }, { data: a }] = await Promise.all([
      supabase.from("tribus").select("*").order("nom"),
      supabase.from("departements").select("*").order("nom"),
      supabase.from("gems").select("*").order("nom"),
      supabase.from("membres").select("*").order("nom"),
      supabase.from("assignations").select("*").eq("compte_id", compte.id),
    ]);
    setTribus(t || []); setDepartements(d || []); setGems(g || []); setMembres(m || []); setMesAssignations(a || []);
    if (estPasteur) {
      const { data: tousLesComptes } = await supabase.from("comptes").select("id, nom, role, assistant, telephone, date_naissance, quartier");
      setTousLesComptes(tousLesComptes || []);
      const { data: assignationsGem } = await supabase.from("assignations").select("gem_id, compte_id").eq("role_demande", "gem").eq("statut", "actif");
      const map = {};
      (assignationsGem || []).forEach(as => {
        const c = (tousLesComptes || []).find(cc => cc.id === as.compte_id);
        if (as.gem_id && c) map[as.gem_id] = c.nom;
      });
      setResponsablesParGem(map);

      const { data: dernierDimanche } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(1).maybeSingle();
      if (dernierDimanche && g && g.length > 0) {
        const idsGems = g.map(gg => gg.id);
        const [{ data: validationsPresence }, { data: activitesValidees }] = await Promise.all([
          supabase.from("validations_presence").select("gem_id").eq("dimanche_id", dernierDimanche.id).eq("valide", true).in("gem_id", idsGems),
          supabase.from("activites_semaine").select("gem_id").eq("dimanche_id", dernierDimanche.id).eq("valide", true).in("gem_id", idsGems),
        ]);
        setRapportsPresenceSemaine({ valides: (validationsPresence || []).length, total: g.length });
        setRapportsActivitesSemaine({ valides: (activitesValidees || []).length, total: g.length });
      } else {
        setRapportsPresenceSemaine({ valides: 0, total: g?.length || 0 });
        setRapportsActivitesSemaine({ valides: 0, total: g?.length || 0 });
      }
    }
    await calculerRegularite(m || []);
    verifierPointageManquant(m || []).then(setRappelPointageGlobal);
    await rafraichirCompteurs();
    setChargement(false);
  }

  // Détermine, pour chaque membre, ses absences et présences consécutives sur les 8 derniers dimanches
  // enregistrés (du plus récent au plus ancien). L'absence d'un pointage pour un dimanche passé
  // est considérée comme une absence, exactement comme l'affiche l'écran de pointage.
  async function calculerRegularite(listeMembres) {
    const { data: dimanchesRecents } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(8);
    if (!dimanchesRecents || dimanchesRecents.length === 0) { setRegulariteParMembre({}); return; }
    const idsDimanches = dimanchesRecents.map(d => d.id);
    const { data: presencesRecentes } = await supabase.from("presences").select("*").in("dimanche_id", idsDimanches);

    const map = {};
    listeMembres.forEach(membre => {
      const dateArrivee = membre.created_at ? membre.created_at.slice(0, 10) : null;
      let absencesConsecutives = 0, presencesConsecutives = 0, enCours = true;
      let dimanchesApplicables = 0, dimanchesPresents = 0;
      for (const dim of dimanchesRecents) {
        // Ce dimanche précède (ou coïncide avec) l'arrivée du membre : on n'y était pas encore suivi, on arrête ici.
        if (dateArrivee && dim.date <= dateArrivee) break;
        const pointage = (presencesRecentes || []).find(p => p.membre_id === membre.id && p.dimanche_id === dim.id);
        const present = pointage ? pointage.present : false;
        dimanchesApplicables++;
        if (present) dimanchesPresents++;
        if (enCours) {
          if (present) {
            if (absencesConsecutives > 0) { enCours = false; }
            else presencesConsecutives++;
          } else {
            if (presencesConsecutives > 0) { enCours = false; }
            else absencesConsecutives++;
          }
        }
      }
      const tauxRegularite = dimanchesApplicables > 0 ? Math.round((dimanchesPresents / dimanchesApplicables) * 100) : null;
      map[membre.id] = { absencesConsecutives, presencesConsecutives, tauxRegularite, dimanchesApplicables };
    });
    setRegulariteParMembre(map);
  }


  async function seDeconnecter() { await supabase.auth.signOut(); }

  async function exporterDonneesJSON() {
    const tables = ["tribus", "departements", "gems", "membres", "comptes", "assignations", "presences", "dimanches", "sante_spirituelle", "visites", "messages", "messages_directs", "evenements"];
    const resultat = {};
    for (const table of tables) {
      const { data } = await supabase.from(table).select("*");
      resultat[table] = data || [];
    }
    const blob = new Blob([JSON.stringify(resultat, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gestion-gem-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function allerAuMembre(membre) {
    const gemDuMembre = gems.find(g => g.id === membre.gem_id);
    if (!gemDuMembre) return;
    setGemOuvert(gemDuMembre);
    setMembreCible(membre.id);
    setRechercheGlobale("");
  }

  const resultatsRecherche = rechercheGlobale.trim().length >= 2
    ? membres.filter(m =>
        m.nom.toLowerCase().includes(rechercheGlobale.toLowerCase()) ||
        (m.telephone || "").includes(rechercheGlobale)
      ).slice(0, 6).map(m => ({ type: "membre", data: m }))
    : [];

  const resultatsResponsables = (estPasteur && rechercheGlobale.trim().length >= 2)
    ? tousLesComptes.filter(c =>
        c.nom.toLowerCase().includes(rechercheGlobale.toLowerCase()) ||
        (c.telephone || "").includes(rechercheGlobale)
      ).slice(0, 4).map(c => ({ type: "responsable", data: c }))
    : [];

  const tousLesResultats = [...resultatsRecherche, ...resultatsResponsables];

  function libelleRoleCompte(c) {
    if (c.role === "pasteur") return "Pasteur";
    if (c.assistant) return "Assistant désigné";
    return "Responsable";
  }

  function surClicResultat(resultat) {
    if (resultat.type === "membre") {
      allerAuMembre(resultat.data);
    } else {
      toast(`👤 ${resultat.data.nom} — ${resultat.data.telephone || "téléphone non renseigné"} — ${libelleRoleCompte(resultat.data)}`, "info");
      setRechercheGlobale("");
    }
  }

  function nomGemMembre(membre) {
    return gems.find(g => g.id === membre.gem_id)?.nom || "GEM inconnu";
  }

  const cardStyle = { backgroundColor: TEAL_850, border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 20 };
  const btnStyle = { padding: "10px 18px", borderRadius: 8, fontWeight: 700, fontSize: 17, cursor: "pointer", border: "none" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: TEAL_950, color: CREAM, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${TEAL_800}`, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={LOGO_VH} alt="Vases d'Honneur" style={{ height: 36, width: "auto" }} />
          <div>
            <p style={{ fontSize: 13, color: "#cdeae4", margin: 0 }}>Bienvenue, <b style={{ color: CREAM }}>{compte.nom}</b></p>
            <p style={{ fontSize: 11, color: "#a9d6cf", margin: 0 }}>{compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant désigné" : "Responsable"}</p>
          </div>
        </div>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <input
            value={rechercheGlobale}
            onChange={e => setRechercheGlobale(e.target.value)}
            placeholder="🔍 Rechercher un membre (nom, téléphone)..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 13 }}
          />
          {tousLesResultats.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: TEAL_850, border: `1px solid ${TEAL_600}`, borderRadius: 8, zIndex: 20, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
              {tousLesResultats.map((r, i) => (
                <button
                  key={r.type + r.data.id + i}
                  onClick={() => surClicResultat(r)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", borderBottom: `1px solid ${TEAL_700}`, cursor: "pointer", color: CREAM }}
                >
                  <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
                    {r.data.nom}
                    {r.type === "responsable" && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 7px", marginLeft: 6 }}>
                        👤 {libelleRoleCompte(r.data)}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: "#a9d6cf", margin: 0 }}>
                    {r.type === "membre" ? `${nomGemMembre(r.data)} · ${r.data.telephone}` : (r.data.telephone || "Téléphone non renseigné")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn-app bouton-hamburger"
          onClick={() => setMenuMobileOuvert(true)}
          style={{ alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 10, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 20, flexShrink: 0 }}
        >
          ☰
        </button>
        <div className="nav-bureau">
          {estPasteur ? (
            <>
              {aResponsabilitePersonnelle && (
                <button
 className="btn-app"
 onClick={() => { setPage("mon_espace"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "mon_espace" ? TEAL_700 : "transparent", color: page === "mon_espace" ? GOLD_LIGHT : "#cdeae4" }}>Mon espace</button>
              )}
              {compte.role !== "pasteur" && (
                <button
 className="btn-app"
 onClick={() => { setPage("demande_role_supp"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "demande_role_supp" ? TEAL_700 : "transparent", color: page === "demande_role_supp" ? GOLD_LIGHT : "#cdeae4" }}>➕ Rôle supplémentaire</button>
              )}
              <button
 className="btn-app"
 onClick={() => { setPage("dashboard"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "dashboard" ? TEAL_700 : "transparent", color: page === "dashboard" ? GOLD_LIGHT : "#cdeae4" }}>Tableau de bord</button>
              <button
 className="btn-app"
 onClick={() => { setPage("tribus"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "tribus" ? TEAL_700 : "transparent", color: page === "tribus" ? GOLD_LIGHT : "#cdeae4" }}>Tribus</button>
              <button
 className="btn-app"
 onClick={() => { setPage("departements"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "departements" ? TEAL_700 : "transparent", color: page === "departements" ? GOLD_LIGHT : "#cdeae4" }}>Départements</button>
              <button
 className="btn-app"
 onClick={() => { setPage("demandes"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "demandes" ? TEAL_700 : "transparent", color: page === "demandes" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Demandes
                {nbDemandesAttente > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbDemandesAttente}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("rapports"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "rapports" ? TEAL_700 : "transparent", color: page === "rapports" ? GOLD_LIGHT : "#cdeae4" }}>Rapports</button>
              <button
 className="btn-app"
 onClick={() => { setPage("historique"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "historique" ? TEAL_700 : "transparent", color: page === "historique" ? GOLD_LIGHT : "#cdeae4" }}>Historique</button>
              <button
 className="btn-app"
 onClick={() => { setPage("analyse"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "analyse" ? TEAL_700 : "transparent", color: page === "analyse" ? GOLD_LIGHT : "#cdeae4" }}>🧠 Analyse</button>
              <button
 className="btn-app"
 onClick={() => { setPage("calendrier"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "calendrier" ? TEAL_700 : "transparent", color: page === "calendrier" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Calendrier
                {nbNouveauxEvenements > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbNouveauxEvenements}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("messagerie"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "messagerie" ? TEAL_700 : "transparent", color: page === "messagerie" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Messagerie
                {nbMessagesNonLus > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbMessagesNonLus}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("mots_de_passe"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "mots_de_passe" ? TEAL_700 : "transparent", color: page === "mots_de_passe" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Mots de passe
                {nbDemandesMdp > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbDemandesMdp}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("suppressions"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "suppressions" ? TEAL_700 : "transparent", color: page === "suppressions" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Suppressions
                {nbDemandesSuppression > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbDemandesSuppression}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("corbeille"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "corbeille" ? TEAL_700 : "transparent", color: page === "corbeille" ? GOLD_LIGHT : "#cdeae4" }}>
                🗑️ Corbeille
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("sante_responsables"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "sante_responsables" ? TEAL_700 : "transparent", color: page === "sante_responsables" ? GOLD_LIGHT : "#cdeae4" }}>
                🌡️ Santé responsables
              </button>
              {compte.role === "pasteur" && (
                <button
 className="btn-app"
 onClick={() => { setPage("assistants"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "assistants" ? TEAL_700 : "transparent", color: page === "assistants" ? GOLD_LIGHT : "#cdeae4" }}>Rôles & Accès</button>
              )}
            </>
          ) : (
            <>
              <button
 className="btn-app"
 onClick={() => setPage("dashboard")} style={{ ...btnStyle, backgroundColor: (page !== "messagerie" && page !== "calendrier" && page !== "demande_role_supp") ? TEAL_700 : "transparent", color: (page !== "messagerie" && page !== "calendrier" && page !== "demande_role_supp") ? GOLD_LIGHT : "#cdeae4" }}>Mon espace</button>
              <button
 className="btn-app"
 onClick={() => setPage("demande_role_supp")} style={{ ...btnStyle, backgroundColor: page === "demande_role_supp" ? TEAL_700 : "transparent", color: page === "demande_role_supp" ? GOLD_LIGHT : "#cdeae4" }}>➕ Rôle supplémentaire</button>
              <button
 className="btn-app"
 onClick={() => setPage("calendrier")} style={{ ...btnStyle, backgroundColor: page === "calendrier" ? TEAL_700 : "transparent", color: page === "calendrier" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Calendrier
                {nbNouveauxEvenements > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbNouveauxEvenements}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => setPage("messagerie")} style={{ ...btnStyle, backgroundColor: page === "messagerie" ? TEAL_700 : "transparent", color: page === "messagerie" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Messagerie
                {nbMessagesNonLus > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbMessagesNonLus}
                  </span>
                )}
              </button>
            </>
          )}
          <button
 className="btn-app"
 onClick={() => { setPage("mon_compte"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "mon_compte" ? TEAL_700 : "transparent", color: page === "mon_compte" ? GOLD_LIGHT : "#cdeae4" }}>👤 Mon compte</button>
          <button
 className="btn-app"
 onClick={() => { setPage("aide"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "aide" ? TEAL_700 : "transparent", color: page === "aide" ? GOLD_LIGHT : "#cdeae4" }}>❓ Aide</button>
          <button
 className="btn-app"
 onClick={seDeconnecter} style={{ ...btnStyle, backgroundColor: "transparent", color: "#cdeae4" }}>Déconnexion</button>
        </div>
      </div>

      {menuMobileOuvert && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: TEAL_950, zIndex: 500, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottom: `1px solid ${TEAL_800}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={LOGO_VH} alt="Vases d'Honneur" style={{ height: 30, width: "auto" }} />
              <p style={{ fontWeight: 700, margin: 0 }}>{compte.nom}</p>
            </div>
            <button className="btn-app" onClick={() => setMenuMobileOuvert(false)} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ padding: 20 }}>
            {(() => {
              function allerA(cible) { setPage(cible); setGemOuvert(null); setParentOuvert(null); setMenuMobileOuvert(false); }
              function GroupeMenu({ titre, items }) {
                return (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: GOLD_LIGHT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{titre}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map(it => (
                        <button
                          key={it.cible}
                          className="btn-app"
                          onClick={it.action || (() => allerA(it.cible))}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderRadius: 10, backgroundColor: page === it.cible ? "rgba(208,175,28,0.15)" : TEAL_900, border: `1px solid ${page === it.cible ? GOLD : TEAL_700}`, color: page === it.cible ? GOLD_LIGHT : CREAM, fontWeight: 700, fontSize: 17, cursor: "pointer", textAlign: "left" }}
                        >
                          {it.label}
                          {it.badge > 0 && (
                            <span style={{ backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 13, fontWeight: 700, minWidth: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                              {it.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (estPasteur) {
                const groupeSuivi = [{ label: "Tableau de bord", cible: "dashboard" }];
                if (aResponsabilitePersonnelle) groupeSuivi.push({ label: "Mon espace", cible: "mon_espace" });
                groupeSuivi.push({ label: "Tribus", cible: "tribus" }, { label: "Départements", cible: "departements" });

                const groupeGestion = [
                  { label: "Demandes", cible: "demandes", badge: nbDemandesAttente },
                  { label: "Suppressions", cible: "suppressions", badge: nbDemandesSuppression },
                  { label: "🗑️ Corbeille", cible: "corbeille" },
                  { label: "🌡️ Santé responsables", cible: "sante_responsables" },
                ];
                if (compte.role === "pasteur") groupeGestion.push({ label: "Rôles & Accès", cible: "assistants" });
                if (compte.role !== "pasteur") groupeGestion.push({ label: "➕ Rôle supplémentaire", cible: "demande_role_supp" });

                return (
                  <>
                    <GroupeMenu titre="Suivi" items={groupeSuivi} />
                    <GroupeMenu titre="Rapports" items={[
                      { label: "Rapports", cible: "rapports" },
                      { label: "Historique", cible: "historique" },
                      { label: "🧠 Analyse", cible: "analyse" },
                    ]} />
                    <GroupeMenu titre="Gestion" items={groupeGestion} />
                    <GroupeMenu titre="Communication" items={[
                      { label: "Calendrier", cible: "calendrier", badge: nbNouveauxEvenements },
                      { label: "Messagerie", cible: "messagerie", badge: nbMessagesNonLus },
                      { label: "Mots de passe", cible: "mots_de_passe", badge: nbDemandesMdp },
                    ]} />
                    <GroupeMenu titre="Compte" items={[
                      { label: "👤 Mon compte", cible: "mon_compte" },
                      { label: "❓ Aide", cible: "aide" },
                      { label: "Déconnexion", cible: "deconnexion", action: seDeconnecter },
                    ]} />
                  </>
                );
              }

              return (
                <>
                  <GroupeMenu titre="Mon espace" items={[
                    { label: "Mon espace", cible: "dashboard" },
                    { label: "➕ Rôle supplémentaire", cible: "demande_role_supp" },
                  ]} />
                  <GroupeMenu titre="Communication" items={[
                    { label: "Calendrier", cible: "calendrier", badge: nbNouveauxEvenements },
                    { label: "Messagerie", cible: "messagerie", badge: nbMessagesNonLus },
                  ]} />
                  <GroupeMenu titre="Compte" items={[
                    { label: "👤 Mon compte", cible: "mon_compte" },
                    { label: "❓ Aide", cible: "aide" },
                    { label: "Déconnexion", cible: "deconnexion", action: seDeconnecter },
                  ]} />
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div key={page} className="transition-page" style={{ padding: 24 }}>
        {chargement ? (
          <p style={{ color: "#cdeae4" }}>Chargement des données…</p>
        ) : page === "aide" ? (
          <PageAide estPasteur={estPasteur} cardStyle={cardStyle} />
        ) : page === "mon_compte" ? (
          <PageMonCompte compte={compte} cardStyle={cardStyle} onMisAJour={chargerDonnees} />
        ) : page === "demande_role_supp" ? (
          <DemanderResponsabilite
            compte={compte}
            tribus={tribus}
            departements={departements}
            mesAssignations={mesAssignations}
            onDemandeEnvoyee={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : !estPasteur && !aResponsabilitePersonnelle ? (
          <DemanderResponsabilite
            compte={compte}
            tribus={tribus}
            departements={departements}
            mesAssignations={mesAssignations}
            onDemandeEnvoyee={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : page === "messagerie" ? (
          <PageMessagerie
            compte={compte}
            estPasteur={estPasteur}
            onActionnee={() => {
              if (estPasteur) chargerDonnees();
              else { setDernierMessageLu(new Date().toISOString()); setNbMessagesNonLus(0); }
            }}
            cardStyle={cardStyle}
          />
        ) : page === "calendrier" ? (
          <PageCalendrier
            estPasteur={estPasteur}
            compte={compte}
            onOuverture={() => { setDernierEvenementVu(new Date().toISOString()); setNbNouveauxEvenements(0); }}
            cardStyle={cardStyle}
          />
        ) : page === "mon_espace" ? (
          <MonEspace
            compte={compte}
            assignationsActives={mesAssignations.filter(a => a.statut === "actif")}
            gems={gems}
            membres={membres}
            tribus={tribus}
            departements={departements}
            gemOuvert={gemOuvert}
            setGemOuvert={setGemOuvert}
            onMembreAjoute={chargerDonnees}
            onCreerGem={chargerDonnees}
            regulariteParMembre={regulariteParMembre}
            membreCible={membreCible}
            onMembreCibleConsomme={() => setMembreCible(null)}
            cardStyle={cardStyle}
          />
        ) : !estPasteur ? (
          <MonEspace
            compte={compte}
            assignationsActives={mesAssignations.filter(a => a.statut === "actif")}
            gems={gems}
            membres={membres}
            tribus={tribus}
            departements={departements}
            gemOuvert={gemOuvert}
            setGemOuvert={setGemOuvert}
            onMembreAjoute={chargerDonnees}
            onCreerGem={chargerDonnees}
            regulariteParMembre={regulariteParMembre}
            membreCible={membreCible}
            onMembreCibleConsomme={() => setMembreCible(null)}
            cardStyle={cardStyle}
          />
        ) : gemOuvert ? (
          <DetailGem
            compte={compte}
            gem={gemOuvert}
            membres={membres.filter(m => m.gem_id === gemOuvert.id)}
            onBack={() => setGemOuvert(null)}
            onMembreAjoute={chargerDonnees}
            regulariteParMembre={regulariteParMembre}
            membreCible={membreCible}
            onMembreCibleConsomme={() => setMembreCible(null)}
            cardStyle={cardStyle}
          />
        ) : parentOuvert ? (
          <DetailParent
            compte={compte}
            estPasteur={estPasteur}
            responsablesParGem={responsablesParGem}
            parent={parentOuvert.item}
            type={parentOuvert.type}
            gems={gems}
            membres={membres}
            regulariteParMembre={regulariteParMembre}
            onBack={() => setParentOuvert(null)}
            onChange={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : page === "dashboard" ? (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Tableau de bord</h2>
            <BanniereRappelPointage rappel={rappelPointageGlobal} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>👥</span>
                <div><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={membres.length} /></p></div>
              </div>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>🏠</span>
                <div><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>GEM actifs</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={gems.length} /></p></div>
              </div>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>🏛️</span>
                <div><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Tribus</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={tribus.length} /></p></div>
              </div>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>🏢</span>
                <div><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Départements</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={departements.length} /></p></div>
              </div>
            </div>
            <AnniversairesAVenir membres={membres} gems={gems} cardStyle={cardStyle} />
            <AnniversairesResponsables comptes={tousLesComptes} cardStyle={cardStyle} />

            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📋 Rapports de la semaine en cours</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              <div className="card-app" style={cardStyle}>
                <p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Présence pointée</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: rapportsPresenceSemaine.valides === rapportsPresenceSemaine.total && rapportsPresenceSemaine.total > 0 ? "#6fcf97" : GOLD_LIGHT }}>
                  <NombreAnime valeur={rapportsPresenceSemaine.valides} /> / {rapportsPresenceSemaine.total}
                </p>
                <p style={{ fontSize: 11, color: "#a9d6cf" }}>GEM ayant validé leur présence</p>
              </div>
              <div className="card-app" style={cardStyle}>
                <p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Activités validées</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: rapportsActivitesSemaine.valides === rapportsActivitesSemaine.total && rapportsActivitesSemaine.total > 0 ? "#6fcf97" : GOLD_LIGHT }}>
                  <NombreAnime valeur={rapportsActivitesSemaine.valides} /> / {rapportsActivitesSemaine.total}
                </p>
                <p style={{ fontSize: 11, color: "#a9d6cf" }}>GEM ayant validé leurs activités</p>
              </div>
            </div>
            <PrioritesPastorales membres={membres} gems={gems} regulariteParMembre={regulariteParMembre} cardStyle={cardStyle} />
            <div style={{ marginTop: 24 }}>
              <button
 className="btn-app"
 onClick={exporterDonneesJSON} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                💾 Exporter toutes les données (JSON)
              </button>
              <p style={{ fontSize: 11, color: "#a9d6cf", marginTop: 6 }}>Sauvegarde complète de secours — à faire régulièrement.</p>
            </div>
          </>
        ) : page === "tribus" ? (
          <ListeParents
            titre="Les 12 tribus"
            items={tribus}
            type="tribu"
            gems={gems}
            estPasteur={estPasteur}
            onOpenGem={setGemOuvert}
            onOpenParent={it => setParentOuvert({ item: it, type: "tribu" })}
            onCreerGem={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : page === "departements" ? (
          <ListeParents
            titre="Les 28 départements"
            items={departements}
            type="departement"
            gems={gems}
            estPasteur={estPasteur}
            onOpenGem={setGemOuvert}
            onOpenParent={it => setParentOuvert({ item: it, type: "departement" })}
            onCreerGem={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : page === "demandes" ? (
          <PageDemandes tribus={tribus} departements={departements} compte={compte} onTraite={chargerDonnees} cardStyle={cardStyle} />
        ) : page === "rapports" ? (
          <PageRapports compte={compte} gems={gems} membres={membres} tribus={tribus} departements={departements} cardStyle={cardStyle} />
        ) : page === "historique" ? (
          <PageHistorique cardStyle={cardStyle} />
        ) : page === "analyse" ? (
          <PageAnalyse gems={gems} membres={membres} cardStyle={cardStyle} />
        ) : page === "mots_de_passe" ? (
          <PageMotsDePasse cardStyle={cardStyle} onTraite={rafraichirCompteurs} />
        ) : page === "suppressions" ? (
          <PageSuppressions compte={compte} cardStyle={cardStyle} onTraite={rafraichirCompteurs} />
        ) : page === "corbeille" ? (
          <PageCorbeille compte={compte} gems={gems} cardStyle={cardStyle} onTraite={chargerDonnees} />
        ) : page === "sante_responsables" ? (
          <PageSanteResponsables tousLesComptes={tousLesComptes} gems={gems} tribus={tribus} departements={departements} responsablesParGem={responsablesParGem} cardStyle={cardStyle} />
        ) : (
          <PageAssistants compte={compte} tribus={tribus} departements={departements} gems={gems} onChange={chargerDonnees} cardStyle={cardStyle} />
        )}
      </div>
    </div>
  );
}

/* ------------------------- Priorités pastorales ------------------------- */

/* ------------------------- Anniversaires à venir ------------------------- */

// Résumé pour les responsables de département/tribu : GEM, rapports de la semaine,
// GEM en retard (après lundi), membres, taux de présence/absence.
function ResumePerimetre({ gems, membres, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [rapportsValides, setRapportsValides] = useState(0);
  const [gemsEnRetard, setGemsEnRetard] = useState([]);
  const [tauxPresence, setTauxPresence] = useState(null);
  const [afficherRetard, setAfficherRetard] = useState(false);

  useEffect(() => { chargerResume(); }, [gems.length, membres.length]);

  async function chargerResume() {
    setChargement(true);
    const { data: dernierDimanche } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(1).maybeSingle();
    if (!dernierDimanche || gems.length === 0) { setChargement(false); return; }

    const idsGems = gems.map(g => g.id);
    const [{ data: validations }, { data: presencesSemaine }] = await Promise.all([
      supabase.from("validations_presence").select("gem_id").eq("dimanche_id", dernierDimanche.id).eq("valide", true).in("gem_id", idsGems),
      supabase.from("presences").select("*").eq("dimanche_id", dernierDimanche.id).in("membre_id", membres.map(m => m.id)),
    ]);

    const idsGemsValides = new Set((validations || []).map(v => v.gem_id));
    setRapportsValides(idsGemsValides.size);
    setGemsEnRetard(gems.filter(g => !idsGemsValides.has(g.id)));

    const slots = membres.length;
    const presents = (presencesSemaine || []).filter(p => p.present).length;
    setTauxPresence(slots > 0 ? Math.round((presents / slots) * 100) : null);

    // On ne signale les GEM "en retard" qu'à partir du mardi (le lundi est le dernier
    // jour normal pour soumettre le rapport du dimanche précédent).
    const dateDimanche = new Date(dernierDimanche.date + "T00:00:00");
    const joursEcoules = Math.floor((new Date(new Date().toDateString()) - dateDimanche) / 86400000);
    setAfficherRetard(joursEcoules >= 2);

    setChargement(false);
  }

  if (chargement) return <Chargement />;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>GEM</p>
          <p style={{ fontSize: 24, fontWeight: 700 }}><NombreAnime valeur={gems.length} /></p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Membres</p>
          <p style={{ fontSize: 24, fontWeight: 700 }}><NombreAnime valeur={membres.length} /></p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Rapports (semaine)</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: rapportsValides === gems.length ? "#6fcf97" : GOLD_LIGHT }}>
            <NombreAnime valeur={rapportsValides} /> / {gems.length}
          </p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Présence / Absence</p>
          <p style={{ fontSize: 18, fontWeight: 700 }}>
            {tauxPresence !== null ? <><span style={{ color: "#6fcf97" }}>{tauxPresence}%</span> / <span style={{ color: RED_LIGHT }}>{100 - tauxPresence}%</span></> : "—"}
          </p>
        </div>
      </div>

      {afficherRetard && gemsEnRetard.length > 0 && (
        <div style={{ ...cardStyle, borderColor: RED_LIGHT, marginBottom: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: RED_LIGHT, marginBottom: 8 }}>⚠️ GEM n'ayant pas encore soumis leur rapport ({gemsEnRetard.length})</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {gemsEnRetard.map(g => (
              <span key={g.id} style={{ fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: RED_LIGHT, borderRadius: 999, padding: "4px 10px" }}>{g.nom}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnniversairesAVenir({ membres, gems, cardStyle }) {
  function nomGem(gemId) {
    return gems.find(g => g.id === gemId)?.nom || "GEM inconnu";
  }

  function prochainAnniversaire(dateNaissance) {
    const aujourdHui = new Date(new Date().toDateString());
    const anniv = new Date(dateNaissance);
    anniv.setFullYear(aujourdHui.getFullYear());
    if (anniv < aujourdHui) anniv.setFullYear(aujourdHui.getFullYear() + 1);
    const diffJours = Math.round((anniv - aujourdHui) / 86400000);
    return { date: anniv, diffJours };
  }

  const anniversaires = membres
    .filter(m => m.date_naissance)
    .map(m => ({ membre: m, ...prochainAnniversaire(m.date_naissance) }))
    .filter(x => x.diffJours >= 0 && x.diffJours <= 14)
    .sort((a, b) => a.diffJours - b.diffJours);

  if (anniversaires.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🎂 Anniversaires à venir (14 prochains jours)</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {anniversaires.map(({ membre, date, diffJours }) => (
          <div key={membre.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{membre.nom}</p>
              <p style={{ fontSize: 12, color: "#a9d6cf" }}>{nomGem(membre.gem_id)}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEAL_950, backgroundColor: "#E8CA4A", borderRadius: 999, padding: "6px 12px" }}>
              {diffJours === 0 ? "🎉 Aujourd'hui !" : diffJours === 1 ? "Demain" : `Dans ${diffJours} jours`} — {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnniversairesResponsables({ comptes, cardStyle }) {
  function prochainAnniversaire(dateNaissance) {
    const aujourdHui = new Date(new Date().toDateString());
    const anniv = new Date(dateNaissance);
    anniv.setFullYear(aujourdHui.getFullYear());
    if (anniv < aujourdHui) anniv.setFullYear(aujourdHui.getFullYear() + 1);
    const diffJours = Math.round((anniv - aujourdHui) / 86400000);
    return { date: anniv, diffJours };
  }

  const anniversaires = (comptes || [])
    .filter(c => c.date_naissance)
    .map(c => ({ compte: c, ...prochainAnniversaire(c.date_naissance) }))
    .filter(x => x.diffJours >= 0 && x.diffJours <= 14)
    .sort((a, b) => a.diffJours - b.diffJours);

  if (anniversaires.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🎂 Anniversaires des responsables (14 prochains jours)</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {anniversaires.map(({ compte, date, diffJours }) => (
          <div key={compte.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{compte.nom}</p>
              <p style={{ fontSize: 12, color: "#a9d6cf" }}>{compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant" : "Responsable"} · {compte.quartier || "Quartier non renseigné"}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEAL_950, backgroundColor: "#E8CA4A", borderRadius: 999, padding: "6px 12px" }}>
              {diffJours === 0 ? "🎉 Aujourd'hui !" : diffJours === 1 ? "Demain" : `Dans ${diffJours} jours`} — {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pagination réutilisable — page précédente / suivante, avec indicateur.
function Pagination({ page, setPage, totalPages }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 16 }}>
      <button
        className="btn-app"
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer" }}
      >
        ← Précédent
      </button>
      <span style={{ fontSize: 13, color: "#a9d6cf" }}>Page {page} / {totalPages}</span>
      <button
        className="btn-app"
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 13, cursor: page === totalPages ? "not-allowed" : "pointer" }}
      >
        Suivant →
      </button>
    </div>
  );
}

function PrioritesPastorales({ membres, gems, regulariteParMembre, cardStyle }) {
  const [page, setPage] = useState(1);
  const PAR_PAGE = 10;

  function nomGem(gemId) {
    return gems.find(g => g.id === gemId)?.nom || "GEM inconnu";
  }

  const membresAlerte = membres
    .map(m => ({ membre: m, regularite: regulariteParMembre[m.id] }))
    .filter(x => x.regularite && x.regularite.absencesConsecutives >= 2)
    .sort((a, b) => b.regularite.absencesConsecutives - a.regularite.absencesConsecutives);

  const totalPages = Math.max(1, Math.ceil(membresAlerte.length / PAR_PAGE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);
  const membresAffiches = membresAlerte.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);

  return (
    <div>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>⚠️ Priorités pastorales — membres à visiter ({membresAlerte.length})</p>
      {membresAlerte.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun membre en absence répétée pour l'instant — tout va bien.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {membresAffiches.map(({ membre, regularite }) => (
            <div key={membre.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderColor: RED_LIGHT }}>
              <div>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{membre.nom}</p>
                <p style={{ fontSize: 12, color: "#a9d6cf" }}>{nomGem(membre.gem_id)}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: RED_LIGHT, borderRadius: 999, padding: "6px 12px" }}>⚠️ {regularite.absencesConsecutives} absences consécutives</span>
                {membre.telephone && (
                  <>
                    <a title="Appeler" href={`tel:${membre.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                      📞</a>
                    <a
                      href={`https://wa.me/${numeroPourWhatsApp(membre.telephone)}?text=${encodeURIComponent(`Bonjour ${membre.nom}, tu nous manques beaucoup ces derniers temps. Est-ce que tout va bien ? Nous t'aimons et espérons te revoir bientôt au culte. 🙏`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                    >
                      💬</a>
                  </>
                )}
              </div>
            </div>
          ))}
          <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}

/* ------------------------- Liste Tribus / Départements ------------------------- */

function ListeParents({ titre, items, type, gems, estPasteur, onOpenGem, onOpenParent, onCreerGem, cardStyle }) {
  const [recherche, setRecherche] = useState("");
  const [creationPour, setCreationPour] = useState(null);
  const [nomNouveauGem, setNomNouveauGem] = useState("");
  const [responsablesParParent, setResponsablesParParent] = useState({}); // { parentId: { nom, telephone } }
  const [responsablesParGem, setResponsablesParGem] = useState({}); // { gemId: { nom, telephone } }

  useEffect(() => { chargerResponsables(); }, [type, gems.length]);

  async function chargerResponsables() {
    const roleCorrespondant = type === "tribu" ? "tribu_resp" : "departement_resp";
    const [{ data: assignationsParent }, { data: assignationsGem }] = await Promise.all([
      supabase.from("assignations").select("*").eq("statut", "actif").eq("role_demande", roleCorrespondant),
      supabase.from("assignations").select("*").eq("statut", "actif").eq("role_demande", "gem"),
    ]);
    const idsComptes = [...new Set([...(assignationsParent || []), ...(assignationsGem || [])].map(a => a.compte_id))];
    let comptesMap = {};
    if (idsComptes.length > 0) {
      const { data: c } = await supabase.from("comptes").select("*").in("id", idsComptes);
      (c || []).forEach(cc => { comptesMap[cc.id] = cc; });
    }
    const mapParent = {};
    (assignationsParent || []).forEach(a => {
      const parentId = type === "tribu" ? a.tribu_id : a.departement_id;
      if (parentId && comptesMap[a.compte_id]) mapParent[parentId] = comptesMap[a.compte_id];
    });
    setResponsablesParParent(mapParent);

    const mapGem = {};
    (assignationsGem || []).forEach(a => {
      if (a.gem_id && comptesMap[a.compte_id]) mapGem[a.gem_id] = comptesMap[a.compte_id];
    });
    setResponsablesParGem(mapGem);
  }

  const filtres = items.filter(it => it.nom.toLowerCase().includes(recherche.toLowerCase()));

  async function creerGem(parentId) {
    if (!nomNouveauGem.trim()) return;
    const payload = { nom: nomNouveauGem.trim(), type, [type === "tribu" ? "tribu_id" : "departement_id"]: parentId };
    const { error } = await supabase.from("gems").insert(payload);
    if (!error) { setNomNouveauGem(""); setCreationPour(null); onCreerGem(); }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{titre}</h2>
      <input
        value={recherche}
        onChange={e => setRecherche(e.target.value)}
        placeholder="Rechercher..."
        style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}`, marginBottom: 16, width: "100%", maxWidth: 320 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {filtres.map(it => {
          const gemsDuParent = gems.filter(g => g.type === type && (type === "tribu" ? g.tribu_id : g.departement_id) === it.id);
          const responsable = responsablesParParent[it.id];
          return (
            <div key={it.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{it.nom}</p>
                <button
 className="btn-app"
 onClick={() => onOpenParent(it)} style={{ fontSize: 13, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 12, padding: "10px 18px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                  👥 Tous les membres
                </button>
              </div>
              {responsable ? (
                <p style={{ fontSize: 11, color: GOLD_LIGHT, marginBottom: 10 }}>
                  {type === "tribu" ? "Patriarche/Matriarche" : "Responsable"} : {responsable.nom}
                </p>
              ) : (
                <p style={{ fontSize: 11, color: "#a9d6cf", fontStyle: "italic", marginBottom: 10 }}>Aucun responsable désigné</p>
              )}
              {gemsDuParent.length === 0 ? (
                <p style={{ fontSize: 12, color: "#a9d6cf", fontStyle: "italic" }}>Aucun GEM pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {gemsDuParent.map(g => {
                    const respGem = responsablesParGem[g.id];
                    return (
                      <button key={g.id} onClick={() => onOpenGem(g)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, backgroundColor: TEAL_700, color: GOLD_LIGHT, border: "none", fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>{g.nom}</span>
                        <span style={{ fontSize: 11, fontWeight: 400, color: respGem ? "#cdeae4" : "#7fae9f" }}>
                          {respGem ? respGem.nom : "Sans responsable"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {estPasteur && (
                creationPour === it.id ? (
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                    <input value={nomNouveauGem} onChange={e => setNomNouveauGem(e.target.value)} placeholder="Nom du GEM" style={{ flex: 1, padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                    <button
 className="btn-app"
 onClick={() => creerGem(it.id)} style={{ padding: "6px 10px", borderRadius: 6, backgroundColor: GOLD, color: TEAL_950, border: "none", fontSize: 12, fontWeight: 700 }}>OK</button>
                  </div>
                ) : (
                  <button
 className="btn-app"
 onClick={() => setCreationPour(it.id)} style={{ marginTop: 10, fontSize: 12, color: "#a9d6cf", background: "none", border: "none", cursor: "pointer" }}>+ Créer un GEM ici</button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------- Détail Tribu/Département (tous les membres) ------------------------- */

function DetailParent({ compte, estPasteur, responsablesParGem, parent, type, gems, membres, regulariteParMembre, onBack, onChange, cardStyle }) {
  const [santeParMembre, setSanteParMembre] = useState({});
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [suppressionEnCours, setSuppressionEnCours] = useState(null);
  const [membreAConfirmer, setMembreAConfirmer] = useState(null);
  const [page, setPage] = useState(1);
  const [gemEnEdition, setGemEnEdition] = useState(null); // id du GEM en cours de renommage
  const [nomEdite, setNomEdite] = useState("");
  const [gemAConfirmerSuppression, setGemAConfirmerSuppression] = useState(null);
  const [suppressionGemEnCours, setSuppressionGemEnCours] = useState(false);

  useEffect(() => { setPage(1); }, [recherche]);

  const gemsDuParent = gems.filter(g => g.type === type && (type === "tribu" ? g.tribu_id === parent.id : g.departement_id === parent.id));
  const idsGems = gemsDuParent.map(g => g.id);
  const membresDuParent = membres.filter(m => idsGems.includes(m.gem_id));

  async function renommerGem(gemId) {
    if (!nomEdite.trim()) { toast("Le nom du GEM ne peut pas être vide.", "erreur"); return; }
    const { error } = await supabase.from("gems").update({ nom: nomEdite.trim() }).eq("id", gemId);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast("✓ GEM renommé avec succès.", "succes");
    setGemEnEdition(null);
    if (onChange) onChange();
  }

  async function confirmerSuppressionGem() {
    const gem = gemAConfirmerSuppression;
    setSuppressionGemEnCours(true);
    // Nettoie les demandes de rôle liées à ce GEM avant suppression
    await supabase.from("assignations").delete().eq("gem_id", gem.id);
    const { error } = await supabase.from("gems").delete().eq("id", gem.id);
    setSuppressionGemEnCours(false);
    setGemAConfirmerSuppression(null);
    if (error) { toast("Suppression impossible : " + error.message, "erreur"); return; }
    toast(`Le GEM "${gem.nom}" et tous ses membres ont été supprimés.`, "succes");
    if (onChange) onChange();
  }

  useEffect(() => { chargerSante(); }, [membresDuParent.length]);

  async function chargerSante() {
    setChargement(true);
    if (membresDuParent.length === 0) { setSanteParMembre({}); setChargement(false); return; }
    const { data } = await supabase.from("sante_spirituelle").select("*").in("membre_id", membresDuParent.map(m => m.id)).order("date_maj", { ascending: false });
    const map = {};
    (data || []).forEach(s => { if (!map[s.membre_id]) map[s.membre_id] = s; });
    setSanteParMembre(map);
    setChargement(false);
  }

  function nomGem(gemId) {
    return gems.find(g => g.id === gemId)?.nom || "GEM inconnu";
  }

  function initiales(nomComplet) {
    return nomComplet.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }

  async function envoyerDemandeSuppression(motif) {
    const membre = membreAConfirmer;
    setMembreAConfirmer(null);
    setSuppressionEnCours(membre.id);
    const { error } = await supabase.from("demandes_suppression_membre").insert({
      membre_id: membre.id,
      membre_nom: membre.nom,
      demande_par: compte?.id || null,
      motif,
      statut: "attente",
    });
    setSuppressionEnCours(null);
    if (error) { toast("Impossible d'envoyer la demande : " + error.message, "erreur"); return; }
    toast(`Demande de suppression de ${membre.nom} envoyée au pasteur pour validation.`, "succes");
  }

  const membresFiltres = membresDuParent.filter(m => m.nom.toLowerCase().includes(recherche.toLowerCase()));
  const PAR_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(membresFiltres.length / PAR_PAGE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);
  const membresAffiches = membresFiltres.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);

  return (
    <div>
      <button
 className="btn-app"
 onClick={onBack} style={{ background: "none", border: "none", color: "#a9d6cf", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Retour</button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{parent.nom}</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>{membresDuParent.length} membre{membresDuParent.length > 1 ? "s" : ""} au total, répartis sur {gemsDuParent.length} GEM</p>

      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📋 GEM de ce {type === "tribu" ? "tribu" : "département"} ({gemsDuParent.length})</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {gemsDuParent.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun GEM créé pour l'instant.</p>
        ) : (
          gemsDuParent.map(g => {
            const nbMembresGem = membres.filter(m => m.gem_id === g.id).length;
            const nomResponsable = responsablesParGem?.[g.id];
            const enEdition = gemEnEdition === g.id;
            return (
              <div key={g.id} style={cardStyle}>
                {enEdition ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      value={nomEdite}
                      onChange={e => setNomEdite(e.target.value)}
                      autoFocus
                      style={{ flex: 1, minWidth: 140, padding: 8, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
                    />
                    <button className="btn-app" onClick={() => renommerGem(g.id)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Enregistrer</button>
                    <button className="btn-app" onClick={() => setGemEnEdition(null)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: "transparent", color: "#a9d6cf", border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 12 }}>Annuler</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <p style={{ fontWeight: 700, marginBottom: 2 }}>
                        {g.nom}
                        {nomResponsable && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 8px", marginLeft: 8 }}>
                            👤 R
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: 12, color: "#a9d6cf" }}>
                        {nbMembresGem} membre{nbMembresGem > 1 ? "s" : ""}
                        {nomResponsable ? ` · Responsable : ${nomResponsable}` : " · Aucun responsable désigné"}
                      </p>
                    </div>
                    {estPasteur && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn-app"
                          onClick={() => { setGemEnEdition(g.id); setNomEdite(g.nom); }}
                          style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          className="btn-app"
                          onClick={() => setGemAConfirmerSuppression(g)}
                          style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: RED_LIGHT, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>👥 Tous les membres</p>
      <input
        value={recherche}
        onChange={e => setRecherche(e.target.value)}
        placeholder="Rechercher un membre..."
        style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}`, marginBottom: 16, width: "100%", maxWidth: 320 }}
      />

      {chargement ? (
        <Chargement />
      ) : membresFiltres.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun membre trouvé.</p>
      ) : (
        <>
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {membresAffiches.map(m => {
            const regularite = regulariteParMembre?.[m.id];
            const moyenne = moyenneSante(santeParMembre[m.id]);
            const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
            const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, comment vas-tu ? 🙏`);
            return (
              <div key={m.id} className="card-app" style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {m.photo ? (
                      <img src={m.photo} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", flexShrink: 0, border: `1px solid ${TEAL_600}` }} />
                    ) : (
                      <span style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: TEAL_700, color: GOLD_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {initiales(m.nom)}
                      </span>
                    )}
                    <div>
                      <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                      <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 4 }}>{nomGem(m.gem_id)} · {m.telephone}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: couleurScore(moyenne), backgroundColor: TEAL_900, borderRadius: 999, padding: "2px 8px" }}>
                          🌡️ Santé : {moyenne !== null ? `${moyenne}/10` : "Non évaluée"}
                        </span>
                        {regularite?.tauxRegularite !== null && regularite?.tauxRegularite !== undefined && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", backgroundColor: TEAL_700, borderRadius: 999, padding: "2px 8px" }}>
                            📊 {regularite.tauxRegularite}% de présence
                          </span>
                        )}
                        {regularite?.absencesConsecutives >= 2 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", backgroundColor: RED_LIGHT, borderRadius: 999, padding: "2px 8px" }}>
                            ⚠️ {regularite.absencesConsecutives} absences
                          </span>
                        )}
                        {regularite?.presencesConsecutives >= 4 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "2px 8px" }}>
                            ⭐ Régulier ({regularite.presencesConsecutives})
                          </span>
                        )}
                        {!regularite && (
                          <span style={{ fontSize: 11, color: "#a9d6cf", backgroundColor: TEAL_900, borderRadius: 999, padding: "2px 8px" }}>
                            Régularité non disponible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {m.telephone && (
                      <>
                        <a title="Appeler" href={`tel:${m.telephone}`} className="btn-app" style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                          📞</a>
                        <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" className="btn-app" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                          💬</a>
                      </>
                    )}
                    <button
                      title="Supprimer"
                      className="btn-app"
                      onClick={() => setMembreAConfirmer(m)}
                      disabled={suppressionEnCours === m.id}
                      style={{ fontSize: 15, color: "#fff", backgroundColor: RED_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0 }}
                    >
                      {suppressionEnCours === m.id ? "…" : "🗑️"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </>
      )}

      {membreAConfirmer && (
        <BoiteDemandeSuppression
          nomMembre={membreAConfirmer.nom}
          onEnvoyer={envoyerDemandeSuppression}
          onAnnuler={() => setMembreAConfirmer(null)}
        />
      )}
      {gemAConfirmerSuppression && (
        <BoiteConfirmation
          titre="Supprimer ce GEM ?"
          message={`Es-tu sûr de vouloir supprimer définitivement "${gemAConfirmerSuppression.nom}" ? Cette action est irréversible et supprimera aussi tous ses membres, leur présence, leur santé spirituelle et leurs visites.`}
          texteConfirmer={suppressionGemEnCours ? "…" : "Supprimer définitivement"}
          dangereux
          onConfirmer={confirmerSuppressionGem}
          onAnnuler={() => setGemAConfirmerSuppression(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------- Détail GEM ------------------------------- */

function dimancheActuel() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // recule jusqu'au dimanche de cette semaine
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // format YYYY-MM-DD
}

// Garantit que le numéro utilisé pour WhatsApp comporte bien l'indicatif +225 (Côte d'Ivoire),
// même si le numéro a été enregistré sans, pour que le lien wa.me fonctionne correctement.
function numeroPourWhatsApp(tel) {
  const chiffres = (tel || "").replace(/[^\d]/g, "");
  if (chiffres.startsWith("225")) return chiffres;
  return "225" + chiffres;
}

// Redimensionne une photo côté navigateur avant stockage (évite d'alourdir la base).
function redimensionnerPhoto(fichier) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = e => {
      const img = new Image();
      img.onload = () => {
        const taille = 240;
        const canvas = document.createElement("canvas");
        canvas.width = taille; canvas.height = taille;
        const ctx = canvas.getContext("2d");
        const ratio = Math.max(taille / img.width, taille / img.height);
        const largeur = img.width * ratio, hauteur = img.height * ratio;
        ctx.drawImage(img, (taille - largeur) / 2, (taille - hauteur) / 2, largeur, hauteur);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    lecteur.onerror = reject;
    lecteur.readAsDataURL(fichier);
  });
}

// Vérifie si le pointage du dernier dimanche passé est incomplet, pour afficher un rappel.
async function verifierPointageManquant(listeMembres) {
  if (listeMembres.length === 0) return null;
  const aujourdHui = new Date();
  if (aujourdHui.getDay() === 0) return null; // on est dimanche, le culte n'est pas encore terminé
  const dimancheAVerifier = new Date(aujourdHui);
  dimancheAVerifier.setDate(aujourdHui.getDate() - aujourdHui.getDay());
  dimancheAVerifier.setHours(0, 0, 0, 0);
  const dateStr = dimancheAVerifier.toISOString().slice(0, 10);
  const { data: dim } = await supabase.from("dimanches").select("*").eq("date", dateStr).maybeSingle();
  if (!dim) return { date: dateStr, manquants: listeMembres.length };
  const idsMembres = listeMembres.map(m => m.id);
  const { data: pres } = await supabase.from("presences").select("membre_id").eq("dimanche_id", dim.id).in("membre_id", idsMembres);
  const pointes = new Set((pres || []).map(p => p.membre_id));
  const manquants = listeMembres.filter(m => !pointes.has(m.id)).length;
  return manquants > 0 ? { date: dateStr, manquants } : null;
}

function BanniereRappelPointage({ rappel }) {
  if (!rappel) return null;
  const dateFormatee = new Date(rappel.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return (
    <div style={{ backgroundColor: "rgba(208,175,28,0.15)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 20 }}>⏰</span>
      <p style={{ fontSize: 13, color: "#fff8e0", margin: 0 }}>
        <b>Rappel :</b> le pointage du dimanche {dateFormatee} n'est pas complet — {rappel.manquants} membre{rappel.manquants > 1 ? "s" : ""} pas encore pointé{rappel.manquants > 1 ? "s" : ""}.
      </p>
    </div>
  );
}

function DetailGem({ compte, gem, membres, onBack, onMembreAjoute, regulariteParMembre, membreCible, onMembreCibleConsomme, cardStyle }) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("+225 ");
  const [photo, setPhoto] = useState(null);
  const [dateNaissance, setDateNaissance] = useState("");
  const [quartier, setQuartier] = useState("");
  const [doublonDetecte, setDoublonDetecte] = useState(null);
  const [apercuImport, setApercuImport] = useState(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [nouveauConverti, setNouveauConverti] = useState(false);
  const [erreur, setErreur] = useState("");
  const [dimancheId, setDimancheId] = useState(null);
  const [presences, setPresences] = useState({}); // { membre_id: true/false }
  const [chargementPresences, setChargementPresences] = useState(true);
  const [rapportPresenceValide, setRapportPresenceValide] = useState(false);
  const [validationEnCours, setValidationEnCours] = useState(false);
  const [santeParMembre, setSanteParMembre] = useState({}); // { membre_id: dernierEnregistrement }
  const [membreOuvert, setMembreOuvert] = useState(null);
  const [rappelPointage, setRappelPointage] = useState(null);
  const [sousOnglet, setSousOnglet] = useState("membres"); // membres | activites
  const [dimanchesDisponibles, setDimanchesDisponibles] = useState([]);

  useEffect(() => { initialiserPresences(); chargerSante(); verifierPointageManquant(membres).then(setRappelPointage); }, [membres.length]);
  useEffect(() => { chargerPresences(); }, [dimancheId]);

  useEffect(() => {
    if (membreCible && membres.some(m => m.id === membreCible)) {
      setMembreOuvert(membreCible);
      if (onMembreCibleConsomme) onMembreCibleConsomme();
    }
  }, [membreCible, membres]);

  async function chargerSante() {
    if (membres.length === 0) return;
    const { data } = await supabase.from("sante_spirituelle").select("*").in("membre_id", membres.map(m => m.id)).order("date_maj", { ascending: false });
    const map = {};
    (data || []).forEach(s => { if (!map[s.membre_id]) map[s.membre_id] = s; }); // garde la plus récente
    setSanteParMembre(map);
  }

  async function initialiserPresences() {
    setChargementPresences(true);
    const dateAuj = dimancheActuel();
    let { data: dimAuj } = await supabase.from("dimanches").select("*").eq("date", dateAuj).maybeSingle();
    if (!dimAuj) {
      const { data: nouveauDim } = await supabase.from("dimanches").insert({ date: dateAuj }).select().single();
      dimAuj = nouveauDim;
    }
    const { data: toutesLesSemaines } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(52);
    setDimanchesDisponibles(toutesLesSemaines || []);
    setDimancheId(dimAuj.id);
  }

  async function chargerPresences() {
    if (!dimancheId) return;
    setChargementPresences(true);

    if (membres.length > 0) {
      const { data: pres } = await supabase.from("presences").select("*").eq("dimanche_id", dimancheId).in("membre_id", membres.map(m => m.id));
      const map = {};
      (pres || []).forEach(p => { map[p.membre_id] = { present: p.present, motif: p.motif || "" }; });
      setPresences(map);
    }

    const { data: validation } = await supabase.from("validations_presence").select("*").eq("gem_id", gem.id).eq("dimanche_id", dimancheId).maybeSingle();
    setRapportPresenceValide(!!validation?.valide);

    setChargementPresences(false);
  }

  async function validerRapportPresence() {
    setValidationEnCours(true);
    const { error } = await supabase.from("validations_presence").upsert({
      gem_id: gem.id, dimanche_id: dimancheId, valide: true,
      date_validation: new Date().toISOString(), valide_par: compte?.id || null,
    }, { onConflict: "gem_id,dimanche_id" });
    setValidationEnCours(false);
    if (error) { toast("Impossible de valider le rapport de présence : " + error.message, "erreur"); return; }
    setRapportPresenceValide(true);
    toast("✓ Rapport de présence envoyé — Tu es béni pour ton engagement dans l'œuvre de Dieu 🙏", "succes");
  }

  async function basculerPresence(membreId) {
    const etatActuel = presences[membreId];
    const nouvelEtat = !etatActuel?.present;
    const motifConserve = nouvelEtat ? "" : (etatActuel?.motif || "");
    setPresences(prev => ({ ...prev, [membreId]: { present: nouvelEtat, motif: motifConserve } }));
    const { error } = await supabase.from("presences").upsert({ membre_id: membreId, dimanche_id: dimancheId, present: nouvelEtat, motif: motifConserve || null }, { onConflict: "membre_id,dimanche_id" });
    if (error) {
      toast("⚠️ La présence n'a pas pu être enregistrée : " + error.message, "erreur");
      setPresences(prev => ({ ...prev, [membreId]: etatActuel || { present: false, motif: "" } }));
      return;
    }
    if (rapportPresenceValide) setRapportPresenceValide(false);
  }

  async function enregistrerMotif(membreId, motif) {
    setPresences(prev => ({ ...prev, [membreId]: { ...prev[membreId], motif } }));
    await supabase.from("presences").upsert({ membre_id: membreId, dimanche_id: dimancheId, present: false, motif: motif || null }, { onConflict: "membre_id,dimanche_id" });
  }

  async function surChoisirPhoto(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    try {
      const dataUrl = await redimensionnerPhoto(fichier);
      setPhoto(dataUrl);
    } catch { setErreur("Impossible de charger cette photo."); }
  }

  async function ajouterMembre() {
    setErreur("");
    if (!nom.trim() || !telephone.trim()) { setErreur("Nom et téléphone requis."); return; }
    const chiffresTel = telephone.replace(/[^\d]/g, "");
    const { data: existants } = await supabase.from("membres").select("id, nom, gem_id").not("telephone", "is", null);
    const doublon = (existants || []).find(m => m.telephone && m.telephone.replace(/[^\d]/g, "").endsWith(chiffresTel.slice(-8)));
    if (doublon) {
      setDoublonDetecte(doublon);
      return;
    }
    await creerMembre();
  }

  async function creerMembre() {
    setDoublonDetecte(null);
    const { error } = await supabase.from("membres").insert({ gem_id: gem.id, nom: nom.trim(), telephone: telephone.trim(), nouveau_converti: nouveauConverti, etape_conversion: "accueil", photo: photo || null, date_naissance: dateNaissance || null, quartier: quartier.trim() || null });
    if (error) { setErreur(error.message); return; }
    setNom(""); setTelephone("+225 "); setNouveauConverti(false); setPhoto(null); setDateNaissance(""); setQuartier("");
    onMembreAjoute();
  }

  // --- Import en masse depuis un fichier CSV (colonnes : nom, telephone, quartier) ---
  function analyserCSV(texte) {
    const lignes = texte.split(/\r?\n/).filter(l => l.trim());
    if (lignes.length === 0) return [];
    const entetes = lignes[0].split(",").map(e => e.trim().toLowerCase().replace(/"/g, ""));
    const idxNom = entetes.findIndex(e => e.includes("nom"));
    const idxTel = entetes.findIndex(e => e.includes("tel"));
    const idxQuartier = entetes.findIndex(e => e.includes("quartier"));
    if (idxNom === -1 || idxTel === -1) return null; // colonnes obligatoires manquantes
    return lignes.slice(1).map(ligne => {
      const valeurs = ligne.split(",").map(v => v.trim().replace(/"/g, ""));
      return {
        nom: valeurs[idxNom] || "",
        telephone: valeurs[idxTel] || "",
        quartier: idxQuartier !== -1 ? (valeurs[idxQuartier] || "") : "",
      };
    }).filter(l => l.nom && l.telephone);
  }

  function surChoisirFichierImport(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = evt => {
      const lignes = analyserCSV(evt.target.result);
      if (lignes === null) {
        toast("Le fichier doit contenir au moins les colonnes 'nom' et 'telephone'.", "erreur");
        return;
      }
      if (lignes.length === 0) {
        toast("Aucune ligne valide trouvée dans le fichier.", "erreur");
        return;
      }
      setApercuImport(lignes);
    };
    lecteur.readAsText(fichier);
    e.target.value = "";
  }

  async function confirmerImport() {
    setImportEnCours(true);
    const lignes = apercuImport.map(l => ({
      gem_id: gem.id, nom: l.nom.trim(), telephone: l.telephone.trim(),
      quartier: l.quartier?.trim() || null, nouveau_converti: false, etape_conversion: "accueil",
    }));
    const { error } = await supabase.from("membres").insert(lignes);
    setImportEnCours(false);
    setApercuImport(null);
    if (error) { toast("Erreur pendant l'import : " + error.message, "erreur"); return; }
    toast(`✓ ${lignes.length} membre(s) importé(s) avec succès.`, "succes");
    onMembreAjoute();
  }

  const presentsCount = membres.filter(m => presences[m.id]?.present).length;
  const dateAffichee = new Date(dimancheActuel() + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {onBack && <button
 className="btn-app"
 onClick={onBack} style={{ background: "none", border: "none", color: "#a9d6cf", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Retour</button>}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{gem.nom}</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>{membres.length} membre{membres.length > 1 ? "s" : ""}</p>

      <BanniereRappelPointage rappel={rappelPointage} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className="btn-app"
          onClick={() => setSousOnglet("membres")}
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "membres" ? GOLD : TEAL_900, color: sousOnglet === "membres" ? TEAL_950 : "#cdeae4" }}
        >
          Membres & Présence
        </button>
        <button
          className="btn-app"
          onClick={() => setSousOnglet("activites")}
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "activites" ? GOLD : TEAL_900, color: sousOnglet === "activites" ? TEAL_950 : "#cdeae4" }}
        >
          📋 Activités de la semaine
        </button>
      </div>

      {sousOnglet === "activites" ? (
        <ActivitesSemaine gem={gem} membres={membres} compte={compte} cardStyle={cardStyle} />
      ) : (
        <>
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Ajouter un membre</p>
          <label style={{ fontSize: 11, fontWeight: 700, color: GOLD_LIGHT, cursor: "pointer", border: `1px solid ${GOLD_LIGHT}`, borderRadius: 8, padding: "6px 10px", whiteSpace: "nowrap" }}>
            📂 Importer depuis un fichier (CSV)
            <input type="file" accept=".csv,text/csv" onChange={surChoisirFichierImport} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {photo && <img src={photo} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", border: `1px solid ${GOLD}`, flexShrink: 0 }} />}
          <label style={{ fontSize: 11, color: GOLD_LIGHT, cursor: "pointer", border: `1px solid ${TEAL_600}`, borderRadius: 8, padding: "8px 10px", whiteSpace: "nowrap" }}>
            📷 Photo (optionnel)
            <input type="file" accept="image/*" onChange={surChoisirPhoto} style={{ display: "none" }} />
          </label>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          <SelecteurJourMois value={dateNaissance} onChange={setDateNaissance} style={{ flex: 1, minWidth: 160 }} />
          <input value={quartier} onChange={e => setQuartier(e.target.value)} placeholder="Quartier" style={{ flex: 1, minWidth: 140, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          <button
 className="btn-app"
 onClick={ajouterMembre} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Ajouter</button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#a9d6cf", cursor: "pointer" }}>
          <input type="checkbox" checked={nouveauConverti} onChange={e => setNouveauConverti(e.target.checked)} />
          Nouveau converti — suivre son parcours d'intégration
        </label>
        {erreur && <p style={{ color: RED_LIGHT, fontSize: 12, marginTop: 8 }}>{erreur}</p>}
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Présence — semaine</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {!chargementPresences && (
              <span style={{ fontSize: 12, color: GOLD_LIGHT, fontWeight: 700 }}>
                {presentsCount} / {membres.length} présent{presentsCount > 1 ? "s" : ""}
              </span>
            )}
            {rapportPresenceValide && (
              <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "4px 10px" }}>
                ✓ Rapport validé
              </span>
            )}
          </div>
        </div>
        <select
          value={dimancheId || ""}
          onChange={e => setDimancheId(e.target.value)}
          style={{ padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 12 }}
        >
          {dimanchesDisponibles.map(d => (
            <option key={d.id} value={d.id}>
              {new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 11, color: "#a9d6cf", marginBottom: 12 }}>Coche chaque membre présent au culte de ce dimanche.</p>

        {chargementPresences ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Chargement…</p>
        ) : membres.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Ajoute d'abord un membre ci-dessus.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {membres.map(m => {
              const present = !!presences[m.id]?.present;
              const motif = presences[m.id]?.motif || "";
              return (
                <div key={m.id}>
                  <label
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                      padding: "10px 14px", borderRadius: present || !motif ? 8 : "8px 8px 0 0", cursor: "pointer", textAlign: "left",
                      backgroundColor: present ? "rgba(208,175,28,0.15)" : TEAL_900,
                      border: `1px solid ${present ? GOLD : TEAL_700}`, color: CREAM,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={present}
                        onChange={() => basculerPresence(m.id)}
                        style={{ width: 18, height: 18, cursor: "pointer", accentColor: GOLD }}
                      />
                      <span>{m.nom}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: present ? GOLD_LIGHT : "#a9d6cf" }}>
                      {present ? "✓ Présent" : "Absent"}
                    </span>
                  </label>
                  {!present && (
                    <input
                      defaultValue={motif}
                      onBlur={e => enregistrerMotif(m.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Motif de l'absence (optionnel)..."
                      style={{ width: "100%", padding: "8px 14px", fontSize: 12, backgroundColor: TEAL_950, color: "#cdeae4", border: `1px solid ${TEAL_700}`, borderTop: "none", borderRadius: "0 0 8px 8px" }}
                    />
                  )}
                </div>
              );
            })}
            <button
              className="btn-app"
              disabled={validationEnCours}
              onClick={validerRapportPresence}
              style={{ marginTop: 10, padding: "12px 20px", borderRadius: 10, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", alignSelf: "flex-start" }}
            >
              {validationEnCours ? "…" : rapportPresenceValide ? "✓ Revalider le rapport de présence" : "Valider le rapport de présence"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Tous les membres</p>
        {membres.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun membre pour l'instant.</p>
        ) : (
          membres.map(m => (
            <FicheMembre
              key={m.id}
              compte={compte}
              membre={m}
              derniereSante={santeParMembre[m.id]}
              regularite={regulariteParMembre?.[m.id]}
              ouvert={membreOuvert === m.id}
              onToggle={() => setMembreOuvert(membreOuvert === m.id ? null : m.id)}
              onSauvegarde={chargerSante}
              onMisAJour={onMembreAjoute}
              cardStyle={cardStyle}
            />
          ))
        )}
      </div>
        </>
      )}
      {doublonDetecte && (
        <BoiteConfirmation
          titre="Doublon possible détecté"
          message={`Un membre nommé "${doublonDetecte.nom}" existe déjà avec un numéro de téléphone très proche. Veux-tu quand même ajouter ce nouveau membre ?`}
          texteConfirmer="Ajouter quand même"
          onConfirmer={creerMembre}
          onAnnuler={() => setDoublonDetecte(null)}
        />
      )}
      {apercuImport && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,20,18,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "#14776B", border: "1px solid #1F9C8D", borderRadius: 16, padding: 24, maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
            <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, color: "#FFFFFF" }}>Confirmer l'import — {apercuImport.length} membre(s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {apercuImport.slice(0, 15).map((l, i) => (
                <p key={i} style={{ fontSize: 12, color: "#cdeae4" }}>• {l.nom} — {l.telephone}{l.quartier ? ` (${l.quartier})` : ""}</p>
              ))}
              {apercuImport.length > 15 && <p style={{ fontSize: 12, color: "#a9d6cf", fontStyle: "italic" }}>+ {apercuImport.length - 15} autre(s)…</p>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button className="btn-app" onClick={() => setApercuImport(null)} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: "transparent", color: "#cdeae4", border: "1px solid #27B3A1", fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
              <button className="btn-app" disabled={importEnCours} onClick={confirmerImport} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: "#D0AF1C", color: "#0D5C52", border: "none", fontWeight: 700, cursor: "pointer" }}>
                {importEnCours ? "…" : `Importer ${apercuImport.length} membre(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Activités de la semaine (GEM) --------------------------- */

const CHAMPS_ACTIVITE_TEXTE = [
  ["jeune", "🕊️ Jeûne", "Qui a jeûné, combien de jours..."],
  ["agape", "🍽️ Agapé", "Détails de l'agapé partagé cette semaine..."],
  ["evangelisation", "📣 Évangélisation", "Où, avec qui, combien de personnes touchées..."],
  ["autres", "➕ Autres activités", "Toute autre activité à mentionner..."],
];

function ActivitesSemaine({ gem, membres, compte, cardStyle }) {
  const [dimanches, setDimanches] = useState([]);
  const [dimancheId, setDimancheId] = useState(null);
  const [activite, setActivite] = useState(null); // ligne activites_semaine en cours
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => { initialiser(); }, [gem.id]);
  useEffect(() => { if (dimancheId) chargerActivite(); }, [dimancheId]);

  async function initialiser() {
    setChargement(true);
    // S'assure que la semaine en cours existe dans la liste, sans forcer sa sélection.
    const dateAuj = dimancheActuel();
    let { data: dimAuj } = await supabase.from("dimanches").select("*").eq("date", dateAuj).maybeSingle();
    if (!dimAuj) {
      const { data: nouveauDim } = await supabase.from("dimanches").insert({ date: dateAuj }).select().single();
      dimAuj = nouveauDim;
    }
    const { data: toutesLesSemaines } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(52);
    setDimanches(toutesLesSemaines || []);
    setDimancheId(dimAuj.id);
  }

  async function chargerActivite() {
    setChargement(true);
    const { data: act } = await supabase.from("activites_semaine").select("*").eq("gem_id", gem.id).eq("dimanche_id", dimancheId).maybeSingle();
    setActivite(act || {
      gem_id: gem.id, dimanche_id: dimancheId,
      visites_membres: [], appels_membres: [],
      priere_jour: "", priere_heures: "",
      jeune: "", agape: "", evangelisation: "", autres: "",
      valide: false,
    });
    setChargement(false);
  }

  async function sauvegarder(champsMisAJour, { silencieux } = {}) {
    const nouvelleActivite = { ...activite, ...champsMisAJour };
    setActivite(nouvelleActivite);
    if (!silencieux) setEnregistrement(true);
    const payload = {
      gem_id: gem.id, dimanche_id: dimancheId,
      visites_membres: nouvelleActivite.visites_membres,
      appels_membres: nouvelleActivite.appels_membres,
      priere_jour: nouvelleActivite.priere_jour || null,
      priere_heures: nouvelleActivite.priere_heures || null,
      jeune: nouvelleActivite.jeune || null,
      agape: nouvelleActivite.agape || null,
      evangelisation: nouvelleActivite.evangelisation || null,
      autres: nouvelleActivite.autres || null,
      cree_par: compte?.id || null,
    };
    const { data, error } = await supabase.from("activites_semaine").upsert(payload, { onConflict: "gem_id,dimanche_id" }).select().single();
    if (!silencieux) setEnregistrement(false);
    if (error) { toast("Erreur d'enregistrement : " + error.message, "erreur"); return; }
    setActivite(a => ({ ...a, id: data.id }));
  }

  function basculerMembreListe(champ, membreId) {
    const listeActuelle = activite[champ] || [];
    const nouvelleListe = listeActuelle.includes(membreId)
      ? listeActuelle.filter(id => id !== membreId)
      : [...listeActuelle, membreId];
    sauvegarder({ [champ]: nouvelleListe }, { silencieux: true });
  }

  async function valider() {
    setEnregistrement(true);
    const payload = {
      gem_id: gem.id, dimanche_id: dimancheId,
      visites_membres: activite.visites_membres || [],
      appels_membres: activite.appels_membres || [],
      priere_jour: activite.priere_jour || null,
      priere_heures: activite.priere_heures || null,
      jeune: activite.jeune || null,
      agape: activite.agape || null,
      evangelisation: activite.evangelisation || null,
      autres: activite.autres || null,
      cree_par: compte?.id || null,
      valide: true,
      date_validation: new Date().toISOString(),
      valide_par: compte?.id || null,
    };
    const { error } = await supabase.from("activites_semaine").upsert(payload, { onConflict: "gem_id,dimanche_id" });
    setEnregistrement(false);
    if (error) { toast("Impossible de valider le rapport : " + error.message, "erreur"); return; }
    setActivite(a => ({ ...a, valide: true, date_validation: new Date().toISOString() }));
    toast("✓ Rapport envoyé — Tu es béni pour ton engagement dans l'œuvre de Dieu 🙏", "succes");
  }

  if (chargement || !activite) return <Chargement />;

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#a9d6cf", marginBottom: 6 }}>Semaine concernée</label>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <select
          value={dimancheId || ""}
          onChange={e => setDimancheId(e.target.value)}
          style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
        >
          {dimanches.map(d => (
            <option key={d.id} value={d.id}>
              {new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        {activite.valide && (
          <span style={{ fontSize: 12, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "6px 12px" }}>
            ✓ Rapport validé
          </span>
        )}
      </div>

      {membres.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Ajoute d'abord des membres à ce GEM pour pouvoir remplir les activités.</p>
      ) : (
        <>
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🏠 Visites effectuées cette semaine</p>
            <p style={{ fontSize: 11, color: "#a9d6cf", marginBottom: 10 }}>Coche chaque membre visité.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {membres.map(m => {
                const coche = (activite.visites_membres || []).includes(m.id);
                return (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, backgroundColor: coche ? "rgba(208,175,28,0.15)" : TEAL_900, border: `1px solid ${coche ? GOLD : TEAL_700}`, borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
                    <input type="checkbox" checked={coche} onChange={() => basculerMembreListe("visites_membres", m.id)} style={{ accentColor: GOLD }} />
                    {m.nom}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📞 Appels effectués cette semaine</p>
            <p style={{ fontSize: 11, color: "#a9d6cf", marginBottom: 10 }}>Coche chaque membre appelé.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {membres.map(m => {
                const coche = (activite.appels_membres || []).includes(m.id);
                return (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, backgroundColor: coche ? "rgba(208,175,28,0.15)" : TEAL_900, border: `1px solid ${coche ? GOLD : TEAL_700}`, borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
                    <input type="checkbox" checked={coche} onChange={() => basculerMembreListe("appels_membres", m.id)} style={{ accentColor: GOLD }} />
                    {m.nom}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🙏 Prière</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                defaultValue={activite.priere_jour}
                onBlur={e => sauvegarder({ priere_jour: e.target.value })}
                placeholder="Jour (ex: Mercredi)"
                style={{ flex: 1, minWidth: 160, padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
              />
              <input
                defaultValue={activite.priere_heures}
                onBlur={e => sauvegarder({ priere_heures: e.target.value })}
                placeholder="Heures (ex: 18h - 19h30)"
                style={{ flex: 1, minWidth: 160, padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
              />
            </div>
          </div>

          {CHAMPS_ACTIVITE_TEXTE.map(([champ, titre, placeholder]) => (
            <div key={champ} style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{titre}</p>
              <textarea
                defaultValue={activite[champ]}
                onBlur={e => sauvegarder({ [champ]: e.target.value })}
                rows={2}
                placeholder={placeholder}
                style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }}
              />
            </div>
          ))}

          <button
            className="btn-app"
            disabled={enregistrement}
            onClick={valider}
            style={{ padding: "12px 24px", borderRadius: 12, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            {enregistrement ? "…" : activite.valide ? "✓ Revalider le rapport" : "Valider le rapport de la semaine"}
          </button>
        </>
      )}
    </div>
  );
}

const DIMENSIONS_SANTE = [
  ["meditation", "Méditation"], ["jeune", "Jeûne"], ["priere", "Prière"],
  ["sanctification", "Sanctification"], ["dons", "Dons"], ["caractere", "Caractère"],
];

function moyenneSante(s) {
  if (!s) return null;
  const valeurs = DIMENSIONS_SANTE.map(([cle]) => s[cle]).filter(v => v !== null && v !== undefined);
  if (valeurs.length === 0) return null;
  return Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 10) / 10;
}

function couleurScore(score) {
  if (score === null) return "#a9d6cf";
  if (score >= 7) return GOLD_LIGHT;
  if (score >= 4) return "#e8c25a";
  return RED_LIGHT;
}

function FicheMembre({ compte, membre, derniereSante, regularite, ouvert, onToggle, onSauvegarde, onMisAJour, cardStyle }) {
  const [valeurs, setValeurs] = useState(() => {
    const init = {};
    DIMENSIONS_SANTE.forEach(([cle]) => { init[cle] = derniereSante?.[cle] ?? 5; });
    return init;
  });
  const [sauvegarde, setSauvegarde] = useState(false);
  const [sousOnglet, setSousOnglet] = useState("sante"); // sante | visites | parcours
  const [demandeSuppressionOuverte, setDemandeSuppressionOuverte] = useState(false);
  const [confettiActif, setConfettiActif] = useState(false);
  const [historiquePresence, setHistoriquePresence] = useState(null);
  const [editNom, setEditNom] = useState(membre.nom);
  const [editTelephone, setEditTelephone] = useState(membre.telephone);
  const [editQuartier, setEditQuartier] = useState(membre.quartier || "");
  const [editDateNaissance, setEditDateNaissance] = useState(membre.date_naissance || "");
  const [enregistrementInfos, setEnregistrementInfos] = useState(false);

  useEffect(() => {
    if (ouvert && historiquePresence === null) chargerHistoriquePresence();
  }, [ouvert]);

  async function chargerHistoriquePresence() {
    const { data } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(8);
    if (!data || data.length === 0) { setHistoriquePresence([]); return; }
    const dimanchesRecents = [...data].reverse(); // remet en ordre chronologique pour l'affichage
    const { data: presencesMembre } = await supabase.from("presences").select("*").eq("membre_id", membre.id).in("dimanche_id", dimanchesRecents.map(d => d.id));
    const historique = dimanchesRecents.map(d => {
      const p = (presencesMembre || []).find(x => x.dimanche_id === d.id);
      return { date: d.date, present: p ? p.present : false };
    });
    setHistoriquePresence(historique);
  }

  async function envoyerDemandeSuppression(motif) {
    setDemandeSuppressionOuverte(false);
    const { error } = await supabase.from("demandes_suppression_membre").insert({
      membre_id: membre.id,
      membre_nom: membre.nom,
      demande_par: compte?.id || null,
      motif,
      statut: "attente",
    });
    if (error) { toast("Impossible d'envoyer la demande : " + error.message, "erreur"); return; }
    toast(`Demande de suppression de ${membre.nom} envoyée au pasteur pour validation.`, "succes");
  }

  const ETAPES_CONVERSION = ["accueil", "classe", "baptise", "integre"];
  const LIBELLES_ETAPES = { accueil: "Accueil", classe: "Classe de baptême", baptise: "Baptisé(e)", integre: "Intégré(e)" };

  async function avancerEtape() {
    const indexActuel = ETAPES_CONVERSION.indexOf(membre.etape_conversion || "accueil");
    if (indexActuel >= ETAPES_CONVERSION.length - 1) return;
    const nouvelleEtape = ETAPES_CONVERSION[indexActuel + 1];
    await supabase.from("membres").update({ etape_conversion: nouvelleEtape }).eq("id", membre.id);
    if (nouvelleEtape === "integre") {
      setConfettiActif(true);
      toast(`🎉 ${membre.nom} a atteint la fin de son parcours d'intégration !`, "succes");
    }
    if (onMisAJour) onMisAJour();
  }
  const [visites, setVisites] = useState([]);
  const [chargementVisites, setChargementVisites] = useState(false);
  const [resultatVisite, setResultatVisite] = useState("positive");
  const [noteVisite, setNoteVisite] = useState("");

  const moyenne = moyenneSante(derniereSante);

  useEffect(() => {
    if (ouvert && sousOnglet === "visites") chargerVisites();
  }, [ouvert, sousOnglet]);

  async function chargerVisites() {
    setChargementVisites(true);
    const { data } = await supabase.from("visites").select("*").eq("membre_id", membre.id).order("date", { ascending: false });
    setVisites(data || []);
    setChargementVisites(false);
  }

  async function enregistrer() {
    await supabase.from("sante_spirituelle").insert({ membre_id: membre.id, ...valeurs });
    setSauvegarde(true);
    onSauvegarde();
    setTimeout(() => setSauvegarde(false), 2000);
  }

  async function enregistrerVisite() {
    if (!noteVisite.trim()) return;
    await supabase.from("visites").insert({ membre_id: membre.id, resultat: resultatVisite, note: noteVisite.trim(), auteur_id: compte?.id });
    setNoteVisite("");
    chargerVisites();
  }

  function libelleResultat(r) {
    if (r === "positive") return "✓ Positive";
    if (r === "mitigee") return "◐ Mitigée";
    return "✗ Sans suite";
  }

  function couleurResultat(r) {
    if (r === "positive") return GOLD_LIGHT;
    if (r === "mitigee") return "#e8c25a";
    return RED_LIGHT;
  }

  function initiales(nomComplet) {
    return nomComplet.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }

  async function surChangerPhoto(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    try {
      const dataUrl = await redimensionnerPhoto(fichier);
      const { error } = await supabase.from("membres").update({ photo: dataUrl }).eq("id", membre.id);
      if (error) {
        toast("La photo n'a pas pu être enregistrée : " + error.message, "erreur");
        return;
      }
      if (onMisAJour) onMisAJour();
    } catch (err) {
      toast("Impossible de traiter cette photo : " + err.message, "erreur");
    }
  }

  async function enregistrerInfosMembre() {
    if (!editNom.trim() || !editTelephone.trim()) { toast("Le nom et le téléphone ne peuvent pas être vides.", "erreur"); return; }
    setEnregistrementInfos(true);
    const { error } = await supabase.from("membres").update({
      nom: editNom.trim(),
      telephone: editTelephone.trim(),
      quartier: editQuartier.trim() || null,
      date_naissance: editDateNaissance || null,
    }).eq("id", membre.id);
    setEnregistrementInfos(false);
    if (error) { toast("Impossible d'enregistrer : " + error.message, "erreur"); return; }
    toast(`✓ Informations de ${editNom.trim()} mises à jour.`, "succes");
    if (onMisAJour) onMisAJour();
  }

  function estAnniversaireProche(dateNaissance) {
    if (!dateNaissance) return false;
    const aujourdHui = new Date();
    const anniv = new Date(dateNaissance);
    anniv.setFullYear(aujourdHui.getFullYear());
    const diffJours = Math.round((anniv - new Date(aujourdHui.toDateString())) / 86400000);
    return diffJours >= 0 && diffJours <= 7;
  }

  return (
    <div style={cardStyle}>
      <button
 className="btn-app"
 onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: CREAM, textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          {membre.photo ? (
            <img src={membre.photo} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", flexShrink: 0, border: `1px solid ${TEAL_600}` }} />
          ) : (
            <span style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: TEAL_700, color: GOLD_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {initiales(membre.nom)}
            </span>
          )}
          <div>
          <p style={{ fontWeight: 600 }}>{membre.nom}</p>
          {membre.telephone && (
            <a title="Appeler" href={`tel:${membre.telephone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: "#a9d6cf", textDecoration: "none" }}>
              📞 {membre.telephone}
            </a>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {membre.nouveau_converti && (
              <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                🌱 {LIBELLES_ETAPES[membre.etape_conversion || "accueil"]}
              </span>
            )}
            {regularite?.tauxRegularite !== null && regularite?.tauxRegularite !== undefined && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", backgroundColor: TEAL_700, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                📊 {regularite.tauxRegularite}% de présence
              </span>
            )}
            {regularite?.absencesConsecutives >= 2 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", backgroundColor: RED_LIGHT, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                ⚠️ {regularite.absencesConsecutives} absences — Visite à faire
              </span>
            )}
            {regularite?.presencesConsecutives >= 4 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                ⭐ Régulier ({regularite.presencesConsecutives})
              </span>
            )}
            {estAnniversaireProche(membre.date_naissance) && (
              <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: "#E8CA4A", borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                🎂 Anniversaire bientôt
              </span>
            )}
          </div>
        </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: couleurScore(moyenne) }}>
            {moyenne !== null ? `Santé ${moyenne}/10` : "Non évaluée"}
          </span>
          <span style={{ color: "#a9d6cf" }}>{ouvert ? "▲" : "▼"}</span>
        </div>
      </button>

      {ouvert && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${TEAL_700}` }}>
          <div style={{ ...cardStyle, marginBottom: 14, padding: 14 }}>
            <p style={{ fontWeight: 600, fontSize: 12, color: GOLD_LIGHT, marginBottom: 10 }}>✏️ Informations du membre</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 10, color: "#a9d6cf", display: "block", marginBottom: 2 }}>Nom complet</label>
                  <input
                    value={editNom}
                    onChange={e => setEditNom(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: "100%", padding: 8, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 10, color: "#a9d6cf", display: "block", marginBottom: 2 }}>Téléphone</label>
                  <input
                    value={editTelephone}
                    onChange={e => setEditTelephone(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: "100%", padding: 8, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 10, color: "#a9d6cf", display: "block", marginBottom: 2 }}>Quartier</label>
                  <input
                    value={editQuartier}
                    onChange={e => setEditQuartier(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Non renseigné"
                    style={{ width: "100%", padding: 8, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 10, color: "#a9d6cf", display: "block", marginBottom: 2 }}>🎂 Date de naissance (jour et mois)</label>
                  <SelecteurJourMois value={editDateNaissance} onChange={setEditDateNaissance} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                <button
                  className="btn-app"
                  disabled={enregistrementInfos}
                  onClick={e => { e.stopPropagation(); enregistrerInfosMembre(); }}
                  style={{ fontSize: 12, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}
                >
                  {enregistrementInfos ? "…" : "💾 Enregistrer les modifications"}
                </button>
                <label style={{ display: "inline-block", fontSize: 11, color: GOLD_LIGHT, cursor: "pointer", border: `1px solid ${TEAL_600}`, borderRadius: 8, padding: "6px 10px" }}>
                  📷 {membre.photo ? "Changer la photo" : "Ajouter une photo"}
                  <input type="file" accept="image/*" onChange={surChangerPhoto} style={{ display: "none" }} />
                </label>
                <button
                  className="btn-app"
                  onClick={e => { e.stopPropagation(); setDemandeSuppressionOuverte(true); }}
                  style={{ fontSize: 11, fontWeight: 700, color: RED_LIGHT, background: "none", border: `1px solid ${RED_LIGHT}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                >
                  🗑️ Demander la suppression
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button
 className="btn-app"
 onClick={() => setSousOnglet("sante")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "sante" ? TEAL_700 : TEAL_900, color: sousOnglet === "sante" ? GOLD_LIGHT : "#cdeae4" }}>
              Santé spirituelle
            </button>
            <button
 className="btn-app"
 onClick={() => setSousOnglet("visites")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "visites" ? TEAL_700 : TEAL_900, color: sousOnglet === "visites" ? GOLD_LIGHT : "#cdeae4" }}>
              Journal des visites
            </button>
            {membre.nouveau_converti && (
              <button
 className="btn-app"
 onClick={() => setSousOnglet("parcours")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "parcours" ? TEAL_700 : TEAL_900, color: sousOnglet === "parcours" ? GOLD_LIGHT : "#cdeae4" }}>
                Parcours
              </button>
            )}
          </div>

          {sousOnglet === "sante" ? (
            <>
              {historiquePresence && historiquePresence.length > 0 && (
                <div style={{ marginBottom: 16, padding: 10, backgroundColor: TEAL_900, borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: "#a9d6cf", marginBottom: 8 }}>Présence — 8 derniers dimanches</p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 36 }}>
                    {historiquePresence.map((h, i) => (
                      <div
                        key={i}
                        title={`${new Date(h.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${h.present ? "présent" : "absent"}`}
                        style={{ flex: 1, height: h.present ? 36 : 10, backgroundColor: h.present ? GOLD : RED_LIGHT, borderRadius: 3, opacity: h.present ? 1 : 0.6 }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 10 }}>Évalue chaque dimension de 0 (faible) à 10 (excellent).</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {DIMENSIONS_SANTE.map(([cle, label]) => (
                  <div key={cle}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 700, color: GOLD_LIGHT }}>{valeurs[cle]}</span>
                    </div>
                    <input
                      type="range" min="0" max="10" value={valeurs[cle]}
                      onChange={e => setValeurs(prev => ({ ...prev, [cle]: Number(e.target.value) }))}
                      style={{ width: "100%" }}
                    />
                  </div>
                ))}
              </div>
              <button
 className="btn-app"
 onClick={enregistrer} style={{ marginTop: 14, padding: "8px 16px", borderRadius: 8, backgroundColor: sauvegarde ? TEAL_700 : GOLD, color: sauvegarde ? GOLD_LIGHT : TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                {sauvegarde ? "✓ Enregistré" : "Enregistrer"}
              </button>
            </>
          ) : sousOnglet === "visites" ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 8 }}>Enregistrer une nouvelle visite</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {["positive", "mitigee", "sans_suite"].map(r => (
                    <button key={r} onClick={() => setResultatVisite(r)} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: resultatVisite === r ? GOLD : TEAL_900, color: resultatVisite === r ? TEAL_950 : "#cdeae4" }}>
                      {libelleResultat(r)}
                    </button>
                  ))}
                </div>
                <textarea value={noteVisite} onChange={e => setNoteVisite(e.target.value)} rows={2} placeholder="Note sur la visite..." style={{ width: "100%", padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
                <button
 className="btn-app"
 onClick={enregistrerVisite} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Enregistrer la visite
                </button>
              </div>

              <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 8 }}>Historique</p>
              {chargementVisites ? (
                <p style={{ fontSize: 12, color: "#a9d6cf" }}>Chargement…</p>
              ) : visites.length === 0 ? (
                <p style={{ fontSize: 12, color: "#a9d6cf" }}>Aucune visite enregistrée pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {visites.map(v => (
                    <div key={v.id} style={{ backgroundColor: TEAL_900, borderRadius: 8, padding: 10, border: `1px solid ${TEAL_700}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: couleurResultat(v.resultat) }}>{libelleResultat(v.resultat)}</span>
                        <span style={{ fontSize: 10, color: "#a9d6cf" }}>{new Date(v.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      {v.note && <p style={{ fontSize: 12 }}>{v.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 14 }}>Étapes du parcours d'intégration de ce nouveau converti.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {ETAPES_CONVERSION.map((etape, i) => {
                  const indexActuel = ETAPES_CONVERSION.indexOf(membre.etape_conversion || "accueil");
                  const atteinte = i <= indexActuel;
                  const estActuelle = i === indexActuel;
                  return (
                    <div key={etape} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                      backgroundColor: estActuelle ? "rgba(208,175,28,0.15)" : "transparent",
                      border: `1px solid ${estActuelle ? GOLD : atteinte ? TEAL_600 : TEAL_700}`,
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        backgroundColor: atteinte ? GOLD : TEAL_900, color: atteinte ? TEAL_950 : "#a9d6cf",
                      }}>
                        {atteinte ? "✓" : i + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: estActuelle ? 700 : 400, color: atteinte ? CREAM : "#a9d6cf" }}>
                        {LIBELLES_ETAPES[etape]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {(membre.etape_conversion || "accueil") !== "integre" ? (
                <button
 className="btn-app"
 onClick={avancerEtape} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Faire avancer à l'étape suivante
                </button>
              ) : (
                <p style={{ fontSize: 13, color: GOLD_LIGHT, fontWeight: 700 }}>🎉 Parcours d'intégration complet</p>
              )}
            </>
          )}
        </div>
      )}
      {demandeSuppressionOuverte && (
        <BoiteDemandeSuppression
          nomMembre={membre.nom}
          onEnvoyer={envoyerDemandeSuppression}
          onAnnuler={() => setDemandeSuppressionOuverte(false)}
        />
      )}
      <Confettis actif={confettiActif} onFin={() => setConfettiActif(false)} />
    </div>
  );
}

/* --------------------------- Demander une responsabilité --------------------------- */

function DemanderResponsabilite({ compte, tribus, departements, mesAssignations, onDemandeEnvoyee, cardStyle }) {
  const [roleDemande, setRoleDemande] = useState("gem");
  const [parentType, setParentType] = useState("tribu");
  const [tribuId, setTribuId] = useState(tribus[0]?.id || "");
  const [departementId, setDepartementId] = useState(departements[0]?.id || "");
  const [nomGem, setNomGem] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoye, setEnvoye] = useState(false);

  const aDejaUneResponsabilite = mesAssignations.some(a => a.statut === "actif");
  const demandeEnAttente = mesAssignations.find(a => a.statut === "attente");
  const demandeRefusee = mesAssignations.find(a => a.statut === "refusee" && !mesAssignations.some(x => x.statut !== "refusee"));

  async function envoyer() {
    setErreur("");
    if (roleDemande === "gem" && !nomGem.trim()) { setErreur("Merci de donner un nom au GEM souhaité."); return; }
    const payload = {
      compte_id: compte.id,
      role_demande: roleDemande,
      statut: "attente",
      tribu_id: roleDemande === "tribu_resp" ? tribuId : (roleDemande === "gem" && parentType === "tribu" ? tribuId : null),
      departement_id: roleDemande === "departement_resp" ? departementId : (roleDemande === "gem" && parentType === "departement" ? departementId : null),
      gem_nom_demande: roleDemande === "gem" ? nomGem.trim() : null,
    };
    const { error } = await supabase.from("assignations").insert(payload);
    if (error) { setErreur(error.message); return; }
    setEnvoye(true);
    toast("✓ Ta demande a bien été envoyée — elle est en attente de validation par le pasteur ou un assistant.", "succes");
    onDemandeEnvoyee();
  }

  if (demandeEnAttente || envoye) {
    return (
      <div style={{ ...cardStyle, maxWidth: 480 }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>Demande envoyée ✅</p>
        <p style={{ fontSize: 13, color: "#a9d6cf" }}>
          Ta demande de responsabilité a bien été enregistrée. Le Pasteur Dimitri Koffi, ou un assistant désigné, doit encore la valider{aDejaUneResponsabilite ? " avant qu'elle apparaisse dans ton espace" : " avant que tu puisses accéder à ton espace"}. Reviens un peu plus tard — cet écran se mettra à jour automatiquement une fois validée.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{aDejaUneResponsabilite ? "Demander un rôle supplémentaire" : "Demander une responsabilité"}</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>
        {aDejaUneResponsabilite
          ? "Tu peux demander une responsabilité supplémentaire sur ton compte existant — pas besoin de créer un nouveau compte. Une fois validée, tu la retrouveras via le sélecteur dans \"Mon espace\"."
          : "Ton compte n'a pas encore de responsabilité active. Choisis ce que tu souhaites gérer — le pasteur validera ta demande."}
      </p>
      {demandeRefusee && (
        <p style={{ fontSize: 12, color: RED_LIGHT, marginBottom: 12 }}>Ta précédente demande a été refusée. Tu peux en soumettre une nouvelle.</p>
      )}

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <SelecteurRole
          roleDemande={roleDemande} setRoleDemande={setRoleDemande}
          parentType={parentType} setParentType={setParentType}
          tribuId={tribuId} setTribuId={setTribuId}
          departementId={departementId} setDepartementId={setDepartementId}
          nomGem={nomGem} setNomGem={setNomGem}
          tribus={tribus} departements={departements}
        />

        {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}

        <button
 className="btn-app"
 onClick={envoyer} style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>
          Envoyer la demande
        </button>
      </div>
    </div>
  );
}

function SelecteurRole({ roleDemande, setRoleDemande, parentType, setParentType, tribuId, setTribuId, departementId, setDepartementId, nomGem, setNomGem, tribus, departements }) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["gem", "Responsable GEM", "Tu gères un groupe précis (GEM) : ses membres, leur présence chaque dimanche, et leur santé spirituelle."],
          ["departement_resp", "Responsable de département", "Tu supervises tous les GEM d'un département entier, et tu peux en créer de nouveaux selon les besoins."],
          ["tribu_resp", "Patriarche / Matriarche", "Tu supervises tous les GEM d'une tribu entière, et tu peux en créer de nouveaux selon les besoins."],
        ].map(([val, label, description]) => (
          <button
            key={val}
            onClick={() => setRoleDemande(val)}
            style={{
              textAlign: "left", padding: 14, borderRadius: 10, cursor: "pointer",
              backgroundColor: roleDemande === val ? "rgba(208,175,28,0.15)" : TEAL_900,
              border: `1px solid ${roleDemande === val ? GOLD : TEAL_600}`,
            }}
          >
            <p style={{ fontWeight: 700, fontSize: 14, color: roleDemande === val ? GOLD_LIGHT : CREAM, marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 12, color: "#a9d6cf", lineHeight: 1.4 }}>{description}</p>
          </button>
        ))}
      </div>

      {roleDemande === "gem" && (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <button
 className="btn-app"
 onClick={() => setParentType("tribu")} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: parentType === "tribu" ? TEAL_700 : TEAL_900, color: CREAM }}>GEM d'une tribu</button>
            <button
 className="btn-app"
 onClick={() => setParentType("departement")} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: parentType === "departement" ? TEAL_700 : TEAL_900, color: CREAM }}>GEM d'un département</button>
          </div>
          {parentType === "tribu" ? (
            <select value={tribuId} onChange={e => setTribuId(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
              {tribus.map(t => <option key={t.id} value={t.id}>Tribu de {t.nom}</option>)}
            </select>
          ) : (
            <select value={departementId} onChange={e => setDepartementId(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
              {departements.map(d => <option key={d.id} value={d.id}>Département {d.nom}</option>)}
            </select>
          )}
          <input value={nomGem} onChange={e => setNomGem(e.target.value)} placeholder="Nom du GEM" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
        </>
      )}

      {roleDemande === "departement_resp" && (
        <select value={departementId} onChange={e => setDepartementId(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
          {departements.map(d => <option key={d.id} value={d.id}>Département {d.nom}</option>)}
        </select>
      )}

      {roleDemande === "tribu_resp" && (
        <select value={tribuId} onChange={e => setTribuId(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
          {tribus.map(t => <option key={t.id} value={t.id}>Tribu de {t.nom}</option>)}
        </select>
      )}
    </>
  );
}

/* --------------------------- Page Demandes (pasteur) --------------------------- */

function PageDemandes({ tribus, departements, compte, onTraite, cardStyle }) {
  const [demandes, setDemandes] = useState([]);
  const [comptesParId, setComptesParId] = useState({});
  const [chargement, setChargement] = useState(true);

  useEffect(() => { chargerDemandes(); }, []);

  async function chargerDemandes() {
    setChargement(true);
    const { data: d } = await supabase.from("assignations").select("*").eq("statut", "attente").order("date_demande");
    const idsComptes = [...new Set((d || []).map(x => x.compte_id))];
    let map = {};
    if (idsComptes.length > 0) {
      const { data: c } = await supabase.from("comptes").select("*").in("id", idsComptes);
      (c || []).forEach(compte => { map[compte.id] = compte; });
    }
    setDemandes(d || []);
    setComptesParId(map);
    setChargement(false);
  }

  function libelleDemande(d) {
    if (d.role_demande === "gem") {
      const parent = d.tribu_id ? tribus.find(t => t.id === d.tribu_id)?.nom : departements.find(dep => dep.id === d.departement_id)?.nom;
      return `Responsable GEM "${d.gem_nom_demande}" — ${parent || ""}`;
    }
    if (d.role_demande === "departement_resp") return `Responsable de département — ${departements.find(dep => dep.id === d.departement_id)?.nom || ""}`;
    return `Patriarche/Matriarche — Tribu de ${tribus.find(t => t.id === d.tribu_id)?.nom || ""}`;
  }

  async function valider(d) {
    let gemId = null;
    if (d.role_demande === "gem") {
      const { data: nouveauGem, error } = await supabase.from("gems").insert({
        nom: d.gem_nom_demande,
        type: d.tribu_id ? "tribu" : "departement",
        tribu_id: d.tribu_id,
        departement_id: d.departement_id,
      }).select().single();
      if (error) { toast(error.message, "erreur"); return; }
      gemId = nouveauGem.id;
    }
    const { error: err2 } = await supabase.from("assignations").update({ statut: "actif", gem_id: gemId, valide_par: compte.id }).eq("id", d.id);
    if (err2) { toast(err2.message, "erreur"); return; }
    chargerDemandes();
    onTraite();
  }

  async function refuser(d) {
    await supabase.from("assignations").update({ statut: "refusee", valide_par: compte.id }).eq("id", d.id);
    chargerDemandes();
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Demandes en attente ({demandes.length})</h2>
      {chargement ? (
        <Chargement />
      ) : demandes.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucune demande en attente pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {demandes.map(d => (
            <div key={d.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{comptesParId[d.compte_id]?.nom || "…"}</p>
                <p style={{ fontSize: 12, color: "#a9d6cf" }}>{libelleDemande(d)}</p>
                <p style={{ fontSize: 11, color: "#a9d6cf" }}>{comptesParId[d.compte_id]?.telephone}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
 className="btn-app"
 onClick={() => valider(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Valider</button>
                <button
 className="btn-app"
 onClick={() => refuser(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: "transparent", color: RED_LIGHT, border: `1px solid ${RED_LIGHT}`, cursor: "pointer", fontSize: 12 }}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Page Corbeille (pasteur) --------------------------- */

function PageCorbeille({ compte, gems, cardStyle, onTraite }) {
  const [entrees, setEntrees] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(null);

  useEffect(() => { chargerCorbeille(); }, []);

  async function chargerCorbeille() {
    setChargement(true);
    const ilYa30Jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // Supprime définitivement les entrées de plus de 30 jours, puis affiche le reste.
    await supabase.from("membres_corbeille").delete().lt("supprime_le", ilYa30Jours);
    const { data } = await supabase.from("membres_corbeille").select("*").order("supprime_le", { ascending: false });
    setEntrees(data || []);
    setChargement(false);
  }

  function nomGem(gemId) {
    return gems.find(g => g.id === gemId)?.nom || "GEM supprimé";
  }

  function joursRestants(supprimeLe) {
    const diff = 30 - Math.floor((Date.now() - new Date(supprimeLe).getTime()) / 86400000);
    return Math.max(0, diff);
  }

  async function restaurer(entree) {
    setEnCours(entree.id);
    const gemExiste = gems.some(g => g.id === entree.gem_id);
    if (!gemExiste) {
      toast("Impossible de restaurer : le GEM d'origine n'existe plus. Contacte le support si besoin.", "erreur");
      setEnCours(null);
      return;
    }
    const { error } = await supabase.from("membres").insert({
      gem_id: entree.gem_id, nom: entree.nom, telephone: entree.telephone, photo: entree.photo,
      date_naissance: entree.date_naissance, quartier: entree.quartier,
      nouveau_converti: entree.nouveau_converti, etape_conversion: entree.etape_conversion,
    });
    if (error) { toast("Erreur lors de la restauration : " + error.message, "erreur"); setEnCours(null); return; }
    await supabase.from("membres_corbeille").delete().eq("id", entree.id);
    setEnCours(null);
    toast(`${entree.nom} a été restauré avec succès.`, "succes");
    chargerCorbeille();
    if (onTraite) onTraite();
  }

  async function supprimerDefinitivement(entree) {
    setEnCours(entree.id);
    await supabase.from("membres_corbeille").delete().eq("id", entree.id);
    setEnCours(null);
    toast(`${entree.nom} a été effacé définitivement.`, "info");
    chargerCorbeille();
  }

  function exporterJournal() {
    const entetes = ["Nom", "Telephone", "GEM", "Motif", "Supprime_le"];
    const lignes = entrees.map(e => ({
      Nom: e.nom, Telephone: e.telephone || "", GEM: nomGem(e.gem_id),
      Motif: e.motif || "", Supprime_le: new Date(e.supprime_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    }));
    const ligneEntete = entetes.join(",");
    const corps = lignes.map(l => entetes.map(e => `"${String(l[e] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + ligneEntete + "\n" + corps], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-corbeille-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🗑️ Corbeille ({entrees.length})</h2>
        {entrees.length > 0 && (
          <button className="btn-app" onClick={exporterJournal} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            📊 Exporter le journal (CSV)
          </button>
        )}
      </div>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>
        Les membres supprimés restent récupérables ici pendant 30 jours avant d'être effacés définitivement.
      </p>
      {chargement ? (
        <Chargement />
      ) : entrees.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>La corbeille est vide.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entrees.map(e => (
            <div key={e.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 2 }}>{e.nom}</p>
                  <p style={{ fontSize: 12, color: "#a9d6cf" }}>{nomGem(e.gem_id)} · {e.telephone}</p>
                  {e.motif && <p style={{ fontSize: 12, color: "#e8c25a", marginTop: 4 }}>Motif de suppression : {e.motif}</p>}
                  <p style={{ fontSize: 11, color: RED_LIGHT, marginTop: 4, fontWeight: 700 }}>
                    ⏳ Effacement définitif dans {joursRestants(e.supprime_le)} jour(s)
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-app"
                    disabled={enCours === e.id}
                    onClick={() => restaurer(e)}
                    style={{ padding: "10px 16px", borderRadius: 10, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                  >
                    ↩️ Restaurer
                  </button>
                  <button
                    className="btn-app"
                    disabled={enCours === e.id}
                    onClick={() => supprimerDefinitivement(e)}
                    style={{ padding: "10px 16px", borderRadius: 10, backgroundColor: "transparent", color: RED_LIGHT, border: `1px solid ${RED_LIGHT}`, cursor: "pointer", fontSize: 12 }}
                  >
                    Effacer maintenant
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Page Mots de passe oubliés (pasteur) --------------------------- */

/* --------------------------- Page Suppressions de membres (pasteur) --------------------------- */

/* --------------------------- Page Aide --------------------------- */

const SECTIONS_AIDE = [
  {
    titre: "👤 Gérer les membres de mon GEM",
    items: [
      ["Ajouter un membre", "Ouvre ton GEM → remplis nom et téléphone (obligatoires) → photo, date de naissance et quartier sont optionnels → clique \"Ajouter\". L'appli te préviendra si un numéro très proche existe déjà ailleurs."],
      ["Importer plusieurs membres d'un coup", "Bouton \"📂 Importer depuis un fichier (CSV)\" au-dessus du formulaire d'ajout. Le fichier doit avoir des colonnes nom et telephone (quartier optionnel), séparées par des virgules."],
      ["Modifier les informations d'un membre", "Clique sur son nom pour déplier sa fiche → modifie les champs dans \"✏️ Informations du membre\" → clique \"💾 Enregistrer les modifications\"."],
      ["Pointer la présence du dimanche", "Coche la case à côté de chaque membre présent. Pour un absent, tu peux préciser un motif juste en dessous."],
      ["Suivre la santé spirituelle", "Sur la fiche d'un membre, onglet \"Santé spirituelle\" → ajuste les 6 curseurs → \"Enregistrer\"."],
      ["Suivre un nouveau converti", "Coche \"Nouveau converti\" à l'ajout du membre. Un onglet \"Parcours\" apparaît alors sur sa fiche pour faire avancer ses étapes (Accueil → Classe de baptême → Baptisé → Intégré)."],
      ["Demander la suppression d'un membre", "Sur sa fiche, bouton \"🗑️ Demander la suppression\" → indique un motif obligatoire. La suppression n'est effective qu'après validation du pasteur."],
    ],
  },
  {
    titre: "📋 Activités de la semaine",
    items: [
      ["Remplir le rapport hebdomadaire", "Dans ton GEM, onglet \"📋 Activités de la semaine\" → choisis la bonne semaine dans le menu déroulant → coche les membres visités/appelés, renseigne prière/jeûne/agapé/évangélisation → clique \"Valider le rapport de la semaine\"."],
      ["Pourquoi valider ?", "Tant que le rapport n'est pas validé, il n'apparaît pas comme complété dans les statistiques du pasteur, même si tu as rempli des champs."],
    ],
  },
  {
    titre: "🔍 Retrouver une information",
    items: [
      ["Rechercher un membre", "Barre de recherche en haut de chaque page (icône 🔍) — tape un nom ou un numéro, ça t'amène directement à sa fiche, même s'il est dans un autre GEM."],
      ["Voir tous les membres d'un département ou d'une tribu", "Va dans \"Tribus\" ou \"Départements\" → clique \"👥 Tous les membres\" sur la carte concernée."],
    ],
  },
  {
    titre: "🎂 Anniversaires et rappels",
    items: [
      ["Voir les anniversaires à venir", "Section \"🎂 Anniversaires à venir\" sur le Tableau de bord (ou \"Mon espace\" pour les responsables de département/tribu) — les 14 prochains jours."],
      ["Rappel de pointage", "Une bannière dorée apparaît automatiquement si le pointage d'un dimanche récent n'est pas terminé."],
    ],
  },
];

const SECTIONS_AIDE_PASTEUR = [
  {
    titre: "✅ Gérer les demandes",
    items: [
      ["Valider une nouvelle responsabilité", "Page \"Demandes\" — un nouveau responsable apparaît ici après son inscription, en attente de validation."],
      ["Attribuer un rôle directement", "\"Rôles & Accès\" → \"Attribuer un rôle\" — choisis un compte déjà inscrit sans rôle actif, sans attendre sa demande."],
      ["Créer un compte pour quelqu'un", "\"Rôles & Accès\" → \"Nouveau compte + rôle\" — utile pour une personne qui n'est pas encore inscrite elle-même."],
      ["Désigner un assistant", "\"Rôles & Accès\" → \"Assistants désignés\" (visible uniquement par le pasteur) — un assistant a les mêmes droits que toi."],
      ["Approuver une suppression de membre", "Page \"Suppressions\" — chaque demande affiche le motif ; \"Approuver\" supprime réellement (récupérable 30 jours dans la Corbeille), \"Refuser\" annule la demande."],
      ["Réinitialiser un mot de passe oublié", "Page \"Mots de passe\" — choisis un nouveau mot de passe pour la personne et transmets-le lui directement (téléphone, WhatsApp...)."],
    ],
  },
  {
    titre: "📊 Rapports et suivi global",
    items: [
      ["Rapport hebdomadaire / mensuel / annuel", "Page \"Rapports\" — 3 vues + un onglet \"📋 Activités\" pour le suivi des rapports hebdomadaires de chaque GEM."],
      ["Classements et meilleur GEM", "Vue mensuelle ou annuelle de \"Rapports\" — classements par présence, santé, activités, suivi des âmes, et un trophée 🏆 pour le GEM du mois/de l'année."],
      ["Courbes d'évolution", "Page \"Historique\" — présence, santé spirituelle, activités et croissance numérique de l'église, mois après mois."],
      ["Priorités pastorales", "Sur le Tableau de bord — liste automatique des membres en absence répétée (2+ dimanches), avec appel et WhatsApp en un clic."],
      ["Exporter des données", "Boutons \"📊 Exporter CSV\" (ouvrable dans Excel) et \"🖨️ Imprimer / PDF\" présents sur les pages de rapports. \"Exporter toutes les données (JSON)\" sur le Tableau de bord pour une sauvegarde complète."],
    ],
  },
  {
    titre: "🗑️ Corbeille et sécurité",
    items: [
      ["Récupérer un membre supprimé", "Page \"🗑️ Corbeille\" — chaque suppression reste récupérable 30 jours, avec le motif indiqué."],
      ["Verrouillage automatique", "Si l'application reste plus de 5 minutes sans être utilisée, elle redemande le mot de passe avant de continuer — utile si ton téléphone est repris par quelqu'un d'autre."],
      ["Déconnexion automatique", "Après 30 minutes d'inactivité sur un même appareil, la déconnexion se fait automatiquement."],
    ],
  },
  {
    titre: "📅 Communication",
    items: [
      ["Envoyer un message à tout le monde", "\"Messagerie\" → onglet \"Messages du pasteur\"."],
      ["Créer un événement", "\"Calendrier\" → \"+ Nouvel événement\" — chacun peut ensuite l'ajouter à son propre calendrier."],
    ],
  },
];

function PageAide({ estPasteur, cardStyle }) {
  const [ouvert, setOuvert] = useState(null); // "sectionIndex-itemIndex"
  const toutesLesSections = estPasteur ? [...SECTIONS_AIDE, ...SECTIONS_AIDE_PASTEUR] : SECTIONS_AIDE;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>❓ Aide</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 24 }}>
        Un guide rapide pour utiliser l'application. Clique sur une question pour voir la réponse.
      </p>
      {toutesLesSections.map((section, si) => (
        <div key={si} style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: GOLD_LIGHT }}>{section.titre}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {section.items.map(([question, reponse], ii) => {
              const cle = `${si}-${ii}`;
              const estOuvert = ouvert === cle;
              return (
                <div key={ii} style={cardStyle}>
                  <button
                    className="btn-app"
                    onClick={() => setOuvert(estOuvert ? null : cle)}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: CREAM, textAlign: "left", fontSize: 13, fontWeight: 600 }}
                  >
                    <span>{question}</span>
                    <span style={{ color: "#a9d6cf", flexShrink: 0, marginLeft: 10 }}>{estOuvert ? "▲" : "▼"}</span>
                  </button>
                  {estOuvert && (
                    <p className="fade-in" style={{ fontSize: 13, color: "#cdeae4", lineHeight: 1.5, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${TEAL_700}` }}>
                      {reponse}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ ...cardStyle, textAlign: "center", marginTop: 8 }}>
        <p style={{ fontSize: 13, color: "#cdeae4", margin: 0 }}>
          Une question sans réponse ici ? Contacte le pasteur ou un assistant directement via la Messagerie.
        </p>
      </div>
    </div>
  );
}

/* --------------------------- Page Mon compte --------------------------- */

/* --------------------------- Page Analyse intelligente --------------------------- */

/* --------------------------- Santé spirituelle des responsables (pasteur) --------------------------- */

function PageSanteResponsables({ tousLesComptes, gems, tribus, departements, responsablesParGem, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [santeParCompte, setSanteParCompte] = useState({}); // { compte_id: derniereFiche }
  const [historiqueParCompte, setHistoriqueParCompte] = useState({}); // { compte_id: [fiches] }
  const [evolutionMoyenne, setEvolutionMoyenne] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [responsableSelectionne, setResponsableSelectionne] = useState(null);

  useEffect(() => { chargerToutesLesFiches(); }, []);

  async function chargerToutesLesFiches() {
    setChargement(true);
    const { data } = await supabase.from("sante_spirituelle_responsables").select("*").order("date_maj", { ascending: false });

    const derniere = {};
    const historique = {};
    (data || []).forEach(s => {
      if (!derniere[s.compte_id]) derniere[s.compte_id] = s;
      if (!historique[s.compte_id]) historique[s.compte_id] = [];
      historique[s.compte_id].push(s);
    });
    setSanteParCompte(derniere);
    setHistoriqueParCompte(historique);

    // Courbe : moyenne mensuelle sur les 6 derniers mois
    const parMois = {};
    (data || []).forEach(s => {
      const cle = s.date_maj.slice(0, 7);
      const moy = moyenneSante(s);
      if (moy === null) return;
      if (!parMois[cle]) parMois[cle] = [];
      parMois[cle].push(moy);
    });
    const moisTries = Object.keys(parMois).sort().slice(-6);
    setEvolutionMoyenne(moisTries.map(mois => ({
      mois, moyenne: Math.round((parMois[mois].reduce((a, b) => a + b, 0) / parMois[mois].length) * 10) / 10,
    })));

    setChargement(false);
  }

  function libelleMois(cle) {
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  function infosResponsable(compte) {
    const gemId = Object.keys(responsablesParGem || {}).find(id => responsablesParGem[id] === compte.nom);
    const gem = gemId ? gems.find(g => g.id === gemId) : null;
    let rattachement = "Aucune responsabilité GEM active";
    if (gem) {
      if (gem.tribu_id) rattachement = `GEM "${gem.nom}" — Tribu de ${tribus.find(t => t.id === gem.tribu_id)?.nom || "?"}`;
      else if (gem.departement_id) rattachement = `GEM "${gem.nom}" — Département ${departements.find(d => d.id === gem.departement_id)?.nom || "?"}`;
    }
    return rattachement;
  }

  const responsablesAvecFiche = (tousLesComptes || []).filter(c => santeParCompte[c.id]);
  const scoresValides = responsablesAvecFiche.map(c => moyenneSante(santeParCompte[c.id])).filter(s => s !== null);
  const moyenneGlobale = scoresValides.length > 0 ? Math.round((scoresValides.reduce((a, b) => a + b, 0) / scoresValides.length) * 10) / 10 : null;

  const resultatsRecherche = recherche.trim().length >= 1
    ? (tousLesComptes || []).filter(c => c.nom.toLowerCase().includes(recherche.toLowerCase()))
    : (tousLesComptes || []);

  const compteDetail = responsableSelectionne ? (tousLesComptes || []).find(c => c.id === responsableSelectionne) : null;
  const ficheDetail = compteDetail ? santeParCompte[compteDetail.id] : null;
  const historiqueDetail = compteDetail ? (historiqueParCompte[compteDetail.id] || []) : [];

  if (chargement) return <Chargement />;

  if (compteDetail) {
    return (
      <div>
        <button className="btn-app" onClick={() => setResponsableSelectionne(null)} style={{ background: "none", border: "none", color: "#a9d6cf", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour à la liste</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{compteDetail.nom}</h2>
        <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 4 }}>{compteDetail.role === "pasteur" ? "Pasteur" : compteDetail.assistant ? "Assistant désigné" : "Responsable"}</p>
        <p style={{ fontSize: 13, color: GOLD_LIGHT, marginBottom: 20 }}>{infosResponsable(compteDetail)}</p>

        {!ficheDetail ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucune fiche de santé spirituelle remplie pour l'instant.</p>
        ) : (
          <>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Dernière évaluation — {new Date(ficheDetail.date_maj).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DIMENSIONS_SANTE.map(([cle, label]) => (
                  <div key={cle} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#cdeae4" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: couleurScore(ficheDetail[cle]) }}>{ficheDetail[cle]}/10</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${TEAL_700}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Moyenne</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: couleurScore(moyenneSante(ficheDetail)) }}>{moyenneSante(ficheDetail)}/10</span>
                </div>
              </div>
            </div>
            {historiqueDetail.length > 1 && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📈 Courbe d'évolution — {compteDetail.nom}</p>
                <GraphiqueBarres
                  donnees={[...historiqueDetail].reverse().map(h => ({
                    libelle: new Date(h.date_maj).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                    valeur: moyenneSante(h),
                    texteAffiche: moyenneSante(h),
                    couleur: couleurScore(moyenneSante(h)),
                    infoBulle: `${new Date(h.date_maj).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} : ${moyenneSante(h)}/10`,
                  }))}
                />
              </div>
            )}
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Historique ({historiqueDetail.length} évaluation{historiqueDetail.length > 1 ? "s" : ""})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {historiqueDetail.map(h => (
                <div key={h.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#a9d6cf" }}>{new Date(h.date_maj).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: couleurScore(moyenneSante(h)) }}>{moyenneSante(h)}/10</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🌡️ Santé spirituelle des responsables</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>Suivi des fiches remplies chaque semaine par les responsables GEM, département et tribu.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Fiches remplies</p>
          <p style={{ fontSize: 24, fontWeight: 700 }}><NombreAnime valeur={responsablesAvecFiche.length} /> / {(tousLesComptes || []).length}</p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Moyenne générale</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: couleurScore(moyenneGlobale) }}>{moyenneGlobale !== null ? `${moyenneGlobale}/10` : "—"}</p>
        </div>
      </div>

      {evolutionMoyenne.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Évolution de la moyenne (6 derniers mois)</p>
          <GraphiqueBarres
            donnees={evolutionMoyenne.map(e => ({
              libelle: libelleMois(e.mois),
              valeur: e.moyenne,
              texteAffiche: e.moyenne,
              couleur: couleurScore(e.moyenne),
              infoBulle: `${libelleMois(e.mois)} : moyenne ${e.moyenne}/10`,
            }))}
          />
        </div>
      )}

      <input
        value={recherche}
        onChange={e => setRecherche(e.target.value)}
        placeholder="🔍 Rechercher un responsable par nom..."
        style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}`, marginBottom: 16, width: "100%", maxWidth: 320 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {resultatsRecherche.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun responsable trouvé.</p>
        ) : (
          resultatsRecherche.map(c => {
            const fiche = santeParCompte[c.id];
            const moyenne = fiche ? moyenneSante(fiche) : null;
            return (
              <button
                key={c.id}
                className="btn-app card-app"
                onClick={() => setResponsableSelectionne(c.id)}
                style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 2 }}>{c.nom}</p>
                  <p style={{ fontSize: 12, color: "#a9d6cf" }}>{c.role === "pasteur" ? "Pasteur" : c.assistant ? "Assistant désigné" : "Responsable"}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: moyenne !== null ? couleurScore(moyenne) : "#a9d6cf", backgroundColor: TEAL_900, borderRadius: 999, padding: "6px 12px" }}>
                  {moyenne !== null ? `${moyenne}/10` : "Aucune fiche"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function PageAnalyse({ gems, membres, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [tauxParMois, setTauxParMois] = useState([]);
  const [santeParMoisList, setSanteParMoisList] = useState([]);
  const [activiteParMoisList, setActiviteParMoisList] = useState([]);
  const [tendancesGems, setTendancesGems] = useState([]);
  const [membresEnDeclin, setMembresEnDeclin] = useState([]);
  const [croissanceRecente, setCroissanceRecente] = useState([]);
  const [periodes, setPeriodes] = useState(null); // { recente: [dates], precedente: [dates] }

  useEffect(() => { analyser(); }, []);

  function libelleMois(cle) {
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  function libelleDate(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  async function analyser() {
    setChargement(true);
    const [{ data: dimanchesTous }, { data: presences }, { data: sante }, { data: activites }, { data: membresAvecDate }, { data: departsApprouves }] = await Promise.all([
      supabase.from("dimanches").select("*").order("date", { ascending: true }).limit(200),
      supabase.from("presences").select("*"),
      supabase.from("sante_spirituelle").select("*"),
      supabase.from("activites_semaine").select("*").eq("valide", true),
      supabase.from("membres").select("id, created_at"),
      supabase.from("demandes_suppression_membre").select("*").eq("statut", "approuvee"),
    ]);

    // --- Graphique de contexte : évolution mensuelle sur 6 mois (vue d'ensemble) ---
    const moisDimanches = {};
    (dimanchesTous || []).forEach(d => {
      const cle = d.date.slice(0, 7);
      if (!moisDimanches[cle]) moisDimanches[cle] = [];
      moisDimanches[cle].push(d.id);
    });
    const moisTries = Object.keys(moisDimanches).sort().slice(-6);

    setTauxParMois(moisTries.map(mois => {
      const ids = moisDimanches[mois];
      const slots = ids.length * membres.length;
      const presents = (presences || []).filter(p => ids.includes(p.dimanche_id) && p.present).length;
      return { mois, taux: slots > 0 ? Math.round((presents / slots) * 100) : null };
    }).filter(x => x.taux !== null));

    const santeMoisMap = {};
    (sante || []).forEach(s => {
      const cle = s.date_maj.slice(0, 7);
      const moy = moyenneSante(s);
      if (moy === null) return;
      if (!santeMoisMap[cle]) santeMoisMap[cle] = [];
      santeMoisMap[cle].push(moy);
    });
    setSanteParMoisList(moisTries.map(mois => {
      const valeurs = santeMoisMap[mois] || [];
      return { mois, moyenne: valeurs.length > 0 ? Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 10) / 10 : null };
    }).filter(x => x.moyenne !== null));

    setActiviteParMoisList(moisTries.map(mois => {
      const ids = moisDimanches[mois];
      const attendu = ids.length * gems.length;
      const valides = (activites || []).filter(a => ids.includes(a.dimanche_id)).length;
      return { mois, taux: attendu > 0 ? Math.round((valides / attendu) * 100) : null };
    }).filter(x => x.taux !== null));

    // --- Analyse principale : fenêtre glissante de 4 semaines (4 derniers dimanches vs 4 précédents) ---
    const dimanchesTriesChrono = dimanchesTous || [];
    const huitDerniers = dimanchesTriesChrono.slice(-8);
    if (huitDerniers.length >= 5) {
      // S'il y a moins de 8 dimanches au total, on prend ce qu'il y a, en gardant 4 pour la période récente au maximum
      const periodeRecente = huitDerniers.slice(-4);
      const periodePrecedente = huitDerniers.slice(0, huitDerniers.length - periodeRecente.length).slice(-4);

      const idsRecents = periodeRecente.map(d => d.id);
      const idsPrecedents = periodePrecedente.map(d => d.id);

      setPeriodes({
        recente: { debut: periodeRecente[0].date, fin: periodeRecente[periodeRecente.length - 1].date, nb: periodeRecente.length },
        precedente: periodePrecedente.length > 0 ? { debut: periodePrecedente[0].date, fin: periodePrecedente[periodePrecedente.length - 1].date, nb: periodePrecedente.length } : null,
      });

      if (idsPrecedents.length > 0) {
        // Taux de présence global sur chaque fenêtre de 4 semaines
        function tauxPeriode(ids, idsMembresCibles) {
          const cible = idsMembresCibles || membres.map(m => m.id);
          const slots = ids.length * cible.length;
          if (slots === 0) return null;
          const presents = (presences || []).filter(p => ids.includes(p.dimanche_id) && p.present && cible.includes(p.membre_id)).length;
          return (presents / slots) * 100;
        }

        const tauxGlobalPrecedent = tauxPeriode(idsPrecedents);
        const tauxGlobalRecent = tauxPeriode(idsRecents);
        setTauxParMois(anciennes => {
          // On remplace la comparaison principale par les 2 fenêtres de 4 semaines,
          // tout en gardant la courbe de contexte sur 6 mois calculée plus haut.
          return anciennes;
        });

        // Tendances par GEM, sur les mêmes fenêtres de 4 semaines
        const tendances = gems.map(g => {
          const membresGem = membres.filter(m => m.gem_id === g.id);
          if (membresGem.length === 0) return null;
          const idsMembres = membresGem.map(m => m.id);
          const tauxPrecedent = tauxPeriode(idsPrecedents, idsMembres);
          const tauxActuel = tauxPeriode(idsRecents, idsMembres);
          if (tauxPrecedent === null || tauxActuel === null) return null;
          return { nom: g.nom, tauxPrecedent: Math.round(tauxPrecedent), tauxActuel: Math.round(tauxActuel), evolution: Math.round(tauxActuel - tauxPrecedent) };
        }).filter(Boolean).sort((a, b) => a.evolution - b.evolution);
        setTendancesGems(tendances);

        // Membres en déclin marqué, sur les mêmes fenêtres
        const declin = membres.map(m => {
          const presentsPrecedent = (presences || []).filter(p => p.membre_id === m.id && idsPrecedents.includes(p.dimanche_id) && p.present).length;
          const presentsActuel = (presences || []).filter(p => p.membre_id === m.id && idsRecents.includes(p.dimanche_id) && p.present).length;
          const tauxPrecedent = idsPrecedents.length > 0 ? (presentsPrecedent / idsPrecedents.length) * 100 : null;
          const tauxActuel = idsRecents.length > 0 ? (presentsActuel / idsRecents.length) * 100 : null;
          if (tauxPrecedent === null || tauxActuel === null) return null;
          return { membre: m, tauxPrecedent: Math.round(tauxPrecedent), tauxActuel: Math.round(tauxActuel), chute: Math.round(tauxPrecedent - tauxActuel) };
        }).filter(x => x && x.chute >= 40 && x.tauxPrecedent >= 50)
          .sort((a, b) => b.chute - a.chute)
          .slice(0, 10);
        setMembresEnDeclin(declin);

        // Santé spirituelle sur les mêmes fenêtres de dates
        function santePeriode(borneDebut, borneFin) {
          const valeurs = (sante || []).filter(s => s.date_maj.slice(0, 10) >= borneDebut && s.date_maj.slice(0, 10) <= borneFin).map(s => moyenneSante(s)).filter(v => v !== null);
          return valeurs.length > 0 ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : null;
        }
        const santeRecente = santePeriode(periodeRecente[0].date, periodeRecente[periodeRecente.length - 1].date);
        const santePrecedente = santePeriode(periodePrecedente[0].date, periodePrecedente[periodePrecedente.length - 1].date);

        // Activités validées sur les mêmes fenêtres
        const activiteRecente = idsRecents.length * gems.length > 0 ? ((activites || []).filter(a => idsRecents.includes(a.dimanche_id)).length / (idsRecents.length * gems.length)) * 100 : null;

        // Croissance nette sur la fenêtre récente (dates)
        const nouveaux = (membresAvecDate || []).filter(m => m.created_at && m.created_at.slice(0, 10) >= periodeRecente[0].date).length;
        const partis = (departsApprouves || []).filter(d => d.date_traitement && d.date_traitement.slice(0, 10) >= periodeRecente[0].date).length;
        setCroissanceRecente([{ mois: "periode", net: nouveaux - partis }]);

        setPeriodes(p => ({
          ...p,
          tauxGlobalPrecedent: tauxGlobalPrecedent !== null ? Math.round(tauxGlobalPrecedent) : null,
          tauxGlobalRecent: tauxGlobalRecent !== null ? Math.round(tauxGlobalRecent) : null,
          santeRecente: santeRecente !== null ? Math.round(santeRecente * 10) / 10 : null,
          santePrecedente: santePrecedente !== null ? Math.round(santePrecedente * 10) / 10 : null,
          activiteRecente: activiteRecente !== null ? Math.round(activiteRecente) : null,
        }));
      }
    }

    setChargement(false);
  }

  // --- Génération des constats et recommandations, sur la base des 4 dernières semaines ---
  const constats = [];

  if (periodes?.tauxGlobalPrecedent !== undefined && periodes?.tauxGlobalPrecedent !== null && periodes?.tauxGlobalRecent !== null) {
    const variation = periodes.tauxGlobalRecent - periodes.tauxGlobalPrecedent;
    if (variation <= -10) {
      constats.push({ type: "alerte", titre: "📉 Baisse de la présence sur 4 semaines",
        detail: `Le taux de présence est passé de ${periodes.tauxGlobalPrecedent}% à ${periodes.tauxGlobalRecent}% entre les deux périodes de 4 semaines les plus récentes.`,
        action: "Envisage un message d'encouragement à toute l'assemblée, et demande aux responsables de département/tribu de relancer les GEM concernés." });
    } else if (variation >= 10) {
      constats.push({ type: "positif", titre: "📈 Belle progression de la présence sur 4 semaines",
        detail: `Le taux de présence est passé de ${periodes.tauxGlobalPrecedent}% à ${periodes.tauxGlobalRecent}% (+${variation}%).`,
        action: "C'est le moment d'encourager publiquement cette dynamique et de capitaliser dessus (invitation à inviter d'autres, activités d'évangélisation)." });
    }
  }

  if (periodes?.santeRecente !== undefined && periodes?.santeRecente !== null && periodes?.santePrecedente !== null) {
    const variation = Math.round((periodes.santeRecente - periodes.santePrecedente) * 10) / 10;
    if (variation <= -1) {
      constats.push({ type: "alerte", titre: "🌡️ Santé spirituelle en baisse sur 4 semaines",
        detail: `La santé spirituelle moyenne est passée de ${periodes.santePrecedente}/10 à ${periodes.santeRecente}/10.`,
        action: "Un temps d'enseignement ou de consécration collectif pourrait être opportun. Encourage les responsables GEM à approfondir les échanges sur la prière et le jeûne." });
    }
  }

  if (periodes?.activiteRecente !== undefined && periodes?.activiteRecente !== null && periodes.activiteRecente < 50) {
    constats.push({ type: "alerte", titre: "📋 Faible taux de rapports d'activités (4 semaines)",
      detail: `Seulement ${periodes.activiteRecente}% des rapports hebdomadaires attendus ont été validés sur les 4 dernières semaines.`,
      action: "Rappelle aux responsables GEM l'importance de valider leur rapport chaque semaine — un message groupé via la Messagerie peut aider." });
  }

  if (croissanceRecente.length === 1 && croissanceRecente[0].net < 0) {
    constats.push({ type: "alerte", titre: "👥 Décroissance numérique sur 4 semaines",
      detail: `Le solde net de membres est de ${croissanceRecente[0].net} sur les 4 dernières semaines.`,
      action: "Vérifie les motifs des départs récents dans la Corbeille, et envisage une stratégie d'intégration plus forte pour les nouveaux venus." });
  }

  if (!chargement && constats.length === 0) {
    constats.push({ type: "positif", titre: "✅ Rien d'alarmant à signaler",
      detail: "Les indicateurs de l'église sont stables ou en légère amélioration sur les 4 dernières semaines.",
      action: "Continue le bon travail — reviens consulter cette page régulièrement pour suivre l'évolution." });
  }

  const gemsEnBaisse = tendancesGems.filter(t => t.evolution <= -15);
  const gemsEnHausse = tendancesGems.filter(t => t.evolution >= 15);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🧠 Analyse intelligente</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 8 }}>
        Détection automatique des tendances et recommandations, sur une fenêtre glissante de 4 semaines.
      </p>
      {periodes?.recente && periodes?.precedente && (
        <p style={{ fontSize: 12, color: GOLD_LIGHT, marginBottom: 20 }}>
          Comparaison : {libelleDate(periodes.precedente.debut)} → {libelleDate(periodes.precedente.fin)} (période précédente) vs {libelleDate(periodes.recente.debut)} → {libelleDate(periodes.recente.fin)} (4 dernières semaines)
        </p>
      )}

      {chargement ? (
        <Chargement />
      ) : !periodes?.precedente ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Pas encore assez de dimanches enregistrés (au moins 5) pour comparer deux périodes de 4 semaines — reviens dans quelques semaines.</p>
      ) : (
        <>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📌 Constats et recommandations</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {constats.map((c, i) => (
              <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${c.type === "alerte" ? RED_LIGHT : "#6fcf97"}` }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{c.titre}</p>
                <p style={{ fontSize: 13, color: "#cdeae4", marginBottom: 8 }}>{c.detail}</p>
                <p style={{ fontSize: 12, color: GOLD_LIGHT, fontStyle: "italic" }}>💡 {c.action}</p>
              </div>
            ))}
          </div>

          {gemsEnBaisse.length > 0 && (
            <>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>⚠️ GEM à surveiller</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {gemsEnBaisse.map((t, i) => (
                  <div key={i} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <p style={{ fontWeight: 700, margin: 0 }}>{t.nom}</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: RED_LIGHT }}>{t.tauxPrecedent}% → {t.tauxActuel}% ({t.evolution}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {gemsEnHausse.length > 0 && (
            <>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🌟 GEM en belle dynamique</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {gemsEnHausse.map((t, i) => (
                  <div key={i} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <p style={{ fontWeight: 700, margin: 0 }}>{t.nom}</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6fcf97" }}>{t.tauxPrecedent}% → {t.tauxActuel}% (+{t.evolution}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {membresEnDeclin.length > 0 && (
            <>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🔻 Membres en décrochage progressif</p>
              <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 10 }}>Étaient réguliers le mois dernier, mais leur présence a nettement chuté ce mois-ci.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {membresEnDeclin.map(({ membre, tauxPrecedent, tauxActuel }) => {
                  const gemMembre = gems.find(g => g.id === membre.gem_id);
                  return (
                    <div key={membre.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, margin: 0 }}>{membre.nom}</p>
                        <p style={{ fontSize: 12, color: "#a9d6cf", margin: 0 }}>{gemMembre?.nom || "GEM inconnu"}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: RED_LIGHT }}>{tauxPrecedent}% → {tauxActuel}%</span>
                        {membre.telephone && (
                          <a title="Appeler" href={`tel:${membre.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>📞</a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PageMonCompte({ compte, cardStyle, onMisAJour }) {
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmationMdp, setConfirmationMdp] = useState("");
  const [mdpVisible, setMdpVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [dateNaissance, setDateNaissance] = useState(compte.date_naissance || "");
  const [quartier, setQuartier] = useState(compte.quartier || "");
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);

  const [derniereSante, setDerniereSante] = useState(null);
  const [valeursSante, setValeursSante] = useState(null);
  const [enregistrementSante, setEnregistrementSante] = useState(false);
  const [chargementSante, setChargementSante] = useState(true);

  useEffect(() => { chargerMaSante(); }, []);

  async function chargerMaSante() {
    setChargementSante(true);
    const { data } = await supabase.from("sante_spirituelle_responsables").select("*").eq("compte_id", compte.id).order("date_maj", { ascending: false }).limit(1).maybeSingle();
    setDerniereSante(data || null);
    const init = {};
    DIMENSIONS_SANTE.forEach(([cle]) => { init[cle] = data?.[cle] ?? 5; });
    setValeursSante(init);
    setChargementSante(false);
  }

  async function enregistrerMaSante() {
    setEnregistrementSante(true);
    const { error } = await supabase.from("sante_spirituelle_responsables").insert({ compte_id: compte.id, ...valeursSante });
    setEnregistrementSante(false);
    if (error) { toast("Impossible d'enregistrer : " + error.message, "erreur"); return; }
    toast("✓ Ta fiche de santé spirituelle a été enregistrée. Sois béni ! 🙏", "succes");
    chargerMaSante();
  }

  function emailTechnique(tel) {
    return `${(tel || "").replace(/[^\d]/g, "")}@gestiongem.com`;
  }

  async function enregistrerProfil() {
    setEnregistrementProfil(true);
    const { error } = await supabase.from("comptes").update({
      date_naissance: dateNaissance || null,
      quartier: quartier.trim() || null,
    }).eq("id", compte.id);
    setEnregistrementProfil(false);
    if (error) { toast("Impossible d'enregistrer : " + error.message, "erreur"); return; }
    toast("✓ Tes informations ont été mises à jour.", "succes");
    if (onMisAJour) onMisAJour();
  }

  async function changerMotDePasse() {
    setErreur("");
    if (!ancienMdp || !nouveauMdp || !confirmationMdp) { setErreur("Merci de remplir les trois champs."); return; }
    if (nouveauMdp.length < 8) { setErreur("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (nouveauMdp !== confirmationMdp) { setErreur("Les deux nouveaux mots de passe ne correspondent pas."); return; }

    setEnCours(true);
    // Vérifie l'ancien mot de passe avant d'autoriser le changement
    const { error: erreurVerif } = await supabase.auth.signInWithPassword({ email: emailTechnique(compte.telephone), password: ancienMdp });
    if (erreurVerif) {
      setEnCours(false);
      setErreur("Ton mot de passe actuel est incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
    setEnCours(false);
    if (error) { setErreur(error.message); return; }
    setAncienMdp(""); setNouveauMdp(""); setConfirmationMdp("");
    toast("✓ Ton mot de passe a bien été changé.", "succes");
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>👤 Mon compte</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>Tes informations et la gestion de ton mot de passe.</p>

      <div style={{ ...cardStyle, marginBottom: 20, border: `2px solid ${GOLD}`, background: "linear-gradient(135deg, rgba(208,175,28,0.12), rgba(232,202,74,0.04))" }}>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🌡️ Ma fiche de santé spirituelle</p>
        <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 14 }}>À remplir chaque semaine — évalue chaque dimension de 0 (faible) à 10 (excellent).</p>
        {chargementSante ? (
          <Chargement />
        ) : (
          <>
            {derniereSante && (
              <p style={{ fontSize: 12, color: GOLD_LIGHT, marginBottom: 12 }}>
                Dernière évaluation : {new Date(derniereSante.date_maj).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} — score moyen : {moyenneSante(derniereSante)}/10
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {DIMENSIONS_SANTE.map(([cle, label]) => (
                <div key={cle}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: 13 }}>{label}</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: couleurScore(valeursSante[cle]) }}>{valeursSante[cle]}/10</span>
                  </div>
                  <input
                    type="range" min="0" max="10" value={valeursSante[cle]}
                    onChange={e => setValeursSante(v => ({ ...v, [cle]: Number(e.target.value) }))}
                    style={{ width: "100%", accentColor: GOLD }}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn-app"
              disabled={enregistrementSante}
              onClick={enregistrerMaSante}
              style={{ marginTop: 16, padding: "12px 20px", borderRadius: 10, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              {enregistrementSante ? "…" : "💾 Enregistrer ma fiche"}
            </button>
          </>
        )}
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Informations</p>
        <p style={{ fontSize: 13, color: "#cdeae4", marginBottom: 4 }}><b>Nom :</b> {compte.nom}</p>
        <p style={{ fontSize: 13, color: "#cdeae4", marginBottom: 4 }}><b>Téléphone :</b> {compte.telephone}</p>
        <p style={{ fontSize: 13, color: "#cdeae4" }}><b>Rôle :</b> {compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant désigné" : "Responsable"}</p>
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>✏️ Compléter mon profil</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "#a9d6cf", display: "block", marginBottom: 4 }}>🎂 Date de naissance (jour et mois)</label>
            <SelecteurJourMois value={dateNaissance} onChange={setDateNaissance} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#a9d6cf", display: "block", marginBottom: 4 }}>Quartier</label>
            <input
              value={quartier}
              onChange={e => setQuartier(e.target.value)}
              placeholder="Non renseigné"
              style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
            />
          </div>
          <button
            className="btn-app"
            disabled={enregistrementProfil}
            onClick={enregistrerProfil}
            style={{ padding: "10px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", alignSelf: "flex-start" }}
          >
            {enregistrementProfil ? "…" : "💾 Enregistrer"}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🔑 Changer mon mot de passe</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={ancienMdp}
            onChange={e => setAncienMdp(e.target.value)}
            type={mdpVisible ? "text" : "password"}
            placeholder="Mot de passe actuel"
            style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
          />
          <input
            value={nouveauMdp}
            onChange={e => setNouveauMdp(e.target.value)}
            type={mdpVisible ? "text" : "password"}
            placeholder="Nouveau mot de passe (8 car. min.)"
            style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
          />
          <input
            value={confirmationMdp}
            onChange={e => setConfirmationMdp(e.target.value)}
            type={mdpVisible ? "text" : "password"}
            placeholder="Confirme le nouveau mot de passe"
            style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a9d6cf", cursor: "pointer" }}>
            <input type="checkbox" checked={mdpVisible} onChange={e => setMdpVisible(e.target.checked)} />
            Afficher les mots de passe
          </label>
          {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
          <button
            className="btn-app"
            disabled={enCours}
            onClick={changerMotDePasse}
            style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, color: TEAL_950, border: "none", cursor: "pointer" }}
          >
            {enCours ? "…" : "Changer mon mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageSuppressions({ compte, cardStyle, onTraite }) {
  const [demandes, setDemandes] = useState([]);
  const [comptesParId, setComptesParId] = useState({});
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(null);

  useEffect(() => { chargerDemandes(); }, []);

  async function chargerDemandes() {
    setChargement(true);
    const { data: d } = await supabase.from("demandes_suppression_membre").select("*").eq("statut", "attente").order("date_demande");
    const idsComptes = [...new Set((d || []).map(x => x.demande_par).filter(Boolean))];
    let map = {};
    if (idsComptes.length > 0) {
      const { data: c } = await supabase.from("comptes").select("*").in("id", idsComptes);
      (c || []).forEach(cc => { map[cc.id] = cc; });
    }
    setDemandes(d || []);
    setComptesParId(map);
    setChargement(false);
  }

  async function approuver(d) {
    setEnCours(d.id);
    // Récupère la fiche complète du membre pour l'archiver dans la corbeille avant suppression
    const { data: membreComplet } = await supabase.from("membres").select("*").eq("id", d.membre_id).maybeSingle();
    if (membreComplet) {
      await supabase.from("membres_corbeille").insert({
        membre_id_original: membreComplet.id, gem_id: membreComplet.gem_id, nom: membreComplet.nom,
        telephone: membreComplet.telephone, photo: membreComplet.photo, date_naissance: membreComplet.date_naissance,
        quartier: membreComplet.quartier, nouveau_converti: membreComplet.nouveau_converti, etape_conversion: membreComplet.etape_conversion,
        motif: d.motif, supprime_par: compte.id,
      });
    }
    await supabase.from("presences").delete().eq("membre_id", d.membre_id);
    await supabase.from("sante_spirituelle").delete().eq("membre_id", d.membre_id);
    await supabase.from("visites").delete().eq("membre_id", d.membre_id);
    const { error } = await supabase.from("membres").delete().eq("id", d.membre_id);
    if (!error) {
      await supabase.from("demandes_suppression_membre").update({ statut: "approuvee", traite_par: compte.id, date_traitement: new Date().toISOString() }).eq("id", d.id);
    }
    setEnCours(null);
    if (error) { toast("Suppression impossible : " + error.message, "erreur"); return; }
    toast(`${d.membre_nom} a été supprimé — récupérable dans la Corbeille pendant 30 jours.`, "succes");
    chargerDemandes();
    if (onTraite) onTraite();
  }

  async function refuser(d) {
    setEnCours(d.id);
    await supabase.from("demandes_suppression_membre").update({ statut: "refusee", traite_par: compte.id, date_traitement: new Date().toISOString() }).eq("id", d.id);
    setEnCours(null);
    toast(`Demande de suppression de ${d.membre_nom} refusée.`, "info");
    chargerDemandes();
    if (onTraite) onTraite();
  }

  function formaterDate(d) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Demandes de suppression ({demandes.length})</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>
        Chaque suppression de membre doit être validée ici avant d'être effective.
      </p>
      {chargement ? (
        <Chargement />
      ) : demandes.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucune demande en attente pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {demandes.map(d => (
            <div key={d.id} style={cardStyle}>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{d.membre_nom}</p>
              <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 6 }}>
                Demandé par {comptesParId[d.demande_par]?.nom || "…"} · {formaterDate(d.date_demande)}
              </p>
              <p style={{ fontSize: 13, color: "#e8c25a", marginBottom: 12 }}>Motif : {d.motif}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-app"
                  disabled={enCours === d.id}
                  onClick={() => approuver(d)}
                  style={{ padding: "10px 18px", borderRadius: 10, backgroundColor: RED_LIGHT, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                >
                  {enCours === d.id ? "…" : "✓ Approuver la suppression"}
                </button>
                <button
                  className="btn-app"
                  disabled={enCours === d.id}
                  onClick={() => refuser(d)}
                  style={{ padding: "10px 18px", borderRadius: 10, backgroundColor: "transparent", color: "#a9d6cf", border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 12 }}
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PageMotsDePasse({ cardStyle, onTraite }) {
  const [demandes, setDemandes] = useState([]);
  const [comptesParId, setComptesParId] = useState({});
  const [chargement, setChargement] = useState(true);
  const [demandeOuverte, setDemandeOuverte] = useState(null); // id de la demande en cours de traitement
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [mdpVisible, setMdpVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  useEffect(() => { chargerDemandes(); }, []);

  function chiffresSeuls(tel) {
    return (tel || "").replace(/[^\d]/g, "");
  }

  async function chargerDemandes() {
    setChargement(true);
    const { data: d } = await supabase.from("demandes_mot_de_passe").select("*").eq("statut", "attente").order("date_demande");
    const { data: tousLesComptes } = await supabase.from("comptes").select("*");
    let map = {};
    (tousLesComptes || []).forEach(c => { map[c.id] = c; });
    // Rattrape les demandes non liées (compte_id null) en comparant les numéros chiffre par chiffre
    const demandesCorrigees = (d || []).map(demande => {
      if (demande.compte_id) return demande;
      const cible = chiffresSeuls(demande.telephone);
      const trouve = (tousLesComptes || []).find(c => chiffresSeuls(c.telephone).endsWith(cible) || cible.endsWith(chiffresSeuls(c.telephone)));
      return trouve ? { ...demande, compte_id: trouve.id } : demande;
    });
    setDemandes(demandesCorrigees);
    setComptesParId(map);
    setChargement(false);
  }

  async function ignorer(d) {
    await supabase.from("demandes_mot_de_passe").delete().eq("id", d.id);
    chargerDemandes();
    if (onTraite) onTraite();
  }

  function ouvrirReinitialisation(d) {
    setDemandeOuverte(d.id);
    setNouveauMdp("");
    setErreur("");
    setSucces("");
  }

  async function reinitialiser(d) {
    setErreur(""); setSucces("");
    if (!d.compte_id) { setErreur("Aucun compte trouvé avec ce numéro — vérifie le téléphone auprès de la personne."); return; }
    if (nouveauMdp.length < 8) { setErreur("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    setEnCours(true);
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { compte_id: d.compte_id, nouveau_mot_de_passe: nouveauMdp },
      headers: { Authorization: `Bearer ${session?.session?.access_token}` },
    });
    if (error || data?.error) {
      setErreur(data?.error || error.message || "Une erreur est survenue.");
      setEnCours(false);
      return;
    }
    await supabase.from("demandes_mot_de_passe").delete().eq("id", d.id);
    setSucces("✓ Mot de passe réinitialisé avec succès.");
    setEnCours(false);
    setTimeout(() => { chargerDemandes(); if (onTraite) onTraite(); }, 1200);
  }

  function formaterDate(date) {
    return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Mots de passe oubliés ({demandes.length})</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>
        Ces demandes viennent de responsables qui n'arrivent plus à se connecter. Choisis un nouveau mot de passe pour eux et transmets-le leur directement.
      </p>

      {chargement ? (
        <Chargement />
      ) : demandes.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucune demande en attente pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {demandes.map(d => {
            const compteAssocie = d.compte_id ? comptesParId[d.compte_id] : null;
            const ouverte = demandeOuverte === d.id;
            return (
              <div key={d.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>{compteAssocie?.nom || "Numéro non reconnu"}</p>
                    <p style={{ fontSize: 12, color: "#a9d6cf" }}>{d.telephone}</p>
                    <p style={{ fontSize: 11, color: "#a9d6cf", marginTop: 2 }}>{formaterDate(d.date_demande)}</p>
                    {!compteAssocie && <p style={{ fontSize: 11, color: RED_LIGHT, marginTop: 4 }}>Ce numéro ne correspond à aucun compte existant.</p>}
                  </div>
                  {!ouverte && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {compteAssocie && (
                        <button
 className="btn-app"
 onClick={() => ouvrirReinitialisation(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Réinitialiser</button>
                      )}
                      <button
 className="btn-app"
 onClick={() => ignorer(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: "transparent", color: RED_LIGHT, border: `1px solid ${RED_LIGHT}`, cursor: "pointer", fontSize: 12 }}>Ignorer</button>
                    </div>
                  )}
                </div>

                {ouverte && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${TEAL_700}` }}>
                    <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 8 }}>Choisis un nouveau mot de passe pour {compteAssocie?.nom} :</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        value={nouveauMdp}
                        onChange={e => setNouveauMdp(e.target.value)}
                        placeholder="Nouveau mot de passe (8 car. min.)"
                        type={mdpVisible ? "text" : "password"}
                        style={{ flex: 1, minWidth: 200, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a9d6cf", cursor: "pointer" }}>
                        <input type="checkbox" checked={mdpVisible} onChange={e => setMdpVisible(e.target.checked)} />
                        Afficher
                      </label>
                    </div>
                    {erreur && <p style={{ color: RED_LIGHT, fontSize: 12, marginTop: 8 }}>{erreur}</p>}
                    {succes && <p style={{ color: GOLD_LIGHT, fontSize: 12, marginTop: 8, fontWeight: 700 }}>{succes}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button disabled={enCours} onClick={() => reinitialiser(d)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                        {enCours ? "…" : "Confirmer la réinitialisation"}
                      </button>
                      <button
 className="btn-app"
 onClick={() => setDemandeOuverte(null)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: "transparent", color: "#a9d6cf", border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 12 }}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------- Rapports & Évolution scopés (responsable dépt/tribu) ------------------- */

function RapportPerimetre({ gems, membres, cardStyle }) {
  const [vue, setVue] = useState("hebdomadaire");
  const [dimanches, setDimanches] = useState([]);
  const [dimancheChoisi, setDimancheChoisi] = useState(null);
  const [presences, setPresences] = useState({});
  const [motifsParMembre, setMotifsParMembre] = useState({});
  const [santeParMembre, setSanteParMembre] = useState({});
  const [dimanchesDuMois, setDimanchesDuMois] = useState([]);
  const [moisChoisi, setMoisChoisi] = useState(null);
  const [presencesMois, setPresencesMois] = useState([]);
  const [santeMois, setSanteMois] = useState([]);
  const [chargement, setChargement] = useState(true);

  const idsMembres = membres.map(m => m.id);

  useEffect(() => { chargerDimanches(); }, []);
  useEffect(() => { if (dimancheChoisi && vue === "hebdomadaire") chargerHebdo(); }, [dimancheChoisi, vue]);
  useEffect(() => { if (moisChoisi && vue === "mensuelle") chargerMensuel(); }, [moisChoisi, vue]);

  async function chargerDimanches() {
    const { data } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(52);
    setDimanches(data || []);
    if (data && data.length > 0) {
      setDimancheChoisi(data[0].id);
      setMoisChoisi([...new Set(data.map(d => d.date.slice(0, 7)))][0]);
    } else {
      setChargement(false);
    }
  }

  async function chargerHebdo() {
    setChargement(true);
    if (idsMembres.length === 0) { setPresences({}); setMotifsParMembre({}); setSanteParMembre({}); setChargement(false); return; }
    const [{ data: pres }, { data: sante }] = await Promise.all([
      supabase.from("presences").select("*").eq("dimanche_id", dimancheChoisi).in("membre_id", idsMembres),
      supabase.from("sante_spirituelle").select("*").in("membre_id", idsMembres).order("date_maj", { ascending: false }),
    ]);
    const mapPres = {}, mapMotifs = {};
    (pres || []).forEach(p => { mapPres[p.membre_id] = p.present; if (p.motif) mapMotifs[p.membre_id] = p.motif; });
    setPresences(mapPres);
    setMotifsParMembre(mapMotifs);
    const mapSante = {};
    (sante || []).forEach(s => { if (!mapSante[s.membre_id]) mapSante[s.membre_id] = s; });
    setSanteParMembre(mapSante);
    setChargement(false);
  }

  async function chargerMensuel() {
    setChargement(true);
    const dimanchesFiltres = dimanches.filter(d => d.date.slice(0, 7) === moisChoisi);
    setDimanchesDuMois(dimanchesFiltres);
    const idsDim = dimanchesFiltres.map(d => d.id);
    const debut = `${moisChoisi}-01`, fin = `${moisChoisi}-31`;
    const [{ data: pres }, { data: sante }] = await Promise.all([
      (idsDim.length > 0 && idsMembres.length > 0) ? supabase.from("presences").select("*").in("dimanche_id", idsDim).in("membre_id", idsMembres) : Promise.resolve({ data: [] }),
      idsMembres.length > 0 ? supabase.from("sante_spirituelle").select("*").in("membre_id", idsMembres).gte("date_maj", debut).lte("date_maj", fin + "T23:59:59") : Promise.resolve({ data: [] }),
    ]);
    setPresencesMois(pres || []);
    setSanteMois(sante || []);
    setChargement(false);
  }

  function libelleMois(cle) {
    if (!cle) return "";
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  const moisDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 7)))];

  const totalMembres = membres.length;
  const totalPresents = membres.filter(m => presences[m.id]).length;
  const tauxGlobal = totalMembres > 0 ? Math.round((totalPresents / totalMembres) * 100) : 0;
  const scoresValides = membres.map(m => moyenneSante(santeParMembre[m.id])).filter(s => s !== null);
  const scoreMoyenGlobal = scoresValides.length > 0 ? Math.round((scoresValides.reduce((a, b) => a + b, 0) / scoresValides.length) * 10) / 10 : null;
  const dateAffichee = dimanches.find(d => d.id === dimancheChoisi);
  const dateFormatee = dateAffichee ? new Date(dateAffichee.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

  const totalSlotsMois = dimanchesDuMois.length * membres.length;
  const totalPresentsMois = presencesMois.filter(p => p.present).length;
  const tauxMoyenMois = totalSlotsMois > 0 ? Math.round((totalPresentsMois / totalSlotsMois) * 100) : 0;
  const scoresMois = santeMois.map(s => moyenneSante(s)).filter(s => s !== null);
  const scoreMoyenMois = scoresMois.length > 0 ? Math.round((scoresMois.reduce((a, b) => a + b, 0) / scoresMois.length) * 10) / 10 : null;

  function nomGem(gemId) { return gems.find(g => g.id === gemId)?.nom || ""; }

  if (gems.length === 0) return <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun GEM dans ton périmètre pour l'instant.</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
 className="btn-app"
 onClick={() => setVue("hebdomadaire")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "hebdomadaire" ? GOLD : TEAL_900, color: vue === "hebdomadaire" ? TEAL_950 : "#cdeae4" }}>Hebdomadaire</button>
        <button
 className="btn-app"
 onClick={() => setVue("mensuelle")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "mensuelle" ? GOLD : TEAL_900, color: vue === "mensuelle" ? TEAL_950 : "#cdeae4" }}>Mensuelle</button>
      </div>

      {dimanches.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun dimanche enregistré pour l'instant.</p>
      ) : vue === "hebdomadaire" ? (
        <>
          <select value={dimancheChoisi || ""} onChange={e => setDimancheChoisi(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 16 }}>
            {dimanches.map(d => <option key={d.id} value={d.id}>{new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</option>)}
          </select>
          {chargement ? <Chargement /> : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#a9d6cf", margin: 0 }}>Rapport du dimanche {dateFormatee}</p>
                <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨️ Imprimer / PDF</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Membres</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Présents</p><p style={{ fontSize: 24, fontWeight: 700, color: GOLD_LIGHT }}>{totalPresents}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Taux</p><p style={{ fontSize: 24, fontWeight: 700 }}>{tauxGlobal}%</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Santé moy.</p><p style={{ fontSize: 24, fontWeight: 700, color: couleurScore(scoreMoyenGlobal) }}>{scoreMoyenGlobal !== null ? `${scoreMoyenGlobal}/10` : "—"}</p></div>
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Détail par GEM</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {gems.map(g => {
                  const membresGem = membres.filter(m => m.gem_id === g.id);
                  const presentsGem = membresGem.filter(m => presences[m.id]).length;
                  const tauxGem = membresGem.length > 0 ? Math.round((presentsGem / membresGem.length) * 100) : 0;
                  return (
                    <div key={g.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <p style={{ fontWeight: 700 }}>{g.nom}</p>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: GOLD_LIGHT }}>{presentsGem} / {membresGem.length} présents</p>
                        <p style={{ fontSize: 12, color: "#a9d6cf" }}>{tauxGem}% de présence</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📵 Absents ({membres.filter(m => presences[m.id] === false).length})</p>
              {membres.filter(m => presences[m.id] === false).length === 0 ? (
                <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun absent pointé pour ce dimanche.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {membres.filter(m => presences[m.id] === false).map(m => {
                    const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
                    const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, tu nous as manqué au culte de ce dimanche. Tout va bien ? Nous t'aimons et espérons te revoir bientôt. 🙏`);
                    return (
                      <div key={m.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                          <p style={{ fontSize: 12, color: "#a9d6cf" }}>{nomGem(m.gem_id)} · {m.telephone}</p>
                          {motifsParMembre[m.id] && <p style={{ fontSize: 12, color: "#e8c25a", marginTop: 4 }}>Motif : {motifsParMembre[m.id]}</p>}
                        </div>
                        {m.telephone && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a title="Appeler" href={`tel:${m.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              📞</a>
                            <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              💬</a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <select value={moisChoisi || ""} onChange={e => setMoisChoisi(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 16, textTransform: "capitalize" }}>
            {moisDisponibles.map(m => <option key={m} value={m}>{libelleMois(m)}</option>)}
          </select>
          {chargement ? <Chargement /> : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#a9d6cf", margin: 0, textTransform: "capitalize" }}>Rapport de {libelleMois(moisChoisi)} — {dimanchesDuMois.length} dimanche(s)</p>
                <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨️ Imprimer / PDF</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Membres</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Taux moyen</p><p style={{ fontSize: 24, fontWeight: 700 }}>{tauxMoyenMois}%</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Santé moy.</p><p style={{ fontSize: 24, fontWeight: 700, color: couleurScore(scoreMoyenMois) }}>{scoreMoyenMois !== null ? `${scoreMoyenMois}/10` : "—"}</p></div>
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📵 Membres absents tout le mois ({membres.filter(m => dimanchesDuMois.length > 0 && presencesMois.filter(p => p.membre_id === m.id && p.present).length === 0).length})</p>
              {dimanchesDuMois.length === 0 ? (
                <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun dimanche pointé pour ce mois.</p>
              ) : membres.filter(m => presencesMois.filter(p => p.membre_id === m.id && p.present).length === 0).length === 0 ? (
                <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun membre totalement absent ce mois — bon signe !</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {membres.filter(m => presencesMois.filter(p => p.membre_id === m.id && p.present).length === 0).map(m => {
                    const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
                    const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, nous ne t'avons pas vu ce mois-ci au culte. Tout va bien ? Nous t'aimons et espérons te revoir bientôt. 🙏`);
                    return (
                      <div key={m.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                          <p style={{ fontSize: 12, color: "#a9d6cf" }}>{nomGem(m.gem_id)} · {m.telephone}</p>
                        </div>
                        {m.telephone && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a title="Appeler" href={`tel:${m.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              📞</a>
                            <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              💬</a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* --------------------- Activités de la semaine — vue groupée (dépt/tribu) --------------------- */

function ActivitesSemainePerimetre({ gems, membres, tribus, departements, cardStyle }) {
  const [vue, setVue] = useState("semaine"); // semaine | mois | annee
  const [dimanches, setDimanches] = useState([]);
  const [dimancheChoisi, setDimancheChoisi] = useState(null);
  const [moisChoisi, setMoisChoisi] = useState(null);
  const [anneeChoisie, setAnneeChoisie] = useState(null);
  const [activites, setActivites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [gemDeplie, setGemDeplie] = useState(null);

  useEffect(() => { chargerDimanches(); }, []);
  useEffect(() => { if (dimancheChoisi && vue === "semaine") chargerActivitesSemaine(); }, [dimancheChoisi, vue]);
  useEffect(() => { if (moisChoisi && vue === "mois") chargerActivitesPeriode(dimanches.filter(d => d.date.slice(0, 7) === moisChoisi)); }, [moisChoisi, vue]);
  useEffect(() => { if (anneeChoisie && vue === "annee") chargerActivitesPeriode(dimanches.filter(d => d.date.slice(0, 4) === anneeChoisie)); }, [anneeChoisie, vue]);

  async function chargerDimanches() {
    const { data } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(200);
    setDimanches(data || []);
    if (data && data.length > 0) {
      setDimancheChoisi(data[0].id);
      setMoisChoisi([...new Set(data.map(d => d.date.slice(0, 7)))][0]);
      setAnneeChoisie([...new Set(data.map(d => d.date.slice(0, 4)))][0]);
    } else {
      setChargement(false);
    }
  }

  async function chargerActivitesSemaine() {
    setChargement(true);
    if (gems.length === 0) { setActivites([]); setChargement(false); return; }
    const idsGems = gems.map(g => g.id);
    const { data } = await supabase.from("activites_semaine").select("*").eq("dimanche_id", dimancheChoisi).in("gem_id", idsGems);
    setActivites(data || []);
    setChargement(false);
  }

  async function chargerActivitesPeriode(dimanchesPeriode) {
    setChargement(true);
    const idsDim = dimanchesPeriode.map(d => d.id);
    if (gems.length === 0 || idsDim.length === 0) { setActivites([]); setChargement(false); return; }
    const idsGems = gems.map(g => g.id);
    const { data } = await supabase.from("activites_semaine").select("*").in("dimanche_id", idsDim).in("gem_id", idsGems).eq("valide", true);
    setActivites(data || []);
    setChargement(false);
  }

  function nomMembre(id) {
    return membres.find(m => m.id === id)?.nom || "?";
  }

  function rattachement(g) {
    if (tribus && g.tribu_id) return `Tribu de ${tribus.find(t => t.id === g.tribu_id)?.nom || "?"}`;
    if (departements && g.departement_id) return `Département ${departements.find(d => d.id === g.departement_id)?.nom || "?"}`;
    return "";
  }

  function libelleMois(cle) {
    if (!cle) return "";
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  const moisDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 7)))];
  const anneesDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 4)))];
  const dateAffichee = dimanches.find(d => d.id === dimancheChoisi);
  const dateFormatee = dateAffichee ? new Date(dateAffichee.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

  const nbValides = vue === "semaine" ? activites.filter(a => a.valide).length : new Set(activites.map(a => a.gem_id)).size;
  const totalVisites = activites.reduce((s, a) => s + (a.visites_membres?.length || 0), 0);
  const totalAppels = activites.reduce((s, a) => s + (a.appels_membres?.length || 0), 0);

  if (gems.length === 0) return <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun GEM dans ton périmètre pour l'instant.</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn-app" onClick={() => setVue("semaine")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "semaine" ? GOLD : TEAL_900, color: vue === "semaine" ? TEAL_950 : "#cdeae4" }}>Par semaine</button>
        <button className="btn-app" onClick={() => setVue("mois")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "mois" ? GOLD : TEAL_900, color: vue === "mois" ? TEAL_950 : "#cdeae4" }}>Par mois</button>
        <button className="btn-app" onClick={() => setVue("annee")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "annee" ? GOLD : TEAL_900, color: vue === "annee" ? TEAL_950 : "#cdeae4" }}>Par année</button>
      </div>

      {dimanches.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun dimanche enregistré pour l'instant.</p>
      ) : (
        <>
          {vue === "semaine" ? (
            <select value={dimancheChoisi || ""} onChange={e => setDimancheChoisi(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 16 }}>
              {dimanches.map(d => <option key={d.id} value={d.id}>{new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</option>)}
            </select>
          ) : vue === "mois" ? (
            <select value={moisChoisi || ""} onChange={e => setMoisChoisi(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 16, textTransform: "capitalize" }}>
              {moisDisponibles.map(m => <option key={m} value={m}>{libelleMois(m)}</option>)}
            </select>
          ) : (
            <select value={anneeChoisie || ""} onChange={e => setAnneeChoisie(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 16 }}>
              {anneesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {chargement ? (
            <Chargement />
          ) : (
            <>
              {vue === "semaine" && <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 16 }}>Semaine du {dateFormatee}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>{vue === "semaine" ? "Rapports validés" : "GEM ayant rapporté"}</p><p style={{ fontSize: 24, fontWeight: 700, color: GOLD_LIGHT }}>{nbValides} / {gems.length}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Visites (total)</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalVisites}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "#a9d6cf", textTransform: "uppercase" }}>Appels (total)</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalAppels}</p></div>
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Détail par GEM</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {gems.map(g => {
                  const activitesGem = activites.filter(a => a.gem_id === g.id);
                  const act = vue === "semaine" ? activitesGem[0] : null;
                  const deplie = gemDeplie === g.id;
                  return (
                    <div key={g.id} style={cardStyle}>
                      <button
                        className="btn-app"
                        onClick={() => setGemDeplie(deplie ? null : g.id)}
                        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: CREAM, textAlign: "left" }}
                      >
                        <span>
                          <span style={{ fontWeight: 700, display: "block" }}>{g.nom}</span>
                          {rattachement(g) && <span style={{ fontSize: 11, color: "#a9d6cf" }}>{rattachement(g)}</span>}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {vue === "semaine" ? (
                            act?.valide ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "4px 10px" }}>✓ Validé</span>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#a9d6cf", backgroundColor: TEAL_900, borderRadius: 999, padding: "4px 10px" }}>Non rempli</span>
                            )
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, color: activitesGem.length > 0 ? TEAL_950 : "#a9d6cf", backgroundColor: activitesGem.length > 0 ? GOLD : TEAL_900, borderRadius: 999, padding: "4px 10px" }}>
                              {activitesGem.length} rapport{activitesGem.length > 1 ? "s" : ""}
                            </span>
                          )}
                          <span style={{ color: "#a9d6cf" }}>{deplie ? "▲" : "▼"}</span>
                        </span>
                      </button>
                      {deplie && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${TEAL_700}`, fontSize: 12, color: "#cdeae4", display: "flex", flexDirection: "column", gap: 12 }}>
                          {activitesGem.length === 0 ? (
                            <p style={{ color: "#a9d6cf" }}>Aucune activité renseignée pour cette période.</p>
                          ) : (
                            activitesGem.map(a => {
                              const dim = dimanches.find(d => d.id === a.dimanche_id);
                              return (
                                <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: `1px solid ${TEAL_800}` }}>
                                  {vue !== "semaine" && dim && (
                                    <p style={{ fontWeight: 700, color: GOLD_LIGHT }}>Semaine du {new Date(dim.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                                  )}
                                  <p><b>🏠 Visites :</b> {(a.visites_membres || []).length > 0 ? a.visites_membres.map(nomMembre).join(", ") : "Aucune"}</p>
                                  <p><b>📞 Appels :</b> {(a.appels_membres || []).length > 0 ? a.appels_membres.map(nomMembre).join(", ") : "Aucun"}</p>
                                  <p><b>🙏 Prière :</b> {a.priere_jour || a.priere_heures ? `${a.priere_jour || ""} ${a.priere_heures || ""}`.trim() : "Non renseignée"}</p>
                                  {a.jeune && <p><b>🕊️ Jeûne :</b> {a.jeune}</p>}
                                  {a.agape && <p><b>🍽️ Agapé :</b> {a.agape}</p>}
                                  {a.evangelisation && <p><b>📣 Évangélisation :</b> {a.evangelisation}</p>}
                                  {a.autres && <p><b>➕ Autres :</b> {a.autres}</p>}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function EvolutionPerimetre({ membres, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [presenceParDimanche, setPresenceParDimanche] = useState([]);
  const [santeParMois, setSanteParMois] = useState([]);

  const idsMembres = membres.map(m => m.id);

  useEffect(() => { chargerEvolution(); }, [membres.length]);

  async function chargerEvolution() {
    setChargement(true);
    if (idsMembres.length === 0) { setPresenceParDimanche([]); setSanteParMois([]); setChargement(false); return; }
    const [{ data: dimanches }, { data: presences }, { data: sante }] = await Promise.all([
      supabase.from("dimanches").select("*").order("date", { ascending: true }).limit(16),
      supabase.from("presences").select("*").in("membre_id", idsMembres),
      supabase.from("sante_spirituelle").select("*").in("membre_id", idsMembres),
    ]);
    const evolutionPresence = (dimanches || []).map(d => {
      const presentsCeDimanche = (presences || []).filter(p => p.dimanche_id === d.id && p.present).length;
      const totalPointe = (presences || []).filter(p => p.dimanche_id === d.id).length;
      return { date: d.date, presents: presentsCeDimanche, total: totalPointe };
    });
    setPresenceParDimanche(evolutionPresence);

    const parMois = {};
    (sante || []).forEach(s => {
      const cle = s.date_maj.slice(0, 7);
      const moy = moyenneSante(s);
      if (moy === null) return;
      if (!parMois[cle]) parMois[cle] = [];
      parMois[cle].push(moy);
    });
    const evolutionSante = Object.entries(parMois)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mois, valeurs]) => ({ mois, moyenne: Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 10) / 10 }));
    setSanteParMois(evolutionSante);
    setChargement(false);
  }

  function libelleMois(cle) {
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  }

  const maxPresents = Math.max(1, ...presenceParDimanche.map(p => p.presents));

  if (chargement) return <Chargement />;

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Présence par dimanche</p>
        {presenceParDimanche.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun pointage de présence pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, overflowX: "auto", paddingBottom: 4 }}>
            {presenceParDimanche.map((p, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 34 }}>
                <span style={{ fontSize: 10, color: GOLD_LIGHT, fontWeight: 700, marginBottom: 3 }}>{p.presents}</span>
                <div style={{ width: 20, height: Math.max(4, (p.presents / maxPresents) * 90), backgroundColor: GOLD, borderRadius: 4 }} />
                <span style={{ fontSize: 9, color: "#a9d6cf", marginTop: 4, whiteSpace: "nowrap" }}>
                  {new Date(p.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Santé spirituelle moyenne par mois</p>
        {santeParMois.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucune évaluation enregistrée pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, overflowX: "auto", paddingBottom: 4 }}>
            {santeParMois.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 34 }}>
                <span style={{ fontSize: 10, color: couleurScore(s.moyenne), fontWeight: 700, marginBottom: 3 }}>{s.moyenne}</span>
                <div style={{ width: 20, height: Math.max(4, (s.moyenne / 10) * 90), backgroundColor: couleurScore(s.moyenne), borderRadius: 4 }} />
                <span style={{ fontSize: 9, color: "#a9d6cf", marginTop: 4, whiteSpace: "nowrap" }}>{libelleMois(s.mois)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Mon espace (responsable) ------------------------------- */

function MonEspace({ compte, assignationsActives, gems, membres, tribus, departements, gemOuvert, setGemOuvert, onMembreAjoute, onCreerGem, regulariteParMembre, membreCible, onMembreCibleConsomme, cardStyle }) {
  const [nomNouveauGem, setNomNouveauGem] = useState("");
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [sousOnglet, setSousOnglet] = useState("gems");
  const [indexRoleSelectionne, setIndexRoleSelectionne] = useState(0);

  const listeAssignations = assignationsActives || [];
  if (listeAssignations.length === 0) return <p style={{ color: "#a9d6cf" }}>Aucune responsabilité active trouvée.</p>;

  const assignation = listeAssignations[Math.min(indexRoleSelectionne, listeAssignations.length - 1)];

  function libelleRole(a) {
    if (a.role_demande === "gem") return `GEM : ${gems.find(g => g.id === a.gem_id)?.nom || "…"}`;
    if (a.role_demande === "departement_resp") return `Département : ${departements.find(d => d.id === a.departement_id)?.nom || "…"}`;
    if (a.role_demande === "tribu_resp") return `Tribu : ${tribus.find(t => t.id === a.tribu_id)?.nom || "…"}`;
    return "Responsabilité";
  }

  if (gemOuvert) {
    return (
      <DetailGem
        compte={compte}
        gem={gemOuvert}
        membres={membres.filter(m => m.gem_id === gemOuvert.id)}
        onBack={() => setGemOuvert(null)}
        onMembreAjoute={onMembreAjoute}
        regulariteParMembre={regulariteParMembre}
        membreCible={membreCible}
        onMembreCibleConsomme={onMembreCibleConsomme}
        cardStyle={cardStyle}
      />
    );
  }

  const selecteurRole = listeAssignations.length > 1 ? (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      {listeAssignations.map((a, i) => (
        <button
          key={a.id}
          className="btn-app"
          onClick={() => setIndexRoleSelectionne(i)}
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: i === indexRoleSelectionne ? GOLD : TEAL_900, color: i === indexRoleSelectionne ? TEAL_950 : "#cdeae4" }}
        >
          {libelleRole(a)}
        </button>
      ))}
    </div>
  ) : null;

  // Un responsable GEM gère directement et uniquement son propre GEM
  if (assignation.role_demande === "gem") {
    const monGem = gems.find(g => g.id === assignation.gem_id);
    if (!monGem) return <p style={{ color: "#a9d6cf" }}>Ton GEM est en cours de préparation...</p>;
    const membresGem = membres.filter(m => m.gem_id === monGem.id);
    return (
      <div>
        {selecteurRole}
        <AnniversairesAVenir membres={membresGem} gems={gems} cardStyle={cardStyle} />
        <DetailGem
          compte={compte}
          gem={monGem}
          membres={membresGem}
          onBack={null}
          onMembreAjoute={onMembreAjoute}
          regulariteParMembre={regulariteParMembre}
          membreCible={membreCible}
          onMembreCibleConsomme={onMembreCibleConsomme}
          cardStyle={cardStyle}
        />
      </div>
    );
  }

  // Un responsable de département ou une tribu voit tous les GEM de son périmètre
  const estDept = assignation.role_demande === "departement_resp";
  const parent = estDept
    ? departements.find(d => d.id === assignation.departement_id)
    : tribus.find(t => t.id === assignation.tribu_id);
  const gemsDuPerimetre = gems.filter(g => estDept ? g.departement_id === assignation.departement_id : g.tribu_id === assignation.tribu_id);
  const membresDuPerimetre = membres.filter(m => gemsDuPerimetre.some(g => g.id === m.gem_id));

  async function creerGem() {
    if (!nomNouveauGem.trim()) return;
    const payload = {
      nom: nomNouveauGem.trim(),
      type: estDept ? "departement" : "tribu",
      departement_id: estDept ? assignation.departement_id : null,
      tribu_id: estDept ? null : assignation.tribu_id,
    };
    const { error } = await supabase.from("gems").insert(payload);
    if (!error) { setNomNouveauGem(""); setCreationOuverte(false); onCreerGem(); }
  }

  return (
    <div>
      {selecteurRole}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        {estDept ? "Mon département" : "Ma tribu"} — {parent?.nom || "…"}
      </h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 16 }}>{gemsDuPerimetre.length} GEM sous ta responsabilité</p>

      <ResumePerimetre gems={gemsDuPerimetre} membres={membresDuPerimetre} cardStyle={cardStyle} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("gems")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "gems" ? GOLD : TEAL_900, color: sousOnglet === "gems" ? TEAL_950 : "#cdeae4" }}>Mes GEM</button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("rapports")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "rapports" ? GOLD : TEAL_900, color: sousOnglet === "rapports" ? TEAL_950 : "#cdeae4" }}>Rapports</button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("evolution")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "evolution" ? GOLD : TEAL_900, color: sousOnglet === "evolution" ? TEAL_950 : "#cdeae4" }}>Évolution</button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("activites")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "activites" ? GOLD : TEAL_900, color: sousOnglet === "activites" ? TEAL_950 : "#cdeae4" }}>📋 Activités de la semaine</button>
      </div>

      {sousOnglet === "rapports" ? (
        <RapportPerimetre gems={gemsDuPerimetre} membres={membresDuPerimetre} cardStyle={cardStyle} />
      ) : sousOnglet === "evolution" ? (
        <EvolutionPerimetre membres={membresDuPerimetre} cardStyle={cardStyle} />
      ) : sousOnglet === "activites" ? (
        <ActivitesSemainePerimetre gems={gemsDuPerimetre} membres={membresDuPerimetre} cardStyle={cardStyle} />
      ) : (
        <>
          <AnniversairesAVenir membres={membresDuPerimetre} gems={gems} cardStyle={cardStyle} />
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            {creationOuverte ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input value={nomNouveauGem} onChange={e => setNomNouveauGem(e.target.value)} placeholder="Nom du nouveau GEM" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <button
 className="btn-app"
 onClick={creerGem} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Créer</button>
              </div>
            ) : (
              <button
 className="btn-app"
 onClick={() => setCreationOuverte(true)} style={{ fontSize: 13, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Créer un nouveau GEM</button>
            )}
          </div>

          {gemsDuPerimetre.length === 0 ? (
            <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun GEM pour l'instant dans ton périmètre.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {gemsDuPerimetre.map(g => (
                <button key={g.id} onClick={() => setGemOuvert(g)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>{g.nom}</span>
                  <span style={{ fontSize: 12, color: "#a9d6cf" }}>{membres.filter(m => m.gem_id === g.id).length} membre(s)</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------- Assistants désignés ------------------------------- */

function PageAssistants({ compte, tribus, departements, gems, onChange, cardStyle }) {
  const estPasteurStrict = compte.role === "pasteur";
  const [sousOnglet, setSousOnglet] = useState(estPasteurStrict ? "assistants" : "attribuer"); // assistants | attribuer | creer

  const tabBtn = (val, label) => (
    <button
      className="btn-app"
      onClick={() => setSousOnglet(val)}
      style={{
        padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
        backgroundColor: sousOnglet === val ? GOLD : TEAL_900, color: sousOnglet === val ? TEAL_950 : "#cdeae4",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Rôles & Accès</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {estPasteurStrict && tabBtn("assistants", "Assistants désignés")}
        {tabBtn("attribuer", "Attribuer un rôle")}
        {tabBtn("creer", "Nouveau compte + rôle")}
      </div>

      {sousOnglet === "assistants" && estPasteurStrict ? (
        <SousPageAssistantsDesignes compte={compte} cardStyle={cardStyle} />
      ) : sousOnglet === "attribuer" ? (
        <SousPageAttribuerRole compte={compte} tribus={tribus} departements={departements} onChange={onChange} cardStyle={cardStyle} />
      ) : (
        <SousPageCreerCompte compte={compte} tribus={tribus} departements={departements} onChange={onChange} cardStyle={cardStyle} />
      )}
    </div>
  );
}

function SousPageAssistantsDesignes({ compte, cardStyle }) {
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => { chargerComptes(); }, []);

  async function chargerComptes() {
    setChargement(true);
    const { data } = await supabase.from("comptes").select("*").neq("id", compte.id).order("nom");
    setComptes(data || []);
    setChargement(false);
  }

  async function basculerAssistant(c) {
    await supabase.from("comptes").update({ assistant: !c.assistant }).eq("id", c.id);
    chargerComptes();
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>
        Un assistant a les mêmes droits que toi (voir toutes les données, valider les demandes) — utile pour te seconder.
      </p>

      {chargement ? (
        <Chargement />
      ) : comptes.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun autre compte pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comptes.map(c => (
            <div key={c.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{c.nom}</p>
                <p style={{ fontSize: 12, color: "#a9d6cf" }}>{c.telephone}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {c.assistant && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: GOLD_LIGHT, backgroundColor: "rgba(208,175,28,0.15)", borderRadius: 999, padding: "4px 10px" }}>
                    Assistant
                  </span>
                )}
              <button
                title={c.assistant ? "Retirer le statut d'assistant" : "Désigner comme assistant"}
                className="btn-app"
                onClick={() => basculerAssistant(c)}
                style={{
                  width: 36, height: 36, borderRadius: 999, border: "none", cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  backgroundColor: c.assistant ? RED_LIGHT : GOLD,
                  color: c.assistant ? "#fff" : TEAL_950,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                {c.assistant ? "✖" : "➕"}
              </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Attribuer un rôle actif directement à un compte déjà inscrit, sans passer par une demande --- */

function SousPageAttribuerRole({ compte, tribus, departements, onChange, cardStyle }) {
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [compteChoisi, setCompteChoisi] = useState(null);

  const [roleDemande, setRoleDemande] = useState("gem");
  const [parentType, setParentType] = useState("tribu");
  const [tribuId, setTribuId] = useState(tribus[0]?.id || "");
  const [departementId, setDepartementId] = useState(departements[0]?.id || "");
  const [nomGem, setNomGem] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState("");

  useEffect(() => { chargerComptes(); }, []);

  async function chargerComptes() {
    setChargement(true);
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("comptes").select("*").neq("id", compte.id).order("nom"),
      supabase.from("assignations").select("*").eq("statut", "actif"),
    ]);
    const idsAvecRoleActif = new Set((a || []).map(x => x.compte_id));
    setComptes((c || []).filter(cc => !idsAvecRoleActif.has(cc.id)));
    setChargement(false);
  }

  function choisir(c) {
    setCompteChoisi(c);
    setErreur(""); setSucces("");
  }

  async function attribuer() {
    setErreur(""); setSucces("");
    if (roleDemande === "gem" && !nomGem.trim()) { setErreur("Merci de donner un nom au GEM."); return; }
    setEnCours(true);

    let gemId = null;
    if (roleDemande === "gem") {
      const { data: nouveauGem, error } = await supabase.from("gems").insert({
        nom: nomGem.trim(),
        type: parentType,
        tribu_id: parentType === "tribu" ? tribuId : null,
        departement_id: parentType === "departement" ? departementId : null,
      }).select().single();
      if (error) { setErreur(error.message); setEnCours(false); return; }
      gemId = nouveauGem.id;
    }

    const payload = {
      compte_id: compteChoisi.id,
      role_demande: roleDemande,
      statut: "actif",
      gem_id: gemId,
      tribu_id: roleDemande === "tribu_resp" ? tribuId : (roleDemande === "gem" && parentType === "tribu" ? tribuId : null),
      departement_id: roleDemande === "departement_resp" ? departementId : (roleDemande === "gem" && parentType === "departement" ? departementId : null),
      gem_nom_demande: roleDemande === "gem" ? nomGem.trim() : null,
      valide_par: compte.id,
    };
    const { error: err2 } = await supabase.from("assignations").insert(payload);
    if (err2) { setErreur(err2.message); setEnCours(false); return; }

    setSucces(`✓ Rôle attribué à ${compteChoisi.nom}.`);
    setEnCours(false);
    setNomGem("");
    if (onChange) onChange();
    setTimeout(() => { setCompteChoisi(null); setSucces(""); chargerComptes(); }, 1500);
  }

  const comptesFiltres = comptes.filter(c => c.nom.toLowerCase().includes(recherche.toLowerCase()) || c.telephone.includes(recherche));

  if (compteChoisi) {
    return (
      <div style={{ maxWidth: 480 }}>
        <button
 className="btn-app"
 onClick={() => setCompteChoisi(null)} style={{ background: "none", border: "none", color: "#a9d6cf", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Choisir un autre compte</button>
        <p style={{ fontSize: 14, color: "#a9d6cf", marginBottom: 4 }}>Attribuer un rôle à :</p>
        <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{compteChoisi.nom} <span style={{ fontWeight: 400, fontSize: 13, color: "#a9d6cf" }}>({compteChoisi.telephone})</span></p>

        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
          <SelecteurRole
            roleDemande={roleDemande} setRoleDemande={setRoleDemande}
            parentType={parentType} setParentType={setParentType}
            tribuId={tribuId} setTribuId={setTribuId}
            departementId={departementId} setDepartementId={setDepartementId}
            nomGem={nomGem} setNomGem={setNomGem}
            tribus={tribus} departements={departements}
          />
          {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
          {succes && <p style={{ color: GOLD_LIGHT, fontSize: 12, fontWeight: 700 }}>{succes}</p>}
          <button disabled={enCours} onClick={attribuer} style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>
            {enCours ? "…" : "Attribuer ce rôle"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 16 }}>
        Choisis un compte déjà inscrit (sans rôle actif) pour lui attribuer directement une responsabilité, sans attendre qu'il en fasse la demande.
      </p>
      <input
        value={recherche}
        onChange={e => setRecherche(e.target.value)}
        placeholder="Rechercher un nom ou un téléphone..."
        style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}`, marginBottom: 16, width: "100%", maxWidth: 320 }}
      />
      {chargement ? (
        <Chargement />
      ) : comptesFiltres.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun compte disponible (tous les comptes inscrits ont déjà un rôle actif).</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comptesFiltres.map(c => (
            <button key={c.id} onClick={() => choisir(c)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>{c.nom}</span>
              <span style={{ fontSize: 12, color: "#a9d6cf" }}>{c.telephone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Créer un compte complet (nom, téléphone, mot de passe) et lui attribuer un rôle en une fois --- */

function SousPageCreerCompte({ compte, tribus, departements, onChange, cardStyle }) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("+225 ");
  const [motDePasse, setMotDePasse] = useState("");
  const [mdpVisible, setMdpVisible] = useState(false);

  const [roleDemande, setRoleDemande] = useState("gem");
  const [parentType, setParentType] = useState("tribu");
  const [tribuId, setTribuId] = useState(tribus[0]?.id || "");
  const [departementId, setDepartementId] = useState(departements[0]?.id || "");
  const [nomGem, setNomGem] = useState("");

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function creer() {
    setErreur(""); setSucces("");
    if (!nom.trim() || !telephone.trim()) { setErreur("Nom et téléphone requis."); return; }
    if (motDePasse.length < 8) { setErreur("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (roleDemande === "gem" && !nomGem.trim()) { setErreur("Merci de donner un nom au GEM."); return; }

    setEnCours(true);
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("create-member", {
      body: {
        nom: nom.trim(),
        telephone: telephone.trim(),
        mot_de_passe: motDePasse,
        role_demande: roleDemande,
        tribu_id: roleDemande === "tribu_resp" ? tribuId : (roleDemande === "gem" && parentType === "tribu" ? tribuId : null),
        departement_id: roleDemande === "departement_resp" ? departementId : (roleDemande === "gem" && parentType === "departement" ? departementId : null),
        nom_gem: roleDemande === "gem" ? nomGem.trim() : null,
      },
      headers: { Authorization: `Bearer ${session?.session?.access_token}` },
    });

    if (error || data?.error) {
      setErreur(data?.error || error.message || "Une erreur est survenue.");
      setEnCours(false);
      return;
    }

    setSucces(`✓ Compte créé pour ${nom.trim()} avec son rôle actif. Transmets-lui son téléphone et son mot de passe pour qu'il se connecte.`);
    setNom(""); setTelephone("+225 "); setMotDePasse(""); setNomGem("");
    setEnCours(false);
    if (onChange) onChange();
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 16 }}>
        Pour quelqu'un qui n'est pas encore inscrit : crée directement son compte et attribue-lui un rôle, en une seule fois.
      </p>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
        <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" type="tel" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
            placeholder="Mot de passe (8 car. min.)"
            type={mdpVisible ? "text" : "password"}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a9d6cf", cursor: "pointer", marginTop: -6 }}>
          <input type="checkbox" checked={mdpVisible} onChange={e => setMdpVisible(e.target.checked)} />
          Afficher le mot de passe
        </label>

        <p style={{ color: CREAM, fontWeight: 700, fontSize: 14, marginTop: 4 }}>Quel rôle lui attribuer ?</p>
        <SelecteurRole
          roleDemande={roleDemande} setRoleDemande={setRoleDemande}
          parentType={parentType} setParentType={setParentType}
          tribuId={tribuId} setTribuId={setTribuId}
          departementId={departementId} setDepartementId={setDepartementId}
          nomGem={nomGem} setNomGem={setNomGem}
          tribus={tribus} departements={departements}
        />

        {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
        {succes && <p style={{ color: GOLD_LIGHT, fontSize: 12, fontWeight: 700 }}>{succes}</p>}

        <button disabled={enCours} onClick={creer} style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>
          {enCours ? "…" : "Créer le compte et attribuer le rôle"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- Rapports ------------------------------- */

function PageRapports({ compte, gems, membres, tribus, departements, cardStyle }) {
  const [vue, setVue] = useState("hebdomadaire"); // hebdomadaire | mensuelle | annuelle

  const [dimanches, setDimanches] = useState([]);
  const [dimancheChoisi, setDimancheChoisi] = useState(null);
  const [presences, setPresences] = useState({}); // { membre_id: true/false }
  const [motifsParMembre, setMotifsParMembre] = useState({}); // { membre_id: motif }
  const [santeParMembre, setSanteParMembre] = useState({}); // { membre_id: dernierEnregistrement }

  const [dimanchesDuMois, setDimanchesDuMois] = useState([]);
  const [moisChoisi, setMoisChoisi] = useState(null); // "YYYY-MM"
  const [presencesMois, setPresencesMois] = useState([]); // toutes les lignes presences du mois
  const [santeMois, setSanteMois] = useState([]);
  const [activitesMois, setActivitesMois] = useState([]);

  const [dimanchesAnnee, setDimanchesAnnee] = useState([]);
  const [anneeChoisie, setAnneeChoisie] = useState(null); // "YYYY"
  const [presencesAnnee, setPresencesAnnee] = useState([]);
  const [santeAnnee, setSanteAnnee] = useState([]);
  const [activitesAnnee, setActivitesAnnee] = useState([]);

  const [tauxPrecedentHebdo, setTauxPrecedentHebdo] = useState(null);
  const [tauxPrecedentMois, setTauxPrecedentMois] = useState(null);
  const [tauxPrecedentAnnee, setTauxPrecedentAnnee] = useState(null);

  const [chargement, setChargement] = useState(true);
  const [gemRapportASupprimer, setGemRapportASupprimer] = useState(null);
  const [suppressionRapportEnCours, setSuppressionRapportEnCours] = useState(false);

  async function supprimerRapportPresence() {
    const gem = gemRapportASupprimer;
    setSuppressionRapportEnCours(true);
    const idsMembresGem = membres.filter(m => m.gem_id === gem.id).map(m => m.id);
    if (idsMembresGem.length > 0) {
      await supabase.from("presences").delete().eq("dimanche_id", dimancheChoisi).in("membre_id", idsMembresGem);
    }
    await supabase.from("validations_presence").delete().eq("dimanche_id", dimancheChoisi).eq("gem_id", gem.id);
    setSuppressionRapportEnCours(false);
    setGemRapportASupprimer(null);
    toast(`Le rapport de présence de "${gem.nom}" pour cette semaine a été supprimé.`, "succes");
    chargerDonneesRapport();
  }

  useEffect(() => { chargerDimanches(); }, []);
  useEffect(() => { if (dimancheChoisi && vue === "hebdomadaire") chargerDonneesRapport(); }, [dimancheChoisi, vue]);
  useEffect(() => { if (moisChoisi && vue === "mensuelle") chargerDonneesMois(); }, [moisChoisi, vue]);
  useEffect(() => { if (anneeChoisie && vue === "annuelle") chargerDonneesAnnee(); }, [anneeChoisie, vue]);

  async function chargerDimanches() {
    const { data } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(200);
    setDimanches(data || []);
    if (data && data.length > 0) {
      setDimancheChoisi(data[0].id);
      const moisDisponibles = [...new Set(data.map(d => d.date.slice(0, 7)))];
      setMoisChoisi(moisDisponibles[0]);
      const anneesDisponibles = [...new Set(data.map(d => d.date.slice(0, 4)))];
      setAnneeChoisie(anneesDisponibles[0]);
    } else {
      setChargement(false);
    }
  }

  async function chargerDonneesRapport() {
    setChargement(true);
    const [{ data: pres }, { data: sante }] = await Promise.all([
      supabase.from("presences").select("*").eq("dimanche_id", dimancheChoisi),
      supabase.from("sante_spirituelle").select("*").order("date_maj", { ascending: false }),
    ]);
    const mapPres = {};
    const mapMotifs = {};
    (pres || []).forEach(p => { mapPres[p.membre_id] = p.present; if (p.motif) mapMotifs[p.membre_id] = p.motif; });
    setPresences(mapPres);
    setMotifsParMembre(mapMotifs);
    const mapSante = {};
    (sante || []).forEach(s => { if (s.membre_id && !mapSante[s.membre_id]) mapSante[s.membre_id] = s; });
    setSanteParMembre(mapSante);

    // Dimanche précédent (chronologiquement) pour la comparaison
    const indexActuel = dimanches.findIndex(d => d.id === dimancheChoisi);
    const dimanchePrecedent = indexActuel >= 0 ? dimanches[indexActuel + 1] : null;
    if (dimanchePrecedent) {
      const { data: presPrecedent } = await supabase.from("presences").select("*").eq("dimanche_id", dimanchePrecedent.id);
      const presentsPrecedent = (presPrecedent || []).filter(p => p.present).length;
      setTauxPrecedentHebdo(membres.length > 0 ? Math.round((presentsPrecedent / membres.length) * 100) : null);
    } else {
      setTauxPrecedentHebdo(null);
    }

    setChargement(false);
  }

  async function chargerDonneesMois() {
    setChargement(true);
    const dimanchesFiltres = dimanches.filter(d => d.date.slice(0, 7) === moisChoisi);
    setDimanchesDuMois(dimanchesFiltres);
    const idsDimanches = dimanchesFiltres.map(d => d.id);
    const debutMois = `${moisChoisi}-01`;
    const finMois = `${moisChoisi}-31`;
    const [{ data: pres }, { data: sante }, { data: activites }] = await Promise.all([
      idsDimanches.length > 0
        ? supabase.from("presences").select("*").in("dimanche_id", idsDimanches)
        : Promise.resolve({ data: [] }),
      supabase.from("sante_spirituelle").select("*").gte("date_maj", debutMois).lte("date_maj", finMois + "T23:59:59"),
      idsDimanches.length > 0
        ? supabase.from("activites_semaine").select("*").in("dimanche_id", idsDimanches).eq("valide", true)
        : Promise.resolve({ data: [] }),
    ]);
    setPresencesMois(pres || []);
    setSanteMois(sante || []);
    setActivitesMois(activites || []);

    // Mois précédent, pour la comparaison
    const [anneeStr, moisStr] = moisChoisi.split("-").map(Number);
    const dateMoisPrecedent = new Date(anneeStr, moisStr - 2, 1); // -2 car mois JS est 0-indexé et on veut le mois d'avant
    const cleMoisPrecedent = `${dateMoisPrecedent.getFullYear()}-${String(dateMoisPrecedent.getMonth() + 1).padStart(2, "0")}`;
    const dimanchesMoisPrecedent = dimanches.filter(d => d.date.slice(0, 7) === cleMoisPrecedent);
    if (dimanchesMoisPrecedent.length > 0) {
      const idsDimPrecedent = dimanchesMoisPrecedent.map(d => d.id);
      const { data: presPrecedent } = await supabase.from("presences").select("*").in("dimanche_id", idsDimPrecedent);
      const slotsPrecedent = dimanchesMoisPrecedent.length * membres.length;
      const presentsPrecedent = (presPrecedent || []).filter(p => p.present).length;
      setTauxPrecedentMois(slotsPrecedent > 0 ? Math.round((presentsPrecedent / slotsPrecedent) * 100) : null);
    } else {
      setTauxPrecedentMois(null);
    }

    setChargement(false);
  }

  async function chargerDonneesAnnee() {
    setChargement(true);
    const dimanchesFiltres = dimanches.filter(d => d.date.slice(0, 4) === anneeChoisie);
    setDimanchesAnnee(dimanchesFiltres);
    const idsDimanches = dimanchesFiltres.map(d => d.id);
    const debutAnnee = `${anneeChoisie}-01-01`;
    const finAnnee = `${anneeChoisie}-12-31`;
    const [{ data: pres }, { data: sante }, { data: activites }] = await Promise.all([
      idsDimanches.length > 0
        ? supabase.from("presences").select("*").in("dimanche_id", idsDimanches)
        : Promise.resolve({ data: [] }),
      supabase.from("sante_spirituelle").select("*").gte("date_maj", debutAnnee).lte("date_maj", finAnnee + "T23:59:59"),
      idsDimanches.length > 0
        ? supabase.from("activites_semaine").select("*").in("dimanche_id", idsDimanches).eq("valide", true)
        : Promise.resolve({ data: [] }),
    ]);
    setPresencesAnnee(pres || []);
    setSanteAnnee(sante || []);
    setActivitesAnnee(activites || []);

    // Année précédente, pour la comparaison
    const anneePrecedente = String(Number(anneeChoisie) - 1);
    const dimanchesAnneePrecedente = dimanches.filter(d => d.date.slice(0, 4) === anneePrecedente);
    if (dimanchesAnneePrecedente.length > 0) {
      const idsDimPrecedent = dimanchesAnneePrecedente.map(d => d.id);
      const { data: presPrecedent } = await supabase.from("presences").select("*").in("dimanche_id", idsDimPrecedent);
      const slotsPrecedent = dimanchesAnneePrecedente.length * membres.length;
      const presentsPrecedent = (presPrecedent || []).filter(p => p.present).length;
      setTauxPrecedentAnnee(slotsPrecedent > 0 ? Math.round((presentsPrecedent / slotsPrecedent) * 100) : null);
    } else {
      setTauxPrecedentAnnee(null);
    }

    setChargement(false);
  }

  function nomParent(g) {
    if (g.tribu_id) return tribus.find(t => t.id === g.tribu_id)?.nom || "";
    return departements.find(d => d.id === g.departement_id)?.nom || "";
  }

  const moisDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 7)))];
  const anneesDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 4)))];
  function libelleMois(cle) {
    if (!cle) return "";
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  function libelleMoisCourt(cle) {
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short" });
  }

  // --- Vue hebdomadaire ---
  const totalMembres = membres.length;
  const totalPresents = membres.filter(m => presences[m.id]).length;
  const tauxGlobal = totalMembres > 0 ? Math.round((totalPresents / totalMembres) * 100) : 0;
  const scoresValides = membres.map(m => moyenneSante(santeParMembre[m.id])).filter(s => s !== null);
  const scoreMoyenGlobal = scoresValides.length > 0 ? Math.round((scoresValides.reduce((a, b) => a + b, 0) / scoresValides.length) * 10) / 10 : null;
  const dateAffichee = dimanches.find(d => d.id === dimancheChoisi);
  const dateFormatee = dateAffichee ? new Date(dateAffichee.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

  // --- Vue mensuelle : taux moyen et santé du mois ---
  const totalSlotsMois = dimanchesDuMois.length * membres.length;
  const totalPresentsMois = presencesMois.filter(p => p.present).length;
  const tauxMoyenMois = totalSlotsMois > 0 ? Math.round((totalPresentsMois / totalSlotsMois) * 100) : 0;
  const scoresMois = santeMois.map(s => moyenneSante(s)).filter(s => s !== null);
  const scoreMoyenMois = scoresMois.length > 0 ? Math.round((scoresMois.reduce((a, b) => a + b, 0) / scoresMois.length) * 10) / 10 : null;

  // --- Vue annuelle : taux moyen et santé de l'année ---
  const totalSlotsAnnee = dimanchesAnnee.length * membres.length;
  const totalPresentsAnnee = presencesAnnee.filter(p => p.present).length;
  const tauxMoyenAnnee = totalSlotsAnnee > 0 ? Math.round((totalPresentsAnnee / totalSlotsAnnee) * 100) : 0;
  const scoresAnnee = santeAnnee.map(s => moyenneSante(s)).filter(s => s !== null);
  const scoreMoyenAnnee = scoresAnnee.length > 0 ? Math.round((scoresAnnee.reduce((a, b) => a + b, 0) / scoresAnnee.length) * 10) / 10 : null;

  const evolutionMensuelleAnnee = [...new Set(dimanchesAnnee.map(d => d.date.slice(0, 7)))].sort().map(mois => {
    const dimanchesMoisCourant = dimanchesAnnee.filter(d => d.date.slice(0, 7) === mois);
    const idsDimMois = dimanchesMoisCourant.map(d => d.id);
    const slots = dimanchesMoisCourant.length * membres.length;
    const presents = presencesAnnee.filter(p => idsDimMois.includes(p.dimanche_id) && p.present).length;
    return { mois, taux: slots > 0 ? Math.round((presents / slots) * 100) : 0 };
  });

  // --- Classements génériques (présence, santé, membres) ---
  const evolutionHebdoDuMois = dimanchesDuMois.map(d => {
    const presentsCeDimanche = presencesMois.filter(p => p.dimanche_id === d.id && p.present).length;
    const totalMembresGlobal = membres.length;
    const taux = totalMembresGlobal > 0 ? Math.round((presentsCeDimanche / totalMembresGlobal) * 100) : 0;
    return { date: d.date, presents: presentsCeDimanche, taux };
  }).sort((a, b) => a.date.localeCompare(b.date));

  function calculerClassementPresence(type, items, dimanchesPeriode, presencesPeriode) {
    return items
      .map(it => {
        const gemsDuParent = gems.filter(g => g.type === type && (type === "tribu" ? g.tribu_id : g.departement_id) === it.id);
        const idsGems = gemsDuParent.map(g => g.id);
        const membresDuParent = membres.filter(m => idsGems.includes(m.gem_id));
        const idsMembres = membresDuParent.map(m => m.id);
        const slots = dimanchesPeriode.length * membresDuParent.length;
        const presents = presencesPeriode.filter(p => idsMembres.includes(p.membre_id) && p.present).length;
        const valeur = slots > 0 ? Math.round((presents / slots) * 100) : null;
        return { nom: it.nom, valeur, nbMembres: membresDuParent.length };
      })
      .filter(x => x.valeur !== null)
      .sort((a, b) => b.valeur - a.valeur);
  }

  function calculerClassementSante(type, items, santePeriode) {
    return items
      .map(it => {
        const gemsDuParent = gems.filter(g => g.type === type && (type === "tribu" ? g.tribu_id : g.departement_id) === it.id);
        const idsGems = gemsDuParent.map(g => g.id);
        const membresDuParent = membres.filter(m => idsGems.includes(m.gem_id));
        const idsMembres = membresDuParent.map(m => m.id);
        const scoresParMembre = {};
        santePeriode.filter(s => idsMembres.includes(s.membre_id)).forEach(s => {
          const moy = moyenneSante(s);
          if (moy === null) return;
          if (!scoresParMembre[s.membre_id]) scoresParMembre[s.membre_id] = [];
          scoresParMembre[s.membre_id].push(moy);
        });
        const moyennesMembres = Object.values(scoresParMembre).map(arr => arr.reduce((a, b) => a + b, 0) / arr.length);
        const valeur = moyennesMembres.length > 0 ? Math.round((moyennesMembres.reduce((a, b) => a + b, 0) / moyennesMembres.length) * 10) / 10 : null;
        return { nom: it.nom, valeur, nbMembres: membresDuParent.length };
      })
      .filter(x => x.valeur !== null)
      .sort((a, b) => b.valeur - a.valeur);
  }

  // Taux de rapports hebdomadaires validés par un GEM, agrégé par tribu/département
  function calculerClassementActivite(type, items, dimanchesPeriode, activitesPeriode) {
    return items
      .map(it => {
        const gemsDuParent = gems.filter(g => g.type === type && (type === "tribu" ? g.tribu_id : g.departement_id) === it.id);
        const idsGems = gemsDuParent.map(g => g.id);
        if (idsGems.length === 0 || dimanchesPeriode.length === 0) return { nom: it.nom, valeur: null, nbMembres: 0 };
        const totalAttendu = idsGems.length * dimanchesPeriode.length;
        const totalValide = activitesPeriode.filter(a => idsGems.includes(a.gem_id)).length;
        const valeur = totalAttendu > 0 ? Math.round((totalValide / totalAttendu) * 100) : null;
        return { nom: it.nom, valeur, nbMembres: gemsDuParent.length };
      })
      .filter(x => x.valeur !== null)
      .sort((a, b) => b.valeur - a.valeur);
  }

  function calculerClassementMembres(dimanchesPeriode, presencesPeriode, limite) {
    return membres
      .map(m => {
        const slots = dimanchesPeriode.length;
        const presents = presencesPeriode.filter(p => p.membre_id === m.id && p.present).length;
        const valeur = slots > 0 ? Math.round((presents / slots) * 100) : null;
        return { id: m.id, nom: m.nom, gemNom: gems.find(g => g.id === m.gem_id)?.nom || "", valeur };
      })
      .filter(x => x.valeur !== null && x.valeur > 0)
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, limite);
  }

  // Suivi des âmes : proportion des nouveaux convertis d'un parent qui ont atteint l'étape "Intégré(e)"
  function calculerClassementAmes(type, items) {
    return items
      .map(it => {
        const gemsDuParent = gems.filter(g => g.type === type && (type === "tribu" ? g.tribu_id : g.departement_id) === it.id);
        const idsGems = gemsDuParent.map(g => g.id);
        const nouveauxConvertis = membres.filter(m => idsGems.includes(m.gem_id) && m.nouveau_converti);
        const integres = nouveauxConvertis.filter(m => m.etape_conversion === "integre").length;
        const valeur = nouveauxConvertis.length > 0 ? Math.round((integres / nouveauxConvertis.length) * 100) : null;
        return { nom: it.nom, valeur, nbMembres: nouveauxConvertis.length, integres };
      })
      .filter(x => x.valeur !== null)
      .sort((a, b) => b.valeur - a.valeur);
  }

  const classementTribusPresenceMois = vue === "mensuelle" ? calculerClassementPresence("tribu", tribus, dimanchesDuMois, presencesMois) : [];
  const classementDepartementsPresenceMois = vue === "mensuelle" ? calculerClassementPresence("departement", departements, dimanchesDuMois, presencesMois) : [];
  const classementTribusSanteMois = vue === "mensuelle" ? calculerClassementSante("tribu", tribus, santeMois) : [];
  const classementDepartementsSanteMois = vue === "mensuelle" ? calculerClassementSante("departement", departements, santeMois) : [];
  const classementMembresMois = vue === "mensuelle" ? calculerClassementMembres(dimanchesDuMois, presencesMois, 10) : [];
  // Meilleur GEM de la période : combine présence, santé spirituelle et activités validées
  function calculerClassementGems(dimanchesPeriode, presencesPeriode, santePeriode, activitesPeriode) {
    const resultats = gems.map(g => {
      const membresGem = membres.filter(m => m.gem_id === g.id);
      if (membresGem.length === 0 || dimanchesPeriode.length === 0) return null;
      const idsMembres = membresGem.map(m => m.id);

      const slots = dimanchesPeriode.length * membresGem.length;
      const presents = presencesPeriode.filter(p => idsMembres.includes(p.membre_id) && p.present).length;
      const tauxPresence = slots > 0 ? (presents / slots) * 100 : null;

      const scoresSante = santePeriode.filter(s => idsMembres.includes(s.membre_id)).map(s => moyenneSante(s)).filter(s => s !== null);
      const scoreSante = scoresSante.length > 0 ? (scoresSante.reduce((a, b) => a + b, 0) / scoresSante.length) * 10 : null;

      const activitesGem = activitesPeriode.filter(a => a.gem_id === g.id).length;
      const tauxActivite = dimanchesPeriode.length > 0 ? (activitesGem / dimanchesPeriode.length) * 100 : null;

      const composantes = [tauxPresence, scoreSante, tauxActivite].filter(v => v !== null);
      if (composantes.length === 0) return null;
      const score = composantes.reduce((a, b) => a + b, 0) / composantes.length;

      const rattachement = g.tribu_id ? `Tribu de ${tribus.find(t => t.id === g.tribu_id)?.nom || "?"}` : `Département ${departements.find(d => d.id === g.departement_id)?.nom || "?"}`;

      return {
        nom: g.nom, gemId: g.id, valeur: Math.round(score), rattachement,
        tauxPresence: tauxPresence !== null ? Math.round(tauxPresence) : null,
        scoreSante: scoreSante !== null ? Math.round(scoreSante / 10 * 10) / 10 : null,
        tauxActivite: tauxActivite !== null ? Math.round(tauxActivite) : null,
      };
    }).filter(Boolean);
    return resultats.sort((a, b) => b.valeur - a.valeur);
  }

  const classementGemsMois = vue === "mensuelle" ? calculerClassementGems(dimanchesDuMois, presencesMois, santeMois, activitesMois) : [];
  const classementGemsAnnee = vue === "annuelle" ? calculerClassementGems(dimanchesAnnee, presencesAnnee, santeAnnee, activitesAnnee) : [];
  const meilleurGemMois = classementGemsMois[0] || null;
  const meilleurGemAnnee = classementGemsAnnee[0] || null;

  const classementTribusAmes = (vue === "mensuelle" || vue === "annuelle") ? calculerClassementAmes("tribu", tribus) : [];
  const classementDepartementsAmes = (vue === "mensuelle" || vue === "annuelle") ? calculerClassementAmes("departement", departements) : [];
  const classementTribusActiviteMois = vue === "mensuelle" ? calculerClassementActivite("tribu", tribus, dimanchesDuMois, activitesMois) : [];
  const classementDepartementsActiviteMois = vue === "mensuelle" ? calculerClassementActivite("departement", departements, dimanchesDuMois, activitesMois) : [];
  const classementTribusActiviteAnnee = vue === "annuelle" ? calculerClassementActivite("tribu", tribus, dimanchesAnnee, activitesAnnee) : [];
  const classementDepartementsActiviteAnnee = vue === "annuelle" ? calculerClassementActivite("departement", departements, dimanchesAnnee, activitesAnnee) : [];

  const classementTribusPresenceAnnee = vue === "annuelle" ? calculerClassementPresence("tribu", tribus, dimanchesAnnee, presencesAnnee) : [];
  const classementDepartementsPresenceAnnee = vue === "annuelle" ? calculerClassementPresence("departement", departements, dimanchesAnnee, presencesAnnee) : [];
  const classementTribusSanteAnnee = vue === "annuelle" ? calculerClassementSante("tribu", tribus, santeAnnee) : [];
  const classementDepartementsSanteAnnee = vue === "annuelle" ? calculerClassementSante("departement", departements, santeAnnee) : [];
  const classementMembresAnnee = vue === "annuelle" ? calculerClassementMembres(dimanchesAnnee, presencesAnnee, 10) : [];

  function telechargerCSV(lignes, entetes, nomFichier) {
    const ligneEntete = entetes.join(",");
    const corps = lignes.map(l => entetes.map(e => `"${String(l[e] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + ligneEntete + "\n" + corps], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomFichier;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exporterCSVHebdomadaire() {
    const lignes = gems.map(g => {
      const membresGem = membres.filter(m => m.gem_id === g.id);
      const presentsGem = membresGem.filter(m => presences[m.id]).length;
      const tauxGem = membresGem.length > 0 ? Math.round((presentsGem / membresGem.length) * 100) : 0;
      return { GEM: g.nom, Rattachement: nomParent(g), Presents: presentsGem, Total: membresGem.length, Taux: `${tauxGem}%` };
    });
    telechargerCSV(lignes, ["GEM", "Rattachement", "Presents", "Total", "Taux"], `rapport-${dateAffichee?.date || "dimanche"}.csv`);
  }

  async function partagerRapportHebdomadaire() {
    const absents = membres.filter(m => presences[m.id] === false);
    let texte = `📋 Rapport du dimanche ${dateFormatee}\n\n`;
    texte += `Membres suivis : ${totalMembres}\n`;
    texte += `Présents : ${totalPresents}\n`;
    texte += `Taux de présence : ${tauxGlobal}%\n`;
    texte += `Santé spirituelle moy. : ${scoreMoyenGlobal !== null ? `${scoreMoyenGlobal}/10` : "—"}\n\n`;
    texte += `📵 Absents (${absents.length}) :\n`;
    absents.forEach(m => {
      const gemMembre = gems.find(g => g.id === m.gem_id);
      texte += `- ${m.nom} (${gemMembre?.nom || "GEM inconnu"})${motifsParMembre[m.id] ? ` — Motif : ${motifsParMembre[m.id]}` : ""}\n`;
    });

    if (navigator.share) {
      try {
        await navigator.share({ title: `Rapport du ${dateFormatee}`, text: texte });
      } catch (e) { /* partage annulé par l'utilisateur */ }
    } else {
      await navigator.clipboard.writeText(texte);
      toast("Le rapport a été copié — tu peux le coller où tu veux.", "succes");
    }
  }

  function exporterCSVMensuel() {
    const lignes = [
      ...classementTribusPresenceMois.map(x => ({ Type: "Tribu", Critere: "Présence", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}%` })),
      ...classementDepartementsPresenceMois.map(x => ({ Type: "Département", Critere: "Présence", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}%` })),
      ...classementTribusSanteMois.map(x => ({ Type: "Tribu", Critere: "Santé", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}/10` })),
      ...classementDepartementsSanteMois.map(x => ({ Type: "Département", Critere: "Santé", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}/10` })),
      ...classementMembresMois.map(x => ({ Type: "Membre", Critere: "Régularité", Nom: `${x.nom} (${x.gemNom})`, Membres: "", Valeur: `${x.valeur}%` })),
    ];
    telechargerCSV(lignes, ["Type", "Critere", "Nom", "Membres", "Valeur"], `rapport-mensuel-${moisChoisi}.csv`);
  }

  function exporterCSVAnnuel() {
    const lignes = [
      ...classementTribusPresenceAnnee.map(x => ({ Type: "Tribu", Critere: "Présence", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}%` })),
      ...classementDepartementsPresenceAnnee.map(x => ({ Type: "Département", Critere: "Présence", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}%` })),
      ...classementTribusSanteAnnee.map(x => ({ Type: "Tribu", Critere: "Santé", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}/10` })),
      ...classementDepartementsSanteAnnee.map(x => ({ Type: "Département", Critere: "Santé", Nom: x.nom, Membres: x.nbMembres, Valeur: `${x.valeur}/10` })),
      ...classementMembresAnnee.map(x => ({ Type: "Membre", Critere: "Régularité", Nom: `${x.nom} (${x.gemNom})`, Membres: "", Valeur: `${x.valeur}%` })),
    ];
    telechargerCSV(lignes, ["Type", "Critere", "Nom", "Membres", "Valeur"], `rapport-annuel-${anneeChoisie}.csv`);
  }

  function ComparaisonPeriode({ actuel, precedent, libellePeriode }) {
    if (precedent === null || precedent === undefined) return null;
    const difference = actuel - precedent;
    if (difference === 0) {
      return <span style={{ fontSize: 11, color: "#a9d6cf", marginLeft: 6 }}>= vs {libellePeriode}</span>;
    }
    const positif = difference > 0;
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: positif ? "#6fcf97" : RED_LIGHT, marginLeft: 6 }}>
        {positif ? "↑" : "↓"} {positif ? "+" : ""}{difference}% vs {libellePeriode}
      </span>
    );
  }

  function PrixMeilleurGem({ gagnant, titre }) {
    const [confettiActif, setConfettiActif] = useState(false);
    useEffect(() => { if (gagnant) setConfettiActif(true); }, [gagnant?.gemId]);
    if (!gagnant) return null;
    return (
      <div style={{ background: "linear-gradient(135deg, rgba(208,175,28,0.25), rgba(232,202,74,0.1))", border: `2px solid ${GOLD}`, borderRadius: 16, padding: 20, marginBottom: 28, textAlign: "center" }}>
        <p style={{ fontSize: 36, marginBottom: 4 }}>🏆</p>
        <p style={{ fontSize: 12, color: GOLD_LIGHT, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{titre}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: CREAM, marginBottom: 10 }}>{gagnant.nom}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#cdeae4" }}>
          {gagnant.tauxPresence !== null && <span>📅 Présence : <b style={{ color: GOLD_LIGHT }}>{gagnant.tauxPresence}%</b></span>}
          {gagnant.scoreSante !== null && <span>🌡️ Santé : <b style={{ color: GOLD_LIGHT }}>{gagnant.scoreSante}/10</b></span>}
          {gagnant.tauxActivite !== null && <span>📋 Activités : <b style={{ color: GOLD_LIGHT }}>{gagnant.tauxActivite}%</b></span>}
        </div>
        <Confettis actif={confettiActif} onFin={() => setConfettiActif(false)} />
      </div>
    );
  }

  function medaille(position) {
    if (position === 0) return "🥇";
    if (position === 1) return "🥈";
    if (position === 2) return "🥉";
    return `${position + 1}.`;
  }

  function Classement({ titre, liste, suffixe, maxValeur }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{titre}</p>
        {liste.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Pas assez de données pour établir un classement.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {liste.map((item, i) => (
              <div key={item.nom + i} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    <span style={{ marginRight: 8 }}>{medaille(i)}</span>
                    {item.nom}
                    {item.rattachement && <span style={{ fontWeight: 400, fontSize: 11, color: "#a9d6cf", marginLeft: 6 }}>({item.rattachement})</span>}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: GOLD_LIGHT }}>{item.valeur}{suffixe}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, backgroundColor: TEAL_900, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (item.valeur / maxValeur) * 100)}%`, backgroundColor: GOLD, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function ClassementMembres({ liste }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏅 Top 10 des membres les plus réguliers</p>
        {liste.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Pas assez de pointages pour établir ce classement.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {liste.map((item, i) => (
              <div key={item.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{medaille(i)} {item.nom}</span>
                  <p style={{ fontSize: 11, color: "#a9d6cf", margin: 0 }}>{item.gemNom}</p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: GOLD_LIGHT }}>{item.valeur}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Rapports</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
 className="btn-app"
 onClick={() => setVue("hebdomadaire")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "hebdomadaire" ? GOLD : TEAL_900, color: vue === "hebdomadaire" ? TEAL_950 : "#cdeae4" }}>
          Vue hebdomadaire
        </button>
        <button
 className="btn-app"
 onClick={() => setVue("mensuelle")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "mensuelle" ? GOLD : TEAL_900, color: vue === "mensuelle" ? TEAL_950 : "#cdeae4" }}>
          Vue mensuelle
        </button>
        <button
 className="btn-app"
 onClick={() => setVue("annuelle")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "annuelle" ? GOLD : TEAL_900, color: vue === "annuelle" ? TEAL_950 : "#cdeae4" }}>
          Vue annuelle
        </button>
        <button
 className="btn-app"
 onClick={() => setVue("activites")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "activites" ? GOLD : TEAL_900, color: vue === "activites" ? TEAL_950 : "#cdeae4" }}>
          📋 Activités
        </button>
      </div>

      {vue === "activites" ? (
        <ActivitesSemainePerimetre gems={gems} membres={membres} tribus={tribus} departements={departements} cardStyle={cardStyle} />
      ) : dimanches.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun dimanche enregistré pour l'instant — le pointage de présence en créera automatiquement.</p>
      ) : vue === "hebdomadaire" ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#a9d6cf", display: "block", marginBottom: 6 }}>Dimanche</label>
            <select
              value={dimancheChoisi || ""}
              onChange={e => setDimancheChoisi(e.target.value)}
              style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, minWidth: 220 }}
            >
              {dimanches.map(d => (
                <option key={d.id} value={d.id}>
                  {new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </option>
              ))}
            </select>
          </div>

          {chargement ? (
            <Chargement />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#a9d6cf", margin: 0 }}>Rapport du dimanche {dateFormatee}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
 className="btn-app"
 onClick={exporterCSVHebdomadaire} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📊 Exporter CSV (Excel)</button>
                  <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨️ Imprimer / PDF</button>
                  <button
 className="btn-app"
 onClick={partagerRapportHebdomadaire} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📤 Partager</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Présents ce dimanche</p><p style={{ fontSize: 28, fontWeight: 700, color: GOLD_LIGHT }}>{totalPresents}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Taux de présence</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tauxGlobal}%</p><ComparaisonPeriode actuel={tauxGlobal} precedent={tauxPrecedentHebdo} libellePeriode="dimanche dernier" /></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Santé spirituelle moy.</p><p style={{ fontSize: 28, fontWeight: 700, color: couleurScore(scoreMoyenGlobal) }}>{scoreMoyenGlobal !== null ? `${scoreMoyenGlobal}/10` : "—"}</p></div>
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Détail par GEM</p>
              {gems.length === 0 ? (
                <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun GEM créé pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {gems.map(g => {
                    const membresGem = membres.filter(m => m.gem_id === g.id);
                    const presentsGem = membresGem.filter(m => presences[m.id]).length;
                    const tauxGem = membresGem.length > 0 ? Math.round((presentsGem / membresGem.length) * 100) : 0;
                    const aUneDonneeDePresence = membresGem.some(m => presences[m.id] !== undefined);
                    return (
                      <div key={g.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <p style={{ fontWeight: 700 }}>{g.nom}</p>
                          <p style={{ fontSize: 12, color: "#a9d6cf" }}>{nomParent(g)}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: GOLD_LIGHT }}>{presentsGem} / {membresGem.length} présents</p>
                          <p style={{ fontSize: 12, color: "#a9d6cf", marginBottom: 6 }}>{tauxGem}% de présence</p>
                          {aUneDonneeDePresence ? (
                            <button
                              className="btn-app"
                              onClick={() => setGemRapportASupprimer(g)}
                              style={{ fontSize: 11, fontWeight: 700, color: RED_LIGHT, background: "none", border: `1px solid ${RED_LIGHT}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                            >
                              🗑️ Supprimer ce rapport
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: "#a9d6cf", fontStyle: "italic" }}>Aucun pointage pour cette semaine</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {gemRapportASupprimer && (
                <BoiteConfirmation
                  titre="Supprimer ce rapport de présence ?"
                  message={`Es-tu sûr de vouloir supprimer le rapport de présence de "${gemRapportASupprimer.nom}" pour ce dimanche ? Cette action est irréversible — le responsable devra repointer la présence.`}
                  texteConfirmer={suppressionRapportEnCours ? "…" : "Supprimer définitivement"}
                  dangereux
                  onConfirmer={supprimerRapportPresence}
                  onAnnuler={() => setGemRapportASupprimer(null)}
                />
              )}

              <p style={{ fontWeight: 600, fontSize: 14, marginTop: 28, marginBottom: 10 }}>📵 Absents ce dimanche ({membres.filter(m => presences[m.id] === false).length})</p>
              {membres.filter(m => presences[m.id] === false).length === 0 ? (
                <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun absent pointé pour ce dimanche.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {membres.filter(m => presences[m.id] === false).map(m => {
                    const gemMembre = gems.find(g => g.id === m.gem_id);
                    const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
                    const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, tu nous as manqué au culte de ce dimanche. Tout va bien ? Nous t'aimons et espérons te revoir bientôt. 🙏`);
                    return (
                      <div key={m.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                          <p style={{ fontSize: 12, color: "#a9d6cf" }}>{gemMembre?.nom || "GEM inconnu"} · {m.telephone}</p>
                          {motifsParMembre[m.id] && <p style={{ fontSize: 12, color: "#e8c25a", marginTop: 4 }}>Motif : {motifsParMembre[m.id]}</p>}
                        </div>
                        {m.telephone && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a title="Appeler" href={`tel:${m.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              📞</a>
                            <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              💬</a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      ) : vue === "mensuelle" ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#a9d6cf", display: "block", marginBottom: 6 }}>Mois</label>
            <select
              value={moisChoisi || ""}
              onChange={e => setMoisChoisi(e.target.value)}
              style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, minWidth: 220, textTransform: "capitalize" }}
            >
              {moisDisponibles.map(m => (
                <option key={m} value={m} style={{ textTransform: "capitalize" }}>{libelleMois(m)}</option>
              ))}
            </select>
          </div>

          {chargement ? (
            <Chargement />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#a9d6cf", margin: 0, textTransform: "capitalize" }}>Rapport de {libelleMois(moisChoisi)} — {dimanchesDuMois.length} dimanche(s) enregistré(s)</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
 className="btn-app"
 onClick={exporterCSVMensuel} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📊 Exporter CSV (Excel)</button>
                  <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨️ Imprimer / PDF</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Taux de présence moyen</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tauxMoyenMois}%</p><ComparaisonPeriode actuel={tauxMoyenMois} precedent={tauxPrecedentMois} libellePeriode="mois dernier" /></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Santé spirituelle moy.</p><p style={{ fontSize: 28, fontWeight: 700, color: couleurScore(scoreMoyenMois) }}>{scoreMoyenMois !== null ? `${scoreMoyenMois}/10` : "—"}</p></div>
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📈 Évolution du taux de présence — dimanche par dimanche</p>
              {evolutionHebdoDuMois.length === 0 ? (
                <p style={{ color: "#a9d6cf", fontSize: 13, marginBottom: 24 }}>Aucun dimanche pointé pour ce mois.</p>
              ) : (
                <div style={{ ...cardStyle, marginBottom: 28 }}>
                  <GraphiqueBarres
                    donnees={evolutionHebdoDuMois.map(d => ({
                      libelle: new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                      valeur: d.taux,
                      texteAffiche: `${d.taux}%`,
                      infoBulle: `${new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} : ${d.taux}% de présence`,
                    }))}
                    hauteur={130}
                  />
                </div>
              )}

              <PrixMeilleurGem gagnant={meilleurGemMois} titre="Meilleur GEM du mois" />
              <Classement titre="🏅 Classement complet des GEM" liste={classementGemsMois} suffixe=" pts" maxValeur={100} />

              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏆 Classement par régularité (présence)</p>
              <Classement titre="Tribus" liste={classementTribusPresenceMois} suffixe="%" maxValeur={100} />
              <Classement titre="Départements" liste={classementDepartementsPresenceMois} suffixe="%" maxValeur={100} />

              <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14 }}>🌱 Classement par santé spirituelle</p>
              <Classement titre="Tribus" liste={classementTribusSanteMois} suffixe="/10" maxValeur={10} />
              <Classement titre="Départements" liste={classementDepartementsSanteMois} suffixe="/10" maxValeur={10} />

              <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14 }}>🌱 Suivi des âmes — taux d'intégration des nouveaux convertis</p>
              <Classement titre="Tribus" liste={classementTribusAmes} suffixe="%" maxValeur={100} />
              <Classement titre="Départements" liste={classementDepartementsAmes} suffixe="%" maxValeur={100} />

              <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14 }}>📋 Rapports d'activités hebdomadaires validés</p>
              <Classement titre="Tribus" liste={classementTribusActiviteMois} suffixe="%" maxValeur={100} />
              <Classement titre="Départements" liste={classementDepartementsActiviteMois} suffixe="%" maxValeur={100} />

              <ClassementMembres liste={classementMembresMois} />
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#a9d6cf", display: "block", marginBottom: 6 }}>Année</label>
            <select
              value={anneeChoisie || ""}
              onChange={e => setAnneeChoisie(e.target.value)}
              style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, minWidth: 160 }}
            >
              {anneesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {chargement ? (
            <Chargement />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#a9d6cf", margin: 0 }}>Rapport annuel {anneeChoisie} — {dimanchesAnnee.length} dimanche(s) enregistré(s)</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
 className="btn-app"
 onClick={exporterCSVAnnuel} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📊 Exporter CSV (Excel)</button>
                  <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨️ Imprimer / PDF</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Taux de présence annuel</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tauxMoyenAnnee}%</p><ComparaisonPeriode actuel={tauxMoyenAnnee} precedent={tauxPrecedentAnnee} libellePeriode="année dernière" /></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Santé spirituelle moy.</p><p style={{ fontSize: 28, fontWeight: 700, color: couleurScore(scoreMoyenAnnee) }}>{scoreMoyenAnnee !== null ? `${scoreMoyenAnnee}/10` : "—"}</p></div>
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📈 Évolution mensuelle du taux de présence — {anneeChoisie}</p>
              {evolutionMensuelleAnnee.length === 0 ? (
                <p style={{ color: "#a9d6cf", fontSize: 13, marginBottom: 24 }}>Pas encore de données pour cette année.</p>
              ) : (
                <div style={{ ...cardStyle, marginBottom: 28 }}>
                  <GraphiqueBarres
                    donnees={evolutionMensuelleAnnee.map(m => ({
                      libelle: libelleMoisCourt(m.mois),
                      valeur: m.taux,
                      texteAffiche: `${m.taux}%`,
                      infoBulle: `${libelleMoisCourt(m.mois)} ${anneeChoisie} : ${m.taux}% de présence`,
                    }))}
                    hauteur={130}
                  />
                </div>
              )}

              <PrixMeilleurGem gagnant={meilleurGemAnnee} titre="Meilleur GEM de l'année" />
              <Classement titre="🏅 Classement complet des GEM" liste={classementGemsAnnee} suffixe=" pts" maxValeur={100} />

              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏆 Classement annuel par régularité (présence)</p>
              <Classement titre="Tribus" liste={classementTribusPresenceAnnee} suffixe="%" maxValeur={100} />
              <Classement titre="Départements" liste={classementDepartementsPresenceAnnee} suffixe="%" maxValeur={100} />

              <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14 }}>🌱 Classement annuel par santé spirituelle</p>
              <Classement titre="Tribus" liste={classementTribusSanteAnnee} suffixe="/10" maxValeur={10} />
              <Classement titre="Départements" liste={classementDepartementsSanteAnnee} suffixe="/10" maxValeur={10} />

              <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14 }}>🌱 Suivi des âmes — taux d'intégration des nouveaux convertis</p>
              <Classement titre="Tribus" liste={classementTribusAmes} suffixe="%" maxValeur={100} />
              <Classement titre="Départements" liste={classementDepartementsAmes} suffixe="%" maxValeur={100} />

              <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14 }}>📋 Rapports d'activités hebdomadaires validés</p>
              <Classement titre="Tribus" liste={classementTribusActiviteAnnee} suffixe="%" maxValeur={100} />
              <Classement titre="Départements" liste={classementDepartementsActiviteAnnee} suffixe="%" maxValeur={100} />

              <ClassementMembres liste={classementMembresAnnee} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------- Messagerie ------------------------------- */

function PageMessagerie({ compte, estPasteur, onActionnee, cardStyle }) {
  const [onglet, setOnglet] = useState("diffusion"); // diffusion | direct | rappels
  const [messages, setMessages] = useState([]);
  const [messagesDirects, setMessagesDirects] = useState([]);
  const [notificationsPerso, setNotificationsPerso] = useState([]);
  const [comptesParId, setComptesParId] = useState({});
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerTout();
    if (!estPasteur) {
      supabase.from("comptes").update({ dernier_message_lu: new Date().toISOString() }).eq("id", compte.id).then(() => { if (onActionnee) onActionnee(); });
    }
  }, []);

  async function chargerTout() {
    setChargement(true);
    const [{ data: m }, { data: md }, { data: np }] = await Promise.all([
      supabase.from("messages").select("*").order("date", { ascending: false }).limit(30),
      supabase.from("messages_directs").select("*").order("date", { ascending: false }).limit(50),
      supabase.from("notifications_personnelles").select("*").eq("compte_id", compte.id).order("date_creation", { ascending: false }).limit(30),
    ]);
    setMessages(m || []);
    setMessagesDirects(md || []);
    setNotificationsPerso(np || []);
    if (estPasteur && md && md.length > 0) {
      const ids = [...new Set(md.map(x => x.de_compte_id))];
      const { data: c } = await supabase.from("comptes").select("*").in("id", ids);
      const map = {};
      (c || []).forEach(cc => { map[cc.id] = cc; });
      setComptesParId(map);
    }
    setChargement(false);
  }

  async function marquerRappelLu(id) {
    await supabase.from("notifications_personnelles").update({ lu: true }).eq("id", id);
    chargerTout();
  }

  async function envoyerDiffusion() {
    if (!texte.trim()) return;
    const { error } = await supabase.from("messages").insert({ texte: texte.trim(), de_compte_id: compte.id });
    if (!error) { setTexte(""); chargerTout(); }
  }

  async function envoyerDirect() {
    if (!texte.trim()) return;
    const { error } = await supabase.from("messages_directs").insert({ texte: texte.trim(), de_compte_id: compte.id });
    if (!error) { setTexte(""); chargerTout(); }
  }

  async function marquerLu(id) {
    await supabase.from("messages_directs").update({ lu: true }).eq("id", id);
    chargerTout();
    if (onActionnee) onActionnee();
  }

  function formaterDate(d) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const nonLus = messagesDirects.filter(m => !m.lu).length;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Messagerie</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
 className="btn-app"
 onClick={() => setOnglet("diffusion")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "diffusion" ? GOLD : TEAL_900, color: onglet === "diffusion" ? TEAL_950 : "#cdeae4" }}>
          Messages du pasteur
        </button>
        <button
 className="btn-app"
 onClick={() => setOnglet("direct")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "direct" ? GOLD : TEAL_900, color: onglet === "direct" ? TEAL_950 : "#cdeae4" }}>
          {estPasteur ? "Boîte de réception" : "Écrire au pasteur"}{estPasteur && nonLus > 0 ? ` (${nonLus})` : ""}
        </button>
        <button
 className="btn-app"
 onClick={() => setOnglet("rappels")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "rappels" ? GOLD : TEAL_900, color: onglet === "rappels" ? TEAL_950 : "#cdeae4" }}>
          🔔 Mes rappels{notificationsPerso.filter(n => !n.lu).length > 0 ? ` (${notificationsPerso.filter(n => !n.lu).length})` : ""}
        </button>
      </div>

      {chargement ? (
        <Chargement />
      ) : onglet === "diffusion" ? (
        <div>
          {estPasteur && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Envoyer un message à tous</p>
              <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3} placeholder="Écris ton message ici..." style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
              <button
 className="btn-app"
 onClick={envoyerDiffusion} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
            </div>
          )}
          {messages.length === 0 ? (
            <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun message pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map(m => (
                <div key={m.id} style={cardStyle}>
                  <p style={{ whiteSpace: "pre-wrap" }}>{m.texte}</p>
                  <p style={{ fontSize: 11, color: "#a9d6cf", marginTop: 8 }}>{formaterDate(m.date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : onglet === "direct" ? (
        <div>
          {!estPasteur && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Écrire au pasteur</p>
              <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3} placeholder="Ton message..." style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
              <button
 className="btn-app"
 onClick={envoyerDirect} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
            </div>
          )}
          {messagesDirects.length === 0 ? (
            <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun message pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messagesDirects.map(m => (
                <div key={m.id} style={{ ...cardStyle, borderColor: !m.lu && estPasteur ? GOLD : TEAL_700 }}>
                  {estPasteur && <p style={{ fontSize: 12, fontWeight: 700, color: GOLD_LIGHT, marginBottom: 4 }}>{comptesParId[m.de_compte_id]?.nom || "…"}</p>}
                  <p style={{ whiteSpace: "pre-wrap" }}>{m.texte}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <p style={{ fontSize: 11, color: "#a9d6cf" }}>{formaterDate(m.date)}</p>
                    {estPasteur && !m.lu && (
                      <button
 className="btn-app"
 onClick={() => marquerLu(m.id)} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Marquer comme lu</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 16 }}>Rappels automatiques générés par l'application (ex : rapport hebdomadaire non validé).</p>
          {notificationsPerso.length === 0 ? (
            <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun rappel pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notificationsPerso.map(n => (
                <div key={n.id} style={{ ...cardStyle, borderColor: !n.lu ? GOLD : TEAL_700 }}>
                  <p style={{ whiteSpace: "pre-wrap" }}>{n.texte}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <p style={{ fontSize: 11, color: "#a9d6cf" }}>{formaterDate(n.date_creation)}</p>
                    {!n.lu && (
                      <button
 className="btn-app"
 onClick={() => marquerRappelLu(n.id)} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Marquer comme lu</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Calendrier ------------------------------- */

function PageCalendrier({ estPasteur, compte, onOuverture, cardStyle }) {
  const [evenements, setEvenements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [debut, setDebut] = useState("");
  const [lieu, setLieu] = useState("");
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    chargerEvenements();
    supabase.from("comptes").update({ dernier_evenement_vu: new Date().toISOString() }).eq("id", compte.id).then(() => { if (onOuverture) onOuverture(); });
  }, []);

  async function chargerEvenements() {
    setChargement(true);
    const { data } = await supabase.from("evenements").select("*").order("debut", { ascending: true });
    setEvenements(data || []);
    setChargement(false);
  }

  async function creerEvenement() {
    setErreur("");
    if (!titre.trim() || !debut) { setErreur("Le titre et la date sont obligatoires."); return; }
    const { error } = await supabase.from("evenements").insert({
      titre: titre.trim(), debut: new Date(debut).toISOString(),
      lieu: lieu.trim() || null, description: description.trim() || null, cree_par: compte.id,
    });
    if (error) { setErreur(error.message); return; }
    setTitre(""); setDebut(""); setLieu(""); setDescription(""); setFormOuvert(false);
    chargerEvenements();
  }

  async function supprimerEvenement(id) {
    await supabase.from("evenements").delete().eq("id", id);
    chargerEvenements();
  }

  function telechargerICS(e) {
    const debutICS = new Date(e.debut).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const contenu = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
      `UID:${e.id}@gestiongem`, `DTSTAMP:${debutICS}`, `DTSTART:${debutICS}`,
      `SUMMARY:${e.titre}`, e.lieu ? `LOCATION:${e.lieu}` : "", e.description ? `DESCRIPTION:${e.description.replace(/\n/g, "\\n")}` : "",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([contenu], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${e.titre.replace(/[^a-z0-9]/gi, "_")}.ics`; a.click();
    URL.revokeObjectURL(url);
  }

  const maintenant = new Date();
  const aVenir = evenements.filter(e => new Date(e.debut) >= maintenant);
  const passes = evenements.filter(e => new Date(e.debut) < maintenant).reverse();

  function CarteEvenement({ e }) {
    const date = new Date(e.debut);
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontWeight: 700 }}>{e.titre}</p>
            <p style={{ fontSize: 12, color: GOLD_LIGHT, marginTop: 2 }}>
              {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            {e.lieu && <p style={{ fontSize: 12, color: "#a9d6cf", marginTop: 2 }}>📍 {e.lieu}</p>}
            {e.description && <p style={{ fontSize: 13, marginTop: 6 }}>{e.description}</p>}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
 className="btn-app"
 onClick={() => telechargerICS(e)} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: `1px solid ${TEAL_600}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Ajouter au calendrier</button>
            {estPasteur && (
              <button
 className="btn-app"
 onClick={() => supprimerEvenement(e.id)} style={{ fontSize: 11, fontWeight: 700, color: "#fff", backgroundColor: RED_LIGHT, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Supprimer</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Calendrier</h2>

      {estPasteur && (
        <div style={{ marginBottom: 20 }}>
          {formOuvert ? (
            <div style={cardStyle}>
              <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Nouvel événement</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'événement" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <input value={debut} onChange={e => setDebut(e.target.value)} type="datetime-local" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Lieu (optionnel)" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Description (optionnelle)" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
                {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
 className="btn-app"
 onClick={creerEvenement} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Créer</button>
                  <button
 className="btn-app"
 onClick={() => setFormOuvert(false)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: "transparent", color: "#a9d6cf", border: `1px solid ${TEAL_600}`, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            </div>
          ) : (
            <button
 className="btn-app"
 onClick={() => setFormOuvert(true)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Nouvel événement</button>
          )}
        </div>
      )}

      {chargement ? (
        <Chargement />
      ) : (
        <>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>À venir</p>
          {aVenir.length === 0 ? (
            <p style={{ color: "#a9d6cf", fontSize: 13, marginBottom: 20 }}>Aucun événement prévu pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {aVenir.map(e => <CarteEvenement key={e.id} e={e} />)}
            </div>
          )}

          {passes.length > 0 && (
            <>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "#a9d6cf" }}>Passés</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.6 }}>
                {passes.map(e => <CarteEvenement key={e.id} e={e} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------- Historique ------------------------------- */

// Graphique en barres réutilisable, avec grille de fond et info-bulle au survol.
// Graphique à axe zéro central — pour des valeurs qui peuvent être positives (croissance)
// ou négatives (décroissance), comme la croissance numérique de l'église.
function GraphiqueCroissance({ donnees, hauteur = 160 }) {
  if (!donnees || donnees.length === 0) return null;
  const maxAbs = Math.max(1, ...donnees.map(d => Math.abs(d.valeur)));
  const demiHauteur = (hauteur - 40) / 2;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: hauteur / 2, borderTop: "1px solid rgba(255,255,255,0.25)", width: "100%" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: hauteur, overflowX: "auto", paddingBottom: 4 }}>
        {donnees.map((d, i) => {
          const positif = d.valeur >= 0;
          const tailleBarre = Math.max(3, (Math.abs(d.valeur) / maxAbs) * demiHauteur);
          return (
            <div key={i} title={d.infoBulle || `${d.libelle} : ${d.valeur > 0 ? "+" : ""}${d.valeur}`} className="barre-graphique" style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40, height: "100%", justifyContent: "center", cursor: "default" }}>
              <div style={{ height: demiHauteur, display: "flex", flexDirection: "column-reverse", alignItems: "center", justifyContent: "flex-start" }}>
                {positif && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#6fcf97", fontWeight: 700, marginBottom: 2 }}>+{d.valeur}</span>
                    <div style={{ width: 22, height: tailleBarre, backgroundColor: "#6fcf97", borderRadius: "4px 4px 0 0", transition: "height 0.4s ease" }} />
                  </div>
                )}
              </div>
              <div style={{ height: demiHauteur, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
                {!positif && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 22, height: tailleBarre, backgroundColor: RED_LIGHT, borderRadius: "0 0 4px 4px", transition: "height 0.4s ease" }} />
                    <span style={{ fontSize: 10, color: RED_LIGHT, fontWeight: 700, marginTop: 2 }}>{d.valeur}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 9, color: "#a9d6cf", marginTop: 6, whiteSpace: "nowrap" }}>{d.libelle}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraphiqueBarres({ donnees, hauteur = 140 }) {
  // donnees: [{ libelle, valeur, texteAffiche, couleur, infoBulle }]
  if (!donnees || donnees.length === 0) return null;
  const max = Math.max(1, ...donnees.map(d => d.valeur));
  const lignesGrille = [0.25, 0.5, 0.75, 1];
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: hauteur, display: "flex", flexDirection: "column-reverse", justifyContent: "space-between", pointerEvents: "none" }}>
        {lignesGrille.map((l, i) => (
          <div key={i} style={{ borderTop: "1px dashed rgba(255,255,255,0.18)", width: "100%" }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: hauteur, overflowX: "auto", paddingBottom: 4, position: "relative" }}>
        {donnees.map((d, i) => (
          <div key={i} title={d.infoBulle || `${d.libelle} : ${d.texteAffiche}`} className="barre-graphique" style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 34, cursor: "default" }}>
            <span style={{ fontSize: 10, color: d.couleur || GOLD_LIGHT, fontWeight: 700, marginBottom: 3 }}>{d.texteAffiche}</span>
            <div style={{ width: 20, height: Math.max(4, (d.valeur / max) * (hauteur - 50)), backgroundColor: d.couleur || GOLD, borderRadius: 4, transition: "height 0.4s ease" }} />
            <span style={{ fontSize: 9, color: "#a9d6cf", marginTop: 4, whiteSpace: "nowrap" }}>{d.libelle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageHistorique({ cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [presenceParDimanche, setPresenceParDimanche] = useState([]); // [{ date, presents, total }]
  const [presenceParMois, setPresenceParMois] = useState([]); // [{ mois, taux }]
  const [santeParMois, setSanteParMois] = useState([]); // [{ mois, moyenne }]
  const [activiteParMois, setActiviteParMois] = useState([]); // [{ mois, taux }]
  const [croissanceParMois, setCroissanceParMois] = useState([]); // [{ mois, nouveaux, partis, net }]
  const [totalMembres, setTotalMembres] = useState(0);
  const [totalGems, setTotalGems] = useState(0);

  useEffect(() => { chargerHistorique(); }, []);

  async function chargerHistorique() {
    setChargement(true);
    const [{ data: dimanchesRecents }, { data: dimanchesTous }, { data: presences }, { data: sante }, { data: activites }, { data: membresTous }, { data: departsApprouves }, { count: nbMembres }, { count: nbGems }] = await Promise.all([
      supabase.from("dimanches").select("*").order("date", { ascending: true }).limit(16),
      supabase.from("dimanches").select("*").order("date", { ascending: true }).limit(200),
      supabase.from("presences").select("*"),
      supabase.from("sante_spirituelle").select("*"),
      supabase.from("activites_semaine").select("*").eq("valide", true),
      supabase.from("membres").select("id, created_at"),
      supabase.from("demandes_suppression_membre").select("*").eq("statut", "approuvee"),
      supabase.from("membres").select("*", { count: "exact", head: true }),
      supabase.from("gems").select("*", { count: "exact", head: true }),
    ]);
    setTotalMembres(nbMembres || 0);
    setTotalGems(nbGems || 0);

    const evolutionPresence = (dimanchesRecents || []).map(d => {
      const presentsCeDimanche = (presences || []).filter(p => p.dimanche_id === d.id && p.present).length;
      const totalPointe = (presences || []).filter(p => p.dimanche_id === d.id).length;
      return { date: d.date, presents: presentsCeDimanche, total: totalPointe };
    });
    setPresenceParDimanche(evolutionPresence);

    // Taux de présence moyen par mois (sur l'ensemble des dimanches enregistrés, pas seulement les 16 derniers)
    const moisDimanches = {};
    (dimanchesTous || []).forEach(d => {
      const cle = d.date.slice(0, 7);
      if (!moisDimanches[cle]) moisDimanches[cle] = [];
      moisDimanches[cle].push(d.id);
    });
    const evolutionPresenceMois = Object.entries(moisDimanches)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mois, idsDim]) => {
        const presentsMois = (presences || []).filter(p => idsDim.includes(p.dimanche_id) && p.present).length;
        const slotsMois = idsDim.length * (nbMembres || 0);
        const taux = slotsMois > 0 ? Math.round((presentsMois / slotsMois) * 100) : 0;
        return { mois, taux };
      });
    setPresenceParMois(evolutionPresenceMois);

    // Taux de rapports d'activités validés par mois
    const evolutionActiviteMois = Object.entries(moisDimanches)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mois, idsDim]) => {
        const validesMois = (activites || []).filter(a => idsDim.includes(a.dimanche_id)).length;
        const attenduMois = idsDim.length * (nbGems || 0);
        const taux = attenduMois > 0 ? Math.round((validesMois / attenduMois) * 100) : 0;
        return { mois, taux };
      });
    setActiviteParMois(evolutionActiviteMois);

    // Croissance numérique de l'église : nouveaux membres vs départs approuvés, mois par mois
    const moisAvecDonnees = new Set();
    (membresTous || []).forEach(m => { if (m.created_at) moisAvecDonnees.add(m.created_at.slice(0, 7)); });
    (departsApprouves || []).forEach(d => { if (d.date_traitement) moisAvecDonnees.add(d.date_traitement.slice(0, 7)); });
    const douzeDerniersMois = [...moisAvecDonnees].sort().slice(-12);
    const evolutionCroissance = douzeDerniersMois.map(mois => {
      const nouveaux = (membresTous || []).filter(m => m.created_at && m.created_at.slice(0, 7) === mois).length;
      const partis = (departsApprouves || []).filter(d => d.date_traitement && d.date_traitement.slice(0, 7) === mois).length;
      return { mois, nouveaux, partis, net: nouveaux - partis };
    });
    setCroissanceParMois(evolutionCroissance);

    const parMois = {};
    (sante || []).forEach(s => {
      const cle = s.date_maj.slice(0, 7); // YYYY-MM
      const moy = moyenneSante(s);
      if (moy === null) return;
      if (!parMois[cle]) parMois[cle] = [];
      parMois[cle].push(moy);
    });
    const evolutionSante = Object.entries(parMois)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mois, valeurs]) => ({ mois, moyenne: Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 10) / 10 }));
    setSanteParMois(evolutionSante);

    setChargement(false);
  }

  function libelleMois(cle) {
    const [annee, mois] = cle.split("-");
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  }

  const maxPresents = Math.max(1, ...presenceParDimanche.map(p => p.presents));

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Historique</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>Évolution de l'assemblée dans le temps — {totalMembres} membres suivis au total.</p>

      {chargement ? (
        <Chargement />
      ) : (
        <>
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>📈 Croissance numérique de l'église — {totalMembres} membres actuellement</p>
            <p style={{ fontSize: 11, color: "#a9d6cf", marginBottom: 16 }}>Nouveaux membres (vert) contre départs approuvés (rouge), mois par mois. Solde net affiché sur chaque barre.</p>
            {croissanceParMois.length === 0 ? (
              <p style={{ color: "#a9d6cf", fontSize: 13 }}>Pas encore assez de données pour tracer cette courbe — elle se remplira au fil des ajouts de membres.</p>
            ) : (
              <GraphiqueCroissance
                donnees={croissanceParMois.map(c => ({
                  libelle: libelleMois(c.mois),
                  valeur: c.net,
                  infoBulle: `${libelleMois(c.mois)} : ${c.nouveaux} nouveau(x), ${c.partis} parti(s) — solde ${c.net > 0 ? "+" : ""}${c.net}`,
                }))}
              />
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Présence par dimanche</p>
            {presenceParDimanche.length === 0 ? (
              <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun pointage de présence pour l'instant.</p>
            ) : (
              <GraphiqueBarres
                donnees={presenceParDimanche.map(p => ({
                  libelle: new Date(p.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                  valeur: p.presents,
                  texteAffiche: p.presents,
                  infoBulle: `${new Date(p.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} : ${p.presents} présent(s)`,
                }))}
              />
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Taux de présence moyen par mois</p>
            {presenceParMois.length === 0 ? (
              <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucune donnée mensuelle pour l'instant.</p>
            ) : (
              <GraphiqueBarres
                donnees={presenceParMois.map(m => ({
                  libelle: libelleMois(m.mois),
                  valeur: m.taux,
                  texteAffiche: `${m.taux}%`,
                  infoBulle: `${libelleMois(m.mois)} : ${m.taux}% de présence`,
                }))}
              />
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Santé spirituelle moyenne par mois</p>
            {santeParMois.length === 0 ? (
              <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucune évaluation enregistrée pour l'instant.</p>
            ) : (
              <GraphiqueBarres
                donnees={santeParMois.map(s => ({
                  libelle: libelleMois(s.mois),
                  valeur: s.moyenne,
                  texteAffiche: s.moyenne,
                  couleur: couleurScore(s.moyenne),
                  infoBulle: `${libelleMois(s.mois)} : santé spirituelle moyenne ${s.moyenne}/10`,
                }))}
              />
            )}
          </div>

          <div style={cardStyle}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📋 Rapports d'activités validés par mois</p>
            {activiteParMois.length === 0 ? (
              <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun rapport d'activité enregistré pour l'instant.</p>
            ) : (
              <GraphiqueBarres
                donnees={activiteParMois.map(a => ({
                  libelle: libelleMois(a.mois),
                  valeur: a.taux,
                  texteAffiche: `${a.taux}%`,
                  infoBulle: `${libelleMois(a.mois)} : ${a.taux}% des GEM ont rapporté leurs activités`,
                }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
