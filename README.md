# OloLink Horizon

Build OloLink Technologies as a realistic global Space-to-Earth communication mission-control prototype.

IMPORTANT:

Visual/interactive prototype only, not engineering-grade simulation.

Keep the UI dark, minimal, premium, aerospace-grade and highly readable.

Do not add unnecessary UI.

CORE:

Create synchronized 3D Earth Globe + 2D World Map.

Both views must share the same asset database, positions, weather, links and mission state.

ASSETS:

• 100 LEO satellites: LEO-001–LEO-100

• 50 HAPS: HAPS-001–HAPS-050

• 50 relay drones: Drone-001–Drone-050

• 50 ground stations: GS-001–GS-050

LEO:

Realistic lightweight satellite models with bus, solar panels and antenna.

Distribute across multiple LEO orbital planes.

Continuously orbit Earth with believable orientation and movement.

HAPS:

Realistic lightweight solar-powered high-altitude fixed-wing aircraft.

18–20 km altitude, above main cloud layer.

Subtle continuous loiter movement.

DRONES:

Realistic fixed-wing relay UAVs.

Operate below HAPS and below/around the cloud layer.

Maintain believable flight movement.

GROUND STATIONS:

Realistic communication terminals with dish/antenna and small infrastructure.

Distributed worldwide.

NETWORK:

Create 50 operational clusters:

LEO → HAPS → Drone → Ground Station.

Keep each cluster geographically associated.

Drone and ground station should be approximately 10–15 km apart.

3D:

Real Earth appearance, realistic geography, oceans, terrain, clouds, atmosphere and day/night lighting.

Smooth orbit, pan and zoom.

2D:

Realistic world map with mouse pan and wheel zoom.

Same assets and links as 3D.

LEFT NAVIGATION:

LEO / HAPS / DRONES / GROUND STATIONS / SEARCH / WORLD VIEW / SETTINGS.

SEARCH:

Search any asset ID and automatically focus it.

Do not show hundreds of labels simultaneously.

Use progressive labels and clean spatial presentation.

Preserve performance and keep 3D models lightweight.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c9762a8d-86cc-4be6-a303-a100cfd436b6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
