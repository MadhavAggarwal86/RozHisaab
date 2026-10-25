# RozHisaab 🧾

A billing and inventory management app for small kirana shops.

RozHisaab helps shopkeepers manage their products, create bills, and
keep track of daily sales from one place. Instead of filling out forms
for every task, they can use the AI assistant to enter products or
describe a customer's order in plain language.

For example, a shopkeeper can type *"Add Amul Butter for ₹58 and sugar
at ₹45 per kg"* to add products to inventory. While billing, they can
enter *"2 basmati rice, one Amul butter and 250 gm sugar"* and review
the bill before saving it.

The name RozHisaab means "daily accounts," which reflects the main
purpose of the project.

## Features

### AI assistant

-   **Add products using text:** Enter one or several products in a
    single message. The assistant extracts details such as the product
    name, description, price, and unit. The entries are shown for review
    before they are saved.
-   **Create bills using text:** Describe the items a customer wants to
    buy, and the assistant converts the message into bill items. It can
    handle common spelling mistakes, plural forms, Hindi and English
    product names, and measurements such as *paav* (250 g), *aadha kilo*
    (500 g), and *sawa kilo* (1.25 kg).
-   **Prices are handled by the backend:** The AI identifies products
    and quantities, but it does not decide their prices. The server gets
    the prices from the shop's inventory and calculates the amounts and
    total.
-   **Duplicate product checks:** If a product already exists, the app
    flags it. This also helps prevent the same product description from
    being saved with different prices without review.
-   **Choose between matching products:** If a billing request matches
    more than one product with different prices, the shopkeeper can
    select the correct item.
-   **Undo the last action:** The `undo` command can reverse the last
    supported assistant action, including product additions, price
    changes, and bill edits, without another AI request.
-   **Voice typing support:** Shopkeepers can use their phone's built-in
    voice typing to enter commands. The prompts are designed to handle
    common dictation errors.
-   **Prompt-injection protection:** User messages are treated as data
    to be processed, rather than as instructions that can change the
    assistant's intended behaviour.

### Inventory

-   Each shop has its own sequential product IDs, starting from 1.
-   Supports `pc`, `dozen`, `kg`, `g`, `l`, and `ml`.
-   Converts compatible units automatically. For example, the app can
    calculate the price of 250 g of a product whose price is stored per
    kilogram.
-   Products can be added, edited, or deleted through the inventory
    interface or the AI assistant.

### Billing

-   Shows a bill preview with prices calculated by the server.
-   Generates sequential bill numbers for each shop.
-   Saves a snapshot of product names and prices with every bill, so
    editing inventory later does not change existing bills.
-   Generates A5 PDF bills containing the shop's name and address using
    jsPDF.
-   Lets users download all bills together as a ZIP file containing the
    PDFs.

### Dashboard

-   Displays today's total sales and number of bills using the shop's
    configured timezone.
-   Shows a sales chart for the last 7 or 30 days, with a comparison
    against the previous period.
-   Displays the five best-selling products and recent bills.

### Accounts and security

-   Email and password registration, with passwords hashed using bcrypt.
-   JWT-based authentication with a seven-day expiry.
-   Products and bills are associated with the logged-in shop.
-   Rate limits for login attempts, product creation, and bill creation.
-   Shop profile editing, including the shop name, owner's name, and
    address.
-   Password change support.

## Tech stack

  ------------------------------------------------------------------------------
  Layer            Technology
  ---------------- -------------------------------------------------------------
  Frontend         React 19, Vite 6, React Router 7, jsPDF, JSZip

  Backend          Node.js (20 or newer), Express 5, Mongoose 9

  Database         MongoDB local instance or Atlas

  Authentication   JSON Web Tokens, bcryptjs

  AI               Groq (`openai/gpt-oss-20b`) or xAI (`grok-3-mini`) through an
                   OpenAI-compatible chat API

  Deployment       Vercel for the frontend, Render for the backend
  ------------------------------------------------------------------------------

## Project structure

``` text
RozHisaab/
├── backend/
│   └── src/
│       ├── index.js              # Express app and MongoDB connection
│       ├── middleware/
│       │   ├── auth.js           # JWT verification
│       │   └── rateLimit.js      # Rate limits
│       ├── models/               # User, Product, Bill
│       ├── routes/               # Auth, products, bills, AI
│       └── utils/
│           ├── aiClient.js       # Groq / xAI client
│           ├── inventoryAi.js    # AI-assisted inventory parsing
│           ├── billingAi.js      # AI-assisted billing
│           └── units.js          # Unit aliases and conversions
└── frontend/
    └── src/
        ├── pages/                # Dashboard, Billing, BillHistory,
        │                         # Profile, Login, Register
        ├── components/           # Inventory, AssistantPanel,
        │                         # SalesChart, modals, etc.
        ├── context/              # AuthContext, BillContext
        ├── api.js                # API request wrapper
        ├── billPdf.js             # PDF and ZIP export
        └── units.js
```

## Getting started

### Prerequisites

