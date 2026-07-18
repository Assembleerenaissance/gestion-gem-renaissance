import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

/* ============================================================================
   GESTION DES GEM — Étape 2 : Tribus, Départements, GEM, Membres
   ============================================================================ */

const TEAL_950 = "#0D5C52", TEAL_900 = "#116A5F", TEAL_850 = "#14776B";
const TEAL_800 = "#188478", TEAL_700 = "#1F9C8D", TEAL_600 = "#27B3A1";
const GOLD = "#D0AF1C", GOLD_LIGHT = "#E8CA4A", CREAM = "#FFFFFF";
const RED_LIGHT = "#e2626d";

export default function App() {
  const [session, setSession] = useState(null);
  const [compte, setCompte] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) chargerCompte(session.user.id);
      else setChargement(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
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

  if (chargement) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: TEAL_950, color: CREAM }}>
        Chargement…
      </div>
    );
  }

  if (!session || !compte) return <EcranConnexion />;

  return <TableauDeBord compte={compte} />;
}

/* --------------------------- Écran de connexion --------------------------- */

function EcranConnexion() {
  const [mode, setMode] = useState("connexion");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

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
    const { data, error } = await supabase.auth.signUp({ email: emailTechnique(telephone), password: motDePasse });
    if (error) { setErreur(error.message); setChargement(false); return; }
    const { error: erreurCompte } = await supabase.from("comptes").insert({ user_id: data.user.id, nom, telephone, role: null, assistant: false });
    if (erreurCompte) setErreur(erreurCompte.message);
    setChargement(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: TEAL_950, padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, backgroundColor: TEAL_900, border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 24 }}>
        <h1 style={{ color: CREAM, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Gestion des GEM</h1>
        <p style={{ color: "#cdeae4", fontSize: 13, marginBottom: 20 }}>Assemblée RENAISSANCE — Vases d'Honneur</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setMode("connexion")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "connexion" ? TEAL_700 : "transparent", color: mode === "connexion" ? GOLD_LIGHT : "#cdeae4", border: `1px solid ${TEAL_600}` }}>Se connecter</button>
          <button onClick={() => setMode("inscription")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "inscription" ? TEAL_700 : "transparent", color: mode === "inscription" ? GOLD_LIGHT : "#cdeae4", border: `1px solid ${TEAL_600}` }}>Inscription</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "inscription" && (
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
          )}
          <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" type="tel" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
          <input value={motDePasse} onChange={e => setMotDePasse(e.target.value)} placeholder="Mot de passe (8 car. min.)" type="password" style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
          {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}
          <button disabled={chargement} onClick={mode === "connexion" ? seConnecter : sInscrire} style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, color: TEAL_950, border: "none", cursor: "pointer" }}>
            {chargement ? "…" : mode === "connexion" ? "Accéder à mon espace" : "Créer mon compte"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Tableau de bord ----------------------------- */

function TableauDeBord({ compte }) {
  const [page, setPage] = useState("dashboard");
  const [gemOuvert, setGemOuvert] = useState(null);
  const [tribus, setTribus] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [gems, setGems] = useState([]);
  const [membres, setMembres] = useState([]);
  const [chargement, setChargement] = useState(true);

  const estPasteur = compte.role === "pasteur" || compte.assistant === true;

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    setChargement(true);
    const [{ data: t }, { data: d }, { data: g }, { data: m }] = await Promise.all([
      supabase.from("tribus").select("*").order("nom"),
      supabase.from("departements").select("*").order("nom"),
      supabase.from("gems").select("*").order("nom"),
      supabase.from("membres").select("*").order("nom"),
    ]);
    setTribus(t || []); setDepartements(d || []); setGems(g || []); setMembres(m || []);
    setChargement(false);
  }

  async function seDeconnecter() { await supabase.auth.signOut(); }

  const cardStyle = { backgroundColor: TEAL_850, border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 20 };
  const btnStyle = { padding: "8px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", border: "none" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: TEAL_950, color: CREAM, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${TEAL_800}`, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontSize: 13, color: "#cdeae4", margin: 0 }}>Bienvenue, <b style={{ color: CREAM }}>{compte.nom}</b></p>
          <p style={{ fontSize: 11, color: "#a9d6cf", margin: 0 }}>{compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant désigné" : "Responsable"}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => { setPage("dashboard"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "dashboard" ? TEAL_700 : "transparent", color: page === "dashboard" ? GOLD_LIGHT : "#cdeae4" }}>Tableau de bord</button>
          <button onClick={() => { setPage("tribus"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "tribus" ? TEAL_700 : "transparent", color: page === "tribus" ? GOLD_LIGHT : "#cdeae4" }}>Tribus</button>
          <button onClick={() => { setPage("departements"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "departements" ? TEAL_700 : "transparent", color: page === "departements" ? GOLD_LIGHT : "#cdeae4" }}>Départements</button>
          <button onClick={seDeconnecter} style={{ ...btnStyle, backgroundColor: "transparent", color: "#cdeae4" }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {chargement ? (
          <p style={{ color: "#cdeae4" }}>Chargement des données…</p>
        ) : gemOuvert ? (
          <DetailGem
            gem={gemOuvert}
            membres={membres.filter(m => m.gem_id === gemOuvert.id)}
            onBack={() => setGemOuvert(null)}
            onMembreAjoute={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : page === "dashboard" ? (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Tableau de bord</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{membres.length}</p></div>
              <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>GEM actifs</p><p style={{ fontSize: 28, fontWeight: 700 }}>{gems.length}</p></div>
              <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Tribus</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tribus.length}</p></div>
              <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Départements</p><p style={{ fontSize: 28, fontWeight: 700 }}>{departements.length}</p></div>
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
            onCreerGem={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : (
          <ListeParents
            titre="Les 28 départements"
            items={departements}
            type="departement"
            gems={gems}
            estPasteur={estPasteur}
            onOpenGem={setGemOuvert}
            onCreerGem={chargerDonnees}
            cardStyle={cardStyle}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------- Liste Tribus / Départements ------------------------- */

function ListeParents({ titre, items, type, gems, estPasteur, onOpenGem, onCreerGem, cardStyle }) {
  const [recherche, setRecherche] = useState("");
  const [creationPour, setCreationPour] = useState(null);
  const [nomNouveauGem, setNomNouveauGem] = useState("");

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
          return (
            <div key={it.id} style={cardStyle}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>{it.nom}</p>
              {gemsDuParent.length === 0 ? (
                <p style={{ fontSize: 12, color: "#a9d6cf", fontStyle: "italic" }}>Aucun GEM pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {gemsDuParent.map(g => (
                    <button key={g.id} onClick={() => onOpenGem(g)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, backgroundColor: TEAL_700, color: GOLD_LIGHT, border: "none", fontSize: 13, cursor: "pointer" }}>
                      {g.nom}
                    </button>
                  ))}
                </div>
              )}
              {estPasteur && (
                creationPour === it.id ? (
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                    <input value={nomNouveauGem} onChange={e => setNomNouveauGem(e.target.value)} placeholder="Nom du GEM" style={{ flex: 1, padding: 6, borderRadius: 6, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, fontSize: 12 }} />
                    <button onClick={() => creerGem(it.id)} style={{ padding: "6px 10px", borderRadius: 6, backgroundColor: GOLD, color: TEAL_950, border: "none", fontSize: 12, fontWeight: 700 }}>OK</button>
                  </div>
                ) : (
                  <button onClick={() => setCreationPour(it.id)} style={{ marginTop: 10, fontSize: 12, color: "#a9d6cf", background: "none", border: "none", cursor: "pointer" }}>+ Créer un GEM ici</button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- Détail GEM ------------------------------- */

function DetailGem({ gem, membres, onBack, onMembreAjoute, cardStyle }) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [erreur, setErreur] = useState("");

  async function ajouterMembre() {
    setErreur("");
    if (!nom.trim() || !telephone.trim()) { setErreur("Nom et téléphone requis."); return; }
    const { error } = await supabase.from("membres").insert({ gem_id: gem.id, nom: nom.trim(), telephone: telephone.trim() });
    if (error) { setErreur(error.message); return; }
    setNom(""); setTelephone("");
    onMembreAjoute();
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#a9d6cf", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Retour</button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{gem.nom}</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>{membres.length} membre{membres.length > 1 ? "s" : ""}</p>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Ajouter un membre</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          <button onClick={ajouterMembre} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Ajouter</button>
        </div>
        {erreur && <p style={{ color: RED_LIGHT, fontSize: 12, marginTop: 8 }}>{erreur}</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {membres.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun membre pour l'instant.</p>
        ) : (
          membres.map(m => (
            <div key={m.id} style={{ ...cardStyle, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{m.nom}</span>
              <span style={{ fontSize: 12, color: "#a9d6cf" }}>{m.telephone}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
