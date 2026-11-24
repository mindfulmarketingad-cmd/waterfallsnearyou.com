// "[Park Name] Waterfalls in [State]": the park page H1, in Title Case. Parks that cross a state line
// list every state ("Great Smoky Mountains National Park Waterfalls in North Carolina and Tennessee").
// The <title> tag uses the same words, switching to state abbreviations only when the full title would
// run past about 60 characters, which search results cut off.
export function stateLabel(states, key = 'name') {
  const names = states.map((s) => s[key]);
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}
export const parkTitle = (parkName, states) => `${parkName} Waterfalls in ${stateLabel(states)}`;
export function parkTitleTag(parkName, states) {
  const full = parkTitle(parkName, states);
  if (full.length <= 60) return full;
  return `${parkName} Waterfalls in ${stateLabel(states, 'code')}`;
}
