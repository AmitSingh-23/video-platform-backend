# Video platform backend (learning project)

A Node.js and Express backend I built to learn how production-style APIs are put together: layered structure, JWT authentication with refresh tokens, file uploads and MongoDB models. It is a practice project and is not finished.

## What works

- User registration with avatar and cover image upload (Multer to disk, then Cloudinary)
- Login and logout with access and refresh tokens stored in HTTP-only cookies
- Refresh-token endpoint that issues a new access token
- Passwords hashed with bcrypt; protected routes guarded by an auth middleware
- Consistent `ApiError` and `ApiResponse` wrappers and an async handler

Controllers for changing the password, reading the current user and updating the avatar and cover image are written but not yet connected to routes. Video and subscription models exist without endpoints.

## Routes

All routes are mounted under `/api/v1/user`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | No | Create a user (multipart form with `avatar`, optional `coverImage`) |
| POST | `/login` | No | Log in and set token cookies |
| POST | `/logout` | Yes | Clear the refresh token and cookies |
| POST | `/refreshtoken` | No | Exchange a refresh token for a new access token |

## Project structure

```
backend/src/
  index.js        entry point, connects to MongoDB and starts the server
  app.js          Express app, middleware and routers
  controller/     request handlers
  route/          route definitions
  model/          Mongoose models (user, video, subscriptions)
  middleware/     JWT auth and Multer upload
  db/             database connection
  utlis/          ApiError, ApiResponse, asyncHandler, Cloudinary helper
```

## Run it

```bash
cd backend
npm install
npm run dev
```

Create `backend/.env` first with:

```
PORT=8000
MONGO_URL=mongodb://localhost:27017
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=change-me
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=change-me-too
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Stack

Node.js, Express 5, MongoDB with Mongoose, JWT, bcrypt, Multer, Cloudinary
