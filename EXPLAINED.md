# PhotoDrop Project Architecture and Beginner Guide

This guide explains how PhotoDrop works from top to bottom in plain language. It is designed for students, beginners, and anyone preparing to explain this project to a teacher or examiner.

---

## 1. Project Overview

PhotoDrop is a web application for group events such as trips, weddings, and college functions.
- One member creates an event and shares an invite link.
- Anyone with the invite link joins the event.
- All members can upload photos in original resolution.
- Members can filter photos by day, uploader, or favorites, select photos, and download them individually or as a single zip file.

### Technology Stack
- **Frontend**: React (built with Vite), Tailwind CSS for styling, Lucide React for SVG icons.
- **Backend**: Python 3, Django, Django REST Framework.
- **Database**: MongoDB (managed through MongoEngine Object-Document Mapper).
- **Authentication**: JSON Web Tokens (JWT) using `django-rest-framework-simplejwt`.
- **Image Processing**: Pillow (Python Imaging Library).

---

## 2. Folder Structure

Here is how the project files are organized on disk:

```text
Momento/
├── backend/                  Backend Django project
│   ├── apps/
│   │   ├── accounts/         User registration, login, profiles, and tokens
│   │   ├── events/           Events, invite links, and event memberships
│   │   └── photos/           Photo upload, thumbnailing, likes, and zip downloads
│   ├── config/               Django project settings, root URLs, and WSGI entry point
│   ├── media/                Saved image files (original, medium, thumbnail)
│   ├── requirements.txt      Python package dependencies list
│   └── manage.py             Django management script
│
├── frontend/                 Frontend React single-page application
│   ├── public/               Static assets (favicon.ico, favicon.svg, apple-touch-icon.png)
│   ├── src/
│   │   ├── components/       Reusable UI parts (Navbar, Footer, PhotoGallery, ProtectedRoute)
│   │   ├── context/          AuthContext for global user login state
│   │   ├── hooks/            useDocumentMeta for page titles and meta descriptions
│   │   ├── pages/            Page screens (Home, Login, Register, Events, Join, Privacy, Terms, 404)
│   │   ├── api.js            API client for network requests and token refresh
│   │   ├── App.jsx           React Router route definitions and layout wrappers
│   │   └── main.jsx          React application entry point
│   ├── package.json          Frontend dependencies and build scripts
│   └── vite.config.js        Vite development server configuration and backend proxy
│
├── EXPLAINED.md              This guide
└── RULES.md                  Core project rules and constraints
```

---

## 3. What Each Django App Does

Django projects are divided into modular packages called apps. Each app handles one specific area of responsibility:

### 1. `apps.accounts`
- Manages user accounts.
- Handles user registration, email validation, and password hashing.
- Handles login and issues JWT tokens (access token and refresh token).
- Provides endpoints for viewing the current logged-in profile (`/api/auth/me/`) and deleting an account along with all photos uploaded by that user.

### 2. `apps.events`
- Manages group photo albums (events).
- Creates events with a name, optional dates, and an automatic unique invite code.
- Manages memberships (who belongs to which event and whether they are an owner or a regular member).
- Validates invite codes so users can join an event through a shared link (`/join/:code`).

### 3. `apps.photos`
- Manages all photo uploads, storage, and retrieval.
- Validates file sizes (up to 25 MB) and file types (JPEG, PNG, WebP).
- Uses Pillow to extract EXIF timestamps and orientation, and generates two resized preview copies (thumbnail and medium preview).
- Tracks photo favorites (likes) per member.
- Provides original photo file downloads and on-the-fly zip file creation for up to 50 photos at a time.

---

## 4. Database Models and Fields

This project uses MongoDB. Instead of relational tables with SQL foreign keys, MongoDB uses collections of JSON-like documents. We use MongoEngine to define models in Python.

### 1. `User` Model (Collection: `users`)
Represents an individual user account.
- `email` (EmailField): The unique email address used to log in. Automatically converted to lowercase.
- `display_name` (StringField): The user's name shown on comments, uploads, and member lists (max 100 characters).
- `password` (StringField): Stored PBKDF2 hash of the password. Plain passwords are never stored.
- `is_active` (BooleanField): Whether the account is active. Defaults to True.
- `created_at` (DateTimeField): Date and time the account was created.
- `updated_at` (DateTimeField): Date and time the account was last modified.

