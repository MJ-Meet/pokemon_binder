<div align="center">

  <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="90" height="90" alt="PokéBinder Master Ball" />

  # ⚡ POKÉBINDER ⚡
  ### The Ultimate National Pokédex Portfolio & 3D Interactive TCG Card Binder

  <p align="center">
    <strong>Digitize • Organize • Showcase • Master All 1,025 Pokémon Across 9 Generations</strong>
  </p>

  <p align="center">
    <a href="https://github.com/MJ-Meet/pokemon_binder"><img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
    <a href="https://github.com/MJ-Meet/pokemon_binder"><img src="https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
    <a href="https://github.com/MJ-Meet/pokemon_binder"><img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
    <a href="https://github.com/MJ-Meet/pokemon_binder"><img src="https://img.shields.io/badge/ES6_JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" /></a>
    <a href="https://github.com/MJ-Meet/pokemon_binder"><img src="https://img.shields.io/badge/CSS3_Glassmorphism-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" /></a>
    <a href="https://github.com/MJ-Meet/pokemon_binder"><img src="https://img.shields.io/badge/Chart.js_4.x-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js" /></a>
  </p>

  <p align="center">
    <a href="#-features">✨ Features</a> •
    <a href="#-interactive-3d-card-physics">🎴 3D Physics</a> •
    <a href="#-the-9-pokemon-regions">🗺️ 9 Regions</a> •
    <a href="#-card-studio--live-preview">🎨 Card Studio</a> •
    <a href="#-architecture">🏗️ Architecture</a> •
    <a href="#-quick-start">🚀 Quickstart</a> •
    <a href="#-api-reference">🔌 API</a>
  </p>

</div>

---

## 🌟 Overview

**PokéBinder** is a full-stack digital Pokémon Trading Card binder and portfolio system built for serious collectors and Pokédex enthusiasts. It blends the nostalgia of physical Pokémon 9-pocket and 16-pocket binders with web technologies: **genuine 3D card flips**, **dynamic holographic glares**, **PostgreSQL binary image preservation (`BYTEA`)**, **interactive Trainer Passports**, and a live **Card Studio**.

Whether you are completing your **Gen 1 Kanto Master Set** or tracking all **1,025 National Pokédex species** up to Paldea, PokéBinder gives you an authentic, reactive, and breathtaking digital collecting experience.

---

## ✨ Features

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           POKÉBINDER SUITE                               │
├──────────────────────┬──────────────────────┬────────────────────────────┤
│  🎴 3D Card Physics  │  🌐 1,025 Pokédex    │  🪪 Trainer Passport       │
│  Flip, sleeve glare  │  All 9 Generations   │  Badges & Regional stats   │
├──────────────────────┼──────────────────────┼────────────────────────────┤
│  🎨 Card Studio Live │  🔍 TCG Spec Modal   │  📊 Pro Analytics          │
│  Real-time preview   │  Full card breakdown │  Chart.js visual insights  │
├──────────────────────┼──────────────────────┼────────────────────────────┤
│  🗄️ Database BYTEA   │  🖨️ A4 PDF Exporter  │  🎛️ Multi-Binder Switcher  │
│  Zero broken links   │  Printable portfolios│  Independent collections   │
└──────────────────────┴──────────────────────┴────────────────────────────┘
```

### 🎴 Interactive 3D Card Physics
- **Realistic 3D Card Flips**: Experience genuine CSS 3D perspective flips (`transform-style: preserve-3d; rotateY(180deg)`) with smooth 500ms easing.
- **Authentic Card Back & Sleeves**: Flip collected cards to inspect backs, or flip missing cards to reveal uncollected silhouette stamps with quick-add actions (`+`).
- **Dynamic Holographic Glare**: Multi-layered diagonal shimmer effect that dynamically responds as your cursor glides across the card surface.

### 🌐 Complete 1,025 National Pokédex
- **All 9 Generations Pre-Configured**: Backed by a clean, structured [pokedex_data.js](frontend/pokedex_data.js) database spanning from `#0001 Bulbasaur` to `#1025 Pecharunt`.
- **Automatic High-Res Artwork**: Automatically fetches official PokeAPI master artwork for missing slots, with instant fallback support.
- **Region Classification**: Instant auto-tagging of regions, generations, and dual-typing for every slot.

