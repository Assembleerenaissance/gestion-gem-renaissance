import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { BERGER_IMG } from "./bergerImage";

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
  }

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        backgroundImage: `linear-gradient(180deg, rgba(13,92,82,0.55) 0%, rgba(13,92,82,0.92) 100%), url(${BERGER_IMG})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: mode === "inscription" ? 420 : 380, maxHeight: "92vh", overflowY: "auto", backgroundColor: "rgba(17,106,95,0.92)", backdropFilter: "blur(6px)", border: `1px solid ${TEAL_700}`, borderRadius: 16, padding: 24 }}>
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
  const [mesAssignations, setMesAssignations] = useState([]);
  const [nbDemandesAttente, setNbDemandesAttente] = useState(0);
  const [nbMessagesNonLus, setNbMessagesNonLus] = useState(0);
  const [membres, setMembres] = useState([]);
  const [chargement, setChargement] = useState(true);

  const estPasteur = compte.role === "pasteur" || compte.assistant === true;
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
      const [{ count: cDemandes }, { count: cMessages }] = await Promise.all([
        supabase.from("assignations").select("*", { count: "exact", head: true }).eq("statut", "attente"),
        supabase.from("messages_directs").select("*", { count: "exact", head: true }).eq("lu", false),
      ]);
      setNbDemandesAttente(cDemandes || 0);
      setNbMessagesNonLus(cMessages || 0);
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
    await rafraichirCompteurs();
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
          {estPasteur ? (
            <>
              <button onClick={() => { setPage("dashboard"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "dashboard" ? TEAL_700 : "transparent", color: page === "dashboard" ? GOLD_LIGHT : "#cdeae4" }}>Tableau de bord</button>
              <button onClick={() => { setPage("tribus"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "tribus" ? TEAL_700 : "transparent", color: page === "tribus" ? GOLD_LIGHT : "#cdeae4" }}>Tribus</button>
              <button onClick={() => { setPage("departements"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "departements" ? TEAL_700 : "transparent", color: page === "departements" ? GOLD_LIGHT : "#cdeae4" }}>Départements</button>
              <button onClick={() => { setPage("demandes"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "demandes" ? TEAL_700 : "transparent", color: page === "demandes" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Demandes
                {nbDemandesAttente > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbDemandesAttente}
                  </span>
                )}
              </button>
              <button onClick={() => { setPage("rapports"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "rapports" ? TEAL_700 : "transparent", color: page === "rapports" ? GOLD_LIGHT : "#cdeae4" }}>Rapports</button>
              <button onClick={() => { setPage("historique"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "historique" ? TEAL_700 : "transparent", color: page === "historique" ? GOLD_LIGHT : "#cdeae4" }}>Historique</button>
              <button onClick={() => { setPage("calendrier"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "calendrier" ? TEAL_700 : "transparent", color: page === "calendrier" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Calendrier
                {nbNouveauxEvenements > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbNouveauxEvenements}
                  </span>
                )}
              </button>
              <button onClick={() => { setPage("messagerie"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "messagerie" ? TEAL_700 : "transparent", color: page === "messagerie" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Messagerie
                {nbMessagesNonLus > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbMessagesNonLus}
                  </span>
                )}
              </button>
              {compte.role === "pasteur" && (
                <button onClick={() => { setPage("assistants"); setGemOuvert(null); }} style={{ ...btnStyle, backgroundColor: page === "assistants" ? TEAL_700 : "transparent", color: page === "assistants" ? GOLD_LIGHT : "#cdeae4" }}>Assistants</button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setPage("dashboard")} style={{ ...btnStyle, backgroundColor: (page !== "messagerie" && page !== "calendrier") ? TEAL_700 : "transparent", color: (page !== "messagerie" && page !== "calendrier") ? GOLD_LIGHT : "#cdeae4" }}>Mon espace</button>
              <button onClick={() => setPage("calendrier")} style={{ ...btnStyle, backgroundColor: page === "calendrier" ? TEAL_700 : "transparent", color: page === "calendrier" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Calendrier
                {nbNouveauxEvenements > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbNouveauxEvenements}
                  </span>
                )}
              </button>
              <button onClick={() => setPage("messagerie")} style={{ ...btnStyle, backgroundColor: page === "messagerie" ? TEAL_700 : "transparent", color: page === "messagerie" ? GOLD_LIGHT : "#cdeae4", position: "relative" }}>
                Messagerie
                {nbMessagesNonLus > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, backgroundColor: RED_LIGHT, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {nbMessagesNonLus}
                  </span>
                )}
              </button>
            </>
          )}
          <button onClick={seDeconnecter} style={{ ...btnStyle, backgroundColor: "transparent", color: "#cdeae4" }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {chargement ? (
          <p style={{ color: "#cdeae4" }}>Chargement des données…</p>
        ) : !estPasteur && !mesAssignations.some(a => a.statut === "actif") ? (
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
        ) : !estPasteur ? (
          <MonEspace
            compte={compte}
            assignation={mesAssignations.find(a => a.statut === "actif")}
            gems={gems}
            membres={membres}
            tribus={tribus}
            departements={departements}
            gemOuvert={gemOuvert}
            setGemOuvert={setGemOuvert}
            onMembreAjoute={chargerDonnees}
            onCreerGem={chargerDonnees}
            cardStyle={cardStyle}
          />
        ) : gemOuvert ? (
          <DetailGem
            compte={compte}
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
        ) : page === "departements" ? (
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
        ) : page === "demandes" ? (
          <PageDemandes tribus={tribus} departements={departements} compte={compte} onTraite={chargerDonnees} cardStyle={cardStyle} />
        ) : page === "rapports" ? (
          <PageRapports gems={gems} membres={membres} tribus={tribus} departements={departements} cardStyle={cardStyle} />
        ) : page === "historique" ? (
          <PageHistorique cardStyle={cardStyle} />
        ) : (
          <PageAssistants compte={compte} cardStyle={cardStyle} />
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

function dimancheActuel() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // recule jusqu'au dimanche de cette semaine
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // format YYYY-MM-DD
}

function DetailGem({ compte, gem, membres, onBack, onMembreAjoute, cardStyle }) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nouveauConverti, setNouveauConverti] = useState(false);
  const [erreur, setErreur] = useState("");
  const [dimancheId, setDimancheId] = useState(null);
  const [presences, setPresences] = useState({}); // { membre_id: true/false }
  const [chargementPresences, setChargementPresences] = useState(true);
  const [santeParMembre, setSanteParMembre] = useState({}); // { membre_id: dernierEnregistrement }
  const [membreOuvert, setMembreOuvert] = useState(null);

  useEffect(() => { chargerPresences(); chargerSante(); }, [membres.length]);

  async function chargerSante() {
    if (membres.length === 0) return;
    const { data } = await supabase.from("sante_spirituelle").select("*").in("membre_id", membres.map(m => m.id)).order("date_maj", { ascending: false });
    const map = {};
    (data || []).forEach(s => { if (!map[s.membre_id]) map[s.membre_id] = s; }); // garde la plus récente
    setSanteParMembre(map);
  }

  async function chargerPresences() {
    setChargementPresences(true);
    const date = dimancheActuel();

    // S'assure que le dimanche du jour existe déjà, sinon le crée
    let { data: dim } = await supabase.from("dimanches").select("*").eq("date", date).maybeSingle();
    if (!dim) {
      const { data: nouveauDim } = await supabase.from("dimanches").insert({ date }).select().single();
      dim = nouveauDim;
    }
    setDimancheId(dim.id);

    if (membres.length > 0) {
      const { data: pres } = await supabase.from("presences").select("*").eq("dimanche_id", dim.id).in("membre_id", membres.map(m => m.id));
      const map = {};
      (pres || []).forEach(p => { map[p.membre_id] = p.present; });
      setPresences(map);
    }
    setChargementPresences(false);
  }

  async function basculerPresence(membreId) {
    const nouvelEtat = !presences[membreId];
    setPresences(prev => ({ ...prev, [membreId]: nouvelEtat }));
    await supabase.from("presences").upsert({ membre_id: membreId, dimanche_id: dimancheId, present: nouvelEtat }, { onConflict: "membre_id,dimanche_id" });
  }

  async function ajouterMembre() {
    setErreur("");
    if (!nom.trim() || !telephone.trim()) { setErreur("Nom et téléphone requis."); return; }
    const { error } = await supabase.from("membres").insert({ gem_id: gem.id, nom: nom.trim(), telephone: telephone.trim(), nouveau_converti: nouveauConverti, etape_conversion: "accueil" });
    if (error) { setErreur(error.message); return; }
    setNom(""); setTelephone(""); setNouveauConverti(false);
    onMembreAjoute();
  }

  const presentsCount = membres.filter(m => presences[m.id]).length;
  const dateAffichee = new Date(dimancheActuel() + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: "#a9d6cf", cursor: "pointer", marginBottom: 12, fontSize: 13 }}>← Retour</button>}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{gem.nom}</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>{membres.length} membre{membres.length > 1 ? "s" : ""}</p>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Ajouter un membre</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom complet" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
          <button onClick={ajouterMembre} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Ajouter</button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#a9d6cf", cursor: "pointer" }}>
          <input type="checkbox" checked={nouveauConverti} onChange={e => setNouveauConverti(e.target.checked)} />
          Nouveau converti — suivre son parcours d'intégration
        </label>
        {erreur && <p style={{ color: RED_LIGHT, fontSize: 12, marginTop: 8 }}>{erreur}</p>}
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Présence — dimanche {dateAffichee}</p>
          {!chargementPresences && (
            <span style={{ fontSize: 12, color: GOLD_LIGHT, fontWeight: 700 }}>
              {presentsCount} / {membres.length} présent{presentsCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: "#a9d6cf", marginBottom: 12 }}>Coche chaque membre présent au culte de ce dimanche.</p>

        {chargementPresences ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Chargement…</p>
        ) : membres.length === 0 ? (
          <p style={{ color: "#a9d6cf", fontSize: 13 }}>Ajoute d'abord un membre ci-dessus.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {membres.map(m => {
              const present = !!presences[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => basculerPresence(m.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                    backgroundColor: present ? "rgba(208,175,28,0.15)" : TEAL_900,
                    border: `1px solid ${present ? GOLD : TEAL_700}`, color: CREAM,
                  }}
                >
                  <span>{m.nom}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: present ? GOLD_LIGHT : "#a9d6cf" }}>
                    {present ? "✓ Présent" : "Absent"}
                  </span>
                </button>
              );
            })}
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
              ouvert={membreOuvert === m.id}
              onToggle={() => setMembreOuvert(membreOuvert === m.id ? null : m.id)}
              onSauvegarde={chargerSante}
              onMisAJour={onMembreAjoute}
              cardStyle={cardStyle}
            />
          ))
        )}
      </div>
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

function FicheMembre({ compte, membre, derniereSante, ouvert, onToggle, onSauvegarde, onMisAJour, cardStyle }) {
  const [valeurs, setValeurs] = useState(() => {
    const init = {};
    DIMENSIONS_SANTE.forEach(([cle]) => { init[cle] = derniereSante?.[cle] ?? 5; });
    return init;
  });
  const [sauvegarde, setSauvegarde] = useState(false);
  const [sousOnglet, setSousOnglet] = useState("sante"); // sante | visites | parcours

  const ETAPES_CONVERSION = ["accueil", "classe", "baptise", "integre"];
  const LIBELLES_ETAPES = { accueil: "Accueil", classe: "Classe de baptême", baptise: "Baptisé(e)", integre: "Intégré(e)" };

  async function avancerEtape() {
    const indexActuel = ETAPES_CONVERSION.indexOf(membre.etape_conversion || "accueil");
    if (indexActuel >= ETAPES_CONVERSION.length - 1) return;
    const nouvelleEtape = ETAPES_CONVERSION[indexActuel + 1];
    await supabase.from("membres").update({ etape_conversion: nouvelleEtape }).eq("id", membre.id);
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

  return (
    <div style={cardStyle}>
      <button onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: CREAM, textAlign: "left" }}>
        <div>
          <p style={{ fontWeight: 600 }}>{membre.nom}</p>
          <p style={{ fontSize: 12, color: "#a9d6cf" }}>{membre.telephone}</p>
          {membre.nouveau_converti && (
            <span style={{ fontSize: 10, fontWeight: 700, color: TEAL_950, backgroundColor: GOLD_LIGHT, borderRadius: 999, padding: "2px 8px", display: "inline-block", marginTop: 4 }}>
              🌱 {LIBELLES_ETAPES[membre.etape_conversion || "accueil"]}
            </span>
          )}
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
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button onClick={() => setSousOnglet("sante")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "sante" ? TEAL_700 : TEAL_900, color: sousOnglet === "sante" ? GOLD_LIGHT : "#cdeae4" }}>
              Santé spirituelle
            </button>
            <button onClick={() => setSousOnglet("visites")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "visites" ? TEAL_700 : TEAL_900, color: sousOnglet === "visites" ? GOLD_LIGHT : "#cdeae4" }}>
              Journal des visites
            </button>
            {membre.nouveau_converti && (
              <button onClick={() => setSousOnglet("parcours")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: sousOnglet === "parcours" ? TEAL_700 : TEAL_900, color: sousOnglet === "parcours" ? GOLD_LIGHT : "#cdeae4" }}>
                Parcours
              </button>
            )}
          </div>

          {sousOnglet === "sante" ? (
            <>
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
              <button onClick={enregistrer} style={{ marginTop: 14, padding: "8px 16px", borderRadius: 8, backgroundColor: sauvegarde ? TEAL_700 : GOLD, color: sauvegarde ? GOLD_LIGHT : TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
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
                <button onClick={enregistrerVisite} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
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
                <button onClick={avancerEtape} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Faire avancer à l'étape suivante
                </button>
              ) : (
                <p style={{ fontSize: 13, color: GOLD_LIGHT, fontWeight: 700 }}>🎉 Parcours d'intégration complet</p>
              )}
            </>
          )}
        </div>
      )}
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
    onDemandeEnvoyee();
  }

  if (demandeEnAttente || envoye) {
    return (
      <div style={{ ...cardStyle, maxWidth: 480 }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>Inscription envoyée ✅</p>
        <p style={{ fontSize: 13, color: "#a9d6cf" }}>
          Ta demande de responsabilité a bien été enregistrée. Le Pasteur Dimitri Koffi, ou un assistant désigné, doit encore la valider avant que tu puisses accéder à ton espace. Reviens un peu plus tard — cet écran se mettra à jour automatiquement une fois validée.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Demander une responsabilité</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>
        Ton compte n'a pas encore de responsabilité active. Choisis ce que tu souhaites gérer — le pasteur validera ta demande.
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

        <button onClick={envoyer} style={{ padding: "10px 0", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>
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
            <button onClick={() => setParentType("tribu")} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: parentType === "tribu" ? TEAL_700 : TEAL_900, color: CREAM }}>GEM d'une tribu</button>
            <button onClick={() => setParentType("departement")} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: parentType === "departement" ? TEAL_700 : TEAL_900, color: CREAM }}>GEM d'un département</button>
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
      if (error) { alert(error.message); return; }
      gemId = nouveauGem.id;
    }
    const { error: err2 } = await supabase.from("assignations").update({ statut: "actif", gem_id: gemId, valide_par: compte.id }).eq("id", d.id);
    if (err2) { alert(err2.message); return; }
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
        <p style={{ color: "#a9d6cf" }}>Chargement…</p>
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
                <button onClick={() => valider(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Valider</button>
                <button onClick={() => refuser(d)} style={{ padding: "8px 14px", borderRadius: 8, backgroundColor: "transparent", color: RED_LIGHT, border: `1px solid ${RED_LIGHT}`, cursor: "pointer", fontSize: 12 }}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Mon espace (responsable) ------------------------------- */

function MonEspace({ compte, assignation, gems, membres, tribus, departements, gemOuvert, setGemOuvert, onMembreAjoute, onCreerGem, cardStyle }) {
  const [nomNouveauGem, setNomNouveauGem] = useState("");
  const [creationOuverte, setCreationOuverte] = useState(false);

  if (!assignation) return <p style={{ color: "#a9d6cf" }}>Aucune responsabilité active trouvée.</p>;

  if (gemOuvert) {
    return (
      <DetailGem
        compte={compte}
        gem={gemOuvert}
        membres={membres.filter(m => m.gem_id === gemOuvert.id)}
        onBack={() => setGemOuvert(null)}
        onMembreAjoute={onMembreAjoute}
        cardStyle={cardStyle}
      />
    );
  }

  // Un responsable GEM gère directement et uniquement son propre GEM
  if (assignation.role_demande === "gem") {
    const monGem = gems.find(g => g.id === assignation.gem_id);
    if (!monGem) return <p style={{ color: "#a9d6cf" }}>Ton GEM est en cours de préparation...</p>;
    return (
      <DetailGem
        compte={compte}
        gem={monGem}
        membres={membres.filter(m => m.gem_id === monGem.id)}
        onBack={null}
        onMembreAjoute={onMembreAjoute}
        cardStyle={cardStyle}
      />
    );
  }

  // Un responsable de département ou une tribu voit tous les GEM de son périmètre
  const estDept = assignation.role_demande === "departement_resp";
  const parent = estDept
    ? departements.find(d => d.id === assignation.departement_id)
    : tribus.find(t => t.id === assignation.tribu_id);
  const gemsDuPerimetre = gems.filter(g => estDept ? g.departement_id === assignation.departement_id : g.tribu_id === assignation.tribu_id);

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
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        {estDept ? "Mon département" : "Ma tribu"} — {parent?.nom || "…"}
      </h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>{gemsDuPerimetre.length} GEM sous ta responsabilité</p>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        {creationOuverte ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={nomNouveauGem} onChange={e => setNomNouveauGem(e.target.value)} placeholder="Nom du nouveau GEM" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}` }} />
            <button onClick={creerGem} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Créer</button>
          </div>
        ) : (
          <button onClick={() => setCreationOuverte(true)} style={{ fontSize: 13, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Créer un nouveau GEM</button>
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
    </div>
  );
}

/* ------------------------------- Assistants désignés ------------------------------- */

function PageAssistants({ compte, cardStyle }) {
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
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Assistants désignés</h2>
      <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 20 }}>
        Un assistant a les mêmes droits que toi (voir toutes les données, valider les demandes) — utile pour te seconder.
      </p>

      {chargement ? (
        <p style={{ color: "#a9d6cf" }}>Chargement…</p>
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
              <button
                onClick={() => basculerAssistant(c)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12,
                  backgroundColor: c.assistant ? "rgba(208,175,28,0.15)" : GOLD,
                  color: c.assistant ? GOLD_LIGHT : TEAL_950,
                }}
              >
                {c.assistant ? "✓ Assistant désigné — Retirer" : "Désigner comme assistant"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Rapports ------------------------------- */

function PageRapports({ gems, membres, tribus, departements, cardStyle }) {
  const [dimanches, setDimanches] = useState([]);
  const [dimancheChoisi, setDimancheChoisi] = useState(null);
  const [presences, setPresences] = useState({}); // { membre_id: true/false }
  const [santeParMembre, setSanteParMembre] = useState({}); // { membre_id: dernierEnregistrement }
  const [chargement, setChargement] = useState(true);

  useEffect(() => { chargerDimanches(); }, []);
  useEffect(() => { if (dimancheChoisi) chargerDonneesRapport(); }, [dimancheChoisi]);

  async function chargerDimanches() {
    const { data } = await supabase.from("dimanches").select("*").order("date", { ascending: false }).limit(26);
    setDimanches(data || []);
    if (data && data.length > 0) setDimancheChoisi(data[0].id);
    else setChargement(false);
  }

  async function chargerDonneesRapport() {
    setChargement(true);
    const [{ data: pres }, { data: sante }] = await Promise.all([
      supabase.from("presences").select("*").eq("dimanche_id", dimancheChoisi),
      supabase.from("sante_spirituelle").select("*").order("date_maj", { ascending: false }),
    ]);
    const mapPres = {};
    (pres || []).forEach(p => { mapPres[p.membre_id] = p.present; });
    setPresences(mapPres);
    const mapSante = {};
    (sante || []).forEach(s => { if (s.membre_id && !mapSante[s.membre_id]) mapSante[s.membre_id] = s; });
    setSanteParMembre(mapSante);
    setChargement(false);
  }

  function nomParent(g) {
    if (g.tribu_id) return tribus.find(t => t.id === g.tribu_id)?.nom || "";
    return departements.find(d => d.id === g.departement_id)?.nom || "";
  }

  const totalMembres = membres.length;
  const totalPresents = membres.filter(m => presences[m.id]).length;
  const tauxGlobal = totalMembres > 0 ? Math.round((totalPresents / totalMembres) * 100) : 0;

  const scoresValides = membres.map(m => moyenneSante(santeParMembre[m.id])).filter(s => s !== null);
  const scoreMoyenGlobal = scoresValides.length > 0 ? Math.round((scoresValides.reduce((a, b) => a + b, 0) / scoresValides.length) * 10) / 10 : null;

  const dateAffichee = dimanches.find(d => d.id === dimancheChoisi);
  const dateFormatee = dateAffichee ? new Date(dateAffichee.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Rapports</h2>

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
        <p style={{ color: "#a9d6cf" }}>Chargement…</p>
      ) : dimanches.length === 0 ? (
        <p style={{ color: "#a9d6cf", fontSize: 13 }}>Aucun dimanche enregistré pour l'instant — le pointage de présence en créera automatiquement.</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#a9d6cf", marginBottom: 16 }}>Rapport du dimanche {dateFormatee}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Membres suivis</p><p style={{ fontSize: 28, fontWeight: 700 }}>{totalMembres}</p></div>
            <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Présents ce dimanche</p><p style={{ fontSize: 28, fontWeight: 700, color: GOLD_LIGHT }}>{totalPresents}</p></div>
            <div style={cardStyle}><p style={{ fontSize: 12, color: "#a9d6cf", textTransform: "uppercase" }}>Taux de présence</p><p style={{ fontSize: 28, fontWeight: 700 }}>{tauxGlobal}%</p></div>
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
                return (
                  <div key={g.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>{g.nom}</p>
                      <p style={{ fontSize: 12, color: "#a9d6cf" }}>{nomParent(g)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: GOLD_LIGHT }}>{presentsGem} / {membresGem.length} présents</p>
                      <p style={{ fontSize: 12, color: "#a9d6cf" }}>{tauxGem}% de présence</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------- Messagerie ------------------------------- */

function PageMessagerie({ compte, estPasteur, onActionnee, cardStyle }) {
  const [onglet, setOnglet] = useState("diffusion"); // diffusion | direct
  const [messages, setMessages] = useState([]);
  const [messagesDirects, setMessagesDirects] = useState([]);
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
    const [{ data: m }, { data: md }] = await Promise.all([
      supabase.from("messages").select("*").order("date", { ascending: false }).limit(30),
      supabase.from("messages_directs").select("*").order("date", { ascending: false }).limit(50),
    ]);
    setMessages(m || []);
    setMessagesDirects(md || []);
    if (estPasteur && md && md.length > 0) {
      const ids = [...new Set(md.map(x => x.de_compte_id))];
      const { data: c } = await supabase.from("comptes").select("*").in("id", ids);
      const map = {};
      (c || []).forEach(cc => { map[cc.id] = cc; });
      setComptesParId(map);
    }
    setChargement(false);
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
        <button onClick={() => setOnglet("diffusion")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "diffusion" ? GOLD : TEAL_900, color: onglet === "diffusion" ? TEAL_950 : "#cdeae4" }}>
          Messages du pasteur
        </button>
        <button onClick={() => setOnglet("direct")} style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: onglet === "direct" ? GOLD : TEAL_900, color: onglet === "direct" ? TEAL_950 : "#cdeae4" }}>
          {estPasteur ? "Boîte de réception" : "Écrire au pasteur"}{estPasteur && nonLus > 0 ? ` (${nonLus})` : ""}
        </button>
      </div>

      {chargement ? (
        <p style={{ color: "#a9d6cf" }}>Chargement…</p>
      ) : onglet === "diffusion" ? (
        <div>
          {estPasteur && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Envoyer un message à tous</p>
              <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3} placeholder="Écris ton message ici..." style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
              <button onClick={envoyerDiffusion} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
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
      ) : (
        <div>
          {!estPasteur && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Écrire au pasteur</p>
              <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3} placeholder="Ton message..." style={{ width: "100%", padding: 10, borderRadius: 8, backgroundColor: TEAL_900, color: CREAM, border: `1px solid ${TEAL_600}`, resize: "vertical" }} />
              <button onClick={envoyerDirect} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Envoyer</button>
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
                      <button onClick={() => marquerLu(m.id)} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Marquer comme lu</button>
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
            <button onClick={() => telechargerICS(e)} style={{ fontSize: 11, color: GOLD_LIGHT, background: "none", border: `1px solid ${TEAL_600}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Ajouter au calendrier</button>
            {estPasteur && (
              <button onClick={() => supprimerEvenement(e.id)} style={{ fontSize: 11, color: RED_LIGHT, background: "none", border: `1px solid ${RED_LIGHT}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Supprimer</button>
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
                  <button onClick={creerEvenement} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer" }}>Créer</button>
                  <button onClick={() => setFormOuvert(false)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: "transparent", color: "#a9d6cf", border: `1px solid ${TEAL_600}`, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setFormOuvert(true)} style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: GOLD, color: TEAL_950, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Nouvel événement</button>
          )}
        </div>
      )}

      {chargement ? (
        <p style={{ color: "#a9d6cf" }}>Chargement…</p>
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

function PageHistorique({ cardStyle }) {
  const [chargement, setChargement] = useState(true);
  const [presenceParDimanche, setPresenceParDimanche] = useState([]); // [{ date, presents, total }]
  const [santeParMois, setSanteParMois] = useState([]); // [{ mois, moyenne }]
  const [totalMembres, setTotalMembres] = useState(0);

  useEffect(() => { chargerHistorique(); }, []);

  async function chargerHistorique() {
    setChargement(true);
    const [{ data: dimanches }, { data: presences }, { data: sante }, { count: nbMembres }] = await Promise.all([
      supabase.from("dimanches").select("*").order("date", { ascending: true }).limit(16),
      supabase.from("presences").select("*"),
      supabase.from("sante_spirituelle").select("*"),
      supabase.from("membres").select("*", { count: "exact", head: true }),
    ]);
    setTotalMembres(nbMembres || 0);

    const evolutionPresence = (dimanches || []).map(d => {
      const presentsCeDimanche = (presences || []).filter(p => p.dimanche_id === d.id && p.present).length;
      const totalPointe = (presences || []).filter(p => p.dimanche_id === d.id).length;
      return { date: d.date, presents: presentsCeDimanche, total: totalPointe };
    });
    setPresenceParDimanche(evolutionPresence);

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
        <p style={{ color: "#a9d6cf" }}>Chargement…</p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
