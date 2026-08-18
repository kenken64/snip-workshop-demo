# Snip

Snip is a tiny URL shortener with one backend and two clients. The Bun API
stores links in an in-memory `Map`; the Angular web app and the Node CLI both
consume the same HTTP contract.

## API Contract

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://..." }` | `201 { code, url, shortUrl, hits, createdAt }`; `400 { error }` for invalid JSON or a non-http(s) URL |
| `GET` | `/api/links` | None | `200` array of link objects |
| `GET` | `/:code` | None | `302` to the original URL and increments `hits`; `404 { error }` when unknown |

Links are kept in memory by design, so restarting the backend clears them. The
backend allows cross-origin requests for the web client.

## Branch And Submodule Layout

Each layer is an orphan branch with its files at the branch root. `main` is the
aggregator and mounts those branches as submodules:

```text
snip-workshop-demo/
├── backend/    Bun API        <- backend branch
├── frontend/   Angular 19 UI  <- frontend branch
├── cli/        Node CLI       <- cli branch
├── .gitmodules
└── README.md
```

The folders on `main` are Gitlinks: each one pins an exact commit from this
same repository. The branch names in `.gitmodules` describe where updates come
from; the pinned commit keeps each `main` checkout reproducible.

## Clone

Clone with submodules initialized:

```sh
git clone --recurse-submodules https://github.com/kenken64/snip-workshop-demo.git
cd snip-workshop-demo
```

A plain clone leaves the submodule folders empty. Populate them afterward with:

```sh
git submodule update --init --recursive
```

## Run

Start the backend first, then use the other two components from separate
terminals:

```sh
# terminal 1
cd backend
bun start
```

```sh
# terminal 2
cd frontend
npm install
npx ng serve
```

Open `http://localhost:4200` in a browser. The API listens on
`http://localhost:3000`.

```sh
# terminal 3
cd cli
node cli.js ls
node cli.js add https://example.com
```

The CLI uses `SNIP_API` when set, otherwise it uses `http://localhost:3000`.

## Generated Bundle

`bundle/` is a generated release submodule, not a source directory. It contains
one Bun process serving the API, redirects, and the built Angular app, plus the
CLI beside it. Never hand-edit files inside `bundle/`.

From the `main` checkout, rebuild it from the current source branch tips:

```sh
node scripts/build-bundle.mjs
```

The script is idempotent. Use `--push` to publish a changed `bundle` branch and
the resulting `main` pointer commits:

```sh
node scripts/build-bundle.mjs --push
```

## Update Workflow

Changes happen inside a submodule first. Push the layer branch, then advance
the corresponding Gitlink on `main`:

```sh
cd backend
# edit files
git add -A
git commit -m "Describe the backend change"
git push

cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Use the same workflow with `frontend` or `cli` in place of `backend`. The layer
commit and the superproject pointer bump are separate records, so `main` always
identifies the exact versions of all three pieces.
