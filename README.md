# PokéBinder 🎴

A premium, full-stack web application for Pokémon Card collectors to digitize, organize, and showcase their collections.

## ✨ Features

- **Binders & Pages**: Organize cards in customizable 4, 9, or 16-pocket grids across up to 200 pages per binder with 8 theme colors.
- **Card Images in Database**: Images are stored directly in PostgreSQL (`BYTEA`), meaning no broken links or missing files when migrating!
- **Glassmorphism UI**: High-end translucent panels, CSS grid layouts, and a responsive sidebar.
- **Holographic Shimmer**: Realistic, CSS-only holographic glares that dynamically shift when you hover over cards.
- **Pokémon Type System**: Every card requires one of 10 core types — *Fire, Water, Grass, Electric, Psychic, Fighting, Dark, Steel, Dragon,* or *Colorless* — each with a distinct color and icon.
- **Rarity Tiers**: Classify cards across 10 rarity levels — from *Common* up to *Gold*, including TCG-specific tiers like *Baby Shiny*, *Special Art Rare (SAR)*, and *Special Illustration Art Rare*.
- **Advanced Filtering & Search**: Filter cards by name, Pokémon type, rarity, set name, favorites-only, and recently added (7-day window). Active filters display as removable chips.
- **Interactive Dashboard**: Rich stats panel with Chart.js visualizations (Type distribution doughnut, Rarity breakdown, Collection Growth over time), collection highlights, slot fill-rate, and a recently-added feed.
- **Favorites Management**: A dedicated page to showcase favorited cards with Grid/List views, sorting (Newest, Oldest, Name A–Z, By Rarity), and quick highlight strips.
- **Explicit Set Management**: Create and manage card sets independently via a dedicated modal. Sets persist even without cards, making it easy to plan ahead.
- **Set Completion Progress**: A dedicated Sets page showing all managed sets with card counts, completion progress bars, search, sorting (by completion %, name, card count), and status filters (All / Completed / In Progress).
- **Detailed Card View & Inline Editing**: Click any card to view detailed metadata (type, rarity, set, card number, binder, date added), write custom notes, toggle favorite status, or edit all fields in-line.
- **Export to PDF**: Generate high-quality printable A4 PDFs of your entire binder with proper pocket layouts, card artwork, name labels, and binder stats in the footer.
- **Auto-Detect Environment**: The frontend automatically detects local vs. production environments and switches the API base URL accordingly.

---

## 🛠️ Tech Stack

**Backend**
- Python 3.11+
- FastAPI (REST API framework)
- PostgreSQL (Database)
- SQLAlchemy (ORM)
- Pydantic v2 (Data Validation)
- python-dotenv (Environment configuration)
- fpdf2 & Pillow (PDF Generation)

**Frontend**
- Vanilla HTML5 / CSS3 / ES6 JavaScript
- Chart.js 4.x (Data visualizations and analytics)
- No build tools required (no React, no Node.js build step)
- Google Fonts (`Inter` & `Bangers`)

---

## 🚀 Setup & Installation

