# WebTool3D - 3D Visualization from OpenStreetMap Data

## 1. Home Page (2D Map)

- **Library**: Leaflet (for 2D map rendering).
- **Features**:
  - Display a basic 2D map with search functionality.
  - Button **"Draw Rectangle"** → enable rectangle selection mode.
  - Button **"Clear"** to clear the selected rectangle area.
  - User draws a rectangle on the map to define an area of interest.
  - Button **"Send to API"** is enabled only when a rectangle is selected.

---

## 2. Generate 3D (Transition to 3D View)

- **Trigger**: User clicks the **"Send to API"** button.
- **Backend request**:
  - Send rectangle coordinates to the backend API.
  - Backend fetches **OSM data** (buildings, rivers, land) for the bounding box.
- **Frontend**:
  - Navigate to a new page `/deepseek/generate-3d` (Next.js App Router).
  - The 2D map disappears → replaced by a **3D viewer**.

---

## 3. 3D Viewer Page (React Three Fiber + OSM Data)

- **Library**: React Three Fiber (R3F) for 3D rendering.
- **Components**:
  - **Base Plate**: Extruded rectangle representing the selected area.
  - **Buildings**: Extruded building polygons with height data from OSM.
  - **Water Areas**: Extruded water body polygons (rivers, lakes, etc.).
  - **Land Areas**: Extruded land area polygons.
- **Default State**: 
  - Base plate rendered in brown.
  - Buildings rendered in white by default.
  - Water areas rendered in blue.
  - Land areas rendered in green.
- **User Interactions**:
  1. **Select buildings** → click on a building in the 3D scene.
  2. **Change building color**:
     - Options: White (default), Red, Green, Blue.
  3. **Reset colors**:
     - A button resets all building colors back to white.
  4. **Adjust layer heights**:
     - Interactive sliders for base plate, water areas, and land areas.
     - Numeric inputs for precise height control.
  5. **Export 3D model**:
     - Button to export the entire 3D scene to 3MF format.
  6. **Navigation**:
     - Orbit controls for rotating, panning, and zooming the 3D view.

---

## 4. Backend Flow

- **Next.js API Routes (App Router)**:
  - `/deepseek/api/osm/buildings` → fetch building data from Overpass API/OSM.
  - `/deepseek/api/osm/rivers` → fetch river and water body data.
  - `/deepseek/api/osm/land` → fetch land polygon data.
- **Data Processing**:
  - Validate and filter OSM data based on bounding box.
  - Extract coordinates and height information.
  - Convert data to format suitable for 3D extrusion.
  - Send processed data back to the frontend.

---

## 5. UX Flow Summary

1. User opens the application → sees the 2D map with search functionality.
2. User selects an area (rectangle) → clicks **"Send to API"**.
3. App fetches OSM data → redirects to 3D viewer page.
4. On 3D viewer page:
   - Base plate, buildings, water areas, and land areas are rendered.
   - User can select buildings → change colors.
   - User can adjust heights of different layers.
   - User can reset all building colors.
   - User can export the 3D model to 3MF format.
5. All interactions are real-time on the client.
   OSM data is only fetched once after the **Send to API** action.

---

## 6. Technical Implementation Details

- **Frontend Technologies**:
  - Next.js 15.5.3 with App Router
  - React 19.1.0
  - TypeScript for type safety
  - Tailwind CSS for styling
  - React Three Fiber for 3D rendering
  - React Three Drei for additional Three.js utilities
  - Leaflet for 2D map rendering
- **Backend Technologies**:
  - Next.js API Routes
  - Overpass API for fetching OSM data
- **3D Export**:
  - Placeholder implementation for 3MF export using @jscadui/3mf-export library

## 7. API Endpoint Details

### Buildings API
- **Endpoint**: `/deepseek/api/osm/buildings`
- **Method**: GET
- **Parameters**:
  - `north` - Northern boundary (latitude)
  - `south` - Southern boundary (latitude)
  - `east` - Eastern boundary (longitude)
  - `west` - Western boundary (longitude)
- **Response**: JSON data containing building polygons with coordinates and tags

### Land Areas API
- **Endpoint**: `/deepseek/api/osm/land`
- **Method**: GET
- **Parameters**:
  - `north` - Northern boundary (latitude)
  - `south` - Southern boundary (latitude)
  - `east` - Eastern boundary (longitude)
  - `west` - Western boundary (longitude)
- **Response**: JSON data containing land area polygons with coordinates and tags

### Water Bodies API
- **Endpoint**: `/deepseek/api/osm/rivers`
- **Method**: GET
- **Parameters**:
  - `north` - Northern boundary (latitude)
  - `south` - Southern boundary (latitude)
  - `east` - Eastern boundary (longitude)
  - `west` - Western boundary (longitude)
- **Response**: JSON data containing water body polygons with coordinates and tags

## 8. File Structure

- `/app` - Main application directory
  - `/deepseek` - 3D visualization feature
    - `/api/osm` - API routes for OSM data
      - `buildings/route.ts` - Buildings API endpoint
      - `land/route.ts` - Land areas API endpoint
      - `rivers/route.ts` - Water bodies API endpoint
    - `/components` - 3D scene components
      - `ThreeDScene.tsx` - Main 3D scene component
    - `/generate-3d` - 3D viewer page
      - `page.tsx` - 3D viewer page component
  - `/map` - 2D map components
    - `page.tsx` - Main map page
    - `MapComponent.tsx` - 2D map component
  - `page.tsx` - Home page