### 2. `Event` Model (Collection: `events`)
Represents a shared group album.
- `name` (StringField): Name of the event, such as "Trip to Manali" (max 200 characters).
- `description` (StringField): Optional description up to 1000 characters.
- `start_date` (DateTimeField): Optional start date of the event.
- `end_date` (DateTimeField): Optional end date of the event.
- `cover_photo` (StringField): Optional relative path to a cover photo.
- `owner` (ReferenceField to User): Reference to the user who created the event.
- `invite_code` (StringField): Unique, unguessable random string generated with Python `secrets.token_urlsafe(16)`.
- `created_at` (DateTimeField): Creation timestamp.
- `updated_at` (DateTimeField): Last update timestamp.

### 3. `Membership` Model (Collection: `memberships`)
Links a user to an event with a specific role.
- `user` (ReferenceField to User): The user who is a member.
- `event` (ReferenceField to Event): The event the user joined.
- `role` (StringField): Either "owner" (creator) or "member" (joined via link).
- `joined_at` (DateTimeField): Date and time the user joined.
- **Unique Compound Index**: `(user, event)` ensures a user cannot join the same event more than once.

### 4. `Photo` Model (Collection: `photos`)
Stores metadata about an uploaded photo and file paths on disk.
- `event` (ReferenceField to Event): The event this photo belongs to.
- `uploader` (ReferenceField to User): The user who uploaded the photo.
- `original_file` (StringField): Relative file path to the untouched original file (e.g. `photos/<event_id>/original/<hash>.jpg`).
- `thumbnail` (StringField): Relative file path to the 400x400 max preview used in the gallery grid.
- `medium_preview` (StringField): Relative file path to the 1600x1600 max preview used in the lightbox viewer.
- `width` (IntField): Width of the original image in pixels.
- `height` (IntField): Height of the original image in pixels.
- `taken_at` (DateTimeField): Date and time the picture was taken, extracted from the camera EXIF data or set to upload time.
- `size_bytes` (IntField): File size of the original photo in bytes.
- `created_at` (DateTimeField): Upload timestamp.

### 5. `Like` Model (Collection: `likes`)
Represents a photo favorited by a user.
- `user` (ReferenceField to User): The user who liked the photo.
- `photo` (ReferenceField to Photo): The photo that was liked.
- `created_at` (DateTimeField): Timestamp when the like was created.
- **Unique Compound Index**: `(user, photo)` ensures a user cannot like the same photo multiple times.

---

## 5. How Login with Tokens Works (JWT)

Traditional websites use server-side sessions where the server stores session IDs in memory or a database. PhotoDrop uses stateless JSON Web Tokens (JWT).

### Step-by-Step Flow:
1. **User enters credentials**: The user types their email and password into the React login form.
2. **React submits request**: React sends a `POST` request to `/api/auth/login/` with the email and password.
3. **Backend verification**:
   - Django finds the user in MongoDB by email.
   - It hashes the entered password using PBKDF2 with SHA-256 and compares it against the stored hash using `check_password`.
4. **Token creation**:
   - If the password matches, the backend generates two tokens:
     - **Access Token**: Valid for a short time (e.g. 60 minutes). Contains the user's ID encrypted and signed by the server's secret key.
     - **Refresh Token**: Valid for a longer time (e.g. 7 days). Used only to get a fresh access token without asking the user to re-enter their password.
5. **Storage**: The backend returns both tokens in the response body. React stores them in the browser's `localStorage`.
6. **Subsequent requests**: On every future request, the React API client adds the header:
   ```text
   Authorization: Bearer <access_token>
   ```
7. **Backend validation**: When Django receives a request, `MongoJWTAuthentication` verifies the token signature with `SECRET_KEY`, extracts the user ID, loads the user from MongoDB, and attaches it to `request.user`.
8. **Automatic token refresh**: If the access token expires, the server responds with HTTP 401 Unauthorized. The React client detects this, sends the refresh token to `/api/auth/refresh/`, gets a new access token, updates `localStorage`, and repeats the original request seamlessly.

---

## 6. How an Upload Travels from React to Database and Disk

When a user drags or selects a photo to upload, here is the complete journey:

```text
React Gallery UI
      │
      ▼ (1. FormData with file and event_id)
XMLHttpRequest (with upload progress tracking)
      │
      ▼ (2. HTTP POST with Authorization: Bearer <token>)
Django REST View (PhotoListUploadView)
      │
      ▼ (3. Check event membership in MongoDB)
Pillow Image Processing (services.py)
      │
      ├── (4a. Save original file) ─────────► media/photos/<id>/original/<hash>.jpg
      ├── (4b. Create 1600px preview) ──────► media/photos/<id>/medium/<hash>.jpg
      └── (4c. Create 400px thumbnail) ─────► media/photos/<id>/thumbnail/<hash>.jpg
      │
      ▼ (5. Create metadata document)
MongoDB Database (photos collection)
      │
      ▼ (6. Return 201 Created JSON)
React updates UI state (photo renders in grid)
```