### 🪪 Trainer Passport & Regional Gym Badges
- **Live Regional Progress Tracking**: Displays precise completion rates for each of the 9 Pokémon world regions (Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, and Paldea).
- **Pixel-Art Gym Badges**: 8 regional badges displayed with authentic pixel typography and dynamic badge alignment.
- **Active Binder Sync**: Updates on-the-fly as cards are added or removed from the currently active binder.

### 🎨 Card Studio & Live Holographic Preview
- **Two-Column Creator Studio**: An intuitive modal with form controls on the right and an interactive, real-time live preview card on the left.
- **Dynamic Reactive Preview**: As you type the Pokémon name, pick a rarity, or change the type, the preview card instantly recalculates its badge colors, glow effects, and official art.
- **Drag-and-Drop Artwork Uploader**: Upload custom TCG card scans with live thumbnailing, or let the app automatically generate official artwork.

### 🔍 TCG Spec Showcase Modal
- **Comprehensive Card Breakdown**: Displays Set Name, Rarity tier, Card Number (`#143/142`), Region, and Date Added in a retro pixel-font specs table.
- **Jump to Page Navigation**: Instantly opens the exact binder page where the card is placed with a single click.
- **Inline Editing & Armed Delete Protection**: Edit card details directly or safely delete cards with instant UI updates and confirmation safeguards.

### 📊 Pro Collector Analytics & Management
- **Chart.js Visualizations**: Type distribution doughnut chart, Rarity tier breakdown, and cumulative collection growth curve.
- **Favorites Showcase**: Dedicated gallery for your crown jewels with instant sorting (Rarity, Date Added, Name A–Z) and Grid/List views.
- **Set Expansion Tracker**: Manage card sets independently with progress bars, completion percentages, and status filters.
- **Printable A4 PDF Export**: Export entire binders directly into printable A4 PDFs with card artwork, labels, and statistics.

---

## 🗺️ The 9 Pokémon Regions

PokéBinder tracks the complete saga of the Pokémon world across all 9 canonical regions:

| Gen | Region | National Dex ID | Iconic Starters | Signature Gym Badges |
|:---:|:---|:---:|:---|:---|
| **I** | **Kanto** | `#0001` – `#0151` | Bulbasaur • Charmander • Squirtle | Boulder, Cascade, Thunder, Rainbow, Soul, Marsh, Volcano, Earth |
| **II** | **Johto** | `#0152` – `#0251` | Chikorita • Cyndaquil • Totodile | Zephyr, Hive, Plain, Fog, Storm, Mineral, Glacier, Rising |
| **III** | **Hoenn** | `#0252` – `#0386` | Treecko • Torchic • Mudkip | Stone, Knuckle, Dynamo, Heat, Balance, Feather, Mind, Rain |
| **IV** | **Sinnoh** | `#0387` – `#0493` | Turtwig • Chimchar • Piplup | Coal, Forest, Cobble, Fen, Relic, Mine, Icicle, Beacon |
| **V** | **Unova** | `#0494` – `#0649` | Snivy • Tepig • Oshawott | Trio, Basic, Insect, Bolt, Quake, Jet, Freeze, Legend |
| **VI** | **Kalos** | `#0650` – `#0721` | Chespin • Fennekin • Froakie | Bug, Cliff, Rumble, Plant, Voltage, Fairy, Psychic, Iceberg |
| **VII** | **Alola** | `#0722` – `#0809` | Rowlet • Litten • Popplio | Melemele, Akala, Ula'ula, Poni Island Trial Stamps |
| **VIII** | **Galar** | `#0810` – `#0905` | Grookey • Scorbunny • Sobble | Grass, Water, Fire, Fighting/Ghost, Fairy, Rock/Ice, Dark, Dragon |
| **IX** | **Paldea** | `#0906` – `#1025` | Sprigatito • Fuecoco • Quaxly | Cortondo, Artazon, Levincia, Cascarrafa, Medali, Montenevera, Alfornada, Glaseado |