### 1. Database Setup
You need [PostgreSQL](https://www.postgresql.org/download/) installed and running. Create a new database named `pokemon_binder` and apply the base schema.

```bash
# Log into your Postgres shell
psql -U postgres

# Create the database
CREATE DATABASE pokemon_binder;
\c pokemon_binder

# Apply the base schema
psql -U postgres -d pokemon_binder -f schema.sql
```
*(If prompted for a password, enter your PostgreSQL password, default is usually `postgres`)*

> **Note**: All migrations (card_type, favorites, rarity, notes, sets, card_sets table) are **applied automatically** when the FastAPI server starts. No manual migration steps are needed beyond the base schema.

### 2. Backend Setup
Set up the Python environment, configure the database URL, and install the required dependencies.

```bash
cd backend

# (Optional but recommended) Create a virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate # Mac/Linux

# Install requirements
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` directory with your PostgreSQL connection string:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pokemon_binder
```

### 3. Running the App
Start the FastAPI server. By default it runs on `http://127.0.0.1:8000`.

```bash
cd backend
python -m uvicorn main:app --reload
```

Because the frontend is entirely Vanilla browser technologies, you can simply double-click the `frontend/index.html` file to open it in your browser! The frontend JavaScript auto-detects whether you're running locally (`localhost` / `127.0.0.1` / `file://`) and routes API calls to `http://localhost:8000`.

---

## 📂 Project Structure

```text
pokemon_binder/
├── backend/
│   ├── main.py            # FastAPI endpoints, routing, auto-migrations, PDF gen
│   ├── models.py          # SQLAlchemy models (Binder, Card, CardSet)
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── database.py        # Database engine & session (reads .env)
│   └── requirements.txt   # Python pip packages
├── frontend/
│   ├── index.html         # App structure & all modal templates
│   ├── style.css          # Glassmorphism, holographic shimmer, & animations
│   └── app.js             # State management, API fetching, Chart.js, & routing
├── schema.sql             # Base database table creation (binders + cards)
├── vercel.json            # Vercel frontend deployment config
├── netlify.toml           # Netlify frontend deployment config
└── .gitignore             # Standard Python/Node/IDE ignores
```

---

## 🔌 API Endpoints

| Method   | Endpoint                                | Description                                  |
|----------|-----------------------------------------|----------------------------------------------|
| `GET`    | `/`                                     | Health check                                 |
| `GET`    | `/binders`                              | List all binders                             |
| `POST`   | `/binders`                              | Create a new binder                          |
| `GET`    | `/binders/{id}`                         | Get binder with all cards                    |
| `PUT`    | `/binders/{id}`                         | Update binder settings                       |
| `DELETE` | `/binders/{id}`                         | Delete a binder and all its cards            |
| `POST`   | `/binders/{id}/cards`                   | Upload a new card (multipart form)           |
| `GET`    | `/binders/{id}/cards/search?q=`         | Search cards within a binder                 |
| `GET`    | `/binders/{id}/export`                  | Export binder as A4 PDF                      |
| `GET`    | `/cards`                                | Global cross-binder card search with filters |
| `GET`    | `/cards/{id}/image`                     | Serve card image (cached 24h)                |
| `PATCH`  | `/cards/{id}`                           | Update card metadata (name, type, rarity, notes, set) |
| `PUT`    | `/cards/{id}/move`                      | Move card to a different slot                |
| `PUT`    | `/cards/{id}/favorite`                  | Toggle favorite flag                         |
| `DELETE` | `/cards/{id}`                           | Delete a card                                |
| `GET`    | `/favorites`                            | List all favorited cards                     |
| `GET`    | `/sets`                                 | Get per-set completion statistics            |
| `GET`    | `/card-sets`                            | List all managed card sets                   |
| `POST`   | `/card-sets`                            | Create a new card set                        |
| `DELETE` | `/card-sets/{id}`                       | Delete a card set (clears set_name on cards) |
| `GET`    | `/stats`                                | Collection-wide statistics for dashboard     |

Full interactive API docs are available at `/docs` (Swagger UI) when the server is running.

---

## 🌐 Deployment (Vercel & Netlify)

Because this is a decoupled Full-Stack application, you can deploy the frontend securely and easily to Vercel or Netlify! The necessary configuration files (`vercel.json` and `netlify.toml`) are already included.

### 1. Host the Backend First
Vercel and Netlify are optimized for Frontend hosting. You should host your Python FastAPI backend and PostgreSQL database on a service like **Render**, **Railway**, or **Heroku**.
* Once your backend is deployed, copy its live URL (e.g., `https://pokemon-binder-api.onrender.com`).

### 2. Update the Frontend API URL
In `frontend/app.js`, update line 3 replacing the `PROD_API` constant with your live backend URL:
```javascript
const PROD_API = 'https://your-backend-url.onrender.com';
```
The frontend automatically uses `PROD_API` when not running on `localhost`, `127.0.0.1`, or `file://`.

### 3. Deploy Frontend
* **Vercel**: Simply import the GitHub repository into Vercel. The `vercel.json` file will automatically route all traffic to the `frontend/` directory.
* **Netlify**: Simply import the GitHub repository into Netlify. The `netlify.toml` file automatically sets the publish directory to `frontend/`.

---

## 📝 License
This project is made for educational and organizational purposes. Pokémon and Pokémon Card Designs belong to Nintendo, Creatures, and Game Freak.
