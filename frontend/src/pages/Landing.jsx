import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import heroBandPhoto from "../assets/Hero_band_photo.jpg";
import aboutPhoto from "../assets/about_photo.jpg";
import incentivesPhoto from "../assets/incentives_photo.jpg";

/* ------------------------------------------------------------------ */
/*  Inline icon primitives (bold, uniform 1.75 stroke, no icon lib)    */
/* ------------------------------------------------------------------ */
const Ic = ({ children, size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const IconLeaf = (p) => (
  <Ic {...p}>
    <path d="M11 20A7 7 0 0 1 4 13c0-5 5-9 15-9 0 8-4 13-8 13Z" />
    <path d="M6 21c0-4 3-8 8-10" />
  </Ic>
);
const IconUsers = (p) => (
  <Ic {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
  </Ic>
);
const IconTruck = (p) => (
  <Ic {...p}>
    <path d="M14 17V5H2v12h2" />
    <path d="M14 9h5l3 4v4h-2" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
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
const IconChart = (p) => (
  <Ic {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 15v-4M12 15V8M17 15v-6" />
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
/*  Scroll-entry reveal wrapper (IntersectionObserver)                 */
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
/*  Small shared bits                                                  */
/* ------------------------------------------------------------------ */
const ACCENTS = {
  green: { bg: "#EDF3EC", fg: "#346538" },
  blue: { bg: "#E1F3FE", fg: "#1F6C9F" },
  yellow: { bg: "#FBF3DB", fg: "#956400" },
  red: { bg: "#FDEBEC", fg: "#9F2F2D" },
};

function Tag({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#EAEAEA] bg-white px-3 py-1 font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#787774]">
      {children}
    </span>
  );
}

// Morphs between + (closed) and - (open) by rotating one bar, smoother than
// swapping two icons.
function PlusToggle({ open }) {
  return (
    <span className="relative flex h-5 w-5 flex-none items-center justify-center text-[#787774]">
      <span className="absolute h-[1.75px] w-3.5 rounded-full bg-current" />
      <span
        className="absolute h-[1.75px] w-3.5 rounded-full bg-current"
        style={{
          transform: open ? "rotate(0deg)" : "rotate(90deg)",
          transition: "transform 300ms var(--ease-out)",
        }}
      />
    </span>
  );
}

// Tiny bar visual used inside wide bento cells for background diversity.
function MiniBars({ data, color, labels }) {
  return (
    <div>
      <div className="flex h-28 items-end gap-2">
        {data.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[3px]"
            style={{ height: `${h}%`, background: color, opacity: 0.35 + (i / data.length) * 0.65 }}
          />
        ))}
      </div>
      {labels && (
        <div className="mt-2 flex justify-between font-mono-meta text-[10px] uppercase tracking-[0.12em] text-[#9A9A96]">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Section photography (real rubber-farming photos from src/assets). A light
// gradient overlay keeps the images cohesive with the monochrome palette.
function Figure({ src, alt, ratio = "aspect-[16/9]", className = "", priority = false }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#EAEAEA] ${ratio} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="h-full w-full object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(52,101,56,0.04), rgba(17,17,17,0.10))" }}
      />
    </div>
  );
}

function IconBadge({ icon: Icon, accent = "green" }) {
  const a = ACCENTS[accent];
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-[10px]"
      style={{ background: a.bg, color: a.fg }}
    >
      <Icon size={22} />
    </div>
  );
}

/* ================================================================== */
/*  LANDING                                                            */
/* ================================================================== */
export default function Landing() {
  const { user } = useAuth();
  const dashboardHref =
    user?.role === "MEMBER" ? "/me" : user?.role === "MAO" ? "/mao" : "/members";

  return (
    <div className="min-h-screen bg-[#FBFBFA] font-sans-ui text-[#2F3437] antialiased">
      {/* ambient warm blob behind hero */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="ambient-blob absolute -top-40 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(52,101,56,0.10) 0%, rgba(52,101,56,0.0) 70%)",
          }}
        />
      </div>

      <Nav user={user} dashboardHref={dashboardHref} />

      <main className="relative z-10">
        <Hero user={user} dashboardHref={dashboardHref} />
        <HeroBand />
        <Value />
        <Features />
        <WhyChooseUs />
        <Incentives />
        <About />
        <FAQ />
        <Contact />
        <FinalCTA user={user} dashboardHref={dashboardHref} />
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NAV                                                                */
/* ------------------------------------------------------------------ */
function Nav({ user, dashboardHref }) {
  const links = [
    ["Product", "#value"],
    ["Features", "#features"],
    ["Incentives", "#incentives"],
    ["About", "#about"],
    ["FAQ", "#faq"],
    ["Contact", "#contact"],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-[#EAEAEA] bg-[#FBFBFA]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-white">
            <IconLeaf size={18} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">SMARTCOOP</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm text-[#787774] transition-colors hover:text-[#111111]"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to={dashboardHref}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white btn-press hover:bg-[#333333]"
            >
              Go to dashboard
              <IconArrow size={15} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-medium text-[#787774] transition-colors hover:text-[#111111] sm:inline"
              >
                Sign in
              </Link>
              <Link
                to="/apply"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white btn-press hover:bg-[#333333]"
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
/*  HERO                                                               */
/* ------------------------------------------------------------------ */
function Hero({ user, dashboardHref }) {
  return (
    <section id="top" className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <div className="mb-6 flex justify-center">
            <Tag>San Luis Rubber Producer&apos;s Cooperative</Tag>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="font-serif-display text-5xl text-[#111111] md:text-7xl">
            Rubber farming and
            <br />
            cooperative management,
            <br />
            <span className="italic text-[#346538]">measured and fair.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-[1.6] text-[#787774]">
            SMARTCOOP replaces manual tally sheets and hand-computed payouts with one
            record system, from rubber deliveries and receipts to loans, dividends,
            patronage refunds, and credit scoring, with analytics for the cooperative and
            the Municipal Agriculture Office.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={user ? dashboardHref : "/apply"}
              className="inline-flex items-center gap-2 rounded-md bg-[#111111] px-6 py-3 text-sm font-medium text-white btn-press hover:bg-[#333333]"
            >
              {user ? "Open your dashboard" : "Become a member"}
              <IconArrow size={16} />
            </Link>
            {user ? (
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-md border border-[#EAEAEA] bg-white px-6 py-3 text-sm font-medium text-[#2F3437] btn-press hover:bg-[#F7F6F3]"
              >
                Explore the features
              </a>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md border border-[#EAEAEA] bg-white px-6 py-3 text-sm font-medium text-[#2F3437] btn-press hover:bg-[#F7F6F3]"
              >
                Sign in
              </Link>
            )}
          </div>
        </Reveal>
      </div>

      {/* Faux dashboard window */}
      <Reveal delay={320}>
        <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-xl border border-[#EAEAEA] bg-white">
          <div className="flex items-center gap-2 border-b border-[#EAEAEA] bg-[#F9F9F8] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#E4E4E2]" />
            <span className="h-3 w-3 rounded-full bg-[#E4E4E2]" />
            <span className="h-3 w-3 rounded-full bg-[#E4E4E2]" />
            <span className="ml-3 font-mono-meta text-xs text-[#9A9A96]">
              smartcoop / cooperative overview
            </span>
          </div>
          <DashboardMock />
        </div>
      </Reveal>
    </section>
  );
}

function DashboardMock() {
  const stats = [
    { label: "Active members", value: "312", accent: "green", icon: IconUsers },
    { label: "Rubber delivered (Kinsina)", value: "18,240 kg", accent: "blue", icon: IconTruck },
    { label: "Payouts released", value: "₱1.24M", accent: "yellow", icon: IconCoins },
    { label: "Loans repaid on time", value: "92%", accent: "green", icon: IconShield },
  ];
  const bars = [42, 61, 55, 78, 66, 84, 72];
  return (
    <div className="grid gap-6 p-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[10px] border border-[#EAEAEA] p-4">
              <div className="mb-3 flex items-center justify-between">
                <IconBadge icon={s.icon} accent={s.accent} />
              </div>
              <p className="text-2xl font-semibold text-[#111111]">{s.value}</p>
              <p className="mt-0.5 text-xs text-[#787774]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[10px] border border-[#EAEAEA] p-4">
        <p className="text-xs font-medium text-[#787774]">Monthly delivery volume</p>
        <div className="mt-6 flex h-32 items-end gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[3px]"
              style={{ height: `${h}%`, background: i === bars.length - 1 ? "#346538" : "#DDE7DC" }}
            />
          ))}
        </div>
        <p className="mt-4 font-mono-meta text-[11px] text-[#9A9A96]">JAN - JUL</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO IMAGE BAND                                                    */
/* ------------------------------------------------------------------ */
function HeroBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-4">
      <Reveal>
        <Figure
          src={heroBandPhoto}
          ratio="aspect-[16/6]"
          alt="Smallholder tapping rubber at a plot in San Luis"
        />
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  VALUE & PRODUCT                                                    */
/* ------------------------------------------------------------------ */
function Value() {
  const points = [
    "Every kilogram of rubber, every deduction, and every payout recorded once and reconciled automatically.",
    "Members see their own deliveries, receipts, and loan balances without waiting for a manual statement.",
    "Officers and the MAO get live figures instead of month-old spreadsheets.",
  ];
  return (
    <section id="value" className="border-t border-[#EAEAEA] bg-[#F7F6F3] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-14 md:grid-cols-2">
          <Reveal>
            <h2 className="font-serif-display text-4xl text-[#111111] md:text-5xl">
              One system for the whole cooperative cycle.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-[#787774]">
              The San Luis cooperative has managed membership, delivery tally sheets, and
              financial computations by hand. That is slow to process, easy to miscalculate,
              and hard to audit. SMARTCOOP turns that paperwork into a single connected record.
            </p>
          </Reveal>
          <div className="space-y-5">
            {points.map((p, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="flex gap-4 rounded-xl border border-[#EAEAEA] bg-white p-6">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md" style={{ background: ACCENTS.green.bg, color: ACCENTS.green.fg }}>
                    <IconArrow size={15} />
                  </span>
                  <p className="text-[15px] leading-[1.6] text-[#2F3437]">{p}</p>
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
/*  FEATURES (bento grid)                                              */
/* ------------------------------------------------------------------ */
function Features() {
  const feats = [
    {
      icon: IconUsers,
      accent: "green",
      title: "Membership & categorization",
      body: "Regular and associate records with a dynamic activity algorithm that ranks members Active, Moderate, or Inactive from their delivery and repayment behaviour.",
      wide: true,
      chart: [82, 54, 28],
      chartLabels: ["Active", "Moderate", "Inactive"],
    },
    {
      icon: IconTruck,
      accent: "blue",
      title: "Loading & deliveries",
      body: "Kinsina (15-day) and Katapusan (monthly) batches with DRC quality, per-kilo pricing, and running totals.",
    },
    {
      icon: IconReceipt,
      accent: "yellow",
      title: "Automated receipts",
      body: "Gross less CBU, loan, membership, supplies, and dayong. Net income is computed and printed per delivery.",
    },
    {
      icon: IconWallet,
      accent: "red",
      title: "Diminishing-interest loans",
      body: "Amortization schedules with interest on the remaining balance, repaid automatically from deliveries.",
    },
    {
      icon: IconCoins,
      accent: "green",
      title: "Dividends & patronage",
      body: "Year-end settlements split by share capital and by delivery volume, each with a full computation breakdown.",
    },
    {
      icon: IconShield,
      accent: "blue",
      title: "Agricultural credit scoring",
      body: "Creditworthiness from repayment history, production consistency, and farm characteristics.",
    },
    {
      icon: IconChart,
      accent: "yellow",
      title: "MAO analytics dashboard",
      body: "Aggregated production, affected-area tagging, and support-program tracking for the Municipal Agriculture Office.",
      wide: true,
      chart: [40, 58, 52, 74, 63, 88],
      chartLabels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    },
  ];
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif-display text-4xl text-[#111111] md:text-5xl">
            Built around how the cooperative actually works.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.6] text-[#787774]">
            Each module maps to a real step in the rubber trade, from the collection point
            to the annual settlement.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {feats.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 3) * 80}
              className={f.wide ? "md:col-span-2" : ""}
            >
              {f.wide ? (
                <div
                  className="card-lift grid h-full gap-6 rounded-xl border p-7 sm:grid-cols-2 sm:items-center"
                  style={{ background: ACCENTS[f.accent].bg, borderColor: "transparent" }}
                >
                  <div>
                    <IconBadge icon={f.icon} accent={f.accent} />
                    <h3 className="mt-5 text-lg font-semibold text-[#111111]">{f.title}</h3>
                    <p className="mt-2 text-[15px] leading-[1.6] text-[#787774]">{f.body}</p>
                  </div>
                  <div className="rounded-lg bg-white/60 p-5">
                    <MiniBars data={f.chart} color={ACCENTS[f.accent].fg} labels={f.chartLabels} />
                  </div>
                </div>
              ) : (
                <div className="card-lift h-full rounded-xl border border-[#EAEAEA] bg-white p-7">
                  <IconBadge icon={f.icon} accent={f.accent} />
                  <h3 className="mt-5 text-lg font-semibold text-[#111111]">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[#787774]">{f.body}</p>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  WHY CHOOSE US                                                      */
/* ------------------------------------------------------------------ */
function WhyChooseUs() {
  const reasons = [
    { k: "01", title: "Accurate by construction", body: "Computations follow one set of formulas, so there are no re-keyed numbers and no drifting spreadsheets." },
    { k: "02", title: "Transparent to members", body: "Every receipt, settlement, and score carries a “Show computation” view with the exact figures used." },
    { k: "03", title: "Faster processing", body: "Batch totals and payouts that once took days are ready the moment deliveries are entered." },
    { k: "04", title: "Role-aware access", body: "Staff, members, and the MAO each see only what belongs to them, secured by account roles." },
  ];
  return (
    <section className="border-t border-[#EAEAEA] bg-[#F7F6F3] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-14 md:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <h2 className="font-serif-display text-4xl text-[#111111] md:text-5xl">
              Trust that comes from showing the math.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-[#787774]">
              A cooperative runs on member confidence. SMARTCOOP earns it by making every
              peso traceable back to a delivery, a rate, and a rule.
            </p>
          </Reveal>

          <div className="grid gap-px overflow-hidden rounded-xl border border-[#EAEAEA] bg-[#EAEAEA] sm:grid-cols-2">
            {reasons.map((r, i) => (
              <Reveal key={r.k} delay={i * 80}>
                <div className="h-full bg-white p-7">
                  <span className="font-mono-meta text-xs tracking-widest text-[#B0AFAB]">{r.k}</span>
                  <h3 className="mt-3 text-base font-semibold text-[#111111]">{r.title}</h3>
                  <p className="mt-2 text-sm leading-[1.6] text-[#787774]">{r.body}</p>
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
/*  INCENTIVES                                                         */
/* ------------------------------------------------------------------ */
function Incentives() {
  const items = [
    { icon: IconCoins, accent: "green", title: "Dividends on share capital", body: "Members earn a yearly dividend proportional to the capital they hold in the cooperative." },
    { icon: IconTruck, accent: "blue", title: "Patronage refunds", body: "A share of the surplus returned in proportion to how much rubber each member delivered." },
    { icon: IconWallet, accent: "yellow", title: "Access to affordable credit", body: "Loans with clear diminishing-interest schedules, repaid conveniently from delivery proceeds." },
    { icon: IconShield, accent: "red", title: "Fair credit standing", body: "Consistent delivery and on-time repayment build a score that unlocks larger, cheaper loans." },
  ];
  return (
    <section id="incentives" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif-display text-4xl text-[#111111] md:text-5xl">
            Rewards for delivering and staying active.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.6] text-[#787774]">
            Membership is worth more when participation is tracked properly. These are the
            returns SMARTCOOP computes and distributes.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={(i % 4) * 80}>
              <div className="card-lift h-full rounded-xl border border-[#EAEAEA] bg-white p-7">
                <IconBadge icon={it.icon} accent={it.accent} />
                <h3 className="mt-5 text-base font-semibold text-[#111111]">{it.title}</h3>
                <p className="mt-2 text-sm leading-[1.6] text-[#787774]">{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <Figure
            src={incentivesPhoto}
            ratio="aspect-[16/5]"
            alt="Rows of rubber trees on a cooperative member's farm"
            className="mt-4"
          />
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
    <section id="about" className="border-t border-[#EAEAEA] bg-[#F7F6F3] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-14 md:grid-cols-2">
          <Reveal>
            <h2 className="font-serif-display text-4xl text-[#111111] md:text-5xl">
              A cooperative-first tool, not another generic ledger.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-[#787774]">
              The San Luis Rubber Producer&apos;s Cooperative brings smallholder tappers
              together to sell rubber, share surplus, and access credit. SMARTCOOP was
              designed specifically for that model: the Kinsina and Katapusan collection
              rhythm, the deductions taken at the collection point, and the yearly split of
              dividends and patronage refunds.
            </p>
            <p className="mt-4 text-[16px] leading-[1.6] text-[#787774]">
              It also opens a window for the Municipal Agriculture Office to see production
              trends and direct support where it is needed most.
            </p>
          </Reveal>

          <div className="space-y-4">
            <Reveal>
              <Figure
                src={aboutPhoto}
                ratio="aspect-[3/2]"
                alt="Members bringing rubber to a cooperative collection point"
              />
            </Reveal>
            {facts.map(([k, v], i) => (
              <Reveal key={k} delay={i * 90}>
                <div className="flex items-center justify-between rounded-xl border border-[#EAEAEA] bg-white px-6 py-5">
                  <span className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#B0AFAB]">{k}</span>
                  <span className="text-right text-[15px] font-medium text-[#2F3437]">{v}</span>
                </div>
              </Reveal>
            ))}
            <Reveal delay={280}>
              <blockquote className="rounded-xl border border-[#EAEAEA] bg-white p-6">
                <p className="font-serif-display text-xl italic text-[#111111]">
                  &ldquo;When the numbers are open, members deliver with confidence.&rdquo;
                </p>
                <p className="mt-3 text-sm text-[#787774]">Cooperative operating principle</p>
              </blockquote>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ (borderless accordion)                                         */
/* ------------------------------------------------------------------ */
function FAQ() {
  const faqs = [
    {
      q: "Who can use SMARTCOOP?",
      a: "Cooperative staff and administrators manage members, deliveries, and finances. Members log in to a personal view of their own deliveries, receipts, and loans. The Municipal Agriculture Office has its own analytics dashboard.",
    },
    {
      q: "How is a member's net income per delivery calculated?",
      a: "Gross is price per kilo multiplied by total kilos. From that the system subtracts CBU, any due loan installment, membership fees, acid or tapping-knife supplies, and dayong. The remainder is the net income printed on the receipt.",
    },
    {
      q: "What decides whether a member is Active, Moderate, or Inactive?",
      a: "A dynamic categorization algorithm scores recent delivery volume and loan-repayment rate, adds them into an activity score, and assigns a category. Members with no loans are handled separately rather than penalized.",
    },
    {
      q: "How are dividends and patronage refunds different?",
      a: "Dividends are distributed in proportion to each member's share capital. Patronage refunds are distributed in proportion to the volume of rubber each member delivered during the year. SMARTCOOP computes both and shows the full breakdown.",
    },
    {
      q: "Are the loan interest computations transparent?",
      a: "Yes. Loans use diminishing interest, so interest is charged on the remaining balance each period. Every schedule includes a computation view with the exact principal, interest, and totals.",
    },
    {
      q: "Is member data kept private?",
      a: "Access is role-based. Members can only view their own records; staff and the MAO see only what their role permits.",
    },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="text-center">
          <h2 className="font-serif-display text-4xl text-[#111111] md:text-5xl">
            Questions, answered plainly.
          </h2>
        </Reveal>

        <div className="mt-12 border-t border-[#EAEAEA]">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 50}>
                <div className="border-b border-[#EAEAEA]">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="text-[16px] font-medium text-[#111111] transition-opacity duration-200 group-hover:opacity-70">
                      {f.q}
                    </span>
                    <PlusToggle open={isOpen} />
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 pr-10 text-[15px] leading-[1.7] text-[#787774]">{f.a}</p>
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
/*  CONTACT                                                            */
/* ------------------------------------------------------------------ */
function Contact() {
  const details = [
    { icon: IconPin, label: "Office", value: "San Luis Rubber Producer's Cooperative" },
    { icon: IconMail, label: "Email", value: "smartcoop.sanluis@coop.ph" },
    { icon: IconPhone, label: "Phone", value: "+63 (000) 000 0000" },
  ];
  return (
    <section id="contact" className="border-t border-[#EAEAEA] bg-[#F7F6F3] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-14 md:grid-cols-2">
          <Reveal>
            <h2 className="font-serif-display text-4xl text-[#111111] md:text-5xl">
              Talk to the cooperative office.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-[#787774]">
              For membership, delivery schedules, or account access, reach the office
              directly. Existing members and staff can sign in to their accounts anytime.
            </p>
            <div className="mt-8 space-y-4">
              {details.map((d) => (
                <div key={d.label} className="flex items-center gap-4">
                  <IconBadge icon={d.icon} accent="green" />
                  <div>
                    <p className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#B0AFAB]">{d.label}</p>
                    <p className="text-[15px] font-medium text-[#2F3437]">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="rounded-xl border border-[#EAEAEA] bg-white p-7"
            >
              <div className="grid gap-4">
                <Field label="Name" placeholder="Your full name" />
                <Field label="Email" type="email" placeholder="you@email.com" />
                <div>
                  <label className="mb-1.5 block font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#787774]">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="How can the cooperative help?"
                    className="w-full rounded-md border border-[#EAEAEA] bg-[#FBFBFA] px-3.5 py-2.5 text-sm text-[#2F3437] outline-none transition focus:border-[#B7C9B5] focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] px-5 py-3 text-sm font-medium text-white btn-press hover:bg-[#333333]"
                >
                  Send message
                  <IconArrow size={15} />
                </button>
                <p className="text-center text-xs text-[#B0AFAB]">
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
      <label className="mb-1.5 block font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#787774]">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-md border border-[#EAEAEA] bg-[#FBFBFA] px-3.5 py-2.5 text-sm text-[#2F3437] outline-none transition focus:border-[#B7C9B5] focus:bg-white"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FINAL CTA                                                          */
/* ------------------------------------------------------------------ */
function FinalCTA({ user, dashboardHref }) {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#111111] px-8 py-16 text-center md:py-20">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 0%, rgba(52,101,56,0.35) 0%, rgba(17,17,17,0) 60%)",
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-serif-display text-4xl text-white md:text-5xl">
                Bring every delivery and payout into one clear record.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.6] text-white/60">
                {user
                  ? "Manage membership, record deliveries, and compute settlements, all with the math on display."
                  : "Apply to join the cooperative, then track your deliveries, receipts, and payouts in one place."}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={user ? dashboardHref : "/apply"}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-medium text-[#111111] btn-press hover:bg-[#EDEDEA]"
                >
                  {user ? "Open your dashboard" : "Become a member"}
                  <IconArrow size={16} />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 px-6 py-3 text-sm font-medium text-white btn-press hover:bg-white/5"
                >
                  Review the features
                </a>
              </div>
            </div>
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
    ["Product", [["Features", "#features"], ["Incentives", "#incentives"], ["Why us", "#value"]]],
    ["Cooperative", [["About", "#about"], ["FAQ", "#faq"], ["Contact", "#contact"]]],
    ["Access", [["Become a member", "/apply"], ["Sign in", "/login"]]],
  ];
  return (
    <footer className="relative z-10 border-t border-[#EAEAEA] bg-[#FBFBFA]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-white">
                <IconLeaf size={18} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">SMARTCOOP</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-[1.6] text-[#787774]">
              A web-based rubber farming and cooperative management system with integrated
              data analytics for the San Luis Rubber Producer&apos;s Cooperative.
            </p>
          </div>

          {cols.map(([title, links]) => (
            <div key={title}>
              <p className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#B0AFAB]">{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, href]) =>
                  href.startsWith("#") ? (
                    <li key={label}>
                      <a href={href} className="text-sm text-[#787774] transition-colors hover:text-[#111111]">{label}</a>
                    </li>
                  ) : (
                    <li key={label}>
                      <Link to={href} className="text-sm text-[#787774] transition-colors hover:text-[#111111]">{label}</Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[#EAEAEA] pt-6 sm:flex-row">
          <p className="text-xs text-[#B0AFAB]">
            © {new Date().getFullYear()} San Luis Rubber Producer&apos;s Cooperative. All rights reserved.
          </p>
          <p className="font-mono-meta text-[11px] text-[#B0AFAB]">SMARTCOOP capstone system</p>
        </div>
      </div>
    </footer>
  );
}