---

## ⚡ Pokémon Type & Rarity Matrix

### Core Pokémon Types
```
 🔥 FIRE       💧 WATER      🌿 GRASS      ⚡ ELECTRIC    👁️ PSYCHIC
 🥊 FIGHTING   🌑 DARK       ⚙️ STEEL      🐲 DRAGON      ⚪ COLORLESS
```

### Official TCG Rarity Tiers
- **Common (C)** • **Uncommon (U)** • **Rare (R)** • **Super Rare (SR)**
- **Baby Shiny (S)** • **Rare Shiny (SSR)**
- **Illustration Rare (IR)** • **Special Art Rare (SAR)** • **Special Illustration Rare (SIR)** • **Gold Hyper Rare (UR)**

---

## 🏗️ Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               CLIENT BROWSER                 │
                    │   Vanilla HTML5 + Modern CSS3 + Vanilla ES6  │
                    │   • 3D Card Physics   • Chart.js Dashboards  │
                    │   • Live Card Studio  • National Pokédex UI  │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTP REST / JSON
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │             FASTAPI REST BACKEND             │
                    │      (Python 3.11+ / Uvicorn ASGI Server)     │
                    │   • Auto-Migrations   • PDF Generator        │
                    │   • Multipart Uploads • Pydantic Validations │
                    └───────┬──────────────────────────────┬───────┘
                            │                              │
                            ▼                              ▼
             ┌─────────────────────────────┐  ┌───────────────────────────┐
             │     POSTGRESQL DATABASE     │  │      PokeAPI SPRITES      │
             │  • Binders, Cards, Sets     │  │   Official Master Artwork │
             │  • Binary Images (BYTEA)    │  │   Sprites (1–1,025)       │
             └─────────────────────────────┘  └───────────────────────────┘
```

---

## 🛠️ Tech Stack

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>Backend Engine</h3>
      <ul>
        <li><strong>Language</strong>: Python 3.11+</li>
        <li><strong>Framework</strong>: <a href="https://fastapi.tiangolo.com/">FastAPI</a> (High-performance ASGI)</li>
        <li><strong>Database</strong>: <a href="https://www.postgresql.org/">PostgreSQL</a> with raw <code>BYTEA</code> image preservation</li>
        <li><strong>ORM</strong>: <a href="https://www.sqlalchemy.org/">SQLAlchemy 2.x</a></li>
        <li><strong>Validation</strong>: <a href="https://docs.pydantic.dev/">Pydantic v2</a></li>
        <li><strong>PDF Generation</strong>: <code>fpdf2</code> & <code>Pillow</code></li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>Frontend Experience</h3>
      <ul>
        <li><strong>Core</strong>: Vanilla HTML5, Modern CSS3, Modular ES6+</li>
        <li><strong>Styling</strong>: Glassmorphism, 3D Transforms, Custom Glows</li>
        <li><strong>Analytics</strong>: <a href="https://www.chartjs.org/">Chart.js 4.x</a></li>
        <li><strong>Typography</strong>: Google Fonts (<code>Inter</code> & <code>Press Start 2P</code>)</li>
        <li><strong>Zero Dependencies</strong>: No Webpack, Vite, React, or Node.js runtime needed</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🚀 Quick Start

### 1. Prerequisites
- [Python 3.11+](https://www.python.org/downloads/)
- [PostgreSQL](https://www.postgresql.org/download/)

### 2. Database Initialization
Create your PostgreSQL database and execute the initial schema:

```bash
# Open PostgreSQL prompt
psql -U postgres

# Create database
CREATE DATABASE pokemon_binder;
\c pokemon_binder

# Apply schema
psql -U postgres -d pokemon_binder -f schema.sql
```

> **Automated Migrations**: All column additions (`card_type`, `rarity`, `favorites`, `notes`, `card_sets`) run **automatically** on server startup.

### 3. Backend Setup
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows (PowerShell/CMD)
source venv/bin/activate    # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with your database credentials:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pokemon_binder
```

