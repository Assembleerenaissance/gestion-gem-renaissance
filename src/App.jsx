import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { BERGER_IMG } from "./bergerImage";
import { LOGO_VH } from "./logoVH";
import { SANOGO_IMG } from "./sanogoImage";

/* ============================================================================
   GESTION DES GEM — Étape 2 : Tribus, Départements, GEM, Membres
   ============================================================================ */

const TEAL_950 = "var(--bg-base)", TEAL_900 = "var(--bg-surface)", TEAL_850 = "var(--bg-surface-2)";
const TEAL_800 = "var(--bg-surface-3)", TEAL_700 = "var(--border-1)", TEAL_600 = "var(--border-2)";
const GOLD = "var(--gold)", GOLD_LIGHT = "var(--gold-light)", CREAM = "var(--text-primary)";
const RED_LIGHT = "var(--red)";
const VERT_DOUX = "var(--green)";
const TEXTE_SECONDAIRE = "var(--text-secondary)", TEXTE_SECONDAIRE_2 = "var(--text-secondary-2)";

// Filet de sécurité : si un bug imprévu survient n'importe où dans l'application,
// on affiche un message clair avec un bouton pour recharger, plutôt qu'un écran blanc.
// Styles globaux : transitions douces et effets de survol, injectés une seule fois.
// Motif signature — un épi de blé, en écho à la "Moisson" (GEM = Groupe
// d'Évangélisation et de Moisson). Utilisé avec retenue, jamais en excès.
// État vide soigné — remplace le simple texte gris par une invitation à agir,
// avec une icône discrète dans un halo doré. Utilisé partout où il n'y a
// encore aucune donnée (fréquent tant que l'église remplit l'application).
// Avatar en initiales — chaque personne obtient une couleur cohérente (dérivée
// de son nom, toujours la même), tirée d'une palette en harmonie avec l'identité
// de l'app plutôt que toujours le même doré uniforme.
const PALETTE_AVATARS = [
  { fond: "var(--gold)", texte: "var(--bg-base)" }, // or
  { fond: "var(--green)", texte: "var(--bg-base)" }, // vert doux
  { fond: "#7BAFC4", texte: "var(--bg-base)" }, // bleu-teal clair
  { fond: "#C98A6B", texte: "var(--text-primary)" }, // terre cuite
  { fond: "#A98FCB", texte: "var(--text-primary)" }, // mauve doux
  { fond: "var(--red)", texte: "var(--text-primary)" }, // corail
];
function AvatarInitiales({ nom, taille = 64 }) {
  const initiales = (nom || "?").split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
  let hash = 0;
  for (let i = 0; i < (nom || "").length; i++) hash = (hash * 31 + nom.charCodeAt(i)) % PALETTE_AVATARS.length;
  const { fond, texte } = PALETTE_AVATARS[Math.abs(hash) % PALETTE_AVATARS.length];
  return (
    <div style={{
      width: taille, height: taille, borderRadius: "50%", backgroundColor: fond, color: texte,
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
      fontSize: taille * 0.36, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }}>
      {initiales}
    </div>
  );
}

// Carrousel d'images — défile automatiquement, avec indicateurs et
// possibilité de glisser au doigt sur mobile.
// Barre de progression qui se remplit progressivement à l'affichage, au lieu
// d'apparaître déjà pleine — plus vivant, surtout dans les classements.
function BarreProgression({ pourcentage, couleur, hauteur = 6 }) {
  const [largeur, setLargeur] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLargeur(Math.min(100, pourcentage)));
    return () => cancelAnimationFrame(id);
  }, [pourcentage]);
  return (
    <div style={{ height: hauteur, borderRadius: 999, backgroundColor: TEAL_900, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${largeur}%`, backgroundColor: couleur || GOLD, borderRadius: 999, transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

// Enregistreur de message vocal — enregistre depuis le micro (limité à 90
// secondes), permet d'écouter avant d'envoyer, ou d'annuler et recommencer.
function EnregistreurVocal({ onEnregistrementPret, onAnnuler }) {
  const [statut, setStatut] = useState("pret"); // pret | enregistrement | termine
  const [duree, setDuree] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const morceauxRef = useRef([]);
  const intervalleRef = useRef(null);
  const DUREE_MAX = 90;

  useEffect(() => {
    return () => {
      if (intervalleRef.current) clearInterval(intervalleRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function demarrerEnregistrement() {
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(flux);
      morceauxRef.current = [];
      recorder.ondataavailable = e => morceauxRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(morceauxRef.current, { type: "audio/webm" });
        const lecteur = new FileReader();
        lecteur.onload = () => { setAudioUrl(lecteur.result); setStatut("termine"); };
        lecteur.readAsDataURL(blob);
        flux.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatut("enregistrement");
      setDuree(0);
      intervalleRef.current = setInterval(() => {
        setDuree(d => {
          if (d + 1 >= DUREE_MAX) { arreterEnregistrement(); return d; }
          return d + 1;
        });
      }, 1000);
    } catch {
      toast("Impossible d'accéder au microphone — vérifie les autorisations.", "erreur");
    }
  }

  function arreterEnregistrement() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    if (intervalleRef.current) clearInterval(intervalleRef.current);
  }

  function recommencer() {
    setStatut("pret"); setAudioUrl(null); setDuree(0);
  }

  function formaterDuree(s) {
    const min = Math.floor(s / 60), sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div style={{ backgroundColor: TEAL_900, border: `1px solid ${TEAL_600}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      {statut === "pret" && (
        <button className="btn-app" onClick={demarrerEnregistrement} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 10, backgroundColor: RED_LIGHT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <IconeMicro size={16} /> Enregistrer un message vocal
        </button>
      )}
      {statut === "enregistrement" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: RED_LIGHT, animation: "cocher 1s ease-in-out infinite" }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{formaterDuree(duree)} / {formaterDuree(DUREE_MAX)}</span>
          </div>
          <button className="btn-app" onClick={arreterEnregistrement} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Arrêter</button>
        </div>
      )}
      {statut === "termine" && audioUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <audio controls src={audioUrl} style={{ width: "100%", height: 36 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-app" onClick={() => onEnregistrementPret(audioUrl)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Envoyer</button>
            <button className="btn-app" onClick={recommencer} style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Recommencer</button>
          </div>
        </div>
      )}
      <button onClick={onAnnuler} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer", textAlign: "center" }}>Annuler</button>
    </div>
  );
}

// "Parole du jour" — un verset ou une pensée qui change chaque jour, avec une
// animation de révélation douce. Donne une vraie raison spirituelle de se
// connecter chaque matin, sans tomber dans la mécanique de "streak" forcée.
const PAROLES_DU_JOUR = [
  // --- Zèle pour le service de Dieu ---
  { verset: "Ayez du zèle, et non de la paresse. Soyez fervents d'esprit. Servez le Seigneur.", reference: "Romains 12:11" },
  { verset: "Il est beau d'avoir du zèle pour ce qui est bien et en tout temps, et non pas seulement quand je suis présent parmi vous.", reference: "Galates 4:18" },
  // --- Récompense des serviteurs de Dieu ---
  { verset: "C'est bien, bon et fidèle serviteur ; tu as été fidèle en peu de chose, je te confierai beaucoup ; entre dans la joie de ton maître.", reference: "Matthieu 25:21" },
  { verset: "Sachant que vous recevrez du Seigneur l'héritage pour récompense. Servez Christ, le Seigneur.", reference: "Colossiens 3:24" },
  { verset: "Voici, je viens bientôt, et ma rétribution est avec moi, pour rendre à chacun selon ce qu'est son œuvre.", reference: "Apocalypse 22:12" },
  // --- Encouragement à servir Dieu ---
  { verset: "Choisissez aujourd'hui qui vous voulez servir... Moi et ma maison, nous servirons l'Éternel.", reference: "Josué 24:15" },
  { verset: "Servez l'Éternel avec crainte, et réjouissez-vous avec tremblement.", reference: "Psaume 2:11" },
  // --- Prendre soin des brebis du Seigneur ---
  { verset: "Paissez le troupeau de Dieu qui est sous votre garde, non par contrainte, mais volontairement, selon Dieu ; non pour un gain sordide, mais avec dévouement.", reference: "1 Pierre 5:2" },
  { verset: "Le bon berger donne sa vie pour ses brebis.", reference: "Jean 10:11" },
  // --- Paître les brebis, les enseigner ---
  { verset: "Pais mes brebis.", reference: "Jean 21:17" },
  { verset: "Prenez donc garde à vous-mêmes, et à tout le troupeau sur lequel le Saint-Esprit vous a établis évêques, pour paître l'Église du Seigneur.", reference: "Actes 20:28" },
  { verset: "Enseignez-leur à observer tout ce que je vous ai prescrit. Et voici, je suis avec vous tous les jours, jusqu'à la fin du monde.", reference: "Matthieu 28:20" },
  // --- Visiter les âmes ---
  { verset: "La religion pure et sans tache, devant Dieu notre Père, consiste à visiter les orphelins et les veuves dans leurs afflictions.", reference: "Jacques 1:27" },
  { verset: "J'étais malade, et vous m'avez visité.", reference: "Matthieu 25:36" },
  // --- La joie de servir Dieu ---
  { verset: "Servez l'Éternel, avec joie, venez avec allégresse en sa présence.", reference: "Psaume 100:2" },
  { verset: "La joie de l'Éternel sera votre force.", reference: "Néhémie 8:10" },
  // --- L'héritage des serviteurs de Dieu ---
  { verset: "Les richesses de la gloire de son héritage qu'il réserve aux saints.", reference: "Éphésiens 1:18" },
  // --- Amour pour Dieu ---
  { verset: "Tu aimeras le Seigneur, ton Dieu, de tout ton cœur, de toute ton âme, et de toute ta pensée.", reference: "Matthieu 22:37" },
  { verset: "Nous l'aimons parce qu'il nous a aimés le premier.", reference: "1 Jean 4:19" },
  // --- La persévérance ---
  { verset: "Ne nous lassons pas de faire le bien ; car nous moissonnerons au temps convenable, si nous ne relâchons pas.", reference: "Galates 6:9" },
  { verset: "Courons avec persévérance dans la carrière qui nous est ouverte.", reference: "Hébreux 12:1" },
  // --- La foi ---
  { verset: "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.", reference: "Hébreux 11:1" },
  { verset: "Sans la foi, il est impossible de lui être agréable.", reference: "Hébreux 11:6" },
  // --- La sanctification ---
  { verset: "Ce que Dieu veut, c'est votre sanctification.", reference: "1 Thessaloniciens 4:3" },
  { verset: "Recherchez la paix avec tous, et la sanctification, sans laquelle personne ne verra le Seigneur.", reference: "Hébreux 12:14" },
  // --- L'évangélisation ---
  { verset: "Allez par tout le monde, et prêchez la bonne nouvelle à toute la création.", reference: "Marc 16:15" },
  { verset: "Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit.", reference: "Matthieu 28:19" },
  // --- Le salut des âmes ---
  { verset: "Quiconque invoquera le nom du Seigneur sera sauvé.", reference: "Romains 10:13" },
  { verset: "Le Fils de l'homme est venu chercher et sauver ce qui était perdu.", reference: "Luc 19:10" },
  // --- La bénédiction des serviteurs de Dieu ---
  { verset: "Heureux ce serviteur, que son maître, à son arrivée, trouvera faisant ainsi !", reference: "Matthieu 24:46" },
  { verset: "Que l'Éternel te bénisse, et qu'il te garde !", reference: "Nombres 6:24" },
];

function ParoleDuJour() {
  const [revelee, setRevelee] = useState(false);
  const jourAnnee = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const parole = PAROLES_DU_JOUR[jourAnnee % PAROLES_DU_JOUR.length];

  useEffect(() => {
    const id = setTimeout(() => setRevelee(true), 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, rgba(214,165,76,0.12), rgba(143,203,168,0.06))", border: `1px solid ${GOLD}55`, borderRadius: 16, padding: "18px 20px", marginBottom: 20, textAlign: "center" }}>
      <div style={{ position: "absolute", top: -10, left: -10, pointerEvents: "none" }}><EpiDeBle size={40} opacity={0.08} /></div>
      <p style={{ fontSize: 11, fontWeight: 700, color: GOLD_LIGHT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>🕊️ Parole du jour</p>
      <div style={{ minHeight: 62, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p
          className="titre-moisson"
          style={{
            fontSize: 15, fontStyle: "italic", color: "var(--text-primary)", lineHeight: 1.6, maxWidth: 480, margin: 0,
            opacity: revelee ? 1 : 0, transform: revelee ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}
        >
          « {parole.verset} »
        </p>
      </div>
      <p style={{ fontSize: 12, color: GOLD_LIGHT, fontWeight: 700, marginTop: 8, opacity: revelee ? 1 : 0, transition: "opacity 1s ease 0.3s" }}>— {parole.reference}</p>
    </div>
  );
}

function CarrouselImages({ evenements }) {
  const [index, setIndex] = useState(0);
  const debutGlissement = useRef(null);

  useEffect(() => {
    if (evenements.length <= 1) return;
    const intervalle = setInterval(() => setIndex(i => (i + 1) % evenements.length), 5000);
    return () => clearInterval(intervalle);
  }, [evenements.length]);

  if (evenements.length === 0) return null;

  function surDebutGlissement(e) { debutGlissement.current = e.touches[0].clientX; }
  function surFinGlissement(e) {
    if (debutGlissement.current === null) return;
    const diff = debutGlissement.current - e.changedTouches[0].clientX;
    if (diff > 50) setIndex(i => (i + 1) % evenements.length);
    else if (diff < -50) setIndex(i => (i - 1 + evenements.length) % evenements.length);
    debutGlissement.current = null;
  }

  const e = evenements[index];

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        onTouchStart={surDebutGlissement}
        onTouchEnd={surFinGlissement}
        style={{ position: "relative", borderRadius: 18, overflow: "hidden", height: 200, backgroundColor: TEAL_900, boxShadow: "0 10px 26px rgba(0,0,0,0.28)" }}
      >
        {evenements.map((ev, i) => (
          <img
            key={ev.id}
            src={ev.image}
            alt={ev.titre}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: i === index ? 1 : 0, transition: "opacity 0.6s ease",
            }}
          />
        ))}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.72) 100%)" }} />
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0, textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>{e.titre}</p>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, margin: "2px 0 0" }}>
            {new Date(e.debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}{e.lieu ? ` — ${e.lieu}` : ""}
          </p>
        </div>
        {evenements.length > 1 && (
          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 5 }}>
            {evenements.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: i === index ? GOLD : "rgba(255,255,255,0.5)", transition: "width 0.3s ease", padding: 0 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Parcours de bienvenue — quelques écrans montrés une seule fois, à la
// première connexion, adaptés selon que la personne est pasteur ou responsable.
function ParcoursBienvenue({ compte, onTermine }) {
  const [etape, setEtape] = useState(0);

  const etapesPasteur = [
    { icone: EpiDeBle, titre: "Bienvenue, Pasteur Dimitri", texte: "Cette application t'aide à suivre chaque membre, GEM, tribu et département de l'Assemblée RENAISSANCE — présence, santé spirituelle, et bien plus." },
    { icone: IconeGroupe, titre: "Tout part des GEM", texte: "Chaque tribu et département est organisé en GEM. Les responsables y pointent la présence, les activités et la santé spirituelle de leurs membres chaque semaine." },
    { icone: IconeAnalyse, titre: "Des analyses intelligentes", texte: "Le Tableau de bord, les Rapports et la page Prédiction t'aident à repérer les tendances — croissance, décrochage, membres à visiter — avant qu'elles ne deviennent des problèmes." },
    { icone: IconeCloche, titre: "Tu es prêt", texte: "Explore librement — le menu en haut (ou le ☰ sur mobile) te donne accès à tout. Bonne œuvre ! 🙏" },
  ];
  const etapesResponsable = [
    { icone: EpiDeBle, titre: `Bienvenue, ${compte.nom}`, texte: "Cette application t'aide à suivre les membres de ton GEM — présence, santé spirituelle, et bien plus." },
    { icone: IconeGroupe, titre: "Ton espace", texte: "\"Mon espace\" est ton point de départ : tu y gères tes membres, pointes la présence chaque dimanche, et remplis la santé spirituelle chaque mois." },
    { icone: IconeCalendrier, titre: "Reste connecté", texte: "Le Calendrier et la Messagerie te tiennent informé des événements et des messages du pasteur." },
    { icone: IconeCloche, titre: "Tu es prêt", texte: "N'hésite pas à explorer — bonne œuvre ! 🙏" },
  ];
  const etapes = (compte.role === "pasteur" || compte.assistant) ? etapesPasteur : etapesResponsable;
  const e = etapes[etape];

  async function terminer() {
    await supabase.from("comptes").update({ a_vu_bienvenue: true }).eq("id", compte.id);
    onTermine();
  }

  return (
    <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "var(--overlay)", backdropFilter: "blur(4px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ backgroundColor: TEAL_950, border: `1px solid ${GOLD}`, borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 30px 70px rgba(0,0,0,0.5)", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: "rgba(214,165,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <e.icone size={28} color={GOLD} />
        </div>
        <h2 className="titre-moisson" style={{ fontSize: 20, fontWeight: 600, marginBottom: 10, color: CREAM }}>{e.titre}</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>{e.texte}</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
          {etapes.map((_, i) => (
            <span key={i} style={{ width: i === etape ? 20 : 6, height: 6, borderRadius: 999, backgroundColor: i === etape ? GOLD : TEAL_700, transition: "width 0.3s ease" }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {etape > 0 && (
            <button className="btn-app" onClick={() => setEtape(e => e - 1)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, cursor: "pointer" }}>Précédent</button>
          )}
          {etape < etapes.length - 1 ? (
            <button className="btn-app" onClick={() => setEtape(e => e + 1)} style={{ flex: 2, padding: "12px 0", borderRadius: 10, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>Suivant</button>
          ) : (
            <button className="btn-app" onClick={terminer} style={{ flex: 2, padding: "12px 0", borderRadius: 10, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>C'est parti !</button>
          )}
        </div>
        <button onClick={terminer} style={{ marginTop: 14, background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Passer</button>
      </div>
    </div>
  );
}

function PageIdentite({ cardStyle }) {
  const sections = [
    {
      numero: "1.1", titre: "Notre RÊVE", couleur: "#3F9C93",
      citation: "LE RÈGNE ET LA GLOIRE DE DIEU SUR TOUTE LA TERRE",
      texte: "Ce verset le traduit bien : « Il ne se fera ni tort ni dommage, sur toute ma montagne sainte ; car la terre sera remplie de la connaissance de l'Éternel, comme le fond de la mer par les eaux qui le couvrent. »",
      reference: "Ésaïe 11:9",
    },
    {
      numero: "1.2", titre: "Notre VISION", couleur: GOLD,
      citation: "Par Christ, nous faisons des nations des Vases d'Honneur (des intimes de Dieu) pour la manifestation de son règne.",
      texte: "Tout au long de cette décennie, nous marcherons dans cette vision.",
      reference: "Matthieu 28:19, 2 Timothée 2:20",
    },
    {
      numero: "1.3", titre: "Notre MISSION", couleur: "#C1585C",
      citation: "Faire rentrer la Dîme (10%) des âmes de toute famille dans la maison de Dieu ; Moissonner les 10% des âmes de votre territoire.",
      texte: "Dans cette décennie de grande moisson, voici notre mission.",
      reference: "Lévitique 27:30, 32 · Exode 34:19",
    },
  ];

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
        <IconeGoutte size={20} color={GOLD} /> Notre identité
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>Le Rêve, la Vision et la Mission des Églises Vases d'Honneur — la décennie 2020-2030, celle de la Grande Moisson.</p>

      <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sections.map(s => (
          <div key={s.numero} style={{ ...cardStyle, borderLeft: `4px solid ${s.couleur}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -14, left: -14, pointerEvents: "none" }}><IconeGoutte size={80} color={s.couleur} opacity={0.08} /></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span className="titre-moisson" style={{ fontSize: 26, fontWeight: 700, color: s.couleur }}>{s.numero}</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.titre}</span>
            </div>
            <p className="titre-moisson" style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 10 }}>« {s.citation} »</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>{s.texte}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: s.couleur }}>{s.reference}</p>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, marginTop: 20, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
          « Nous entrons dans une saison où Dieu va travailler et agir de façon extraordinaire et particulière — c'est la décennie de la GRANDE MOISSON. »
        </p>
      </div>

      <div style={{ ...cardStyle, marginTop: 20, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -14, right: -14, pointerEvents: "none" }}><IconeGoutte size={70} color={GOLD} opacity={0.08} /></div>
        <img
          src={SANOGO_IMG}
          alt="Apôtre Mohammed Sanogo"
          style={{ width: 108, height: 108, borderRadius: "50%", objectFit: "cover", border: `3px solid ${GOLD}`, boxShadow: "0 8px 20px rgba(0,0,0,0.25)", marginBottom: 14 }}
        />
        <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 2 }}>Apôtre</p>
        <p className="titre-moisson" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Mohammed Sanogo</p>
        <p style={{ fontSize: 13, color: GOLD_LIGHT, fontWeight: 600 }}>Président des Églises Vases d'Honneur et Ministère Messages de Vie</p>
      </div>
    </div>
  );
}

/* ------------------------------- Nouveaux membres ------------------------------- */

function PageNouveauxMembres({ compte, tribus, cardStyle }) {
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [vue, setVue] = useState("liste"); // liste | rapport | courbes | historique
  const [nouveaux, setNouveaux] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [nouveauOuvert, setNouveauOuvert] = useState(null);
  const [dimanchesReels, setDimanchesReels] = useState([]);
  const [presencesParNouveau, setPresencesParNouveau] = useState({}); // { nouveauId: { dimancheId: {present, motif} } }
  const [dimancheChoisi, setDimancheChoisi] = useState(null);
  const [historiqueMois, setHistoriqueMois] = useState([]);
  const [nouveauASupprimer, setNouveauASupprimer] = useState(null);
  const [apercuImportNouveaux, setApercuImportNouveaux] = useState(null);
  const [importNouveauxEnCours, setImportNouveauxEnCours] = useState(false);
  const [dateArriveeParDefaut, setDateArriveeParDefaut] = useState(new Date().toISOString().slice(0, 10));

  const [form, setForm] = useState({
    nom: "", telephone: "+225 ", quartier: "", photo: null, tribu_id: "", date_arrivee: new Date().toISOString().slice(0, 10),
    baptise: false, eglise_origine: "", nouveau_converti: false,
  });

  const moisDisponibles = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  useEffect(() => { chargerNouveaux(); }, [mois]);
  useEffect(() => { chargerHistorique(); }, []);

  async function chargerNouveaux() {
    setChargement(true);
    const debut = `${mois}-01`;
    const [annee, moisNum] = mois.split("-");
    const finDate = new Date(annee, moisNum, 0).toISOString().slice(0, 10);
    const { data } = await supabase.from("nouveaux_membres").select("*").gte("date_arrivee", debut).lte("date_arrivee", finDate).order("date_arrivee", { ascending: false });
    setNouveaux(data || []);

    // S'assure que le dimanche de cette semaine existe déjà dans la base — le
    // rapport doit pouvoir se faire chaque dimanche, même si personne d'autre
    // dans l'app n'a encore touché cette date.
    const estMoisEnCours = mois === new Date().toISOString().slice(0, 7);
    if (estMoisEnCours) {
      const dateAuj = dimancheActuel();
      // upsert plutôt que "vérifier puis créer" — évite tout doublon si deux
      // personnes ouvrent l'app au même moment un dimanche.
      await supabase.from("dimanches").upsert({ date: dateAuj }, { onConflict: "date", ignoreDuplicates: true });
    }

    if ((data || []).length > 0) {
      const ids = data.map(n => n.id);
      const [{ data: dims }, { data: pres }] = await Promise.all([
        supabase.from("dimanches").select("*").order("date", { ascending: true }),
        supabase.from("presences_nouveaux").select("*").in("nouveau_id", ids),
      ]);
      const idsAvecPresence = new Set((pres || []).map(p => p.dimanche_id));
      const reels = (dims || []).filter(d => idsAvecPresence.has(d.id) || d.date >= debut);
      setDimanchesReels(reels);
      if (!dimancheChoisi && reels.length > 0) setDimancheChoisi(reels[reels.length - 1].id);

      const map = {};
      (pres || []).forEach(p => {
        if (!map[p.nouveau_id]) map[p.nouveau_id] = {};
        map[p.nouveau_id][p.dimanche_id] = { present: p.present, motif: p.motif };
      });
      setPresencesParNouveau(map);
    } else {
      setDimanchesReels([]);
      setPresencesParNouveau({});
    }
    setChargement(false);
  }

  async function chargerHistorique() {
    const { data } = await supabase.from("nouveaux_membres").select("date_arrivee");
    const parMois = {};
    (data || []).forEach(n => {
      const m = n.date_arrivee.slice(0, 7);
      parMois[m] = (parMois[m] || 0) + 1;
    });
    const liste = Object.entries(parMois).map(([m, nb]) => ({ mois: m, nb })).sort((a, b) => a.mois.localeCompare(b.mois));
    setHistoriqueMois(liste);
  }

  function tauxRegularite(nouveau) {
    const dimanchesDepuisArrivee = dimanchesReels.filter(d => d.date >= nouveau.date_arrivee);
    if (dimanchesDepuisArrivee.length === 0) return null;
    const presencesNouveau = presencesParNouveau[nouveau.id] || {};
    const presents = dimanchesDepuisArrivee.filter(d => presencesNouveau[d.id]?.present).length;
    return { taux: Math.round((presents / dimanchesDepuisArrivee.length) * 100), presents, total: dimanchesDepuisArrivee.length };
  }

  async function surChoisirPhoto(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    try {
      const url = await redimensionnerImageAttachee(fichier);
      setForm(f => ({ ...f, photo: url }));
    } catch (err) {
      toast(err.message || "Impossible de traiter cette photo.", "erreur");
    }
  }

  // Analyse d'un fichier CSV — seul le nom est obligatoire ; téléphone,
  // quartier, date d'arrivée et tribu sont optionnels et complétés avec les
  // valeurs par défaut si absents (utile pour un import massif de noms
  // arrivés depuis le début de l'année, par exemple).
  function analyserCSVNouveaux(texte) {
    const lignes = texte.split(/\r?\n/).filter(l => l.trim());
    if (lignes.length === 0) return [];
    const entetes = lignes[0].split(",").map(e => e.trim().toLowerCase().replace(/"/g, ""));
    const idxNom = entetes.findIndex(e => e.includes("nom"));
    if (idxNom === -1) return null; // colonne obligatoire manquante
    const idxTel = entetes.findIndex(e => e.includes("tel"));
    const idxQuartier = entetes.findIndex(e => e.includes("quartier"));
    const idxDate = entetes.findIndex(e => e.includes("date") || e.includes("arriv"));
    const idxTribu = entetes.findIndex(e => e.includes("tribu"));
    const idxBaptise = entetes.findIndex(e => e.includes("bapt"));
    const idxConverti = entetes.findIndex(e => e.includes("converti"));
    const idxEglise = entetes.findIndex(e => e.includes("eglise") || e.includes("église"));

    function normaliserDate(v) {
      if (!v) return null;
      const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); // jj/mm/aaaa
      if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      return null;
    }
    function normaliserOuiNon(v) {
      if (!v) return false;
      return /^(oui|o|yes|y|1|true|vrai)$/i.test(v.trim());
    }

    return lignes.slice(1).map(ligne => {
      const valeurs = ligne.split(",").map(v => v.trim().replace(/"/g, ""));
      const nomTribuBrut = idxTribu !== -1 ? (valeurs[idxTribu] || "") : "";
      const tribuTrouvee = nomTribuBrut ? tribus.find(t => t.nom.toLowerCase() === nomTribuBrut.toLowerCase().replace(/^tribu (de |d')?/, "")) : null;
      return {
        nom: valeurs[idxNom] || "",
        telephone: idxTel !== -1 ? (valeurs[idxTel] || "") : "",
        quartier: idxQuartier !== -1 ? (valeurs[idxQuartier] || "") : "",
        date_arrivee: (idxDate !== -1 ? normaliserDate(valeurs[idxDate]) : null) || dateArriveeParDefaut,
        tribu_id: tribuTrouvee?.id || "",
        tribu_nom_brut: nomTribuBrut,
        baptise: idxBaptise !== -1 ? normaliserOuiNon(valeurs[idxBaptise]) : false,
        nouveau_converti: idxConverti !== -1 ? normaliserOuiNon(valeurs[idxConverti]) : false,
        eglise_origine: idxEglise !== -1 ? (valeurs[idxEglise] || "") : "",
      };
    }).filter(l => l.nom);
  }

  function surChoisirFichierImportNouveaux(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = evt => {
      const lignes = analyserCSVNouveaux(evt.target.result);
      if (lignes === null) { toast("Le fichier doit contenir au moins une colonne 'nom'.", "erreur"); return; }
      if (lignes.length === 0) { toast("Aucune ligne valide trouvée dans le fichier.", "erreur"); return; }
      setApercuImportNouveaux(lignes);
    };
    lecteur.readAsText(fichier);
    e.target.value = "";
  }

  async function confirmerImportNouveaux() {
    setImportNouveauxEnCours(true);
    const lignes = apercuImportNouveaux.map(l => ({
      nom: l.nom.trim(), telephone: l.telephone.trim() || null, quartier: l.quartier.trim() || null,
      date_arrivee: l.date_arrivee, tribu_id: l.tribu_id || null,
      baptise: l.baptise, nouveau_converti: l.nouveau_converti, eglise_origine: l.eglise_origine.trim() || null,
      cree_par: compte.id,
    }));
    const { error } = await supabase.from("nouveaux_membres").insert(lignes);
    setImportNouveauxEnCours(false);
    setApercuImportNouveaux(null);
    if (error) { toast("Erreur pendant l'import : " + error.message, "erreur"); return; }
    toast(`✓ ${lignes.length} nouveau(x) membre(s) importé(s) avec succès.`, "succes");
    journaliser(compte, "import_nouveaux_membres", `${lignes.length} personne(s)`);
    chargerNouveaux(); chargerHistorique();
  }

  async function enregistrerNouveau() {
    if (!form.nom.trim()) { toast("Le nom est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(form.telephone)) { toast("Le numéro ne semble pas valide.", "erreur"); return; }
    if (!form.tribu_id) { toast("Merci d'indiquer la tribu de service qui l'a reçu(e).", "erreur"); return; }
    const { error } = await supabase.from("nouveaux_membres").insert({
      nom: form.nom.trim(), telephone: form.telephone.trim(), quartier: form.quartier.trim() || null,
      photo: form.photo, tribu_id: form.tribu_id, date_arrivee: form.date_arrivee,
      baptise: form.baptise, eglise_origine: form.eglise_origine.trim() || null,
      nouveau_converti: form.nouveau_converti, cree_par: compte.id,
    });
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast(`✓ ${form.nom.trim()} a été ajouté(e) aux nouveaux membres. 🙏`, "succes");
    journaliser(compte, "ajout_nouveau_membre", form.nom.trim());
    setForm({ nom: "", telephone: "+225 ", quartier: "", photo: null, tribu_id: "", date_arrivee: new Date().toISOString().slice(0, 10), baptise: false, eglise_origine: "", nouveau_converti: false });
    setFormulaireOuvert(false);
    chargerNouveaux(); chargerHistorique();
  }

  async function basculerPresence(nouveauId, dimancheId, present) {
    setPresencesParNouveau(v => ({ ...v, [nouveauId]: { ...v[nouveauId], [dimancheId]: { ...(v[nouveauId]?.[dimancheId] || {}), present } } }));
    await supabase.from("presences_nouveaux").upsert({ nouveau_id: nouveauId, dimanche_id: dimancheId, present }, { onConflict: "nouveau_id,dimanche_id" });
  }

  async function enregistrerMotif(nouveauId, dimancheId, motif) {
    setPresencesParNouveau(v => ({ ...v, [nouveauId]: { ...v[nouveauId], [dimancheId]: { ...(v[nouveauId]?.[dimancheId] || {}), motif } } }));
    await supabase.from("presences_nouveaux").upsert({ nouveau_id: nouveauId, dimanche_id: dimancheId, motif }, { onConflict: "nouveau_id,dimanche_id" });
  }

  async function confirmerSuppressionNouveau() {
    const { error } = await supabase.from("nouveaux_membres").delete().eq("id", nouveauASupprimer.id);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast(`${nouveauASupprimer.nom} a été retiré(e) de la liste.`, "succes");
    journaliser(compte, "retrait_nouveau_membre", nouveauASupprimer.nom);
    setNouveauASupprimer(null);
    setNouveauOuvert(null);
    chargerNouveaux(); chargerHistorique();
  }

  function nomTribu(id) { return tribus.find(t => t.id === id)?.nom || "?"; }

  // Courbe de croissance numérique (nouveaux par mois, 12 derniers mois)
  const courbeCroissance = historiqueMois.slice(-12);
  // Courbe de régularité moyenne du mois en cours, semaine par semaine
  const courbeRegulariteHebdo = dimanchesReels.map(d => {
    const concernes = nouveaux.filter(n => n.date_arrivee <= d.date);
    if (concernes.length === 0) return null;
    const presents = concernes.filter(n => presencesParNouveau[n.id]?.[d.id]?.present).length;
    return { libelle: new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), valeur: Math.round((presents / concernes.length) * 100), texteAffiche: `${Math.round((presents / concernes.length) * 100)}%` };
  }).filter(Boolean);

  if (chargement) return <ChargementSquelette lignes={4} />;

  if (nouveauOuvert) {
    const n = nouveauOuvert;
    const reg = tauxRegularite(n);
    return (
      <div>
        <button className="btn-app" onClick={() => setNouveauOuvert(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour à la liste</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          {n.photo ? <img src={n.photo} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}` }} /> : <AvatarInitiales nom={n.nom} taille={64} />}
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{n.nom}</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Arrivé(e) le {new Date(n.date_arrivee + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} — {nomTribu(n.tribu_id)}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, backgroundColor: n.baptise ? "var(--green)" : TEAL_900, color: n.baptise ? TEAL_950 : "var(--text-secondary)", fontWeight: 700 }}>{n.baptise ? "✓ Baptisé(e)" : "Non baptisé(e)"}</span>
          <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, backgroundColor: n.nouveau_converti ? GOLD_LIGHT : TEAL_900, color: n.nouveau_converti ? TEAL_950 : "var(--text-secondary)", fontWeight: 700 }}>{n.nouveau_converti ? "🌱 Nouveau converti" : "Membre transféré"}</span>
          {n.quartier && <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, backgroundColor: TEAL_900, color: "var(--text-secondary-2)" }}>{n.quartier}</span>}
          {n.eglise_origine && <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, backgroundColor: TEAL_900, color: "var(--text-secondary-2)" }}>Vient de : {n.eglise_origine}</span>}
        </div>

        {reg && (
          <div style={{ ...cardStyle, marginBottom: 16, textAlign: "center" }}>
            <p className="titre-moisson chiffre-app" style={{ fontSize: 32, fontWeight: 700, color: reg.taux >= 70 ? "var(--green)" : reg.taux >= 40 ? GOLD_LIGHT : RED_LIGHT, margin: 0 }}>{reg.taux}%</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>Taux de régularité — {reg.presents}/{reg.total} dimanches depuis son arrivée</p>
          </div>
        )}

        {n.telephone && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <a href={`tel:${n.telephone}`} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, backgroundColor: GOLD_LIGHT, color: TEAL_950, fontWeight: 700, textDecoration: "none", fontSize: 14 }}><IconeTelephone size={15} /> Appeler</a>
            <a
              href={`https://wa.me/${numeroPourWhatsApp(n.telephone)}?text=${encodeURIComponent(`Bonjour ${n.nom}, quel plaisir de t'avoir parmi nous à l'Assemblée RENAISSANCE ! On pense à toi. 🙏\n\n${signatureMessage(compte)}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, backgroundColor: "#25D366", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 14 }}
            ><IconeMessage size={15} /> WhatsApp</a>
          </div>
        )}

        <button className="btn-app" onClick={() => setNouveauASupprimer(n)} style={{ width: "100%", padding: "10px 0", borderRadius: 9, backgroundColor: "transparent", border: `1px solid ${RED_LIGHT}`, color: RED_LIGHT, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <IconePoubelle size={13} style={{verticalAlign:"-2px",marginRight:5}} />Retirer de la liste
        </button>

        {nouveauASupprimer && (
          <BoiteConfirmation
            titre="Retirer ce nouveau membre ?"
            message={`Es-tu sûr de vouloir retirer "${nouveauASupprimer.nom}" de la liste des nouveaux membres ? Son historique de présence sera aussi supprimé. Cette action est irréversible.`}
            texteConfirmer="Retirer"
            dangereux
            onConfirmer={confirmerSuppressionNouveau}
            onAnnuler={() => setNouveauASupprimer(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
        <IconePousse size={22} /> Nouveaux membres
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Suivi mensuel des nouveaux arrivants — présence, santé spirituelle, et intégration.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["liste", "Liste"], ["rapport", "Rapport du dimanche"], ["courbes", "Courbes"], ["historique", "Historique"]].map(([cle, label]) => (
          <button key={cle} className="btn-app" onClick={() => setVue(cle)} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === cle ? GOLD : TEAL_900, color: vue === cle ? TEAL_950 : "var(--text-secondary-2)" }}>{label}</button>
        ))}
      </div>

      <select value={mois} onChange={e => setMois(e.target.value)} style={{ padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 18 }}>
        {moisDisponibles.map(m => {
          const [annee, moisNum] = m.split("-");
          return <option key={m} value={m}>{new Date(annee, moisNum - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</option>;
        })}
      </select>

      {vue === "liste" && (
        <>
          <div style={{ ...cardStyle, marginBottom: 20, textAlign: "center" }}>
            <p className="titre-moisson chiffre-app" style={{ fontSize: 36, fontWeight: 700, color: GOLD_LIGHT, margin: 0 }}><NombreAnime valeur={nouveaux.length} /></p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>nouveau(x) membre(s) intégré(s) ce mois-ci 🙏</p>
          </div>

          {formulaireOuvert ? (
            <div className="fade-in" style={{ ...cardStyle, marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {form.photo && <img src={form.photo} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", border: `1px solid ${GOLD}` }} />}
                <label style={{ fontSize: 11, color: GOLD_LIGHT, cursor: "pointer", border: `1px solid ${TEAL_600}`, borderRadius: 8, padding: "8px 10px" }}>
                  📷 Photo
                  <input type="file" accept="image/*" onChange={surChoisirPhoto} style={{ display: "none" }} />
                </label>
              </div>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom et prénoms *" style={{ padding: 9, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
              <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="Téléphone *" style={{ padding: 9, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
              <input value={form.quartier} onChange={e => setForm(f => ({ ...f, quartier: e.target.value }))} placeholder="Quartier" style={{ padding: 9, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
              <select value={form.tribu_id} onChange={e => setForm(f => ({ ...f, tribu_id: e.target.value }))} style={{ padding: 9, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
                <option value="">Tribu de service qui l'a reçu(e) *</option>
                {tribus.map(t => <option key={t.id} value={t.id}>Tribu de {t.nom}</option>)}
              </select>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Date d'arrivée
                <input type="date" value={form.date_arrivee} onChange={e => setForm(f => ({ ...f, date_arrivee: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 4, padding: 9, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
              </label>
              <input value={form.eglise_origine} onChange={e => setForm(f => ({ ...f, eglise_origine: e.target.value }))} placeholder="Église d'origine (si transfert)" style={{ padding: 9, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.baptise} onChange={e => setForm(f => ({ ...f, baptise: e.target.checked }))} /> Déjà baptisé(e)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.nouveau_converti} onChange={e => setForm(f => ({ ...f, nouveau_converti: e.target.checked }))} /> Nouveau converti
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-app" onClick={enregistrerNouveau} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
                <button className="btn-app" onClick={() => setFormulaireOuvert(false)} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 20 }}>
              <button className="btn-app" onClick={() => setFormulaireOuvert(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, color: CREAM }}>
                <span style={{ fontSize: 18, color: GOLD_LIGHT }}>+</span> Ajouter un nouveau membre
              </button>
              <label style={{ fontSize: 12, fontWeight: 700, color: GOLD_LIGHT, cursor: "pointer", border: `1px solid ${GOLD_LIGHT}`, borderRadius: 8, padding: "8px 12px" }}>
                📂 Importer un fichier (CSV)
                <input type="file" accept=".csv,text/csv" onChange={surChoisirFichierImportNouveaux} style={{ display: "none" }} />
              </label>
              <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Date d'arrivée par défaut :
                <input type="date" value={dateArriveeParDefaut} onChange={e => setDateArriveeParDefaut(e.target.value)} style={{ marginLeft: 6, padding: 5, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 11 }} />
              </label>
            </div>
          )}

          {nouveaux.length === 0 ? (
            <EtatVide illustration="groupe" titre="Aucun nouveau membre ce mois-ci" description="Ajoute le premier nouveau membre arrivé ce mois avec le bouton ci-dessus." />
          ) : (
            <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nouveaux.map(n => {
                const reg = tauxRegularite(n);
                return (
                  <button key={n.id} onClick={() => setNouveauOuvert(n)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, border: "none" }}>
                    {n.photo ? <img src={n.photo} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <AvatarInitiales nom={n.nom} taille={44} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, margin: 0 }}>{n.nom}</p>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{nomTribu(n.tribu_id)} — {new Date(n.date_arrivee + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                    </div>
                    {reg && <span style={{ fontSize: 12, fontWeight: 700, color: reg.taux >= 70 ? "var(--green)" : reg.taux >= 40 ? GOLD_LIGHT : RED_LIGHT }}>{reg.taux}%</span>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {vue === "rapport" && (
        dimanchesReels.length === 0 ? (
          <EtatVide illustration="recherche" titre="Aucun dimanche pointé ce mois-ci" />
        ) : (
          <>
            <select value={dimancheChoisi || ""} onChange={e => setDimancheChoisi(e.target.value)} style={{ padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 16 }}>
              {dimanchesReels.map(d => <option key={d.id} value={d.id}>{new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</option>)}
            </select>
            <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nouveaux.filter(n => n.date_arrivee <= (dimanchesReels.find(d => d.id === dimancheChoisi)?.date || "")).map(n => {
                const p = presencesParNouveau[n.id]?.[dimancheChoisi];
                return (
                  <div key={n.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}>
                        <input type="checkbox" checked={!!p?.present} onChange={e => basculerPresence(n.id, dimancheChoisi, e.target.checked)} style={{ width: 18, height: 18, accentColor: GOLD }} />
                        <span style={{ fontWeight: 600 }}>{n.nom}</span>
                      </label>
                      {!p?.present && n.telephone && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <a title="Appeler" href={`tel:${n.telephone}`} style={{ fontSize: 14, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, borderRadius: 999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}><IconeTelephone size={14} /></a>
                          <a title="WhatsApp" href={`https://wa.me/${numeroPourWhatsApp(n.telephone)}?text=${encodeURIComponent(`Bonjour ${n.nom}, tu nous as manqué ce dimanche. Tout va bien ? 🙏\n\n${signatureMessage(compte)}`)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", borderRadius: 999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}><IconeMessage size={14} /></a>
                        </div>
                      )}
                    </div>
                    {!p?.present && (
                      <input
                        defaultValue={p?.motif || ""}
                        onBlur={e => enregistrerMotif(n.id, dimancheChoisi, e.target.value)}
                        placeholder="Motif de l'absence..."
                        style={{ width: "100%", marginTop: 8, padding: 8, fontSize: 12, backgroundColor: TEAL_950, color: "var(--text-secondary-2)", border: `1px solid ${TEAL_700}`, borderRadius: 8 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )
      )}

      {vue === "courbes" && (
        <>
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📈 Croissance numérique — 12 derniers mois</p>
            {courbeCroissance.length >= 2 ? (
              <GraphiqueCourbe couleur="var(--green)" donnees={courbeCroissance.map(c => { const [a, m] = c.mois.split("-"); return { libelle: new Date(a, m - 1, 1).toLocaleDateString("fr-FR", { month: "short" }), valeur: c.nb, texteAffiche: `${c.nb}` }; })} />
            ) : <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pas encore assez de données pour tracer une courbe.</p>}
          </div>
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📊 Régularité des nouveaux — ce mois, dimanche après dimanche</p>
            {courbeRegulariteHebdo.length >= 2 ? (
              <GraphiqueCourbe couleur="var(--gold)" donnees={courbeRegulariteHebdo} />
            ) : <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pas encore assez de données pour tracer une courbe.</p>}
          </div>
        </>
      )}

      {vue === "historique" && (
        historiqueMois.length === 0 ? (
          <EtatVide illustration="recherche" titre="Aucun historique pour l'instant" />
        ) : (
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...historiqueMois].reverse().map(h => {
              const [a, m] = h.mois.split("-");
              return (
                <button key={h.mois} onClick={() => { setMois(h.mois); setVue("liste"); }} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none" }}>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{new Date(a, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: GOLD_LIGHT }}>{h.nb} nouveau{h.nb > 1 ? "x" : ""}</span>
                </button>
              );
            })}
          </div>
        )
      )}

      {apercuImportNouveaux && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "var(--overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: TEAL_950, border: `1px solid ${GOLD}`, borderRadius: 16, padding: 24, maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
            <p className="titre-moisson" style={{ fontWeight: 600, fontSize: 18, marginBottom: 10, color: CREAM }}>Confirmer l'import — {apercuImportNouveaux.length} nouveau(x) membre(s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {apercuImportNouveaux.slice(0, 15).map((l, i) => (
                <p key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  • {l.nom}{l.telephone ? ` — ${l.telephone}` : ""} — arrivé(e) le {new Date(l.date_arrivee + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  {l.tribu_nom_brut && !l.tribu_id && <span style={{ color: RED_LIGHT }}> (tribu "{l.tribu_nom_brut}" introuvable)</span>}
                </p>
              ))}
              {apercuImportNouveaux.length > 15 && <p style={{ fontSize: 12, color: "var(--text-secondary-2)", fontStyle: "italic" }}>+ {apercuImportNouveaux.length - 15} autre(s)…</p>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button className="btn-app" onClick={() => setApercuImportNouveaux(null)} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              <button className="btn-app" disabled={importNouveauxEnCours} onClick={confirmerImportNouveaux} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>
                {importNouveauxEnCours ? "…" : `Importer ${apercuImportNouveaux.length} membre(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageJournalAudit({ cardStyle }) {
  const [journal, setJournal] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const PAR_PAGE = 25;

  useEffect(() => { chargerJournal(); }, []);

  async function chargerJournal() {
    setChargement(true);
    const { data } = await supabase.from("journal_audit").select("*").order("date_action", { ascending: false }).limit(500);
    setJournal(data || []);
    setChargement(false);
  }

  const LIBELLES_ACTIONS = {
    suppression_membre: "Membre supprimé",
    suppression_gem: "GEM supprimé",
    fusion_gem: "GEM fusionné",
  };

  const totalPages = Math.max(1, Math.ceil(journal.length / PAR_PAGE));
  const affiches = journal.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);

  if (chargement) return <ChargementSquelette lignes={6} />;

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
        <IconeClipboard size={22} /> Journal d'audit
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Historique des actions sensibles (suppressions, fusions) effectuées dans l'application — {journal.length} entrée(s).</p>

      {journal.length === 0 ? (
        <EtatVide icone={IconeClipboard} titre="Aucune action enregistrée pour l'instant" />
      ) : (
        <>
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {affiches.map(entree => (
              <div key={entree.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p style={{ fontWeight: 700, margin: 0, fontSize: 13 }}>{LIBELLES_ACTIONS[entree.action] || entree.action}{entree.cible ? ` — ${entree.cible}` : ""}</p>
                    {entree.details && <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>{entree.details}</p>}
                    <p style={{ fontSize: 11, color: GOLD_LIGHT, margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}><IconePersonne size={10} /> {entree.compte_nom}</p>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{new Date(entree.date_action).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} à {new Date(entree.date_action).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 20 }}>
              <button className="btn-app" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>← Précédent</button>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page {page} / {totalPages}</span>
              <button className="btn-app" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>Suivant →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Illustrations personnalisées — tracé simple à la main, liées à l'identité
// de l'église (le vase, la moisson, la prière) plutôt que des icônes génériques.
function IllustrationVide({ variante = "vase", taille = 92 }) {
  const or = "var(--gold)", orClair = "var(--gold-light)", trait = "var(--border-1)";
  if (variante === "moisson") {
    return (
      <svg width={taille} height={taille} viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="86" rx="34" ry="4" fill={trait} opacity="0.3" />
        <path d="M50 82V28" stroke={or} strokeWidth="2" strokeLinecap="round" />
        {[0, 1, 2, 3].map(i => (
          <g key={i}>
            <path d={`M50 ${34 + i * 11} C42 ${29 + i * 11} 37 ${31 + i * 11} 34 ${36 + i * 11}`} stroke={orClair} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d={`M50 ${34 + i * 11} C58 ${29 + i * 11} 63 ${31 + i * 11} 66 ${36 + i * 11}`} stroke={orClair} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        ))}
        <path d="M50 28 L45 18 L50 12 L55 18 Z" fill={or} />
        <circle cx="22" cy="70" r="2" fill={orClair} opacity="0.6" /><circle cx="78" cy="66" r="2" fill={orClair} opacity="0.6" /><circle cx="30" cy="58" r="1.5" fill={orClair} opacity="0.5" />
      </svg>
    );
  }
  if (variante === "groupe") {
    return (
      <svg width={taille} height={taille} viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="88" rx="36" ry="4" fill={trait} opacity="0.3" />
        <circle cx="35" cy="42" r="10" stroke={orClair} strokeWidth="2" />
        <path d="M20 78c0-10 7-18 15-18s15 8 15 18" stroke={orClair} strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="66" cy="38" r="11" stroke={or} strokeWidth="2" />
        <path d="M48 80c0-11 8-20 18-20s18 9 18 20" stroke={or} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (variante === "recherche") {
    return (
      <svg width={taille} height={taille} viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="88" rx="30" ry="4" fill={trait} opacity="0.3" />
        <circle cx="44" cy="44" r="22" stroke={orClair} strokeWidth="2.5" />
        <line x1="60" y1="60" x2="76" y2="76" stroke={or} strokeWidth="3" strokeLinecap="round" />
        <path d="M34 44a10 10 0 0 1 10-10" stroke={or} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (variante === "priere") {
    return (
      <svg width={taille} height={taille} viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="88" rx="26" ry="4" fill={trait} opacity="0.3" />
        <path d="M50 20v50" stroke={orClair} strokeWidth="2" strokeLinecap="round" />
        <path d="M38 34c0 8 5 12 12 14 7-2 12-6 12-14" stroke={or} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M50 70c-14 0-22 8-22 14h44c0-6-8-14-22-14Z" stroke={orClair} strokeWidth="2" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  // "vase" — motif par défaut, en écho à "Vases d'Honneur"
  return (
    <svg width={taille} height={taille} viewBox="0 0 100 100" fill="none">
      <ellipse cx="50" cy="88" rx="26" ry="4" fill={trait} opacity="0.3" />
      <path d="M40 20h20l3 8-5 6c4 6 6 14 6 22 0 16-9 26-14 26s-14-10-14-26c0-8 2-16 6-22l-5-6Z" stroke={or} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M42 20h16" stroke={or} strokeWidth="2" strokeLinecap="round" />
      <path d="M44 50c3 2 9 2 12 0" stroke={orClair} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="30" cy="34" r="1.8" fill={orClair} opacity="0.6" /><circle cx="70" cy="42" r="1.8" fill={orClair} opacity="0.6" />
    </svg>
  );
}

function EtatVide({ icone: Icone, titre, description, illustration }) {
  return (
    <div className="fade-in" style={{ textAlign: "center", padding: "36px 16px" }}>
      {illustration ? (
        <div style={{ marginBottom: 10 }}><IllustrationVide variante={illustration} /></div>
      ) : (
        <div style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: "rgba(214,165,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          {Icone ? <Icone size={24} color="var(--gold)" /> : <EpiDeBle size={24} />}
        </div>
      )}
      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "var(--text-primary)" }}>{titre}</p>
      {description && <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 280, margin: "6px auto 0", lineHeight: 1.5 }}>{description}</p>}
    </div>
  );
}

function IconeGoutte({ size = 22, color = GOLD, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 30" fill="none" style={{ opacity, flexShrink: 0 }}>
      <path d="M12 2C12 2 3 14 3 20a9 9 0 0 0 18 0c0-6-9-18-9-18Z" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
}

function EpiDeBle({ size = 22, color, opacity = 1 }) {
  const couleur = color || GOLD;
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 20 28" fill="none" style={{ opacity, flexShrink: 0 }}>
      <path d="M10 27V6" stroke={couleur} strokeWidth="1.3" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map(i => (
        <g key={i}>
          <path d={`M10 ${9 + i * 4} C7 ${7 + i * 4} 5.5 ${8 + i * 4} 5 ${10 + i * 4}`} stroke={couleur} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d={`M10 ${9 + i * 4} C13 ${7 + i * 4} 14.5 ${8 + i * 4} 15 ${10 + i * 4}`} stroke={couleur} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </g>
      ))}
      <path d="M10 6 L8.3 2.5 L10 0.5 L11.7 2.5 Z" fill={couleur} />
    </svg>
  );
}

// Icônes en SVG intégré — aucune dépendance externe à installer, donc aucun
// risque de casser le déploiement. Traits fins et cohérents, à la lucide.
function IconeTelephone({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconeMessage({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function IconeRecherche({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconeGroupe({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconeBatiment({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" /><line x1="9" y1="8" x2="9" y2="8" /><line x1="15" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="15" y2="12" /><line x1="9" y1="21" x2="9" y2="16" /><line x1="15" y1="21" x2="15" y2="16" />
    </svg>
  );
}

function IconeMaison({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" />
    </svg>
  );
}
function IconeCloche({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
function IconeValide({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function IconeAlerte({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}
function IconeCouronne({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M2 18h20l-1.5-9-4.5 4-4-6-4 6-4.5-4L2 18Z" />
    </svg>
  );
}

function IconeTrophee({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 4h3a2 2 0 0 1 2 2 5 5 0 0 1-5 5" /><path d="M7 4H4a2 2 0 0 0-2 2 5 5 0 0 0 5 5" />
    </svg>
  );
}
function IconePousse({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10" /><path d="M10 20c0-4.4-2-6-4-8 2-1 4 0 5 2" /><path d="M14 20c0-6 3-8 5-10-3-1-6 1-7 4" /><path d="M12 20V10" />
    </svg>
  );
}
function IconeInterdit({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}
function IconeThermometre({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </svg>
  );
}
function IconeClipboard({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" />
    </svg>
  );
}
function IconePoubelle({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconeCalendrier({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  );
}
function IconeGateau({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 2 1 2 1" /><path d="M12 8v3" /><path d="M12 2s-2 2-2 3.5S11 8 12 8s2-1 2-2.5S12 2 12 2Z" />
    </svg>
  );
}
function IconeCle({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function IconePersonne({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconeAide({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
  );
}
function IconeSoleil({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
function IconeLune({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
// Barre de navigation fixe en bas de l'écran — visible sur mobile seulement,
// pour un accès direct aux 4 destinations les plus utilisées au pouce, sans
// avoir à ouvrir le menu ☰. "Plus" ouvre le menu complet habituel.
function BarreOngletsBas({ page, setPage, estPasteur, nonLus, ouvrirMenuComplet, setGemOuvert, setParentOuvert }) {
  // Sur mobile, quand le clavier s'ouvre (en tapant un message par exemple),
  // la zone réellement visible à l'écran rétrécit. Une barre simplement
  // "fixée en bas" peut alors se retrouver cachée derrière le clavier tant
  // qu'il reste ouvert. On calcule sa position à partir de la VRAIE zone
  // visible, pour qu'elle reste toujours au bon endroit.
  const [decalageBas, setDecalageBas] = useState(0);
  useEffect(() => {
    if (!window.visualViewport) return;
    function ajuster() {
      const vv = window.visualViewport;
      const decalage = window.innerHeight - (vv.height + vv.offsetTop);
      setDecalageBas(Math.max(0, decalage));
    }
    ajuster();
    window.visualViewport.addEventListener("resize", ajuster);
    window.visualViewport.addEventListener("scroll", ajuster);
    return () => {
      window.visualViewport.removeEventListener("resize", ajuster);
      window.visualViewport.removeEventListener("scroll", ajuster);
    };
  }, []);

  const onglets = estPasteur
    ? [
        { cle: "dashboard", label: "Accueil", icone: IconeMaison },
        { cle: "membres", label: "Membres", icone: IconeGroupe },
        { cle: "rapports", label: "Rapports", icone: IconeClipboard },
        { cle: "messagerie", label: "Messages", icone: IconeMessage, badge: nonLus },
      ]
    : [
        { cle: "dashboard", label: "Accueil", icone: IconeMaison },
        { cle: "calendrier", label: "Agenda", icone: IconeCalendrier },
        { cle: "messagerie", label: "Messages", icone: IconeMessage, badge: nonLus },
        { cle: "mon_compte", label: "Profil", icone: IconePersonne },
      ];

  function aller(cle) {
    setPage(cle);
    setGemOuvert(null);
    setParentOuvert(null);
  }

  return (
    <div
      className="barre-onglets-bas"
      style={{
        position: "fixed", bottom: decalageBas, left: 0, right: 0, zIndex: 2000, width: "100%",
        backgroundColor: "var(--bg-surface)", borderTop: "1px solid var(--border-1)",
        justifyContent: "space-between", alignItems: "stretch",
        paddingBottom: decalageBas > 0 ? 0 : "max(env(safe-area-inset-bottom, 0px), 8px)",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.3)", boxSizing: "border-box",
        transform: "translateZ(0)", willChange: "transform",
      }}
    >
      {onglets.map(o => {
        const actif = page === o.cle;
        return (
          <button
            key={o.cle}
            className="btn-app"
            onClick={() => aller(o.cle)}
            style={{
              flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              padding: "10px 2px 8px", background: "none", border: "none", cursor: "pointer",
              color: actif ? "var(--gold)" : "var(--text-secondary)", position: "relative",
            }}
          >
            {o.badge > 0 && (
              <span style={{ position: "absolute", top: 4, right: "24%", backgroundColor: "var(--red)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 999, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{o.badge}</span>
            )}
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 26, borderRadius: 10,
              backgroundColor: actif ? "rgba(227,185,90,0.14)" : "transparent",
              filter: actif ? "drop-shadow(0 2px 4px rgba(227,185,90,0.35))" : "none",
              transition: "background-color 0.2s ease, filter 0.2s ease",
            }}>
              <o.icone size={19} color={actif ? "var(--gold)" : "var(--text-secondary)"} />
            </span>
            <span style={{ fontSize: 10, fontWeight: actif ? 700 : 500, whiteSpace: "nowrap" }}>{o.label}</span>
            {actif && <span style={{ position: "absolute", bottom: 0, width: 20, height: 3, borderRadius: 999, backgroundColor: "var(--gold)" }} />}
          </button>
        );
      })}
      <button
        className="btn-app"
        onClick={ouvrirMenuComplet}
        style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "10px 2px 8px", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
        <span style={{ fontSize: 10, fontWeight: 500, whiteSpace: "nowrap" }}>Plus</span>
      </button>
    </div>
  );
}

function BoutonTheme({ theme, onBasculer, taille = 36 }) {
  return (
    <button
      className="btn-app"
      onClick={onBasculer}
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      style={{
        width: taille, height: taille, borderRadius: 999, border: `1px solid ${TEAL_600}`,
        backgroundColor: TEAL_900, color: GOLD_LIGHT, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
      }}
    >
      {theme === "dark" ? <IconeSoleil size={16} /> : <IconeLune size={16} />}
    </button>
  );
}

function IconeDeconnexion({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
    </svg>
  );
}
function IconeCroissance({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function IconeGraphique({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconeTelechargement({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconeFusion({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 7c0-1.1-.9-2-2-2h-2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2c1.1 0 2-.9 2-2" /><path d="M6 7c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8c-1.1 0-2-.9-2-2" /><path d="M12 12h6" /><path d="M6 12h6" />
    </svg>
  );
}

function IconeMicro({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function IconeCadenas({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconeEnregistrer({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function IconeImprimante({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function IconeCrayon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function IconeEtoile({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconeAnalyse({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.4.5 2.6 1.4 3.6C4.5 12 4 13.4 4 15a5 5 0 0 0 5 5" /><path d="M14.5 2A5.5 5.5 0 0 1 20 7.5c0 1.4-.5 2.6-1.4 3.6.9.9 1.4 2.3 1.4 3.9a5 5 0 0 1-5 5" /><path d="M9.5 2v20" /><path d="M14.5 2v20" />
    </svg>
  );
}

function StylesGlobaux() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

      /* ---------- Thème sombre (par défaut) — "Terre & Moisson" ---------- */
      :root, [data-theme="dark"] {
        --bg-base: #033536;
        --bg-surface: #0A4C4A;
        --bg-surface-2: #0E5A57;
        --bg-surface-3: #126863;
        --border-1: #1D7A72;
        --border-2: #2A9089;
        --gold: #E3B95A;
        --gold-light: #F5D876;
        --text-primary: #F4F7F0;
        --text-secondary: #A8C9C3;
        --text-secondary-2: #C9E0DA;
        --red: #E2777B;
        --green: #8FCBA8;
        --green-success: #6fcf97;
        --gold-warn: #EDC768;
        --overlay: var(--overlay);
        color-scheme: dark;
      }

      /* ---------- Thème clair — palette "Maison Bleu Nuit" : fond blanc pur, sarcelle profond, accent terracotta ---------- */
      [data-theme="light"] {
        --bg-base: #FFFFFF;
        --bg-surface: #FFFFFF;
        --bg-surface-2: #F7F7F6;
        --bg-surface-3: #EDEEEC;
        --border-1: #EDEEEC;
        --border-2: #D8DBD9;
        --gold: #073B36;
        --gold-light: #1C7A6C;
        --text-primary: #171F1E;
        --text-secondary: #5C6B68;
        --text-secondary-2: #3D4A47;
        --red: #C4595C;
        --green: #3F9C6E;
        --green-success: #3F9C6E;
        --gold-warn: #C96F4A;
        --overlay: rgba(7,59,54,0.45);
        color-scheme: light;
      }

      body { background-color: var(--bg-base); transition: background-color 0.2s ease; }
      body, input, select, textarea, button { font-family: 'Inter', system-ui, sans-serif; }
      .titre-moisson { font-family: 'Fraunces', serif; font-optical-sizing: auto; letter-spacing: -0.01em; }
      .chiffre-app { font-variant-numeric: tabular-nums; }

      .btn-app { transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
      .btn-app:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
      .btn-app:active:not(:disabled) { transform: translateY(0) scale(0.97); filter: brightness(0.95); }
      .btn-app:disabled { opacity: 0.6; cursor: not-allowed; }
      .card-app { transition: transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease, border-color 0.15s ease; }
      .card-app:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,0.22); }

      /* ---------- États de focus — halo doré discret sur tout champ actif ---------- */
      input:not([type="checkbox"]):not([type="radio"]), select, textarea {
        transition: box-shadow 0.15s ease, border-color 0.15s ease;
      }
      input:not([type="checkbox"]):not([type="radio"]):focus, select:focus, textarea:focus {
        outline: none;
        border-color: var(--gold) !important;
        box-shadow: 0 0 0 3px rgba(227,185,90,0.22);
      }

      /* ---------- Cases à cocher stylisées, à la couleur de l'app ---------- */
      input[type="checkbox"], input[type="radio"] {
        accent-color: var(--gold);
        width: 16px; height: 16px;
        cursor: pointer;
      }

      /* ---------- Hiérarchie des boutons ---------- */
      .btn-primaire {
        background: linear-gradient(135deg, var(--gold-light), var(--gold));
        color: var(--bg-base); border: none; font-weight: 700;
        box-shadow: 0 4px 14px rgba(227,185,90,0.28);
      }
      .btn-secondaire {
        background: transparent; color: var(--gold-light);
        border: 1px solid var(--gold); font-weight: 600;
      }
      .btn-tertiaire {
        background: none; color: var(--text-secondary); border: none; font-weight: 500;
      }
      .btn-primaire, .btn-secondaire, .btn-tertiaire {
        border-radius: 10px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
      }
      .btn-primaire:active, .btn-secondaire:active, .btn-tertiaire:active { transform: scale(0.97); }
      .fade-in { animation: fadeInApp 0.24s cubic-bezier(0.22,1,0.36,1); }
      .barre-graphique { transition: opacity 0.15s ease; }
      .barre-graphique:hover { opacity: 0.75; }
      @keyframes fadeInApp { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes tourner { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spinner-app { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(214,165,76,0.25); border-top-color: var(--gold); border-radius: 50%; animation: tourner 0.7s linear infinite; flex-shrink: 0; }
      @keyframes chuteConfetti {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(600deg); opacity: 0.3; }
      }
      .transition-page { animation: fadeInApp 0.32s cubic-bezier(0.22,1,0.36,1); }

      /* Entrée échelonnée pour les listes de cartes — chaque élément apparaît
         juste après le précédent, effet "cascade" plus vivant qu'un bloc statique. */
      @keyframes entreeCascade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes balayageReflet { 0% { transform: translateX(-120%) rotate(20deg); } 100% { transform: translateX(220%) rotate(20deg); } }
      @keyframes flotterCouronne { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-3px) rotate(3deg); } }
      @keyframes scintiller2 { 0%, 100% { opacity: 0.15; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.15); } }
      .liste-cascade > * { animation: entreeCascade 0.32s cubic-bezier(0.22,1,0.36,1) backwards; }
      .liste-cascade > *:nth-child(1) { animation-delay: 0.02s; }
      .liste-cascade > *:nth-child(2) { animation-delay: 0.06s; }
      .liste-cascade > *:nth-child(3) { animation-delay: 0.10s; }
      .liste-cascade > *:nth-child(4) { animation-delay: 0.14s; }
      .liste-cascade > *:nth-child(5) { animation-delay: 0.18s; }
      .liste-cascade > *:nth-child(n+6) { animation-delay: 0.20s; }

      input, select, textarea { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
      input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 2px rgba(214,165,76,0.45); }
      .squelette-shimmer {
        background: linear-gradient(90deg, var(--bg-surface-3) 25%, var(--border-1) 50%, var(--bg-surface-3) 75%);
        background-size: 200% 100%;
        animation: scintiller 1.6s ease-in-out infinite;
      }
      @keyframes scintiller { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

      input[type="checkbox"] { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; }
      input[type="checkbox"]:active { transform: scale(1.25); }
      input[type="checkbox"]:checked { animation: cocher 0.28s cubic-bezier(0.34,1.56,0.64,1); }
      @keyframes cocher { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
      button:focus-visible, a:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--gold-light); outline-offset: 2px; border-radius: 6px; }
      ::selection { background-color: rgba(214,165,76,0.35); }

      .nav-bureau { display: flex; gap: 8px; flex-wrap: wrap; }
      .bouton-hamburger { display: none; }
      .barre-onglets-bas { display: none; }
      @media (max-width: 860px) {
        .nav-bureau { display: none !important; }
        .bouton-hamburger { display: flex !important; }
        .barre-onglets-bas { display: flex !important; }
        .contenu-avec-barre-bas { padding-bottom: 76px !important; }
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "28px 0", color: "var(--text-secondary)", fontSize: 14 }}>
      <span className="spinner-app" />
      {texte}
    </div>
  );
}

// Écran de chargement en "squelette" — de fausses cartes qui scintillent
// doucement, à la place d'un simple rond qui tourne. Donne l'impression que
// le contenu est presque prêt, plus agréable pour les listes.
function ChargementSquelette({ lignes = 5 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} style={{ borderRadius: 14, padding: 16, backgroundColor: TEAL_850, border: `1px solid ${TEAL_700}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="squelette-shimmer" style={{ height: 14, width: `${55 + (i % 3) * 12}%`, borderRadius: 6 }} />
          <div className="squelette-shimmer" style={{ height: 10, width: `${30 + (i % 4) * 8}%`, borderRadius: 6 }} />
        </div>
      ))}
    </div>
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
  const couleurs = ["var(--gold)", "var(--gold-light)", "var(--border-2)", "var(--green-success)", "var(--red)"];
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
    <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "var(--overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid rgba(226,119,123,0.4)", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
        <p className="titre-moisson" style={{ fontWeight: 600, fontSize: 18, marginBottom: 10, color: "var(--text-primary)" }}>Demander la suppression de {nomMembre}</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.55 }}>
          Cette suppression sera soumise au pasteur et aux assistants pour validation — le membre ne sera pas retiré immédiatement.
        </p>
        <textarea
          value={motif}
          onChange={e => { setMotif(e.target.value); setErreur(""); }}
          rows={3}
          placeholder="Motif de la suppression (obligatoire)..."
          style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-2)", resize: "vertical", fontSize: 13 }}
        />
        {erreur && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{erreur}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn-app" onClick={onAnnuler} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-2)", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button className="btn-app" onClick={valider} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "var(--red)", backgroundImage: "linear-gradient(135deg, #ea9a9d, var(--red))", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(226,119,123,0.3)" }}>
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
    <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "var(--overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ backgroundColor: "var(--bg-surface-2)", border: `1px solid ${dangereux ? "rgba(226,119,123,0.4)" : "var(--border-1)"}`, borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {dangereux && (
            <div style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: "rgba(226,119,123,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconeAlerte size={17} color="var(--red)" />
            </div>
          )}
          <p className="titre-moisson" style={{ fontWeight: 600, fontSize: 18, margin: 0, color: "var(--text-primary)" }}>{titre}</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 22, lineHeight: 1.55 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
 className="btn-app"
 onClick={onAnnuler} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-2)", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button
 className="btn-app"
 onClick={onConfirmer} style={{
              padding: "10px 18px", borderRadius: 9, border: "none", fontWeight: 700, cursor: "pointer",
              color: dangereux ? "#fff" : "var(--bg-base)",
              backgroundColor: dangereux ? "var(--red)" : "var(--gold)",
              backgroundImage: dangereux ? "linear-gradient(135deg, #ea9a9d, var(--red))" : "linear-gradient(135deg, var(--gold-light), var(--gold))",
              boxShadow: dangereux ? "0 4px 14px rgba(226,119,123,0.3)" : "0 4px 14px rgba(214,165,76,0.28)",
            }}>
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

// Exécute une écriture Supabase — si le réseau est absent (ou l'écriture
// échoue à cause de ça), l'action est mise de côté et rejouée automatiquement
// dès que la connexion revient, au lieu d'être perdue. Utile pour le
// pointage de présence, souvent fait avec un réseau instable.
// Libellé d'un mois au format "YYYY-MM" — versions partagées, réutilisées
// partout au lieu d'être redéfinies dans chaque composant (long : "juillet
// 2026", court : "juil.").
function libelleMois(cle) {
  if (!cle) return "";
  const [annee, mois] = cle.split("-");
  return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
function libelleMoisCourt(cle) {
  if (!cle) return "";
  const [annee, mois] = cle.split("-");
  return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short" });
}
// Initiales d'un nom complet — ex: "Jean Kouassi" -> "JK".
function initiales(nom) {
  return (nom || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

async function ecrireAvecFileAttente({ table, action, payload, onConflict, matchColumn, matchValue }) {
  const horsLigne = typeof navigator !== "undefined" && !navigator.onLine;
  if (!horsLigne) {
    try {
      const requete = supabase.from(table);
      let resultat;
      if (action === "upsert") resultat = await requete.upsert(payload, { onConflict });
      else if (action === "update") resultat = await requete.update(payload).eq(matchColumn, matchValue);
      else resultat = await requete.insert(payload);
      if (!resultat.error) return { ok: true };
    } catch {}
  }
  // Écriture impossible tout de suite — on la met en attente.
  try {
    const file = JSON.parse(localStorage.getItem("gem_file_attente") || "[]");
    file.push({ table, action, payload, onConflict, matchColumn, matchValue });
    localStorage.setItem("gem_file_attente", JSON.stringify(file));
  } catch {}
  return { ok: false, enAttente: true };
}

// Enregistre une action sensible dans le journal d'audit — appel "silencieux"
// (ne bloque jamais l'action même si l'enregistrement échoue).
async function journaliser(compte, action, cible, details) {
  try {
    await supabase.from("journal_audit").insert({
      compte_id: compte?.id || null,
      compte_nom: compte?.nom || "Inconnu",
      action, cible: cible || null, details: details || null,
    });
  } catch {}
}

// Effet vague au clic — un seul gestionnaire global, s'applique automatiquement
// à tous les boutons ".btn-app" de l'application sans avoir à toucher chacun.
function EffetVague() {
  useEffect(() => {
    function surClic(e) {
      const bouton = e.target.closest(".btn-app");
      if (!bouton) return;
      const rect = bouton.getBoundingClientRect();
      const taille = Math.max(rect.width, rect.height) * 2;
      const vague = document.createElement("span");
      vague.style.position = "absolute";
      vague.style.left = `${e.clientX - rect.left - taille / 2}px`;
      vague.style.top = `${e.clientY - rect.top - taille / 2}px`;
      vague.style.width = `${taille}px`;
      vague.style.height = `${taille}px`;
      vague.style.borderRadius = "50%";
      vague.style.backgroundColor = "rgba(255,255,255,0.35)";
      vague.style.pointerEvents = "none";
      vague.style.transform = "scale(0)";
      vague.style.opacity = "1";
      vague.style.transition = "transform 0.5s ease-out, opacity 0.5s ease-out";
      const stylePrecedent = getComputedStyle(bouton).position;
      if (stylePrecedent === "static") bouton.style.position = "relative";
      bouton.style.overflow = "hidden";
      bouton.appendChild(vague);
      requestAnimationFrame(() => { vague.style.transform = "scale(1)"; vague.style.opacity = "0"; });
      setTimeout(() => vague.remove(), 520);
    }
    document.addEventListener("click", surClic);
    return () => document.removeEventListener("click", surClic);
  }, []);
  return null;
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
    <div style={{ position: "fixed", bottom: 20, right: 20, left: 20, zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, pointerEvents: "none" }}>
      {toasts.map(t => {
        const accent = t.type === "erreur" ? "var(--red)" : t.type === "succes" ? "var(--green)" : "var(--gold)";
        return (
          <div
            key={t.id}
            className="fade-in"
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "13px 16px", borderRadius: 12, color: "var(--text-primary)", fontWeight: 500, fontSize: 13, lineHeight: 1.45,
              maxWidth: 380, boxShadow: "0 12px 28px rgba(0,0,0,0.4)", pointerEvents: "auto",
              backgroundColor: "var(--bg-surface-2)", borderLeft: `3px solid ${accent}`,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1, color: accent }}>
              {t.type === "erreur" ? <IconeAlerte size={16} /> : t.type === "succes" ? <IconeValide size={16} /> : <EpiDeBle size={13} color={accent} />}
            </span>
            <span>{t.message}</span>
          </div>
        );
      })}
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
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, maxWidth: 400 }}>Aucune donnée n'a été perdue. Recharge la page pour continuer.</p>
          <button
 className="btn-app"
 onClick={() => window.location.reload()} style={{ padding: "10px 20px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>
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
        <p style={{ color: "var(--text-secondary-2)", fontSize: 13, marginBottom: 20 }}>Bienvenue {compte.nom}, ressaisis ton mot de passe pour continuer.</p>
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
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary-2)", cursor: "pointer" }}>
            <input type="checkbox" checked={motDePasseVisible} onChange={e => setMotDePasseVisible(e.target.checked)} />
            Afficher le mot de passe
          </label>
          {erreur && <p style={{ color: "var(--red)", fontSize: 12 }}>{erreur}</p>}
          <button className="btn-app" disabled={chargement} onClick={deverrouiller} style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", cursor: "pointer" }}>
            {chargement ? "…" : "Déverrouiller"}
          </button>
          <button className="btn-app" onClick={seDeconnecter} style={{ padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 12, backgroundColor: "transparent", color: "var(--text-secondary)", border: "none", cursor: "pointer" }}>
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
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("gem_theme") || "dark"; } catch { return "dark"; }
  });
  const [enLigne, setEnLigne] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [enFileAttente, setEnFileAttente] = useState(0);

  useEffect(() => {
    function surConnexion() {
      setEnLigne(true);
      traiterFileAttente();
    }
    function surDeconnexion() { setEnLigne(false); }
    window.addEventListener("online", surConnexion);
    window.addEventListener("offline", surDeconnexion);
    traiterFileAttente(); // au cas où des actions étaient déjà en attente au démarrage
    return () => {
      window.removeEventListener("online", surConnexion);
      window.removeEventListener("offline", surDeconnexion);
    };
  }, []);

  async function traiterFileAttente() {
    let file = [];
    try { file = JSON.parse(localStorage.getItem("gem_file_attente") || "[]"); } catch {}
    if (file.length === 0) { setEnFileAttente(0); return; }
    const restantes = [];
    for (const op of file) {
      try {
        const requete = supabase.from(op.table);
        if (op.action === "upsert") await requete.upsert(op.payload, { onConflict: op.onConflict });
        else if (op.action === "update") await requete.update(op.payload).eq(op.matchColumn, op.matchValue);
        else if (op.action === "insert") await requete.insert(op.payload);
      } catch {
        restantes.push(op); // on la garde pour réessayer plus tard
      }
    }
    try { localStorage.setItem("gem_file_attente", JSON.stringify(restantes)); } catch {}
    setEnFileAttente(restantes.length);
    if (file.length > restantes.length) toast(`✓ ${file.length - restantes.length} action(s) en attente ont été synchronisées.`, "succes");
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("gem_theme", theme); } catch {}
  }, [theme]);

  function basculerTheme() {
    setTheme(t => (t === "dark" ? "light" : "dark"));
  }

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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, backgroundColor: TEAL_950 }}>
        <div style={{ animation: "respirer 1.8s ease-in-out infinite" }}>
          <img src={LOGO_VH} alt="Vases d'Honneur" style={{ height: 64, width: "auto" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="spinner-app" />
          <span className="titre-moisson" style={{ color: "var(--text-primary)", fontSize: 15 }}>Gestion des GEM</span>
        </div>
        <style>{`@keyframes respirer { 0%, 100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }`}</style>
      </div>
    );
  }

  if (!session || !compte) return <EcranConnexion theme={theme} onBasculerTheme={basculerTheme} />;

  if (verrouille) return <EcranVerrouillage compte={compte} onDeverrouille={() => { setVerrouille(false); enregistrerDerniereActivite(); }} />;

  return <TableauDeBord compte={compte} theme={theme} onBasculerTheme={basculerTheme} enLigne={enLigne} enFileAttente={enFileAttente} />;
}

export default function AppAvecProtection() {
  return (
    <LimiteErreurs>
      <StylesGlobaux />
      <ConteneurToasts />
      <EffetVague />
      <App />
    </LimiteErreurs>
  );
}

/* --------------------------- Écran de connexion --------------------------- */

function EcranConnexion({ theme, onBasculerTheme }) {
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
    return `${(tel || "").replace(/[^\d]/g, "")}@gestiongem.com`;
  }

  async function seConnecter() {
    setErreur(""); setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailTechnique(telephone), password: motDePasse });
    if (error) setErreur("Identifiant ou mot de passe incorrect.");
    setChargement(false);
  }

  async function sInscrire() {
    setErreur(""); setChargement(true);
    if (!numeroTelephoneValide(telephone)) { setErreur("Ce numéro de téléphone ne semble pas valide — vérifie qu'il est complet."); setChargement(false); return; }
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
        backgroundImage: `linear-gradient(180deg, rgba(3,53,54,0.5) 0%, rgba(3,53,54,0.94) 100%), url(${BERGER_IMG})`,
        backgroundSize: "cover", backgroundPosition: "center",
        position: "relative", overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", inset: "-20%", pointerEvents: "none",
          background: "radial-gradient(circle at 30% 30%, rgba(214,165,76,0.14), transparent 55%), radial-gradient(circle at 75% 70%, rgba(143,203,168,0.10), transparent 50%)",
          animation: "deriveDouce 16s ease-in-out infinite alternate",
        }}
      />
      <style>{`@keyframes deriveDouce { 0% { transform: translate(-3%, -2%) scale(1); } 100% { transform: translate(3%, 2%) scale(1.08); } }`}</style>
      <div className="fade-in" style={{ position: "relative", width: "100%", maxWidth: mode === "inscription" ? 420 : 380, maxHeight: "92vh", overflowY: "auto", backgroundColor: "rgba(10,76,74,0.94)", backdropFilter: "blur(10px)", border: "1px solid rgba(245,216,118,0.22)", borderRadius: 20, padding: 28, boxShadow: "0 30px 70px rgba(0,0,0,0.45)" }}>
        {onBasculerTheme && (
          <div style={{ position: "absolute", top: 14, right: 14 }}>
            <BoutonTheme theme={theme} onBasculer={onBasculerTheme} taille={32} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, var(--bg-surface-2), var(--bg-base))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(0,0,0,0.3)", border: "1px solid rgba(245,216,118,0.25)", padding: 8 }}>
            <img src={LOGO_VH} alt="Vases d'Honneur" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          <EpiDeBle size={16} />
          <h1 className="titre-moisson" style={{ color: "var(--text-primary)", fontSize: 27, fontWeight: 600, margin: 0, textAlign: "center" }}>Gestion des GEM</h1>
          <EpiDeBle size={16} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ width: 28, height: 1, backgroundColor: "var(--gold)", opacity: 0.5 }} />
          <span style={{ width: 5, height: 5, backgroundColor: "var(--gold)", transform: "rotate(45deg)", flexShrink: 0 }} />
          <span style={{ width: 28, height: 1, backgroundColor: "var(--gold)", opacity: 0.5 }} />
        </div>
        <p style={{ color: "var(--gold-light)", fontSize: 12, fontWeight: 600, marginBottom: 22, textAlign: "center", letterSpacing: 2.5, textTransform: "uppercase" }}>Assemblée RENAISSANCE · Bouaflé</p>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, backgroundColor: "rgba(10,76,74,0.4)", borderRadius: 11, padding: 4 }}>
          <button
 className="btn-app"
 onClick={() => { setMode("connexion"); setMotDePasseOublieOuvert(false); if (telephone === "+225 ") setTelephone(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "connexion" ? "var(--gold)" : "transparent", backgroundImage: mode === "connexion" ? "linear-gradient(135deg, var(--gold-light), var(--gold))" : "none", color: mode === "connexion" ? "var(--bg-base)" : "var(--text-secondary-2)", border: "none", boxShadow: mode === "connexion" ? "0 3px 10px rgba(214,165,76,0.3)" : "none" }}>Se connecter</button>
          <button
 className="btn-app"
 onClick={() => { setMode("inscription"); setMotDePasseOublieOuvert(false); if (!telephone.trim()) setTelephone("+225 "); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "inscription" ? "var(--gold)" : "transparent", backgroundImage: mode === "inscription" ? "linear-gradient(135deg, var(--gold-light), var(--gold))" : "none", color: mode === "inscription" ? "var(--bg-base)" : "var(--text-secondary-2)", border: "none", boxShadow: mode === "inscription" ? "0 3px 10px rgba(214,165,76,0.3)" : "none" }}>Inscription</button>
        </div>

        {mode === "connexion" && motDePasseOublieOuvert ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ color: CREAM, fontWeight: 700, fontSize: 14 }}>Mot de passe oublié</p>
            <p style={{ color: "var(--text-secondary-2)", fontSize: 12, lineHeight: 1.4 }}>
              L'application n'envoie pas d'e-mail. Indique ton numéro de téléphone : ta demande sera transmise au pasteur pour réinitialiser ton mot de passe.
            </p>
            <input value={telephoneOubli} onChange={e => setTelephoneOubli(e.target.value)} placeholder="Ton numéro de téléphone" type="tel" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
            {messageOubli && <p style={{ color: messageOubli.startsWith("Ta demande") ? GOLD_LIGHT : RED_LIGHT, fontSize: 12 }}>{messageOubli}</p>}
            <button disabled={envoiOubliEnCours} onClick={envoyerDemandeOubli} style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", cursor: "pointer" }}>
              {envoiOubliEnCours ? "…" : "Envoyer la demande"}
            </button>
            <button
 className="btn-app"
 onClick={() => { setMotDePasseOublieOuvert(false); setMessageOubli(""); }} style={{ padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: "transparent", color: "var(--text-secondary-2)", border: "none", cursor: "pointer" }}>
              ← Retour à la connexion
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "inscription" && (
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary-2)", display: "block", marginBottom: 5 }}>Nom complet</label>
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ton nom et prénom" style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, backgroundColor: "var(--bg-base)", color: CREAM, border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary-2)", display: "block", marginBottom: 5 }}>Téléphone</label>
              <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+225 ..." type="tel" autoComplete="tel" name="telephone" style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, backgroundColor: "var(--bg-base)", color: CREAM, border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary-2)" }}>Mot de passe</label>
                {mode === "connexion" && (
                  <button
 className="btn-app"
 onClick={() => { setMotDePasseOublieOuvert(true); setMessageOubli(""); setTelephoneOubli(telephone); }} style={{ background: "none", border: "none", color: "var(--gold-light)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                    Oublié ?
                  </button>
                )}
              </div>
              <input
                value={motDePasse}
                onChange={e => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                type={motDePasseVisible ? "text" : "password"}
                autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                name="mot-de-passe"
                style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, backgroundColor: "var(--bg-base)", color: CREAM, border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary-2)", cursor: "pointer", marginTop: -4 }}>
              <input type="checkbox" checked={motDePasseVisible} onChange={e => setMotDePasseVisible(e.target.checked)} />
              Afficher le mot de passe
            </label>

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
            <button className="btn-primaire" disabled={chargement} onClick={mode === "connexion" ? seConnecter : sInscrire} style={{ padding: "13px 0", fontSize: 15, backgroundColor: "var(--border-2)", backgroundImage: "none", color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.2)", marginTop: 4 }}>
              {chargement ? "…" : mode === "connexion" ? "Accéder à mon espace" : "Créer mon compte"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Tableau de bord ----------------------------- */

function TableauDeBord({ compte, theme, onBasculerTheme, enLigne, enFileAttente }) {
  const [page, setPage] = useState("dashboard");
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [gemOuvert, setGemOuvert] = useState(null);
  const [parentOuvert, setParentOuvert] = useState(null); // { item, type } - vue d'ensemble d'une tribu/département
  const [bienvenueVisible, setBienvenueVisible] = useState(!compte.a_vu_bienvenue);

  // Rattache la touche "retour" du téléphone à la navigation interne de l'appli,
  // au lieu de la quitter directement. Fonctionne sans avoir à modifier chaque bouton.
  const pileNavigationInterne = useRef([]);
  const dernierEtatConnu = useRef({ page: "dashboard", gemOuvert: null, parentOuvert: null });
  const retourEnCours = useRef(false);
  const premierRenduNavigation = useRef(true);

  // Notifications en temps réel — dès qu'un nouveau message ou événement est
  // ajouté par quelqu'un d'autre, une alerte apparaît immédiatement, sans
  // avoir à recharger la page.
  useEffect(() => {
    const canal = supabase
      .channel("notifications-app")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
        if (payload.new.de_compte_id === compte.id) return;
        toast(`📢 Nouveau message diffusé — ${(payload.new.texte || "").slice(0, 60)}${(payload.new.texte || "").length > 60 ? "…" : ""}`, "info");
        setNbMessagesNonLus(n => n + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages_directs" }, payload => {
        if (payload.new.de_compte_id === compte.id) return;
        const pourMoi = payload.new.destinataire_id === compte.id || (!payload.new.destinataire_id && (compte.role === "pasteur" || compte.assistant === true));
        if (!pourMoi) return;
        toast(payload.new.audio ? "🎙️ Nouveau message vocal reçu" : `💬 Nouveau message reçu — ${(payload.new.texte || "").slice(0, 60)}`, "info");
        setNbMessagesNonLus(n => n + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "evenements" }, payload => {
        if (payload.new.cree_par === compte.id) return;
        toast(`📅 Nouvel événement ajouté au calendrier — ${payload.new.titre}`, "info");
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

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
    // On mémorise la position de défilement de l'écran qu'on quitte, pour
    // pouvoir y revenir exactement au même endroit avec le bouton retour.
    pileNavigationInterne.current.push({ ...dernierEtatConnu.current, scrollY: window.scrollY });
    dernierEtatConnu.current = etatActuel;
    try { window.history.pushState({ appInterne: true }, ""); } catch {}
    window.scrollTo(0, 0);
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
        // Restaure la position de défilement une fois que le contenu de la
        // page précédente a fini de se réafficher.
        const scrollCible = precedent.scrollY || 0;
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollCible)));
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
  const [nbNouveauxCeMois, setNbNouveauxCeMois] = useState(0);
  const [tousLesComptes, setTousLesComptes] = useState([]);
  const [assignationsActivesGlobal, setAssignationsActivesGlobal] = useState([]);
  const [responsablesParGem, setResponsablesParGem] = useState({});
  const [gemDuMois, setGemDuMois] = useState(null);
  const [tribuDeptDuMois, setTribuDeptDuMois] = useState({ tribu: null, departement: null });
  const [rapportsPresenceSemaine, setRapportsPresenceSemaine] = useState({ valides: 0, total: 0 });
  const [rapportsActivitesSemaine, setRapportsActivitesSemaine] = useState({ valides: 0, total: 0 });
  const [absencesSemaine, setAbsencesSemaine] = useState({ nombre: 0, pourcentage: 0 });
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
  const [evenementsAvecImage, setEvenementsAvecImage] = useState([]);

  useEffect(() => { chargerDonnees(); chargerEvenementsCarrousel(); }, []);

  async function chargerEvenementsCarrousel() {
    const { data } = await supabase.from("evenements").select("*").not("image", "is", null).order("debut", { ascending: false }).limit(8);
    setEvenementsAvecImage(data || []);
  }

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
    const { data: tousLesComptes } = await supabase.from("comptes").select("id, nom, role, assistant, telephone, date_naissance, quartier");
    setTousLesComptes(tousLesComptes || []);

    if (estPasteur) {
      const { data: assignationsGem } = await supabase.from("assignations").select("gem_id, compte_id").eq("role_demande", "gem").eq("statut", "actif");
      const map = {};
      (assignationsGem || []).forEach(as => {
        const c = (tousLesComptes || []).find(cc => cc.id === as.compte_id);
        if (as.gem_id && c) map[as.gem_id] = c.nom;
      });
      setResponsablesParGem(map);

      const { data: toutesAssignationsActives } = await supabase.from("assignations").select("*").eq("statut", "actif");
      setAssignationsActivesGlobal(toutesAssignationsActives || []);

      const debutMois = new Date().toISOString().slice(0, 8) + "01";
      const { count: nbNouveaux } = await supabase.from("nouveaux_membres").select("*", { count: "exact", head: true }).gte("date_arrivee", debutMois);
      setNbNouveauxCeMois(nbNouveaux || 0);

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

      if (dernierDimanche && m && m.length > 0) {
        const { data: presencesSemaine } = await supabase.from("presences").select("membre_id, present").eq("dimanche_id", dernierDimanche.id).in("membre_id", m.map(mm => mm.id));
        if (presencesSemaine && presencesSemaine.length > 0) {
          const idsPresents = new Set(presencesSemaine.filter(p => p.present).map(p => p.membre_id));
          const nbAbsents = m.filter(mm => !idsPresents.has(mm.id)).length;
          setAbsencesSemaine({ nombre: nbAbsents, pourcentage: Math.round((nbAbsents / m.length) * 100) });
        } else {
          // Ce dimanche n'a encore aucun pointage — pas encore de données à afficher.
          setAbsencesSemaine({ nombre: 0, pourcentage: 0 });
        }
      } else {
        setAbsencesSemaine({ nombre: 0, pourcentage: 0 });
      }
    }
    calculerGemDuMoisGlobal(g || [], m || [], t || [], d || []).then(setGemDuMois);
    calculerTribuDeptDuMoisGlobal(g || [], m || [], t || [], d || []).then(setTribuDeptDuMois);
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

    // Ignore les dimanches où personne n'a été pointé du tout — ce ne sont pas de
    // vraies absences, juste des semaines jamais réellement traitées.
    const idsDimanchesReellementPointes = new Set((presencesRecentes || []).map(p => p.dimanche_id));
    const dimanchesReels = dimanchesRecents.filter(d => idsDimanchesReellementPointes.has(d.id));

    const map = {};
    listeMembres.forEach(membre => {
      const dateArrivee = membre.created_at ? membre.created_at.slice(0, 10) : null;
      let absencesConsecutives = 0, presencesConsecutives = 0, enCours = true;
      let dimanchesApplicables = 0, dimanchesPresents = 0;
      for (const dim of dimanchesReels) {
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

  function chiffresRecherche(tel) { return (tel || "").replace(/[^\d]/g, "").slice(-8); }
  const numerosDejaTrouves = new Set(resultatsRecherche.map(r => chiffresRecherche(r.data.telephone)).filter(Boolean));

  const resultatsResponsables = (estPasteur && rechercheGlobale.trim().length >= 2)
    ? tousLesComptes.filter(c =>
        (c.nom.toLowerCase().includes(rechercheGlobale.toLowerCase()) ||
        (c.telephone || "").includes(rechercheGlobale)) &&
        !numerosDejaTrouves.has(chiffresRecherche(c.telephone)) // évite d'afficher la même personne deux fois
      ).slice(0, 4).map(c => ({ type: "responsable", data: c }))
    : [];

  const resultatsGems = rechercheGlobale.trim().length >= 2
    ? gems.filter(g => g.nom.toLowerCase().includes(rechercheGlobale.toLowerCase())).slice(0, 4).map(g => ({ type: "gem", data: g }))
    : [];

  const tousLesResultats = [...resultatsRecherche, ...resultatsResponsables, ...resultatsGems];

  function libelleRoleCompte(c) {
    if (c.role === "pasteur") return "Pasteur";
    if (c.assistant) return "Assistant désigné";
    return "Responsable";
  }

  function surClicResultat(resultat) {
    if (resultat.type === "membre") {
      allerAuMembre(resultat.data);
    } else if (resultat.type === "gem") {
      setGemOuvert(resultat.data);
      setRechercheGlobale("");
    } else {
      toast(`👤 ${resultat.data.nom} — ${resultat.data.telephone || "téléphone non renseigné"} — ${libelleRoleCompte(resultat.data)}`, "info");
      setRechercheGlobale("");
    }
  }

  function nomGemMembre(membre) {
    return gems.find(g => g.id === membre.gem_id)?.nom || "GEM inconnu";
  }

  const cardStyle = { backgroundColor: TEAL_850, border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 20, boxShadow: "0 6px 18px rgba(0,0,0,0.16)" };
  const btnStyle = { padding: "10px 18px", borderRadius: 8, fontWeight: 700, fontSize: 17, cursor: "pointer", border: "none" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: TEAL_950, color: CREAM, fontFamily: "system-ui, sans-serif" }}>
      {bienvenueVisible && <ParcoursBienvenue compte={compte} onTermine={() => setBienvenueVisible(false)} />}
      {!enLigne && (
        <div style={{ position: "sticky", top: 0, zIndex: 1500, backgroundColor: RED_LIGHT, color: "#fff", textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <IconeAlerte size={15} /> Tu es hors ligne — le pointage de présence est mis en attente et sera envoyé au retour du réseau.
        </div>
      )}
      {enLigne && enFileAttente > 0 && (
        <div style={{ position: "sticky", top: 0, zIndex: 1500, backgroundColor: "var(--gold)", color: TEAL_950, textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span className="spinner-app" /> Synchronisation de {enFileAttente} action{enFileAttente > 1 ? "s" : ""} en attente…
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${TEAL_800}`, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={LOGO_VH} alt="Vases d'Honneur" style={{ height: 36, width: "auto" }} />
          <div>
            <p style={{ fontSize: 13, color: "var(--text-secondary-2)", margin: 0 }}>{(() => { const h = new Date().getHours(); return h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir"; })()}, <b style={{ color: CREAM }}>{compte.nom}</b></p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant désigné" : "Responsable"}</p>
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
                        <IconePersonne size={9} style={{verticalAlign:"-1px",marginRight:3}} /> {libelleRoleCompte(r.data)}
                      </span>
                    )}
                    {r.type === "gem" && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: TEAL_950, backgroundColor: "var(--green)", borderRadius: 999, padding: "2px 7px", marginLeft: 6 }}>
                        <IconeMaison size={9} style={{verticalAlign:"-1px",marginRight:3}} /> GEM
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                    {r.type === "membre" ? `${nomGemMembre(r.data)} · ${r.data.telephone}` : r.type === "gem" ? (r.data.tribu_id ? `Tribu de ${tribus.find(t => t.id === r.data.tribu_id)?.nom || "?"}` : `Département ${departements.find(d => d.id === r.data.departement_id)?.nom || "?"}`) : (r.data.telephone || "Téléphone non renseigné")}
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
 onClick={() => { setPage("mon_espace"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "mon_espace" ? TEAL_700 : "transparent", color: page === "mon_espace" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Mon espace</button>
              )}
              {compte.role !== "pasteur" && (
                <button
 className="btn-app"
 onClick={() => { setPage("demande_role_supp"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "demande_role_supp" ? TEAL_700 : "transparent", color: page === "demande_role_supp" ? GOLD_LIGHT : "var(--text-secondary-2)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>+ Rôle supplémentaire</span></button>
              )}
              <button
 className="btn-app"
 onClick={() => { setPage("dashboard"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "dashboard" ? TEAL_700 : "transparent", color: page === "dashboard" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Tableau de bord</button>
              <button
 className="btn-app"
 onClick={() => { setPage("tribus"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "tribus" ? TEAL_700 : "transparent", color: page === "tribus" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Tribus</button>
              <button
 className="btn-app"
 onClick={() => { setPage("departements"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "departements" ? TEAL_700 : "transparent", color: page === "departements" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Départements</button>
              <button
 className="btn-app"
 onClick={() => { setPage("demandes"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "demandes" ? TEAL_700 : "transparent", color: page === "demandes" ? GOLD_LIGHT : "var(--text-secondary-2)", position: "relative" }}>
                Demandes
                {nbDemandesAttente > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbDemandesAttente}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("rapports"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "rapports" ? TEAL_700 : "transparent", color: page === "rapports" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Rapports</button>
              <button
 className="btn-app"
 onClick={() => { setPage("historique"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "historique" ? TEAL_700 : "transparent", color: page === "historique" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Historique</button>
              <button
 className="btn-app"
 onClick={() => { setPage("analyse"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "analyse" ? TEAL_700 : "transparent", color: page === "analyse" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>🧠 Analyse</button>
              <button
 className="btn-app"
 onClick={() => { setPage("calendrier"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "calendrier" ? TEAL_700 : "transparent", color: page === "calendrier" ? GOLD_LIGHT : "var(--text-secondary-2)", position: "relative" }}>
                Calendrier
                {nbNouveauxEvenements > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbNouveauxEvenements}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("messagerie"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "messagerie" ? TEAL_700 : "transparent", color: page === "messagerie" ? GOLD_LIGHT : "var(--text-secondary-2)", position: "relative" }}>
                Messagerie
                {nbMessagesNonLus > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbMessagesNonLus}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("mots_de_passe"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "mots_de_passe" ? TEAL_700 : "transparent", color: page === "mots_de_passe" ? GOLD_LIGHT : "var(--text-secondary-2)", position: "relative" }}>
                Mots de passe
                {nbDemandesMdp > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbDemandesMdp}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("suppressions"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "suppressions" ? TEAL_700 : "transparent", color: page === "suppressions" ? GOLD_LIGHT : "var(--text-secondary-2)", position: "relative" }}>
                Suppressions
                {nbDemandesSuppression > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbDemandesSuppression}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("corbeille"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "corbeille" ? TEAL_700 : "transparent", color: page === "corbeille" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconePoubelle size={15} /> Corbeille
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("sante_responsables"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "sante_responsables" ? TEAL_700 : "transparent", color: page === "sante_responsables" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconeThermometre size={15} /> Santé responsables
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("nouveaux"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "nouveaux" ? TEAL_700 : "transparent", color: page === "nouveaux" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconePousse size={15} /> Nouveaux
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("membres"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "membres" ? TEAL_700 : "transparent", color: page === "membres" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconeGroupe size={15} /> Membres
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("nouveaux_membres"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "nouveaux_membres" ? TEAL_700 : "transparent", color: page === "nouveaux_membres" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconePousse size={15} /> Intégrations
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("absences"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "absences" ? TEAL_700 : "transparent", color: page === "absences" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconeInterdit size={15} /> Absences
              </button>
              <button
 className="btn-app"
 onClick={() => { setPage("prediction"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "prediction" ? TEAL_700 : "transparent", color: page === "prediction" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconeAnalyse size={15} /> Prédiction
              </button>
              {compte.role === "pasteur" && (
                <button
 className="btn-app"
 onClick={() => { setPage("assistants"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "assistants" ? TEAL_700 : "transparent", color: page === "assistants" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Rôles & Accès</button>
              )}
              {compte.role === "pasteur" && (
                <button
 className="btn-app"
 onClick={() => { setPage("audit"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "audit" ? TEAL_700 : "transparent", color: page === "audit" ? GOLD_LIGHT : "var(--text-secondary-2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <IconeClipboard size={15} /> Journal
                </button>
              )}
            </>
          ) : (
            <>
              <button
 className="btn-app"
 onClick={() => setPage("dashboard")} style={{ ...btnStyle, backgroundColor: (page !== "messagerie" && page !== "calendrier" && page !== "demande_role_supp") ? TEAL_700 : "transparent", color: (page !== "messagerie" && page !== "calendrier" && page !== "demande_role_supp") ? GOLD_LIGHT : "var(--text-secondary-2)" }}>Mon espace</button>
              <button
 className="btn-app"
 onClick={() => setPage("demande_role_supp")} style={{ ...btnStyle, backgroundColor: page === "demande_role_supp" ? TEAL_700 : "transparent", color: page === "demande_role_supp" ? GOLD_LIGHT : "var(--text-secondary-2)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>+ Rôle supplémentaire</span></button>
              <button
 className="btn-app"
 onClick={() => setPage("calendrier")} style={{ ...btnStyle, backgroundColor: page === "calendrier" ? TEAL_700 : "transparent", color: page === "calendrier" ? GOLD_LIGHT : "var(--text-secondary-2)", position: "relative" }}>
                Calendrier
                {nbNouveauxEvenements > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbNouveauxEvenements}
                  </span>
                )}
              </button>
              <button
 className="btn-app"
 onClick={() => setPage("messagerie")} style={{ ...btnStyle, backgroundColor: page === "messagerie" ? TEAL_700 : "transparent", color: page === "messagerie" ? GOLD_LIGHT : "var(--text-secondary-2)", position: "relative" }}>
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
 onClick={() => { setPage("mon_compte"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "mon_compte" ? TEAL_700 : "transparent", color: page === "mon_compte" ? GOLD_LIGHT : "var(--text-secondary-2)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconePersonne size={15} /> Mon compte</span></button>
          <button
 className="btn-app"
 onClick={() => { setPage("identite"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "identite" ? TEAL_700 : "transparent", color: page === "identite" ? GOLD_LIGHT : "var(--text-secondary-2)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconeGoutte size={15} /> Notre identité</span></button>
          <button
 className="btn-app"
 onClick={() => { setPage("aide"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "aide" ? TEAL_700 : "transparent", color: page === "aide" ? GOLD_LIGHT : "var(--text-secondary-2)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconeAide size={15} /> Aide</span></button>
          <button
 className="btn-app"
 onClick={seDeconnecter} style={{ ...btnStyle, backgroundColor: "transparent", color: "var(--text-secondary-2)" }}>Déconnexion</button>
          {onBasculerTheme && <BoutonTheme theme={theme} onBasculer={onBasculerTheme} taille={34} />}
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
          {onBasculerTheme && (
            <div style={{ padding: "0 20px", marginTop: 14 }}>
              <button
                className="btn-app"
                onClick={onBasculerTheme}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", borderRadius: 10, backgroundColor: TEAL_900, border: `1px solid ${TEAL_600}`, color: CREAM, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {theme === "dark" ? <IconeSoleil size={16} /> : <IconeLune size={16} />}
                {theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              </button>
            </div>
          )}
          <div style={{ padding: 20 }}>
            {(() => {
              function allerA(cible) { setPage(cible); setGemOuvert(null); setParentOuvert(null); setMenuMobileOuvert(false); }
              function GroupeMenu({ titre, items, couleur = GOLD }) {
                return (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: couleur, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: couleur, display: "inline-block" }} />
                      {titre}
                    </p>
                    <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {items.map(it => (
                        <button
                          key={it.cible}
                          className="btn-app"
                          onClick={it.action || (() => allerA(it.cible))}
                          style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 12,
                            backgroundColor: page === it.cible ? `${couleur}30` : `${couleur}12`,
                            border: page === it.cible ? `1px solid ${couleur}` : "1px solid transparent",
                            color: page === it.cible ? couleur : CREAM, fontWeight: 600, fontSize: 16, cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                            {it.icone && (
                              <span style={{
                                display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                                backgroundColor: page === it.cible ? `${couleur}25` : `${couleur}14`,
                                boxShadow: page === it.cible ? `0 2px 6px ${couleur}40` : "none",
                              }}>
                                <it.icone size={15} color={page === it.cible ? couleur : "var(--text-secondary-2)"} />
                              </span>
                            )}
                            {it.label}
                          </span>
                          {it.badge > 0 && (
                            <span style={{ backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 12, fontWeight: 700, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
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
                const groupeSuivi = [{ label: "Tableau de bord", cible: "dashboard", icone: IconeMaison }];
                if (aResponsabilitePersonnelle) groupeSuivi.push({ label: "Mon espace", cible: "mon_espace", icone: IconeMaison });
                groupeSuivi.push({ label: "Tribus", cible: "tribus", icone: IconeGroupe }, { label: "Départements", cible: "departements", icone: IconeGroupe });

                const groupeGestion = [
                  { label: "Demandes", cible: "demandes", badge: nbDemandesAttente },
                  { label: "Suppressions", cible: "suppressions", badge: nbDemandesSuppression },
                  { label: "Corbeille", cible: "corbeille", icone: IconePoubelle },
                  { label: "Santé responsables", cible: "sante_responsables", icone: IconeThermometre },
                  { label: "Nouveaux", cible: "nouveaux", icone: IconePousse },
                  { label: "Membres", cible: "membres", icone: IconeGroupe },
                  { label: "Intégrations", cible: "nouveaux_membres", icone: IconePousse },
                  { label: "Absences", cible: "absences", icone: IconeInterdit },
                  { label: "Prédiction", cible: "prediction", icone: IconeAnalyse },
                ];
                if (compte.role === "pasteur") groupeGestion.push({ label: "Rôles & Accès", cible: "assistants", icone: IconeCle });
                if (compte.role !== "pasteur") groupeGestion.push({ label: "Rôle supplémentaire", cible: "demande_role_supp" });

                return (
                  <>
                    <GroupeMenu titre="Suivi" items={groupeSuivi} couleur="#D6A54C" />
                    <GroupeMenu couleur="#3F9C93" titre="Rapports" items={[
                      { label: "Rapports", cible: "rapports", icone: IconeClipboard },
                      { label: "Historique", cible: "historique" },
                      { label: "Analyse", cible: "analyse" },
                    ]} />
                    <GroupeMenu titre="Gestion" items={groupeGestion} couleur="#8B7BC7" />
                    <GroupeMenu couleur="#C1585C" titre="Communication" items={[
                      { label: "Calendrier", cible: "calendrier", badge: nbNouveauxEvenements, icone: IconeCalendrier },
                      { label: "Messagerie", cible: "messagerie", badge: nbMessagesNonLus, icone: IconeMessage },
                      { label: "Mots de passe", cible: "mots_de_passe", badge: nbDemandesMdp, icone: IconeCle },
                    ]} />
                    <GroupeMenu couleur="#5B8DB8" titre="Compte" items={[
                      { label: "Mon compte", cible: "mon_compte", icone: IconePersonne },
                      { label: "Notre identité", cible: "identite", icone: IconeGoutte },
                      { label: "Aide", cible: "aide", icone: IconeAide },
                      { label: "Déconnexion", cible: "deconnexion", action: seDeconnecter, icone: IconeDeconnexion },
                    ]} />
                  </>
                );
              }

              return (
                <>
                  <GroupeMenu couleur="#D6A54C" titre="Mon espace" items={[
                    { label: "Mon espace", cible: "dashboard", icone: IconeMaison },
                    { label: "Rôle supplémentaire", cible: "demande_role_supp" },
                  ]} />
                  <GroupeMenu couleur="#C1585C" titre="Communication" items={[
                    { label: "Calendrier", cible: "calendrier", badge: nbNouveauxEvenements, icone: IconeCalendrier },
                    { label: "Messagerie", cible: "messagerie", badge: nbMessagesNonLus, icone: IconeMessage },
                  ]} />
                  <GroupeMenu couleur="#5B8DB8" titre="Compte" items={[
                    { label: "Mon compte", cible: "mon_compte", icone: IconePersonne },
                    { label: "Notre identité", cible: "identite", icone: IconeGoutte },
                      { label: "Aide", cible: "aide", icone: IconeAide },
                    { label: "Déconnexion", cible: "deconnexion", action: seDeconnecter, icone: IconeDeconnexion },
                  ]} />
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div key={page} className="transition-page contenu-avec-barre-bas" style={{ padding: 24 }}>
        {chargement ? (
          <p style={{ color: "var(--text-secondary-2)" }}>Chargement des données…</p>
        ) : page === "identite" ? (
          <PageIdentite cardStyle={cardStyle} />
        ) : page === "aide" ? (
          <PageAide estPasteur={estPasteur} cardStyle={cardStyle} />
        ) : page === "mon_compte" ? (
          <PageMonCompte compte={compte} assignationsActives={mesAssignations.filter(a => a.statut === "actif")} gems={gems} tribus={tribus} departements={departements} cardStyle={cardStyle} onMisAJour={chargerDonnees} />
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
            gemDuMois={gemDuMois}
            tribuDeptDuMois={tribuDeptDuMois}
            evenementsAvecImage={evenementsAvecImage}
            tousLesComptes={tousLesComptes}
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
            gemDuMois={gemDuMois}
            tribuDeptDuMois={tribuDeptDuMois}
            evenementsAvecImage={evenementsAvecImage}
            tousLesComptes={tousLesComptes}
            cardStyle={cardStyle}
          />
        ) : gemOuvert ? (
          <DetailGem
            compte={compte}
            gem={gemOuvert}
            membres={membres.filter(m => m.gem_id === gemOuvert.id)}
            onBack={() => window.history.back()}
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
            onBack={() => window.history.back()}
            onChange={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : page === "dashboard" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <EpiDeBle size={22} />
              <h2 className="titre-moisson" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Tableau de bord</h2>
            </div>
            <ParoleDuJour />
            <CarrouselImages evenements={evenementsAvecImage} />
            <BanniereRappelPointage rappel={rappelPointageGlobal} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>👥</span>
                <div><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={membres.length} /></p></div>
              </div>
              <button
                onClick={() => { setPage("nouveaux_membres"); setGemOuvert(null); setParentOuvert(null); }}
                className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", border: "none" }}
              >
                <IconePousse size={26} color="var(--gold)" />
                <div><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Nouveaux ce mois</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={nbNouveauxCeMois} /></p></div>
              </button>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>🏠</span>
                <div><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>GEM actifs</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={gems.length} /></p></div>
              </div>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>🏛️</span>
                <div><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Tribus</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={tribus.length} /></p></div>
              </div>
              <div className="card-app" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>🏢</span>
                <div><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Départements</p><p style={{ fontSize: 28, fontWeight: 700 }}><NombreAnime valeur={departements.length} /></p></div>
              </div>
            </div>
            <ClassementsDuMois gemDuMois={gemDuMois} tribuDeptDuMois={tribuDeptDuMois} />
            <AnniversairesAVenir membres={membres} gems={gems} tribus={tribus} departements={departements} cardStyle={cardStyle} />
            <AnniversairesResponsables comptes={tousLesComptes} cardStyle={cardStyle} />

            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><IconeClipboard size={15} /> Rapports de la semaine en cours</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              <div className="card-app" style={cardStyle}>
                <p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Présence pointée</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: rapportsPresenceSemaine.valides === rapportsPresenceSemaine.total && rapportsPresenceSemaine.total > 0 ? "var(--green-success)" : GOLD_LIGHT }}>
                  <NombreAnime valeur={rapportsPresenceSemaine.valides} /> / {rapportsPresenceSemaine.total}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>GEM ayant validé leur présence</p>
              </div>
              <div className="card-app" style={cardStyle}>
                <p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Activités validées</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: rapportsActivitesSemaine.valides === rapportsActivitesSemaine.total && rapportsActivitesSemaine.total > 0 ? "var(--green-success)" : GOLD_LIGHT }}>
                  <NombreAnime valeur={rapportsActivitesSemaine.valides} /> / {rapportsActivitesSemaine.total}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>GEM ayant validé leurs activités</p>
              </div>
              <button className="btn-app card-app" onClick={() => { setPage("absences"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...cardStyle, cursor: "pointer", textAlign: "left", borderColor: absencesSemaine.nombre > 0 ? RED_LIGHT : cardStyle.border }}>
                <p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>🚫 Absents ce dimanche</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: absencesSemaine.nombre === 0 ? "var(--green-success)" : RED_LIGHT }}>
                  <NombreAnime valeur={absencesSemaine.nombre} /> ({absencesSemaine.pourcentage}%)
                </p>
                <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Clique pour voir le détail</p>
              </button>
              {(() => {
                const listeBossDashboard = calculerListeBoss(membres, gems, tribus, departements, regulariteParMembre, assignationsActivesGlobal, tousLesComptes);
                const bossIrreguliersDashboard = listeBossDashboard.filter(b => b.absencesConsecutives >= 2);
                return (
                  <button className="btn-app card-app" onClick={() => { setPage("membres"); setGemOuvert(null); setParentOuvert(null); }} style={{ ...cardStyle, cursor: "pointer", textAlign: "left", borderColor: bossIrreguliersDashboard.length > 0 ? RED_LIGHT : GOLD }}>
                    <p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}><IconeEtoile size={13} /> BOSS</p>
                    <p style={{ fontSize: 26, fontWeight: 700, color: GOLD_LIGHT }}>
                      <NombreAnime valeur={listeBossDashboard.length} />
                    </p>
                    <p style={{ fontSize: 11, color: bossIrreguliersDashboard.length > 0 ? RED_LIGHT : "var(--text-secondary)" }}>
                      {bossIrreguliersDashboard.length > 0 ? `⚠️ ${bossIrreguliersDashboard.length} irrégulier(s)` : "Voir dans Membres"}
                    </p>
                  </button>
                );
              })()}
            </div>
            <PrioritesPastorales compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} regulariteParMembre={regulariteParMembre} cardStyle={cardStyle} />
            <div style={{ marginTop: 24 }}>
              <button
 className="btn-app"
 onClick={exporterDonneesJSON} style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeTelechargement size={14}/> Exporter toutes les données (JSON)</span>
              </button>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>Sauvegarde complète de secours — à faire régulièrement.</p>
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
          <PageRapports compte={compte} gems={gems} membres={membres} tribus={tribus} departements={departements} responsablesParGem={responsablesParGem} regulariteParMembre={regulariteParMembre} cardStyle={cardStyle} />
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
        ) : page === "nouveaux" ? (
          <PageNouveaux membres={membres} gems={gems} tribus={tribus} departements={departements} cardStyle={cardStyle} />
        ) : page === "membres" ? (
          <PageMembres compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} regulariteParMembre={regulariteParMembre} estPasteur={true} cardStyle={cardStyle} />
        ) : page === "nouveaux_membres" ? (
          <PageNouveauxMembres compte={compte} tribus={tribus} cardStyle={cardStyle} />
        ) : page === "absences" ? (
          <PageAbsences compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} regulariteParMembre={regulariteParMembre} cardStyle={cardStyle} />
        ) : page === "prediction" ? (
          <PagePrediction compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} regulariteParMembre={regulariteParMembre} cardStyle={cardStyle} />
        ) : page === "audit" ? (
          <PageJournalAudit cardStyle={cardStyle} />
        ) : (
          <PageAssistants compte={compte} tribus={tribus} departements={departements} gems={gems} onChange={chargerDonnees} cardStyle={cardStyle} />
        )}
      </div>

      <BarreOngletsBas
        page={page}
        setPage={setPage}
        estPasteur={estPasteur}
        nonLus={nbMessagesNonLus}
        ouvrirMenuComplet={() => setMenuMobileOuvert(true)}
        setGemOuvert={setGemOuvert}
        setParentOuvert={setParentOuvert}
      />
    </div>
  );
}

/* ------------------------- Priorités pastorales ------------------------- */

/* ------------------------- Anniversaires à venir ------------------------- */

// Résumé pour les responsables de département/tribu : GEM, rapports de la semaine,
// GEM en retard (après lundi), membres, taux de présence/absence.
// Historique scopé à un périmètre (département/tribu) — vues hebdomadaire,
// mensuelle et annuelle avec commentaire intelligent, pour les responsables
// de département/tribu (équivalent réduit de l'Historique du pasteur).
function HistoriquePerimetre({ gems, membres, cardStyle }) {
  const [vue, setVue] = useState("hebdomadaire"); // hebdomadaire | mensuelle | annuelle
  const [chargement, setChargement] = useState(true);
  const [presenceParDimanche, setPresenceParDimanche] = useState([]);
  const [presenceParMois, setPresenceParMois] = useState([]);
  const [santeParMois, setSanteParMois] = useState([]);
  const [presenceParAnnee, setPresenceParAnnee] = useState([]);

  const idsMembres = membres.map(m => m.id);

  useEffect(() => { chargerHistorique(); }, [membres.length]);

  async function chargerHistorique() {
    setChargement(true);
    if (idsMembres.length === 0) { setChargement(false); return; }

    const [{ data: dimanchesTous }, { data: presencesTous }, { data: santeTous }] = await Promise.all([
      supabase.from("dimanches").select("*").order("date", { ascending: true }),
      supabase.from("presences").select("*").in("membre_id", idsMembres),
      supabase.from("sante_spirituelle").select("*").in("membre_id", idsMembres),
    ]);

    // Ne garde que les dimanches réellement pointés pour ce périmètre
    const idsDimanchesPointes = new Set((presencesTous || []).map(p => p.dimanche_id));
    const dimanchesReels = (dimanchesTous || []).filter(d => idsDimanchesPointes.has(d.id));

    // --- Vue hebdomadaire : 16 derniers dimanches réellement pointés ---
    const seizeRecents = dimanchesReels.slice(-16);
    setPresenceParDimanche(seizeRecents.map(d => {
      const pres = (presencesTous || []).filter(p => p.dimanche_id === d.id);
      const presents = pres.filter(p => p.present).length;
      return { date: d.date, taux: pres.length > 0 ? Math.round((presents / pres.length) * 100) : 0 };
    }));

    // --- Regroupe par mois et par année ---
    const parMois = {};
    const parAnnee = {};
    dimanchesReels.forEach(d => {
      const cleMois = d.date.slice(0, 7);
      const cleAnnee = d.date.slice(0, 4);
      if (!parMois[cleMois]) parMois[cleMois] = [];
      parMois[cleMois].push(d.id);
      if (!parAnnee[cleAnnee]) parAnnee[cleAnnee] = [];
      parAnnee[cleAnnee].push(d.id);
    });

    const moisTries = Object.keys(parMois).sort().slice(-12);
    setPresenceParMois(moisTries.map(mois => {
      const idsDim = parMois[mois];
      const pres = (presencesTous || []).filter(p => idsDim.includes(p.dimanche_id));
      const presents = pres.filter(p => p.present).length;
      return { mois, taux: pres.length > 0 ? Math.round((presents / pres.length) * 100) : 0 };
    }));

    setSanteParMois(moisTries.map(mois => {
      const [annee, m] = mois.split("-");
      const debut = `${mois}-01`;
      const fin = new Date(annee, m, 0).toISOString().slice(0, 10);
      const scoresMois = (santeTous || []).filter(s => s.date_maj.slice(0, 10) >= debut && s.date_maj.slice(0, 10) <= fin).map(s => moyenneSante(s)).filter(v => v !== null);
      return { mois, moyenne: scoresMois.length > 0 ? Math.round((scoresMois.reduce((a, b) => a + b, 0) / scoresMois.length) * 10) / 10 : null };
    }));

    const anneesTriees = Object.keys(parAnnee).sort();
    setPresenceParAnnee(anneesTriees.map(annee => {
      const idsDim = parAnnee[annee];
      const pres = (presencesTous || []).filter(p => idsDim.includes(p.dimanche_id));
      const presents = pres.filter(p => p.present).length;
      return { annee, taux: pres.length > 0 ? Math.round((presents / pres.length) * 100) : 0 };
    }));

    setChargement(false);
  }

  if (chargement) return <Chargement />;

  const dernierTauxHebdo = presenceParDimanche.length > 0 ? presenceParDimanche[presenceParDimanche.length - 1].taux : null;
  const precedentTauxHebdo = presenceParDimanche.length > 1 ? presenceParDimanche[presenceParDimanche.length - 2].taux : null;
  const dernierTauxMois = presenceParMois.length > 0 ? presenceParMois[presenceParMois.length - 1].taux : null;
  const precedentTauxMois = presenceParMois.length > 1 ? presenceParMois[presenceParMois.length - 2].taux : null;
  const derniereSanteMois = [...santeParMois].reverse().find(s => s.moyenne !== null)?.moyenne ?? null;
  const dernierTauxAnnee = presenceParAnnee.length > 0 ? presenceParAnnee[presenceParAnnee.length - 1].taux : null;
  const precedentTauxAnnee = presenceParAnnee.length > 1 ? presenceParAnnee[presenceParAnnee.length - 2].taux : null;

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}><IconeCroissance size={22} /> Historique</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Vue d'ensemble de ton périmètre dans le temps.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["hebdomadaire", "Hebdomadaire"], ["mensuelle", "Mensuelle"], ["annuelle", "Annuelle"]].map(([cle, label]) => (
          <button key={cle} className="btn-app" onClick={() => setVue(cle)} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === cle ? GOLD : TEAL_900, color: vue === cle ? TEAL_950 : "var(--text-secondary-2)" }}>
            {label}
          </button>
        ))}
      </div>

      {vue === "hebdomadaire" && (
        presenceParDimanche.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pas encore de dimanche pointé pour ce périmètre.</p>
        ) : (
          <>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Présence — dimanche par dimanche</p>
              <GraphiqueCourbe
                couleur="var(--green)"
                donnees={presenceParDimanche.map(d => ({
                  libelle: new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                  valeur: d.taux, texteAffiche: `${d.taux}%`,
                }))}
              />
            </div>
            <CommentaireIntelligent titre="🧠 Analyse intelligente" stats={{ tauxPresence: dernierTauxHebdo, tauxPresencePrecedent: precedentTauxHebdo }} />
          </>
        )
      )}

      {vue === "mensuelle" && (
        presenceParMois.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pas encore de mois pointé pour ce périmètre.</p>
        ) : (
          <>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Taux de présence moyen — mois par mois</p>
              <GraphiqueCourbe
                couleur="var(--green)"
                donnees={presenceParMois.map(d => {
                  const [annee, mois] = d.mois.split("-");
                  return { libelle: new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short" }), valeur: d.taux, texteAffiche: `${d.taux}%` };
                })}
              />
            </div>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>🌡️ Santé spirituelle moyenne — mois par mois</p>
              <GraphiqueCourbe
                couleur="var(--gold)"
                donnees={santeParMois.filter(s => s.moyenne !== null).map(d => {
                  const [annee, mois] = d.mois.split("-");
                  return { libelle: new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short" }), valeur: d.moyenne, texteAffiche: `${d.moyenne}/10` };
                })}
              />
            </div>
            <CommentaireIntelligent titre="🧠 Analyse intelligente du mois" stats={{ tauxPresence: dernierTauxMois, tauxPresencePrecedent: precedentTauxMois, moyenneSante: derniereSanteMois }} />
          </>
        )
      )}

      {vue === "annuelle" && (
        presenceParAnnee.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pas encore d'année pointée pour ce périmètre.</p>
        ) : (
          <>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Taux de présence moyen — année par année</p>
              <GraphiqueCourbe couleur="var(--green)" donnees={presenceParAnnee.map(d => ({ libelle: d.annee, valeur: d.taux, texteAffiche: `${d.taux}%` }))} />
            </div>
            <CommentaireIntelligent titre="🧠 Analyse intelligente de l'année" stats={{ tauxPresence: dernierTauxAnnee, tauxPresencePrecedent: precedentTauxAnnee }} />
          </>
        )
      )}
    </div>
  );
}

function ResumePerimetre({ compte, gems, membres, tribus, departements, onVoirAbsences, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [rapportsValides, setRapportsValides] = useState(0);
  const [gemsEnRetard, setGemsEnRetard] = useState([]);
  const [tauxPresence, setTauxPresence] = useState(null);
  const [absencesCount, setAbsencesCount] = useState(0);
  const [nbResponsablesGem, setNbResponsablesGem] = useState(0);
  const [afficherRetard, setAfficherRetard] = useState(false);
  const [relanceOuverte, setRelanceOuverte] = useState(false);

  useEffect(() => { chargerResume(); }, [gems.length, membres.length]);

  // Actualisation en temps réel — dès qu'un GEM valide son rapport de
  // présence (où que ce soit dans l'app), la liste se met à jour toute
  // seule, sans avoir à recharger la page.
  const idInstance = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const canal = supabase
      .channel(`resume-perimetre-${idInstance.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "validations_presence" }, () => chargerResume())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  async function chargerResume() {
    setChargement(true);
    const { data: dernierDimanche } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(1).maybeSingle();
    if (!dernierDimanche || gems.length === 0) { setChargement(false); return; }

    const idsGems = gems.map(g => g.id);
    const [{ data: validations }, { data: presencesSemaine }, { data: assignationsGem }] = await Promise.all([
      supabase.from("validations_presence").select("gem_id").eq("dimanche_id", dernierDimanche.id).eq("valide", true).in("gem_id", idsGems),
      supabase.from("presences").select("*").eq("dimanche_id", dernierDimanche.id).in("membre_id", membres.map(m => m.id)),
      supabase.from("assignations").select("gem_id, compte_id, comptes(nom, telephone)").eq("role_demande", "gem").eq("statut", "actif").in("gem_id", idsGems),
    ]);

    const idsGemsValides = new Set((validations || []).map(v => v.gem_id));
    setRapportsValides(idsGemsValides.size);
    const respParGem = {};
    (assignationsGem || []).forEach(a => { if (a.comptes) respParGem[a.gem_id] = { nom: a.comptes.nom, telephone: a.comptes.telephone }; });
    // Les responsables GEM (avec un compte de connexion actif) comptent aussi
    // comme des personnes suivies dans ce périmètre, en plus des membres.
    setNbResponsablesGem(new Set((assignationsGem || []).map(a => a.compte_id)).size);
    setGemsEnRetard(gems.filter(g => !idsGemsValides.has(g.id)).map(g => ({
      ...g,
      respNom: g.responsable_nom || respParGem[g.id]?.nom || null,
      respTel: g.responsable_telephone || respParGem[g.id]?.telephone || null,
      provenance: g.tribu_id ? `Tribu de ${(tribus || []).find(t => t.id === g.tribu_id)?.nom || "?"}` : g.departement_id ? `Département ${(departements || []).find(d => d.id === g.departement_id)?.nom || "?"}` : "",
    })));

    const slots = membres.length;
    if (presencesSemaine && presencesSemaine.length > 0) {
      const presents = presencesSemaine.filter(p => p.present).length;
      setTauxPresence(slots > 0 ? Math.round((presents / slots) * 100) : null);
      setAbsencesCount(Math.max(0, slots - presents));
    } else {
      setTauxPresence(null);
      setAbsencesCount(0);
    }

    // On ne signale les GEM "en retard" qu'à partir du mardi (le lundi est le dernier
    // jour normal pour soumettre le rapport du dimanche précédent).
    const dateDimanche = new Date(dernierDimanche.date + "T00:00:00");
    const joursEcoules = Math.floor((new Date(new Date().toDateString()) - dateDimanche) / 86400000);
    setAfficherRetard(joursEcoules >= 0); // ⚠️ TEMPORAIRE pour test — remettre >= 2 après

    setChargement(false);
  }

  if (chargement) return <Chargement />;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>GEM</p>
          <p style={{ fontSize: 24, fontWeight: 700 }}><NombreAnime valeur={gems.length} /></p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres</p>
          <p style={{ fontSize: 24, fontWeight: 700 }}><NombreAnime valeur={membres.length + nbResponsablesGem} /></p>
          {nbResponsablesGem > 0 && <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "2px 0 0" }}>dont {nbResponsablesGem} responsable{nbResponsablesGem > 1 ? "s" : ""} GEM</p>}
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Rapports (semaine)</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: rapportsValides === gems.length ? "var(--green-success)" : GOLD_LIGHT }}>
            <NombreAnime valeur={rapportsValides} /> / {gems.length}
          </p>
        </div>
        <button className="btn-app card-app" onClick={onVoirAbsences} disabled={!onVoirAbsences} style={{ ...cardStyle, textAlign: "left", cursor: onVoirAbsences ? "pointer" : "default", borderColor: absencesCount > 0 ? RED_LIGHT : cardStyle.border }}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>🚫 Absents ce dimanche</p>
          <p style={{ fontSize: 18, fontWeight: 700 }}>
            {tauxPresence !== null ? <><span style={{ color: RED_LIGHT }}>{absencesCount}</span> <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>({100 - tauxPresence}%)</span></> : "—"}
          </p>
        </button>
      </div>

      {afficherRetard && gemsEnRetard.length > 0 && (
        <div style={{ ...cardStyle, position: "relative", overflow: "hidden", paddingLeft: 18, marginBottom: 24 }}>
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, backgroundColor: "var(--red)" }} />
          <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: "var(--red)", flexShrink: 0 }} />
            GEM n'ayant pas encore soumis leur rapport ({gemsEnRetard.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {gemsEnRetard.map(g => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-base)", borderRadius: 9, padding: "9px 12px" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{g.nom}</span>
                {g.provenance && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{g.provenance}</span>}
              </div>
            ))}
          </div>
          <button
            className="btn-app btn-primaire"
            onClick={() => setRelanceOuverte(v => !v)}
            style={{ width: "100%", padding: "11px 14px", fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <IconeMessage size={13} /> Relancer les responsables par WhatsApp
          </button>

          {relanceOuverte && (
            <div className="fade-in" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                WhatsApp n'autorise pas l'envoi groupé en un clic — clique sur chacun, le message d'urgence est déjà prêt.
              </p>
              {gemsEnRetard.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-base)", borderRadius: 9, padding: "9px 12px", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{g.nom}{g.provenance ? <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}> — {g.provenance}</span> : ""}</p>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.respNom || "Sans responsable identifié"}</p>
                  </div>
                  {g.respTel ? (
                    <a
                      href={`https://wa.me/${numeroPourWhatsApp(g.respTel)}?text=${encodeURIComponent(`Bonjour ${g.respNom || ""}, le rapport de présence de "${g.nom}"${g.provenance ? ` (${g.provenance})` : ""} n'a pas encore été soumis. Merci de le faire dans les plus brefs délais — comptons sur ta diligence et ta responsabilité. 🙏\n\n${signatureMessage(compte)}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: "#25D366", borderRadius: 999, padding: "7px 12px", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
                    ><IconeMessage size={12} /> Envoyer</a>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", flexShrink: 0 }}>Pas de numéro</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnniversairesAVenir({ membres, gems, tribus, departements, cardStyle }) {
  function nomGem(gemId) {
    return gems.find(g => g.id === gemId)?.nom || "GEM inconnu";
  }

  function provenance(gemId) {
    const g = gems.find(gg => gg.id === gemId);
    if (!g) return "";
    if (g.tribu_id) return `Tribu de ${tribus?.find(t => t.id === g.tribu_id)?.nom || "?"}`;
    if (g.departement_id) return `Département ${departements?.find(d => d.id === g.departement_id)?.nom || "?"}`;
    return "";
  }

  function prochainAnniversaire(dateNaissance) {
    const aujourdHui = new Date(new Date().toDateString());
    const anniv = new Date(dateNaissance);
    anniv.setFullYear(aujourdHui.getFullYear());
    if (anniv < aujourdHui) anniv.setFullYear(aujourdHui.getFullYear() + 1);
    const diffJours = Math.round((anniv - aujourdHui) / 86400000);
    return { date: anniv, diffJours };
  }

  const anniversairesBrut = membres
    .filter(m => m.date_naissance)
    .map(m => ({ membre: m, ...prochainAnniversaire(m.date_naissance) }))
    .filter(x => x.diffJours >= 0 && x.diffJours <= 3)
    .sort((a, b) => a.diffJours - b.diffJours);

  // Un même membre peut apparaître dans plusieurs GEM à la fois — on ne le
  // garde qu'une seule fois (nom + date de naissance identiques).
  const dejaVus = new Set();
  const anniversaires = anniversairesBrut.filter(x => {
    const cle = `${x.membre.nom.trim().toLowerCase()}|${x.membre.date_naissance}`;
    if (dejaVus.has(cle)) return false;
    dejaVus.add(cle);
    return true;
  });

  if (anniversaires.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><IconeGateau size={16} /> Anniversaires à venir (3 prochains jours)</p>
      <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {anniversaires.map(({ membre, date, diffJours }) => (
          <div key={membre.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{membre.nom}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nomGem(membre.gem_id)}{provenance(membre.gem_id) ? ` — ${provenance(membre.gem_id)}` : ""}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: TEAL_950, backgroundColor: "var(--gold-light)", borderRadius: 999, padding: "6px 12px" }}>
                {diffJours === 0 ? "🎉 Aujourd'hui !" : diffJours === 1 ? "Demain" : `Dans ${diffJours} jours`} — {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </span>
              <button
                className="btn-app"
                title="Générer une affiche"
                onClick={() => genererAfficheAnniversaire({ nom: membre.nom, photo: membre.photo, nomFichier: `anniversaire-${membre.nom.replace(/\s+/g, "-")}` })}
                style={{ width: 32, height: 32, borderRadius: 999, border: "none", backgroundColor: TEAL_900, color: GOLD_LIGHT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <IconeImprimante size={13} />
              </button>
            </div>
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
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><IconeGateau size={16} /> Anniversaires des responsables (14 prochains jours)</p>
      <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {anniversaires.map(({ compte, date, diffJours }) => (
          <div key={compte.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{compte.nom}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant" : "Responsable"} · {compte.quartier || "Quartier non renseigné"}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: TEAL_950, backgroundColor: "var(--gold-light)", borderRadius: 999, padding: "6px 12px" }}>
                {diffJours === 0 ? "🎉 Aujourd'hui !" : diffJours === 1 ? "Demain" : `Dans ${diffJours} jours`} — {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </span>
              <button
                className="btn-app"
                title="Générer une affiche"
                onClick={() => genererAfficheAnniversaire({ nom: compte.nom, photo: null, nomFichier: `anniversaire-${compte.nom.replace(/\s+/g, "-")}` })}
                style={{ width: 32, height: 32, borderRadius: 999, border: "none", backgroundColor: TEAL_900, color: GOLD_LIGHT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <IconeImprimante size={13} />
              </button>
            </div>
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
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page {page} / {totalPages}</span>
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

function PrioritesPastorales({ compte, membres, gems, tribus, departements, regulariteParMembre, cardStyle }) {
  const [page, setPage] = useState(1);
  const PAR_PAGE = 10;

  function nomGem(gemId) {
    return gems.find(g => g.id === gemId)?.nom || "GEM inconnu";
  }

  function provenance(gemId) {
    const g = gems.find(gg => gg.id === gemId);
    if (!g) return "";
    if (g.tribu_id) return `Tribu de ${(tribus || []).find(t => t.id === g.tribu_id)?.nom || "?"}`;
    if (g.departement_id) return `Département ${(departements || []).find(d => d.id === g.departement_id)?.nom || "?"}`;
    return "";
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
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><IconeAlerte size={16} /> Priorités pastorales — membres à visiter ({membresAlerte.length})</p>
      {membresAlerte.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun membre en absence répétée pour l'instant — tout va bien.</p>
      ) : (
        <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {membresAffiches.map(({ membre, regularite }) => {
            const grave = regularite.absencesConsecutives >= 3;
            return (
              <div key={membre.id} style={{ ...cardStyle, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingLeft: 18 }}>
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, backgroundColor: grave ? "var(--red)" : "var(--gold-warn)" }} />
                {membre.photo ? (
                  <img src={membre.photo} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <AvatarInitiales nom={membre.nom} taille={44} />
                )}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ fontWeight: 700, marginBottom: 1 }}>{membre.nom}</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>{nomGem(membre.gem_id)}{provenance(membre.gem_id) ? ` — ${provenance(membre.gem_id)}` : ""}</p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: grave ? "var(--red)" : "var(--gold-warn)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: grave ? "var(--red)" : "var(--gold-warn)" }} />
                    {regularite.absencesConsecutives} dimanches d'absence
                  </span>
                </div>
                {membre.telephone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <a title="Appeler" href={`tel:${membre.telephone}`} style={{ fontSize: 16, color: "var(--bg-base)", textDecoration: "none", backgroundColor: "var(--gold-light)", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                      <IconeTelephone size={15} /></a>
                    <a
                      href={`https://wa.me/${numeroPourWhatsApp(membre.telephone)}?text=${encodeURIComponent(`Bonjour ${membre.nom}, tu nous manques beaucoup ces derniers temps. Est-ce que tout va bien ? Nous t'aimons et espérons te revoir bientôt au culte. 🙏

${signatureMessage(compte)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                    >
                      <IconeMessage size={15} /></a>
                  </div>
                )}
              </div>
            );
          })}
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
  const [nomRespNouveauGem, setNomRespNouveauGem] = useState("");
  const [telRespNouveauGem, setTelRespNouveauGem] = useState("+225 ");
  const [respGemEnEdition, setRespGemEnEdition] = useState(null);
  const [nomRespGemEdition, setNomRespGemEdition] = useState("");
  const [telRespGemEdition, setTelRespGemEdition] = useState("+225 ");
  const [responsablesParParent, setResponsablesParParent] = useState({}); // { parentId: { compte, assignationId } }
  const [respParentEnEdition, setRespParentEnEdition] = useState(null);
  const [nomRespParentEdition, setNomRespParentEdition] = useState("");
  const [telRespParentEdition, setTelRespParentEdition] = useState("+225 ");
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
      if (parentId && comptesMap[a.compte_id]) mapParent[parentId] = { compte: comptesMap[a.compte_id], assignationId: a.id };
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
    if (!nomNouveauGem.trim()) { toast("Le nom du GEM est obligatoire.", "erreur"); return; }
    if (!nomRespNouveauGem.trim()) { toast("Le nom du responsable est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(telRespNouveauGem)) { toast("Le numéro du responsable ne semble pas valide.", "erreur"); return; }
    const payload = {
      nom: nomNouveauGem.trim(), type, [type === "tribu" ? "tribu_id" : "departement_id"]: parentId,
      responsable_nom: nomRespNouveauGem.trim(),
      responsable_telephone: telRespNouveauGem.trim(),
    };
    const { error } = await supabase.from("gems").insert(payload);
    if (!error) { setNomNouveauGem(""); setNomRespNouveauGem(""); setTelRespNouveauGem("+225 "); setCreationPour(null); onCreerGem(); }
  }

  async function enregistrerRespGem(gemId) {
    if (!nomRespGemEdition.trim()) { toast("Le nom du responsable est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(telRespGemEdition)) { toast("Le numéro du responsable ne semble pas valide.", "erreur"); return; }
    const { error } = await supabase.from("gems").update({
      responsable_nom: nomRespGemEdition.trim(),
      responsable_telephone: telRespGemEdition.trim(),
    }).eq("id", gemId);
    setRespGemEnEdition(null);
    if (!error) { toast("✓ Responsable enregistré.", "succes"); onCreerGem(); }
    else toast("Erreur : " + error.message, "erreur");
  }

  async function enregistrerRespParent(parentId) {
    if (!nomRespParentEdition.trim()) { toast("Le nom du responsable est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(telRespParentEdition)) { toast("Le numéro du responsable ne semble pas valide.", "erreur"); return; }
    const table = type === "tribu" ? "tribus" : "departements";
    const { error } = await supabase.from(table).update({
      responsable_nom: nomRespParentEdition.trim(),
      responsable_telephone: telRespParentEdition.trim(),
    }).eq("id", parentId);
    setRespParentEnEdition(null);
    if (!error) { toast("✓ Responsable enregistré.", "succes"); onCreerGem(); }
    else toast("Erreur : " + error.message, "erreur");
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
                  {type === "tribu" ? "Patriarche/Matriarche" : "Responsable"} : {responsable.compte.nom}
                </p>
              ) : it.responsable_nom ? (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: "var(--text-secondary-2)", margin: 0 }}>
                    {type === "tribu" ? "Patriarche/Matriarche" : "Responsable"} : {it.responsable_nom}{it.responsable_telephone ? ` — ${it.responsable_telephone}` : ""}
                  </p>
                  {estPasteur && (
                    <button className="btn-app" onClick={() => { setRespParentEnEdition(it.id); setNomRespParentEdition(it.responsable_nom || ""); setTelRespParentEdition(it.responsable_telephone || "+225 "); }} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <IconeCrayon size={9} style={{verticalAlign:"-1px",marginRight:3}} />Modifier
                    </button>
                  )}
                </div>
              ) : estPasteur ? (
                respParentEnEdition === it.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10, backgroundColor: TEAL_850, padding: 8, borderRadius: 8 }}>
                    <input value={nomRespParentEdition} onChange={e => setNomRespParentEdition(e.target.value)} placeholder="Nom du responsable *" style={{ padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                    <input value={telRespParentEdition} onChange={e => setTelRespParentEdition(e.target.value)} placeholder="Téléphone *" style={{ padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn-app" onClick={() => enregistrerRespParent(it.id)} style={{ padding: "5px 10px", borderRadius: 6, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>OK</button>
                      <button className="btn-app" onClick={() => setRespParentEnEdition(null)} style={{ padding: "5px 10px", borderRadius: 6, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-app" onClick={() => { setRespParentEnEdition(it.id); setNomRespParentEdition(""); setTelRespParentEdition("+225 "); }} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 10, display: "block" }}>
                    + Ajouter un responsable
                  </button>
                )
              ) : (
                <p style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 10 }}>Aucun responsable désigné</p>
              )}
              {gemsDuParent.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>Aucun GEM pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {gemsDuParent.map(g => {
                    const respGem = responsablesParGem[g.id];
                    const nomAAfficher = respGem ? respGem.nom : g.responsable_nom;
                    return (
                      <div key={g.id} style={{ display: "flex", flexDirection: "column" }}>
                        <button onClick={() => onOpenGem(g)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: respGemEnEdition === g.id ? "8px 8px 0 0" : 8, backgroundColor: TEAL_700, color: GOLD_LIGHT, border: "none", fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}>
                          <span>{g.nom}</span>
                          <span style={{ fontSize: 11, fontWeight: 400, color: nomAAfficher ? "var(--text-secondary-2)" : "var(--text-secondary)" }}>
                            {nomAAfficher || "Sans responsable"}
                          </span>
                        </button>
                        {estPasteur && !respGem && (
                          respGemEnEdition === g.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, backgroundColor: TEAL_850, padding: 8, borderRadius: "0 0 8px 8px" }}>
                              <input value={nomRespGemEdition} onChange={e => setNomRespGemEdition(e.target.value)} placeholder="Nom du responsable *" style={{ padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                              <input value={telRespGemEdition} onChange={e => setTelRespGemEdition(e.target.value)} placeholder="Téléphone *" style={{ padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="btn-app" onClick={() => enregistrerRespGem(g.id)} style={{ padding: "5px 10px", borderRadius: 6, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>OK</button>
                                <button className="btn-app" onClick={() => setRespGemEnEdition(null)} style={{ padding: "5px 10px", borderRadius: 6, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <button className="btn-app" onClick={() => { setRespGemEnEdition(g.id); setNomRespGemEdition(g.responsable_nom || ""); setTelRespGemEdition(g.responsable_telephone || "+225 "); }} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "3px 10px" }}>
                              <IconeCrayon size={9} style={{verticalAlign:"-1px",marginRight:3}} />{g.responsable_nom ? "Modifier le responsable" : "+ Ajouter un responsable"}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {estPasteur && (
                creationPour === it.id ? (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <input value={nomNouveauGem} onChange={e => setNomNouveauGem(e.target.value)} placeholder="Nom du GEM" style={{ padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                    <input value={nomRespNouveauGem} onChange={e => setNomRespNouveauGem(e.target.value)} placeholder="Nom du responsable GEM *" style={{ padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                    <input value={telRespNouveauGem} onChange={e => setTelRespNouveauGem(e.target.value)} placeholder="Téléphone du responsable *" style={{ padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
 className="btn-app"
 onClick={() => creerGem(it.id)} style={{ padding: "6px 10px", borderRadius: 6, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontSize: 12, fontWeight: 700 }}>OK</button>
                      <button
 className="btn-app"
 onClick={() => { setCreationPour(null); setNomNouveauGem(""); setNomRespNouveauGem(""); setTelRespNouveauGem(""); }} style={{ padding: "6px 10px", borderRadius: 6, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontSize: 12, fontWeight: 600 }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button
 className="btn-app"
 onClick={() => setCreationPour(it.id)} style={{ marginTop: 10, fontSize: 12, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>+ Créer un GEM ici</button>
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
  const [respEnEdition, setRespEnEdition] = useState(null); // id du GEM dont on édite le responsable
  const [nomRespEdite, setNomRespEdite] = useState("");
  const [telRespEdite, setTelRespEdite] = useState("+225 ");
  const [membreEnEdition, setMembreEnEdition] = useState(null); // membre en cours de modification
  const [infosMembreEditees, setInfosMembreEditees] = useState({ nom: "", telephone: "", quartier: "" });
  const [gemAConfirmerSuppression, setGemAConfirmerSuppression] = useState(null);
  const [suppressionGemEnCours, setSuppressionGemEnCours] = useState(false);
  const [fusionOuverte, setFusionOuverte] = useState(false);
  const [gemSource, setGemSource] = useState("");
  const [gemDestination, setGemDestination] = useState("");
  const [fusionEnCours, setFusionEnCours] = useState(false);
  const [confirmerFusion, setConfirmerFusion] = useState(false);

  useEffect(() => { setPage(1); }, [recherche]);

  const gemsDuParent = gems.filter(g => g.type === type && (type === "tribu" ? g.tribu_id === parent.id : g.departement_id === parent.id));
  const idsGems = gemsDuParent.map(g => g.id);
  const membresDuParent = membres.filter(m => idsGems.includes(m.gem_id));

  // Normalise un nom pour la comparaison : sans accents, sans casse, et avec
  // les mots triés — "Fleur Yao" et "Yao Fleur" deviennent alors identiques,
  // tout comme "José" et "Jose".
  function normaliserNomPourComparaison(nom) {
    return (nom || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // retire les accents
      .toLowerCase().trim()
      .split(/\s+/).filter(Boolean).sort().join(" ");
  }

  // Détecte les paires de GEM qui partagent plusieurs membres (même personne,
  // même en cas d'accents ou d'ordre prénom/nom différents) — signe probable
  // d'un doublon créé sous deux noms différents. Un seul nom en commun peut
  // être une coïncidence (prénom courant), donc on ne signale qu'à partir de
  // 2 noms partagés.
  const doublonsProbables = [];
  for (let i = 0; i < gemsDuParent.length; i++) {
    for (let j = i + 1; j < gemsDuParent.length; j++) {
      const gemA = gemsDuParent[i], gemB = gemsDuParent[j];
      const membresA = membres.filter(m => m.gem_id === gemA.id);
      const membresB = membres.filter(m => m.gem_id === gemB.id);
      const nomsA = new Map(membresA.map(m => [normaliserNomPourComparaison(m.nom), m.nom]));
      const communs = membresB
        .map(m => ({ cle: normaliserNomPourComparaison(m.nom), nom: m.nom }))
        .filter(m => nomsA.has(m.cle))
        .map(m => m.nom);
      if (communs.length >= 2) {
        doublonsProbables.push({ gemA, gemB, nomsCommuns: communs });
      }
    }
  }

  async function renommerGem(gemId) {
    if (!nomEdite.trim()) { toast("Le nom du GEM ne peut pas être vide.", "erreur"); return; }
    const { error } = await supabase.from("gems").update({ nom: nomEdite.trim() }).eq("id", gemId);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast("✓ GEM renommé avec succès.", "succes");
    setGemEnEdition(null);
    if (onChange) onChange();
  }

  async function enregistrerResponsableGemListe(gemId) {
    if (!nomRespEdite.trim()) { toast("Le nom du responsable est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(telRespEdite)) { toast("Le numéro du responsable ne semble pas valide.", "erreur"); return; }
    const { error } = await supabase.from("gems").update({
      responsable_nom: nomRespEdite.trim(),
      responsable_telephone: telRespEdite.trim(),
    }).eq("id", gemId);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast("✓ Responsable mis à jour.", "succes");
    setRespEnEdition(null);
    if (onChange) onChange();
  }

  async function enregistrerInfosMembre(membreId) {
    if (!infosMembreEditees.nom.trim()) { toast("Le nom ne peut pas être vide.", "erreur"); return; }
    const { error } = await supabase.from("membres").update({
      nom: infosMembreEditees.nom.trim(),
      telephone: infosMembreEditees.telephone.trim() || null,
      quartier: infosMembreEditees.quartier.trim() || null,
    }).eq("id", membreId);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast("✓ Informations du membre mises à jour.", "succes");
    setMembreEnEdition(null);
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
    journaliser(compte, "suppression_gem", gem.nom, `${type === "tribu" ? "Tribu" : "Département"} : ${parent.nom}`);
    if (onChange) onChange();
  }

  async function fusionnerGems() {
    if (!gemSource || !gemDestination || gemSource === gemDestination) return;
    setFusionEnCours(true);
    const gemA = gemsDuParent.find(g => g.id === gemSource); // absorbé
    const gemB = gemsDuParent.find(g => g.id === gemDestination); // conservé

    // Récupère les membres des deux GEM pour éviter les doublons de nom —
    // comparaison insensible aux accents et à l'ordre prénom/nom.
    const { data: membresSource } = await supabase.from("membres").select("*").eq("gem_id", gemSource);
    const { data: membresDest } = await supabase.from("membres").select("nom").eq("gem_id", gemDestination);
    const nomsDejaLa = new Set((membresDest || []).map(m => normaliserNomPourComparaison(m.nom)));

    const aDeplacer = (membresSource || []).filter(m => !nomsDejaLa.has(normaliserNomPourComparaison(m.nom)));
    const aSupprimer = (membresSource || []).filter(m => nomsDejaLa.has(normaliserNomPourComparaison(m.nom)));

    if (aDeplacer.length > 0) {
      const { error: err1 } = await supabase.from("membres").update({ gem_id: gemDestination }).in("id", aDeplacer.map(m => m.id));
      if (err1) { toast("Erreur lors du déplacement des membres : " + err1.message, "erreur"); setFusionEnCours(false); return; }
    }
    // Les membres en double (même nom déjà présent dans le GEM destination) sont retirés du GEM source
    if (aSupprimer.length > 0) {
      await supabase.from("membres").delete().in("id", aSupprimer.map(m => m.id));
    }
    // Nettoie puis supprime le GEM source, désormais vide
    await supabase.from("assignations").delete().eq("gem_id", gemSource);
    // On ne supprime l'historique de présence QUE pour les membres réellement
    // écartés (doublons) — les membres déplacés gardent tout leur historique.
    if (aSupprimer.length > 0) {
      await supabase.from("presences").delete().in("membre_id", aSupprimer.map(m => m.id));
    }

    // Récupère les rapports hebdomadaires validés (présence, activités, santé)
    // des deux GEM, pour transférer ceux du GEM absorbé vers le GEM conservé —
    // sauf s'il y a déjà un rapport pour la même semaine (on garde alors celui
    // du GEM conservé, et celui du GEM absorbé est perdu pour cette semaine-là).
    async function transfererRapports(table) {
      const [{ data: rapportsSource }, { data: rapportsDest }] = await Promise.all([
        supabase.from(table).select("*").eq("gem_id", gemSource),
        supabase.from(table).select("dimanche_id").eq("gem_id", gemDestination),
      ]);
      const semainesDejaLa = new Set((rapportsDest || []).map(r => r.dimanche_id));
      const aTransferer = (rapportsSource || []).filter(r => !semainesDejaLa.has(r.dimanche_id));
      const aAbandonner = (rapportsSource || []).filter(r => semainesDejaLa.has(r.dimanche_id));
      if (aTransferer.length > 0) {
        await supabase.from(table).update({ gem_id: gemDestination }).in("id", aTransferer.map(r => r.id));
      }
      if (aAbandonner.length > 0) {
        await supabase.from(table).delete().in("id", aAbandonner.map(r => r.id));
      }
      return { transferes: aTransferer.length, perdus: aAbandonner.length };
    }
    const resPresence = await transfererRapports("validations_presence");
    const resActivites = await transfererRapports("activites_semaine");
    const resSante = await transfererRapports("validations_sante");
    const totalPerdus = resPresence.perdus + resActivites.perdus + resSante.perdus;
    const { error: err2 } = await supabase.from("gems").delete().eq("id", gemSource);

    setFusionEnCours(false);
    setConfirmerFusion(false);
    setFusionOuverte(false);
    setGemSource(""); setGemDestination("");
    if (err2) { toast("Erreur lors de la suppression du GEM fusionné : " + err2.message, "erreur"); return; }
    toast(`✓ "${gemA?.nom}" a été fusionné dans "${gemB?.nom}" (${aDeplacer.length} membre(s) déplacé(s)${aSupprimer.length > 0 ? `, ${aSupprimer.length} doublon(s) ignoré(s)` : ""}${totalPerdus > 0 ? ` — ⚠️ ${totalPerdus} rapport(s) hebdomadaire(s) perdu(s) car la semaine existait déjà des deux côtés` : ""}).`, "succes");
    journaliser(compte, "fusion_gem", `${gemA?.nom} → ${gemB?.nom}`, `${aDeplacer.length} membre(s) déplacé(s)`);
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


  async function envoyerDemandeSuppression(motif) {
    const membre = membreAConfirmer;
    setMembreAConfirmer(null);
    setSuppressionEnCours(membre.id);

    if (estPasteur) {
      // Le pasteur et ses assistants suppriment directement (après confirmation),
      // sans passer par la file d'attente de validation.
      const { error } = await supabase.from("membres").delete().eq("id", membre.id);
      setSuppressionEnCours(null);
      if (error) { toast("Suppression impossible : " + error.message, "erreur"); return; }
      toast(`${membre.nom} a été supprimé.`, "succes");
      journaliser(compte, "suppression_membre", membre.nom);
      if (onChange) onChange();
      return;
    }

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
 onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Retour</button>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{parent.nom}</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{membresDuParent.length} membre{membresDuParent.length > 1 ? "s" : ""} au total, répartis sur {gemsDuParent.length} GEM</p>

      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><IconeClipboard size={15} /> GEM de ce {type === "tribu" ? "tribu" : "département"} ({gemsDuParent.length})</p>

      {estPasteur && doublonsProbables.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 14, border: `1px solid ${RED_LIGHT}` }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: RED_LIGHT, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <IconeAlerte size={15} /> {doublonsProbables.length} doublon{doublonsProbables.length > 1 ? "s" : ""} probable{doublonsProbables.length > 1 ? "s" : ""} détecté{doublonsProbables.length > 1 ? "s" : ""}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {doublonsProbables.map((d, i) => (
              <div key={i} style={{ backgroundColor: TEAL_950, borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>"{d.gemA.nom}" et "{d.gemB.nom}"</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                  {d.nomsCommuns.length} membre{d.nomsCommuns.length > 1 ? "s" : ""} en commun : {d.nomsCommuns.join(", ")}
                </p>
                <button
                  className="btn-app"
                  onClick={() => { setFusionOuverte(true); setGemSource(d.gemA.id); setGemDestination(d.gemB.id); }}
                  style={{ padding: "6px 12px", borderRadius: 7, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeFusion size={13}/> Préparer la fusion de ces deux GEM</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {estPasteur && gemsDuParent.length >= 2 && (
        <button
          className="btn-app"
          onClick={() => setFusionOuverte(v => !v)}
          style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 9, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${GOLD}`, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeFusion size={14}/> Fusionner deux GEM en doublon</span>
        </button>
      )}

      {fusionOuverte && (
        <div style={{ ...cardStyle, marginBottom: 20, border: `1px solid ${GOLD}` }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Fusionner deux GEM</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
            Utile quand un même GEM a été créé deux fois sous des noms différents (ex : un responsable a nommé son groupe autrement que dans le fichier importé). Les membres du GEM "absorbé" rejoignent le GEM "conservé" — les doublons de nom sont ignorés automatiquement. Le GEM absorbé est ensuite supprimé.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>GEM à absorber (sera supprimé)</label>
              <select value={gemSource} onChange={e => setGemSource(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
                <option value="">— Choisir —</option>
                {gemsDuParent.map(g => <option key={g.id} value={g.id}>{g.nom} ({membres.filter(m => m.gem_id === g.id).length} membres)</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>GEM à conserver (reçoit les membres)</label>
              <select value={gemDestination} onChange={e => setGemDestination(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
                <option value="">— Choisir —</option>
                {gemsDuParent.filter(g => g.id !== gemSource).map(g => <option key={g.id} value={g.id}>{g.nom} ({membres.filter(m => m.gem_id === g.id).length} membres)</option>)}
              </select>
            </div>
            <button
              className="btn-app"
              disabled={!gemSource || !gemDestination}
              onClick={() => setConfirmerFusion(true)}
              style={{ padding: "10px 0", borderRadius: 9, backgroundColor: gemSource && gemDestination ? RED_LIGHT : TEAL_700, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: gemSource && gemDestination ? "pointer" : "not-allowed" }}
            >
              Fusionner
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {gemsDuParent.length === 0 ? (
          <EtatVide illustration="vase" titre="Aucun GEM créé pour l'instant" />
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
                    <button className="btn-app" onClick={() => renommerGem(g.id)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Enregistrer</button>
                    <button className="btn-app" onClick={() => setGemEnEdition(null)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 12 }}>Annuler</button>
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
                      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
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
                          ✏️ Nom du GEM
                        </button>
                        <button
                          className="btn-app"
                          onClick={() => setGemAConfirmerSuppression(g)}
                          style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: RED_LIGHT, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                        >
                          <span style={{display:"inline-flex",alignItems:"center",gap:5}}><IconePoubelle size={13}/> Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {estPasteur && !enEdition && (
                  respEnEdition === g.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, borderTop: `1px solid ${TEAL_800}`, paddingTop: 10 }}>
                      <input value={nomRespEdite} onChange={e => setNomRespEdite(e.target.value)} placeholder="Nom du responsable *" style={{ padding: 7, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                      <input value={telRespEdite} onChange={e => setTelRespEdite(e.target.value)} placeholder="Téléphone *" style={{ padding: 7, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn-app" onClick={() => enregistrerResponsableGemListe(g.id)} style={{ padding: "6px 12px", borderRadius: 7, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Enregistrer</button>
                        <button className="btn-app" onClick={() => setRespEnEdition(null)} style={{ padding: "6px 12px", borderRadius: 7, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-app"
                      onClick={() => { setRespEnEdition(g.id); setNomRespEdite(g.responsable_nom || ""); setTelRespEdite(g.responsable_telephone || "+225 "); }}
                      style={{ marginTop: 8, background: "none", border: "none", color: GOLD_LIGHT, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <IconeCrayon size={11} /> {g.responsable_nom || nomResponsable ? "Modifier le responsable" : "Indiquer un responsable"}
                    </button>
                  )
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
        <EtatVide icone={IconeRecherche} titre="Aucun membre trouvé" />
      ) : (
        <>
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {membresAffiches.map(m => {
            const regularite = regulariteParMembre?.[m.id];
            const moyenne = moyenneSante(santeParMembre[m.id]);
            const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
            const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, comment vas-tu ? 🙏

${signatureMessage(compte)}`);
            return (
              <div key={m.id} className="card-app" style={cardStyle}>
                {membreEnEdition === m.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input value={infosMembreEditees.nom} onChange={e => setInfosMembreEditees(v => ({ ...v, nom: e.target.value }))} placeholder="Nom" style={{ padding: 8, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 13 }} />
                    <input value={infosMembreEditees.telephone} onChange={e => setInfosMembreEditees(v => ({ ...v, telephone: e.target.value }))} placeholder="Téléphone" style={{ padding: 8, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 13 }} />
                    <input value={infosMembreEditees.quartier} onChange={e => setInfosMembreEditees(v => ({ ...v, quartier: e.target.value }))} placeholder="Quartier" style={{ padding: 8, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 13 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-app" onClick={() => enregistrerInfosMembre(m.id)} style={{ padding: "7px 14px", borderRadius: 7, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Enregistrer</button>
                      <button className="btn-app" onClick={() => setMembreEnEdition(null)} style={{ padding: "7px 14px", borderRadius: 7, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Annuler</button>
                    </div>
                  </div>
                ) : (
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
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{nomGem(m.gem_id)} · {m.telephone}</p>
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
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: regularite.absencesConsecutives >= 3 ? "var(--red)" : "var(--gold-warn)" }}>
                            <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: regularite.absencesConsecutives >= 3 ? "var(--red)" : "var(--gold-warn)" }} />
                            {regularite.absencesConsecutives} absences
                          </span>
                        )}
                        {regularite?.presencesConsecutives >= 4 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "2px 8px" }}>
                            ⭐ Régulier ({regularite.presencesConsecutives})
                          </span>
                        )}
                        {!regularite && (
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", backgroundColor: TEAL_900, borderRadius: 999, padding: "2px 8px" }}>
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
                          <IconeTelephone size={15} /></a>
                        <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" className="btn-app" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                          <IconeMessage size={15} /></a>
                      </>
                    )}
                    <button
                      title="Modifier"
                      className="btn-app"
                      onClick={() => { setMembreEnEdition(m.id); setInfosMembreEditees({ nom: m.nom, telephone: m.telephone || "", quartier: m.quartier || "" }); }}
                      style={{ fontSize: 15, color: TEAL_950, backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0 }}
                    >
                      <IconeCrayon size={13} />
                    </button>
                    <button
                      title="Supprimer"
                      className="btn-app"
                      onClick={() => setMembreAConfirmer(m)}
                      disabled={suppressionEnCours === m.id}
                      style={{ fontSize: 15, color: "#fff", backgroundColor: RED_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0 }}
                    >
                      {suppressionEnCours === m.id ? "…" : <IconePoubelle size={13} />}
                    </button>
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
        <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </>
      )}

      {membreAConfirmer && (
        estPasteur ? (
          <BoiteConfirmation
            titre="Supprimer ce membre ?"
            message={`Es-tu sûr de vouloir supprimer définitivement "${membreAConfirmer.nom}" ? Cette action est irréversible (présence, santé spirituelle et visites seront aussi supprimées).`}
            texteConfirmer={suppressionEnCours ? "…" : "Supprimer définitivement"}
            dangereux
            onConfirmer={() => envoyerDemandeSuppression(null)}
            onAnnuler={() => setMembreAConfirmer(null)}
          />
        ) : (
          <BoiteDemandeSuppression
            nomMembre={membreAConfirmer.nom}
            onEnvoyer={envoyerDemandeSuppression}
            onAnnuler={() => setMembreAConfirmer(null)}
          />
        )
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

      {confirmerFusion && (
        <BoiteConfirmation
          titre="Confirmer la fusion ?"
          message={`Tous les membres de "${gemsDuParent.find(g => g.id === gemSource)?.nom}" vont rejoindre "${gemsDuParent.find(g => g.id === gemDestination)?.nom}". Le GEM absorbé sera ensuite supprimé définitivement. Cette action est irréversible.`}
          texteConfirmer={fusionEnCours ? "…" : "Fusionner définitivement"}
          dangereux
          onConfirmer={fusionnerGems}
          onAnnuler={() => setConfirmerFusion(false)}
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

// Calcule le GEM du mois en cours pour toute l'église — utilisé sur tous les tableaux
// de bord (pasteur, assistants, responsables GEM, département, tribu).
async function calculerGemDuMoisGlobal(gems, membres, tribus, departements) {
  const moisActuel = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: dimanchesTous } = await supabase.from("dimanches").select("*");
  const dimanchesDuMois = (dimanchesTous || []).filter(d => d.date.slice(0, 7) === moisActuel);
  if (dimanchesDuMois.length === 0 || gems.length === 0) return [];
  const idsDimanches = dimanchesDuMois.map(d => d.id);

  const [{ data: presences }, { data: activites }, { data: validationsPresence }, { data: assignationsGem }] = await Promise.all([
    supabase.from("presences").select("*").in("dimanche_id", idsDimanches),
    supabase.from("activites_semaine").select("*").in("dimanche_id", idsDimanches).eq("valide", true),
    supabase.from("validations_presence").select("*").in("dimanche_id", idsDimanches).eq("valide", true),
    supabase.from("assignations").select("gem_id, compte_id").eq("role_demande", "gem").eq("statut", "actif"),
  ]);

  const idsComptesResp = [...new Set((assignationsGem || []).map(a => a.compte_id))];
  let responsablesParGem = {};
  if (idsComptesResp.length > 0) {
    const { data: comptesResp } = await supabase.from("comptes").select("id, nom").in("id", idsComptesResp);
    (assignationsGem || []).forEach(a => {
      const c = (comptesResp || []).find(cc => cc.id === a.compte_id);
      if (a.gem_id && c) responsablesParGem[a.gem_id] = c.nom;
    });
  }

  const brut = gems.map(g => {
    const membresGem = membres.filter(m => m.gem_id === g.id);
    if (membresGem.length === 0) return null;
    const idsMembres = membresGem.map(m => m.id);

    const slots = dimanchesDuMois.length * membresGem.length;
    const presents = (presences || []).filter(p => idsMembres.includes(p.membre_id) && p.present).length;
    const tauxPresence = slots > 0 ? (presents / slots) * 100 : null;

    const activitesGem = (activites || []).filter(a => a.gem_id === g.id);
    const rapportsPresenceValides = (validationsPresence || []).filter(v => v.gem_id === g.id).length;
    const tauxRapportPresence = dimanchesDuMois.length > 0 ? (rapportsPresenceValides / dimanchesDuMois.length) * 100 : null;
    const tauxRapportActivite = dimanchesDuMois.length > 0 ? (activitesGem.length / dimanchesDuMois.length) * 100 : null;
    const composantesRapport = [tauxRapportPresence, tauxRapportActivite].filter(v => v !== null);
    const tauxRapport = composantesRapport.length > 0 ? composantesRapport.reduce((a, b) => a + b, 0) / composantesRapport.length : null;

    const nombreActivites = activitesGem.reduce((total, a) => {
      let n = 0;
      n += (a.visites_membres || []).length;
      n += (a.appels_membres || []).length;
      if (a.jeune && a.jeune.trim()) n += 1;
      if (a.agape && a.agape.trim()) n += 1;
      if (a.evangelisation && a.evangelisation.trim()) n += 1;
      return total + n;
    }, 0);

    const rattachement = g.tribu_id ? `Tribu de ${tribus.find(t => t.id === g.tribu_id)?.nom || "?"}` : `Département ${departements.find(d => d.id === g.departement_id)?.nom || "?"}`;
    const nomResponsable = responsablesParGem?.[g.id] || null;

    return { nom: g.nom, gemId: g.id, rattachement, nomResponsable, tauxPresence, tauxRapport, nombreActivites };
  }).filter(Boolean);

  if (brut.length === 0) return [];
  const maxActivites = Math.max(1, ...brut.map(g => g.nombreActivites));

  const resultats = brut.map(g => {
    const scoreActivitesNormalise = (g.nombreActivites / maxActivites) * 100;
    const composantes = [g.tauxPresence, g.tauxRapport, scoreActivitesNormalise].filter(v => v !== null);
    const score = composantes.length > 0 ? composantes.reduce((a, b) => a + b, 0) / composantes.length : 0;
    return {
      nom: g.nom, gemId: g.gemId, rattachement: g.rattachement, nomResponsable: g.nomResponsable,
      valeur: Math.round(score),
      tauxPresence: g.tauxPresence !== null ? Math.round(g.tauxPresence) : null,
      tauxRapport: g.tauxRapport !== null ? Math.round(g.tauxRapport) : null,
      nombreActivites: g.nombreActivites,
    };
  });
  resultats.sort((a, b) => b.valeur - a.valeur);
  return resultats.slice(0, 3);
}

// Calcule la Tribu du Mois et le Département du Mois pour toute l'église —
// critères : taux de rapport rempli (présence + santé + activités), taux de
// présence au culte, suivi/intégration des nouveaux, activités effectuées.
async function calculerTribuDeptDuMoisGlobal(gems, membres, tribus, departements) {
  const moisActuel = new Date().toISOString().slice(0, 7);
  const debutMois = `${moisActuel}-01`;
  const finMois = `${moisActuel}-31`;
  const { data: dimanchesTous } = await supabase.from("dimanches").select("*");
  const dimanchesDuMois = (dimanchesTous || []).filter(d => d.date.slice(0, 7) === moisActuel);
  if (dimanchesDuMois.length === 0) return { tribu: null, departement: null };
  const idsDimanches = dimanchesDuMois.map(d => d.id);

  const [{ data: presences }, { data: activites }, { data: validationsPresence }, { data: sante }] = await Promise.all([
    supabase.from("presences").select("*").in("dimanche_id", idsDimanches),
    supabase.from("activites_semaine").select("*").in("dimanche_id", idsDimanches).eq("valide", true),
    supabase.from("validations_presence").select("*").in("dimanche_id", idsDimanches).eq("valide", true),
    supabase.from("sante_spirituelle").select("*").gte("date_maj", debutMois).lte("date_maj", finMois + "T23:59:59"),
  ]);

  function calculerPour(type, items) {
    const brut = items.map(item => {
      const gemsItem = gems.filter(g => type === "tribu" ? g.tribu_id === item.id : g.departement_id === item.id);
      const idsGems = gemsItem.map(g => g.id);
      const membresItem = membres.filter(m => idsGems.includes(m.gem_id));
      if (membresItem.length === 0) return null;
      const idsMembres = membresItem.map(m => m.id);

      const slots = dimanchesDuMois.length * membresItem.length;
      const presents = (presences || []).filter(p => idsMembres.includes(p.membre_id) && p.present).length;
      const tauxPresence = slots > 0 ? (presents / slots) * 100 : null;

      const rapportsPresenceValides = (validationsPresence || []).filter(v => idsGems.includes(v.gem_id)).length;
      const rapportsActiviteValides = (activites || []).filter(a => idsGems.includes(a.gem_id)).length;
      const membresAvecSante = new Set((sante || []).filter(s => idsMembres.includes(s.membre_id)).map(s => s.membre_id)).size;
      const tauxRapportPresence = dimanchesDuMois.length > 0 ? (rapportsPresenceValides / (dimanchesDuMois.length * idsGems.length || 1)) * 100 : null;
      const tauxRapportActivite = dimanchesDuMois.length > 0 ? (rapportsActiviteValides / (dimanchesDuMois.length * idsGems.length || 1)) * 100 : null;
      const tauxSante = membresItem.length > 0 ? (membresAvecSante / membresItem.length) * 100 : null;
      const composantesRapport = [tauxRapportPresence, tauxRapportActivite, tauxSante].filter(v => v !== null);
      const tauxRapport = composantesRapport.length > 0 ? composantesRapport.reduce((a, b) => a + b, 0) / composantesRapport.length : null;

      const nouveauxItem = membresItem.filter(m => m.nouveau_converti);
      const nouveauxProgresses = nouveauxItem.filter(m => (m.etape_conversion || "accueil") !== "accueil").length;
      const tauxSuiviNouveaux = nouveauxItem.length > 0 ? (nouveauxProgresses / nouveauxItem.length) * 100 : null;

      const activitesItem = (activites || []).filter(a => idsGems.includes(a.gem_id));
      const nombreActivites = activitesItem.reduce((total, a) => {
        let n = 0;
        n += (a.visites_membres || []).length;
        n += (a.appels_membres || []).length;
        if (a.jeune && a.jeune.trim()) n += 1;
        if (a.agape && a.agape.trim()) n += 1;
        if (a.evangelisation && a.evangelisation.trim()) n += 1;
        return total + n;
      }, 0);

      return { nom: item.nom, id: item.id, tauxPresence, tauxRapport, tauxSuiviNouveaux, nombreActivites, nbGems: idsGems.length };
    }).filter(Boolean);

    if (brut.length === 0) return [];
    const maxActivites = Math.max(1, ...brut.map(x => x.nombreActivites));
    const resultats = brut.map(x => {
      const scoreActivitesNorm = (x.nombreActivites / maxActivites) * 100;
      const composantes = [x.tauxPresence, x.tauxRapport, x.tauxSuiviNouveaux, scoreActivitesNorm].filter(v => v !== null);
      const score = composantes.length > 0 ? composantes.reduce((a, b) => a + b, 0) / composantes.length : 0;
      return {
        nom: x.nom, id: x.id, valeur: Math.round(score), nbGems: x.nbGems,
        tauxPresence: x.tauxPresence !== null ? Math.round(x.tauxPresence) : null,
        tauxRapport: x.tauxRapport !== null ? Math.round(x.tauxRapport) : null,
        tauxSuiviNouveaux: x.tauxSuiviNouveaux !== null ? Math.round(x.tauxSuiviNouveaux) : null,
        nombreActivites: x.nombreActivites,
      };
    });
    resultats.sort((a, b) => b.valeur - a.valeur);
    return resultats.slice(0, 3);
  }

  return {
    tribu: calculerPour("tribu", tribus),
    departement: calculerPour("departement", departements),
  };
}

// Garantit que le numéro utilisé pour WhatsApp comporte bien l'indicatif +225 (Côte d'Ivoire),
// même si le numéro a été enregistré sans, pour que le lien wa.me fonctionne correctement.
// Génère une image (affiche) téléchargeable à partir d'un titre, d'un sous-titre
// et d'un corps de texte — utilisée pour exporter un événement du calendrier ou
// un message du pasteur en image partageable (WhatsApp, Facebook...).
// Génère une affiche d'anniversaire riche — photo (ou initiales), compliments
// avec puces colorées, et bénédiction — inspirée du modèle officiel Vases d'Honneur.
const COMPLIMENTS_ANNIVERSAIRE = [
  { texte: "Ton engagement pour Dieu inspire toute une génération.", couleur: "#C1585C" },
  { texte: "Ta constance dans les petites comme dans les grandes choses est admirable.", couleur: "#D6A54C" },
  { texte: "Ton cœur donné, ton temps offert, ton énergie pour l'œuvre de Dieu.", couleur: "#3F9C93" },
  { texte: "Toujours présent(e), toujours disponible, toujours fiable.", couleur: "#8FCBA8" },
];

function genererAfficheAnniversaire({ nom, photo, nomFichier }) {
  const largeur = 1080, hauteur = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = largeur; canvas.height = hauteur;
  const ctx = canvas.getContext("2d");

  function dessinerTexteMultiligne(texte, x, y, largeurMax, interligne) {
    const mots = texte.split(" ");
    let ligne = "", py = y;
    mots.forEach((mot, i) => {
      const test = ligne + mot + " ";
      if (ctx.measureText(test).width > largeurMax && i > 0) {
        ctx.fillText(ligne, x, py);
        ligne = mot + " ";
        py += interligne;
      } else ligne = test;
    });
    ctx.fillText(ligne, x, py);
    return py + interligne;
  }

  function finaliser() {
    // Fond chaleureux (dégradé bordeaux/or, distinct du teal habituel — pour
    // marquer une occasion festive)
    const degrade = ctx.createLinearGradient(0, 0, largeur, hauteur);
    degrade.addColorStop(0, "#3A1218");
    degrade.addColorStop(1, "#1E0C10");
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, largeur, hauteur);

    ctx.fillStyle = "#D6A54C";
    ctx.fillRect(0, 0, largeur, 14);
    ctx.fillRect(0, hauteur - 14, largeur, 14);

    ctx.textAlign = "center";
    ctx.fillStyle = "#EFCB77";
    ctx.font = "bold 30px Arial";
    ctx.fillText("ASSEMBLÉE RENAISSANCE", largeur / 2, 100);
    ctx.font = "22px Arial";
    ctx.fillStyle = "#F6F1E4";
    ctx.fillText("Bouaflé", largeur / 2, 132);

    ctx.font = "bold 46px Georgia";
    ctx.fillStyle = "#F6F1E4";
    ctx.fillText("Joyeux Anniversaire", largeur / 2, 220);

    // Photo (cercle) ou initiales
    const cx = largeur / 2, cy = 350, rayon = 130;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
    ctx.closePath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#D6A54C";
    ctx.stroke();
    ctx.clip();
    if (photo) {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.max((rayon * 2) / img.width, (rayon * 2) / img.height);
        const w = img.width * ratio, h = img.height * ratio;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        ctx.restore();
        suite();
      };
      img.src = photo;
      return;
    } else {
      ctx.fillStyle = "#4E1F26";
      ctx.fillRect(cx - rayon, cy - rayon, rayon * 2, rayon * 2);
      ctx.fillStyle = "#EFCB77";
      ctx.font = "bold 90px Georgia";
      ctx.textBaseline = "middle";
      const initiales = nom.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
      ctx.fillText(initiales, cx, cy + 8);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }
    suite();

    function suite() {
      ctx.font = "bold 44px Georgia";
      ctx.fillStyle = "#EFCB77";
      ctx.fillText(nom, largeur / 2, 540);

      let y = 610;
      ctx.textAlign = "left";
      ctx.font = "24px Arial";
      COMPLIMENTS_ANNIVERSAIRE.forEach(c => {
        ctx.fillStyle = c.couleur;
        ctx.beginPath();
        ctx.arc(110, y - 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#F6F1E4";
        y = dessinerTexteMultiligne(c.texte, 140, y, largeur - 250, 34) + 20;
      });

      ctx.textAlign = "center";
      ctx.font = "italic 26px Georgia";
      ctx.fillStyle = "#D8E8E1";
      y += 20;
      y = dessinerTexteMultiligne("« Que le Seigneur te bénisse, te garde, et t'accorde une nouvelle dimension de sa grâce, de sa sagesse et de sa présence dans cette nouvelle année ! »", largeur / 2 - (largeur - 300) / 2, y, largeur - 300, 36);

      ctx.font = "22px Arial";
      ctx.fillStyle = "#B9D3CB";
      ctx.fillText("— Pasteur Dimitri Koffi", largeur / 2, hauteur - 60);

      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nomFichier || "anniversaire"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    }
  }

  finaliser();
}

function genererAfficheImage({ titre, sousTitre, corps, piedDePage, nomFichier }) {
  const largeur = 1080, hauteur = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext("2d");

  // Fond dégradé teal
  const degrade = ctx.createLinearGradient(0, 0, 0, hauteur);
  degrade.addColorStop(0, "#0B4038");
  degrade.addColorStop(1, "#124D43");
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, largeur, hauteur);

  // Bande dorée en haut
  ctx.fillStyle = "#D6A54C";
  ctx.fillRect(0, 0, largeur, 14);

  function dessinerLogoEtTexte() {
    ctx.textAlign = "center";

    // Nom de l'église
    ctx.fillStyle = "#EFCB77";
    ctx.font = "bold 34px Arial";
    ctx.fillText("ASSEMBLÉE RENAISSANCE", largeur / 2, 130);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#D8E8E1";
    ctx.fillText("Bouaflé", largeur / 2, 168);

    // Ligne de séparation
    ctx.strokeStyle = "#D6A54C";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(largeur / 2 - 80, 200);
    ctx.lineTo(largeur / 2 + 80, 200);
    ctx.stroke();

    // Titre principal (retour à la ligne automatique)
    ctx.fillStyle = "#F6F1E4";
    ctx.font = "bold 56px Arial";
    let y = 300;
    const lignesTitre = decouperTexte(ctx, titre, largeur - 160);
    lignesTitre.forEach(ligne => { ctx.fillText(ligne, largeur / 2, y); y += 64; });

    // Sous-titre (date, lieu...)
    if (sousTitre) {
      y += 20;
      ctx.font = "32px Arial";
      ctx.fillStyle = "#D6A54C";
      const lignesSousTitre = decouperTexte(ctx, sousTitre, largeur - 160);
      lignesSousTitre.forEach(ligne => { ctx.fillText(ligne, largeur / 2, y); y += 42; });
    }

    // Corps de texte
    if (corps) {
      y += 50;
      ctx.font = "30px Arial";
      ctx.fillStyle = "#F6F1E4";
      const lignesCorps = decouperTexte(ctx, corps, largeur - 200);
      lignesCorps.slice(0, 12).forEach(ligne => { ctx.fillText(ligne, largeur / 2, y); y += 42; });
    }

    // Pied de page
    ctx.font = "italic 26px Arial";
    ctx.fillStyle = "#B9D3CB";
    ctx.fillText(piedDePage || "Pasteur Dimitri Koffi", largeur / 2, hauteur - 60);

    // Bande dorée en bas
    ctx.fillStyle = "#D6A54C";
    ctx.fillRect(0, hauteur - 14, largeur, 14);

    // Déclenche le téléchargement
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nomFichier || "affiche"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function decouperTexte(context, texte, largeurMax) {
    const mots = (texte || "").split(" ");
    const lignes = [];
    let ligneActuelle = "";
    mots.forEach(mot => {
      const test = ligneActuelle ? `${ligneActuelle} ${mot}` : mot;
      if (context.measureText(test).width > largeurMax && ligneActuelle) {
        lignes.push(ligneActuelle);
        ligneActuelle = mot;
      } else {
        ligneActuelle = test;
      }
    });
    if (ligneActuelle) lignes.push(ligneActuelle);
    return lignes;
  }

  // Charge le logo avant de dessiner (facultatif, si l'image ne charge pas on continue quand même)
  const logo = new Image();
  logo.onload = () => {
    ctx.drawImage(logo, largeur / 2 - 60, 40, 120, 84);
    dessinerLogoEtTexte();
  };
  logo.onerror = () => dessinerLogoEtTexte();
  logo.src = LOGO_VH;
}


// Vérifie qu'un numéro de téléphone a une forme plausible avant de l'enregistrer
// — en Côte d'Ivoire, les numéros comptent 10 chiffres (avec le 0 initial) ou
// 8 chiffres sans le préfixe. On reste tolérant sur le format (espaces, +225...)
// mais on rejette les numéros manifestement incomplets ou avec des lettres.
function numeroTelephoneValide(tel) {
  if (!tel || !tel.trim()) return false;
  const chiffres = tel.replace(/[^\d]/g, "");
  const sansIndicatif = chiffres.startsWith("225") ? chiffres.slice(3) : chiffres;
  return sansIndicatif.length >= 8 && sansIndicatif.length <= 10;
}

// Signature à ajouter en bas d'un message WhatsApp — seul le pasteur signe
// de son nom, tous les autres (assistants, responsables) signent au nom de
// l'église.
function signatureMessage(compte) {
  return compte?.role === "pasteur" ? "— Pasteur Dimitri Koffi" : "— VASES D'HONNEUR BOUAFLÉ";
}

function numeroPourWhatsApp(tel) {
  const chiffres = (tel || "").replace(/[^\d]/g, "");
  if (chiffres.startsWith("225")) return chiffres;
  return "225" + chiffres;
}

// Redimensionne une photo côté navigateur avant stockage (évite d'alourdir la base).
// Redimensionne une image jointe (événement, message) en conservant ses proportions —
// contrairement aux photos de membres qui sont recadrées en carré, ici on garde
// l'image entière, juste réduite pour ne pas alourdir la base de données.
function redimensionnerImageAttachee(fichier) {
  return new Promise((resolve, reject) => {
    const minuteur = setTimeout(() => reject(new Error("Le traitement de la photo a pris trop de temps — le format n'est peut-être pas pris en charge (essaie une capture d'écran de la photo, ou une image au format JPEG/PNG).")), 8000);
    const lecteur = new FileReader();
    lecteur.onload = e => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(minuteur);
        const maxTaille = 1000;
        const ratio = Math.min(1, maxTaille / Math.max(img.width, img.height));
        const largeur = Math.round(img.width * ratio), hauteur = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = largeur; canvas.height = hauteur;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, largeur, hauteur);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => { clearTimeout(minuteur); reject(new Error("Impossible de lire cette image — essaie un format JPEG ou PNG.")); };
      img.src = e.target.result;
    };
    lecteur.onerror = () => { clearTimeout(minuteur); reject(new Error("Impossible de lire ce fichier.")); };
    lecteur.readAsDataURL(fichier);
  });
}

function redimensionnerPhoto(fichier) {
  return new Promise((resolve, reject) => {
    const minuteur = setTimeout(() => reject(new Error("Le traitement de la photo a pris trop de temps — le format n'est peut-être pas pris en charge (essaie une capture d'écran de la photo, ou une image au format JPEG/PNG).")), 8000);
    const lecteur = new FileReader();
    lecteur.onload = e => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(minuteur);
        const taille = 320;
        const canvas = document.createElement("canvas");
        canvas.width = taille; canvas.height = taille;
        const ctx = canvas.getContext("2d");
        const ratio = Math.max(taille / img.width, taille / img.height);
        const largeur = img.width * ratio, hauteur = img.height * ratio;
        ctx.drawImage(img, (taille - largeur) / 2, (taille - hauteur) / 2, largeur, hauteur);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = () => { clearTimeout(minuteur); reject(new Error("Impossible de lire cette image — essaie un format JPEG ou PNG.")); };
      img.src = e.target.result;
    };
    lecteur.onerror = () => { clearTimeout(minuteur); reject(new Error("Impossible de lire ce fichier.")); };
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
  const [formulaireAjoutOuvert, setFormulaireAjoutOuvert] = useState(false);
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
  const [responsableGem, setResponsableGem] = useState(null); // { assignationId, compte }
  const [chargementResponsable, setChargementResponsable] = useState(true);
  const [presenceResponsable, setPresenceResponsable] = useState(false);
  const [editionResponsableProvisoire, setEditionResponsableProvisoire] = useState(false);
  const [nomResponsableProvisoire, setNomResponsableProvisoire] = useState(gem.responsable_nom || "");
  const [telResponsableProvisoire, setTelResponsableProvisoire] = useState(gem.responsable_telephone || "+225 ");

  const estAdmin = compte.role === "pasteur" || compte.assistant === true;

  async function enregistrerResponsableProvisoire() {
    if (!nomResponsableProvisoire.trim()) { toast("Le nom du responsable est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(telResponsableProvisoire)) { toast("Le numéro du responsable ne semble pas valide.", "erreur"); return; }
    const { error } = await supabase.from("gems").update({
      responsable_nom: nomResponsableProvisoire.trim(),
      responsable_telephone: telResponsableProvisoire.trim(),
    }).eq("id", gem.id);
    setEditionResponsableProvisoire(false);
    if (!error) { toast("✓ Responsable indiqué pour ce GEM.", "succes"); gem.responsable_nom = nomResponsableProvisoire.trim(); gem.responsable_telephone = telResponsableProvisoire.trim(); if (onMembreAjoute) onMembreAjoute(); }
    else toast("Erreur : " + error.message, "erreur");
  }

  async function retirerResponsableProvisoire() {
    const { error } = await supabase.from("gems").update({ responsable_nom: null, responsable_telephone: null }).eq("id", gem.id);
    if (!error) { setNomResponsableProvisoire(""); setTelResponsableProvisoire("+225 "); toast("Responsable retiré.", "succes"); gem.responsable_nom = null; gem.responsable_telephone = null; if (onMembreAjoute) onMembreAjoute(); }
    else toast("Erreur : " + error.message, "erreur");
  }


  useEffect(() => { chargerResponsableGem(); }, [gem.id]);
  useEffect(() => { chargerPresenceResponsable(); }, [dimancheId, responsableGem?.compte?.id]);

  async function chargerResponsableGem() {
    setChargementResponsable(true);
    const { data } = await supabase.from("assignations").select("id, compte_id").eq("gem_id", gem.id).eq("role_demande", "gem").eq("statut", "actif").limit(1).maybeSingle();
    if (!data) { setResponsableGem(null); setChargementResponsable(false); return; }
    const { data: c } = await supabase.from("comptes").select("*").eq("id", data.compte_id).maybeSingle();
    setResponsableGem(c ? { assignationId: data.id, compte: c } : null);
    setChargementResponsable(false);
  }

  async function chargerPresenceResponsable() {
    if (!dimancheId || !responsableGem?.compte?.id) { setPresenceResponsable(false); return; }
    const { data } = await supabase.from("presences_responsables_gem").select("*").eq("compte_id", responsableGem.compte.id).eq("dimanche_id", dimancheId).maybeSingle();
    setPresenceResponsable(!!data?.present);
  }

  async function basculerPresenceResponsable() {
    if (!responsableGem?.compte?.id || !dimancheId) return;
    const nouvelEtat = !presenceResponsable;
    setPresenceResponsable(nouvelEtat);
    const { error } = await supabase.from("presences_responsables_gem").upsert(
      { compte_id: responsableGem.compte.id, gem_id: gem.id, dimanche_id: dimancheId, present: nouvelEtat },
      { onConflict: "compte_id,dimanche_id" }
    );
    if (error) { toast("⚠️ Présence du responsable non enregistrée : " + error.message, "erreur"); setPresenceResponsable(!nouvelEtat); }
  }

  useEffect(() => { initialiserPresences(); chargerSante(); verifierPointageManquant(membres).then(setRappelPointage); }, [membres.length]);
  useEffect(() => { chargerPresences(); }, [dimancheId]);

  useEffect(() => {
    if (membreCible && membres.some(m => m.id === membreCible)) {
      setMembreOuvert(membreCible);
      if (onMembreCibleConsomme) onMembreCibleConsomme();
      // Fait défiler l'écran jusqu'à la fiche du membre recherché. On réessaie
      // plusieurs fois car l'élément peut ne pas encore exister dans le DOM
      // juste après l'ouverture (liste longue, rendu pas terminé).
      let tentatives = 0;
      const idCible = membreCible;
      const intervalle = setInterval(() => {
        tentatives++;
        const el = document.getElementById(`membre-${idCible}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          clearInterval(intervalle);
        } else if (tentatives >= 15) {
          clearInterval(intervalle);
        }
      }, 200);
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
    // upsert plutôt que "vérifier puis créer" — évite tout doublon si deux
    // responsables ouvrent la page au même moment un dimanche — puis on
    // relit systématiquement pour être sûr d'avoir la bonne ligne.
    await supabase.from("dimanches").upsert({ date: dateAuj }, { onConflict: "date", ignoreDuplicates: true });
    const { data: dimAuj } = await supabase.from("dimanches").select("*").eq("date", dateAuj).maybeSingle();
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
    // Le motif d'absence est obligatoire — on bloque la validation tant qu'un
    // absent n'a pas de motif renseigné.
    const absentsSansMotif = membres.filter(m => presences[m.id] && !presences[m.id].present && !presences[m.id].motif?.trim());
    if (absentsSansMotif.length > 0) {
      toast(`⚠️ Renseigne le motif d'absence de ${absentsSansMotif.length === 1 ? absentsSansMotif[0].nom : `${absentsSansMotif.length} membres`} avant de valider le rapport.`, "erreur");
      return;
    }
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
    // Mise à jour immédiate à l'écran, quelle que soit la connexion — l'action
    // est mise en attente et synchronisée automatiquement si le réseau manque,
    // au lieu d'être perdue (utile un dimanche avec une connexion instable).
    setPresences(prev => ({ ...prev, [membreId]: { present: nouvelEtat, motif: motifConserve } }));
    const resultat = await ecrireAvecFileAttente({
      table: "presences", action: "upsert",
      payload: { membre_id: membreId, dimanche_id: dimancheId, present: nouvelEtat, motif: motifConserve || null },
      onConflict: "membre_id,dimanche_id",
    });
    if (resultat.enAttente) {
      toast("📴 Hors ligne — la présence sera envoyée dès le retour du réseau.", "info");
    } else if (rapportPresenceValide) {
      setRapportPresenceValide(false);
    }
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
    if (!numeroTelephoneValide(telephone)) { setErreur("Ce numéro de téléphone ne semble pas valide — vérifie qu'il est complet."); return; }
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
    const nomAjoute = nom.trim();
    setNom(""); setTelephone("+225 "); setNouveauConverti(false); setPhoto(null); setDateNaissance(""); setQuartier("");
    setFormulaireAjoutOuvert(false);
    toast(`✓ ${nomAjoute} a été ajouté(e) au GEM.`, "succes");
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
 onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Retour</button>}
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{gem.nom}</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{membres.length} membre{membres.length > 1 ? "s" : ""}</p>

      <BanniereRappelPointage rappel={rappelPointage} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className="btn-app"
          onClick={() => setSousOnglet("membres")}
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "membres" ? GOLD : TEAL_900, color: sousOnglet === "membres" ? TEAL_950 : "var(--text-secondary-2)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconeGroupe size={14} /> Membres & Présence
        </button>
        <button
          className="btn-app"
          onClick={() => setSousOnglet("activites")}
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "activites" ? GOLD : TEAL_900, color: sousOnglet === "activites" ? TEAL_950 : "var(--text-secondary-2)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconeClipboard size={14} /> Activités de la semaine
        </button>
        <button
          className="btn-app"
          onClick={() => setSousOnglet("sante")}
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "sante" ? GOLD : TEAL_900, color: sousOnglet === "sante" ? TEAL_950 : "var(--text-secondary-2)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconeThermometre size={14} /> Santé spirituelle
        </button>
      </div>

      {sousOnglet === "activites" ? (
        <ActivitesSemaine gem={gem} membres={membres} compte={compte} cardStyle={cardStyle} />
      ) : sousOnglet === "sante" ? (
        <RapportSanteSemaine gem={gem} membres={membres} compte={compte} cardStyle={cardStyle} />
      ) : (
        <>
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: formulaireAjoutOuvert ? 10 : 0 }}>
          <button
            className="btn-app"
            onClick={() => setFormulaireAjoutOuvert(v => !v)}
            style={{ padding: 0, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: CREAM }}
          >
            <span style={{ display: "inline-block", transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)", transform: formulaireAjoutOuvert ? "rotate(45deg)" : "rotate(0deg)", fontSize: 18, color: GOLD_LIGHT, lineHeight: 1 }}>+</span>
            Ajouter un membre
          </button>
          {formulaireAjoutOuvert && (
            <label style={{ fontSize: 11, fontWeight: 700, color: GOLD_LIGHT, cursor: "pointer", border: `1px solid ${GOLD_LIGHT}`, borderRadius: 8, padding: "6px 10px", whiteSpace: "nowrap" }}>
              📂 Importer depuis un fichier (CSV)
              <input type="file" accept=".csv,text/csv" onChange={surChoisirFichierImport} style={{ display: "none" }} />
            </label>
          )}
        </div>
        {formulaireAjoutOuvert && (
          <div className="fade-in">
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
 onClick={ajouterMembre} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>Ajouter</button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={nouveauConverti} onChange={e => setNouveauConverti(e.target.checked)} />
          Nouveau converti — suivre son parcours d'intégration
        </label>
        {erreur && <p style={{ color: RED_LIGHT, fontSize: 12, marginTop: 8 }}>{erreur}</p>}
          </div>
        )}
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
        <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 12 }}>Coche chaque membre présent au culte de ce dimanche.</p>

        {!chargementResponsable && responsableGem && (
          <div style={{ border: `2px solid ${GOLD}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, backgroundColor: "rgba(208,175,28,0.08)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: dimancheId ? "pointer" : "default" }}>
              <input type="checkbox" checked={presenceResponsable} onChange={basculerPresenceResponsable} disabled={!dimancheId} style={{ width: 18, height: 18, accentColor: GOLD }} />
              <span>
                <span style={{ fontWeight: 700 }}>{responsableGem.compte.nom}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 8px", marginLeft: 8 }}><IconePersonne size={10} style={{verticalAlign:"-1px",marginRight:3}} /> Responsable</span>
              </span>
            </label>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{responsableGem.compte.telephone}{responsableGem.compte.quartier ? ` · ${responsableGem.compte.quartier}` : ""}</p>
          </div>
        )}

        {!chargementResponsable && !responsableGem && (
          <div style={{ border: `1px dashed ${TEAL_600}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
            {editionResponsableProvisoire ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>Ce GEM n'a pas encore de responsable avec un compte de connexion — tu peux au moins indiquer son nom.</p>
                <input value={nomResponsableProvisoire} onChange={e => setNomResponsableProvisoire(e.target.value)} placeholder="Nom du responsable GEM *" style={{ padding: 7, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                <input value={telResponsableProvisoire} onChange={e => setTelResponsableProvisoire(e.target.value)} placeholder="Téléphone *" style={{ padding: 7, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-app" onClick={enregistrerResponsableProvisoire} style={{ padding: "6px 12px", borderRadius: 7, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Enregistrer</button>
                  <button className="btn-app" onClick={() => setEditionResponsableProvisoire(false)} style={{ padding: "6px 12px", borderRadius: 7, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            ) : nomResponsableProvisoire ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}><IconePersonne size={11} style={{verticalAlign:"-1px",marginRight:4}} /> {nomResponsableProvisoire}</span>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{telResponsableProvisoire || "Pas de compte de connexion"}</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-app" onClick={() => setEditionResponsableProvisoire(true)} style={{ background: "none", border: "none", color: GOLD_LIGHT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}><IconeCrayon size={11} /></button>
                  <button className="btn-app" onClick={retirerResponsableProvisoire} style={{ background: "none", border: "none", color: RED_LIGHT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}><IconePoubelle size={11} /></button>
                </div>
              </div>
            ) : (
              <button className="btn-app" onClick={() => setEditionResponsableProvisoire(true)} style={{ background: "none", border: "none", color: GOLD_LIGHT, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IconePersonne size={12} /> Ajouter un responsable à ce GEM
              </button>
            )}
          </div>
        )}

        {chargementPresences ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Chargement…</p>
        ) : membres.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Ajoute d'abord un membre ci-dessus.</p>
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: present ? GOLD_LIGHT : "var(--text-secondary)" }}>
                      {present ? "✓ Présent" : "Absent"}
                    </span>
                  </label>
                  {!present && (
                    <input
                      defaultValue={motif}
                      onBlur={e => enregistrerMotif(m.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Motif de l'absence (obligatoire)..."
                      style={{ width: "100%", padding: "8px 14px", fontSize: 12, backgroundColor: TEAL_950, color: "var(--text-secondary-2)", border: `1px solid ${motif?.trim() ? TEAL_700 : "rgba(226,119,123,0.5)"}`, borderTop: "none", borderRadius: "0 0 8px 8px" }}
                    />
                  )}
                </div>
              );
            })}
            <button
              className="btn-app"
              disabled={validationEnCours}
              onClick={validerRapportPresence}
              style={{ marginTop: 10, padding: "12px 20px", borderRadius: 10, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", alignSelf: "flex-start" }}
            >
              {validationEnCours ? "…" : rapportPresenceValide ? "✓ Revalider le rapport de présence" : "Valider le rapport de présence"}
            </button>
          </div>
        )}
      </div>

      <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Tous les membres</p>
        {membres.length === 0 ? (
          <EtatVide illustration="groupe" titre="Aucun membre pour l'instant" description="Ajoute le premier membre de ce GEM avec le formulaire ci-dessus." />
        ) : (
          membres.map(m => (
            <div key={m.id} id={`membre-${m.id}`}>
              <FicheMembre
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
            </div>
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
        <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "var(--overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-1)", borderRadius: 16, padding: 24, maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
            <p className="titre-moisson" style={{ fontWeight: 600, fontSize: 18, marginBottom: 10, color: "var(--text-primary)" }}>Confirmer l'import — {apercuImport.length} membre(s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {apercuImport.slice(0, 15).map((l, i) => (
                <p key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>• {l.nom} — {l.telephone}{l.quartier ? ` (${l.quartier})` : ""}</p>
              ))}
              {apercuImport.length > 15 && <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>+ {apercuImport.length - 15} autre(s)…</p>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button className="btn-app" onClick={() => setApercuImport(null)} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-2)", fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
              <button className="btn-app" disabled={importEnCours} onClick={confirmerImport} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "var(--gold)", backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: "var(--bg-base)", border: "none", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(214,165,76,0.28)" }}>
                {importEnCours ? "…" : `Importer ${apercuImport.length} membre(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditionResponsableGem({ compteResponsable, onFerme, onEnregistre }) {
  const [nom, setNom] = useState(compteResponsable.nom);
  const [telephone, setTelephone] = useState(compteResponsable.telephone);
  const [quartier, setQuartier] = useState(compteResponsable.quartier || "");
  const [dateNaissance, setDateNaissance] = useState(compteResponsable.date_naissance || "");
  const [enregistrement, setEnregistrement] = useState(false);

  async function enregistrer() {
    if (!nom.trim() || !telephone.trim()) { toast("Le nom et le téléphone ne peuvent pas être vides.", "erreur"); return; }
    setEnregistrement(true);
    const { data, error } = await supabase.from("comptes").update({
      nom: nom.trim(), telephone: telephone.trim(), quartier: quartier.trim() || null, date_naissance: dateNaissance || null,
    }).eq("id", compteResponsable.id).select().single();
    setEnregistrement(false);
    if (error) { toast("Impossible d'enregistrer : " + error.message, "erreur"); return; }
    toast("✓ Informations du responsable mises à jour.", "succes");
    onEnregistre(data);
  }

  return (
    <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "var(--overlay)", backdropFilter: "blur(2px)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ backgroundColor: TEAL_950, border: `1px solid ${GOLD}`, borderRadius: 16, padding: 22, maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
        <p className="titre-moisson" style={{ fontWeight: 600, fontSize: 17, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><IconePersonne size={17} /> Modifier le responsable</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nom</label>
            <input value={nom} onChange={e => setNom(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Téléphone</label>
            <input value={telephone} onChange={e => setTelephone(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Quartier</label>
            <input value={quartier} onChange={e => setQuartier(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>🎂 Date de naissance (jour et mois)</label>
            <SelecteurJourMois value={dateNaissance} onChange={setDateNaissance} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn-app" onClick={onFerme} style={{ flex: 1, padding: "10px 0", borderRadius: 8, backgroundColor: "transparent", color: "var(--text-secondary-2)", border: `1px solid ${TEAL_600}`, cursor: "pointer" }}>Annuler</button>
          <button className="btn-app" disabled={enregistrement} onClick={enregistrer} style={{ flex: 1, padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>
            {enregistrement ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
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

// Rapport de santé spirituelle hebdomadaire — même logique que le rapport de
// présence et d'activités : sélecteur de semaine + validation par GEM.
function RapportSanteSemaine({ gem, membres, compte, cardStyle }) {
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [valide, setValide] = useState(false);
  const [valeursParMembre, setValeursParMembre] = useState({}); // { membre_id: { meditation, jeune, priere, sanctification, dons, caractere } }
  const [membreOuvert, setMembreOuvert] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [responsableGem, setResponsableGem] = useState(null); // compte du responsable de ce GEM
  const [valeursResponsable, setValeursResponsable] = useState(null);
  const [responsableOuvert, setResponsableOuvert] = useState(false);
  const [enregistrementResponsable, setEnregistrementResponsable] = useState(false);

  // Les 12 derniers mois, du plus récent au plus ancien
  const moisDisponibles = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  useEffect(() => { chargerResponsableGem(); }, [gem.id]);
  useEffect(() => { chargerDonnees(); }, [mois, membres.length]);

  async function chargerResponsableGem() {
    const { data } = await supabase.from("assignations").select("compte_id").eq("gem_id", gem.id).eq("role_demande", "gem").eq("statut", "actif").limit(1).maybeSingle();
    if (!data) { setResponsableGem(null); return; }
    const { data: c } = await supabase.from("comptes").select("*").eq("id", data.compte_id).maybeSingle();
    setResponsableGem(c || null);
    if (c) {
      const { data: derniereSante } = await supabase.from("sante_spirituelle_responsables").select("*").eq("compte_id", c.id).order("date_maj", { ascending: false }).limit(1).maybeSingle();
      setValeursResponsable({
        meditation: derniereSante?.meditation ?? 5, jeune: derniereSante?.jeune ?? 5, priere: derniereSante?.priere ?? 5,
        sanctification: derniereSante?.sanctification ?? 5, dons: derniereSante?.dons ?? 5, caractere: derniereSante?.caractere ?? 5,
      });
    }
  }

  async function enregistrerSanteResponsable() {
    if (!responsableGem || !valeursResponsable) return;
    setEnregistrementResponsable(true);
    const { error } = await supabase.from("sante_spirituelle_responsables").insert({ compte_id: responsableGem.id, ...valeursResponsable });
    setEnregistrementResponsable(false);
    if (error) { toast("Erreur d'enregistrement : " + error.message, "erreur"); return; }
    toast(`✓ Santé spirituelle de ${responsableGem.nom} enregistrée.`, "succes");
  }

  async function chargerDonnees() {
    setChargement(true);
    if (membres.length > 0) {
      const { data: sante } = await supabase.from("sante_spirituelle").select("*").in("membre_id", membres.map(m => m.id)).order("date_maj", { ascending: false });
      const map = {};
      (sante || []).forEach(s => { if (!map[s.membre_id]) map[s.membre_id] = s; });
      const init = {};
      membres.forEach(m => {
        const derniere = map[m.id];
        init[m.id] = {
          meditation: derniere?.meditation ?? 5, jeune: derniere?.jeune ?? 5, priere: derniere?.priere ?? 5,
          sanctification: derniere?.sanctification ?? 5, dons: derniere?.dons ?? 5, caractere: derniere?.caractere ?? 5,
        };
      });
      setValeursParMembre(init);
    }
    const { data: validation } = await supabase.from("validations_sante").select("*").eq("gem_id", gem.id).eq("mois", mois).maybeSingle();
    setValide(!!validation?.valide);
    setChargement(false);
  }

  function modifierValeur(membreId, cle, valeur) {
    setValeursParMembre(v => ({ ...v, [membreId]: { ...v[membreId], [cle]: valeur } }));
    if (valide) setValide(false);
  }

  async function valider() {
    setEnregistrement(true);
    // Enregistre une nouvelle évaluation pour chaque membre de ce GEM
    const lignes = membres.map(m => ({ membre_id: m.id, ...valeursParMembre[m.id] }));
    const { error: err1 } = await supabase.from("sante_spirituelle").insert(lignes);
    if (err1) { toast("Erreur d'enregistrement : " + err1.message, "erreur"); setEnregistrement(false); return; }

    // Vérifie puis met à jour ou crée la validation du mois — plus robuste
    // qu'un upsert qui dépend d'une contrainte d'unicité particulière.
    const { data: existant } = await supabase.from("validations_sante").select("id").eq("gem_id", gem.id).eq("mois", mois).maybeSingle();
    const payload = { gem_id: gem.id, mois, valide: true, valide_par: compte?.id || null, date_validation: new Date().toISOString() };
    const { error: err2 } = existant
      ? await supabase.from("validations_sante").update(payload).eq("id", existant.id)
      : await supabase.from("validations_sante").insert(payload);
    setEnregistrement(false);
    if (err2) { toast("Erreur de validation : " + err2.message, "erreur"); return; }
    setValide(true);
    toast("✓ Rapport de santé spirituelle validé pour ce mois. 🙏", "succes");
  }

  if (chargement) return <Chargement />;

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>🌡️ Santé spirituelle — mois</p>
          {valide && (
            <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "4px 10px" }}><IconeValide size={11} style={{verticalAlign:"-1px",marginRight:3}} /> Rapport validé</span>
          )}
        </div>
        <select
          value={mois}
          onChange={e => setMois(e.target.value)}
          style={{ padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 12 }}
        >
          {moisDisponibles.map(m => {
            const [annee, moisNum] = m.split("-");
            return (
              <option key={m} value={m}>
                {new Date(annee, moisNum - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </option>
            );
          })}
        </select>
        <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 12 }}>Évalue chaque membre de 0 (faible) à 10 (excellent), une fois par mois, puis valide le rapport du mois.</p>


        {responsableGem && valeursResponsable && (
          <div style={{ border: `2px solid ${GOLD}`, borderRadius: 8, marginBottom: 14, backgroundColor: "rgba(208,175,28,0.08)" }}>
            <button
              className="btn-app"
              onClick={() => setResponsableOuvert(v => !v)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: CREAM, textAlign: "left" }}
            >
              <span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{responsableGem.nom}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 8px", marginLeft: 8 }}><IconePersonne size={10} style={{verticalAlign:"-1px",marginRight:3}} /> Responsable</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: couleurScore(moyenneSante(valeursResponsable)) }}>{moyenneSante(valeursResponsable)}/10 {responsableOuvert ? "▲" : "▼"}</span>
            </button>
            {responsableOuvert && (
              <div style={{ padding: "0 14px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {DIMENSIONS_SANTE.map(([cle, label]) => (
                  <div key={cle}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: 12, color: "var(--text-secondary-2)" }}>{label}</label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: couleurScore(valeursResponsable[cle]) }}>{valeursResponsable[cle]}/10</span>
                    </div>
                    <input
                      type="range" min="0" max="10" value={valeursResponsable[cle] ?? 5}
                      onChange={e => setValeursResponsable(v => ({ ...v, [cle]: Number(e.target.value) }))}
                      style={{ width: "100%", accentColor: GOLD }}
                    />
                  </div>
                ))}
                <button
                  className="btn-app"
                  disabled={enregistrementResponsable}
                  onClick={enregistrerSanteResponsable}
                  style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  {enregistrementResponsable ? "…" : <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeEnregistrer size={14}/> Enregistrer ma fiche</span>}
                </button>
              </div>
            )}
          </div>
        )}

        {membres.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Ajoute d'abord un membre dans l'onglet "Membres & Présence".</p>
        ) : (
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {membres.map(m => {
              const valeurs = valeursParMembre[m.id] || {};
              const moyenne = moyenneSante(valeurs);
              const ouvert = membreOuvert === m.id;
              return (
                <div key={m.id} style={{ backgroundColor: TEAL_900, borderRadius: 8, border: `1px solid ${TEAL_700}` }}>
                  <button
                    className="btn-app"
                    onClick={() => setMembreOuvert(ouvert ? null : m.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: CREAM, textAlign: "left" }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{m.nom}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: couleurScore(moyenne) }}>{moyenne !== null ? `${moyenne}/10` : "—"} {ouvert ? "▲" : "▼"}</span>
                  </button>
                  {ouvert && (
                    <div style={{ padding: "0 14px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {DIMENSIONS_SANTE.map(([cle, label]) => (
                        <div key={cle}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <label style={{ fontSize: 12, color: "var(--text-secondary-2)" }}>{label}</label>
                            <span style={{ fontSize: 12, fontWeight: 700, color: couleurScore(valeurs[cle]) }}>{valeurs[cle]}/10</span>
                          </div>
                          <input
                            type="range" min="0" max="10" value={valeurs[cle] ?? 5}
                            onChange={e => modifierValeur(m.id, cle, Number(e.target.value))}
                            style={{ width: "100%", accentColor: GOLD }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {membres.length > 0 && (
          <button
            className="btn-app"
            disabled={enregistrement}
            onClick={valider}
            style={{ marginTop: 16, padding: "12px 20px", borderRadius: 10, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            {enregistrement ? "…" : valide ? "Revalider le rapport" : "Valider le rapport de santé spirituelle"}
          </button>
        )}
      </div>
    </div>
  );
}

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
    // S'assure que la semaine en cours existe dans la liste, sans forcer sa
    // sélection — upsert plutôt que "vérifier puis créer" pour éviter tout
    // doublon en cas d'ouverture simultanée par plusieurs personnes.
    const dateAuj = dimancheActuel();
    await supabase.from("dimanches").upsert({ date: dateAuj }, { onConflict: "date", ignoreDuplicates: true });
    const { data: toutesLesSemaines } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(52);
    setDimanches(toutesLesSemaines || []);
    const dimAuj = (toutesLesSemaines || []).find(d => d.date === dateAuj);
    if (dimAuj) setDimancheId(dimAuj.id);
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
      <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Semaine concernée</label>
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
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Ajoute d'abord des membres à ce GEM pour pouvoir remplir les activités.</p>
      ) : (
        <>
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🏠 Visites effectuées cette semaine</p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 10 }}>Coche chaque membre visité.</p>
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
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}><IconeTelephone size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Appels effectués cette semaine</p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 10 }}>Coche chaque membre appelé.</p>
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
            style={{ padding: "12px 24px", borderRadius: 12, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
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

// Calcule la liste des BOSS ("Bon Ouvrier au Service du Seigneur") — toute
// personne inscrite dans au moins un GEM de type "département". Regroupe une
// même personne à travers plusieurs départements (par numéro de téléphone),
// en ne lui attribuant qu'une seule tribu (celle de son GEM de type "tribu").
/* --------------------------- Prédiction : risque de décrochage --------------------------- */

// Calcule un score de risque de décrochage (0-100) pour un membre, à partir de
// TENDANCES (pas seulement de l'état actuel) : évolution de la présence sur 16
// dimanches, évolution de la santé spirituelle, et progression du parcours de
// conversion. But : repérer un décrochage AVANT qu'il ne soit consommé.
function calculerRisqueMembre({ membre, dimanchesReels, presencesMembre, historiqueSante, absencesConsecutives }) {
  let score = 0;
  const raisons = [];

  // --- Tendance de présence (8 dimanches récents vs 8 précédents) ---
  const moitie = Math.floor(dimanchesReels.length / 2);
  const recents = dimanchesReels.slice(-moitie);
  const anciens = dimanchesReels.slice(0, dimanchesReels.length - moitie);
  function tauxSur(liste) {
    if (liste.length === 0) return null;
    const presents = liste.filter(d => presencesMembre.some(p => p.dimanche_id === d.id && p.present)).length;
    return Math.round((presents / liste.length) * 100);
  }
  const tauxRecent = tauxSur(recents);
  const tauxAncien = tauxSur(anciens);
  let tendancePresence = null;
  if (tauxRecent !== null && tauxAncien !== null && anciens.length >= 3) {
    tendancePresence = tauxRecent - tauxAncien;
    if (tendancePresence <= -25) { score += 32; raisons.push(`Présence en forte baisse (${tauxAncien}% → ${tauxRecent}%)`); }
    else if (tendancePresence <= -12) { score += 16; raisons.push(`Présence en baisse (${tauxAncien}% → ${tauxRecent}%)`); }
  }

  // --- Absences consécutives actuelles ---
  if (absencesConsecutives >= 3) { score += 28; raisons.push(`${absencesConsecutives} dimanches consécutifs manqués`); }
  else if (absencesConsecutives === 2) { score += 18; raisons.push("2 dimanches consécutifs manqués"); }
  else if (absencesConsecutives === 1) { score += 8; }

  // --- Tendance de santé spirituelle (2 dernières évaluations vs 2 précédentes) ---
  if (historiqueSante.length >= 3) {
    const scores = historiqueSante.map(s => moyenneSante(s)).filter(v => v !== null);
    if (scores.length >= 3) {
      const recentesSante = scores.slice(0, Math.ceil(scores.length / 2));
      const anciennesSante = scores.slice(Math.ceil(scores.length / 2));
      const moyRecente = recentesSante.reduce((a, b) => a + b, 0) / recentesSante.length;
      const moyAncienne = anciennesSante.length > 0 ? anciennesSante.reduce((a, b) => a + b, 0) / anciennesSante.length : moyRecente;
      const tendanceSante = moyRecente - moyAncienne;
      if (tendanceSante <= -2) { score += 20; raisons.push("Santé spirituelle en baisse"); }
    }
  }
  const derniereSante = historiqueSante.length > 0 ? moyenneSante(historiqueSante[0]) : null;
  if (derniereSante !== null && derniereSante < 4) { score += 14; raisons.push(`Santé spirituelle faible (${derniereSante}/10)`); }

  // --- Nouveau converti sans progression ---
  if (membre.nouveau_converti && membre.etape_conversion === "accueil" && membre.created_at) {
    const joursDepuis = Math.floor((Date.now() - new Date(membre.created_at).getTime()) / 86400000);
    if (joursDepuis >= 30) { score += 16; raisons.push(`Nouveau converti sans progression depuis ${joursDepuis} jours`); }
  }

  score = Math.min(100, score);
  const niveau = score >= 50 ? "eleve" : score >= 25 ? "modere" : "faible";
  return { score, niveau, raisons, tendancePresence };
}

function PagePrediction({ compte, membres, gems, tribus, departements, gemsAutorises, regulariteParMembre, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [risques, setRisques] = useState([]);
  const [filtreNiveau, setFiltreNiveau] = useState("");

  const membresDuPerimetre = gemsAutorises ? membres.filter(m => gemsAutorises.includes(m.gem_id)) : membres;

  useEffect(() => { calculerTout(); }, [membresDuPerimetre.length]);

  async function calculerTout() {
    setChargement(true);
    if (membresDuPerimetre.length === 0) { setRisques([]); setChargement(false); return; }
    const idsMembres = membresDuPerimetre.map(m => m.id);

    const [{ data: dimanchesRecents }, { data: presencesTous }, { data: santeTous }] = await Promise.all([
      supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(16),
      supabase.from("presences").select("*").in("membre_id", idsMembres),
      supabase.from("sante_spirituelle").select("*").in("membre_id", idsMembres).order("date_maj", { ascending: false }),
    ]);

    // Ne garde que les dimanches réellement pointés (au moins une présence)
    const idsDimPointes = new Set((presencesTous || []).map(p => p.dimanche_id));
    const dimanchesReels = (dimanchesRecents || []).filter(d => idsDimPointes.has(d.id)).reverse(); // du plus ancien au plus récent

    const resultats = membresDuPerimetre.map(m => {
      const presencesMembre = (presencesTous || []).filter(p => p.membre_id === m.id);
      const historiqueSante = (santeTous || []).filter(s => s.membre_id === m.id);
      const risque = calculerRisqueMembre({
        membre: m, dimanchesReels, presencesMembre, historiqueSante,
        absencesConsecutives: regulariteParMembre?.[m.id]?.absencesConsecutives || 0,
      });
      return { membre: m, ...risque };
    });

    setRisques(resultats.filter(r => r.score >= 25).sort((a, b) => b.score - a.score));
    setChargement(false);
  }

  function nomGem(gemId) { return gems.find(g => g.id === gemId)?.nom || "GEM inconnu"; }
  function provenance(gemId) {
    const g = gems.find(gg => gg.id === gemId);
    if (!g) return "";
    if (g.tribu_id) return `Tribu de ${tribus?.find(t => t.id === g.tribu_id)?.nom || "?"}`;
    if (g.departement_id) return `Département ${departements?.find(d => d.id === g.departement_id)?.nom || "?"}`;
    return "";
  }

  const resultatsAffiches = filtreNiveau ? risques.filter(r => r.niveau === filtreNiveau) : risques;

  if (chargement) return <ChargementSquelette lignes={4} />;

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
        <IconeAnalyse size={22} /> Risque de décrochage
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Détection précoce basée sur les tendances (présence, santé spirituelle, parcours) — pas seulement l'état du moment. {risques.length} membre{risques.length > 1 ? "s" : ""} signalé{risques.length > 1 ? "s" : ""}.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["", "Tous"], ["eleve", "🔴 Risque élevé"], ["modere", "🟠 Risque modéré"]].map(([cle, label]) => (
          <button key={cle} className="btn-app" onClick={() => setFiltreNiveau(cle)} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${TEAL_600}`, cursor: "pointer", backgroundColor: filtreNiveau === cle ? GOLD : "transparent", color: filtreNiveau === cle ? TEAL_950 : "var(--text-secondary-2)" }}>
            {label}
          </button>
        ))}
      </div>

      {resultatsAffiches.length === 0 ? (
        <EtatVide illustration="priere" titre="Aucun signal de décrochage détecté" description="D'après les tendances actuelles, personne ne présente de risque notable." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {resultatsAffiches.map(({ membre, score, niveau, raisons }) => {
            const couleur = niveau === "eleve" ? "var(--red)" : "var(--gold-warn)";
            return (
              <div key={membre.id} style={{ ...cardStyle, borderColor: couleur }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>{membre.nom}</p>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{nomGem(membre.gem_id)} — {provenance(membre.gem_id)}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {raisons.map((r, i) => (
                        <span key={i} style={{ fontSize: 11, color: "var(--text-secondary-2)", backgroundColor: TEAL_950, borderRadius: 999, padding: "3px 10px" }}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: couleur, borderRadius: 999, padding: "5px 12px" }}>
                      {niveau === "eleve" ? "🔴" : "🟠"} {score}/100
                    </span>
                    {membre.telephone && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <a title="Appeler" href={`tel:${membre.telephone}`} style={{ fontSize: 15, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}><IconeTelephone size={14} /></a>
                        <a
                          title="WhatsApp"
                          href={`https://wa.me/${numeroPourWhatsApp(membre.telephone)}?text=${encodeURIComponent(`Bonjour ${membre.nom}, comment vas-tu ? On pense à toi et on aimerait prendre de tes nouvelles. 🙏\n\n${signatureMessage(compte)}`)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 15, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
                        ><IconeMessage size={14} /></a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function calculerListeBoss(membres, gems, tribus, departements, regulariteParMembre, assignationsActives, tousLesComptes) {
  // Ne garde que le PREMIER numéro si le champ en contient plusieurs
  // (ex: "0584390467/0500000000"), sinon la concaténation des deux numéros
  // pouvait produire une clé qui correspondait par coïncidence au numéro
  // de quelqu'un d'autre, créant de faux rapprochements dans BOSS.
  function chiffresNumero(tel) {
    const premier = (tel || "").split(/[\/,;]/)[0];
    const chiffres = premier.replace(/[^\d]/g, "");
    return chiffres.length >= 8 ? chiffres.slice(-9) : "";
  }

  const groupesTelephone = {};
  membres.forEach(m => {
    const cle = chiffresNumero(m.telephone) || `sans-numero-${m.id}`;
    if (!groupesTelephone[cle]) groupesTelephone[cle] = [];
    groupesTelephone[cle].push(m);
  });

  // Responsables de département ("departement_resp") ET responsables GEM d'un
  // GEM de type département ("gem") — tous servent l'église au niveau
  // département, même sans être eux-mêmes suivis comme membre dans ce GEM.
  // On les fusionne par numéro s'ils y sont déjà, sinon on crée une entrée
  // BOSS dédiée pour eux.
  const responsablesDept = (assignationsActives || [])
    .filter(a => a.role_demande === "departement_resp" || (a.role_demande === "gem" && gems.find(g => g.id === a.gem_id)?.type === "departement"))
    .map(a => {
      const c = (tousLesComptes || []).find(cc => cc.id === a.compte_id);
      if (!c) return null;
      if (a.role_demande === "departement_resp") {
        const nomDept = departements.find(d => d.id === a.departement_id)?.nom || "Département inconnu";
        return { compte: c, nomDept, libelleRole: "Responsable du département" };
      }
      const g = gems.find(gg => gg.id === a.gem_id);
      const nomDept = departements.find(d => d.id === g?.departement_id)?.nom || "Département inconnu";
      return { compte: c, nomDept, libelleRole: `Responsable GEM (${g?.nom || "?"})` };
    })
    .filter(Boolean);

  const idsGemsUtilises = new Set();

  const resultats = Object.entries(groupesTelephone)
    .map(([cle, fiches]) => {
      const fichesDept = fiches.filter(m => gems.find(g => g.id === m.gem_id)?.type === "departement");
      const respDeptCorrespondant = responsablesDept.find(r => chiffresNumero(r.compte.telephone) === cle);
      if (fichesDept.length === 0 && !respDeptCorrespondant) return null;

      const ficheTribu = fiches.find(m => gems.find(g => g.id === m.gem_id)?.type === "tribu");
      const nomTribu = ficheTribu ? tribus.find(t => t.id === gems.find(g => g.id === ficheTribu.gem_id)?.tribu_id)?.nom : null;

      const servicesUniques = [];
      const nomsDejaVus = new Set();
      fichesDept.forEach(m => {
        const g = gems.find(gg => gg.id === m.gem_id);
        const nomDept = departements.find(d => d.id === g?.departement_id)?.nom || "Département inconnu";
        if (!nomsDejaVus.has(nomDept)) { nomsDejaVus.add(nomDept); servicesUniques.push({ nom: nomDept, gemNom: g?.nom || "" }); }
      });
      if (respDeptCorrespondant && !nomsDejaVus.has(respDeptCorrespondant.nomDept)) {
        nomsDejaVus.add(respDeptCorrespondant.nomDept);
        servicesUniques.push({ nom: respDeptCorrespondant.nomDept, gemNom: respDeptCorrespondant.libelleRole });
      }

      const regularites = fiches.map(m => regulariteParMembre?.[m.id]).filter(r => r && r.tauxRegularite !== null && r.tauxRegularite !== undefined);
      const tauxMoyen = regularites.length > 0
        ? Math.round(regularites.reduce((a, r) => a + r.tauxRegularite, 0) / regularites.length)
        : null;
      const maxAbsencesConsecutives = Math.max(0, ...fiches.map(m => regulariteParMembre?.[m.id]?.absencesConsecutives || 0));

      const reference = ficheTribu || fiches[0] || null;
      if (respDeptCorrespondant) idsGemsUtilises.add(cle);
      return {
        id: `boss-${cle}`,
        nom: reference ? reference.nom : respDeptCorrespondant.compte.nom,
        telephone: reference ? reference.telephone : respDeptCorrespondant.compte.telephone,
        quartier: reference ? reference.quartier : respDeptCorrespondant.compte.quartier,
        dateNaissance: reference ? reference.date_naissance : respDeptCorrespondant.compte.date_naissance,
        photo: reference ? reference.photo : null,
        nomTribu,
        services: servicesUniques,
        tauxMoyen,
        absencesConsecutives: maxAbsencesConsecutives,
        fiches,
      };
    })
    .filter(Boolean);

  // Ajoute les responsables de département qui n'avaient encore aucune fiche
  // membre du tout — regroupés par personne, pour que quelqu'un qui sert
  // dans PLUSIEURS départements (sans fiche membre nulle part) n'apparaisse
  // qu'une seule fois, avec tous ses services listés ensemble.
  const responsablesSansFicheParCompte = {};
  responsablesDept.forEach(r => {
    const cle = chiffresNumero(r.compte.telephone) || `sans-numero-resp-${r.compte.id}`;
    if (idsGemsUtilises.has(cle) || resultats.some(res => res.id === `boss-${cle}`)) return;
    if (!responsablesSansFicheParCompte[r.compte.id]) responsablesSansFicheParCompte[r.compte.id] = { compte: r.compte, services: [] };
    if (!responsablesSansFicheParCompte[r.compte.id].services.some(s => s.nom === r.nomDept && s.gemNom === r.libelleRole)) {
      responsablesSansFicheParCompte[r.compte.id].services.push({ nom: r.nomDept, gemNom: r.libelleRole });
    }
  });
  Object.values(responsablesSansFicheParCompte).forEach(({ compte: c, services }) => {
    resultats.push({
      id: `boss-resp-${c.id}`,
      nom: c.nom,
      telephone: c.telephone,
      quartier: c.quartier,
      dateNaissance: c.date_naissance,
      photo: null,
      nomTribu: null,
      services,
      tauxMoyen: null,
      absencesConsecutives: 0,
      fiches: [],
    });
  });

  return resultats.sort((a, b) => a.nom.localeCompare(b.nom));
}

function couleurScore(score) {
  if (score === null) return "var(--text-secondary)";
  if (score >= 7) return GOLD_LIGHT;
  if (score >= 4) return "var(--gold-warn)";
  return RED_LIGHT;
}

// Génère un commentaire d'interprétation statistique, dans l'esprit d'un
// statisticien expert : dégage les tendances, alerte sur les points de
// vigilance, félicite les progrès, et propose une piste d'action concrète.
// `stats` peut contenir (tout est optionnel, la fonction s'adapte) :
// { nom, nbMembres, croissanceNette, tauxPresence, tauxPresencePrecedent,
//   moyenneSante, moyenneSantePrecedente, tauxRapport, tauxSuiviNouveaux,
//   nbIrreguliers, nbNouveaux }
function genererCommentaireIntelligent(stats) {
  const phrases = [];
  const {
    nom, nbMembres, croissanceNette, tauxPresence, tauxPresencePrecedent,
    moyenneSante, moyenneSantePrecedente, tauxRapport, tauxSuiviNouveaux,
    nbIrreguliers, nbNouveaux,
  } = stats;

  const sujet = nom ? nom : "Cet ensemble";

  // --- Croissance numérique ---
  if (croissanceNette !== undefined && croissanceNette !== null) {
    if (croissanceNette > 0) phrases.push(`📈 ${sujet} est en croissance nette de ${croissanceNette} membre${croissanceNette > 1 ? "s" : ""} sur la période observée — c'est un signal encourageant à valoriser.`);
    else if (croissanceNette < 0) phrases.push(`📉 ${sujet} enregistre un recul net de ${Math.abs(croissanceNette)} membre${Math.abs(croissanceNette) > 1 ? "s" : ""} — il serait utile d'identifier les causes de départ avant que la tendance ne s'installe.`);
    else phrases.push(`${sujet} reste stable en nombre sur la période — ni croissance, ni décroissance nette.`);
  }

  // --- Présence ---
  if (tauxPresence !== undefined && tauxPresence !== null) {
    let phrase;
    if (tauxPresence >= 75) phrase = `Le taux de présence au culte est solide (${tauxPresence}%) — la mobilisation est au rendez-vous.`;
    else if (tauxPresence >= 50) phrase = `Le taux de présence au culte est moyen (${tauxPresence}%) — il y a une marge de progression réelle.`;
    else phrase = `Le taux de présence au culte est préoccupant (${tauxPresence}%) — plus de la moitié des membres sont absents en moyenne, une action de mobilisation s'impose.`;
    if (tauxPresencePrecedent !== undefined && tauxPresencePrecedent !== null) {
      const diff = tauxPresence - tauxPresencePrecedent;
      if (Math.abs(diff) >= 3) phrase += diff > 0 ? ` C'est une progression de ${Math.round(diff)} points par rapport à la période précédente.` : ` C'est une baisse de ${Math.round(Math.abs(diff))} points par rapport à la période précédente — à surveiller de près.`;
    }
    phrases.push(phrase);
  }

  // --- Santé spirituelle ---
  if (moyenneSante !== undefined && moyenneSante !== null) {
    let phrase;
    if (moyenneSante >= 7) phrase = `La santé spirituelle moyenne est bonne (${moyenneSante}/10) — les fondamentaux (prière, méditation, sanctification) semblent bien vécus.`;
    else if (moyenneSante >= 4) phrase = `La santé spirituelle moyenne est moyenne (${moyenneSante}/10) — un accompagnement plus rapproché pourrait faire la différence.`;
    else phrase = `La santé spirituelle moyenne est faible (${moyenneSante}/10) — c'est un point de vigilance pastorale prioritaire.`;
    if (moyenneSantePrecedente !== undefined && moyenneSantePrecedente !== null) {
      const diff = moyenneSante - moyenneSantePrecedente;
      if (Math.abs(diff) >= 0.5) phrase += diff > 0 ? ` Elle progresse par rapport à avant.` : ` Elle est en baisse par rapport à avant — un enseignement ciblé pourrait aider.`;
    }
    phrases.push(phrase);
  }

  // --- Rapports remplis ---
  if (tauxRapport !== undefined && tauxRapport !== null) {
    if (tauxRapport >= 80) phrases.push(`Les rapports hebdomadaires sont bien renseignés (${tauxRapport}%) — le suivi administratif est fiable.`);
    else if (tauxRapport < 50) phrases.push(`Seulement ${tauxRapport}% des rapports attendus ont été remplis — les données manquantes limitent la fiabilité de cette analyse, un rappel aux responsables serait utile.`);
  }

  // --- Suivi des nouveaux ---
  if (nbNouveaux !== undefined && nbNouveaux > 0) {
    if (tauxSuiviNouveaux !== undefined && tauxSuiviNouveaux !== null) {
      if (tauxSuiviNouveaux >= 60) phrases.push(`Sur les ${nbNouveaux} nouveau${nbNouveaux > 1 ? "x" : ""} converti${nbNouveaux > 1 ? "s" : ""}, une bonne proportion progresse déjà dans son parcours d'intégration (${tauxSuiviNouveaux}%).`);
      else phrases.push(`Sur les ${nbNouveaux} nouveau${nbNouveaux > 1 ? "x" : ""} converti${nbNouveaux > 1 ? "s" : ""}, seuls ${tauxSuiviNouveaux}% ont avancé au-delà de l'accueil — un suivi plus actif de cette cohorte est recommandé pour ne pas les perdre.`);
    }
  }

  // --- Membres à surveiller ---
  if (nbIrreguliers !== undefined && nbIrreguliers > 0) {
    phrases.push(`⚠️ ${nbIrreguliers} membre${nbIrreguliers > 1 ? "s" : ""} cumule${nbIrreguliers > 1 ? "nt" : ""} au moins 2 absences récentes — une visite ou un appel personnalisé est conseillé avant que l'éloignement ne s'installe.`);
  }

  if (phrases.length === 0) {
    phrases.push("Pas encore assez de données sur cette période pour une analyse fiable — reviens dans quelques semaines.");
  }

  return phrases;
}

// Affichage stylé du commentaire intelligent — réutilisable sur tous les rapports.
function CommentaireIntelligent({ stats, titre }) {
  const phrases = genererCommentaireIntelligent(stats);
  return (
    <div style={{ backgroundColor: "rgba(208,175,28,0.08)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <p style={{ fontWeight: 700, fontSize: 13, color: GOLD_LIGHT, marginBottom: 10 }}>{titre || "🧠 Analyse intelligente"}</p>
      <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {phrases.map((p, i) => (
          <p key={i} style={{ fontSize: 13, color: CREAM, margin: 0, lineHeight: 1.5 }}>{p}</p>
        ))}
      </div>
    </div>
  );
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
    const estAdmin = compte.role === "pasteur" || compte.assistant === true;

    if (estAdmin) {
      const { error } = await supabase.from("membres").delete().eq("id", membre.id);
      if (error) { toast("Suppression impossible : " + error.message, "erreur"); return; }
      toast(`${membre.nom} a été supprimé.`, "succes");
      journaliser(compte, "suppression_membre", membre.nom);
      if (onMisAJour) onMisAJour();
      return;
    }

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
    if (r === "mitigee") return "var(--gold-warn)";
    return RED_LIGHT;
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
            <a title="Appeler" href={`tel:${membre.telephone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>
              <IconeTelephone size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} /> {membre.telephone}
            </a>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {membre.nouveau_converti && (
              <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                <span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconePousse size={12} /> {LIBELLES_ETAPES[membre.etape_conversion || "accueil"]}</span>
              </span>
            )}
            {regularite?.tauxRegularite !== null && regularite?.tauxRegularite !== undefined && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", backgroundColor: TEAL_700, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                📊 {regularite.tauxRegularite}% de présence
              </span>
            )}
            {regularite?.absencesConsecutives >= 2 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: regularite.absencesConsecutives >= 3 ? "var(--red)" : "var(--gold-warn)" }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: regularite.absencesConsecutives >= 3 ? "var(--red)" : "var(--gold-warn)" }} />
                {regularite.absencesConsecutives} absences — Visite à faire
              </span>
            )}
            {regularite?.presencesConsecutives >= 4 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                ⭐ Régulier ({regularite.presencesConsecutives})
              </span>
            )}
            {estAnniversaireProche(membre.date_naissance) && (
              <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: "var(--gold-light)", borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
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
          <span style={{ color: "var(--text-secondary)", display: "inline-block", transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)", transform: ouvert ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        </div>
      </button>

      {ouvert && (
        <div className="fade-in" style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${TEAL_700}` }}>
          <div style={{ ...cardStyle, marginBottom: 14, padding: 14 }}>
            <p style={{ fontWeight: 600, fontSize: 12, color: GOLD_LIGHT, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}><IconeCrayon size={12} /> Informations du membre</p>
            <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Nom complet</label>
                  <input
                    value={editNom}
                    onChange={e => setEditNom(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: "100%", padding: 8, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Téléphone</label>
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
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Quartier</label>
                  <input
                    value={editQuartier}
                    onChange={e => setEditQuartier(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Non renseigné"
                    style={{ width: "100%", padding: 8, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>🎂 Date de naissance (jour et mois)</label>
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
                  {enregistrementInfos ? "…" : <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeEnregistrer size={14}/> Enregistrer les modifications</span>}
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
                  <span style={{display:"inline-flex",alignItems:"center",gap:5}}><IconePoubelle size={13}/> Demander la suppression</span>
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button
 className="btn-app"
 onClick={() => setSousOnglet("sante")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "sante" ? TEAL_700 : TEAL_900, color: sousOnglet === "sante" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>
              Santé spirituelle
            </button>
            <button
 className="btn-app"
 onClick={() => setSousOnglet("visites")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "visites" ? TEAL_700 : TEAL_900, color: sousOnglet === "visites" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>
              Journal des visites
            </button>
            {membre.nouveau_converti && (
              <button
 className="btn-app"
 onClick={() => setSousOnglet("parcours")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "parcours" ? TEAL_700 : TEAL_900, color: sousOnglet === "parcours" ? GOLD_LIGHT : "var(--text-secondary-2)" }}>
                Parcours
              </button>
            )}
          </div>

          {sousOnglet === "sante" ? (
            <>
              {historiquePresence && historiquePresence.length > 0 && (
                <div style={{ marginBottom: 16, padding: 10, backgroundColor: TEAL_900, borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>Présence — 8 derniers dimanches</p>
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
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Évalue chaque dimension de 0 (faible) à 10 (excellent).</p>
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
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Enregistrer une nouvelle visite</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {["positive", "mitigee", "sans_suite"].map(r => (
                    <button key={r} onClick={() => setResultatVisite(r)} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: resultatVisite === r ? GOLD : TEAL_900, color: resultatVisite === r ? TEAL_950 : "var(--text-secondary-2)" }}>
                      {libelleResultat(r)}
                    </button>
                  ))}
                </div>
                <textarea value={noteVisite} onChange={e => setNoteVisite(e.target.value)} rows={2} placeholder="Note sur la visite..." style={{ width: "100%", padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
                <button
 className="btn-app"
 onClick={enregistrerVisite} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Enregistrer la visite
                </button>
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Historique</p>
              {chargementVisites ? (
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Chargement…</p>
              ) : visites.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Aucune visite enregistrée pour l'instant.</p>
              ) : (
                <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {visites.map(v => (
                    <div key={v.id} style={{ backgroundColor: TEAL_900, borderRadius: 8, padding: 10, border: `1px solid ${TEAL_700}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: couleurResultat(v.resultat) }}>{libelleResultat(v.resultat)}</span>
                        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{new Date(v.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      {v.note && <p style={{ fontSize: 12 }}>{v.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>Étapes du parcours d'intégration de ce nouveau converti.</p>
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
                        backgroundColor: atteinte ? GOLD : TEAL_900, color: atteinte ? TEAL_950 : "var(--text-secondary)",
                      }}>
                        {atteinte ? "✓" : i + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: estActuelle ? 700 : 400, color: atteinte ? CREAM : "var(--text-secondary)" }}>
                        {LIBELLES_ETAPES[etape]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {(membre.etape_conversion || "accueil") !== "integre" ? (
                <button
 className="btn-app"
 onClick={avancerEtape} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
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
        (compte.role === "pasteur" || compte.assistant === true) ? (
          <BoiteConfirmation
            titre="Supprimer ce membre ?"
            message={`Es-tu sûr de vouloir supprimer définitivement "${membre.nom}" ? Cette action est irréversible (présence, santé spirituelle et visites seront aussi supprimées).`}
            texteConfirmer="Supprimer définitivement"
            dangereux
            onConfirmer={() => envoyerDemandeSuppression(null)}
            onAnnuler={() => setDemandeSuppressionOuverte(false)}
          />
        ) : (
          <BoiteDemandeSuppression
            nomMembre={membre.nom}
            onEnvoyer={envoyerDemandeSuppression}
            onAnnuler={() => setDemandeSuppressionOuverte(false)}
          />
        )
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
    if (roleDemande === "gem" && !nomGem.trim()) { setErreur("Merci de donner un nom au GEM."); return; }
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
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Ta demande de responsabilité a bien été enregistrée. Le Pasteur Dimitri Koffi, ou un assistant désigné, doit encore la valider{aDejaUneResponsabilite ? " avant qu'elle apparaisse dans ton espace" : " avant que tu puisses accéder à ton espace"}. Reviens un peu plus tard — cet écran se mettra à jour automatiquement une fois validée.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{aDejaUneResponsabilite ? "Demander un rôle supplémentaire" : "Demander une responsabilité"}</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
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
 onClick={envoyer} style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>
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
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{description}</p>
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

      // Un responsable GEM est aussi un membre de son propre GEM — on lui
      // crée directement sa fiche membre, sauf s'il en a déjà une (même
      // numéro de téléphone) quelque part dans ce GEM.
      const demandeur = comptesParId[d.compte_id];
      if (demandeur) {
        const chiffresDemandeur = (demandeur.telephone || "").replace(/[^\d]/g, "").slice(-8);
        const { data: membresExistants } = await supabase.from("membres").select("id, telephone").eq("gem_id", gemId);
        const dejaMembre = (membresExistants || []).some(m => m.telephone && m.telephone.replace(/[^\d]/g, "").slice(-8) === chiffresDemandeur);
        if (!dejaMembre) {
          await supabase.from("membres").insert({
            gem_id: gemId, nom: demandeur.nom, telephone: demandeur.telephone,
            quartier: demandeur.quartier || null, date_naissance: demandeur.date_naissance || null,
            nouveau_converti: false,
          });
        }
        // On garde aussi une copie légère du nom/téléphone du responsable
        // directement sur le GEM — ça évite de dépendre uniquement de la
        // jointure vers les comptes, qui peut être invisible pour certains
        // utilisateurs selon les règles de sécurité.
        await supabase.from("gems").update({ responsable_nom: demandeur.nom, responsable_telephone: demandeur.telephone }).eq("id", gemId);
      }
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
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucune demande en attente pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {demandes.map(d => (
            <div key={d.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{comptesParId[d.compte_id]?.nom || "…"}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{libelleDemande(d)}</p>
                <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{comptesParId[d.compte_id]?.telephone}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
 className="btn-app"
 onClick={() => valider(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Valider</button>
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
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><IconePoubelle size={20} /> Corbeille ({entrees.length})</h2>
        {entrees.length > 0 && (
          <button className="btn-app" onClick={exporterJournal} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            📊 Exporter le journal (CSV)
          </button>
        )}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Les membres supprimés restent récupérables ici pendant 30 jours avant d'être effacés définitivement.
      </p>
      {chargement ? (
        <Chargement />
      ) : entrees.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>La corbeille est vide.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entrees.map(e => (
            <div key={e.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 2 }}>{e.nom}</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nomGem(e.gem_id)} · {e.telephone}</p>
                  {e.motif && <p style={{ fontSize: 12, color: "var(--gold-warn)", marginTop: 4 }}>Motif de suppression : {e.motif}</p>}
                  <p style={{ fontSize: 11, color: RED_LIGHT, marginTop: 4, fontWeight: 700 }}>
                    ⏳ Effacement définitif dans {joursRestants(e.supprime_le)} jour(s)
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-app"
                    disabled={enCours === e.id}
                    onClick={() => restaurer(e)}
                    style={{ padding: "10px 16px", borderRadius: 10, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
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
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>❓ Aide</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        Un guide rapide pour utiliser l'application. Clique sur une question pour voir la réponse.
      </p>
      {toutesLesSections.map((section, si) => (
        <div key={si} style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: GOLD_LIGHT }}>{section.titre}</p>
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                    <span style={{ color: "var(--text-secondary)", flexShrink: 0, marginLeft: 10 }}>{estOuvert ? "▲" : "▼"}</span>
                  </button>
                  {estOuvert && (
                    <p className="fade-in" style={{ fontSize: 13, color: "var(--text-secondary-2)", lineHeight: 1.5, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${TEAL_700}` }}>
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
        <p style={{ fontSize: 13, color: "var(--text-secondary-2)", margin: 0 }}>
          Une question sans réponse ici ? Contacte le pasteur ou un assistant directement via la Messagerie.
        </p>
      </div>
    </div>
  );
}

/* --------------------------- Page Mon compte --------------------------- */

/* --------------------------- Page Analyse intelligente --------------------------- */

/* --------------------------- Santé spirituelle des responsables (pasteur) --------------------------- */

/* --------------------------- Suivi des nouveaux convertis (pasteur) --------------------------- */

const LIBELLES_ETAPES_SUIVI = { accueil: "Accueil", classe: "Classe de baptême", baptise: "Baptisé(e)", integre: "Intégré(e)" };

/* --------------------------- Page Membres (tous, unifiée) --------------------------- */

/* --------------------------- Page Absences (détail du dimanche) --------------------------- */

function PageAbsences({ compte, membres, gems, tribus, departements, regulariteParMembre, gemsAutorises, cardStyle }) {
  const [vueAbsences, setVueAbsences] = useState("hebdomadaire"); // hebdomadaire | mensuelle | annuelle
  const [chargement, setChargement] = useState(true);
  const [dimancheRecent, setDimancheRecent] = useState(null);
  const [motifsParMembre, setMotifsParMembre] = useState({});
  const [presentsIds, setPresentsIds] = useState(new Set());
  const [pageAbsents, setPageAbsents] = useState(1);
  const PAR_PAGE_ABSENTS = 20;
  const [courbeHebdo, setCourbeHebdo] = useState([]); // 12 derniers dimanches réellement pointés
  const [chargementMois, setChargementMois] = useState(true);
  const [presencesMoisCourant, setPresencesMoisCourant] = useState([]);
  const [dimanchesMoisCourant, setDimanchesMoisCourant] = useState([]);
  const [courbeMensuelle, setCourbeMensuelle] = useState([]); // 12 derniers mois
  const [chargementAnnee, setChargementAnnee] = useState(true);
  const [presencesAnneeCourante, setPresencesAnneeCourante] = useState([]);
  const [dimanchesAnneeCourante, setDimanchesAnneeCourante] = useState([]);
  const [courbeAnnuelle, setCourbeAnnuelle] = useState([]); // par année
  const [responsablesAbsents, setResponsablesAbsents] = useState([]); // responsables GEM absents ce dimanche

  const membresDuPerimetre = gemsAutorises ? membres.filter(m => gemsAutorises.includes(m.gem_id)) : membres;

  useEffect(() => { chargerDonnees(); }, [membresDuPerimetre.length]);
  useEffect(() => { if (vueAbsences === "mensuelle") chargerMensuel(); }, [vueAbsences, membresDuPerimetre.length]);
  useEffect(() => { if (vueAbsences === "annuelle") chargerAnnuel(); }, [vueAbsences, membresDuPerimetre.length]);

  async function chargerDonnees() {
    setChargement(true);
    // Cherche le dimanche le plus récent qui a réellement été pointé (au moins
    // une présence enregistrée) — pas juste la ligne "dimanches" la plus récente,
    // qui peut être une semaine créée automatiquement sans aucun pointage.
    const { data: dimanchesRecents } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(12);
    let dim = null, pres = [];
    const dimanchesReellementPointes = [];
    for (const d of dimanchesRecents || []) {
      const { data: p } = await supabase.from("presences").select("*").eq("dimanche_id", d.id).in("membre_id", membresDuPerimetre.map(m => m.id));
      if (p && p.length > 0) {
        dimanchesReellementPointes.push({ dimanche: d, presences: p });
        if (!dim) { dim = d; pres = p; }
      }
    }
    setDimancheRecent(dim);
    if (dim && membresDuPerimetre.length > 0) {
      const mapMotifs = {};
      const presents = new Set();
      pres.forEach(p => {
        if (p.present) presents.add(p.membre_id);
        else if (p.motif) mapMotifs[p.membre_id] = p.motif;
      });
      setMotifsParMembre(mapMotifs);
      setPresentsIds(presents);

      // Responsables GEM de ce périmètre — un responsable peut aussi être absent,
      // et cela doit être visible comme pour n'importe quel membre.
      const idsGemsConcernes = gemsAutorises || gems.map(g => g.id);
      const { data: assignationsGem } = await supabase.from("assignations").select("gem_id, compte_id").eq("role_demande", "gem").eq("statut", "actif").in("gem_id", idsGemsConcernes);
      if (assignationsGem && assignationsGem.length > 0) {
        const idsComptes = assignationsGem.map(a => a.compte_id);
        const [{ data: comptesResp }, { data: presencesResp }] = await Promise.all([
          supabase.from("comptes").select("*").in("id", idsComptes),
          supabase.from("presences_responsables_gem").select("*").eq("dimanche_id", dim.id).in("compte_id", idsComptes),
        ]);
        const idsPresentsResp = new Set((presencesResp || []).filter(p => p.present).map(p => p.compte_id));
        const absents = assignationsGem
          .filter(a => !idsPresentsResp.has(a.compte_id))
          .map(a => {
            const c = (comptesResp || []).find(cc => cc.id === a.compte_id);
            const g = gems.find(gg => gg.id === a.gem_id);
            return c ? { compte: c, gem: g } : null;
          })
          .filter(Boolean);
        setResponsablesAbsents(absents);
      } else {
        setResponsablesAbsents([]);
      }
    }

    // Courbe hebdomadaire : taux d'absence sur les 12 derniers dimanches réellement pointés
    const courbe = dimanchesReellementPointes.reverse().map(({ dimanche, presences: pres2 }) => {
      const idsPresents = new Set(pres2.filter(p => p.present).map(p => p.membre_id));
      const nbAbsents = membresDuPerimetre.filter(m => !idsPresents.has(m.id)).length;
      const taux = membresDuPerimetre.length > 0 ? Math.round((nbAbsents / membresDuPerimetre.length) * 100) : 0;
      return { date: dimanche.date, taux };
    });
    setCourbeHebdo(courbe);

    setChargement(false);
  }

  async function chargerMensuel() {
    setChargementMois(true);
    const moisActuel = new Date().toISOString().slice(0, 7);
    const { data: dimanchesTous } = await supabase.from("dimanches").select("*").order("date", { ascending: true });
    const idsMembres = membresDuPerimetre.map(m => m.id);

    // Regroupe tous les dimanches par mois, sur les 12 derniers mois où il y a des données
    const parMois = {};
    (dimanchesTous || []).forEach(d => {
      const cle = d.date.slice(0, 7);
      if (!parMois[cle]) parMois[cle] = [];
      parMois[cle].push(d.id);
    });
    const moisTries = Object.keys(parMois).sort().slice(-12);

    const courbe = [];
    for (const mois of moisTries) {
      const idsDim = parMois[mois];
      const { data: pres } = await supabase.from("presences").select("*").in("dimanche_id", idsDim).in("membre_id", idsMembres);
      if (!pres || pres.length === 0) continue; // mois jamais réellement pointé, on l'ignore
      const idsDimPointes = new Set(pres.map(p => p.dimanche_id));
      const nbDimPointes = idsDim.filter(id => idsDimPointes.has(id)).length;
      const slots = nbDimPointes * membresDuPerimetre.length;
      const presents = pres.filter(p => p.present).length;
      const taux = slots > 0 ? Math.round(((slots - presents) / slots) * 100) : 0;
      courbe.push({ mois, taux });
      if (mois === moisActuel) {
        setPresencesMoisCourant(pres);
        setDimanchesMoisCourant((dimanchesTous || []).filter(d => idsDim.includes(d.id)));
      }
    }
    setCourbeMensuelle(courbe);
    if (!courbe.some(c => c.mois === moisActuel)) { setPresencesMoisCourant([]); setDimanchesMoisCourant([]); }
    setChargementMois(false);
  }

  async function chargerAnnuel() {
    setChargementAnnee(true);
    const anneeActuelle = new Date().getFullYear().toString();
    const { data: dimanchesTous } = await supabase.from("dimanches").select("*").order("date", { ascending: true });
    const idsMembres = membresDuPerimetre.map(m => m.id);

    const parAnnee = {};
    (dimanchesTous || []).forEach(d => {
      const cle = d.date.slice(0, 4);
      if (!parAnnee[cle]) parAnnee[cle] = [];
      parAnnee[cle].push(d.id);
    });
    const anneesTriees = Object.keys(parAnnee).sort();

    const courbe = [];
    for (const annee of anneesTriees) {
      const idsDim = parAnnee[annee];
      const { data: pres } = await supabase.from("presences").select("*").in("dimanche_id", idsDim).in("membre_id", idsMembres);
      if (!pres || pres.length === 0) continue;
      const idsDimPointes = new Set(pres.map(p => p.dimanche_id));
      const nbDimPointes = idsDim.filter(id => idsDimPointes.has(id)).length;
      const slots = nbDimPointes * membresDuPerimetre.length;
      const presents = pres.filter(p => p.present).length;
      const taux = slots > 0 ? Math.round(((slots - presents) / slots) * 100) : 0;
      courbe.push({ annee, taux });
      if (annee === anneeActuelle) {
        setPresencesAnneeCourante(pres);
        setDimanchesAnneeCourante((dimanchesTous || []).filter(d => idsDim.includes(d.id)));
      }
    }
    setCourbeAnnuelle(courbe);
    if (!courbe.some(c => c.annee === anneeActuelle)) { setPresencesAnneeCourante([]); setDimanchesAnneeCourante([]); }
    setChargementAnnee(false);
  }

  function nomGem(gemId) { return gems.find(g => g.id === gemId)?.nom || "GEM inconnu"; }
  function gemDe(gemId) { return gems.find(g => g.id === gemId); }
  function provenance(gemId) {
    const g = gems.find(gg => gg.id === gemId);
    if (!g) return "";
    if (g.tribu_id) return `Tribu de ${tribus?.find(t => t.id === g.tribu_id)?.nom || "?"}`;
    if (g.departement_id) return `Département ${departements?.find(d => d.id === g.departement_id)?.nom || "?"}`;
    return "";
  }
  function nomTribuOuDept(gemId) {
    const g = gemDe(gemId);
    if (!g) return "Sans rattachement";
    if (g.tribu_id) return tribus?.find(t => t.id === g.tribu_id)?.nom || "?";
    if (g.departement_id) return departements?.find(d => d.id === g.departement_id)?.nom || "?";
    return "Sans rattachement";
  }

  // Un membre est "absent" pour ce dimanche s'il n'a pas été pointé présent
  // (non pointé du tout = considéré absent aussi).
  const absents = membresDuPerimetre
    .filter(m => !presentsIds.has(m.id))
    .map(m => ({ membre: m, absencesConsecutives: regulariteParMembre[m.id]?.absencesConsecutives || 0, motif: motifsParMembre[m.id] || "" }))
    .sort((a, b) => b.absencesConsecutives - a.absencesConsecutives);

  const totalPagesAbsents = Math.max(1, Math.ceil(absents.length / PAR_PAGE_ABSENTS));
  const absentsAffiches = absents.slice((pageAbsents - 1) * PAR_PAGE_ABSENTS, pageAbsents * PAR_PAGE_ABSENTS);

  useEffect(() => { setPageAbsents(1); }, [vueAbsences, dimancheRecent]);

  // --- GEM / département / tribu avec le plus grand taux d'absence (semaine en cours) ---
  function pireGemCalc() {
    const groupes = {};
    membresDuPerimetre.forEach(m => {
      const nomEntite = nomGem(m.gem_id);
      if (!nomEntite || nomEntite === "GEM inconnu") return;
      if (!groupes[nomEntite]) groupes[nomEntite] = { total: 0, absents: 0, gemId: m.gem_id };
      groupes[nomEntite].total++;
      if (!presentsIds.has(m.id)) groupes[nomEntite].absents++;
    });
    const liste = Object.entries(groupes)
      .map(([nom, v]) => ({ nom, taux: v.total > 0 ? Math.round((v.absents / v.total) * 100) : 0, total: v.total, gemId: v.gemId }))
      .filter(x => x.total >= 1)
      .sort((a, b) => b.taux - a.taux);
    return liste[0] || null;
  }

  function pireParType(type) {
    const groupes = {};
    membresDuPerimetre.forEach(m => {
      const g = gems.find(gg => gg.id === m.gem_id);
      if (!g || g.type !== type) return;
      const nomEntite = type === "tribu" ? tribus?.find(t => t.id === g.tribu_id)?.nom : departements?.find(d => d.id === g.departement_id)?.nom;
      if (!nomEntite) return;
      if (!groupes[nomEntite]) groupes[nomEntite] = { total: 0, absents: 0 };
      groupes[nomEntite].total++;
      if (!presentsIds.has(m.id)) groupes[nomEntite].absents++;
    });
    const liste = Object.entries(groupes)
      .map(([nom, v]) => ({ nom, taux: v.total > 0 ? Math.round((v.absents / v.total) * 100) : 0, total: v.total }))
      .filter(x => x.total >= 1)
      .sort((a, b) => b.taux - a.taux);
    return liste[0] || null;
  }

  const pireGem = pireGemCalc();
  const pireDepartement = pireParType("departement");
  const pireTribu = pireParType("tribu");

  if (chargement) return <ChargementSquelette lignes={5} />;

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}><IconeInterdit size={22} /> Absences</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["hebdomadaire", "Hebdomadaire"], ["mensuelle", "Mensuelle"], ["annuelle", "Annuelle"]].map(([cle, label]) => (
          <button key={cle} className="btn-app" onClick={() => setVueAbsences(cle)} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vueAbsences === cle ? GOLD : TEAL_900, color: vueAbsences === cle ? TEAL_950 : "var(--text-secondary-2)" }}>
            {label}
          </button>
        ))}
      </div>

      {vueAbsences === "hebdomadaire" && (
        <>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            {dimancheRecent ? `Dimanche ${new Date(dimancheRecent.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : "Aucun dimanche enregistré"} — {absents.length} absent(s) sur {membresDuPerimetre.length}
          </p>

          {(pireGem || pireDepartement || pireTribu) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
              {pireGem && pireGem.taux > 0 && (
                <div style={{ ...cardStyle, borderColor: RED_LIGHT }}>
                  <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>GEM le plus touché</p>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>{pireGem.nom}</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{provenance(pireGem.gemId)}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: RED_LIGHT }}>{pireGem.taux}% d'absence</p>
                </div>
              )}
              {pireDepartement && pireDepartement.taux > 0 && (
                <div style={{ ...cardStyle, borderColor: RED_LIGHT }}>
                  <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Département le plus touché</p>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>{pireDepartement.nom}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: RED_LIGHT }}>{pireDepartement.taux}% d'absence</p>
                </div>
              )}
              {pireTribu && pireTribu.taux > 0 && (
                <div style={{ ...cardStyle, borderColor: RED_LIGHT }}>
                  <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Tribu la plus touchée</p>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>{pireTribu.nom}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: RED_LIGHT }}>{pireTribu.taux}% d'absence</p>
                </div>
              )}
            </div>
          )}

          {courbeHebdo.length >= 2 && (
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📈 Évolution du taux d'absence — semaine après semaine</p>
              <GraphiqueCourbe
                couleur="var(--red)"
                donnees={courbeHebdo.map(c => ({
                  libelle: new Date(c.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                  valeur: c.taux,
                  texteAffiche: `${c.taux}%`,
                }))}
              />
            </div>
          )}

          {absents.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun absent pour l'instant — tout le monde est pointé présent. 🙏</p>
          ) : (
            <>
            <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {absentsAffiches.map(({ membre, absencesConsecutives, motif }) => (
                <div key={membre.id} style={{ ...cardStyle, borderColor: absencesConsecutives >= 2 ? RED_LIGHT : TEAL_700 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <p style={{ fontWeight: 700, marginBottom: 2 }}>{membre.nom}</p>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nomGem(membre.gem_id)} — {provenance(membre.gem_id)}</p>
                      {motif && <p style={{ fontSize: 12, color: GOLD_LIGHT, marginTop: 4 }}>Motif : {motif}</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {absencesConsecutives >= 1 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", backgroundColor: absencesConsecutives >= 2 ? RED_LIGHT : TEAL_700, borderRadius: 999, padding: "5px 10px" }}>
                          {absencesConsecutives} dimanche{absencesConsecutives > 1 ? "s" : ""} consécutif{absencesConsecutives > 1 ? "s" : ""}
                        </span>
                      )}
                      {membre.telephone && (
                        <>
                          <a title="Appeler" href={`tel:${membre.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}><IconeTelephone size={15} /></a>
                          <a
                            title="WhatsApp"
                            href={`https://wa.me/${numeroPourWhatsApp(membre.telephone)}?text=${encodeURIComponent(`Bonjour ${membre.nom}, tu nous as manqué au culte. Est-ce que tout va bien ? Nous t'aimons et espérons te revoir bientôt. 🙏

${signatureMessage(compte)}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                          ><IconeMessage size={15} /></a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPagesAbsents > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 16 }}>
                <button className="btn-app" disabled={pageAbsents === 1} onClick={() => setPageAbsents(p => p - 1)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, cursor: pageAbsents === 1 ? "not-allowed" : "pointer", opacity: pageAbsents === 1 ? 0.5 : 1 }}>← Précédent</button>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page {pageAbsents} / {totalPagesAbsents}</span>
                <button className="btn-app" disabled={pageAbsents === totalPagesAbsents} onClick={() => setPageAbsents(p => p + 1)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, cursor: pageAbsents === totalPagesAbsents ? "not-allowed" : "pointer", opacity: pageAbsents === totalPagesAbsents ? 0.5 : 1 }}>Suivant →</button>
              </div>
            )}
            </>
          )}

          {responsablesAbsents.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><IconePersonne size={14} /> Responsables GEM absents ce dimanche ({responsablesAbsents.length})</p>
              <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {responsablesAbsents.map(({ compte: c, gem }) => (
                  <div key={c.id} style={{ ...cardStyle, borderColor: RED_LIGHT }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, marginBottom: 2 }}>{c.nom} <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 8px", marginLeft: 4 }}><IconePersonne size={10} style={{verticalAlign:"-1px",marginRight:3}} /> Responsable</span></p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{gem?.nom || "GEM inconnu"} — {provenance(gem?.id)}</p>
                      </div>
                      {c.telephone && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <a title="Appeler" href={`tel:${c.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}><IconeTelephone size={15} /></a>
                          <a
                            title="WhatsApp"
                            href={`https://wa.me/${numeroPourWhatsApp(c.telephone)}?text=${encodeURIComponent(`Bonjour ${c.nom}, tu nous as manqué au culte. Est-ce que tout va bien ? 🙏

${signatureMessage(compte)}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                          ><IconeMessage size={15} /></a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {vueAbsences === "mensuelle" && (
        chargementMois ? <Chargement /> : (
          <>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              {dimanchesMoisCourant.length} dimanche(s) pointé(s) ce mois-ci
            </p>
            {courbeMensuelle.length >= 2 ? (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📈 Évolution du taux d'absence — mois après mois</p>
                <GraphiqueCourbe
                  couleur="var(--red)"
                  donnees={courbeMensuelle.map(c => {
                    const [annee, mois] = c.mois.split("-");
                    return {
                      libelle: new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short" }),
                      valeur: c.taux,
                      texteAffiche: `${c.taux}%`,
                    };
                  })}
                />
              </div>
            ) : (
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>Pas encore assez de mois pointés pour tracer une courbe.</p>
            )}
            <CommentaireIntelligent
              titre="🧠 Analyse intelligente du mois"
              stats={{ tauxPresence: courbeMensuelle.length > 0 ? 100 - courbeMensuelle[courbeMensuelle.length - 1].taux : null }}
            />
          </>
        )
      )}

      {vueAbsences === "annuelle" && (
        chargementAnnee ? <Chargement /> : (
          <>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              {dimanchesAnneeCourante.length} dimanche(s) pointé(s) cette année
            </p>
            {courbeAnnuelle.length >= 2 ? (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📈 Évolution du taux d'absence — année après année</p>
                <GraphiqueCourbe
                  couleur="var(--red)"
                  donnees={courbeAnnuelle.map(c => ({
                    libelle: c.annee,
                    valeur: c.taux,
                    texteAffiche: `${c.taux}%`,
                  }))}
                />
              </div>
            ) : (
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>Pas encore assez d'années pointées pour tracer une courbe.</p>
            )}
            <CommentaireIntelligent
              titre="🧠 Analyse intelligente de l'année"
              stats={{ tauxPresence: courbeAnnuelle.length > 0 ? 100 - courbeAnnuelle[courbeAnnuelle.length - 1].taux : null }}
            />
          </>
        )
      )}
    </div>
  );
}


function PageMembres({ compte, membres, gems, tribus, departements, gemsAutorises, regulariteParMembre, estPasteur, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [tousLesComptes, setTousLesComptes] = useState([]);
  const [assignationsActives, setAssignationsActives] = useState([]);
  const [santeMembres, setSanteMembres] = useState({});
  const [santeResponsables, setSanteResponsables] = useState({});
  const [absencesRecentes, setAbsencesRecentes] = useState({}); // { membre_id: nb absences sur 4 derniers dimanches }
  const [motifsRecents, setMotifsRecents] = useState({}); // { membre_id: dernier motif d'absence connu }
  const [recherche, setRecherche] = useState("");
  const [filtreIrreguliers, setFiltreIrreguliers] = useState(false);
  const [filtreRole, setFiltreRole] = useState(""); // "" | membre | gem | departement_resp | tribu_resp
  const [personneOuverte, setPersonneOuverte] = useState(null);
  const [vueBoss, setVueBoss] = useState(false);
  const [filtreBossIrreguliers, setFiltreBossIrreguliers] = useState(false);
  const [bossOuvert, setBossOuvert] = useState(null);
  const [bossASupprimerDuStatut, setBossASupprimerDuStatut] = useState(null);
  const [retraitBossEnCours, setRetraitBossEnCours] = useState(false);

  async function confirmerRetraitBoss() {
    setRetraitBossEnCours(true);
    const idsAsupprimer = bossASupprimerDuStatut.fichesDept.map(m => m.id);
    const { error } = await supabase.from("membres").delete().in("id", idsAsupprimer);
    setRetraitBossEnCours(false);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast(`${bossASupprimerDuStatut.nom} a été retiré(e) du statut BOSS.`, "succes");
    journaliser(compte, "retrait_boss", bossASupprimerDuStatut.nom);
    setBossASupprimerDuStatut(null);
    setBossOuvert(null);
    chargerTout();
  }
  const [membreASupprimer, setMembreASupprimer] = useState(null);
  const [motifSuppression, setMotifSuppression] = useState("");
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  async function confirmerSuppressionMembre() {
    setSuppressionEnCours(true);
    if (estPasteur) {
      const { error } = await supabase.from("membres").delete().eq("id", membreASupprimer.membreId);
      setSuppressionEnCours(false);
      setMembreASupprimer(null);
      if (error) { toast("Suppression impossible : " + error.message, "erreur"); return; }
      toast(`${membreASupprimer.nom} a été supprimé.`, "succes");
      journaliser(compte, "suppression_membre", membreASupprimer.nom);
    } else {
      const { error } = await supabase.from("demandes_suppression_membre").insert({
        membre_id: membreASupprimer.membreId,
        membre_nom: membreASupprimer.nom,
        demande_par: compte?.id || null,
        motif: motifSuppression.trim() || "Aucun motif renseigné",
        statut: "attente",
      });
      setSuppressionEnCours(false);
      setMembreASupprimer(null);
      setMotifSuppression("");
      if (error) { toast("Erreur : " + error.message, "erreur"); return; }
      toast(`✓ Demande de suppression de ${membreASupprimer.nom} envoyée au pasteur pour validation.`, "succes");
    }
  }

  const [pageResultats, setPageResultats] = useState(1);
  const PAR_PAGE_MEMBRES = 25;

  useEffect(() => { setPageResultats(1); }, [recherche, filtreRole, filtreIrreguliers, vueBoss]);
  const [editionResponsableOuverte, setEditionResponsableOuverte] = useState(false);
  const [confirmerRetraitResponsable, setConfirmerRetraitResponsable] = useState(false);
  const [retraitEnCours, setRetraitEnCours] = useState(false);

  const membresDuPerimetre = gemsAutorises ? membres.filter(m => gemsAutorises.includes(m.gem_id)) : membres;

  // BOSS n'a de sens qu'au niveau des départements — un responsable de tribu
  // (dont le périmètre ne contient aucun GEM de type "département") ne doit
  // jamais voir cette notion, uniquement le nombre de membres de sa tribu.
  const perimetreEstTribuUniquement = gemsAutorises && gemsAutorises.length > 0 && gems.filter(g => gemsAutorises.includes(g.id)).every(g => g.type === "tribu");

  useEffect(() => { chargerTout(); }, [membresDuPerimetre.length]);

  async function chargerTout() {
    setChargement(true);
    const [{ data: comptes }, { data: assignations }, { data: dimanchesRecents }] = await Promise.all([
      supabase.from("comptes").select("*"),
      supabase.from("assignations").select("*").eq("statut", "actif"),
      supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(4),
    ]);
    setTousLesComptes(comptes || []);
    setAssignationsActives(assignations || []);

    if (membresDuPerimetre.length > 0) {
      const { data: sante } = await supabase.from("sante_spirituelle").select("*").in("membre_id", membresDuPerimetre.map(m => m.id)).order("date_maj", { ascending: false });
      const mapS = {};
      (sante || []).forEach(s => { if (!mapS[s.membre_id]) mapS[s.membre_id] = s; });
      setSanteMembres(mapS);

      if (dimanchesRecents && dimanchesRecents.length > 0) {
        const { data: presencesRecentes } = await supabase.from("presences").select("*").in("dimanche_id", dimanchesRecents.map(d => d.id)).in("membre_id", membresDuPerimetre.map(m => m.id));
        // Ne compte que les dimanches réellement pointés (au moins une présence enregistrée
        // ce jour-là) — un dimanche sans aucun pointage n'est pas compté comme "absence".
        const idsDimanchesPointes = new Set((presencesRecentes || []).map(p => p.dimanche_id));
        const dimanchesReels = dimanchesRecents.filter(d => idsDimanchesPointes.has(d.id));
        const mapAbs = {};
        membresDuPerimetre.forEach(m => {
          const pointages = (presencesRecentes || []).filter(p => p.membre_id === m.id);
          const absences = dimanchesReels.filter(d => {
            const p = pointages.find(pp => pp.dimanche_id === d.id);
            return !p || !p.present;
          }).length;
          mapAbs[m.id] = { absences, total: dimanchesReels.length };
        });
        setAbsencesRecentes(mapAbs);

        // Dernier motif d'absence connu, par membre (le plus récent dimanche avec un motif renseigné)
        const mapMotifs = {};
        [...presencesRecentes || []].sort((a, b) => {
          const da = dimanchesReels.find(d => d.id === a.dimanche_id)?.date || "";
          const db = dimanchesReels.find(d => d.id === b.dimanche_id)?.date || "";
          return db.localeCompare(da);
        }).forEach(p => {
          if (!p.present && p.motif && !mapMotifs[p.membre_id]) mapMotifs[p.membre_id] = p.motif;
        });
        setMotifsRecents(mapMotifs);
      }
    }

    const idsComptesResp = (comptes || []).filter(c => (assignations || []).some(a => a.compte_id === c.id && a.role_demande === "gem")).map(c => c.id);
    if (idsComptesResp.length > 0) {
      const { data: santeResp } = await supabase.from("sante_spirituelle_responsables").select("*").in("compte_id", idsComptesResp).order("date_maj", { ascending: false });
      const mapSR = {};
      (santeResp || []).forEach(s => { if (!mapSR[s.compte_id]) mapSR[s.compte_id] = s; });
      setSanteResponsables(mapSR);
    }

    setChargement(false);
  }

  function gemDe(gemId) { return gems.find(g => g.id === gemId); }
  function nomTribuOuDept(gem) {
    if (!gem) return "";
    if (gem.tribu_id) return `Tribu de ${tribus.find(t => t.id === gem.tribu_id)?.nom || "?"}`;
    if (gem.departement_id) return `Département ${departements.find(d => d.id === gem.departement_id)?.nom || "?"}`;
    return "";
  }

  // Construit la liste unifiée : membres + responsables (GEM, département, tribu),
  // en FUSIONNANT une même personne (compte) qui aurait plusieurs rôles/GEM en une seule fiche.
  const idsGemsAutorises = gemsAutorises ? new Set(gemsAutorises) : null;

  const personnesMembres = membresDuPerimetre.map(m => ({
    typePrincipal: "membre", types: ["membre"], id: `membre-${m.id}`, membreId: m.id, nom: m.nom, telephone: m.telephone, quartier: m.quartier,
    photo: m.photo, dateNaissance: m.date_naissance, roles: [{ type: "membre", gem: gemDe(m.gem_id) }], data: m,
  }));

  const assignationsFiltrees = assignationsActives
    .filter(a => {
      // Un responsable de département ou de tribu ne doit voir QUE les
      // responsables GEM sous lui — jamais un autre responsable de département
      // ou de tribu, qui n'a structurellement rien à faire dans sa liste.
      if (idsGemsAutorises) return a.role_demande === "gem";
      return ["gem", "departement_resp", "tribu_resp"].includes(a.role_demande); // pasteur/assistant : vue complète
    })
    .filter(a => {
      if (!idsGemsAutorises) return true; // pasteur/assistant : tout le monde
      return idsGemsAutorises.has(a.gem_id);
    });

  const parCompte = {};
  assignationsFiltrees.forEach(a => {
    const c = tousLesComptes.find(cc => cc.id === a.compte_id);
    if (!c) return;
    if (!parCompte[c.id]) parCompte[c.id] = { compte: c, roles: [] };
    parCompte[c.id].roles.push({
      type: a.role_demande,
      assignationId: a.id,
      gem: a.role_demande === "gem" ? gemDe(a.gem_id) : null,
      tribuNom: a.tribu_id ? tribus.find(t => t.id === a.tribu_id)?.nom : null,
      deptNom: a.departement_id ? departements.find(d => d.id === a.departement_id)?.nom : null,
    });
  });

  const personnesResponsables = Object.values(parCompte).map(({ compte: c, roles }) => ({
    typePrincipal: roles[0].type, types: roles.map(r => r.type), id: `compte-${c.id}`, compteId: c.id,
    nom: c.nom, telephone: c.telephone, quartier: c.quartier, photo: null, dateNaissance: c.date_naissance,
    roles, data: c,
  }));

  // Fusionne une même personne présente à la fois comme membre suivi ET comme
  // responsable (même numéro de téléphone), pour n'avoir qu'une seule fiche.
  // Ne garde que le premier numéro si le champ en contient plusieurs, et
  // ignore les numéros trop courts — évite les faux rapprochements.
  function chiffresNumero(tel) {
    const premier = (tel || "").split(/[\/,;]/)[0];
    const chiffres = premier.replace(/[^\d]/g, "");
    return chiffres.length >= 8 ? chiffres.slice(-9) : "";
  }
  const toutesLesPersonnes = [];
  const responsablesUtilises = new Set();
  personnesMembres.forEach(pm => {
    const correspondant = personnesResponsables.find(pr => !responsablesUtilises.has(pr.id) && chiffresNumero(pr.telephone) && chiffresNumero(pr.telephone) === chiffresNumero(pm.telephone));
    if (correspondant) {
      responsablesUtilises.add(correspondant.id);
      toutesLesPersonnes.push({
        ...pm,
        types: [...pm.types, ...correspondant.types],
        roles: [...pm.roles, ...correspondant.roles],
        compteId: correspondant.compteId,
        quartier: pm.quartier || correspondant.quartier,
        dateNaissance: pm.dateNaissance || correspondant.dateNaissance,
      });
    } else {
      toutesLesPersonnes.push(pm);
    }
  });
  personnesResponsables.forEach(pr => { if (!responsablesUtilises.has(pr.id)) toutesLesPersonnes.push(pr); });

  // --- BOSS ("Bon Ouvrier au Service du Seigneur") ---
  const listeBoss = calculerListeBoss(membresDuPerimetre, gems, tribus, departements, regulariteParMembre, assignationsActives, tousLesComptes);

  const bossIrreguliers = listeBoss.filter(b => b.absencesConsecutives >= 2).sort((a, b) => b.absencesConsecutives - a.absencesConsecutives);

  const resultatsBoss = (filtreBossIrreguliers ? bossIrreguliers : listeBoss)
    .filter(b => b.nom.toLowerCase().includes(recherche.toLowerCase()));

  function libelleRole(type) {
    if (type === "membre") return "Membre";
    if (type === "gem") return "Responsable GEM";
    if (type === "departement_resp") return "Responsable Département";
    if (type === "tribu_resp") return "Patriarche/Matriarche";
    return type;
  }

  function libelleRoles(personne) {
    return personne.roles.map(r => {
      if (r.type === "gem") return `Responsable GEM${r.gem ? ` (${r.gem.nom})` : ""}`;
      if (r.type === "departement_resp") return `Responsable Département${r.deptNom ? ` (${r.deptNom})` : ""}`;
      if (r.type === "tribu_resp") return `Patriarche/Matriarche${r.tribuNom ? ` (${r.tribuNom})` : ""}`;
      return "Membre";
    }).join(" · ");
  }

  const resultats = toutesLesPersonnes
    .filter(p => p.nom.toLowerCase().includes(recherche.toLowerCase()))
    .filter(p => !filtreRole || p.types.includes(filtreRole))
    .filter(p => !filtreIrreguliers || (p.types.includes("membre") && (absencesRecentes[p.membreId]?.absences || 0) >= 2));

  const totalPagesResultats = Math.max(1, Math.ceil(resultats.length / PAR_PAGE_MEMBRES));
  const resultatsAffiches = resultats.slice((pageResultats - 1) * PAR_PAGE_MEMBRES, pageResultats * PAR_PAGE_MEMBRES);

  if (chargement) return <ChargementSquelette lignes={6} />;

  if (bossOuvert) {
    const b = bossOuvert;
    const numeroWhatsApp = numeroPourWhatsApp(b.telephone);
    const ficheIrreguliere = b.fiches.find(m => (regulariteParMembre?.[m.id]?.absencesConsecutives || 0) >= 2);
    const motifIrregularite = ficheIrreguliere ? (motifsRecents?.[ficheIrreguliere.id] || "") : "";
    const fichesDept = b.fiches.filter(m => gems.find(g => g.id === m.gem_id)?.type === "departement");
    return (
      <div>
        <button className="btn-app" onClick={() => setBossOuvert(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour à la liste</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <AvatarInitiales nom={b.nom} taille={64} />
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{b.nom}</p>
            <p style={{ fontSize: 12, color: GOLD_LIGHT, margin: 0, display: "flex", alignItems: "center", gap: 5 }}><IconeEtoile size={12} /> BOSS — Bon Ouvrier au Service du Seigneur</p>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Téléphone</span><span style={{ fontSize: 13, fontWeight: 600 }}>{b.telephone || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Quartier</span><span style={{ fontSize: 13, fontWeight: 600 }}>{b.quartier || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>🎂 Anniversaire</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{b.dateNaissance ? new Date(b.dateNaissance + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "—"}</span>
            </div>
            {b.nomTribu && (
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Tribu</span><span style={{ fontSize: 13, fontWeight: 600 }}>{b.nomTribu}</span></div>
            )}
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>Sert dans {b.services.length} département{b.services.length > 1 ? "s" : ""}</p>
              {b.services.map((s, i) => (
                <p key={i} style={{ fontSize: 13, fontWeight: 600, margin: "2px 0" }}>• {s.nom}{s.gemNom ? ` (${s.gemNom})` : ""}</p>
              ))}
            </div>
            {b.tauxMoyen !== null && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}><IconeGraphique size={13} /> Taux de régularité moyen</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: b.tauxMoyen >= 70 ? "var(--green-success)" : b.tauxMoyen >= 40 ? GOLD_LIGHT : RED_LIGHT }}>{b.tauxMoyen}%</span>
              </div>
            )}
            {b.absencesConsecutives >= 2 && (
              <div style={{ ...cardStyle, borderColor: RED_LIGHT, marginTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: RED_LIGHT, margin: 0, display: "flex", alignItems: "center", gap: 6 }}><IconeAlerte size={13} /> {b.absencesConsecutives} cultes consécutifs manqués</p>
                {motifIrregularite && <p style={{ fontSize: 12, color: GOLD_LIGHT, margin: "6px 0 0 0" }}>Motif : {motifIrregularite}</p>}
              </div>
            )}
          </div>
        </div>

        {b.telephone && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <a href={`tel:${b.telephone}`} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, backgroundColor: GOLD_LIGHT, color: TEAL_950, fontWeight: 700, textDecoration: "none", fontSize: 14 }}><IconeTelephone size={15} /> Appeler</a>
            <a href={`https://wa.me/${numeroWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, backgroundColor: "#25D366", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 14 }}><IconeMessage size={15} /> WhatsApp</a>
          </div>
        )}

        {fichesDept.length > 0 && estPasteur && (
          <button
            className="btn-app"
            onClick={() => setBossASupprimerDuStatut({ ...b, fichesDept })}
            style={{ width: "100%", padding: "10px 0", borderRadius: 9, backgroundColor: "transparent", border: `1px solid ${RED_LIGHT}`, color: RED_LIGHT, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <IconePoubelle size={13} /> Retirer du statut BOSS
          </button>
        )}
      </div>
    );
  }

  if (personneOuverte) {
    const p = personneOuverte;
    const numeroWhatsApp = numeroPourWhatsApp(p.telephone);
    const estMembre = p.types.includes("membre");
    const estRespGem = p.types.includes("gem");
    const sante = estMembre ? santeMembres[p.membreId] : (estRespGem ? santeResponsables[p.compteId] : null);
    const moyenne = sante ? moyenneSante(sante) : null;
    const regularite = estMembre ? regulariteParMembre[p.membreId] : null;
    const roleAGerer = (p.roles || []).find(r => r.type === "departement_resp" || r.type === "tribu_resp");

    async function retirerCetteResponsabilite() {
      if (!roleAGerer) return;
      setRetraitEnCours(true);
      const { error } = await supabase.from("assignations").delete().eq("id", roleAGerer.assignationId);
      setRetraitEnCours(false);
      setConfirmerRetraitResponsable(false);
      if (error) { toast("Impossible de retirer cette responsabilité : " + error.message, "erreur"); return; }
      toast(`${p.nom} n'est plus ${roleAGerer.type === "tribu_resp" ? "patriarche/matriarche" : "responsable de département"}.`, "succes");
      setPersonneOuverte(null);
      chargerTout();
    }

    return (
      <div>
        <button className="btn-app" onClick={() => setPersonneOuverte(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour à la liste</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          {p.photo ? (
            <img src={p.photo} alt={p.nom} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}` }} />
          ) : (
            <AvatarInitiales nom={p.nom} taille={64} />
          )}
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{p.nom}</p>
            <p style={{ fontSize: 12, color: GOLD_LIGHT, margin: 0 }}>{libelleRoles(p)}</p>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Téléphone</span><span style={{ fontSize: 13, fontWeight: 600 }}>{p.telephone || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Quartier</span><span style={{ fontSize: 13, fontWeight: 600 }}>{p.quartier || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>🎂 Anniversaire</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.dateNaissance ? new Date(p.dateNaissance + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "—"}</span>
            </div>

            {p.roles.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  {r.type === "membre" ? "GEM" : r.type === "gem" ? "Responsable de" : r.type === "departement_resp" ? "Département" : "Tribu"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {r.type === "membre" ? (r.gem?.nom || "—") + (nomTribuOuDept(r.gem) ? ` (${nomTribuOuDept(r.gem)})` : "") :
                    r.type === "gem" ? (r.gem?.nom || "—") + (r.gem && nomTribuOuDept(r.gem) ? ` (${nomTribuOuDept(r.gem)})` : "") :
                    r.type === "departement_resp" ? (r.deptNom || "—") : (r.tribuNom || "—")}
                </span>
              </div>
            ))}

            {estMembre && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Absences (dimanches pointés)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: (absencesRecentes[p.membreId]?.absences || 0) >= 2 ? RED_LIGHT : "var(--green-success)" }}>{absencesRecentes[p.membreId]?.absences || 0} / {absencesRecentes[p.membreId]?.total || 0}</span>
              </div>
            )}
            {estMembre && regularite && regularite.tauxRegularite !== null && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}><IconeGraphique size={13} /> Taux de régularité au culte</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: regularite.tauxRegularite >= 70 ? "var(--green-success)" : regularite.tauxRegularite >= 40 ? GOLD_LIGHT : RED_LIGHT }}>{regularite.tauxRegularite}%</span>
              </div>
            )}
            {moyenne !== null && (
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>🌡️ Santé spirituelle</span><span style={{ fontSize: 13, fontWeight: 700, color: couleurScore(moyenne) }}>{moyenne}/10</span></div>
            )}
          </div>
        </div>

        {p.telephone && (
          <div style={{ display: "flex", gap: 10, marginBottom: estPasteur && roleAGerer ? 10 : 0 }}>
            <a href={`tel:${p.telephone}`} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, backgroundColor: GOLD_LIGHT, color: TEAL_950, fontWeight: 700, textDecoration: "none", fontSize: 14 }}><IconeTelephone size={15} /> Appeler</a>
            <a href={`https://wa.me/${numeroWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, backgroundColor: "#25D366", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 14 }}><IconeMessage size={15} /> WhatsApp</a>
          </div>
        )}

        {estPasteur && roleAGerer && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-app" onClick={() => setEditionResponsableOuverte(true)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 13, cursor: "pointer" }}><IconeCrayon size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Modifier ses infos</button>
            <button className="btn-app" onClick={() => setConfirmerRetraitResponsable(true)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, backgroundColor: RED_LIGHT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><IconePoubelle size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Retirer cette responsabilité</button>
          </div>
        )}

        {editionResponsableOuverte && (
          <EditionResponsableGem
            compteResponsable={p.data}
            onFerme={() => setEditionResponsableOuverte(false)}
            onEnregistre={() => { setEditionResponsableOuverte(false); setPersonneOuverte(null); chargerTout(); }}
          />
        )}

        {confirmerRetraitResponsable && (
          <BoiteConfirmation
            titre="Retirer cette responsabilité ?"
            message={`Es-tu sûr de vouloir retirer "${p.nom}" de ${roleAGerer?.type === "tribu_resp" ? "sa responsabilité de patriarche/matriarche" : "sa responsabilité de département"} ? Son compte de connexion restera actif, mais il perdra cet accès.`}
            texteConfirmer={retraitEnCours ? "…" : "Retirer"}
            dangereux
            onConfirmer={retirerCetteResponsabilite}
            onAnnuler={() => setConfirmerRetraitResponsable(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}><IconeGroupe size={22} /> Membres</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{toutesLesPersonnes.length} personne(s) — membres et responsables confondus.</p>

      <input
        value={recherche}
        onChange={e => setRecherche(e.target.value)}
        placeholder="🔍 Rechercher par nom..."
        style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}`, marginBottom: 12, width: "100%", maxWidth: 320 }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {perimetreEstTribuUniquement ? (
          <span style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${GOLD}`, backgroundColor: "transparent", color: GOLD_LIGHT, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconeGroupe size={14} /> Membres ({toutesLesPersonnes.length})
          </span>
        ) : (
          <button className="btn-app" onClick={() => { setVueBoss(v => !v); setFiltreBossIrreguliers(false); }} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${GOLD}`, cursor: "pointer", backgroundColor: vueBoss ? GOLD : "transparent", color: vueBoss ? TEAL_950 : GOLD_LIGHT }}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeEtoile size={14}/> BOSS ({listeBoss.length})</span>
          </button>
        )}
        {!vueBoss && (
          <>
            <button className="btn-app" onClick={() => setFiltreIrreguliers(v => !v)} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${RED_LIGHT}`, cursor: "pointer", backgroundColor: filtreIrreguliers ? RED_LIGHT : "transparent", color: filtreIrreguliers ? "#fff" : RED_LIGHT }}>
              ⚠️ Membres irréguliers (2+ absences / 4 dimanches)
            </button>
            {(estPasteur ? ["", "membre", "gem", "departement_resp", "tribu_resp"] : ["", "membre", "gem"]).map(r => (
              <button key={r} className="btn-app" onClick={() => setFiltreRole(r)} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${TEAL_600}`, cursor: "pointer", backgroundColor: filtreRole === r ? GOLD : "transparent", color: filtreRole === r ? TEAL_950 : "var(--text-secondary-2)" }}>
                {r === "" ? "Tous" : libelleRole(r)}
              </button>
            ))}
          </>
        )}
        {vueBoss && (
          <button className="btn-app" onClick={() => setFiltreBossIrreguliers(v => !v)} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${RED_LIGHT}`, cursor: "pointer", backgroundColor: filtreBossIrreguliers ? RED_LIGHT : "transparent", color: filtreBossIrreguliers ? "#fff" : RED_LIGHT }}>
            ⚠️ BOSS irréguliers ({bossIrreguliers.length})
          </button>
        )}
      </div>

      {vueBoss ? (
        resultatsBoss.length === 0 ? (
          <EtatVide icone={IconeEtoile} titre="Aucun BOSS trouvé" description="Les BOSS sont les membres inscrits dans un GEM de type département." />
        ) : (
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resultatsBoss.map(b => (
              <button key={b.id} className="btn-app card-app" onClick={() => setBossOuvert(b)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderColor: b.absencesConsecutives >= 2 ? RED_LIGHT : cardStyle.border }}>
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{b.nom}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                    {b.nomTribu ? `Tribu de ${b.nomTribu} · ` : ""}{b.services.map(s => s.nom).join(", ")}
                  </p>
                  {b.absencesConsecutives >= 2 && (() => {
                    const ficheIrr = b.fiches.find(m => (regulariteParMembre?.[m.id]?.absencesConsecutives || 0) >= 2);
                    const motif = ficheIrr ? motifsRecents?.[ficheIrr.id] : "";
                    return motif ? <p style={{ fontSize: 11, color: GOLD_LIGHT, margin: "2px 0 0 0" }}>Motif : {motif}</p> : null;
                  })()}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {b.tauxMoyen !== null && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px",
                      color: b.tauxMoyen >= 40 ? TEAL_950 : "#fff",
                      backgroundColor: b.tauxMoyen >= 70 ? "var(--green-success)" : b.tauxMoyen >= 40 ? GOLD_LIGHT : RED_LIGHT,
                    }}>
                      📊 {b.tauxMoyen}%
                    </span>
                  )}
                  {b.absencesConsecutives >= 2 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: b.absencesConsecutives >= 3 ? "var(--red)" : "var(--gold-warn)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: b.absencesConsecutives >= 3 ? "var(--red)" : "var(--gold-warn)" }} />
                      {b.absencesConsecutives} cultes ratés
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : resultats.length === 0 ? (
        <EtatVide illustration="recherche" titre="Aucune personne trouvée" />
      ) : (
        <>
        <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {resultatsAffiches.map(p => {
            const tauxReg = p.types.includes("membre") ? regulariteParMembre?.[p.membreId]?.tauxRegularite : null;
            return (
              <button key={p.id} className="btn-app card-app" onClick={() => setPersonneOuverte(p)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {p.photo ? (
                  <img src={p.photo} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <AvatarInitiales nom={p.nom} taille={40} />
                )}
                <div style={{ flex: 1, minWidth: 100 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{p.nom}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{libelleRoles(p)}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {tauxReg !== null && tauxReg !== undefined && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px",
                      color: tauxReg >= 40 ? TEAL_950 : "#fff",
                      backgroundColor: tauxReg >= 70 ? "var(--green-success)" : tauxReg >= 40 ? GOLD_LIGHT : RED_LIGHT,
                    }}>
                      📊 {tauxReg}%
                    </span>
                  )}
                  {p.types.includes("membre") && (absencesRecentes[p.membreId]?.absences || 0) >= 2 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: (absencesRecentes[p.membreId].absences >= 3) ? "var(--red)" : "var(--gold-warn)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: (absencesRecentes[p.membreId].absences >= 3) ? "var(--red)" : "var(--gold-warn)" }} />
                      {absencesRecentes[p.membreId].absences}/{absencesRecentes[p.membreId].total}
                    </span>
                  )}
                  {p.types.includes("membre") && (
                    <span
                      title={estPasteur ? "Supprimer ce membre" : "Demander la suppression de ce membre"}
                      onClick={e => { e.stopPropagation(); setMembreASupprimer(p); }}
                      style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: "var(--bg-base)", border: "1px solid var(--red)", color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                    >
                      <IconePoubelle size={13} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {totalPagesResultats > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 20 }}>
            <button className="btn-app" disabled={pageResultats === 1} onClick={() => setPageResultats(p => p - 1)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, cursor: pageResultats === 1 ? "not-allowed" : "pointer", opacity: pageResultats === 1 ? 0.5 : 1 }}>← Précédent</button>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page {pageResultats} / {totalPagesResultats}</span>
            <button className="btn-app" disabled={pageResultats === totalPagesResultats} onClick={() => setPageResultats(p => p + 1)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, cursor: pageResultats === totalPagesResultats ? "not-allowed" : "pointer", opacity: pageResultats === totalPagesResultats ? 0.5 : 1 }}>Suivant →</button>
          </div>
        )}
        </>
      )}

      {membreASupprimer && !estPasteur && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "var(--overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: TEAL_950, border: "1px solid rgba(226,119,123,0.4)", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
            <p className="titre-moisson" style={{ fontWeight: 600, fontSize: 18, marginBottom: 10, color: CREAM }}>Demander la suppression de {membreASupprimer.nom}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.55 }}>
              Cette demande sera envoyée au pasteur pour validation — le membre ne sera pas retiré immédiatement.
            </p>
            <textarea
              value={motifSuppression}
              onChange={e => setMotifSuppression(e.target.value)}
              rows={3}
              placeholder="Motif de la suppression (recommandé)..."
              style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical", fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
              <button className="btn-app" onClick={() => { setMembreASupprimer(null); setMotifSuppression(""); }} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              <button className="btn-app" disabled={suppressionEnCours} onClick={confirmerSuppressionMembre} style={{ padding: "10px 18px", borderRadius: 9, backgroundColor: "#E2777B", backgroundImage: "linear-gradient(135deg, #ea9a9d, #E2777B)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(226,119,123,0.3)" }}>
                {suppressionEnCours ? "…" : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}

      {membreASupprimer && estPasteur && (
        <BoiteConfirmation
          titre="Supprimer ce membre ?"
          message={`Es-tu sûr de vouloir supprimer définitivement "${membreASupprimer.nom}" ? Cette action est irréversible.`}
          texteConfirmer={suppressionEnCours ? "…" : "Supprimer définitivement"}
          dangereux
          onConfirmer={confirmerSuppressionMembre}
          onAnnuler={() => setMembreASupprimer(null)}
        />
      )}

      {bossASupprimerDuStatut && (
        <BoiteConfirmation
          titre="Retirer du statut BOSS ?"
          message={`"${bossASupprimerDuStatut.nom}" sera retiré(e) de ${bossASupprimerDuStatut.fichesDept.length > 1 ? "ces GEM de département" : "ce GEM de département"} : ${bossASupprimerDuStatut.fichesDept.map(m => gems.find(g => g.id === m.gem_id)?.nom).join(", ")}. Il/elle restera membre ailleurs si c'est le cas (ex : dans sa tribu). Cette action est irréversible.`}
          texteConfirmer={retraitBossEnCours ? "…" : "Retirer du statut BOSS"}
          dangereux
          onConfirmer={confirmerRetraitBoss}
          onAnnuler={() => setBossASupprimerDuStatut(null)}
        />
      )}
    </div>
  );
}

function PageNouveaux({ membres, gems, tribus, departements, gemsAutorises, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [santeParMembre, setSanteParMembre] = useState({});
  const [recherche, setRecherche] = useState("");
  const [filtreEtape, setFiltreEtape] = useState("");

  const membresDuPerimetre = gemsAutorises ? membres.filter(m => gemsAutorises.includes(m.gem_id)) : membres;
  const nouveaux = membresDuPerimetre.filter(m => m.nouveau_converti);

  useEffect(() => { chargerSante(); }, [nouveaux.length]);

  async function chargerSante() {
    setChargement(true);
    if (nouveaux.length === 0) { setSanteParMembre({}); setChargement(false); return; }
    const { data } = await supabase.from("sante_spirituelle").select("*").in("membre_id", nouveaux.map(m => m.id)).order("date_maj", { ascending: false });
    const map = {};
    (data || []).forEach(s => { if (!map[s.membre_id]) map[s.membre_id] = s; });
    setSanteParMembre(map);
    setChargement(false);
  }

  function nomGem(gemId) {
    return gems.find(g => g.id === gemId)?.nom || "GEM inconnu";
  }

  function rattachement(gemId) {
    const g = gems.find(gg => gg.id === gemId);
    if (!g) return "";
    if (g.tribu_id) return `Tribu de ${tribus.find(t => t.id === g.tribu_id)?.nom || "?"}`;
    if (g.departement_id) return `Département ${departements.find(d => d.id === g.departement_id)?.nom || "?"}`;
    return "";
  }

  const resultats = nouveaux
    .filter(m => m.nom.toLowerCase().includes(recherche.toLowerCase()))
    .filter(m => !filtreEtape || (m.etape_conversion || "accueil") === filtreEtape);

  const repartition = ["accueil", "classe", "baptise", "integre"].map(etape => ({
    etape, nb: nouveaux.filter(m => (m.etape_conversion || "accueil") === etape).length,
  }));

  if (chargement) return <Chargement />;

  return (
    <div>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}><IconePousse size={22} /> Suivi des nouveaux convertis</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{nouveaux.length} nouveau(x) converti(s) suivis à travers toute l'église.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {repartition.map(r => (
          <button
            key={r.etape}
            className="btn-app card-app"
            onClick={() => setFiltreEtape(filtreEtape === r.etape ? "" : r.etape)}
            style={{ ...cardStyle, cursor: "pointer", border: filtreEtape === r.etape ? `2px solid ${GOLD}` : cardStyle.border, textAlign: "left" }}
          >
            <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>{LIBELLES_ETAPES_SUIVI[r.etape]}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: GOLD_LIGHT }}>{r.nb}</p>
          </button>
        ))}
      </div>

      <input
        value={recherche}
        onChange={e => setRecherche(e.target.value)}
        placeholder="🔍 Rechercher un nouveau converti..."
        style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}`, marginBottom: 16, width: "100%", maxWidth: 320 }}
      />

      {resultats.length === 0 ? (
        <EtatVide icone={IconePousse} titre="Aucun nouveau converti trouvé" />
      ) : (
        <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {resultats.map(m => {
            const moyenne = moyenneSante(santeParMembre[m.id]);
            return (
              <div key={m.id} className="card-app" style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nomGem(m.gem_id)} — {rattachement(m.gem_id)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "4px 10px" }}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconePousse size={12} /> {LIBELLES_ETAPES_SUIVI[m.etape_conversion || "accueil"]}</span>
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: moyenne !== null ? couleurScore(moyenne) : "var(--text-secondary)", backgroundColor: TEAL_900, borderRadius: 999, padding: "4px 10px" }}>
                      🌡️ {moyenne !== null ? `${moyenne}/10` : "Non évaluée"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
        <button className="btn-app" onClick={() => setResponsableSelectionne(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour à la liste</button>
        <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{compteDetail.nom}</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{compteDetail.role === "pasteur" ? "Pasteur" : compteDetail.assistant ? "Assistant désigné" : "Responsable"}</p>
        <p style={{ fontSize: 13, color: GOLD_LIGHT, marginBottom: 20 }}>{infosResponsable(compteDetail)}</p>

        {!ficheDetail ? (
          <EtatVide icone={IconeThermometre} titre="Aucune fiche remplie pour l'instant" />
        ) : (
          <>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Dernière évaluation — {new Date(ficheDetail.date_maj).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DIMENSIONS_SANTE.map(([cle, label]) => (
                  <div key={cle} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary-2)" }}>{label}</span>
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
                <GraphiqueCourbe
                  couleur="var(--gold)"
                  donnees={[...historiqueDetail].reverse().map(h => ({
                    libelle: new Date(h.date_maj).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                    valeur: moyenneSante(h),
                    texteAffiche: moyenneSante(h),
                  }))}
                />
              </div>
            )}
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Historique ({historiqueDetail.length} évaluation{historiqueDetail.length > 1 ? "s" : ""})</p>
            <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {historiqueDetail.map(h => (
                <div key={h.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{new Date(h.date_maj).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
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
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}><IconeThermometre size={22} /> Santé spirituelle des responsables</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Suivi des fiches remplies chaque semaine par les responsables GEM, département et tribu.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Fiches remplies</p>
          <p style={{ fontSize: 24, fontWeight: 700 }}><NombreAnime valeur={responsablesAvecFiche.length} /> / {(tousLesComptes || []).length}</p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Moyenne générale</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: couleurScore(moyenneGlobale) }}>{moyenneGlobale !== null ? `${moyenneGlobale}/10` : "—"}</p>
        </div>
      </div>

      {evolutionMoyenne.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Évolution de la moyenne (6 derniers mois)</p>
          <GraphiqueCourbe
            couleur="var(--gold)"
            donnees={evolutionMoyenne.map(e => ({
              libelle: libelleMois(e.mois),
              valeur: e.moyenne,
              texteAffiche: e.moyenne,
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

      <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {resultatsRecherche.length === 0 ? (
          <EtatVide icone={IconePersonne} titre="Aucun responsable trouvé" />
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
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.role === "pasteur" ? "Pasteur" : c.assistant ? "Assistant désigné" : "Responsable"}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: moyenne !== null ? couleurScore(moyenne) : "var(--text-secondary)", backgroundColor: TEAL_900, borderRadius: 999, padding: "6px 12px" }}>
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
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}><IconeAnalyse size={22} /> Analyse intelligente</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
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
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pas encore assez de dimanches enregistrés (au moins 5) pour comparer deux périodes de 4 semaines — reviens dans quelques semaines.</p>
      ) : (
        <>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📌 Constats et recommandations</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {constats.map((c, i) => (
              <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${c.type === "alerte" ? RED_LIGHT : "var(--green-success)"}` }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{c.titre}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary-2)", marginBottom: 8 }}>{c.detail}</p>
                <p style={{ fontSize: 12, color: GOLD_LIGHT, fontStyle: "italic" }}>💡 {c.action}</p>
              </div>
            ))}
          </div>

          {gemsEnBaisse.length > 0 && (
            <>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><IconeAlerte size={16} /> GEM à surveiller</p>
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green-success)" }}>{t.tauxPrecedent}% → {t.tauxActuel}% (+{t.evolution}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {membresEnDeclin.length > 0 && (
            <>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🔻 Membres en décrochage progressif</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Étaient réguliers le mois dernier, mais leur présence a nettement chuté ce mois-ci.</p>
              <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {membresEnDeclin.map(({ membre, tauxPrecedent, tauxActuel }) => {
                  const gemMembre = gems.find(g => g.id === membre.gem_id);
                  return (
                    <div key={membre.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, margin: 0 }}>{membre.nom}</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{gemMembre?.nom || "GEM inconnu"}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: RED_LIGHT }}>{tauxPrecedent}% → {tauxActuel}%</span>
                        {membre.telephone && (
                          <a title="Appeler" href={`tel:${membre.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}><IconeTelephone size={15} /></a>
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

function PageMonCompte({ compte, assignationsActives, gems, tribus, departements, cardStyle, onMisAJour }) {
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmationMdp, setConfirmationMdp] = useState("");
  const [mdpVisible, setMdpVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [dateNaissance, setDateNaissance] = useState(compte.date_naissance || "");
  const [telephoneContact, setTelephoneContact] = useState(compte.telephone || "+225 ");
  const [quartier, setQuartier] = useState(compte.quartier || "");
  const [photo, setPhoto] = useState(compte.photo || null);
  const [baptise, setBaptise] = useState(compte.baptise || false);
  const [egliseOrigine, setEgliseOrigine] = useState(compte.eglise_origine || "");
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [gemChoisiPourFiche, setGemChoisiPourFiche] = useState("");
  const [rattachementEnCours, setRattachementEnCours] = useState(false);
  const [dejaRattache, setDejaRattache] = useState(null); // null = pas encore vérifié

  const rolesResponsablePur = (assignationsActives || []).filter(a => a.role_demande === "departement_resp" || a.role_demande === "tribu_resp");

  useEffect(() => {
    if (rolesResponsablePur.length === 0) return;
    (async () => {
      const chiffresMoi = (compte.telephone || "").replace(/[^\d]/g, "").slice(-8);
      const { data } = await supabase.from("membres").select("id, gem_id, telephone").not("telephone", "is", null);
      const trouve = (data || []).find(m => m.telephone.replace(/[^\d]/g, "").slice(-8) === chiffresMoi);
      setDejaRattache(trouve ? gems.find(g => g.id === trouve.gem_id) : false);
    })();
  }, []);

  async function rattacherAUnGem() {
    if (!gemChoisiPourFiche) return;
    setRattachementEnCours(true);
    const { error } = await supabase.from("membres").insert({
      gem_id: gemChoisiPourFiche, nom: compte.nom, telephone: compte.telephone,
      quartier: compte.quartier || null, date_naissance: compte.date_naissance || null,
      nouveau_converti: false,
    });
    setRattachementEnCours(false);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast("✓ Tu es maintenant rattaché(e) à ce GEM comme membre.", "succes");
    setDejaRattache(gems.find(g => g.id === gemChoisiPourFiche));
  }

  function emailTechnique(tel) {
    return `${(tel || "").replace(/[^\d]/g, "")}@gestiongem.com`;
  }

  async function surChoisirPhotoProfil(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    try {
      const dataUrl = await redimensionnerPhoto(fichier);
      setPhoto(dataUrl);
    } catch (err) {
      toast(err.message || "Impossible de traiter cette photo.", "erreur");
    }
  }

  async function enregistrerProfil() {
    if (!numeroTelephoneValide(telephoneContact)) { toast("Le numéro de téléphone ne semble pas valide.", "erreur"); return; }
    setEnregistrementProfil(true);
    const { error } = await supabase.from("comptes").update({
      date_naissance: dateNaissance || null,
      quartier: quartier.trim() || null,
      photo: photo || null,
      baptise,
      eglise_origine: egliseOrigine.trim() || null,
      telephone: telephoneContact.trim(),
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
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}><IconePersonne size={22} /> Mon compte</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Tes informations et la gestion de ton mot de passe.</p>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Informations</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary-2)", marginBottom: 4 }}><b>Nom :</b> {compte.nom}</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary-2)", marginBottom: 4 }}><b>Numéro de connexion :</b> {compte.telephone}</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary-2)" }}><b>Rôle :</b> {compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant désigné" : "Responsable"}</p>
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><IconeCrayon size={14} /> Compléter mon profil</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {photo ? <img src={photo} alt="" style={{ width: 52, height: 52, borderRadius: 999, objectFit: "cover", border: `2px solid ${GOLD}` }} /> : <AvatarInitiales nom={compte.nom} taille={52} />}
            <label style={{ fontSize: 11, color: GOLD_LIGHT, cursor: "pointer", border: `1px solid ${TEAL_600}`, borderRadius: 8, padding: "8px 12px" }}>
              📷 {photo ? "Changer ma photo" : "Ajouter ma photo"}
              <input type="file" accept="image/*" onChange={surChoisirPhotoProfil} style={{ display: "none" }} />
            </label>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>📞 Téléphone</label>
            <input
              value={telephoneContact}
              onChange={e => setTelephoneContact(e.target.value)}
              placeholder="+225 ..."
              style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
              ⚠️ Le numéro utilisé pour te connecter à l'application ne change pas ici — c'est uniquement le numéro affiché aux autres (appel, WhatsApp).
            </p>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>🎂 Date de naissance (jour et mois)</label>
            <SelecteurJourMois value={dateNaissance} onChange={setDateNaissance} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Quartier</label>
            <input
              value={quartier}
              onChange={e => setQuartier(e.target.value)}
              placeholder="Non renseigné"
              style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Église d'origine (si tu viens d'ailleurs)</label>
            <input
              value={egliseOrigine}
              onChange={e => setEgliseOrigine(e.target.value)}
              placeholder="Non renseigné"
              style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: CREAM, cursor: "pointer" }}>
            <input type="checkbox" checked={baptise} onChange={e => setBaptise(e.target.checked)} />
            Je suis baptisé(e)
          </label>
          <button
            className="btn-app"
            disabled={enregistrementProfil}
            onClick={enregistrerProfil}
            style={{ padding: "10px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", alignSelf: "flex-start" }}
          >
            {enregistrementProfil ? "…" : <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeEnregistrer size={14}/> Enregistrer</span>}
          </button>
        </div>
      </div>

      {rolesResponsablePur.length > 0 && dejaRattache !== null && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><IconeGroupe size={14} /> Mon GEM de rattachement</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
            En tant que responsable, tu es aussi membre de l'église — choisis un GEM de ton périmètre pour que ta présence et ta régularité soient suivies comme pour tout le monde.
          </p>
          {dejaRattache ? (
            <p style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>✓ Déjà rattaché(e) à "{dejaRattache.nom}"</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select value={gemChoisiPourFiche} onChange={e => setGemChoisiPourFiche(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}>
                <option value="">— Choisir mon GEM —</option>
                {rolesResponsablePur.flatMap(r =>
                  gems.filter(g => r.role_demande === "departement_resp" ? g.departement_id === r.departement_id : g.tribu_id === r.tribu_id)
                ).map(g => (
                  <option key={g.id} value={g.id}>
                    {g.nom} — {g.tribu_id ? `Tribu de ${tribus.find(t => t.id === g.tribu_id)?.nom || "?"}` : `Département ${departements.find(d => d.id === g.departement_id)?.nom || "?"}`}
                  </option>
                ))}
              </select>
              <button
                className="btn-app"
                disabled={!gemChoisiPourFiche || rattachementEnCours}
                onClick={rattacherAUnGem}
                style={{ padding: "10px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", alignSelf: "flex-start" }}
              >
                {rattachementEnCours ? "…" : "Me rattacher à ce GEM"}
              </button>
            </div>
          )}
        </div>
      )}

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
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={mdpVisible} onChange={e => setMdpVisible(e.target.checked)} />
            Afficher les mots de passe
          </label>
          {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
          <button
            className="btn-app"
            disabled={enCours}
            onClick={changerMotDePasse}
            style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", cursor: "pointer" }}
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
    await Promise.all([
      supabase.from("presences").delete().eq("membre_id", d.membre_id),
      supabase.from("sante_spirituelle").delete().eq("membre_id", d.membre_id),
      supabase.from("visites").delete().eq("membre_id", d.membre_id),
    ]);
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
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Demandes de suppression ({demandes.length})</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Chaque suppression de membre doit être validée ici avant d'être effective.
      </p>
      {chargement ? (
        <Chargement />
      ) : demandes.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucune demande en attente pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {demandes.map(d => (
            <div key={d.id} style={cardStyle}>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>{d.membre_nom}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                Demandé par {comptesParId[d.demande_par]?.nom || "…"} · {formaterDate(d.date_demande)}
              </p>
              <p style={{ fontSize: 13, color: "var(--gold-warn)", marginBottom: 12 }}>Motif : {d.motif}</p>
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
                  style={{ padding: "10px 18px", borderRadius: 10, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 12 }}
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
    const [{ data: d }, { data: tousLesComptes }] = await Promise.all([
      supabase.from("demandes_mot_de_passe").select("*").eq("statut", "attente").order("date_demande"),
      supabase.from("comptes").select("*"),
    ]);
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
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Mots de passe oubliés ({demandes.length})</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Ces demandes viennent de responsables qui n'arrivent plus à se connecter. Choisis un nouveau mot de passe pour eux et transmets-le leur directement.
      </p>

      {chargement ? (
        <Chargement />
      ) : demandes.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucune demande en attente pour le moment.</p>
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
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.telephone}</p>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{formaterDate(d.date_demande)}</p>
                    {!compteAssocie && <p style={{ fontSize: 11, color: RED_LIGHT, marginTop: 4 }}>Ce numéro ne correspond à aucun compte existant.</p>}
                  </div>
                  {!ouverte && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {compteAssocie && (
                        <button
 className="btn-app"
 onClick={() => ouvrirReinitialisation(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Réinitialiser</button>
                      )}
                      <button
 className="btn-app"
 onClick={() => ignorer(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: "transparent", color: RED_LIGHT, border: `1px solid ${RED_LIGHT}`, cursor: "pointer", fontSize: 12 }}>Ignorer</button>
                    </div>
                  )}
                </div>

                {ouverte && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${TEAL_700}` }}>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Choisis un nouveau mot de passe pour {compteAssocie?.nom} :</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        value={nouveauMdp}
                        onChange={e => setNouveauMdp(e.target.value)}
                        placeholder="Nouveau mot de passe (8 car. min.)"
                        type={mdpVisible ? "text" : "password"}
                        style={{ flex: 1, minWidth: 200, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
                        <input type="checkbox" checked={mdpVisible} onChange={e => setMdpVisible(e.target.checked)} />
                        Afficher
                      </label>
                    </div>
                    {erreur && <p style={{ color: RED_LIGHT, fontSize: 12, marginTop: 8 }}>{erreur}</p>}
                    {succes && <p style={{ color: GOLD_LIGHT, fontSize: 12, marginTop: 8, fontWeight: 700 }}>{succes}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button disabled={enCours} onClick={() => reinitialiser(d)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                        {enCours ? "…" : "Confirmer la réinitialisation"}
                      </button>
                      <button
 className="btn-app"
 onClick={() => setDemandeOuverte(null)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, cursor: "pointer", fontSize: 12 }}>Annuler</button>
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

function RapportPerimetre({ compte, gems, membres, cardStyle }) {
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
  const [responsablesParGem, setResponsablesParGem] = useState({}); // { gemId: { compte, santeMoyenne, present } }

  const idsMembres = membres.map(m => m.id);

  useEffect(() => { chargerDimanches(); chargerResponsablesGem(); }, []);
  useEffect(() => { if (dimancheChoisi && vue === "hebdomadaire") { chargerHebdo(); chargerPresenceResponsables(); } }, [dimancheChoisi, vue]);
  useEffect(() => { if (moisChoisi && vue === "mensuelle") chargerMensuel(); }, [moisChoisi, vue]);

  async function chargerResponsablesGem() {
    const idsGems = gems.map(g => g.id);
    if (idsGems.length === 0) return;
    const { data: assignationsGem } = await supabase.from("assignations").select("gem_id, compte_id").eq("role_demande", "gem").eq("statut", "actif").in("gem_id", idsGems);
    if (!assignationsGem || assignationsGem.length === 0) return;
    const idsComptes = assignationsGem.map(a => a.compte_id);
    const [{ data: comptes }, { data: santeResp }] = await Promise.all([
      supabase.from("comptes").select("*").in("id", idsComptes),
      supabase.from("sante_spirituelle_responsables").select("*").in("compte_id", idsComptes).order("date_maj", { ascending: false }),
    ]);
    const map = {};
    assignationsGem.forEach(a => {
      const c = (comptes || []).find(cc => cc.id === a.compte_id);
      if (!c) return;
      const derniereSante = (santeResp || []).find(s => s.compte_id === a.compte_id);
      map[a.gem_id] = { compte: c, santeMoyenne: derniereSante ? moyenneSante(derniereSante) : null, present: null };
    });
    setResponsablesParGem(map);
  }

  async function chargerPresenceResponsables() {
    const idsComptes = Object.values(responsablesParGem).map(r => r.compte.id);
    if (idsComptes.length === 0 || !dimancheChoisi) return;
    const { data: presResp } = await supabase.from("presences_responsables_gem").select("*").eq("dimanche_id", dimancheChoisi).in("compte_id", idsComptes);
    setResponsablesParGem(prev => {
      const copie = { ...prev };
      Object.keys(copie).forEach(gemId => {
        const p = (presResp || []).find(pp => pp.compte_id === copie[gemId].compte.id);
        copie[gemId] = { ...copie[gemId], present: p ? p.present : null };
      });
      return copie;
    });
  }

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


  const moisDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 7)))];

  const nbResponsablesGemRapport = new Set(Object.values(responsablesParGem).filter(r => r.compte).map(r => r.compte.id)).size;
  const totalMembres = membres.length + nbResponsablesGemRapport;
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

  if (gems.length === 0) return <EtatVide icone={IconeMaison} titre="Aucun GEM dans ton périmètre" />;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
 className="btn-app"
 onClick={() => setVue("hebdomadaire")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "hebdomadaire" ? GOLD : TEAL_900, color: vue === "hebdomadaire" ? TEAL_950 : "var(--text-secondary-2)" }}>Hebdomadaire</button>
        <button
 className="btn-app"
 onClick={() => setVue("mensuelle")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "mensuelle" ? GOLD : TEAL_900, color: vue === "mensuelle" ? TEAL_950 : "var(--text-secondary-2)" }}>Mensuelle</button>
      </div>

      {dimanches.length === 0 ? (
        <EtatVide icone={IconeCalendrier} titre="Aucun dimanche enregistré" description="Le pointage de présence en créera un automatiquement." />
      ) : vue === "hebdomadaire" ? (
        <>
          <select value={dimancheChoisi || ""} onChange={e => setDimancheChoisi(e.target.value)} style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 16 }}>
            {dimanches.map(d => <option key={d.id} value={d.id}>{new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</option>)}
          </select>
          {chargement ? <Chargement /> : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Rapport du dimanche {dateFormatee}</p>
                <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeImprimante size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Imprimer / PDF</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Présents</p><p style={{ fontSize: 24, fontWeight: 700, color: GOLD_LIGHT }}>{totalPresents}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Taux</p><p style={{ fontSize: 24, fontWeight: 700 }}>{tauxGlobal}%</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Santé moy.</p><p style={{ fontSize: 24, fontWeight: 700, color: couleurScore(scoreMoyenGlobal) }}>{scoreMoyenGlobal !== null ? `${scoreMoyenGlobal}/10` : "—"}</p></div>
              </div>

              <CommentaireIntelligent titre="🧠 Analyse intelligente" stats={{ tauxPresence: tauxGlobal, moyenneSante: scoreMoyenGlobal }} />

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Détail par GEM</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {gems.map(g => {
                  const membresGem = membres.filter(m => m.gem_id === g.id);
                  const presentsGem = membresGem.filter(m => presences[m.id]).length;
                  const tauxGem = membresGem.length > 0 ? Math.round((presentsGem / membresGem.length) * 100) : 0;
                  const resp = responsablesParGem[g.id];
                  return (
                    <div key={g.id} style={cardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <p style={{ fontWeight: 700, margin: 0 }}>{g.nom}</p>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: GOLD_LIGHT, margin: 0 }}>{presentsGem} / {membresGem.length} présents</p>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{tauxGem}% de présence</p>
                        </div>
                      </div>
                      {resp && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${TEAL_800}`, flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}><IconePersonne size={12} style={{verticalAlign:"-1px",marginRight:3}} /> {resp.compte.nom} (responsable)</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            {resp.present !== null && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: resp.present ? TEAL_950 : "#fff", backgroundColor: resp.present ? "var(--green-success)" : RED_LIGHT, borderRadius: 999, padding: "3px 8px" }}>
                                {resp.present ? "Présent" : "Absent"}
                              </span>
                            )}
                            {resp.santeMoyenne !== null && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px",
                                color: resp.santeMoyenne >= 4 ? TEAL_950 : "#fff",
                                backgroundColor: resp.santeMoyenne >= 7 ? GOLD_LIGHT : resp.santeMoyenne >= 4 ? "var(--gold-warn)" : RED_LIGHT,
                              }}>
                                🌡️ {resp.santeMoyenne}/10
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📵 Absents ({membres.filter(m => presences[m.id] === false).length})</p>
              {membres.filter(m => presences[m.id] === false).length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun absent pointé pour ce dimanche.</p>
              ) : (
                <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {membres.filter(m => presences[m.id] === false).map(m => {
                    const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
                    const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, tu nous as manqué au culte de ce dimanche. Tout va bien ? Nous t'aimons et espérons te revoir bientôt. 🙏

${signatureMessage(compte)}`);
                    return (
                      <div key={m.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nomGem(m.gem_id)} · {m.telephone}</p>
                          {motifsParMembre[m.id] && <p style={{ fontSize: 12, color: "var(--gold-warn)", marginTop: 4 }}>Motif : {motifsParMembre[m.id]}</p>}
                        </div>
                        {m.telephone && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a title="Appeler" href={`tel:${m.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              <IconeTelephone size={15} /></a>
                            <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              <IconeMessage size={15} /></a>
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
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, textTransform: "capitalize" }}>Rapport de {libelleMois(moisChoisi)} — {dimanchesDuMois.length} dimanche(s)</p>
                <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeImprimante size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Imprimer / PDF</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Taux moyen</p><p style={{ fontSize: 24, fontWeight: 700 }}>{tauxMoyenMois}%</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Santé moy.</p><p style={{ fontSize: 24, fontWeight: 700, color: couleurScore(scoreMoyenMois) }}>{scoreMoyenMois !== null ? `${scoreMoyenMois}/10` : "—"}</p></div>
              </div>

              <CommentaireIntelligent titre="🧠 Analyse intelligente du mois" stats={{ tauxPresence: tauxMoyenMois, moyenneSante: scoreMoyenMois }} />

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📵 Membres absents tout le mois ({membres.filter(m => dimanchesDuMois.length > 0 && presencesMois.filter(p => p.membre_id === m.id && p.present).length === 0).length})</p>
              {dimanchesDuMois.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun dimanche pointé pour ce mois.</p>
              ) : membres.filter(m => presencesMois.filter(p => p.membre_id === m.id && p.present).length === 0).length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun membre totalement absent ce mois — bon signe !</p>
              ) : (
                <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {membres.filter(m => presencesMois.filter(p => p.membre_id === m.id && p.present).length === 0).map(m => {
                    const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
                    const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, nous ne t'avons pas vu ce mois-ci au culte. Tout va bien ? Nous t'aimons et espérons te revoir bientôt. 🙏

${signatureMessage(compte)}`);
                    return (
                      <div key={m.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nomGem(m.gem_id)} · {m.telephone}</p>
                        </div>
                        {m.telephone && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a title="Appeler" href={`tel:${m.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              <IconeTelephone size={15} /></a>
                            <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              <IconeMessage size={15} /></a>
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


  const moisDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 7)))];
  const anneesDisponibles = [...new Set(dimanches.map(d => d.date.slice(0, 4)))];
  const dateAffichee = dimanches.find(d => d.id === dimancheChoisi);
  const dateFormatee = dateAffichee ? new Date(dateAffichee.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

  const nbValides = vue === "semaine" ? activites.filter(a => a.valide).length : new Set(activites.map(a => a.gem_id)).size;
  const totalVisites = activites.reduce((s, a) => s + (a.visites_membres?.length || 0), 0);
  const totalAppels = activites.reduce((s, a) => s + (a.appels_membres?.length || 0), 0);

  if (gems.length === 0) return <EtatVide icone={IconeMaison} titre="Aucun GEM dans ton périmètre" />;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn-app" onClick={() => setVue("semaine")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "semaine" ? GOLD : TEAL_900, color: vue === "semaine" ? TEAL_950 : "var(--text-secondary-2)" }}>Par semaine</button>
        <button className="btn-app" onClick={() => setVue("mois")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "mois" ? GOLD : TEAL_900, color: vue === "mois" ? TEAL_950 : "var(--text-secondary-2)" }}>Par mois</button>
        <button className="btn-app" onClick={() => setVue("annee")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "annee" ? GOLD : TEAL_900, color: vue === "annee" ? TEAL_950 : "var(--text-secondary-2)" }}>Par année</button>
      </div>

      {dimanches.length === 0 ? (
        <EtatVide icone={IconeCalendrier} titre="Aucun dimanche enregistré" description="Le pointage de présence en créera un automatiquement." />
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
              {vue === "semaine" && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Semaine du {dateFormatee}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>{vue === "semaine" ? "Rapports validés" : "GEM ayant rapporté"}</p><p style={{ fontSize: 24, fontWeight: 700, color: GOLD_LIGHT }}>{nbValides} / {gems.length}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Visites (total)</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalVisites}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Appels (total)</p><p style={{ fontSize: 24, fontWeight: 700 }}>{totalAppels}</p></div>
              </div>

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Détail par GEM</p>
              <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                          {rattachement(g) && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{rattachement(g)}</span>}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {vue === "semaine" ? (
                            act?.valide ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD, borderRadius: 999, padding: "4px 10px" }}><IconeValide size={11} style={{verticalAlign:"-1px",marginRight:3}} /> Validé</span>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", backgroundColor: TEAL_900, borderRadius: 999, padding: "4px 10px" }}>Non rempli</span>
                            )
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, color: activitesGem.length > 0 ? TEAL_950 : "var(--text-secondary)", backgroundColor: activitesGem.length > 0 ? GOLD : TEAL_900, borderRadius: 999, padding: "4px 10px" }}>
                              {activitesGem.length} rapport{activitesGem.length > 1 ? "s" : ""}
                            </span>
                          )}
                          <span style={{ color: "var(--text-secondary)" }}>{deplie ? "▲" : "▼"}</span>
                        </span>
                      </button>
                      {deplie && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${TEAL_700}`, fontSize: 12, color: "var(--text-secondary-2)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {activitesGem.length === 0 ? (
                            <p style={{ color: "var(--text-secondary)" }}>Aucune activité renseignée pour cette période.</p>
                          ) : (
                            activitesGem.map(a => {
                              const dim = dimanches.find(d => d.id === a.dimanche_id);
                              return (
                                <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: `1px solid ${TEAL_800}` }}>
                                  {vue !== "semaine" && dim && (
                                    <p style={{ fontWeight: 700, color: GOLD_LIGHT }}>Semaine du {new Date(dim.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                                  )}
                                  <p><b>🏠 Visites :</b> {(a.visites_membres || []).length > 0 ? a.visites_membres.map(nomMembre).join(", ") : "Aucune"}</p>
                                  <p><b><IconeTelephone size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Appels :</b> {(a.appels_membres || []).length > 0 ? a.appels_membres.map(nomMembre).join(", ") : "Aucun"}</p>
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
          <EtatVide icone={IconeGroupe} titre="Aucun pointage de présence pour l'instant" />
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, overflowX: "auto", paddingBottom: 4 }}>
            {presenceParDimanche.map((p, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 34 }}>
                <span style={{ fontSize: 10, color: GOLD_LIGHT, fontWeight: 700, marginBottom: 3 }}>{p.presents}</span>
                <div style={{ width: 20, height: Math.max(4, (p.presents / maxPresents) * 90), backgroundColor: GOLD, borderRadius: 4 }} />
                <span style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 4, whiteSpace: "nowrap" }}>
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
          <EtatVide icone={IconeThermometre} titre="Aucune évaluation enregistrée" />
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, overflowX: "auto", paddingBottom: 4 }}>
            {santeParMois.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 34 }}>
                <span style={{ fontSize: 10, color: couleurScore(s.moyenne), fontWeight: 700, marginBottom: 3 }}>{s.moyenne}</span>
                <div style={{ width: 20, height: Math.max(4, (s.moyenne / 10) * 90), backgroundColor: couleurScore(s.moyenne), borderRadius: 4 }} />
                <span style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 4, whiteSpace: "nowrap" }}>{libelleMois(s.mois)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Mon espace (responsable) ------------------------------- */

function MonEspace({ compte, assignationsActives, gems, membres, tribus, departements, gemOuvert, setGemOuvert, onMembreAjoute, onCreerGem, regulariteParMembre, membreCible, onMembreCibleConsomme, gemDuMois, tribuDeptDuMois, evenementsAvecImage, tousLesComptes, cardStyle }) {
  const [nomNouveauGem, setNomNouveauGem] = useState("");
  const [nomResponsableGem, setNomResponsableGem] = useState("");
  const [telResponsableGem, setTelResponsableGem] = useState("+225 ");
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [gemResponsableEnEdition, setGemResponsableEnEdition] = useState(null);
  const [gemNomEnEdition, setGemNomEnEdition] = useState(null);
  const [nouveauNomGem, setNouveauNomGem] = useState("");
  const [nomResponsableEnEdition, setNomResponsableEnEdition] = useState("");
  const [telResponsableEnEdition, setTelResponsableEnEdition] = useState("+225 ");
  const [sousOnglet, setSousOnglet] = useState("gems");
  const [indexRoleSelectionne, setIndexRoleSelectionne] = useState(0);
  const [responsablesGemPerimetre, setResponsablesGemPerimetre] = useState({}); // { gemId: nom }

  const listeAssignations = assignationsActives || [];
  const assignationSure = listeAssignations[Math.min(indexRoleSelectionne, Math.max(0, listeAssignations.length - 1))];
  const estDeptPourChargement = assignationSure?.role_demande === "departement_resp";
  const gemsDuPerimetrePourChargement = (assignationSure && assignationSure.role_demande !== "gem")
    ? gems.filter(g => estDeptPourChargement ? g.departement_id === assignationSure.departement_id : g.tribu_id === assignationSure.tribu_id)
    : [];

  // Toujours appelé, quel que soit le rôle affiché — évite une erreur React
  // liée à un nombre de hooks différent selon les cas (règle des Hooks).
  useEffect(() => {
    async function chargerResponsablesGem() {
      if (!assignationSure || assignationSure.role_demande === "gem") { setResponsablesGemPerimetre({}); return; }
      const idsGems = gemsDuPerimetrePourChargement.map(g => g.id);
      if (idsGems.length === 0) { setResponsablesGemPerimetre({}); return; }
      const { data: assignationsGem } = await supabase.from("assignations").select("gem_id, compte_id").eq("role_demande", "gem").eq("statut", "actif").in("gem_id", idsGems);
      const idsComptes = [...new Set((assignationsGem || []).map(a => a.compte_id))];
      if (idsComptes.length === 0) { setResponsablesGemPerimetre({}); return; }
      const { data: comptesResp } = await supabase.from("comptes").select("id, nom").in("id", idsComptes);
      const map = {};
      (assignationsGem || []).forEach(a => {
        const c = (comptesResp || []).find(cc => cc.id === a.compte_id);
        if (c) map[a.gem_id] = c.nom;
      });
      setResponsablesGemPerimetre(map);
    }
    chargerResponsablesGem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignationSure?.id, gemsDuPerimetrePourChargement.length]);

  if (listeAssignations.length === 0) return <div style={{ padding: 24 }}><EtatVide icone={IconePersonne} titre="Aucune responsabilité active" description="Ton compte n'a pas encore de rôle validé." /></div>;

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
        onBack={() => window.history.back()}
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
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: i === indexRoleSelectionne ? GOLD : TEAL_900, color: i === indexRoleSelectionne ? TEAL_950 : "var(--text-secondary-2)" }}
        >
          {libelleRole(a)}
        </button>
      ))}
    </div>
  ) : null;

  // Un responsable GEM gère directement et uniquement son propre GEM
  if (assignation.role_demande === "gem") {
    const monGem = gems.find(g => g.id === assignation.gem_id);
    if (!monGem) return <p style={{ color: "var(--text-secondary)" }}>Ton GEM est en cours de préparation...</p>;
    const membresGem = membres.filter(m => m.gem_id === monGem.id);
    const sousOngletsGem = [
      ["gems", "Mon GEM"],
      ["absences", "Absences"],
      ["historique", "Historique"],
    ];
    return (
      <div>
        {selecteurRole}
        <ParoleDuJour />
        <CarrouselImages evenements={evenementsAvecImage || []} />
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {sousOngletsGem.map(([cle, label]) => (
            <button key={cle} className="btn-app" onClick={() => setSousOnglet(cle)} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === cle ? GOLD : TEAL_900, color: sousOnglet === cle ? TEAL_950 : "var(--text-secondary-2)" }}>{label}</button>
          ))}
        </div>

        {sousOnglet === "absences" ? (
          <PageAbsences compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} regulariteParMembre={regulariteParMembre} gemsAutorises={[monGem.id]} cardStyle={cardStyle} />
        ) : sousOnglet === "historique" ? (
          <HistoriquePerimetre gems={[monGem]} membres={membresGem} cardStyle={cardStyle} />
        ) : (
          <>
            <ClassementsDuMois gemDuMois={gemDuMois} tribuDeptDuMois={tribuDeptDuMois} />
            <div style={{ ...cardStyle, marginBottom: 20, textAlign: "center" }}>
              <p className="titre-moisson chiffre-app" style={{ fontSize: 32, fontWeight: 700, color: GOLD_LIGHT, margin: 0 }}>
                {(() => {
                  const taux = membresGem.map(m => regulariteParMembre?.[m.id]?.tauxRegularite).filter(t => t !== null && t !== undefined);
                  return taux.length > 0 ? `${Math.round(taux.reduce((a, b) => a + b, 0) / taux.length)}%` : "—";
                })()}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>Taux de régularité moyen de tes membres</p>
            </div>
            <AnniversairesAVenir membres={membresGem} gems={gems} tribus={tribus} departements={departements} cardStyle={cardStyle} />
            <AnniversairesResponsables comptes={tousLesComptes || []} cardStyle={cardStyle} />
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
          </>
        )}
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

  async function renommerGemPerimetre(gemId) {
    if (!nouveauNomGem.trim()) { toast("Le nom du GEM ne peut pas être vide.", "erreur"); return; }
    const { error } = await supabase.from("gems").update({ nom: nouveauNomGem.trim() }).eq("id", gemId);
    if (error) { toast("Erreur : " + error.message, "erreur"); return; }
    toast("✓ GEM renommé avec succès.", "succes");
    setGemNomEnEdition(null);
    if (onCreerGem) onCreerGem();
  }

  async function creerGem() {
    if (!nomNouveauGem.trim()) { toast("Le nom du GEM est obligatoire.", "erreur"); return; }
    if (!nomResponsableGem.trim()) { toast("Le nom du responsable est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(telResponsableGem)) { toast("Le numéro du responsable ne semble pas valide.", "erreur"); return; }
    const payload = {
      nom: nomNouveauGem.trim(),
      type: estDept ? "departement" : "tribu",
      departement_id: estDept ? assignation.departement_id : null,
      tribu_id: estDept ? null : assignation.tribu_id,
      responsable_nom: nomResponsableGem.trim(),
      responsable_telephone: telResponsableGem.trim(),
    };
    const { error } = await supabase.from("gems").insert(payload);
    if (!error) { setNomNouveauGem(""); setNomResponsableGem(""); setTelResponsableGem("+225 "); setCreationOuverte(false); onCreerGem(); }
  }

  async function enregistrerResponsableGem(gemId) {
    if (!nomResponsableEnEdition.trim()) { toast("Le nom du responsable est obligatoire.", "erreur"); return; }
    if (!numeroTelephoneValide(telResponsableEnEdition)) { toast("Le numéro du responsable ne semble pas valide.", "erreur"); return; }
    const { error } = await supabase.from("gems").update({
      responsable_nom: nomResponsableEnEdition.trim(),
      responsable_telephone: telResponsableEnEdition.trim(),
    }).eq("id", gemId);
    if (!error) { setGemResponsableEnEdition(null); onCreerGem(); }
  }

  async function retirerResponsableGemProvisoire(gemId) {
    const { error } = await supabase.from("gems").update({ responsable_nom: null, responsable_telephone: null }).eq("id", gemId);
    if (!error) onCreerGem();
  }

  return (
    <div>
      {selecteurRole}
      <ParoleDuJour />
      <CarrouselImages evenements={evenementsAvecImage || []} />
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        {estDept ? "Mon département" : "Ma tribu"} — {parent?.nom || "…"}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>{gemsDuPerimetre.length} GEM sous ta responsabilité</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("gems")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "gems" ? GOLD : TEAL_900, color: sousOnglet === "gems" ? TEAL_950 : "var(--text-secondary-2)" }}>Mes GEM</button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("rapports")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "rapports" ? GOLD : TEAL_900, color: sousOnglet === "rapports" ? TEAL_950 : "var(--text-secondary-2)" }}>Rapports</button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("evolution")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "evolution" ? GOLD : TEAL_900, color: sousOnglet === "evolution" ? TEAL_950 : "var(--text-secondary-2)" }}>Évolution</button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("activites")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "activites" ? GOLD : TEAL_900, color: sousOnglet === "activites" ? TEAL_950 : "var(--text-secondary-2)" }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeClipboard size={14}/> Activités de la semaine</span></button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("nouveaux")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "nouveaux" ? GOLD : TEAL_900, color: sousOnglet === "nouveaux" ? TEAL_950 : "var(--text-secondary-2)" }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconePousse size={14}/> Nouveaux</span></button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("membres")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "membres" ? GOLD : TEAL_900, color: sousOnglet === "membres" ? TEAL_950 : "var(--text-secondary-2)" }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeGroupe size={14}/> Membres</span></button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("absences")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "absences" ? GOLD : TEAL_900, color: sousOnglet === "absences" ? TEAL_950 : "var(--text-secondary-2)" }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeInterdit size={14}/> Absences</span></button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("historique")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "historique" ? GOLD : TEAL_900, color: sousOnglet === "historique" ? TEAL_950 : "var(--text-secondary-2)" }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeCroissance size={14}/> Historique</span></button>
        <button
 className="btn-app"
 onClick={() => setSousOnglet("prediction")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "prediction" ? GOLD : TEAL_900, color: sousOnglet === "prediction" ? TEAL_950 : "var(--text-secondary-2)" }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeAnalyse size={14}/> Prédiction</span></button>
      </div>

      {sousOnglet === "rapports" ? (
        <RapportPerimetre compte={compte} gems={gemsDuPerimetre} membres={membresDuPerimetre} cardStyle={cardStyle} />
      ) : sousOnglet === "evolution" ? (
        <EvolutionPerimetre membres={membresDuPerimetre} cardStyle={cardStyle} />
      ) : sousOnglet === "activites" ? (
        <ActivitesSemainePerimetre gems={gemsDuPerimetre} membres={membresDuPerimetre} cardStyle={cardStyle} />
      ) : sousOnglet === "nouveaux" ? (
        <PageNouveaux membres={membresDuPerimetre} gems={gemsDuPerimetre} tribus={tribus} departements={departements} gemsAutorises={gemsDuPerimetre.map(g => g.id)} cardStyle={cardStyle} />
      ) : sousOnglet === "membres" ? (
        <PageMembres compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} gemsAutorises={gemsDuPerimetre.map(g => g.id)} regulariteParMembre={regulariteParMembre} estPasteur={compte.role === "pasteur" || compte.assistant === true} cardStyle={cardStyle} />
      ) : sousOnglet === "absences" ? (
        <PageAbsences compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} regulariteParMembre={regulariteParMembre} gemsAutorises={gemsDuPerimetre.map(g => g.id)} cardStyle={cardStyle} />
      ) : sousOnglet === "historique" ? (
        <HistoriquePerimetre gems={gemsDuPerimetre} membres={membresDuPerimetre} cardStyle={cardStyle} />
      ) : sousOnglet === "prediction" ? (
        <PagePrediction compte={compte} membres={membres} gems={gems} tribus={tribus} departements={departements} gemsAutorises={gemsDuPerimetre.map(g => g.id)} regulariteParMembre={regulariteParMembre} cardStyle={cardStyle} />
      ) : (
        <>
          <ClassementsDuMois gemDuMois={gemDuMois} tribuDeptDuMois={tribuDeptDuMois} />
          <ResumePerimetre compte={compte} gems={gemsDuPerimetre} membres={membresDuPerimetre} tribus={tribus} departements={departements} onVoirAbsences={() => setSousOnglet("absences")} cardStyle={cardStyle} />
          <AnniversairesAVenir membres={membresDuPerimetre} gems={gems} tribus={tribus} departements={departements} cardStyle={cardStyle} />
          <AnniversairesResponsables comptes={tousLesComptes || []} cardStyle={cardStyle} />
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            {creationOuverte ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={nomNouveauGem} onChange={e => setNomNouveauGem(e.target.value)} placeholder="Nom du nouveau GEM" style={{ padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <input value={nomResponsableGem} onChange={e => setNomResponsableGem(e.target.value)} placeholder="Nom du responsable GEM *" style={{ padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <input value={telResponsableGem} onChange={e => setTelResponsableGem(e.target.value)} placeholder="Téléphone du responsable *" style={{ padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
 className="btn-app"
 onClick={creerGem} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>Créer</button>
                  <button
 className="btn-app"
 onClick={() => { setCreationOuverte(false); setNomNouveauGem(""); setNomResponsableGem(""); setTelResponsableGem(""); }} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            ) : (
              <button
 className="btn-app"
 onClick={() => setCreationOuverte(true)} style={{ fontSize: 13, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Créer un nouveau GEM</button>
            )}
          </div>

          {gemsDuPerimetre.length === 0 ? (
            <EtatVide icone={IconeMaison} titre="Aucun GEM dans ton périmètre" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {gemsDuPerimetre.map(g => (
                <div key={g.id} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    {gemNomEnEdition === g.id ? (
                      <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 180 }}>
                        <input value={nouveauNomGem} onChange={e => setNouveauNomGem(e.target.value)} style={{ flex: 1, padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 13 }} />
                        <button className="btn-app" onClick={() => renommerGemPerimetre(g.id)} style={{ padding: "6px 10px", borderRadius: 6, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>OK</button>
                        <button className="btn-app" onClick={() => setGemNomEnEdition(null)} style={{ padding: "6px 10px", borderRadius: 6, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setGemOuvert(g)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                        <p style={{ fontWeight: 700, margin: 0, color: CREAM, display: "flex", alignItems: "center", gap: 6 }}>
                          {g.nom}
                          <span onClick={e => { e.stopPropagation(); setGemNomEnEdition(g.id); setNouveauNomGem(g.nom); }} style={{ color: GOLD_LIGHT, cursor: "pointer" }}><IconeCrayon size={11} /></span>
                        </p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                          {responsablesGemPerimetre[g.id] ? (
                            <span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconePersonne size={11}/> {responsablesGemPerimetre[g.id]} (compte actif)</span>
                          ) : g.responsable_nom ? (
                            <span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconePersonne size={11}/> {g.responsable_nom}{g.responsable_telephone ? ` — ${g.responsable_telephone}` : ""}</span>
                          ) : "Aucun responsable désigné"}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--gold-light)", margin: "2px 0 0", fontWeight: 600 }}>
                          {estDept ? `Département ${parent?.nom || "?"}` : `Tribu de ${parent?.nom || "?"}`}
                        </p>
                      </button>
                    )}
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{membres.filter(m => m.gem_id === g.id).length} membre(s)</span>
                  </div>

                  {!responsablesGemPerimetre[g.id] && (
                    gemResponsableEnEdition === g.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${TEAL_800}`, paddingTop: 8 }}>
                        <input value={nomResponsableEnEdition} onChange={e => setNomResponsableEnEdition(e.target.value)} placeholder="Nom du responsable GEM *" style={{ padding: 7, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                        <input value={telResponsableEnEdition} onChange={e => setTelResponsableEnEdition(e.target.value)} placeholder="Téléphone *" style={{ padding: 7, borderRadius: 7, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn-app" onClick={() => enregistrerResponsableGem(g.id)} style={{ padding: "6px 12px", borderRadius: 7, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Enregistrer</button>
                          <button className="btn-app" onClick={() => setGemResponsableEnEdition(null)} style={{ padding: "6px 12px", borderRadius: 7, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 12, borderTop: `1px solid ${TEAL_800}`, paddingTop: 8 }}>
                        <button className="btn-app" onClick={() => { setGemResponsableEnEdition(g.id); setNomResponsableEnEdition(g.responsable_nom || ""); setTelResponsableEnEdition(g.responsable_telephone || "+225 "); }} style={{ background: "none", border: "none", color: GOLD_LIGHT, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <IconeCrayon size={11} /> {g.responsable_nom ? "Modifier" : "Indiquer un responsable"}
                        </button>
                        {g.responsable_nom && (
                          <button className="btn-app" onClick={() => retirerResponsableGemProvisoire(g.id)} style={{ background: "none", border: "none", color: RED_LIGHT, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <IconePoubelle size={11} /> Retirer
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
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
        backgroundColor: sousOnglet === val ? GOLD : TEAL_900, color: sousOnglet === val ? TEAL_950 : "var(--text-secondary-2)",
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
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Un assistant a les mêmes droits que toi (voir toutes les données, valider les demandes) — utile pour te seconder.
      </p>

      {chargement ? (
        <Chargement />
      ) : comptes.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun autre compte pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comptes.map(c => (
            <div key={c.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{c.nom}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.telephone}</p>
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
 onClick={() => setCompteChoisi(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Choisir un autre compte</button>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>Attribuer un rôle à :</p>
        <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{compteChoisi.nom} <span style={{ fontWeight: 400, fontSize: 13, color: "var(--text-secondary)" }}>({compteChoisi.telephone})</span></p>

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
          <button disabled={enCours} onClick={attribuer} style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>
            {enCours ? "…" : "Attribuer ce rôle"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
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
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun compte disponible (tous les comptes inscrits ont déjà un rôle actif).</p>
      ) : (
        <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comptesFiltres.map(c => (
            <button key={c.id} onClick={() => choisir(c)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>{c.nom}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.telephone}</span>
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
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
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
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", marginTop: -6 }}>
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

        <button disabled={enCours} onClick={creer} style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>
          {enCours ? "…" : "Créer le compte et attribuer le rôle"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- Rapports ------------------------------- */

/* --------------------------- Détail Classement : Tribu/Département --------------------------- */

function DetailTribuDeptClassement({ type, item, gems, membres, onBack, cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [croissance, setCroissance] = useState([]);
  const [tauxRegulariteMoyen, setTauxRegulariteMoyen] = useState(null);
  const [santeMoyenne, setSanteMoyenne] = useState(null);
  const [nbIrreguliers, setNbIrreguliers] = useState(0);

  const gemsDuPerimetre = gems.filter(g => type === "tribu" ? g.tribu_id === item.id : g.departement_id === item.id);
  const membresDuPerimetre = membres.filter(m => gemsDuPerimetre.some(g => g.id === m.gem_id));

  useEffect(() => { chargerDetail(); }, [item.id]);

  async function chargerDetail() {
    setChargement(true);
    const idsMembres = membresDuPerimetre.map(m => m.id);

    // --- Courbe de croissance : nombre cumulé de membres par mois d'inscription (12 derniers mois) ---
    const parMois = {};
    membresDuPerimetre.forEach(m => {
      if (!m.created_at) return;
      const cle = m.created_at.slice(0, 7);
      parMois[cle] = (parMois[cle] || 0) + 1;
    });
    const moisTries = Object.keys(parMois).sort().slice(-12);
    let cumul = membresDuPerimetre.filter(m => !m.created_at || m.created_at.slice(0, 7) < (moisTries[0] || "9999")).length;
    setCroissance(moisTries.map(mois => {
      cumul += parMois[mois];
      return { mois, total: cumul, nouveaux: parMois[mois] };
    }));

    if (idsMembres.length > 0) {
      // --- Santé spirituelle moyenne ---
      const { data: sante } = await supabase.from("sante_spirituelle").select("*").in("membre_id", idsMembres).order("date_maj", { ascending: false });
      const derniereParMembre = {};
      (sante || []).forEach(s => { if (!derniereParMembre[s.membre_id]) derniereParMembre[s.membre_id] = s; });
      const scores = Object.values(derniereParMembre).map(s => moyenneSante(s)).filter(v => v !== null);
      setSanteMoyenne(scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null);

      // --- Régularité moyenne (8 derniers dimanches réellement pointés) ---
      const { data: dimanchesRecents } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(8);
      if (dimanchesRecents && dimanchesRecents.length > 0) {
        const { data: presencesRecentes } = await supabase.from("presences").select("*").in("dimanche_id", dimanchesRecents.map(d => d.id)).in("membre_id", idsMembres);
        const idsDimanchesPointes = new Set((presencesRecentes || []).map(p => p.dimanche_id));
        const dimanchesReels = dimanchesRecents.filter(d => idsDimanchesPointes.has(d.id));

        let sommeTaux = 0, nbMembresAvecTaux = 0, irreguliers = 0;
        membresDuPerimetre.forEach(m => {
          const dateArrivee = m.created_at ? m.created_at.slice(0, 10) : null;
          let applicables = 0, presents = 0, absencesConsecutives = 0, enCours = true;
          for (const dim of dimanchesReels) {
            if (dateArrivee && dim.date <= dateArrivee) break;
            const p = (presencesRecentes || []).find(pp => pp.membre_id === m.id && pp.dimanche_id === dim.id);
            const present = p ? p.present : false;
            applicables++;
            if (present) presents++;
            if (enCours) { if (present) { if (absencesConsecutives > 0) enCours = false; } else absencesConsecutives++; }
          }
          if (applicables > 0) { sommeTaux += (presents / applicables) * 100; nbMembresAvecTaux++; }
          if (absencesConsecutives >= 2) irreguliers++;
        });
        setTauxRegulariteMoyen(nbMembresAvecTaux > 0 ? Math.round(sommeTaux / nbMembresAvecTaux) : null);
        setNbIrreguliers(irreguliers);
      }
    }
    setChargement(false);
  }

  if (chargement) return <Chargement />;

  const croissanceNette = croissance.length >= 2 ? croissance[croissance.length - 1].total - croissance[0].total : null;

  return (
    <div>
      <button className="btn-app" onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour au classement</button>
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{type === "tribu" ? "🏛️" : "🏢"} {item.nom}</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{gemsDuPerimetre.length} GEM · {membresDuPerimetre.length} membre(s)</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{membresDuPerimetre.length}</p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}><IconeGraphique size={12} /> Régularité moy.</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: tauxRegulariteMoyen !== null ? (tauxRegulariteMoyen >= 70 ? "var(--green-success)" : tauxRegulariteMoyen >= 40 ? GOLD_LIGHT : RED_LIGHT) : "var(--text-secondary)" }}>
            {tauxRegulariteMoyen !== null ? `${tauxRegulariteMoyen}%` : "—"}
          </p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase" }}>🌡️ Santé moy.</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: couleurScore(santeMoyenne) }}>{santeMoyenne !== null ? `${santeMoyenne}/10` : "—"}</p>
        </div>
        <div className="card-app" style={cardStyle}>
          <p style={{ fontSize: 11, color: "var(--text-primary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}><IconeAlerte size={12} /> À surveiller</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: nbIrreguliers > 0 ? RED_LIGHT : "var(--green-success)" }}>{nbIrreguliers}</p>
        </div>
      </div>

      <CommentaireIntelligent
        titre={`🧠 Analyse intelligente — ${item.nom}`}
        stats={{
          nom: item.nom, croissanceNette, tauxPresence: tauxRegulariteMoyen, moyenneSante: santeMoyenne, nbIrreguliers,
        }}
      />

      {croissance.length >= 2 && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📈 Courbe de croissance (12 derniers mois)</p>
          <GraphiqueCourbe
            couleur="var(--green)"
            donnees={croissance.map(c => {
              const [annee, mois] = c.mois.split("-");
              return {
                libelle: new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short" }),
                valeur: c.total,
                texteAffiche: c.total,
              };
            })}
          />
        </div>
      )}

      <div style={{ ...cardStyle }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>GEM de ce {type === "tribu" ? "tribu" : "département"}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {gemsDuPerimetre.map(g => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{g.nom}</span>
              <span style={{ color: "var(--text-secondary)" }}>{membres.filter(m => m.gem_id === g.id).length} membre(s)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageRapports({ compte, gems, membres, tribus, departements, responsablesParGem, regulariteParMembre, cardStyle }) {
  const [vue, setVue] = useState("hebdomadaire"); // hebdomadaire | mensuelle | annuelle | activites | classement
  const [sousClassement, setSousClassement] = useState("hebdomadaire"); // hebdomadaire | mensuelle | annuelle | top3gem | top3tribu | top3departement
  const [detailOuvert, setDetailOuvert] = useState(null); // { type: "tribu"|"departement", item }

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
  const [validationsPresenceMois, setValidationsPresenceMois] = useState([]);

  const [dimanchesAnnee, setDimanchesAnnee] = useState([]);
  const [anneeChoisie, setAnneeChoisie] = useState(null); // "YYYY"
  const [presencesAnnee, setPresencesAnnee] = useState([]);
  const [santeAnnee, setSanteAnnee] = useState([]);
  const [activitesAnnee, setActivitesAnnee] = useState([]);
  const [validationsPresenceAnnee, setValidationsPresenceAnnee] = useState([]);

  const [tauxPrecedentHebdo, setTauxPrecedentHebdo] = useState(null);
  const [tauxPrecedentMois, setTauxPrecedentMois] = useState(null);
  const [tauxPrecedentAnnee, setTauxPrecedentAnnee] = useState(null);

  const [chargement, setChargement] = useState(true);

  useEffect(() => { chargerDimanches(); }, []);
  useEffect(() => { if (dimancheChoisi && (vue === "hebdomadaire" || vue === "classement")) chargerDonneesRapport(); }, [dimancheChoisi, vue]);
  useEffect(() => { if (moisChoisi && (vue === "mensuelle" || vue === "classement")) chargerDonneesMois(); }, [moisChoisi, vue]);
  useEffect(() => { if (anneeChoisie && (vue === "annuelle" || vue === "classement")) chargerDonneesAnnee(); }, [anneeChoisie, vue]);

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
    const [{ data: pres }, { data: sante }, { data: activites }, { data: validationsPres }] = await Promise.all([
      idsDimanches.length > 0
        ? supabase.from("presences").select("*").in("dimanche_id", idsDimanches)
        : Promise.resolve({ data: [] }),
      supabase.from("sante_spirituelle").select("*").gte("date_maj", debutMois).lte("date_maj", finMois + "T23:59:59"),
      idsDimanches.length > 0
        ? supabase.from("activites_semaine").select("*").in("dimanche_id", idsDimanches).eq("valide", true)
        : Promise.resolve({ data: [] }),
      idsDimanches.length > 0
        ? supabase.from("validations_presence").select("*").in("dimanche_id", idsDimanches).eq("valide", true)
        : Promise.resolve({ data: [] }),
    ]);
    setPresencesMois(pres || []);
    setSanteMois(sante || []);
    setActivitesMois(activites || []);
    setValidationsPresenceMois(validationsPres || []);

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
    const [{ data: pres }, { data: sante }, { data: activites }, { data: validationsPres }] = await Promise.all([
      idsDimanches.length > 0
        ? supabase.from("presences").select("*").in("dimanche_id", idsDimanches)
        : Promise.resolve({ data: [] }),
      supabase.from("sante_spirituelle").select("*").gte("date_maj", debutAnnee).lte("date_maj", finAnnee + "T23:59:59"),
      idsDimanches.length > 0
        ? supabase.from("activites_semaine").select("*").in("dimanche_id", idsDimanches).eq("valide", true)
        : Promise.resolve({ data: [] }),
      idsDimanches.length > 0
        ? supabase.from("validations_presence").select("*").in("dimanche_id", idsDimanches).eq("valide", true)
        : Promise.resolve({ data: [] }),
    ]);
    setPresencesAnnee(pres || []);
    setSanteAnnee(sante || []);
    setActivitesAnnee(activites || []);
    setValidationsPresenceAnnee(validationsPres || []);

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
        return { nom: it.nom, id: it.id, type, valeur, nbMembres: membresDuParent.length };
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
        return { nom: it.nom, id: it.id, type, valeur, nbMembres: membresDuParent.length };
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
        if (idsGems.length === 0 || dimanchesPeriode.length === 0) return { nom: it.nom, id: it.id, type, valeur: null, nbMembres: 0 };
        const totalAttendu = idsGems.length * dimanchesPeriode.length;
        const totalValide = activitesPeriode.filter(a => idsGems.includes(a.gem_id)).length;
        const valeur = totalAttendu > 0 ? Math.round((totalValide / totalAttendu) * 100) : null;
        return { nom: it.nom, id: it.id, type, valeur, nbMembres: gemsDuParent.length };
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
        return { nom: it.nom, id: it.id, type, valeur, nbMembres: nouveauxConvertis.length, integres };
      })
      .filter(x => x.valeur !== null)
      .sort((a, b) => b.valeur - a.valeur);
  }

  const classementTribusPresenceMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementPresence("tribu", tribus, dimanchesDuMois, presencesMois) : [];
  const classementDepartementsPresenceMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementPresence("departement", departements, dimanchesDuMois, presencesMois) : [];
  const classementTribusSanteMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementSante("tribu", tribus, santeMois) : [];
  const classementDepartementsSanteMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementSante("departement", departements, santeMois) : [];
  const classementMembresMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementMembres(dimanchesDuMois, presencesMois, 10) : [];
  // Meilleur GEM de la période : combine présence, santé spirituelle et activités validées
  function calculerClassementGems(dimanchesPeriode, presencesPeriode, activitesPeriode, validationsPresencePeriode) {
    // Première passe : valeurs brutes par GEM
    const brut = gems.map(g => {
      const membresGem = membres.filter(m => m.gem_id === g.id);
      if (membresGem.length === 0 || dimanchesPeriode.length === 0) return null;
      const idsMembres = membresGem.map(m => m.id);

      const slots = dimanchesPeriode.length * membresGem.length;
      const presents = presencesPeriode.filter(p => idsMembres.includes(p.membre_id) && p.present).length;
      const tauxPresence = slots > 0 ? (presents / slots) * 100 : null;

      const activitesGem = activitesPeriode.filter(a => a.gem_id === g.id);
      const rapportsPresenceValides = validationsPresencePeriode.filter(v => v.gem_id === g.id).length;
      const tauxRapportPresence = dimanchesPeriode.length > 0 ? (rapportsPresenceValides / dimanchesPeriode.length) * 100 : null;
      const tauxRapportActivite = dimanchesPeriode.length > 0 ? (activitesGem.length / dimanchesPeriode.length) * 100 : null;
      const composantesRapport = [tauxRapportPresence, tauxRapportActivite].filter(v => v !== null);
      const tauxRapport = composantesRapport.length > 0 ? composantesRapport.reduce((a, b) => a + b, 0) / composantesRapport.length : null;

      const nombreActivites = activitesGem.reduce((total, a) => {
        let n = 0;
        n += (a.visites_membres || []).length;
        n += (a.appels_membres || []).length;
        if (a.jeune && a.jeune.trim()) n += 1;
        if (a.agape && a.agape.trim()) n += 1;
        if (a.evangelisation && a.evangelisation.trim()) n += 1;
        return total + n;
      }, 0);

      const rattachement = g.tribu_id ? `Tribu de ${tribus.find(t => t.id === g.tribu_id)?.nom || "?"}` : `Département ${departements.find(d => d.id === g.departement_id)?.nom || "?"}`;
      const nomResponsable = responsablesParGem?.[g.id] || null;

      return { nom: g.nom, gemId: g.id, rattachement, nomResponsable, tauxPresence, tauxRapport, nombreActivites };
    }).filter(Boolean);

    // Deuxième passe : normalise le nombre d'activités (relatif au meilleur GEM de la période)
    const maxActivites = Math.max(1, ...brut.map(g => g.nombreActivites));

    const resultats = brut.map(g => {
      const scoreActivitesNormalise = (g.nombreActivites / maxActivites) * 100;
      const composantes = [g.tauxPresence, g.tauxRapport, scoreActivitesNormalise].filter(v => v !== null);
      const score = composantes.length > 0 ? composantes.reduce((a, b) => a + b, 0) / composantes.length : 0;
      return {
        nom: g.nom, gemId: g.gemId, rattachement: g.rattachement, nomResponsable: g.nomResponsable,
        valeur: Math.round(score),
        tauxPresence: g.tauxPresence !== null ? Math.round(g.tauxPresence) : null,
        tauxRapport: g.tauxRapport !== null ? Math.round(g.tauxRapport) : null,
        nombreActivites: g.nombreActivites,
      };
    });
    return resultats.sort((a, b) => b.valeur - a.valeur);
  }

  const classementGemsMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementGems(dimanchesDuMois, presencesMois, activitesMois, validationsPresenceMois) : [];
  const classementGemsAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementGems(dimanchesAnnee, presencesAnnee, activitesAnnee, validationsPresenceAnnee) : [];
  const meilleurGemMois = classementGemsMois.slice(0, 3);
  const meilleurGemAnnee = classementGemsAnnee.slice(0, 3);

  const classementTribusAmes = (vue === "mensuelle" || vue === "annuelle" || vue === "classement") ? calculerClassementAmes("tribu", tribus) : [];
  const classementDepartementsAmes = (vue === "mensuelle" || vue === "annuelle" || vue === "classement") ? calculerClassementAmes("departement", departements) : [];
  const classementTribusActiviteMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementActivite("tribu", tribus, dimanchesDuMois, activitesMois) : [];
  const classementDepartementsActiviteMois = (vue === "mensuelle" || vue === "classement") ? calculerClassementActivite("departement", departements, dimanchesDuMois, activitesMois) : [];
  const classementTribusActiviteAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementActivite("tribu", tribus, dimanchesAnnee, activitesAnnee) : [];
  const classementDepartementsActiviteAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementActivite("departement", departements, dimanchesAnnee, activitesAnnee) : [];

  const classementTribusPresenceAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementPresence("tribu", tribus, dimanchesAnnee, presencesAnnee) : [];
  const classementDepartementsPresenceAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementPresence("departement", departements, dimanchesAnnee, presencesAnnee) : [];
  const classementTribusSanteAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementSante("tribu", tribus, santeAnnee) : [];
  const classementDepartementsSanteAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementSante("departement", departements, santeAnnee) : [];
  const classementMembresAnnee = (vue === "annuelle" || vue === "classement") ? calculerClassementMembres(dimanchesAnnee, presencesAnnee, 10) : [];

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
      return <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: 6 }}>= vs {libellePeriode}</span>;
    }
    const positif = difference > 0;
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: positif ? "var(--green-success)" : RED_LIGHT, marginLeft: 6 }}>
        {positif ? "↑" : "↓"} {positif ? "+" : ""}{difference}% vs {libellePeriode}
      </span>
    );
  }

  function medaille(position) {
    if (position === 0) return "🥇";
    if (position === 1) return "🥈";
    if (position === 2) return "🥉";
    return `${position + 1}.`;
  }

  function Classement({ titre, liste, suffixe, maxValeur, onClicItem }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{titre}</p>
        {liste.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pas assez de données pour établir un classement.</p>
        ) : (
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {liste.map((item, i) => (
              <div key={item.nom + i} className={onClicItem ? "btn-app" : ""} onClick={onClicItem ? () => onClicItem(item) : undefined} style={{ ...cardStyle, cursor: onClicItem ? "pointer" : "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    <span style={{ marginRight: 8 }}>{medaille(i)}</span>
                    {item.nom}
                    {item.rattachement && <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text-secondary)", marginLeft: 6 }}>({item.rattachement})</span>}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: GOLD_LIGHT }}>{item.valeur}{suffixe}</span>
                </div>
                <BarreProgression pourcentage={(item.valeur / maxValeur) * 100} />
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
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pas assez de pointages pour établir ce classement.</p>
        ) : (
          <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {liste.map((item, i) => (
              <div key={item.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{medaille(i)} {item.nom}</span>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{item.gemNom}</p>
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
 onClick={() => setVue("hebdomadaire")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "hebdomadaire" ? GOLD : TEAL_900, color: vue === "hebdomadaire" ? TEAL_950 : "var(--text-secondary-2)" }}>
          Vue hebdomadaire
        </button>
        <button
 className="btn-app"
 onClick={() => setVue("mensuelle")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "mensuelle" ? GOLD : TEAL_900, color: vue === "mensuelle" ? TEAL_950 : "var(--text-secondary-2)" }}>
          Vue mensuelle
        </button>
        <button
 className="btn-app"
 onClick={() => setVue("annuelle")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "annuelle" ? GOLD : TEAL_900, color: vue === "annuelle" ? TEAL_950 : "var(--text-secondary-2)" }}>
          Vue annuelle
        </button>
        <button
 className="btn-app"
 onClick={() => setVue("activites")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "activites" ? GOLD : TEAL_900, color: vue === "activites" ? TEAL_950 : "var(--text-secondary-2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconeClipboard size={14} /> Activités
        </button>
        <button
 className="btn-app"
 onClick={() => setVue("classement")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: vue === "classement" ? GOLD : TEAL_900, color: vue === "classement" ? TEAL_950 : "var(--text-secondary-2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconeTrophee size={14} /> Classement
        </button>
      </div>

      {vue === "classement" ? (
        detailOuvert ? (
          <DetailTribuDeptClassement type={detailOuvert.type} item={detailOuvert.item} gems={gems} membres={membres} onBack={() => setDetailOuvert(null)} cardStyle={cardStyle} />
        ) : (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                ["hebdomadaire", "Hebdomadaire"], ["mensuelle", "Mensuelle"], ["annuelle", "Annuelle"],
                ["top3gem", "🥇 Top 3 GEM"], ["top3tribu", "🥇 Top 3 Tribus"], ["top3departement", "🥇 Top 3 Départements"],
              ].map(([cle, label]) => (
                <button key={cle} className="btn-app" onClick={() => setSousClassement(cle)} style={{ padding: "8px 14px", borderRadius: 8, fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer", backgroundColor: sousClassement === cle ? GOLD : TEAL_900, color: sousClassement === cle ? TEAL_950 : "var(--text-secondary-2)" }}>
                  {label}
                </button>
              ))}
            </div>

            {sousClassement === "hebdomadaire" && (
              dimanches.length === 0 ? (
                <EtatVide icone={IconeCalendrier} titre="Aucun dimanche enregistré" description="Le pointage de présence en créera un automatiquement." />
              ) : (
                <Classement
                  titre={`🏅 Classement des GEM — ${dateAffichee ? new Date(dateAffichee.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "ce dimanche"}`}
                  suffixe="%"
                  maxValeur={100}
                  liste={gems.map(g => {
                    const membresGem = membres.filter(m => m.gem_id === g.id);
                    if (membresGem.length === 0) return null;
                    const presentsGem = membresGem.filter(m => presences[m.id]).length;
                    return { nom: g.nom, valeur: Math.round((presentsGem / membresGem.length) * 100), rattachement: nomParent(g) };
                  }).filter(Boolean).sort((a, b) => b.valeur - a.valeur)}
                />
              )
            )}

            {sousClassement === "mensuelle" && (
              <>
                <Classement titre="🏅 Classement complet des GEM" liste={classementGemsMois} suffixe=" pts" maxValeur={100} />
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏆 Classement par régularité (présence)</p>
                <Classement titre="Tribus" liste={classementTribusPresenceMois} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsPresenceMois} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><IconeThermometre size={16} /> Classement par santé spirituelle</p>
                <Classement titre="Tribus" liste={classementTribusSanteMois} suffixe="/10" maxValeur={10} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsSanteMois} suffixe="/10" maxValeur={10} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><IconePousse size={16} /> Suivi des âmes — intégration des nouveaux convertis</p>
                <Classement titre="Tribus" liste={classementTribusAmes} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsAmes} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><IconeClipboard size={16} /> Rapports d'activités hebdomadaires validés</p>
                <Classement titre="Tribus" liste={classementTribusActiviteMois} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsActiviteMois} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <ClassementMembres liste={classementMembresMois} />
              </>
            )}

            {sousClassement === "annuelle" && (
              <>
                <Classement titre="🏅 Classement complet des GEM" liste={classementGemsAnnee} suffixe=" pts" maxValeur={100} />
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏆 Classement annuel par régularité (présence)</p>
                <Classement titre="Tribus" liste={classementTribusPresenceAnnee} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsPresenceAnnee} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><IconeThermometre size={16} /> Classement annuel par santé spirituelle</p>
                <Classement titre="Tribus" liste={classementTribusSanteAnnee} suffixe="/10" maxValeur={10} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsSanteAnnee} suffixe="/10" maxValeur={10} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><IconePousse size={16} /> Suivi des âmes — intégration des nouveaux convertis</p>
                <Classement titre="Tribus" liste={classementTribusAmes} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsAmes} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <p style={{ fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><IconeClipboard size={16} /> Rapports d'activités hebdomadaires validés</p>
                <Classement titre="Tribus" liste={classementTribusActiviteAnnee} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
                <Classement titre="Départements" liste={classementDepartementsActiviteAnnee} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
                <ClassementMembres liste={classementMembresAnnee} />
              </>
            )}

            {sousClassement === "top3gem" && (
              <Classement titre="🥇 Top 3 GEM (ce mois)" liste={classementGemsMois.slice(0, 3)} suffixe=" pts" maxValeur={100} />
            )}
            {sousClassement === "top3tribu" && (
              <Classement titre="🥇 Top 3 Tribus (ce mois — présence)" liste={classementTribusPresenceMois.slice(0, 3)} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "tribu", item: tribus.find(t => t.id === it.id) })} />
            )}
            {sousClassement === "top3departement" && (
              <Classement titre="🥇 Top 3 Départements (ce mois — présence)" liste={classementDepartementsPresenceMois.slice(0, 3)} suffixe="%" maxValeur={100} onClicItem={(it) => setDetailOuvert({ type: "departement", item: departements.find(d => d.id === it.id) })} />
            )}
          </div>
        )
      ) : vue === "activites" ? (
        <ActivitesSemainePerimetre gems={gems} membres={membres} tribus={tribus} departements={departements} cardStyle={cardStyle} />
      ) : dimanches.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun dimanche enregistré pour l'instant — le pointage de présence en créera automatiquement.</p>
      ) : vue === "hebdomadaire" ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Dimanche</label>
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
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Rapport du dimanche {dateFormatee}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
 className="btn-app"
 onClick={exporterCSVHebdomadaire} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeTelechargement size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Exporter CSV (Excel)</button>
                  <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeImprimante size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Imprimer / PDF</button>
                  <button
 className="btn-app"
 onClick={partagerRapportHebdomadaire} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📤 Partager</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Présents ce dimanche</p><p style={{ fontSize: 28, fontWeight: 700, color: GOLD_LIGHT }}>{totalPresents}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Taux de présence</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tauxGlobal}%</p><ComparaisonPeriode actuel={tauxGlobal} precedent={tauxPrecedentHebdo} libellePeriode="dimanche dernier" /></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Santé spirituelle moy.</p><p style={{ fontSize: 28, fontWeight: 700, color: couleurScore(scoreMoyenGlobal) }}>{scoreMoyenGlobal !== null ? `${scoreMoyenGlobal}/10` : "—"}</p></div>
              </div>

              <CommentaireIntelligent
                titre="🧠 Analyse intelligente de ce dimanche"
                stats={{
                  tauxPresence: tauxGlobal, tauxPresencePrecedent: tauxPrecedentHebdo, moyenneSante: scoreMoyenGlobal,
                  nbIrreguliers: membres.filter(m => regulariteParMembre?.[m.id]?.absencesConsecutives >= 2).length,
                }}
              />

              <ResumePerimetre compte={compte} gems={gems} membres={membres} tribus={tribus} departements={departements} cardStyle={cardStyle} />

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Détail par GEM</p>
              {gems.length === 0 ? (
                <EtatVide illustration="vase" titre="Aucun GEM créé pour l'instant" />
              ) : (
                <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {gems.map(g => {
                    const membresGem = membres.filter(m => m.gem_id === g.id);
                    const presentsGem = membresGem.filter(m => presences[m.id]).length;
                    const tauxGem = membresGem.length > 0 ? Math.round((presentsGem / membresGem.length) * 100) : 0;
                    const aUneDonneeDePresence = membresGem.some(m => presences[m.id] !== undefined);
                    return (
                      <div key={g.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <p style={{ fontWeight: 700 }}>{g.nom}</p>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{nomParent(g)}</p>
                          {responsablesParGem?.[g.id] && (
                            <p style={{ fontSize: 11, color: GOLD_LIGHT, marginTop: 2 }}><IconePersonne size={11} style={{verticalAlign:"-1px",marginRight:3}} /> {responsablesParGem[g.id]}</p>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: GOLD_LIGHT }}>{presentsGem} / {membresGem.length} présents</p>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{tauxGem}% de présence</p>
                          {!aUneDonneeDePresence && (
                            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>Aucun pointage pour cette semaine</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p style={{ fontWeight: 600, fontSize: 14, marginTop: 28, marginBottom: 10 }}>📵 Absents ce dimanche ({membres.filter(m => presences[m.id] === false).length})</p>
              {membres.filter(m => presences[m.id] === false).length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Aucun absent pointé pour ce dimanche.</p>
              ) : (
                <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {membres.filter(m => presences[m.id] === false).map(m => {
                    const gemMembre = gems.find(g => g.id === m.gem_id);
                    const numeroWhatsApp = numeroPourWhatsApp(m.telephone);
                    const messageWhatsApp = encodeURIComponent(`Bonjour ${m.nom}, tu nous as manqué au culte de ce dimanche. Tout va bien ? Nous t'aimons et espérons te revoir bientôt. 🙏

${signatureMessage(compte)}`);
                    return (
                      <div key={m.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: 2 }}>{m.nom}</p>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{gemMembre?.nom || "GEM inconnu"} · {m.telephone}</p>
                          {motifsParMembre[m.id] && <p style={{ fontSize: 12, color: "var(--gold-warn)", marginTop: 4 }}>Motif : {motifsParMembre[m.id]}</p>}
                        </div>
                        {m.telephone && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a title="Appeler" href={`tel:${m.telephone}`} style={{ fontSize: 16, color: TEAL_950, textDecoration: "none", backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              <IconeTelephone size={15} /></a>
                            <a title="Envoyer un message WhatsApp" href={`https://wa.me/${numeroWhatsApp}?text=${messageWhatsApp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: "#fff", textDecoration: "none", backgroundColor: "#25D366", border: "none", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                              <IconeMessage size={15} /></a>
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
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Mois</label>
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
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, textTransform: "capitalize" }}>Rapport de {libelleMois(moisChoisi)} — {dimanchesDuMois.length} dimanche(s) enregistré(s)</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
 className="btn-app"
 onClick={exporterCSVMensuel} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeTelechargement size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Exporter CSV (Excel)</button>
                  <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeImprimante size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Imprimer / PDF</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Taux de présence moyen</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tauxMoyenMois}%</p><ComparaisonPeriode actuel={tauxMoyenMois} precedent={tauxPrecedentMois} libellePeriode="mois dernier" /></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Santé spirituelle moy.</p><p style={{ fontSize: 28, fontWeight: 700, color: couleurScore(scoreMoyenMois) }}>{scoreMoyenMois !== null ? `${scoreMoyenMois}/10` : "—"}</p></div>
              </div>

              <CommentaireIntelligent
                titre="🧠 Analyse intelligente du mois"
                stats={{ tauxPresence: tauxMoyenMois, tauxPresencePrecedent: tauxPrecedentMois, moyenneSante: scoreMoyenMois }}
              />

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📈 Évolution du taux de présence — dimanche par dimanche</p>
              {evolutionHebdoDuMois.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Aucun dimanche pointé pour ce mois.</p>
              ) : (
                <div style={{ ...cardStyle, marginBottom: 28 }}>
                  <GraphiqueCourbe
                    couleur="var(--green)"
                    donnees={evolutionHebdoDuMois.map(d => ({
                      libelle: new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                      valeur: d.taux,
                      texteAffiche: `${d.taux}%`,
                    }))}
                    hauteur={130}
                  />
                </div>
              )}

              <div style={{ ...cardStyle, textAlign: "center", padding: 16 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>🏆 Tous les classements (GEM, tribus, départements, membres) se trouvent maintenant dans l'onglet <b style={{ color: GOLD_LIGHT }}>"Classement"</b> ci-dessus.</p>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Année</label>
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
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Rapport annuel {anneeChoisie} — {dimanchesAnnee.length} dimanche(s) enregistré(s)</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
 className="btn-app"
 onClick={exporterCSVAnnuel} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeTelechargement size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Exporter CSV (Excel)</button>
                  <button
 className="btn-app"
 onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><IconeImprimante size={13} style={{verticalAlign:"-2px",marginRight:4}} /> Imprimer / PDF</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{totalMembres}</p></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Taux de présence annuel</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tauxMoyenAnnee}%</p><ComparaisonPeriode actuel={tauxMoyenAnnee} precedent={tauxPrecedentAnnee} libellePeriode="année dernière" /></div>
                <div style={cardStyle}><p style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "uppercase" }}>Santé spirituelle moy.</p><p style={{ fontSize: 28, fontWeight: 700, color: couleurScore(scoreMoyenAnnee) }}>{scoreMoyenAnnee !== null ? `${scoreMoyenAnnee}/10` : "—"}</p></div>
              </div>

              <CommentaireIntelligent
                titre="🧠 Analyse intelligente de l'année"
                stats={{ tauxPresence: tauxMoyenAnnee, tauxPresencePrecedent: tauxPrecedentAnnee, moyenneSante: scoreMoyenAnnee }}
              />

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📈 Évolution mensuelle du taux de présence — {anneeChoisie}</p>
              {evolutionMensuelleAnnee.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Pas encore de données pour cette année.</p>
              ) : (
                <div style={{ ...cardStyle, marginBottom: 28 }}>
                  <GraphiqueCourbe
                    couleur="var(--green)"
                    donnees={evolutionMensuelleAnnee.map(m => ({
                      libelle: libelleMoisCourt(m.mois),
                      valeur: m.taux,
                      texteAffiche: `${m.taux}%`,
                    }))}
                    hauteur={130}
                  />
                </div>
              )}

              <div style={{ ...cardStyle, textAlign: "center", padding: 16 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>🏆 Tous les classements (GEM, tribus, départements, membres) se trouvent maintenant dans l'onglet <b style={{ color: GOLD_LIGHT }}>"Classement"</b> ci-dessus.</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------- Messagerie ------------------------------- */

function PageMessagerie({ compte, estPasteur, onActionnee, cardStyle }) {
  const [onglet, setOnglet] = useState("diffusion"); // diffusion | direct | prive | rappels
  const [messages, setMessages] = useState([]);
  const [messagesDirects, setMessagesDirects] = useState([]);
  const [notificationsPerso, setNotificationsPerso] = useState([]);
  const [comptesParId, setComptesParId] = useState({});
  const [texte, setTexte] = useState("");
  const [imageMessage, setImageMessage] = useState(null);
  const [imageEnCours, setImageEnCours] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [tousLesComptes, setTousLesComptes] = useState([]);
  const [messagesPrives, setMessagesPrives] = useState([]);
  const [destinataireChoisi, setDestinataireChoisi] = useState(null);
  const [rechercheDestinataire, setRechercheDestinataire] = useState("");
  const [textePrive, setTextePrive] = useState("");
  const [enregistreurOuvert, setEnregistreurOuvert] = useState(false);

  useEffect(() => {
    chargerTout();
    chargerComptes();
    if (!estPasteur) {
      supabase.from("comptes").update({ dernier_message_lu: new Date().toISOString() }).eq("id", compte.id).then(() => { if (onActionnee) onActionnee(); });
    }
  }, []);

  async function chargerComptes() {
    const { data } = await supabase.from("comptes").select("*").neq("id", compte.id).order("nom", { ascending: true });
    setTousLesComptes(data || []);
  }

  async function chargerMessagesPrives() {
    // Ne récupère que les messages où JE suis expéditeur ou destinataire —
    // une vraie conversation privée, invisible aux autres.
    const { data } = await supabase.from("messages_directs").select("*").not("destinataire_id", "is", null).or(`de_compte_id.eq.${compte.id},destinataire_id.eq.${compte.id}`).order("date", { ascending: true });
    setMessagesPrives(data || []);
  }

  useEffect(() => { if (onglet === "prive") chargerMessagesPrives(); }, [onglet]);

  async function envoyerMessagePrive() {
    if (!textePrive.trim() || !destinataireChoisi) return;
    const { error } = await supabase.from("messages_directs").insert({ texte: textePrive.trim(), de_compte_id: compte.id, destinataire_id: destinataireChoisi.id });
    if (!error) { setTextePrive(""); chargerMessagesPrives(); }
  }

  async function envoyerMessageVocal(audioUrl) {
    setEnregistreurOuvert(false);
    const { error } = await supabase.from("messages_directs").insert({ texte: "", audio: audioUrl, de_compte_id: compte.id, destinataire_id: destinataireChoisi.id });
    if (!error) chargerMessagesPrives();
    else toast("Erreur d'envoi du message vocal : " + error.message, "erreur");
  }

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

  async function gererSelectionImageMessage(fichier) {
    if (!fichier) return;
    setImageEnCours(true);
    try {
      const dataUrl = await redimensionnerImageAttachee(fichier);
      setImageMessage(dataUrl);
    } catch {
      toast("Impossible de charger cette image.", "erreur");
    }
    setImageEnCours(false);
  }

  async function envoyerDiffusion() {
    if (!texte.trim() && !imageMessage) return;
    const texteFinal = `${texte.trim()}\n\n${signatureMessage(compte)}`;
    const { error } = await supabase.from("messages").insert({ texte: texteFinal, image: imageMessage || null, de_compte_id: compte.id });
    if (!error) { setTexte(""); setImageMessage(null); chargerTout(); }
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
 onClick={() => setOnglet("diffusion")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "diffusion" ? GOLD : TEAL_900, color: onglet === "diffusion" ? TEAL_950 : "var(--text-secondary-2)" }}>
          Messages du pasteur
        </button>
        <button
 className="btn-app"
 onClick={() => setOnglet("direct")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "direct" ? GOLD : TEAL_900, color: onglet === "direct" ? TEAL_950 : "var(--text-secondary-2)" }}>
          {estPasteur ? "Boîte de réception" : "Écrire au pasteur"}{estPasteur && nonLus > 0 ? ` (${nonLus})` : ""}
        </button>
        {estPasteur && (
          <button
 className="btn-app"
 onClick={() => setOnglet("prive")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "prive" ? GOLD : TEAL_900, color: onglet === "prive" ? TEAL_950 : "var(--text-secondary-2)" }}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeCadenas size={13}/> Message privé</span>
          </button>
        )}
        <button
 className="btn-app"
 onClick={() => setOnglet("rappels")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "rappels" ? GOLD : TEAL_900, color: onglet === "rappels" ? TEAL_950 : "var(--text-secondary-2)" }}>
          <span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconeCloche size={14}/> Mes rappels{notificationsPerso.filter(n => !n.lu).length > 0 ? ` (${notificationsPerso.filter(n => !n.lu).length})` : ""}</span>
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
              <div style={{ marginTop: 8 }}>
                {imageMessage ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img src={imageMessage} alt="Aperçu" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, border: `1px solid ${TEAL_600}` }} />
                    <button className="btn-app" onClick={() => setImageMessage(null)} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 999, backgroundColor: RED_LIGHT, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <label style={{ fontSize: 12, color: GOLD_LIGHT, cursor: "pointer" }}>
                    📎 Joindre une image
                    <input type="file" accept="image/*" onChange={e => gererSelectionImageMessage(e.target.files[0])} disabled={imageEnCours} style={{ display: "none" }} />
                  </label>
                )}
                {imageEnCours && <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Chargement de l'image…</p>}
              </div>
              <button
 className="btn-app"
 onClick={envoyerDiffusion} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
            </div>
          )}
          {messages.length === 0 ? (
            <EtatVide icone={IconeMessage} titre="Aucun message pour l'instant" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map(m => (
                <div key={m.id} style={cardStyle}>
                  <p style={{ whiteSpace: "pre-wrap" }}>{m.texte}</p>
                  {m.image && (
                    <img src={m.image} alt="Pièce jointe" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, marginTop: 8, border: `1px solid ${TEAL_700}` }} />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{formaterDate(m.date)}</p>
                    <button
                      className="btn-app"
                      onClick={() => genererAfficheImage({
                        titre: "Message du Pasteur",
                        sousTitre: formaterDate(m.date),
                        corps: m.texte,
                        piedDePage: "Pasteur Dimitri Koffi",
                        nomFichier: `message_${m.id}`,
                      })}
                      style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                    >
                      🖼️ Exporter en image
                    </button>
                  </div>
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
 onClick={envoyerDirect} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
            </div>
          )}
          {messagesDirects.length === 0 ? (
            <EtatVide icone={IconeMessage} titre="Aucun message pour l'instant" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messagesDirects.map(m => (
                <div key={m.id} style={{ ...cardStyle, borderColor: !m.lu && estPasteur ? GOLD : TEAL_700 }}>
                  {estPasteur && <p style={{ fontSize: 12, fontWeight: 700, color: GOLD_LIGHT, marginBottom: 4 }}>{comptesParId[m.de_compte_id]?.nom || "…"}</p>}
                  <p style={{ whiteSpace: "pre-wrap" }}>{m.texte}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{formaterDate(m.date)}</p>
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
      ) : onglet === "prive" && estPasteur ? (
        <div>
          {!destinataireChoisi ? (
            <>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>Choisis la personne à qui écrire — elle seule verra ce message, personne d'autre.</p>
              <input
                value={rechercheDestinataire}
                onChange={e => setRechercheDestinataire(e.target.value)}
                placeholder="Rechercher un responsable par nom..."
                style={{ width: "100%", maxWidth: 320, padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, marginBottom: 14 }}
              />
              {tousLesComptes.filter(c => c.nom.toLowerCase().includes(rechercheDestinataire.toLowerCase())).length === 0 ? (
                <EtatVide icone={IconePersonne} titre="Aucun résultat" />
              ) : (
                <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tousLesComptes.filter(c => c.nom.toLowerCase().includes(rechercheDestinataire.toLowerCase())).slice(0, 30).map(c => (
                    <button key={c.id} className="btn-app card-app" onClick={() => setDestinataireChoisi(c)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nom}</span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{c.role === "pasteur" ? "Pasteur" : c.assistant ? "Assistant" : "Responsable"}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <button className="btn-app" onClick={() => setDestinataireChoisi(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginBottom: 14, fontSize: 13 }}>← Choisir une autre personne</button>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><IconeCadenas size={15}/> Conversation avec {destinataireChoisi.nom}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, maxHeight: 420, overflowY: "auto" }}>
                {messagesPrives.filter(m => (m.de_compte_id === compte.id && m.destinataire_id === destinataireChoisi.id) || (m.de_compte_id === destinataireChoisi.id && m.destinataire_id === compte.id)).length === 0 ? (
                  <EtatVide illustration="priere" titre="Aucun message pour l'instant" description="Écris le premier message ci-dessous." />
                ) : (
                  messagesPrives
                    .filter(m => (m.de_compte_id === compte.id && m.destinataire_id === destinataireChoisi.id) || (m.de_compte_id === destinataireChoisi.id && m.destinataire_id === compte.id))
                    .map(m => (
                      <div key={m.id} style={{ alignSelf: m.de_compte_id === compte.id ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: m.de_compte_id === compte.id ? "rgba(214,165,76,0.15)" : TEAL_900, border: `1px solid ${m.de_compte_id === compte.id ? "rgba(214,165,76,0.4)" : TEAL_700}`, borderRadius: 12, padding: "10px 14px" }}>
                        {m.audio ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <IconeMicro size={14} color={GOLD_LIGHT} />
                            <audio controls src={m.audio} style={{ height: 32, maxWidth: 220 }} />
                          </div>
                        ) : (
                          <p style={{ whiteSpace: "pre-wrap", fontSize: 13, margin: 0 }}>{m.texte}</p>
                        )}
                        <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4, marginBottom: 0 }}>{formaterDate(m.date)}</p>
                      </div>
                    ))
                )}
              </div>
              {enregistreurOuvert ? (
                <EnregistreurVocal onEnregistrementPret={envoyerMessageVocal} onAnnuler={() => setEnregistreurOuvert(false)} />
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={textePrive}
                    onChange={e => setTextePrive(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") envoyerMessagePrive(); }}
                    placeholder="Écris ton message..."
                    style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }}
                  />
                  <button
                    className="btn-app"
                    onClick={() => setEnregistreurOuvert(true)}
                    title="Message vocal"
                    style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: TEAL_900, color: GOLD_LIGHT, border: `1px solid ${TEAL_600}`, cursor: "pointer" }}
                  >
                    <IconeMicro size={16} />
                  </button>
                  <button
                    className="btn-app"
                    onClick={envoyerMessagePrive}
                    style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}
                  >
                    Envoyer
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Rappels automatiques générés par l'application (ex : rapport hebdomadaire non validé).</p>
          {notificationsPerso.length === 0 ? (
            <EtatVide icone={IconeCloche} titre="Aucun rappel pour l'instant" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notificationsPerso.map(n => (
                <div key={n.id} style={{ ...cardStyle, borderColor: !n.lu ? GOLD : TEAL_700 }}>
                  <p style={{ whiteSpace: "pre-wrap" }}>{n.texte}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{formaterDate(n.date_creation)}</p>
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
  const [image, setImage] = useState(null);
  const [imageEnCours, setImageEnCours] = useState(false);
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

  async function gererSelectionImage(fichier) {
    if (!fichier) return;
    setImageEnCours(true);
    try {
      const dataUrl = await redimensionnerImageAttachee(fichier);
      setImage(dataUrl);
    } catch {
      toast("Impossible de charger cette image.", "erreur");
    }
    setImageEnCours(false);
  }

  async function creerEvenement() {
    setErreur("");
    if (!titre.trim() || !debut) { setErreur("Le titre et la date sont obligatoires."); return; }
    const { error } = await supabase.from("evenements").insert({
      titre: titre.trim(), debut: new Date(debut).toISOString(),
      lieu: lieu.trim() || null, description: description.trim() || null, image: image || null, cree_par: compte.id,
    });
    if (error) { setErreur(error.message); return; }
    setTitre(""); setDebut(""); setLieu(""); setDescription(""); setImage(null); setFormOuvert(false);
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

  function telechargerAfficheEvenement(e) {
    const dateFormatee = new Date(e.debut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    genererAfficheImage({
      titre: e.titre,
      sousTitre: `${dateFormatee}${e.lieu ? " — " + e.lieu : ""}`,
      corps: e.description || "",
      piedDePage: "Pasteur Dimitri Koffi",
      nomFichier: e.titre.replace(/[^a-z0-9]/gi, "_"),
    });
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
            {e.lieu && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>📍 {e.lieu}</p>}
            {e.description && <p style={{ fontSize: 13, marginTop: 6 }}>{e.description}</p>}
            {e.image && (
              <img src={e.image} alt={e.titre} style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, marginTop: 8, border: `1px solid ${TEAL_700}` }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
 className="btn-app"
 onClick={() => telechargerICS(e)} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: `1px solid ${TEAL_600}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Ajouter au calendrier</button>
            <button
 className="btn-app"
 onClick={() => telechargerAfficheEvenement(e)} style={{ fontSize: 11, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>🖼️ Affiche</button>
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
              <div className="liste-cascade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'événement" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <input value={debut} onChange={e => setDebut(e.target.value)} type="datetime-local" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Lieu (optionnel)" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Description (optionnelle)" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>📎 Image / affiche jointe (optionnelle)</label>
                  {image ? (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img src={image} alt="Aperçu" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, border: `1px solid ${TEAL_600}` }} />
                      <button className="btn-app" onClick={() => setImage(null)} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 999, backgroundColor: RED_LIGHT, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <input type="file" accept="image/*" onChange={e => gererSelectionImage(e.target.files[0])} disabled={imageEnCours} style={{ fontSize: 12, color: "var(--text-secondary-2)" }} />
                  )}
                  {imageEnCours && <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Chargement de l'image…</p>}
                </div>
                {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
 className="btn-app"
 onClick={creerEvenement} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer" }}>Créer</button>
                  <button
 className="btn-app"
 onClick={() => setFormOuvert(false)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: "transparent", color: "var(--text-secondary)", border: `1px solid ${TEAL_600}`, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            </div>
          ) : (
            <button
 className="btn-app"
 onClick={() => setFormOuvert(true)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, backgroundImage: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: TEAL_950, boxShadow: "0 4px 14px rgba(214,165,76,0.28)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Nouvel événement</button>
          )}
        </div>
      )}

      {chargement ? (
        <Chargement />
      ) : (
        <>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>À venir</p>
          {aVenir.length === 0 ? (
            <EtatVide illustration="moisson" titre="Aucun événement prévu" description="Crée le premier événement du calendrier avec le bouton ci-dessus." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {aVenir.map(e => <CarteEvenement key={e.id} e={e} />)}
            </div>
          )}

          {passes.length > 0 && (
            <>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "var(--text-secondary)" }}>Passés</p>
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
                    <span style={{ fontSize: 10, color: "var(--green-success)", fontWeight: 700, marginBottom: 2 }}>+{d.valeur}</span>
                    <div style={{ width: 22, height: tailleBarre, backgroundColor: "var(--green-success)", borderRadius: "4px 4px 0 0", transition: "height 0.4s ease" }} />
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
              <span style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 6, whiteSpace: "nowrap" }}>{d.libelle}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Trophée du meilleur GEM — réutilisable sur tous les tableaux de bord
// (pasteur, assistants, responsables GEM, département, tribu).
// Trophée Tribu/Département du mois — mêmes critères étendus (rapport, présence, suivi des nouveaux, activités)
// Classement Top 3 compact — réutilisé pour GEM, tribu et département du mois.
// Classements du mois — un seul encart compact avec onglets (GEM / Tribu / Département),
// chaque ligne affichant le rang, le nom, et les statistiques clés en petites puces.
function ClassementsDuMois({ gemDuMois, tribuDeptDuMois }) {
  const [index, setIndex] = useState(0);
  const debutGlissement = useRef(null);
  const hauteursPodium = [58, 78, 42]; // 2e, 1er, 3e — ordre visuel du podium
  const couleursMedaille = ["#E3B95A", "#C9CDD6", "#C08A5C"]; // or (couleur de marque), argent, bronze — 1er/2e/3e

  const onglets = [
    { cle: "gem", label: "GEM", items: gemDuMois, cles: [["tauxRapport", "📋"], ["tauxPresence", "📅"], ["nombreActivites", "🙏"]] },
    { cle: "tribu", label: "Tribus", items: tribuDeptDuMois?.tribu, cles: [["tauxRapport", "📋"], ["tauxPresence", "📅"], ["tauxSuiviNouveaux", "🌱"], ["nombreActivites", "🙏"]] },
    { cle: "departement", label: "Départements", items: tribuDeptDuMois?.departement, cles: [["tauxRapport", "📋"], ["tauxPresence", "📅"], ["tauxSuiviNouveaux", "🌱"], ["nombreActivites", "🙏"]] },
  ];

  const disponibles = onglets.filter(o => o.items && o.items.length > 0);
  if (disponibles.length === 0) return null;
  const actif = disponibles[Math.min(index, disponibles.length - 1)];

  function afficherValeur(cle, valeur) {
    if (valeur === null || valeur === undefined) return null;
    return cle === "nombreActivites" ? `${valeur}` : `${valeur}%`;
  }


  function surDebutGlissement(e) { debutGlissement.current = e.touches[0].clientX; }
  function surFinGlissement(e) {
    if (debutGlissement.current === null || disponibles.length <= 1) return;
    const diff = debutGlissement.current - e.changedTouches[0].clientX;
    if (diff > 50) setIndex(i => (i + 1) % disponibles.length);
    else if (diff < -50) setIndex(i => (i - 1 + disponibles.length) % disponibles.length);
    debutGlissement.current = null;
  }

  // Réordonne les 3 premiers pour l'affichage "podium" : 2e à gauche, 1er au
  // centre (plus grand), 3e à droite — comme une vraie estrade de victoire.
  const top3 = actif.items.slice(0, 3);
  const ordrePodium = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const indicesReels = top3.length === 3 ? [1, 0, 2] : top3.map((_, i) => i);

  return (
    <div
      onTouchStart={surDebutGlissement}
      onTouchEnd={surFinGlissement}
      style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(160deg, rgba(23,89,78,0.75), rgba(11,64,56,0.8))", backdropFilter: "blur(12px)",
        borderRadius: 20, padding: "21px 17px 17px", marginBottom: 20,
        boxShadow: "0 18px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(214,165,76,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Liseré doré subtil qui encadre toute la carte */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 20, padding: 1, background: "linear-gradient(135deg, rgba(214,165,76,0.5), transparent 30%, transparent 70%, rgba(214,165,76,0.35))", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />

      {/* Halo doré derrière le 1er de classe — donne de la profondeur */}
      <div style={{ position: "absolute", top: "16%", left: "50%", transform: "translateX(-50%)", width: 210, height: 210, borderRadius: "50%", background: "radial-gradient(circle, rgba(214,165,76,0.3), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -8, right: 6, pointerEvents: "none" }}><EpiDeBle size={40} opacity={0.1} /></div>

      {/* Petites étincelles discrètes autour du 1er */}
      {[[22, 20, "0s"], [88, 12, "0.6s"], [78, 32, "1.2s"], [14, 34, "1.8s"]].map(([left, top, delai], i) => (
        <span key={i} style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: 4, height: 4, borderRadius: "50%", backgroundColor: "#F0C669", animation: `scintiller2 2.4s ease-in-out ${delai} infinite`, pointerEvents: "none" }} />
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, position: "relative" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: GOLD_LIGHT, textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <IconeTrophee size={14} /> Top 3 {actif.label} — ce mois
        </p>
        {disponibles.length > 1 && (
          <div style={{ display: "flex", gap: 5 }}>
            {disponibles.map((o, i) => (
              <button key={o.cle} onClick={() => setIndex(i)} style={{ width: actif.cle === o.cle ? 18 : 6, height: 6, borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: actif.cle === o.cle ? GOLD : "rgba(255,255,255,0.28)", padding: 0, transition: "width 0.3s ease" }} />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Podium visuel ---------- */}
      <div key={actif.cle} className="fade-in" style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, marginBottom: 18, position: "relative" }}>
        {ordrePodium.map((item, position) => {
          if (!item) return <div key={position} style={{ flex: 1 }} />;
          const iReel = indicesReels[position];
          const estPremier = iReel === 0;
          const couleurMedaille = couleursMedaille[iReel];
          return (
            <div
              key={item.gemId || item.id || iReel}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 118, opacity: 0, animation: `entreeCascade 0.5s cubic-bezier(0.22,1,0.36,1) ${0.15 + position * 0.12}s forwards` }}
            >
              {estPremier && (
                <span style={{ marginBottom: 2, display: "inline-block", filter: "drop-shadow(0 2px 4px rgba(232,193,90,0.5))", animation: "flotterCouronne 2.6s ease-in-out infinite" }}>
                  <IconeCouronne size={20} color="#E8C15A" />
                </span>
              )}

              {/* Avatar en initiales, avec bordure médaille */}
              <div style={{ position: "relative", marginBottom: 6 }}>
                <div
                  style={{
                    width: estPremier ? 58 : 46, height: estPremier ? 58 : 46, borderRadius: "50%",
                    background: `linear-gradient(145deg, ${couleurMedaille}, ${couleurMedaille}99)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `3px solid ${estPremier ? "#F6F1E4" : "rgba(255,255,255,0.5)"}`,
                    boxShadow: estPremier ? `0 6px 16px ${couleurMedaille}80` : "0 3px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: estPremier ? 20 : 16, color: "#1A2E2A" }}>{initiales(item.nom)}</span>
                </div>
                <div style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%", backgroundColor: couleurMedaille, border: "2px solid var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#1A2E2A" }}>
                  {iReel + 1}
                </div>
              </div>

              <p className="titre-moisson" style={{ fontSize: estPremier ? 13.5 : 11.5, fontWeight: 600, color: CREAM, textAlign: "center", margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item.nom}</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", marginBottom: 8, minHeight: 14 }}>
                {actif.cles.map(([cle, icone]) => {
                  const v = afficherValeur(cle, item[cle]);
                  return v !== null ? <span key={cle} style={{ fontSize: 9, color: "var(--text-secondary-2)", whiteSpace: "nowrap" }}>{icone}{v}</span> : null;
                })}
              </div>

              {/* Marche du podium — dégradé + reflet brillant qui balaie doucement */}
              <div
                style={{
                  position: "relative", width: "100%", height: hauteursPodium[position], borderRadius: "12px 12px 4px 4px", overflow: "hidden",
                  background: estPremier
                    ? "linear-gradient(180deg, var(--gold-light), var(--gold) 60%, var(--gold))"
                    : "linear-gradient(180deg, rgba(214,165,76,0.4), rgba(214,165,76,0.15))",
                  boxShadow: estPremier ? "0 8px 20px rgba(214,165,76,0.4)" : "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)" }} />
                {estPremier && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, width: "35%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", animation: "balayageReflet 3.2s ease-in-out infinite" }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {actif.cle === "gem" && top3[0] && (top3[0].nomResponsable || top3[0].rattachement) && (
        <p style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", marginBottom: 10 }}>
          {top3[0].nomResponsable ? <span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconePersonne size={11}/> {top3[0].nomResponsable}</span> : "Aucun responsable"}{top3[0].rattachement ? ` — ${top3[0].rattachement}` : ""}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {actif.cles.map(([, icone]) => (
          <span key={icone} style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            {icone} {{ "📋": "Rapports remplis", "📅": "Présence au culte", "🌱": "Suivi des nouveaux", "🙏": "Activités effectuées" }[icone]}
          </span>
        ))}
      </div>
    </div>
  );
}

// Graphique en courbe — tracé lisse (courbe de Bézier), animation de dessin
// progressif, et un effet "verni" (dégradé brillant sous la courbe) pour un
// rendu plus riche que de simples barres.
function GraphiqueCourbe({ donnees, hauteur = 160, couleur = "var(--gold)" }) {
  const [dessine, setDessine] = useState(false);
  const cheminRef = useRef(null);
  const [longueurChemin, setLongueurChemin] = useState(0);
  const idDegrade = useRef(`degrade-courbe-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (cheminRef.current) setLongueurChemin(cheminRef.current.getTotalLength());
    const id = requestAnimationFrame(() => setDessine(true));
    return () => cancelAnimationFrame(id);
  }, [donnees]);

  if (!donnees || donnees.length === 0) return null;

  const largeurVue = 600, hauteurVue = hauteur;
  const marge = 24;
  const max = Math.max(1, ...donnees.map(d => d.valeur));
  const min = Math.min(0, ...donnees.map(d => d.valeur));
  const etendue = Math.max(1, max - min);
  const pas = donnees.length > 1 ? (largeurVue - marge * 2) / (donnees.length - 1) : 0;

  const points = donnees.map((d, i) => ({
    x: marge + i * pas,
    y: marge + (hauteurVue - marge * 2) * (1 - (d.valeur - min) / etendue),
    ...d,
  }));

  // Construit une courbe lisse (Catmull-Rom → Bézier) passant par tous les points
  function cheminLisse(pts) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const chemin = cheminLisse(points);
  const cheminZone = `${chemin} L ${points[points.length - 1].x} ${hauteurVue - marge} L ${points[0].x} ${hauteurVue - marge} Z`;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${largeurVue} ${hauteurVue}`} style={{ width: "100%", minWidth: 320, height: hauteurVue, display: "block" }}>
        <defs>
          <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity="0.35" />
            <stop offset="100%" stopColor={couleur} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${idDegrade}-verni`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(l => (
          <line key={l} x1={marge} x2={largeurVue - marge} y1={marge + (hauteurVue - marge * 2) * l} y2={marge + (hauteurVue - marge * 2) * l} stroke="rgba(239,203,119,0.1)" strokeWidth="1" />
        ))}

        {/* Zone sous la courbe, remplie en fondu */}
        <path d={cheminZone} fill={`url(#${idDegrade})`} style={{ opacity: dessine ? 1 : 0, transition: "opacity 0.8s ease 0.4s" }} />

        {/* La courbe elle-même — se dessine progressivement de gauche à droite */}
        <path
          ref={cheminRef}
          d={chemin} fill="none" stroke={couleur} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: longueurChemin, strokeDashoffset: dessine ? 0 : longueurChemin,
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
            filter: `drop-shadow(0 3px 6px ${couleur}55)`,
          }}
        />

        {/* Effet "verni" — un reflet brillant qui glisse sous la courbe */}
        <path d={cheminZone} fill={`url(#${idDegrade}-verni)`} style={{ opacity: dessine ? 1 : 0, transition: "opacity 1s ease 0.6s" }} />

        {/* Points, avec un léger effet "pop" en cascade */}
        {points.map((p, i) => (
          <g key={i} style={{ opacity: dessine ? 1 : 0, transform: dessine ? "scale(1)" : "scale(0)", transformOrigin: `${p.x}px ${p.y}px`, transition: `opacity 0.3s ease ${0.3 + i * 0.06}s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.06}s` }}>
            <circle cx={p.x} cy={p.y} r="8" fill={couleur} opacity="0.18" />
            <circle cx={p.x} cy={p.y} r="4" fill={couleur} stroke="var(--bg-surface)" strokeWidth="1.5" />
            <title>{`${p.libelle} : ${p.texteAffiche ?? p.valeur}`}</title>
          </g>
        ))}

        {/* Étiquettes */}
        {points.map((p, i) => (
          (i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0) && (
            <text key={i} x={p.x} y={hauteurVue - 6} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{p.libelle}</text>
          )
        ))}
      </svg>
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
          <div key={i} style={{ borderTop: "1px solid rgba(239,203,119,0.1)", width: "100%" }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: hauteur, overflowX: "auto", paddingBottom: 4, position: "relative" }}>
        {donnees.map((d, i) => {
          const couleurBarre = d.couleur || "var(--gold)";
          return (
            <div key={i} title={d.infoBulle || `${d.libelle} : ${d.texteAffiche}`} className="barre-graphique" style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 30, cursor: "default" }}>
              <span style={{ fontSize: 11, color: couleurBarre, fontWeight: 700, marginBottom: 4 }}>{d.texteAffiche}</span>
              <div style={{
                width: 22, height: Math.max(5, (d.valeur / max) * (hauteur - 50)),
                background: `linear-gradient(180deg, ${couleurBarre}, ${couleurBarre}cc)`,
                borderRadius: "7px 7px 3px 3px", transition: "height 0.5s cubic-bezier(0.22,1,0.36,1)",
                boxShadow: `0 3px 10px ${couleurBarre}40`,
              }} />
              <span style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 5, whiteSpace: "nowrap" }}>{d.libelle}</span>
            </div>
          );
        })}
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
      <h2 className="titre-moisson" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Historique</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Évolution de l'assemblée dans le temps — {totalMembres} membres suivis au total.</p>

      {chargement ? (
        <Chargement />
      ) : (
        <>
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>📈 Croissance numérique de l'église — {totalMembres} membres actuellement</p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 16 }}>Nouveaux membres (vert) contre départs approuvés (rouge), mois par mois. Solde net affiché sur chaque barre.</p>
            {croissanceParMois.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Pas encore assez de données pour tracer cette courbe — elle se remplira au fil des ajouts de membres.</p>
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
              <EtatVide icone={IconeGroupe} titre="Aucun pointage de présence pour l'instant" />
            ) : (
              <GraphiqueCourbe
                couleur="var(--green)"
                donnees={presenceParDimanche.map(p => ({
                  libelle: new Date(p.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                  valeur: p.presents,
                  texteAffiche: p.presents,
                }))}
              />
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Taux de présence moyen par mois</p>
            {presenceParMois.length === 0 ? (
              <EtatVide icone={IconeCalendrier} titre="Aucune donnée mensuelle pour l'instant" />
            ) : (
              <GraphiqueCourbe
                couleur="var(--green)"
                donnees={presenceParMois.map(m => ({
                  libelle: libelleMois(m.mois),
                  valeur: m.taux,
                  texteAffiche: `${m.taux}%`,
                }))}
              />
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Santé spirituelle moyenne par mois</p>
            {santeParMois.length === 0 ? (
              <EtatVide icone={IconeThermometre} titre="Aucune évaluation enregistrée" />
            ) : (
              <GraphiqueCourbe
                couleur="var(--gold)"
                donnees={santeParMois.map(s => ({
                  libelle: libelleMois(s.mois),
                  valeur: s.moyenne,
                  texteAffiche: s.moyenne,
                }))}
              />
            )}
          </div>

          <div style={cardStyle}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><IconeClipboard size={15} /> Rapports d'activités validés par mois</p>
            {activiteParMois.length === 0 ? (
              <EtatVide icone={IconeClipboard} titre="Aucun rapport d'activité enregistré" />
            ) : (
              <GraphiqueCourbe
                couleur="var(--green)"
                donnees={activiteParMois.map(a => ({
                  libelle: libelleMois(a.mois),
                  valeur: a.taux,
                  texteAffiche: `${a.taux}%`,
                }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
