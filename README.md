# Project Tracker — Netlify deployment (shared cloud storage)

This folder runs the planner as a website on Netlify, with all data stored
centrally in **Netlify Blobs** so your whole team sees and edits the same
projects in real time. Access is protected by one shared **password**, and
every save is **backed up automatically** (timestamped, newest 100 kept).

```
netlify-deploy/
├── index.html                  ← the app (cloud build)
├── netlify.toml                ← Netlify config
├── package.json                ← declares @netlify/blobs
└── netlify/functions/data.mjs  ← GET/POST shared data + auto-backup
```

## One-time setup

1. Create a free account at https://app.netlify.com
2. **Add new site → Deploy manually**, then drag the **entire `netlify-deploy`
   folder** onto the upload area. (Or connect a Git repo containing it.)
3. After the first deploy, set the password:
   **Site configuration → Environment variables → Add a variable**
   - Key: `APP_PASSWORD`
   - Value: your chosen team password
4. **Trigger a redeploy** (Deploys → Trigger deploy) so the password takes effect.

Done. Share the site URL **and** the password with your team. Anyone who opens
the URL is prompted for the password, then works on the shared plan.

## How it works

- On load, the app fetches the shared data from `/api/data`.
- Edits auto-save back to `/api/data` (debounced). Other people's changes are
  polled every few seconds and **merged** field-by-field; only a true
  same-field conflict asks you to choose. Nothing is silently lost.
- Every save also writes a timestamped backup into a separate Blobs store.

## Notes & limits

- The password is a lightweight gate (one shared secret), **not** per-user login.
  Anyone with the URL + password can edit (subject to the in-app roles).
  For per-user accounts with enforced rights, a real auth provider (e.g.
  Supabase / Entra ID) would be the next step.
- Roles (Admin / Editor / View only) still live inside the data and apply to
  everyone, exactly as in the file-based version.
- The `Project Tracker (offline).html` file in the project root is unchanged —
  it still works offline from a local/shared drive. This folder is the
  separate cloud build.

## Changing the password later

Update the `APP_PASSWORD` environment variable and redeploy. Everyone will be
asked for the new password on their next load.
