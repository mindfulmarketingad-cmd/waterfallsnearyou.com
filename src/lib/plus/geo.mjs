const RADIUS = 3958.8;
const rad = (d) => (d * Math.PI) / 180;

export function milesBetween(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Straight-line miles converted with a 1.35 road factor at 40 mph. Not a routed drive. */
export function estimatedDriveHours(miles) {
  return (miles * 1.35) / 40;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}
