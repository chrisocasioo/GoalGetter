# Submitting GoalGetter to App Store Connect

This runbook covers both the **automated CI path** (recommended for all releases) and the manual fallback path using EAS Build (Expo Application Services).

---

## Automated releases via GitHub Actions (recommended)

Pushing a version tag to the repository automatically triggers the iOS release pipeline defined in `.github/workflows/ios-release.yml`. No Mac, no manual steps.

### One-time CI setup

Before the first automated run, store a single secret in your GitHub repository:

1. Go to **GitHub → Repository → Settings → Secrets and variables → Actions**
2. Add a new repository secret:

| Secret name | Value |
|---|---|
| `EXPO_TOKEN` | A long-lived Expo access token — create one at [expo.dev/accounts/[account]/settings/access-tokens](https://expo.dev/accounts/) |

Apple credentials (`EXPO_APPLE_ID`, `EXPO_ASC_APP_ID`, `EXPO_APPLE_TEAM_ID`) are read from **EAS secrets** (set once per project via `eas secret:create` — see Step 4 below). They do not need to be duplicated as GitHub secrets.

### Triggering a release

```bash
# Bump the version in app.json, commit, then tag
git tag v1.0.1
git push origin v1.0.1
```

The workflow will:
1. Install dependencies
2. Run `eas build --platform ios --profile production --auto-submit --non-interactive`
3. Upload the finished `.ipa` to TestFlight automatically

Monitor progress at **GitHub → Actions → iOS Release** or in the [Expo dashboard](https://expo.dev).

---

## Manual fallback

Use the steps below only if CI is unavailable or you need to submit a specific one-off build.

This runbook covers every command needed to build and upload the production iOS binary using EAS Build (Expo Application Services). Run these steps from the `artifacts/mobile` directory.

---

## Prerequisites

Before running any of these commands, ensure you have:

- An [Apple Developer Program](https://developer.apple.com/programs/) membership (paid, $99/year)
- The GoalGetter app record created in [App Store Connect](https://appstoreconnect.apple.com) under the **1.0.0** version
- An [Expo account](https://expo.dev) (free)
- Node.js 18+ installed locally
- The `eas-cli` package installed (see Step 1)

---

## Step 1 — Install EAS CLI

```bash
npm install -g eas-cli
```

Verify the installation:

```bash
eas --version
# Should print: eas-cli/16.x.x ...
```

---

## Step 2 — Log in to your Expo account

```bash
eas login
```

Enter your Expo username and password when prompted. This links the local project to your Expo account for remote builds.

---

## Step 3 — Link the project to Expo (first time only)

From inside `artifacts/mobile`:

```bash
eas init
```

EAS will create the project under your Expo account and automatically write an `extra.eas.projectId` field into `app.json`. Commit that change before proceeding.

---

## Step 4 — Store Apple credentials as EAS secrets

EAS CLI reads Apple credentials from environment variables automatically — do **not** hardcode them in `eas.json`. Store them as EAS secrets so they are available to every build and submit command without being checked into source control:

```bash
eas secret:create --scope project --name EXPO_APPLE_ID      --value you@example.com
eas secret:create --scope project --name EXPO_ASC_APP_ID    --value 6478123456
eas secret:create --scope project --name EXPO_APPLE_TEAM_ID --value ABC1234DEF
```

Where to find each value:

| Secret | Where to find it |
|--------|-----------------|
| `EXPO_APPLE_ID` | Your Apple Developer account email |
| `EXPO_ASC_APP_ID` | App Store Connect → App Information → Apple ID (10-digit number) |
| `EXPO_APPLE_TEAM_ID` | [developer.apple.com/account](https://developer.apple.com/account) → Membership → Team ID |

EAS CLI also handles code signing automatically — when you run the build in Step 5, it will prompt you to create or reuse a Distribution Certificate and App Store provisioning profile.

---

## Step 5 — Run the production build

```bash
eas build --platform ios --profile production
```

- EAS uploads your source code to Expo's build servers and compiles it remotely — no Mac required.
- The build typically takes **10–20 minutes**.
- When complete, EAS prints a **build ID** and a download URL for the `.ipa`.
- Record the build ID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) — you'll need it for the submit step.

To monitor build status:

```bash
eas build:list --platform ios
```

---

## Step 6 — Submit to App Store Connect

Once the build finishes, submit directly from EAS using the `--latest` flag:

```bash
eas submit --platform ios --latest
```

EAS automatically reads `EXPO_APPLE_ID`, `EXPO_ASC_APP_ID`, and `EXPO_APPLE_TEAM_ID` from the secrets set in Step 4 — no prompts needed.

Alternatively, submit a specific build by ID:

```bash
eas submit --platform ios --id <build-id-from-step-5>
```

---

## Step 7 — Confirm in App Store Connect

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **GoalGetter** → **TestFlight**
2. The build will appear under **iOS Builds** within a few minutes (Apple processes the upload asynchronously — can take up to 1 hour).
3. Once processing shows a green checkmark, go to **App Store** → **1.0.0** → **Build** and select this build.
4. Fill in any remaining metadata from `store/app-store-copy.md` if not already done.
5. Click **Submit for Review**.

---

## Release log

Record each submission here:

| Date | EAS Build ID | Build Number | Submission ID | TestFlight status |
|------|-------------|--------------|---------------|-------------------|
| *(run Step 5 and paste the build ID here)* | — | — | — | — |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `eas build` fails with "bundle identifier mismatch" | Verify `ios.bundleIdentifier` in `app.json` is `com.goalgetter.app` and that this ID is registered in your Apple Developer account |
| Build fails with "No matching provisioning profiles" | Run `eas credentials --platform ios` and let EAS create a new profile |
| Submit fails with "Invalid Apple ID credentials" | Use an [app-specific password](https://support.apple.com/en-us/102654) rather than your regular Apple ID password, and store it in the `EXPO_APPLE_PASSWORD` secret |
| Build appears stuck in TestFlight processing | Normal — Apple processing can take up to 1 hour |
| `eas secret:create` says the secret already exists | Use `eas secret:push` to update existing secrets |

---

## One-shot command summary

```bash
# From artifacts/mobile
npm install -g eas-cli
eas login
eas init
eas secret:create --scope project --name EXPO_APPLE_ID      --value you@example.com
eas secret:create --scope project --name EXPO_ASC_APP_ID    --value 6478123456
eas secret:create --scope project --name EXPO_APPLE_TEAM_ID --value ABC1234DEF
eas build --platform ios --profile production
eas submit --platform ios --latest
```
