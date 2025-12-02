/* ============================================================
   AI MATCHLAB — GLOBAL MAPPING BUILDER v1.0
   -----------------------------------------
   Παίρνει τις λίγκες από το global dataset
   και φτιάχνει ένα mapping αρχείο που δείχνει:
   league_id → Sofascore tournamentId

   - Γεμίζει αυτόματα τις μεγάλες λίγκες (ENG, ESP, ITA, GER, FRA, NED...)
   - Δημιουργεί placeholders για όσες δεν έχουν ID
   - Δεν χρησιμοποιεί API
   - Είναι 100% συμβατό με history-engine & teams-engine
============================================================ */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname.replace(/[/\\]tools$/, "");
const GLOBAL_PATH = path.join(ROOT, "indexes", "global_leagues_master_GLOBAL.json");
const OUTPUT = path.join(ROOT, "mapping_leagues_sofascore.json");

// ⚠️ ΕΔΩ ΜΠΑΙΝΟΥΝ ΤΑ ΕΤΟΙΜΑ tournamentIds
// (Συνεχώς θα επεκτείνουμε αυτό το object)
const KNOWN = {
  // -----------------------
  // ENGLAND
  // -----------------------
  "ENG1": { id: 17, name: "Premier League" },
  "ENG2": { id: 18, name: "Championship" },
  "ENG3": { id: 19, name: "League One" },
  "ENG4": { id: 20, name: "League Two" },
  "ENG5": { id: 21, name: "National League" },
  "ENGECUP": { id: 25, name: "EFL Cup" },
  "ENGSCUP": { id: 26, name: "FA Cup" },

  // -----------------------
  // SPAIN
  // -----------------------
  "ESP1": { id: 8, name: "LaLiga" },
  "ESP2": { id: 7, name: "LaLiga 2" },
  "ESPCUP": { id: 13, name: "Copa del Rey" },
  "ESPSUP": { id: 12, name: "Supercopa" },

  // -----------------------
  // ITALY
  // -----------------------
  "ITA1": { id: 23, name: "Serie A" },
  "ITA2": { id: 24, name: "Serie B" },
  "ITACUP": { id: 35, name: "Coppa Italia" },

  // -----------------------
  // GERMANY
  // -----------------------
  "GER1": { id: 35, name: "Bundesliga" },
  "GER2": { id: 36, name: "2. Bundesliga" },
  "GERCUP": { id: 37, name: "DFB Pokal" },

  // -----------------------
  // FRANCE
  // -----------------------
  "FRA1": { id: 34, name: "Ligue 1" },
  "FRA2": { id: 33, name: "Ligue 2" },
  "FRACUP": { id: 40, name: "Coupe de France" },

  // -----------------------
  // NETHERLANDS
  // -----------------------
  "NED1": { id: 37, name: "Eredivisie" },
  "NED2": { id: 38, name: "Eerste Divisie" },

  // -----------------------
  // GREECE
  // -----------------------
  "GRE1": { id: 498, name: "Super League" },
  "GRECUP": { id: 500, name: "Greek Cup" },

  // -----------------------
  // TURKEY
  // -----------------------
  "TUR1": { id: 29, name: "Süper Lig" },
  "TURCUP": { id: 30, name: "Turkish Cup" },

  // -----------------------
  // USA / MLS
  // -----------------------
  "USA1": { id: 217, name: "MLS" },

  // -----------------------
  // BRAZIL
  // -----------------------
  "BRA1": { id: 325, name: "Serie A" },
  "BRA2": { id: 326, name: "Serie B" },

  // -----------------------
  // ARGENTINA
  // -----------------------
  "ARG1": { id: 333, name: "Liga Profesional" },

  // Προσθέτουμε συνέχεια…
};

function run() {
  console.log("=== AI MATCHLAB — BUILDING MAPPING FILE ===");

  const global = JSON.parse(fs.readFileSync(GLOBAL_PATH, "utf8"));

  const mapping = {
    _meta: {
      created_at: new Date().toISOString(),
      description: "Static Sofascore mapping for all leagues"
    },
    map: {}
  };

  const unmapped = [];

  for (const continent of Object.keys(global)) {
    if (continent === "International") continue;

    const countries = global[continent];

    for (const country of countries) {
      const leagues = country.leagues || [];

      for (const league of leagues) {
        const LID = league.league_id;

        if (!LID) continue;

        // Αν υπάρχει στα KNOWN → έτοιμο mapping ✔
        if (KNOWN[LID]) {
          mapping.map[LID] = {
            tournamentId: KNOWN[LID].id,
            tournamentName: KNOWN[LID].name
          };
        } else {
          // Αν δεν υπάρχει → placeholder
          mapping.map[LID] = {
            tournamentId: "",
            tournamentName: league.display_name
          };
          unmapped.push(LID);
        }
      }
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(mapping, null, 2), "utf8");

  console.log("\n=== DONE ===");
  console.log(`Mapping written to: ${OUTPUT}`);
  console.log(`\nTotal leagues: ${Object.keys(mapping.map).length}`);
  console.log(`Mapped (KNOWN): ${Object.keys(KNOWN).length}`);
  console.log(`Unmapped: ${unmapped.length}`);

  if (unmapped.length) {
    console.log("\n--- UNMAPPED LEAGUES ---");
    unmapped.forEach((id) => console.log(id));
  }

  console.log("\n==============================");
  console.log(" Προχώρα να δούμε πώς παει 👍");
  console.log("==============================\n");
}

run();
