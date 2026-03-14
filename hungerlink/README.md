# HungerLink — Smart Food Rescue & Redistribution Platform

## Quick Start

### 1. Install dependencies
```bash
cd hungerlink
npm install
```

### 2. Add your MongoDB connection string
Open the `.env` file and replace the `MONGODB_URI` value:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hungerlink?retryWrites=true&w=majority
```

### 3. Run the server
```bash
npm start
```
For development with auto-restart:
```bash
npm run dev
```

### 4. Open in browser
```
http://localhost:3000
```

---

## Project Structure

```
hungerlink/
├── server.js              # Express server entry point
├── package.json
├── .env                   # ← Put your MongoDB URI here
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── User.js            # All 5 roles
│   ├── Donation.js        # Food donations
│   ├── FarmerListing.js   # Farm produce marketplace
│   └── CommunityReport.js # Hunger reports
├── middleware/
│   └── auth.js            # JWT authentication
├── routes/
│   ├── auth.js            # Signup, login, OTP
│   ├── donations.js       # Donation CRUD + stats
│   ├── farmers.js         # Farmer listings
│   └── reports.js         # Community reports
└── public/
    └── index.html         # Full frontend (single page app)
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup/send-otp | Start signup, sends OTP |
| POST | /api/auth/signup/verify-otp | Verify OTP, create account |
| POST | /api/auth/login/send-otp | Start login, sends OTP |
| POST | /api/auth/login/verify-otp | Verify OTP, get JWT |
| GET  | /api/auth/me | Get current user |

### Donations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/donations | Create donation (donors only) |
| GET | /api/donations | Get donations (role-filtered) |
| PATCH | /api/donations/:id/status | Update status (accept, pickup, deliver) |
| DELETE | /api/donations/:id | Cancel donation |
| GET | /api/donations/stats/platform | Platform-wide stats |

### Farmers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/farmers | Add produce listing |
| GET | /api/farmers | Get listings |
| DELETE | /api/farmers/:id | Remove listing |
| POST | /api/farmers/:id/order | Place order request |

### Community Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reports | Submit hunger report |
| GET | /api/reports | Get reports |
| PATCH | /api/reports/:id/assign | Assign volunteer (admin) |

---

## Demo Mode
- OTP is printed to the **server console** and also shown on screen in the demo hint box
- In production: integrate an SMS service (e.g. Twilio, MSG91) or email (e.g. Nodemailer) to send real OTPs
- Remove `demoOTP` from API responses before going live

---

## Roles
- **Restaurant / Food Donor** — Donate surplus food, track donations, order from farmers
- **Farmer** — List surplus produce, manage orders
- **Volunteer** — Accept pickup tasks, confirm deliveries
- **Charity / Shelter** — View incoming food, report community needs
- **Administrator** — Platform-wide analytics, verifications, community reports

---

## All stats start at zero
The platform starts fresh with all counters at 0. Stats grow organically as users sign up and perform actions (donations, deliveries, etc.).