### Detailed Steps:
1. **Selection in React**: The user picks an image or drops it into the drop zone. React verifies the file type and size before sending.
2. **Network request**: `uploadPhotoWithProgress()` in `api.js` creates a standard HTML5 `FormData` object containing the file. It uses an `XMLHttpRequest` so the browser can emit `progress` events that update the on-screen progress bar percentage.
3. **Authentication and permission check**: Django's `PhotoListUploadView` receives the request. It confirms the user is authenticated and checks the `Membership` collection to verify that the user belongs to the event. If not, it returns HTTP 403 Forbidden.
4. **Image validation**: Pillow opens the image stream, verifies it is a valid JPEG, PNG, or WebP file, and confirms the size is under 25 MB.
5. **EXIF extraction and orientation**: Pillow reads the camera EXIF metadata to determine when the photo was originally taken (`taken_at`). It also applies `ImageOps.exif_transpose` so photos taken on mobile phones in portrait orientation are saved right-side up.
6. **Disk storage**: A cryptographically random name is generated (`secrets.token_hex(8)`). Three files are written into the `media/` directory:
   - Original file: untouched bytes for high quality download.
   - Medium preview: max 1600x1600 JPEG at 85% quality for lightbox view.
   - Thumbnail: max 400x400 JPEG at 80% quality for fast grid browsing.
7. **Database record**: A new `Photo` document is saved to MongoDB with dimensions, file paths, timestamp, event reference, and uploader reference.
8. **Response and UI update**: Django returns HTTP 201 Created with the new photo's JSON data. React appends this object to its state array, causing the new photo to display in the grid immediately without a page reload.

---

## 7. How the Zip Download Works

Allowing users to download up to 50 photos at once as a single zip archive requires clean in-memory packaging:

1. **Selection**: The user selects checkboxes on individual photos in the React gallery. A counter at the bottom displays how many photos are selected.
2. **Request**: The user clicks "Download zip". React calls `downloadEventPhotosZip(eventId, photoIds)`, sending a `POST` request to `/api/events/<event_id>/download/` with `{ photo_ids: [...] }`.
3. **Permission and limit validation**:
   - The backend checks that the user is an event member.
   - It validates that the list has between 1 and 50 photo IDs. If more than 50 are requested, it returns a 400 Bad Request error.
4. **In-memory zip creation**:
   - Instead of writing a temporary zip file to disk (which wastes disk space and requires cleanup jobs), the backend uses Python's built-in `io.BytesIO()` and `zipfile.ZipFile` modules.
   - The backend queries MongoDB for the selected photo records belonging to this event.
   - It reads each original photo from the server's disk and writes it into the zip archive.
5. **Duplicate name protection**: If multiple photos share the same original filename (for example, two different users uploaded a file named `image.jpg`), the backend automatically appends a numeric suffix like `image_1.jpg` so no file overwrites another inside the archive.
6. **Streaming response**: The backend returns an `HttpResponse` with:
   - Content-Type: `application/zip`
   - Content-Disposition: `attachment; filename="<event_name>_photos.zip"`
7. **Browser save**: React receives the binary data as a `Blob`, creates a temporary object URL, programmatically clicks an invisible link, and the browser saves the zip archive into the user's Downloads folder.

---

## 8. How React Pages Call the API

