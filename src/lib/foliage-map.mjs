// Per-state embed of the same ArcGIS Experience the foliage hub uses.
// The experience is Fall Foliage Viewing (id 4c5ee350d0f745a2a4c4608f4c19db51).
// Its Map widget accepts a viewpoint URL parameter and ignores an extent
// parameter. The desktop map is widget_296. The phone and tablet layouts use
// widget_256, widget_384, and widget_291, so the same viewpoint is set on
// every map widget. The center is the middle of the Census bounding box.
// The scale fits that box in the map pane, in Web Mercator meters per pixel
// at 96 dpi, which is how the ArcGIS JS API turns a resolution into a scale.
import { hubCopy } from '../content/foliage/hub.mjs';
import { stateOutline } from './state-outline.mjs';

const MAP_WIDGETS = ['widget_296', 'widget_384', 'widget_256', 'widget_291'];
const EARTH = 6378137;
const MAX_LAT = 85.05112878;
const DPI = 96;
const INCHES_PER_METER = 39.37007874015748;
// Visible map pane inside the experience, not the whole iframe. Side panels
// take part of a desktop embed, and the phone layout's map is shorter.
// Fitting the state to this pane keeps it on screen in both.
const PANE_WIDTH = 460;
const PANE_HEIGHT = 300;
const PANE_PAD = 1.18;

function mercX(lon) {
  return EARTH * lon * Math.PI / 180;
}

function mercY(lat) {
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const phi = clamped * Math.PI / 180;
  return EARTH * Math.log(Math.tan(Math.PI / 4 + phi / 2));
}

export function foliageMapScale(bounds, paneW = PANE_WIDTH, paneH = PANE_HEIGHT) {
  const width = Math.abs(mercX(bounds.east) - mercX(bounds.west));
  const height = Math.abs(mercY(bounds.north) - mercY(bounds.south));
  const resolution = Math.max((width * PANE_PAD) / paneW, (height * PANE_PAD) / paneH);
  return Math.max(1000, Math.round(resolution * DPI * INCHES_PER_METER));
}

export function foliageEmbed(slug, name) {
  const { bounds } = stateOutline(slug);
  const lon = Math.round(((bounds.west + bounds.east) / 2) * 10000) / 10000;
  const lat = Math.round(((bounds.south + bounds.north) / 2) * 10000) / 10000;
  const scale = foliageMapScale(bounds);
  const viewpoint = encodeURIComponent(JSON.stringify({
    rotation: 0,
    scale,
    targetGeometry: {
      spatialReference: { wkid: 4326, latestWkid: 4326 },
      x: lon,
      y: lat,
    },
  }));
  const hash = MAP_WIDGETS.map((id) => `${id}=viewpoint:${viewpoint}`).join('&');
  return {
    src: `${hubCopy.esri.url}#${hash}`,
    title: `Fall foliage map of ${name}, ${hubCopy.esri.title}`,
    caption: `${hubCopy.esri.caption} Opened centered on ${name}.`,
    lead: `${hubCopy.esri.lead} For ${name}, it opens centered on the state. The center is the middle of the state's bounding box in the U.S. Census Bureau cartographic boundary, 2017 edition. The colored prediction layer in the experience is the Massachusetts Department of Conservation and Recreation forecast published in that app. It is not a forecast for any other state.`,
    attribution: hubCopy.esri.caption,
    bounds,
    center: { lon, lat },
    scale,
  };
}

export const FOLIAGE_WIDGETS = MAP_WIDGETS;
export const FOLIAGE_BASE = hubCopy.esri.url;
// Contiguous U.S. box used for the national view and for deciding whether a visitor is inside it.
export const US_BOUNDS = { west: -125, south: 24.4, east: -66.9, north: 49.6 };

// Wide national embed: the same Esri experience centered on the contiguous United States.
export function foliageUsEmbed() {
  const lon = Math.round(((US_BOUNDS.west + US_BOUNDS.east) / 2) * 10000) / 10000;
  const lat = Math.round(((US_BOUNDS.south + US_BOUNDS.north) / 2) * 10000) / 10000;
  const scale = foliageMapScale(US_BOUNDS, 1000, 480);
  const viewpoint = encodeURIComponent(JSON.stringify({ rotation: 0, scale, targetGeometry: { spatialReference: { wkid: 4326, latestWkid: 4326 }, x: lon, y: lat } }));
  const hash = MAP_WIDGETS.map((id) => `${id}=viewpoint:${viewpoint}`).join('&');
  return {
    src: `${hubCopy.esri.url}#${hash}`,
    title: hubCopy.esri.title,
    caption: hubCopy.esri.caption,
    bounds: US_BOUNDS,
    center: { lon, lat },
    scale,
  };
}
