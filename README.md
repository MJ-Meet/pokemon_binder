# PokéBinder 🎴

A premium, full-stack web application for Pokémon Card collectors to digitize, organize, and showcase their collections.

![PokéBinder Interface Preview](https://raw.githubusercontent.com/MJ-Meet/pokemon_binder/main/frontend/style.css) 

## ✨ Features

- **Binders & Pages**: Organize cards in customizable 4, 9, or 16-pocket grids across multiple pages.
- **Card Images in Database**: Images are stored directly in PostgreSQL (`BYTEA`), meaning no broken links or missing files when migrating!
- **Glassmorphism UI**: High-end translucent panels, CSS grid layouts, and a responsive sidebar.
- **Holographic Shimmer**: Realistic, CSS-only holographic glares that dynamically shift when you hover over cards.
- **Card Tagging & Filtering**: Assign custom colored tags alongside a mandatory core **Pokémon Type** (*Fire, Water, Grass, etc.*). The app supports real-time multi-filtering.
- **Export to PDF**: Generate high-quality printable A4 PDFs of your entire binder with proper pocket layouts, card metadata, and binder stats!
- **Stats Dashboard**: Live insights showing filled vs. empty slots, page counts, and unique tags at a glance.

---

## 🛠️ Tech Stack

**Backend**
- Python 3.11+
- FastAPI (REST API framework)
- PostgreSQL (Database)
- SQLAlchemy (ORM)
- Pydantic v2 (Data Validation)
- fpdf2 & Pillow (PDF Generation)

**Frontend**
- Vanilla HTML5 / CSS3 / ES6 JavaScript
- No build tools required (no React, no Node.js build step)
- Google Fonts (`Inter` & `Bangers`)

---

## 🚀 Setup & Installation

### 1. Database Setup
You need [PostgreSQL](https://www.postgresql.org/download/) installed and running. Create a new database named `pokemon_binder` and apply the schemas.

```bash
# Log into your Postgres shell
psql -U postgres

# Create the database
CREATE DATABASE pokemon_binder;
\c pokemon_binder

# Exit the shell or run the SQL files directly from command line:
psql -U postgres -d pokemon_binder -f schema.sql
psql -U postgres -d pokemon_binder -f migration.sql
psql -U postgres -d pokemon_binder -f migration_type.sql
```
*(If prompted for a password, enter your PostgreSQL password, default is usually `postgres`)*

### 2. Backend Setup
Set up the Python environment and install the required dependencies. Navigating into the `backend` folder first is important.

```bash
cd backend

# (Optional but recommended) Create a virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate # Mac/Linux

# Install requirements
pip install -r requirements.txt
```

### 3. Running the App
Start the FastAPI server. By default it runs on `http://127.0.0.1:8000`.

```bash
cd backend
python -m uvicorn main:app --reload
```

Because the frontend is entirely Vanilla browser technologies, you can simply double-click the `frontend/index.html` file to open it in your browser! The frontend JavaScript expects the API to be running on `http://127.0.0.1:8000`.

---

## 📂 Project Structure

```text
pokemon_binder/
├── backend/
│   ├── main.py            # FastAPI endpoints, Routing, PDF Gen
│   ├── models.py          # SQLAlchemy PostgreSQL schemas
│   ├── schemas.py         # Pydantic validation schemas
│   ├── database.py        # Database connection settings
│   └── requirements.txt   # Python pip packages
├── frontend/
│   ├── index.html         # Template & App structure
│   ├── style.css          # Glassmorphism & Animations
│   └── app.js             # Logic, state, and API fetching
├── schema.sql             # Base database table creation
├── migration.sql          # Adds Tags feature tables
└── migration_type.sql     # Adds Pokémon Type column
```

---

## 🌐 Deployment (Vercel & Netlify)

Because this is a decoupled Full-Stack application, you can deploy the frontend securely and easily to Vercel or Netlify! The necessary configuration files (`vercel.json` and `netlify.toml`) are already included.

### 1. Host the Backend First
Vercel and Netlify are optimized for Frontend hosting. You should host your Python FastAPI backend and PostgreSQL database on a service like **Render**, **Railway**, or **Heroku**.
* Once your backend is deployed, copy its live URL (e.g., `https://pokemon-binder-api.onrender.com`).

### 2. Update the Frontend API URL
In `frontend/app.js`, update line 4 replacing the placeholder with your live backend URL:
```javascript
const PROD_API = 'https://your-backend-url.onrender.com';
```

### 3. Deploy Frontend
* **Vercel**: Simply import the GitHub repository into Vercel. The `vercel.json` file will automatically route all traffic to the `frontend/` directory.
* **Netlify**: Simply import the GitHub repository into Netlify. The `netlify.toml` file automatically sets the publish directory to `frontend/`.

---

## 📝 License
This project is made for educational and organizational purposes. Pokémon and Pokémon Card Designs belong to Nintendo, Creatures, and Game Freak.
