import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import heroBandPhoto from "../assets/Hero_band_photo.jpg";
import aboutPhoto from "../assets/about_photo.jpg";
import incentivesPhoto from "../assets/incentives_photo.jpg";

/* ------------------------------------------------------------------ */
/*  Palette (named, per the concept brief)                             */
/* ------------------------------------------------------------------ */
const C = {
  canopy: "#10170F", // predawn — hero, final CTA, footer
  canopyLine: "#233021",
  bark: "#2B2117", // dawn — the rhythm, contact
  barkLine: "#4A3A28",
  latex: "#F2ECDA", // day — the bulk of the page
  latexLine: "#DED5BC",
  cured: "#F6E4C6", // amber sheet — incentives
  curedLine: "#E7CE9C",
  ink: "#201A12", // body text on light
  inkMuted: "#6E6250",
  amber: "#B9701F", // primary accent (cured rubber)
  amberSoft: "#D89A4E",
  moss: "#3F5A3E", // secondary accent
};

/* ------------------------------------------------------------------ */
/*  Icon primitives (reused stroke style, new selection)               */
/* ------------------------------------------------------------------ */
const Ic = ({ children, size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const IconDrop = (p) => (
  <Ic {...p}>
    <path d="M12 3s7 7.5 7 12.5A7 7 0 0 1 5 15.5C5 10.5 12 3 12 3Z" />
  </Ic>
);
const IconUsers = (p) => (
  <Ic {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
  </Ic>
);
const IconScale = (p) => (
  <Ic {...p}>
    <path d="M12 3v18M5 7h14M5 7 2 13a3 3 0 0 0 6 0L5 7Zm14 0-3 6a3 3 0 0 0 6 0l-3-6Z" />
  </Ic>
);
const IconReceipt = (p) => (
  <Ic {...p}>
    <path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M9 8h6M9 12h6" />
  </Ic>
);
const IconWallet = (p) => (
  <Ic {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
    <path d="M21 11h-4a2 2 0 0 0 0 4h4v-4Z" />
  </Ic>
);
const IconShield = (p) => (
  <Ic {...p}>
    <path d="M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Ic>
);
const IconCoins = (p) => (
  <Ic {...p}>
    <ellipse cx="8" cy="6" rx="5" ry="2.5" />
    <path d="M3 6v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6" />
    <path d="M13 11c1 .8 3 1.3 4 1.3 2.8 0 5-1.1 5-2.5S19.8 7.3 17 7.3" />
    <path d="M11 16.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V13" />
  </Ic>
);
const IconChart = (p) => (
  <Ic {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 15v-4M12 15V8M17 15v-6" />
  </Ic>
);
const IconArrow = (p) => (
  <Ic {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Ic>
);
const IconMail = (p) => (
  <Ic {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Ic>
);
const IconPin = (p) => (
  <Ic {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Ic>
);
const IconPhone = (p) => (
  <Ic {...p}>
    <path d="M4 4h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z" />
  </Ic>
);

/* ------------------------------------------------------------------ */
/*  Scroll-entry reveal                                                */
/* ------------------------------------------------------------------ */
function Reveal({ children, delay = 0, as: Tag = "div", className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          obs.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/*  Herringbone divider — the tapping-cut motif, marks every phase     */
/*  seam instead of a plain rule or a numbered marker.                 */
/* ------------------------------------------------------------------ */
function Herringbone({ from, to, stroke = C.amber }) {
  const id = `herr-${from.replace("#", "")}-${to.replace("#", "")}`;
  return (
    <div
      aria-hidden="true"
      className="relative h-14 w-full overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}
    >
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id={id} width="26" height="56" patternUnits="userSpaceOnUse">
            <path d="M0 28 L13 8 L26 28" fill="none" stroke={stroke} strokeWidth="1.4" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Figure — photography with a warm/dark overlay                      */
/* ------------------------------------------------------------------ */
function Figure({ src, alt, ratio = "aspect-[16/9]", className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-sm ${ratio} ${className}`}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(16,23,15,0.06), rgba(16,23,15,0.22))" }}
      />
    </div>
  );
}

function Eyebrow({ children, tone = "amber" }) {
  const color = tone === "amber" ? C.amberSoft : C.inkMuted;
  return (
    <span
      className="font-tap-mono text-[11px] uppercase tracking-[0.2em]"
      style={{ color }}
    >
      {children}
    </span>
  );
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default function LandingConcept() {
  const { user } = useAuth();
  const dashboardHref =
    user?.role === "MEMBER" ? "/me" : user?.role === "MAO" ? "/mao" : "/members";

  return (
    <div className="font-tap-body antialiased" style={{ color: C.ink }}>
      <Nav user={user} dashboardHref={dashboardHref} />
      <main>
        <Hero user={user} dashboardHref={dashboardHref} />
        <Herringbone from={C.canopy} to={C.bark} />
        <TheCut />
        <Herringbone from={C.bark} to={C.latex} stroke={C.inkMuted} />
        <Value />
        <Features />
        <Incentives />
        <About />
        <FAQ />
        <Herringbone from={C.latex} to={C.bark} stroke={C.inkMuted} />
        <Contact />
        <FinalCTA user={user} dashboardHref={dashboardHref} />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NAV — transparent over the dark hero                               */
/* ------------------------------------------------------------------ */
function Nav({ user, dashboardHref }) {
  const links = [
    ["Rhythm", "#cut"],
    ["Features", "#features"],
    ["Incentives", "#incentives"],
    ["About", "#about"],
    ["FAQ", "#faq"],
  ];
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{ background: "rgba(16,23,15,0.72)", borderBottom: `1px solid ${C.canopyLine}` }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-sm"
            style={{ background: C.amber, color: C.canopy }}
          >
            <IconDrop size={16} />
          </span>
          <span className="font-tap-display text-[15px] font-medium tracking-tight" style={{ color: C.latex }}>
            SMARTCOOP
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm transition-colors"
              style={{ color: "rgba(242,236,218,0.6)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.latex)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(242,236,218,0.6)")}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to={dashboardHref}
              className="inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-sm font-medium btn-press"
              style={{ background: C.amber, color: C.canopy }}
            >
              Go to dashboard
              <IconArrow size={15} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-medium transition-colors sm:inline"
                style={{ color: "rgba(242,236,218,0.6)" }}
              >
                Sign in
              </Link>
              <Link
                to="/apply"
                className="inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-sm font-medium btn-press"
                style={{ background: C.amber, color: C.canopy }}
              >
                Become a member
                <IconArrow size={15} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO — predawn canopy, a single glint of light                     */
/* ------------------------------------------------------------------ */
function Hero({ user, dashboardHref }) {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pb-24 pt-20 md:pt-28"
      style={{ background: C.canopy }}
    >
      {/* the glint — a lone point of light in the dark, like a headlamp
          catching the first bead of latex */}
      <div
        aria-hidden="true"
        className="tap-glint pointer-events-none absolute left-1/2 top-[18%] h-2.5 w-2.5 -translate-x-1/2 rounded-full"
        style={{ background: C.amber, boxShadow: `0 0 40px 14px rgba(185,112,31,0.35)` }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <Eyebrow>San Luis Rubber Producer&apos;s Cooperative</Eyebrow>
        </Reveal>

        <Reveal delay={80}>
          <h1
            className="font-tap-display mt-6 text-5xl font-light md:text-7xl"
            style={{ color: C.latex }}
          >
            Tapped before sunrise.
            <br />
            <span style={{ color: C.amberSoft, fontStyle: "italic" }}>Counted to the peso.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p
            className="mx-auto mt-7 max-w-2xl text-[17px] leading-[1.65]"
            style={{ color: "rgba(242,236,218,0.62)" }}
          >
            Long before the collection point opens, every member is already in the trees.
            SMARTCOOP is the ledger for what happens after — Kinsina and Katapusan deliveries,
            receipts, loans, dividends, and patronage, computed the same way for every member,
            every time.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={user ? dashboardHref : "/apply"}
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-medium btn-press"
              style={{ background: C.amber, color: C.canopy }}
            >
              {user ? "Open your dashboard" : "Become a member"}
              <IconArrow size={16} />
            </Link>
            <a
              href="#cut"
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-medium btn-press"
              style={{ border: `1px solid ${C.canopyLine}`, color: C.latex }}
            >
              See how it works
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delay={320}>
        <div
          className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-sm"
          style={{ border: `1px solid ${C.canopyLine}` }}
        >
          <Figure src={heroBandPhoto} ratio="aspect-[16/6]" alt="A member tapping rubber before dawn in San Luis" />
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  THE CUT — dawn phase, explains the collection rhythm               */
/* ------------------------------------------------------------------ */
function TheCut() {
  const cols = [
    { k: "KINSINA", freq: "every 15 days", body: "The short cycle. Latex is weighed, graded by dry-rubber content, and priced per kilo at the collection point." },
    { k: "KATAPUSAN", freq: "once a month", body: "The long cycle settlement — deliveries reconciled, deductions applied, one net figure per member." },
  ];
  return (
    <section id="cut" className="px-6 py-24" style={{ background: C.bark }}>
      <div className="mx-auto max-w-5xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>The rhythm</Eyebrow>
          <h2 className="font-tap-display mt-4 text-4xl font-light md:text-5xl" style={{ color: C.latex }}>
            Two collections. One clear rule.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: "rgba(242,236,218,0.58)" }}>
            The tapping pattern cut into a rubber tree — a diagonal herringbone groove —
            guides every drop to the same cup. SMARTCOOP works the same way: every delivery,
            whichever cycle it lands in, is guided to the same rules and the same receipt.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-sm sm:grid-cols-2" style={{ background: C.barkLine }}>
          {cols.map((c, i) => (
            <Reveal key={c.k} delay={i * 100}>
              <div className="h-full p-8" style={{ background: C.bark }}>
                <p className="font-tap-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: C.amberSoft }}>
                  {c.freq}
                </p>
                <p className="font-tap-display mt-2 text-3xl font-light" style={{ color: C.latex }}>
                  {c.k}
                </p>
                <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: "rgba(242,236,218,0.58)" }}>
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  VALUE — day breaks, light background begins                       */
/* ------------------------------------------------------------------ */
function Value() {
  const points = [
    "Every kilogram, every deduction, every payout recorded once and reconciled automatically — not re-keyed from a tally sheet.",
    "Members see their own deliveries, receipts, and loan balances the moment they're entered, not on the next visit to the office.",
    "Officers and the Municipal Agriculture Office read live figures instead of a spreadsheet someone updates once a month.",
  ];
  return (
    <section className="px-6 py-24" style={{ background: C.latex }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-14 md:grid-cols-2">
          <Reveal>
            <Eyebrow tone="ink">What changes</Eyebrow>
            <h2 className="font-tap-display mt-4 text-4xl font-light md:text-5xl" style={{ color: C.ink }}>
              Daylight on the whole cycle.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: C.inkMuted }}>
              The San Luis cooperative has managed membership, deliveries, and computations by
              hand for years. That's slow, easy to miscalculate, and hard to audit. SMARTCOOP
              turns the paperwork into a single connected record.
            </p>
          </Reveal>
          <div className="space-y-4">
            {points.map((p, i) => (
              <Reveal key={i} delay={i * 90}>
                <div
                  className="flex gap-4 rounded-sm p-6"
                  style={{ border: `1px solid ${C.latexLine}`, background: "#FBF9F1" }}
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-sm"
                    style={{ background: "rgba(185,112,31,0.12)", color: C.amber }}
                  >
                    <IconArrow size={14} />
                  </span>
                  <p className="text-[15px] leading-[1.6]" style={{ color: C.ink }}>{p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES                                                           */
/* ------------------------------------------------------------------ */
function FeatureCard({ icon: Icon, title, body, wide, stat }) {
  return (
    <div
      className={`card-lift h-full rounded-sm p-7 ${wide ? "sm:grid sm:grid-cols-2 sm:items-center sm:gap-6" : ""}`}
      style={{ border: `1px solid ${C.latexLine}`, background: "#FBF9F1" }}
    >
      <div>
        <span
          className="flex h-11 w-11 items-center justify-center rounded-sm"
          style={{ background: "rgba(63,90,62,0.1)", color: C.moss }}
        >
          <Icon size={20} />
        </span>
        <h3 className="mt-5 text-lg font-semibold" style={{ color: C.ink }}>{title}</h3>
        <p className="mt-2 text-[15px] leading-[1.6]" style={{ color: C.inkMuted }}>{body}</p>
      </div>
      {wide && stat && (
        <div className="mt-6 rounded-sm p-5 sm:mt-0" style={{ background: "rgba(63,90,62,0.06)" }}>
          <div className="flex h-24 items-end gap-2">
            {stat.data.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-[2px]"
                style={{ height: `${h}%`, background: C.moss, opacity: 0.35 + (i / stat.data.length) * 0.65 }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-tap-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: C.inkMuted }}>
            {stat.labels.map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Features() {
  const feats = [
    { icon: IconUsers, title: "Membership & categorization", body: "Regular and associate records with a dynamic algorithm that ranks members Active, Moderate, or Inactive from delivery and repayment behaviour.", wide: true, stat: { data: [82, 54, 28], labels: ["Active", "Moderate", "Inactive"] } },
    { icon: IconScale, title: "DRC-graded deliveries", body: "Dry-rubber content, per-kilo pricing, and running totals for every Kinsina and Katapusan batch." },
    { icon: IconReceipt, title: "Automated receipts", body: "Gross less CBU, loan, membership, supplies, and dayong. Net income computed and printed per delivery." },
    { icon: IconWallet, title: "Diminishing-interest loans", body: "Amortization on the remaining balance, repaid automatically from deliveries." },
    { icon: IconCoins, title: "Dividends & patronage", body: "Year-end settlements split by share capital and by delivery volume, with a full breakdown." },
    { icon: IconShield, title: "Agricultural credit scoring", body: "Creditworthiness from repayment history, production consistency, and farm characteristics." },
    { icon: IconChart, title: "MAO analytics dashboard", body: "Aggregated production, affected-area tagging, and support-program tracking for the Municipal Agriculture Office.", wide: true, stat: { data: [40, 58, 52, 74, 63, 88], labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"] } },
  ];
  return (
    <section id="features" className="px-6 py-24" style={{ background: C.latex }}>
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow tone="ink">The collection point, digitized</Eyebrow>
          <h2 className="font-tap-display mt-4 text-4xl font-light md:text-5xl" style={{ color: C.ink }}>
            Built around how the cooperative actually works.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {feats.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80} className={f.wide ? "md:col-span-2" : ""}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  INCENTIVES — the amber, cured-rubber zone                          */
/* ------------------------------------------------------------------ */
function Incentives() {
  const items = [
    { icon: IconCoins, title: "Dividends on share capital", body: "A yearly dividend proportional to the capital each member holds in the cooperative." },
    { icon: IconScale, title: "Patronage refunds", body: "A share of the surplus returned in proportion to rubber delivered." },
    { icon: IconWallet, title: "Access to affordable credit", body: "Diminishing-interest loans, repaid conveniently from delivery proceeds." },
    { icon: IconShield, title: "Fair credit standing", body: "Consistent delivery and on-time repayment unlock larger, cheaper loans." },
  ];
  return (
    <section id="incentives" className="px-6 py-24" style={{ background: C.cured }}>
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow tone="ink">Cured, and worth something</Eyebrow>
          <h2 className="font-tap-display mt-4 text-4xl font-light md:text-5xl" style={{ color: C.ink }}>
            Rewards for delivering and staying active.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={(i % 4) * 80}>
              <div className="card-lift h-full rounded-sm p-7" style={{ background: "#FCF3E1", border: `1px solid ${C.curedLine}` }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-sm" style={{ background: "rgba(185,112,31,0.14)", color: C.amber }}>
                  <it.icon size={20} />
                </span>
                <h3 className="mt-5 text-base font-semibold" style={{ color: C.ink }}>{it.title}</h3>
                <p className="mt-2 text-sm leading-[1.6]" style={{ color: C.inkMuted }}>{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <Figure src={incentivesPhoto} ratio="aspect-[16/5]" alt="Rows of rubber trees on a cooperative member's farm" className="mt-4" />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  ABOUT                                                              */
/* ------------------------------------------------------------------ */
function About() {
  const facts = [
    ["Serving", "San Luis, rubber-farming barangays"],
    ["Focus", "Membership, production, finance, analytics"],
    ["Built for", "Staff, members, and the MAO"],
  ];
  return (
    <section id="about" className="px-6 py-24" style={{ background: C.latex }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-14 md:grid-cols-2">
          <Reveal>
            <Eyebrow tone="ink">About the cooperative</Eyebrow>
            <h2 className="font-tap-display mt-4 text-4xl font-light md:text-5xl" style={{ color: C.ink }}>
              A cooperative-first tool, not another ledger.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: C.inkMuted }}>
              The San Luis Rubber Producer&apos;s Cooperative brings smallholder tappers
              together to sell rubber, share surplus, and access credit. SMARTCOOP was built
              for that model specifically — the Kinsina and Katapusan rhythm, the deductions
              taken at the collection point, and the yearly split of dividends and patronage.
            </p>
          </Reveal>

          <div className="space-y-4">
            <Reveal>
              <Figure src={aboutPhoto} ratio="aspect-[3/2]" alt="Members bringing rubber to a cooperative collection point" />
            </Reveal>
            {facts.map(([k, v], i) => (
              <Reveal key={k} delay={i * 90}>
                <div className="flex items-center justify-between rounded-sm px-6 py-5" style={{ border: `1px solid ${C.latexLine}`, background: "#FBF9F1" }}>
                  <span className="font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: C.inkMuted }}>{k}</span>
                  <span className="text-right text-[15px] font-medium" style={{ color: C.ink }}>{v}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
function FAQ() {
  const faqs = [
    { q: "Who can use SMARTCOOP?", a: "Cooperative staff and administrators manage members, deliveries, and finances. Members log in to a personal view of their own deliveries, receipts, and loans. The Municipal Agriculture Office has its own analytics dashboard." },
    { q: "How is a member's net income per delivery calculated?", a: "Gross is price per kilo multiplied by total kilos. From that the system subtracts CBU, any due loan installment, membership fees, acid or tapping-knife supplies, and dayong. The remainder is the net income printed on the receipt." },
    { q: "What decides whether a member is Active, Moderate, or Inactive?", a: "A dynamic categorization algorithm scores recent delivery volume and loan-repayment rate, adds them into an activity score, and assigns a category. Members with no loans are handled separately rather than penalized." },
    { q: "How are dividends and patronage refunds different?", a: "Dividends are distributed in proportion to each member's share capital. Patronage refunds are distributed in proportion to the volume of rubber each member delivered during the year. SMARTCOOP computes both and shows the full breakdown." },
    { q: "Is member data kept private?", a: "Access is role-based. Members can only view their own records; staff and the MAO see only what their role permits." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="px-6 py-24" style={{ background: C.latex }}>
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <Eyebrow tone="ink">Questions</Eyebrow>
          <h2 className="font-tap-display mt-4 text-4xl font-light md:text-5xl" style={{ color: C.ink }}>
            Answered plainly.
          </h2>
        </Reveal>

        <div className="mt-12" style={{ borderTop: `1px solid ${C.latexLine}` }}>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 50}>
                <div style={{ borderBottom: `1px solid ${C.latexLine}` }}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="text-[16px] font-medium transition-opacity duration-200 group-hover:opacity-70" style={{ color: C.ink }}>
                      {f.q}
                    </span>
                    <span
                      className="relative flex h-5 w-5 flex-none items-center justify-center"
                      style={{ color: C.amber }}
                    >
                      <span className="absolute h-[1.5px] w-3.5 rounded-full bg-current" />
                      <span
                        className="absolute h-[1.5px] w-3.5 rounded-full bg-current"
                        style={{ transform: isOpen ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 300ms var(--ease-out)" }}
                      />
                    </span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <p className="pb-6 pr-10 text-[15px] leading-[1.7]" style={{ color: C.inkMuted }}>{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CONTACT — dusk phase                                               */
/* ------------------------------------------------------------------ */
function Contact() {
  const details = [
    { icon: IconPin, label: "Office", value: "San Luis Rubber Producer's Cooperative" },
    { icon: IconMail, label: "Email", value: "smartcoop.sanluis@coop.ph" },
    { icon: IconPhone, label: "Phone", value: "+63 (000) 000 0000" },
  ];
  return (
    <section id="contact" className="px-6 py-24" style={{ background: C.bark }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-14 md:grid-cols-2">
          <Reveal>
            <Eyebrow>Dusk — office hours</Eyebrow>
            <h2 className="font-tap-display mt-4 text-4xl font-light md:text-5xl" style={{ color: C.latex }}>
              Talk to the cooperative office.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: "rgba(242,236,218,0.58)" }}>
              For membership, delivery schedules, or account access, reach the office directly.
              Existing members and staff can sign in anytime.
            </p>
            <div className="mt-8 space-y-4">
              {details.map((d) => (
                <div key={d.label} className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-sm" style={{ background: "rgba(185,112,31,0.14)", color: C.amberSoft }}>
                    <d.icon size={20} />
                  </span>
                  <div>
                    <p className="font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(242,236,218,0.4)" }}>{d.label}</p>
                    <p className="text-[15px] font-medium" style={{ color: C.latex }}>{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <form onSubmit={(e) => e.preventDefault()} className="rounded-sm p-7" style={{ background: C.canopy, border: `1px solid ${C.canopyLine}` }}>
              <div className="grid gap-4">
                <Field label="Name" placeholder="Your full name" />
                <Field label="Email" type="email" placeholder="you@email.com" />
                <div>
                  <label className="mb-1.5 block font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(242,236,218,0.5)" }}>
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="How can the cooperative help?"
                    className="w-full rounded-sm px-3.5 py-2.5 text-sm outline-none transition"
                    style={{ background: C.bark, border: `1px solid ${C.barkLine}`, color: C.latex }}
                  />
                </div>
                <button
                  type="submit"
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 text-sm font-medium btn-press"
                  style={{ background: C.amber, color: C.canopy }}
                >
                  Send message
                  <IconArrow size={15} />
                </button>
                <p className="text-center text-xs" style={{ color: "rgba(242,236,218,0.35)" }}>
                  This form is illustrative. Use the office contact details to reach us.
                </p>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="mb-1.5 block font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(242,236,218,0.5)" }}>
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-sm px-3.5 py-2.5 text-sm outline-none transition"
        style={{ background: C.bark, border: `1px solid ${C.barkLine}`, color: C.latex }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FINAL CTA — night again, full circle                               */
/* ------------------------------------------------------------------ */
function FinalCTA({ user, dashboardHref }) {
  return (
    <section className="px-6 py-24" style={{ background: C.canopy }}>
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <Eyebrow>Tomorrow, before sunrise</Eyebrow>
          <h2 className="font-tap-display mx-auto mt-5 max-w-2xl text-4xl font-light md:text-5xl" style={{ color: C.latex }}>
            Bring every delivery and payout into one clear record.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.65]" style={{ color: "rgba(242,236,218,0.55)" }}>
            {user
              ? "Manage membership, record deliveries, and compute settlements, all with the math on display."
              : "Apply to join the cooperative, then track your deliveries, receipts, and payouts in one place."}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={user ? dashboardHref : "/apply"}
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-medium btn-press"
              style={{ background: C.amber, color: C.canopy }}
            >
              {user ? "Open your dashboard" : "Become a member"}
              <IconArrow size={16} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-medium btn-press"
              style={{ border: `1px solid ${C.canopyLine}`, color: C.latex }}
            >
              Review the features
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  const cols = [
    ["Product", [["Features", "#features"], ["Incentives", "#incentives"], ["Rhythm", "#cut"]]],
    ["Cooperative", [["About", "#about"], ["FAQ", "#faq"], ["Contact", "#contact"]]],
    ["Access", [["Become a member", "/apply"], ["Sign in", "/login"]]],
  ];
  return (
    <footer style={{ background: C.canopy, borderTop: `1px solid ${C.canopyLine}` }}>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm" style={{ background: C.amber, color: C.canopy }}>
                <IconDrop size={16} />
              </span>
              <span className="font-tap-display text-[15px] font-medium tracking-tight" style={{ color: C.latex }}>SMARTCOOP</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-[1.6]" style={{ color: "rgba(242,236,218,0.45)" }}>
              A web-based rubber farming and cooperative management system with integrated
              data analytics for the San Luis Rubber Producer&apos;s Cooperative.
            </p>
          </div>

          {cols.map(([title, links]) => (
            <div key={title}>
              <p className="font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(242,236,218,0.35)" }}>{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, href]) =>
                  href.startsWith("#") ? (
                    <li key={label}>
                      <a href={href} className="text-sm transition-colors" style={{ color: "rgba(242,236,218,0.55)" }}>{label}</a>
                    </li>
                  ) : (
                    <li key={label}>
                      <Link to={href} className="text-sm transition-colors" style={{ color: "rgba(242,236,218,0.55)" }}>{label}</Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 pt-6 sm:flex-row" style={{ borderTop: `1px solid ${C.canopyLine}` }}>
          <p className="text-xs" style={{ color: "rgba(242,236,218,0.3)" }}>
            © {new Date().getFullYear()} San Luis Rubber Producer&apos;s Cooperative. All rights reserved.
          </p>
          <p className="font-tap-mono text-[11px]" style={{ color: "rgba(242,236,218,0.3)" }}>SMARTCOOP capstone system — concept</p>
        </div>
      </div>
    </footer>
  );
}