All communication between the frontend and backend is handled through [frontend/src/api.js](file:///c:/Users/ASUS/OneDrive/Desktop/New%20folder/codr/Momento/frontend/src/api.js).

### The Central `apiRequest` Function
Instead of calling `fetch()` with duplicated headers across dozens of files, every request goes through a single helper:

```javascript
// Simplified view of how apiRequest works:
export async function apiRequest(endpoint, options = {}) {
  const { access } = getStoredTokens();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 1. Attach JWT token if user is logged in
  if (access) {
    headers['Authorization'] = `Bearer ${access}`;
  }

  // 2. Perform the fetch
  const response = await fetch(`/api${endpoint}`, { ...options, headers });

  // 3. Handle 401 Unauthorized by attempting a token refresh
  if (response.status === 401 && !options._isRetry) {
    // attempts refresh and retries request
  }

  // 4. Extract data and throw readable errors if response is not ok
  const data = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(data));
  }

  return data;
}
```

### Clean Convenience Methods
Components can call clean methods without worrying about JSON serialization:
- `api.get('/events/')`
- `api.post('/events/', { name, description })`
- `api.patch('/events/123/', { name })`
- `api.delete('/events/123/')`

### User State and React Context
The logged-in user is managed by `AuthContext` (`frontend/src/context/AuthContext.jsx`). Any component can access the current user or logout function with:
```javascript
const { user, logout } = useAuth();
```
When the user logs in, `AuthContext` saves the token and user data. When the user logs out, it removes the tokens from `localStorage` and resets the state to null. Protected routes (`ProtectedRoute.jsx`) check `user` and automatically redirect visitors to `/login` if they are not signed in.

---

## 9. Questions a Teacher Might Ask

Here are 10 questions an examiner or instructor is likely to ask, with clear, direct answers:

### 1. Why did you choose MongoDB instead of a relational database like PostgreSQL or MySQL?
**Answer**: PhotoDrop deals with user-generated event data and photo metadata where documents naturally map to JSON. Event details, variable photo dimensions, EXIF data, and member lists are simple to store as independent documents. MongoDB also scales horizontally well for file-heavy applications and integrates smoothly with Python using MongoEngine.

### 2. What is MongoEngine and why do you use it with Django?
**Answer**: Django has a built-in Object-Relational Mapper (ORM) designed specifically for SQL databases. Because we chose MongoDB, we use MongoEngine, an Object-Document Mapper (ODM). It allows us to define models as Python classes, validate fields, create indexes, and run queries with familiar syntax while saving directly into MongoDB collections.

### 3. How do you ensure only event members can view, upload, or download photos?
**Answer**: Every photo endpoint checks the `Membership` collection before returning data or accepting files. The server takes the authenticated `request.user` from the JWT token and the `event_id` from the URL, and verifies that a membership document exists for that exact user and event. If not, it immediately returns HTTP 403 Forbidden.

### 4. Why are photos stored in the local file system instead of directly in MongoDB?
**Answer**: Storing raw binary files inside a database is an anti-pattern. Large binaries slow down database queries, bloat memory caches, and exceed MongoDB document size limits (16 MB per document). Instead, the server saves files to disk in `media/` and only stores lightweight string paths, dimensions, and timestamps in MongoDB. In production, these local paths can be redirected to cloud storage like AWS S3 or Cloudflare R2 without changing database schemas.

### 5. Why do you generate both a thumbnail and a medium preview instead of just loading the original photo?
**Answer**: Modern smartphone cameras take photos that are 5 MB to 20 MB each. Loading 50 full-sized photos on a gallery page would require downloading hundreds of megabytes, causing slow page loads and high bandwidth costs. Generating a lightweight 400px thumbnail for the gallery grid and a 1600px medium preview for the lightbox makes the UI fast and responsive, while preserving the untouched original file for downloads.

### 6. What is the difference between an access token and a refresh token?
**Answer**: An access token is short-lived (e.g. 60 minutes) and carries user identity in every request. Because it is short-lived, even if intercepted, it quickly becomes useless. A refresh token is long-lived (e.g. 7 days) and is stored securely to request new access tokens when the old one expires. This keeps the application secure without forcing the user to log in repeatedly.

### 7. What happens when an access token expires while a user is actively browsing?
**Answer**: The user experiences no interruption. When an API call fails with status 401, the frontend `api.js` interceptor catches the response, sends the stored refresh token to `/api/auth/refresh/`, receives a new access token, updates `localStorage`, and retries the original request automatically.

### 8. How does the zip download handle two files that have the same filename?
**Answer**: When iterating through the selected photos to build the zip file, the backend maintains a set of filenames already added to the archive. If a file named `photo.jpg` already exists in the archive, it appends a counter, renaming the next one to `photo_1.jpg`, `photo_2.jpg`, and so on. This prevents files from overwriting each other.

### 9. How is password security handled in this project?
**Answer**: Passwords are never stored in plain text. When a user registers or updates their password, Django's `make_password()` function hashes it using PBKDF2 with SHA-256 and a random salt. When logging in, `check_password()` hashes the entered password with the stored salt and verifies the result. Even if the database is exposed, the actual passwords cannot be reversed.

### 10. Why did you use React Context instead of Redux for global state?
**Answer**: Redux introduces significant boilerplate (actions, reducers, dispatchers, store configuration) that is unnecessary for an application of this scope. The only global state needed across the entire app is the current user's login session. React's built-in `createContext`, `useState`, and `useEffect` hooks provide a clean, readable, and standard solution without external dependencies.