-   Node.js 20 or newer
-   MongoDB running locally or a [MongoDB
    Atlas](https://www.mongodb.com/atlas) cluster
-   An API key from [Groq](https://console.groq.com/) or
    [xAI](https://console.x.ai/) to use the AI assistant

### 1. Clone the repository

``` bash
git clone https://github.com/MadhavAggarwal86/RozHisaab.git
cd RozHisaab
```

### 2. Set up the backend

``` bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend starts at `http://localhost:5050`. Add your environment
variables to `backend/.env` before using the app.

### 3. Set up the frontend

Open another terminal and run:

``` bash
cd RozHisaab/frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

During development, Vite proxies `/api` requests to
`http://localhost:5050`, so a separate API URL is not needed locally.

**Note:** Port 5050 is used instead of port 5000 because macOS may use
port 5000 for its AirPlay Receiver.

## Environment variables

### `backend/.env`

  ----------------------------------------------------------------------------------
  Variable                          Required   Description
  --------------------------------- ---------- -------------------------------------
  `MONGO_URI`                       Yes        MongoDB connection string

  `JWT_SECRET`                      Yes        Secret used to sign JWTs

  `AI_API_KEY`                      For AI     Groq or xAI API key; the provider is
                                    features   detected from the key prefix

  `PORT`                            No         Server port; defaults to `5050`

  `CLIENT_URL`                      No         Comma-separated list of allowed
                                               frontend origins; defaults to
                                               `http://localhost:5173`

  `GROQ_MODEL` / `XAI_MODEL`        No         Override the default AI model

  `LOGIN_RATE_LIMIT`,               No         Login limit; defaults to 5 attempts
  `LOGIN_RATE_WINDOW_MS`                       per 15 minutes

  `PRODUCT_CREATE_RATE_LIMIT`,      No         Product creation limit; defaults to
  `PRODUCT_CREATE_RATE_WINDOW_MS`              20 per minute

  `BILL_CREATE_RATE_LIMIT`,         No         Bill creation limit; defaults to 30
  `BILL_CREATE_RATE_WINDOW_MS`                 per minute

  `TRUST_PROXY`                     No         Number of trusted proxy hops when
                                               determining client IPs; defaults to 1
                                               on Render
  ----------------------------------------------------------------------------------

To generate a random JWT secret, run:

``` bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `frontend/.env`

  --------------------------------------------------------------------------------
  Variable         Description
  ---------------- ---------------------------------------------------------------
  `VITE_API_URL`   URL of the deployed backend, such as
                   `https://your-api.onrender.com`. Leave it unset for local
                   development with the Vite proxy.

  --------------------------------------------------------------------------------

## API reference

All endpoints below require an `Authorization: Bearer <token>` header,
except registration, login, and the health check.

  ---------------------------------------------------------------------------------------------
  Method     Endpoint                                  Description
  ---------- ----------------------------------------- ----------------------------------------
  `GET`      `/api/health`                             Check whether the API is running

  `POST`     `/api/auth/register`                      Create a shop account

  `POST`     `/api/auth/login`                         Log in and receive a JWT

  `GET`      `/api/auth/me`                            Get the current shop profile

  `PUT`      `/api/auth/me`                            Update the shop profile

  `PUT`      `/api/auth/password`                      Change the password

  `GET`      `/api/products`                           Get the shop's products

  `POST`     `/api/products`                           Add a product; returns `409` for a
                                                       duplicate or price conflict

  `PUT`      `/api/products/:id`                       Update a product

  `DELETE`   `/api/products/:id`                       Delete a product

  `GET`      `/api/bills`                              Get bills, oldest first

  `GET`      `/api/bills/summary?since=<ISO>`          Get sales totals, recent bills, and best
                                                       sellers

  `GET`      `/api/bills/sales?days=7\|30&tz=<IANA>`   Get daily sales totals for the chart

  `POST`     `/api/bills/preview`                      Preview a bill without saving it

  `POST`     `/api/bills`                              Create and save a bill

  `POST`     `/api/ai/inventory/parse`                 Convert a message into product entries

  `POST`     `/api/ai/billing/parse`                   Convert a message into bill items
  ---------------------------------------------------------------------------------------------

## Deployment

### Backend on Render

1.  Create a new Web Service connected to the repository, with the root
    directory set to `backend`.
2.  Use `npm install` as the build command and `npm start` as the start
    command.
3.  Add `MONGO_URI`, `JWT_SECRET`, and `AI_API_KEY` to the service's
    environment variables.
4.  Set `CLIENT_URL` to the deployed frontend's Vercel URL.

### Frontend on Vercel

1.  Import the repository into Vercel and set the root directory to
    `frontend`.
2.  Set `VITE_API_URL` to the URL of the deployed Render backend.
3.  The existing `vercel.json` handles client-side routing by rewriting
    routes to `index.html`.

## Example assistant commands

  ---------------------------------------------------------------------------------------------------------------
  Page        Input                                                              Expected result
  ----------- ------------------------------------------------------------------ --------------------------------
  Inventory   `Add basmati rice ₹290, sugar 45 per kg and a dozen eggs for 84`   Three products appear for review

  Inventory   `maths book by rachna sagar 180`                                   Extracts the book name,
                                                                                 publisher/description, and price

  Billing     `2 basmati rice, an amul butter and 250gm sugar`                   Creates bill items, with sugar
                                                                                 quantity converted to 0.25 kg

  Billing     `aadha kilo dal aur ek litre doodh`                                Interprets the order as 500 g of
                                                                                 dal and 1 litre of milk

  Any         `undo`                                                             Reverses the last supported
                                                                                 assistant action
  ---------------------------------------------------------------------------------------------------------------

## Author

**Madhav Aggarwal**

GitHub: [@MadhavAggarwal86](https://github.com/MadhavAggarwal86)

Feedback and suggestions are welcome. If you find RozHisaab useful, you
can also leave a star on the repository.
