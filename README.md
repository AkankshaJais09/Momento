# PhotoDrop

A web app where a group creates an event, shares an invite link, everyone uploads photos at full quality, and anyone can filter, select and download them.

**Stack:** Django 5 + Django REST Framework + MongoDB (MongoEngine) / React + Vite + Tailwind CSS

---

## Project layout

```
.
├── backend/     Django API
└── frontend/    React client
```

---

## Running the backend

```bash
cd backend

# First time only: create and activate the virtualenv, then install deps
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

# Copy the example env file and fill in your values
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux

# Start the dev server (requires a running MongoDB instance)
python manage.py runserver
```

The API will be available at `http://localhost:8000`.

---

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Running backend tests

```bash
cd backend
venv\Scripts\activate
pip install pytest pytest-django
pytest
```

---

## MongoDB

The app uses MongoDB in all environments. Set `MONGO_URI` in `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/photodrop_dev
```

For production, point this at your MongoDB Atlas cluster URI.

---

## Environment variables (backend)

| Variable              | Required | Description                              |
|-----------------------|----------|------------------------------------------|
| `SECRET_KEY`          | Yes      | Django secret key                        |
| `DEBUG`               | No       | `True` in development, omit in production|
| `MONGO_URI`           | Yes      | Full MongoDB connection string           |
| `ALLOWED_HOSTS`       | No       | Comma-separated list of allowed hosts    |
| `CORS_ALLOWED_ORIGINS`| No       | Comma-separated list of allowed origins  |
