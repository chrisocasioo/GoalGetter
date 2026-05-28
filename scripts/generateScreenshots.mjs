import { execSync } from "child_process";
import { mkdirSync, writeFileSync, unlinkSync } from "fs";

const OUT_DIR = "artifacts/mobile/store/screenshots";
mkdirSync(OUT_DIR, { recursive: true });

const W = 1320;
const H = 2868;

// Brand colors
const PURPLE = "#5b5fc7";
const PURPLE_DARK = "#3a3e9e";
const PURPLE_LIGHT = "#8b8fe8";
const WHITE = "#ffffff";
const OFF_WHITE = "#f8f9ff";
const NAVY = "#0f0a2e";
const MUTED = "#eef0ff";
const TEXT_MUTED = "#6b6f99";
const BORDER = "#e2e5f8";

function svgToPng(svgContent, outPath) {
  const tmpSvg = `/tmp/screenshot_${Date.now()}.svg`;
  writeFileSync(tmpSvg, svgContent);
  execSync(`magick -density 144 "${tmpSvg}" -resize ${W}x${H}! "${outPath}"`, { stdio: "pipe" });
  try { unlinkSync(tmpSvg); } catch {}
  console.log(`✓ ${outPath}`);
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function phoneFrame(contentSvg) {
  // Phone frame: 860px wide, positioned centered horizontally, starts at y=620
  const fw = 860;
  const fh = 1860;
  const fx = (W - fw) / 2;
  const fy = 640;
  const r = 52;
  return `
  <!-- Phone shadow -->
  <filter id="shadow">
    <feDropShadow dx="0" dy="24" stdDeviation="40" flood-color="#0f0a2e" flood-opacity="0.35"/>
  </filter>
  <!-- Phone frame -->
  <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${r}" ry="${r}"
        fill="${WHITE}" filter="url(#shadow)"/>
  <!-- Status bar -->
  <rect x="${fx}" y="${fy}" width="${fw}" height="52" rx="${r}" ry="${r}" fill="${OFF_WHITE}"/>
  <rect x="${fx}" y="${fy + 30}" width="${fw}" height="22" fill="${OFF_WHITE}"/>
  <!-- Dynamic island pill -->
  <rect x="${fx + fw / 2 - 60}" y="${fy + 14}" width="120" height="28" rx="14" fill="${NAVY}" opacity="0.12"/>
  <!-- Screen clip area -->
  <clipPath id="screenClip">
    <rect x="${fx}" y="${fy + 52}" width="${fw}" height="${fh - 52 - 0}" rx="0"/>
  </clipPath>
  <g clip-path="url(#screenClip)">
    ${contentSvg}
  </g>
  <!-- Bottom home indicator -->
  <rect x="${fx + fw / 2 - 60}" y="${fy + fh - 18}" width="120" height="6" rx="3" fill="${NAVY}" opacity="0.18"/>
  `;
}

function gradientBg(id, c1, c2) {
  return `<defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id})"/>`;
}

function headline(line1, line2, y, color = WHITE) {
  return `
  <text x="${W / 2}" y="${y}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="74" fill="${color}" letter-spacing="-1">${line1}</text>
  ${line2 ? `<text x="${W / 2}" y="${y + 92}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="74" fill="${color}" letter-spacing="-1" opacity="0.88">${line2}</text>` : ""}`;
}

function subline(text, y, color = WHITE) {
  return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="46" fill="${color}" opacity="0.75">${text}</text>`;
}

function appCard(x, y, w, title, steps, colors) {
  const h = 120 + steps.length * 44;
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${colors.card}" 
        stroke="${BORDER}" stroke-width="1.5"/>
  <text x="${x + 20}" y="${y + 38}" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="24" fill="${colors.text}">${title}</text>
  <text x="${x + 20}" y="${y + 62}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="19" fill="${colors.muted}">${steps.length} steps</text>
  ${steps.map((s, i) => `
    <circle cx="${x + 30}" cy="${y + 100 + i * 44}" r="5" fill="${PURPLE}" opacity="0.6"/>
    <text x="${x + 46}" y="${y + 105 + i * 44}" font-family="'DejaVu Sans', sans-serif"
          font-weight="400" font-size="20" fill="${colors.text}">${s}</text>
  `).join("")}`;
}

// ── Screenshot 1: Home Screen ─────────────────────────────────────────────────
function screenshot1() {
  const fx = (W - 860) / 2;
  const fy = 640;

  const screenContent = `
  <!-- Screen background -->
  <rect x="${fx}" y="${fy + 52}" width="860" height="1808" fill="${OFF_WHITE}"/>

  <!-- Top bar with logo -->
  <text x="${fx + 430}" y="${fy + 120}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="30" fill="${NAVY}">GoalGetter</text>

  <!-- Hero section -->
  <rect x="${fx + 300}" y="${fy + 156}" width="256" height="256" rx="52" fill="${MUTED}"/>
  <!-- Target icon (simplified) -->
  <circle cx="${fx + 428}" cy="${fy + 284}" r="72" fill="${MUTED}" stroke="${PURPLE}" stroke-width="3"/>
  <circle cx="${fx + 428}" cy="${fy + 284}" r="48" fill="${MUTED}" stroke="${PURPLE}" stroke-width="2.5" opacity="0.7"/>
  <circle cx="${fx + 428}" cy="${fy + 284}" r="24" fill="${PURPLE}" opacity="0.9"/>
  <circle cx="${fx + 428}" cy="${fy + 284}" r="10" fill="${WHITE}"/>

  <text x="${fx + 430}" y="${fy + 462}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="36" fill="${NAVY}">What's your goal?</text>
  <text x="${fx + 430}" y="${fy + 502}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="24" fill="${TEXT_MUTED}">Turn any goal into a step-by-step plan</text>

  <!-- Input field -->
  <rect x="${fx + 32}" y="${fy + 540}" width="796" height="80" rx="50" fill="${WHITE}"
        stroke="${BORDER}" stroke-width="1.5"/>
  <text x="${fx + 72}" y="${fy + 588}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="26" fill="${TEXT_MUTED}">e.g. Run a marathon in 6 months</text>
  <!-- Zap button -->
  <rect x="${fx + 760}" y="${fy + 550}" width="60" height="60" rx="30" fill="${PURPLE}"/>
  <text x="${fx + 790}" y="${fy + 589}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="28" fill="${WHITE}">⚡</text>

  <!-- Section header -->
  <text x="${fx + 32}" y="${fy + 672}" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="26" fill="${NAVY}">Your Plans</text>

  <!-- Plan cards -->
  <rect x="${fx + 32}" y="${fy + 700}" width="796" height="124" rx="16"
        fill="${WHITE}" stroke="${BORDER}" stroke-width="1.5"/>
  <circle cx="${fx + 72}" cy="${fy + 740}" r="18" fill="${MUTED}"/>
  <circle cx="${fx + 72}" cy="${fy + 740}" r="8" fill="${PURPLE}" opacity="0.8"/>
  <text x="${fx + 104}" y="${fy + 746}" font-family="'DejaVu Sans', sans-serif"
        font-weight="600" font-size="26" fill="${NAVY}">Run a marathon</text>
  <text x="${fx + 104}" y="${fy + 776}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="22" fill="${TEXT_MUTED}">8 steps</text>
  <text x="${fx + 732}" y="${fy + 762}" font-family="'DejaVu Sans', sans-serif"
        font-size="28" fill="${TEXT_MUTED}">›</text>

  <rect x="${fx + 32}" y="${fy + 840}" width="796" height="124" rx="16"
        fill="${WHITE}" stroke="${BORDER}" stroke-width="1.5"/>
  <circle cx="${fx + 72}" cy="${fy + 880}" r="18" fill="${MUTED}"/>
  <circle cx="${fx + 72}" cy="${fy + 880}" r="8" fill="${PURPLE}" opacity="0.8"/>
  <text x="${fx + 104}" y="${fy + 886}" font-family="'DejaVu Sans', sans-serif"
        font-weight="600" font-size="26" fill="${NAVY}">Learn Spanish in 3 months</text>
  <text x="${fx + 104}" y="${fy + 916}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="22" fill="${TEXT_MUTED}">6 steps</text>
  <text x="${fx + 732}" y="${fy + 902}" font-family="'DejaVu Sans', sans-serif"
        font-size="28" fill="${TEXT_MUTED}">›</text>

  <rect x="${fx + 32}" y="${fy + 980}" width="796" height="124" rx="16"
        fill="${WHITE}" stroke="${BORDER}" stroke-width="1.5"/>
  <circle cx="${fx + 72}" cy="${fy + 1020}" r="18" fill="${MUTED}"/>
  <circle cx="${fx + 72}" cy="${fy + 1020}" r="8" fill="${PURPLE}" opacity="0.8"/>
  <text x="${fx + 104}" y="${fy + 1026}" font-family="'DejaVu Sans', sans-serif"
        font-weight="600" font-size="26" fill="${NAVY}">Write and publish a novel</text>
  <text x="${fx + 104}" y="${fy + 1056}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="22" fill="${TEXT_MUTED}">7 steps</text>
  <text x="${fx + 732}" y="${fy + 1042}" font-family="'DejaVu Sans', sans-serif"
        font-size="28" fill="${TEXT_MUTED}">›</text>

  <!-- Bottom tab bar -->
  <rect x="${fx}" y="${fy + 1740}" width="860" height="68" fill="${WHITE}"
        stroke="${BORDER}" stroke-width="1"/>
  <text x="${fx + 215}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${PURPLE}">● Plans</text>
  <text x="${fx + 645}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${TEXT_MUTED}">○ Profile</text>
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${gradientBg("bg1", PURPLE, PURPLE_DARK)}
  <!-- Decorative circles -->
  <circle cx="200" cy="300" r="220" fill="${WHITE}" opacity="0.05"/>
  <circle cx="1100" cy="500" r="160" fill="${WHITE}" opacity="0.05"/>
  <circle cx="100" cy="2600" r="300" fill="${WHITE}" opacity="0.04"/>
  ${headline("Turn any goal into", "a step-by-step plan", 200)}
  ${subline("Powered by AI — ready in seconds", 380)}
  ${phoneFrame(screenContent)}
</svg>`;
  svgToPng(svg, `${OUT_DIR}/01-home.png`);
}

// ── Screenshot 2: Plan Detail ─────────────────────────────────────────────────
function screenshot2() {
  const fx = (W - 860) / 2;
  const fy = 640;

  const steps = [
    "Set your baseline fitness level",
    "Build a 16-week training schedule",
    "Choose the right running gear",
    "Start with a walk-to-run program",
    "Add long runs every weekend",
    "Fuel and hydration strategy",
    "Register for your target race",
    "Taper and race-day preparation",
  ];

  const screenContent = `
  <rect x="${fx}" y="${fy + 52}" width="860" height="1808" fill="${OFF_WHITE}"/>

  <!-- Back arrow + title -->
  <text x="${fx + 36}" y="${fy + 114}" font-family="'DejaVu Sans', sans-serif"
        font-size="32" fill="${PURPLE}">‹</text>
  <text x="${fx + 430}" y="${fy + 114}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="28" fill="${NAVY}">Run a marathon</text>

  <!-- Goal header card -->
  <rect x="${fx + 24}" y="${fy + 136}" width="812" height="120" rx="20"
        fill="${PURPLE}" opacity="0.12"/>
  <circle cx="${fx + 72}" cy="${fy + 196}" r="24" fill="${PURPLE}" opacity="0.2"/>
  <circle cx="${fx + 72}" cy="${fy + 196}" r="12" fill="${PURPLE}"/>
  <text x="${fx + 108}" y="${fy + 192}" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="26" fill="${NAVY}">Run a marathon in 6 months</text>
  <text x="${fx + 108}" y="${fy + 220}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="21" fill="${TEXT_MUTED}">AI-generated · ${steps.length} steps</text>

  <!-- Steps list -->
  ${steps.map((step, i) => `
  <rect x="${fx + 24}" y="${fy + 280 + i * 175}" width="812" height="158" rx="16"
        fill="${WHITE}" stroke="${BORDER}" stroke-width="1.5"/>
  <!-- Step number badge -->
  <rect x="${fx + 48}" y="${fy + 306 + i * 175}" width="36" height="36" rx="10"
        fill="${PURPLE}" opacity="0.12"/>
  <text x="${fx + 66}" y="${fy + 330 + i * 175}" text-anchor="middle"
        font-family="'DejaVu Sans', sans-serif" font-weight="700" font-size="18" fill="${PURPLE}">${i + 1}</text>
  <!-- Step text -->
  <text x="${fx + 100}" y="${fy + 325 + i * 175}" font-family="'DejaVu Sans', sans-serif"
        font-weight="600" font-size="23" fill="${NAVY}">${step}</text>
  <!-- Expand button -->
  <rect x="${fx + 640}" y="${fy + 392 + i * 175}" width="172" height="34" rx="10"
        fill="${PURPLE}" opacity="0.1"/>
  <text x="${fx + 726}" y="${fy + 415 + i * 175}" text-anchor="middle"
        font-family="'DejaVu Sans', sans-serif" font-weight="600" font-size="18" fill="${PURPLE}">Expand ›</text>
  `).join("")}

  <!-- Bottom tab bar -->
  <rect x="${fx}" y="${fy + 1740}" width="860" height="68" fill="${WHITE}"
        stroke="${BORDER}" stroke-width="1"/>
  <text x="${fx + 215}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${PURPLE}">● Plans</text>
  <text x="${fx + 645}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${TEXT_MUTED}">○ Profile</text>
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${gradientBg("bg2", PURPLE, PURPLE_DARK)}
  <circle cx="200" cy="300" r="220" fill="${WHITE}" opacity="0.05"/>
  <circle cx="1100" cy="400" r="180" fill="${WHITE}" opacity="0.05"/>
  ${headline("Your complete", "action plan", 200)}
  ${subline("Every step, ready to follow", 380)}
  ${phoneFrame(screenContent)}
</svg>`;
  svgToPng(svg, `${OUT_DIR}/02-plan.png`);
}

// ── Screenshot 3: Sub-steps expansion ────────────────────────────────────────
function screenshot3() {
  const fx = (W - 860) / 2;
  const fy = 640;

  const screenContent = `
  <rect x="${fx}" y="${fy + 52}" width="860" height="1808" fill="${OFF_WHITE}"/>

  <!-- Back + title -->
  <text x="${fx + 36}" y="${fy + 114}" font-family="'DejaVu Sans', sans-serif"
        font-size="32" fill="${PURPLE}">‹</text>
  <text x="${fx + 430}" y="${fy + 114}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="28" fill="${NAVY}">Run a marathon</text>

  <!-- Parent step (highlighted) -->
  <rect x="${fx + 24}" y="${fy + 140}" width="812" height="130" rx="16"
        fill="${PURPLE}" opacity="0.14"/>
  <rect x="${fx + 24}" y="${fy + 140}" width="6" height="130" rx="3" fill="${PURPLE}"/>
  <rect x="${fx + 48}" y="${fy + 162}" width="40" height="40" rx="10" fill="${PURPLE}" opacity="0.2"/>
  <text x="${fx + 68}" y="${fy + 188}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="20" fill="${PURPLE}">4</text>
  <text x="${fx + 104}" y="${fy + 185}" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="26" fill="${NAVY}">Start with a walk-to-run program</text>
  <rect x="${fx + 640}" y="${fy + 222}" width="172" height="34" rx="10" fill="${PURPLE}" opacity="0.15"/>
  <text x="${fx + 726}" y="${fy + 245}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="18" fill="${PURPLE}">Expanded ↓</text>

  <!-- Sub-step divider label -->
  <text x="${fx + 56}" y="${fy + 318}" font-family="'DejaVu Sans', sans-serif"
        font-weight="600" font-size="20" fill="${TEXT_MUTED}">SUB-STEPS</text>
  <line x1="${fx + 168}" y1="${fy + 310}" x2="${fx + 820}" y2="${fy + 310}"
        stroke="${BORDER}" stroke-width="1.5"/>

  <!-- Depth line -->
  <line x1="${fx + 56}" y1="${fy + 332}" x2="${fx + 56}" y2="${fy + 1560}"
        stroke="${PURPLE}" stroke-width="2.5" opacity="0.25"/>

  ${[
    ["Week 1-2: Alternate 1 min run / 2 min walk", "Repeat 8 times, 3x per week"],
    ["Week 3-4: Increase to 2 min run / 1 min walk", "Add a 4th session per week"],
    ["Week 5-6: Run 5 minutes without stopping", "Focus on conversational pace"],
    ["Week 7-8: Complete a 20 min easy run", "No walk breaks — slow is fine"],
    ["Week 9-10: Run 30 minutes continuously", "You're now a runner!"],
    ["Week 11-12: Add one tempo run per week", "Practice goal race pace for 15 min"],
    ["Celebrate your base fitness milestone", "You're ready for the full plan"],
  ].map(([title, subtitle], i) => `
  <!-- Sub-step ${i + 1} -->
  <circle cx="${fx + 56}" cy="${fy + 378 + i * 178}" r="7" fill="${PURPLE}" opacity="0.4"/>
  <rect x="${fx + 80}" y="${fy + 348 + i * 178}" width="748" height="150" rx="14"
        fill="${WHITE}" stroke="${BORDER}" stroke-width="1.5"/>
  <text x="${fx + 108}" y="${fy + 382 + i * 178}" font-family="'DejaVu Sans', sans-serif"
        font-weight="600" font-size="22" fill="${NAVY}">${title}</text>
  <text x="${fx + 108}" y="${fy + 410 + i * 178}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="20" fill="${TEXT_MUTED}">${subtitle}</text>
  <rect x="${fx + 624}" y="${fy + 444 + i * 178}" width="188" height="32" rx="8"
        fill="${PURPLE}" opacity="0.08"/>
  <text x="${fx + 718}" y="${fy + 466 + i * 178}" text-anchor="middle"
        font-family="'DejaVu Sans', sans-serif" font-weight="600" font-size="17" fill="${PURPLE}">Expand ›</text>
  `).join("")}

  <!-- Bottom tab bar -->
  <rect x="${fx}" y="${fy + 1740}" width="860" height="68" fill="${WHITE}"
        stroke="${BORDER}" stroke-width="1"/>
  <text x="${fx + 215}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${PURPLE}">● Plans</text>
  <text x="${fx + 645}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${TEXT_MUTED}">○ Profile</text>
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${gradientBg("bg3", PURPLE, PURPLE_DARK)}
  <circle cx="200" cy="300" r="220" fill="${WHITE}" opacity="0.05"/>
  <circle cx="1100" cy="400" r="180" fill="${WHITE}" opacity="0.05"/>
  ${headline("Drill into any step —", "as deep as you need", 200)}
  ${subline("Infinite sub-steps, always on demand", 380)}
  ${phoneFrame(screenContent)}
</svg>`;
  svgToPng(svg, `${OUT_DIR}/03-substeps.png`);
}

// ── Screenshot 4: Pro Features ────────────────────────────────────────────────
function screenshot4() {
  const fx = (W - 860) / 2;
  const fy = 640;
  const BG_DARK = "#0d0d1a";
  const CARD_DARK = "#16162a";
  const TEXT_LIGHT = "#e8e9ff";
  const TEXT_MUTED_DARK = "#8b8fbb";
  const BORDER_DARK = "#2a2a48";

  const features = [
    ["⚡", "Unlimited Plans", "Generate as many plans as you need"],
    ["↕", "Drag to Reorder", "Reorganize any step with a long-press"],
    ["🎨", "Exclusive Themes", "Midnight, Ocean, Forest — your style"],
    ["🏠", "Custom App Icons", "Match your home screen aesthetic"],
    ["🎁", "Referral Rewards", "Earn free Pro by inviting friends"],
  ];

  const screenContent = `
  <rect x="${fx}" y="${fy + 52}" width="860" height="1808" fill="${BG_DARK}"/>

  <!-- Header -->
  <text x="${fx + 430}" y="${fy + 120}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="30" fill="${TEXT_LIGHT}">GoalGetter Pro</text>

  <!-- Pro badge -->
  <rect x="${fx + 310}" y="${fy + 148}" width="240" height="56" rx="28"
        fill="${PURPLE}" opacity="0.25"/>
  <text x="${fx + 430}" y="${fy + 184}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="24" fill="${PURPLE_LIGHT}">⭐ PRO</text>

  <!-- Price cards -->
  <rect x="${fx + 24}" y="${fy + 228}" width="388" height="192" rx="20"
        fill="${CARD_DARK}" stroke="${BORDER_DARK}" stroke-width="1.5"/>
  <text x="${fx + 218}" y="${fy + 282}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="28" fill="${TEXT_LIGHT}">Monthly</text>
  <text x="${fx + 218}" y="${fy + 328}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="48" fill="${WHITE}">$0.99</text>
  <text x="${fx + 218}" y="${fy + 366}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="22" fill="${TEXT_MUTED_DARK}">per month</text>

  <rect x="${fx + 448}" y="${fy + 228}" width="388" height="192" rx="20"
        fill="${PURPLE}" opacity="0.9"/>
  <rect x="${fx + 524}" y="${fy + 216}" width="236" height="36" rx="18" fill="${PURPLE_LIGHT}"/>
  <text x="${fx + 642}" y="${fy + 240}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="19" fill="${NAVY}">BEST VALUE</text>
  <text x="${fx + 642}" y="${fy + 282}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="28" fill="${WHITE}">Annual</text>
  <text x="${fx + 642}" y="${fy + 328}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="48" fill="${WHITE}">$9.99</text>
  <text x="${fx + 642}" y="${fy + 366}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="22" fill="${WHITE}" opacity="0.8">per year</text>

  <!-- Features list -->
  ${features.map(([icon, title, desc], i) => `
  <rect x="${fx + 24}" y="${fy + 448 + i * 188}" width="812" height="164" rx="16"
        fill="${CARD_DARK}" stroke="${BORDER_DARK}" stroke-width="1.5"/>
  <rect x="${fx + 48}" y="${fy + 472 + i * 188}" width="60" height="60" rx="16"
        fill="${PURPLE}" opacity="0.2"/>
  <text x="${fx + 78}" y="${fy + 512 + i * 188}" text-anchor="middle"
        font-family="'DejaVu Sans', sans-serif" font-size="28" fill="${PURPLE_LIGHT}">${icon}</text>
  <text x="${fx + 128}" y="${fy + 498 + i * 188}" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="26" fill="${TEXT_LIGHT}">${title}</text>
  <text x="${fx + 128}" y="${fy + 530 + i * 188}" font-family="'DejaVu Sans', sans-serif"
        font-weight="400" font-size="21" fill="${TEXT_MUTED_DARK}">${desc}</text>
  `).join("")}

  <!-- CTA button -->
  <rect x="${fx + 60}" y="${fy + 1636}" width="740" height="80" rx="40" fill="${PURPLE}"/>
  <text x="${fx + 430}" y="${fy + 1686}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-weight="700" font-size="28" fill="${WHITE}">Start Free Trial</text>

  <!-- Bottom tab bar -->
  <rect x="${fx}" y="${fy + 1740}" width="860" height="68" fill="${CARD_DARK}"
        stroke="${BORDER_DARK}" stroke-width="1"/>
  <text x="${fx + 215}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${TEXT_MUTED_DARK}">○ Plans</text>
  <text x="${fx + 645}" y="${fy + 1786}" text-anchor="middle" font-family="'DejaVu Sans', sans-serif"
        font-size="22" fill="${PURPLE_LIGHT}">● Profile</text>
  `;

  // Dark gradient for Pro screenshot
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg4" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#1a1040"/>
      <stop offset="100%" stop-color="#0d0d1a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg4)"/>
  <circle cx="200" cy="300" r="220" fill="${PURPLE}" opacity="0.08"/>
  <circle cx="1100" cy="400" r="180" fill="${PURPLE}" opacity="0.06"/>
  <circle cx="660" cy="2700" r="350" fill="${PURPLE}" opacity="0.05"/>
  ${headline("Unlock the full", "GoalGetter experience", 200)}
  ${subline("Pro features for serious goal-getters", 380)}
  ${phoneFrame(screenContent)}
</svg>`;
  svgToPng(svg, `${OUT_DIR}/04-pro.png`);
}

// ── Generate all screenshots ──────────────────────────────────────────────────
console.log("Generating App Store screenshots...");
screenshot1();
screenshot2();
screenshot3();
screenshot4();
console.log("\nAll screenshots saved to", OUT_DIR);
