# Rents Due (demo)

A public demo of the Rents Due rent tracker: no sign-in, no server, no database, and only invented data.

- Two properties, eight units, and their tenants, payments, charges and past tenants are all made up (555 phone
  numbers, example.com emails) and generated relative to today's date.
- Everything you add, edit or delete (payments, units, move-ins and move-outs, charges) is saved in your own
  browser (localStorage) and goes nowhere else. **Payments > Reset demo** restores the sample data.
- Left out of the real app: sign-in, team roles and join approvals, two-step codes, the Postgres database and
  receipt import (OneDrive, receipt reading and the review screen).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export into ./out
```

## Layout

- `components/app/rents-app.tsx`: the Overview, Units and Payments views and their state
- `lib/demo-store.ts`: the fake data and the in-browser version of the server's rules (tenancies, move-in/out)
- `lib/rent.ts`: types, status rules and ledger
