// Probe-Runde aus der Shop-Detailansicht („Ausprobieren“): ein Design eine Runde lang, höchstens
// TRIAL_SECONDS, ausprobieren. Das Probe-Design gilt nur in seinem eigenen Slot (beim Würfel-Skin bleibt
// z. B. das ausgerüstete Theme); Runden werden nicht ans Portal gemeldet (keine Coins, keine Erfolge),
// sondern beenden die Probe.

export const TRIAL_SECONDS = 60;

export const trialHash = (item) => `#/game/${item.game}/probe/${item.id}`;

// api = normale Spiel-API der Spieleseite; level = Stufe für die Probe (leichteste); onRoundEnd = Runde vorbei
export function trialApi(api, item, { level, onRoundEnd }) {
  return {
    ...api,
    level,
    // Ohne Slot fragen Spiele nach ihrem eigenen (Slot = Spiel-ID)
    getDesign: (slot = item.game) => (slot === item.slot ? item.id : api.getDesign(slot)),
    reportResult: () => onRoundEnd(),
  };
}