Start the FastAPI application:
```bash
python -m uvicorn main:app --reload
```
API server will spin up on **`http://127.0.0.1:8000`** with interactive Swagger documentation at **`http://127.0.0.1:8000/docs`**.

### 4. Launch Frontend
Since the frontend is built entirely on native browser web standards:
- Simply open `frontend/index.html` in any modern web browser, **or**
- Serve it via Python's built-in server:
  ```bash
  cd frontend
  python -m http.server 3000
  ```
  Visit **`http://localhost:3000`** and begin building your collection!

---

## 📂 Repository Structure

```text
POKEMON Binder/
├── backend/
│   ├── main.py            # FastAPI routes, auto-migrations, and PDF export logic
│   ├── models.py          # SQLAlchemy ORM models (Binder, Card, CardSet)
│   ├── schemas.py         # Pydantic request & response validation schemas
│   ├── database.py        # Database engine, connection pooling, and session maker
│   └── requirements.txt   # Python pip dependency requirements
├── frontend/
│   ├── index.html         # Application layout, modals, and views
│   ├── style.css          # Glassmorphism, 3D card flip, and holographic shaders
│   ├── pokedex_data.js    # 1,025 National Pokédex dataset (Gens 1–9)
│   └── app.js             # State manager, 3D interactions, and Chart.js analytics
├── schema.sql             # Base database table definitions
├── vercel.json            # Vercel zero-config static deployment manifest
├── netlify.toml           # Netlify publish directory configuration
└── README.md              # Project documentation & reference manual
```

---

## 🔌 API Reference

| HTTP Method | Route | Description |
|:---:|:---|:---|
| `GET` | `/` | API status and health check |
| `GET` | `/binders` | Retrieve all binders with card counts |
| `POST` | `/binders` | Create a new custom binder |
| `GET` | `/binders/{id}` | Fetch binder with all assigned cards |
| `PUT` | `/binders/{id}` | Update binder name, pages, theme color, or grid size |
| `DELETE` | `/binders/{id}` | Cascade delete a binder and its cards |
| `POST` | `/binders/{id}/cards` | Upload a new card image (`BYTEA`) and metadata |
| `GET` | `/binders/{id}/cards/search?q=` | Search cards within a specific binder |
| `GET` | `/binders/{id}/export` | Generate and stream a printable A4 PDF portfolio |
| `GET` | `/cards` | Global multi-filter card query engine |
| `GET` | `/cards/{id}/image` | Stream binary card image with HTTP 24h cache |
| `PATCH` | `/cards/{id}` | In-place update for card metadata, type, rarity, and notes |
| `PUT` | `/cards/{id}/move` | Reorder card to a different binder slot |
| `PUT` | `/cards/{id}/favorite` | Toggle card favorite status |
| `DELETE` | `/cards/{id}` | Permanently remove a card from collection |
| `GET` | `/favorites` | List all favorited cards across all binders |
| `GET` | `/sets` | Calculate completion rates for all active sets |
| `GET` | `/card-sets` | List all tracked card expansion sets |
| `POST` | `/card-sets` | Register a new expansion set |
| `DELETE` | `/card-sets/{id}` | Delete a tracked set |
| `GET` | `/stats` | Collection-wide analytics for Chart.js dashboard |

---

## 🌐 Production Deployment

### 1. Backend & Database (Render / Railway / Heroku)
Deploy the `backend/` directory as a Python web service connected to a managed PostgreSQL instance. Add your `DATABASE_URL` environment variable in the host dashboard.

### 2. Frontend (Vercel / Netlify)
PokéBinder includes pre-configured `vercel.json` and `netlify.toml` files:
1. Connect your GitHub repository to Vercel or Netlify.
2. In `frontend/app.js`, set `PROD_API` to your live backend endpoint:
   ```javascript
   const PROD_API = 'https://your-api.onrender.com';
   ```
3. Push to `main` — your frontend deploys in seconds with zero build steps!

---

<div align="center">
  <sub>Built with ❤️ for Pokémon trainers and collectors worldwide. Pokémon and its trademarks are © 1995–2026 Nintendo / Creatures Inc. / GAME FREAK inc.</sub>
</div>
