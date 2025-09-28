# WebTool3D - 3D Visualization from OpenStreetMap Data

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

This application provides a complete 3D visualization solution that transforms OpenStreetMap data into interactive 3D models with the following features:

1. **Interactive 2D Map** - Select areas using rectangle selection tool
2. **3D Visualization** - Extrude map features into 3D models:
   - Buildings with height data from OSM
   - Base terrain from selected area
   - Water bodies with customizable height
   - Land areas with customizable height
3. **Interactive Controls**:
   - Adjust heights of base, water, and land layers
   - Select and color buildings (white, green, red, blue)
   - Reset all building colors to white
4. **Export Functionality** - Export 3D models to 3MF format

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## How to Use

1. Navigate to the map page
2. Use the "Draw Rectangle" tool to select an area of interest
3. Click "Send to API" to generate the 3D visualization
4. In the 3D view:
   - Adjust layer heights using the sliders
   - Select buildings by clicking on them
   - Change building colors using the color palette
   - Reset all colors to white with the "Reset All Colors" button
   - Export the model to 3MF format

## API Endpoints

- `/deepseek/api/osm/buildings` - Fetch building data for a given area
- `/deepseek/api/osm/land` - Fetch land area data for a given area
- `/deepseek/api/osm/rivers` - Fetch water body data for a given area

Each endpoint accepts the following query parameters:
- `north` - Northern boundary (latitude)
- `south` - Southern boundary (latitude)
- `east` - Eastern boundary (longitude)
- `west` - Western boundary (longitude)

Example request:
```
GET /deepseek/api/osm/buildings?north=-6.235&south=-6.2355&east=106.835&west=106.8345
```

## Technologies Used

- Next.js 15.5.3
- React 19.1.0
- Three.js for 3D rendering
- React Three Fiber for React integration with Three.js
- React Three Drei for additional Three.js utilities
- Leaflet for 2D map rendering
- OpenStreetMap API for map data
- TypeScript for type safety

## Project Structure

- `/app` - Main application pages and components
- `/app/deepseek` - 3D visualization feature
- `/app/deepseek/api/osm` - API routes for fetching OSM data
- `/app/deepseek/components` - 3D scene components
- `/app/deepseek/generate-3d` - 3D visualization page

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.