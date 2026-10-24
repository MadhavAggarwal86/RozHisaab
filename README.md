# Kirana Shop App

React (Vite) frontend + Node.js/Express backend + MongoDB, with email/password authentication.

## Structure

```
server/   Express API (port 5050)
  src/index.js            app setup + MongoDB connection
  src/models/User.js      shopName, ownerName, email, password (bcrypt-hashed)
  src/routes/auth.js      POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
  src/middleware/auth.js  JWT check for protected routes
client/   React app (port 5173, proxies /api to the server)
  src/pages/              Login, Register, Dashboard
  src/context/AuthContext.jsx  login/register/logout + token in localStorage
```

## Running

1. Have MongoDB running locally (`brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`)
   or put a MongoDB Atlas connection string in `server/.env` as `MONGO_URI`.
2. Backend: `cd server && npm install && npm run dev`
3. Frontend: `cd client && npm install && npm run dev`, then open http://localhost:5173

Copy `server/.env.example` to `server/.env` on a fresh setup and set a long random `JWT_SECRET`.

> Port 5050 is used instead of 5000 because macOS's AirPlay Receiver occupies port 5000.
