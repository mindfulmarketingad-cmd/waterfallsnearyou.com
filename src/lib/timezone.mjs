// IANA time zone for a listing: Outscraper's time_zone when present, else the state's zone with
// longitude/latitude splits for states that span two zones.
const BASE = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago', CA: 'America/Los_Angeles',
  CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York', FL: 'America/New_York',
  GA: 'America/New_York', HI: 'Pacific/Honolulu', ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago', KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago', MS: 'America/Chicago',
  MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago', NV: 'America/Los_Angeles', NH: 'America/New_York',
  NJ: 'America/New_York', NM: 'America/Denver', NY: 'America/New_York', NC: 'America/New_York', ND: 'America/Chicago',
  OH: 'America/New_York', OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago', UT: 'America/Denver',
  VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles', WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
};
export function timeZoneFor(l) {
  if (l.os?.timezone && /^[A-Za-z_]+\/[A-Za-z_/]+$/.test(l.os.timezone)) return l.os.timezone;
  const { stateCode: s, lat, lng } = l;
  if (s === 'ID' && lat > 45.5) return 'America/Los_Angeles';
  if (s === 'OR' && lng > -117.6 && lat < 44.5) return 'America/Boise';
  if (s === 'TN' && lng > -85.3) return 'America/New_York';
  if (s === 'KY' && lng < -86.0) return 'America/Chicago';
  if (s === 'FL' && lng < -85.0) return 'America/Chicago';
  if (s === 'MI' && lng < -87.6) return 'America/Menominee';
  if (s === 'TX' && lng < -104.9) return 'America/Denver';
  if ((s === 'ND' || s === 'SD' || s === 'NE' || s === 'KS') && lng < -101.0) return 'America/Denver';
  return BASE[s] || 'America/New_York';
}
