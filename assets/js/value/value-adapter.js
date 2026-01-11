/* =========================================================
   VALUE ADAPTER — UI SIDE
   v1.0
========================================================= */

window.ValueEngine = {
  compute(matches) {
    // προσωρινά mock — μέχρι worker endpoint
    // εδώ απλώς επιστρέφουμε empty αν δεν υπάρχουν stats
    if (!Array.isArray(matches) || !matches.length) {
      return [];
    }

    // ΣΤΟ ΕΠΟΜΕΝΟ ΒΗΜΑ:
    // αυτό θα καλεί endpoint /value-picks
    // προς το παρόν, αφήνουμε hook

    return []; 
  }
};
