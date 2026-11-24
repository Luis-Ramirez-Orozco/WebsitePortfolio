# Gym Leaderboard (demo)

A public demo of the Gym Leaderboard: no sign-in, no server, no database, and only invented data.

- The crew (Maya, Jordan, Sam and the rest), their lifts, votes, badges and chat are all made up, and generated
  relative to today's date. You are the admin ("You"), so you can verify lifts, add exercises and give badges.
- Everything you do is saved in your own browser (localStorage) and goes nowhere else. **Account > Reset demo**
  restores the sample data.
- Left out of the real app: accounts, invite links, the Postgres database and the live chat server.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export into ./out
```

## Layout

- `lib/demo-store.ts`: the fake data and the in-browser stand-in for the server's API
- `components/app/gym-demo.tsx`: reads the store and renders the app
- `components/app/gym-app.tsx`: the leaderboard, Log & Verify, Chat and Account views
