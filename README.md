# HangarStack ✈

**Visual aircraft hangar management for flight schools and FBOs.**

Drag-and-drop aircraft into hangars, get real-time clearance warnings, manage dispatch order, and export a morning pull-out plan — all in a browser.

---

## Stack

- **React + Vite + TypeScript** — frontend
- **Konva.js + react-konva** — 2D hangar canvas
- **Supabase** — PostgreSQL database, auth, real-time sync
- **API Ninjas** — aircraft dimensions database (1,000+ aircraft)

---

## Setup (15 minutes)

### 1. Clone and install

```bash
git clone <your-repo>
cd hangarstack
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon public key** (Settings → API)
3. Go to **SQL Editor** and paste + run the contents of:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
   This creates all tables, RLS policies, and seeds your Pilot Makers hangars.

### 3. Get your API Ninjas key

1. Sign up at [api-ninjas.com](https://api-ninjas.com)
2. Go to My Account → API Key
3. The free tier is sufficient for beta (50,000 calls/month)

### 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_NINJAS_KEY=your_api_ninjas_key_here
VITE_WORKSPACE_ID=00000000-0000-0000-0000-000000000001
```

> The `WORKSPACE_ID` matches the demo workspace seeded in the SQL migration.
> For additional beta locations, create a new workspace row and use that ID.

### 5. Seed the aircraft template library

This pulls ~50 common GA aircraft from API Ninjas and caches them in Supabase.
Subsequent searches will use the local cache — fast and offline-capable.

```bash
npm run seed
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
src/
  types/          TypeScript types for all data models
  lib/
    supabase.ts   Supabase client
    aircraftApi.ts API Ninjas integration + local cache logic
    clearance.ts  OBB collision detection engine
    constants.ts  Status colors and display config
    AppContext.tsx Global state (useReducer)
  hooks/
    useHangarData.ts  Data loading + mutations
  components/
    canvas/
      HangarCanvas.tsx    Konva.js 2D canvas
      ViolationsPanel.tsx Clearance warning bar
    aircraft/
      AddAircraftModal.tsx  Search + add aircraft
    layout/
      Header.tsx    Top bar with status + export
      Sidebar.tsx   Fleet list, dispatch, hangar switcher
  styles/
    global.css    Dark aviation theme
scripts/
  seedAircraft.ts Aircraft template seeder
supabase/
  migrations/
    001_initial_schema.sql  Full database schema
```

---

## Key Concepts

### Coordinate system
- Canvas uses **feet** as the unit of measure
- `PIXELS_PER_FOOT = 6` at 100% zoom (configurable in `clearance.ts`)
- Aircraft are placed by center point (x_ft, y_ft) with rotation in degrees
- 0° = nose pointing toward top of canvas

### Clearance detection
- Uses **Separating Axis Theorem (SAT)** for accurate OBB collision detection
- Default clearance margin: **3 ft** (configurable per hangar)
- Three violation types: `overlap`, `boundary`, `door_blocked`

### Aircraft data flow
1. User searches → `searchAircraftTemplates()` checks Supabase cache first
2. Cache miss → live API Ninjas call → auto-cached for future searches
3. User selects template → enters tail number + details → saved to `aircraft` table
4. Aircraft placed in hangar → `aircraft_placements` row created

---

## Adding Beta Locations

For each new beta site:

```sql
-- Run in Supabase SQL Editor
insert into workspaces (id, name, airport_code)
values (gen_random_uuid(), 'FBO Name Here', 'KABC');

-- Then add their hangars
insert into hangars (workspace_id, name, width_ft, depth_ft, sort_order, doors, obstructions)
values ('<workspace_id>', 'Main Hangar', 150, 90, 0, '[]', '[]');
```

Give each beta user the workspace ID in their `.env.local` — or better, build a
login flow with Supabase Auth so users are automatically scoped to their workspace.

---

## V2 Roadmap

- [ ] Auto-placement optimizer (constraint-based)
- [ ] Tow sequence generator (step-by-step move plan)
- [ ] Schedule/calendar import (CSV)
- [ ] Revenue and occupancy reporting
- [ ] Supabase Auth login with role management
- [ ] Email: morning pull-out plan delivery
- [ ] Mobile-responsive viewer
