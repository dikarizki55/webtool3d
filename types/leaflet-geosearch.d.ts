// types/leaflet-geosearch.d.ts
declare module "leaflet-geosearch" {
  import * as L from "leaflet";

  export interface GeoSearchControlOptions extends L.ControlOptions {
    provider: any;
    style?: "bar" | "button";
    autoComplete?: boolean;
    autoCompleteDelay?: number;
    showMarker?: boolean;
    showPopup?: boolean;
    marker?: {
      icon?: L.Icon;
      draggable?: boolean;
    };
    retainZoomLevel?: boolean;
    animateZoom?: boolean;
    keepResult?: boolean;
    searchLabel?: string;
  }

  export class GeoSearchControl extends L.Control {
    constructor(options: GeoSearchControlOptions);
  }

  export class OpenStreetMapProvider {
    constructor(options?: any);
    search(options: { query: string }): Promise<any>;
  }
}
