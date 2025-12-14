// ======================================================================
// FULL UI INTEGRATION TEST
// Artificial Odds Simulation for Complete System Validation
// ======================================================================
//
// Runs a timed simulation that feeds the entire Odds Intelligence System.
// Should be used ONLY for local testing.
//
// Emits:
//   - live-odds-updated
//   - triggers odds-engine
//   - triggers market-sync
//   - triggers radar
//   - triggers top picks
//
// ======================================================================

let DEMO_INTERVAL = null;

function startFullDemo() {

  console.log("[DEMO] Full UI Integration Test started.");

  let t = 0;

  DEMO_INTERVAL = setInterval(() => {

    t++;

    const feed = {
      "Bet365": {
        odds: {
          home: demoRandom(1.60, 1.80, t),
          draw: demoRandom(3.40, 3.60, t),
          away: demoRandom(4.40, 4.80, t)
        }
      },
      "Stoiximan": {
        odds: {
          home: demoRandom(1.55, 1.85, t+1),
          draw: demoRandom(3.30, 3.70, t+2),
          away: demoRandom(4.5, 4.9, t+3)
        }
      },
      "Pamestoixima": {
        odds: {
          home: demoRandom(1.50, 1.90, t+2),
          draw: demoRandom(3.25, 3.75, t+1),
          away: demoRandom(4.6, 5.0, t+2)
        }
      },
      "Betshop": {
        odds: {
          home: demoRandom(1.65, 1.95, t+3),
          draw: demoRandom(3.45, 3.80, t+4),
          away: demoRandom(4.7, 5.1, t+5)
        }
      },
      "Pinnacle": {
        odds: {
          home: demoRandom(1.58, 1.88, t+1),
          draw: demoRandom(3.35, 3.65, t+2),
          away: demoRandom(4.55, 4.95, t+3)
        }
      }
    };

    emit("live-odds-updated", feed);

    if (t > 60) {
      clearInterval(DEMO_INTERVAL);
      console.log("[DEMO] Full UI Integration Test completed.");
    }

  }, 2000);
}


// Randomizer that creates realistic market waves
function demoRandom(min, max, seed) {
  return Number((min + (max - min) * Math.abs(Math.sin(seed * 0.35))).toFixed(2));
}
