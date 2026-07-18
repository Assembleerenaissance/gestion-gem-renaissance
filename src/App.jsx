import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

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

  if (!session || !compte) {
    return <EcranConnexion />;
  }

  return <TableauDeBord compte={compte} />;
}

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
    const { error } = await supabase.auth.signInWithPassword({
      email: emailTechnique(telephone),
      password: motDePasse,
    });
    if (error) setErreur("Identifiant ou mot de passe incorrect.");
    setChargement(false);
  }

  async function sInscrire() {
    setErreur(""); setChargement(true);
    if (motDePasse.length < 6) { setErreur("Le mot de passe doit contenir au moins 6 caractères."); setChargement(false); return; }
    const { data, error } = await supabase.auth.signUp({
      email: emailTechnique(telephone),
      password: motDePasse,
    });
    if (error) { setErreur(error.message); setChargement(false); return; }
    const { error: erreurCompte } = await supabase.from("comptes").insert({
      user_id: data.user.id,
      nom,
      telephone,
      role: null,
      assistant: false,
    });
    if (erreurCompte) setErreur(erreurCompte.message);
    setChargement(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: TEAL_950, padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, backgroundColor: TEAL_900, border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 24 }}>
        <h1 style={{ color: CREAM, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Gestion des GEM</h1>
        <p style={{ color: "#9fc4bd", fontSize: 13, marginBottom: 20 }}>Assemblée RENAISSANCE — Vases d'Honneur</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setMode("connexion")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "connexion" ? TEAL_700 : "transparent", color: mode === "connexion" ? GOLD_LIGHT : "#9fc4bd", border: `1px solid ${TEAL_600}` }}>
            Se connecter
          </button>
          <button onClick={() => setMode("inscription")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, backgroundColor: mode === "inscription" ? TEAL_700 : "transparent", color: mode === "inscription" ? GOLD_LIGHT : "#9fc4bd", border: `1px solid ${TEAL_600}` }}>
            Inscription
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "inscription" && (
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet"
              style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
          )}
          <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" type="tel"
            style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />
          <input value={motDePasse} onChange={e => setMotDePasse(e.target.value)} placeholder="Mot de passe" type="password"
            style={{ padding: 10, borderRadius: 8, backgroundColor: TEAL_850, color: CREAM, border: `1px solid ${TEAL_700}` }} />

          {erreur && <p style={{ color: RED_LIGHT, fontSize: 12 }}>{erreur}</p>}

          <button
            disabled={chargement}
            onClick={mode === "connexion" ? seConnecter : sInscrire}
            style={{ padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: GOLD, color: TEAL_950, border: "none", cursor: "pointer" }}
          >
            {chargement ? "…" : mode === "connexion" ? "Accéder à mon espace" : "Créer mon compte"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableauDeBord({ compte }) {
  const [gems, setGems] = useState([]);
  const [membres, setMembres] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    setChargement(true);
    const { data: gemsData } = await supabase.from("gems").select("*").order("nom");
    const { data: membresData } = await supabase.from("membres").select("*").order("nom");
    setGems(gemsData || []);
    setMembres(membresData || []);
    setChargement(false);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: TEAL_950, color: CREAM, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${TEAL_800}` }}>
        <div>
          <p style={{ fontSize: 13, color: "#9fc4bd", margin: 0 }}>Bienvenue, <b style={{ color: CREAM }}>{compte.nom}</b></p>
          <p style={{ fontSize: 11, color: "#7fa39c", margin: 0 }}>{compte.role === "pasteur" ? "Pasteur" : compte.assistant ? "Assistant désigné" : "Responsable"}</p>
        </div>
        <button onClick={seDeconnecter} style={{ fontSize: 12, color: "#9fc4bd", background: "none", border: "none", cursor: "pointer" }}>
          Déconnexion
        </button>
      </div>

      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Tableau de bord</h2>

        {chargement ? (
          <p style={{ color: "#9fc4bd" }}>Chargement des données…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            <div style={{ backgroundColor: TEAL_850, border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 12, color: "#9fc4bd", textTransform: "uppercase" }}>Membres suivis</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{membres.length}</p>
            </div>
            <div style={{ backgroundColor: TEAL_850, border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 12, color: "#9fc4bd", textTransform: "uppercase" }}>GEM actifs</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{gems.length}</p>
            </div>
          </div>
        )}

        <p style={{ marginTop: 32, fontSize: 12, color: "#7fa39c", maxWidth: 480 }}>
          Ceci est la base de la migration — authentification et données de membres/GEM fonctionnelles.
        </p>
      </div>
    </div>
  );
}
