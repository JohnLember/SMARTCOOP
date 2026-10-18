import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import {
  ArrowRight, Mail, MapPin, Phone, Plus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BRAND as C } from "../lib/brandTokens";
import heroBandPhoto from "../assets/Hero_band_photo.jpg";
import aboutPhoto from "../assets/about_photo.jpg";
import incentivesPhoto from "../assets/incentives_photo.jpg";
import heroLoop from "../assets/video/smartcoop-hero-square-alpha.webm";

gsap.registerPlugin(ScrollTrigger, CustomEase);
// Same curves as --ease-out / --ease-in-out in index.css, so GSAP and CSS motion match.
CustomEase.create("out", "0.23,1,0.32,1");
CustomEase.create("inOut", "0.77,0,0.175,1");

const peso = (n) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const latexA = (a) => `rgba(242,236,218,${a})`;

/* ------------------------------------------------------------------ */
/*  Motion. Everything lives in one gsap.matchMedia so reduced-motion  */
/*  visitors get the static page, and unmount reverts every tween.     */
/* ------------------------------------------------------------------ */
function useLandingMotion(root) {
  useLayoutEffect(() => {
    const el = root.current;
    const q = (s) => [...el.querySelectorAll(s)];
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // 1. Hero, once on load: the background brightens out of the dark like dawn,
      //    then the copy reads in order (label, headline, copy).
      gsap.timeline({ defaults: { ease: "out" } })
        .from(q("[data-hero=photo]"), { opacity: 0, duration: 1.2, ease: "inOut" }, 0)
        .from(q("[data-hero=photo] img"), { scale: 1.12, duration: 1.8 }, 0)
        .from(q("[data-hero=eyebrow]"), { opacity: 0, y: 8, duration: 0.5 }, 0.15)
        .from(q("[data-hero=line]"), { yPercent: 110, duration: 0.9, stagger: 0.08 }, 0.25)
        .from(q("[data-hero=fade]"), { opacity: 0, y: 12, duration: 0.6, stagger: 0.06 }, 0.6);

      // 2. Section content enters as it is reached, short stagger so groups read top to bottom.
      const reveals = q("[data-reveal]");
      gsap.set(reveals, { opacity: 0, y: 16 });
      ScrollTrigger.batch(reveals, {
        start: "top 88%",
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.6, ease: "out", stagger: 0.06, overwrite: true }),
      });

      // 3. Photos open from the bottom edge instead of popping in.
      q("[data-clip]").forEach((fig) => {
        gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 85%", once: true } })
          .fromTo(fig, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "inOut" })
          .from(fig.querySelector("img"), { scale: 1.12, duration: 1.4, ease: "out" }, 0);
      });

      // 4. The receipt is the explanation: scroll prints it line by line, then totals the net.
      const receipt = el.querySelector("[data-receipt]");
      const net = receipt.querySelector("[data-net]");
      const counter = { v: 0 };
      gsap.timeline({ scrollTrigger: { trigger: receipt, start: "top 85%", end: "center 55%", scrub: 0.6 } })
        .from(receipt.querySelectorAll("[data-row]"), { opacity: 0, y: 10, stagger: 0.25, ease: "out" })
        .from(receipt.querySelector("[data-rule]"), { scaleX: 0, transformOrigin: "left center", ease: "inOut" })
        .from(net.parentElement, { opacity: 0 }, "<")
        .fromTo(counter, { v: 0 }, { v: Number(net.dataset.net), ease: "out", onUpdate: () => { net.textContent = peso(counter.v); } }, "<");

      // 5. "By hand" is struck through as the "with SMARTCOOP" column arrives: the change, shown.
      gsap.from(q("[data-strike]"), {
        backgroundSize: "0% 1.5px", duration: 0.5, ease: "inOut", stagger: 0.12,
        scrollTrigger: { trigger: el.querySelector("[data-compare]"), start: "top 70%", once: true },
      });
    });

    // 6. Features: the section pins and scroll drives a camera along the route, past one
    //    screen per feature. Desktop only; phones and reduced motion get the plain grid.
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
      const route = el.querySelector("[data-route]");
      const world = route.querySelector("[data-world]");
      const cards = [...route.querySelectorAll("[data-card]")];
      const dots = [...route.querySelectorAll("[data-dot]")];
      const copies = [...route.querySelectorAll("[data-copy]")];
      const ticks = [...route.querySelectorAll("[data-tick]")];
      const fill = route.querySelector("[data-fill]");
      const { PERSPECTIVE: P, GAP, CAM_BACK, LOOK } = ROUTE;
      const last = cards.length - 1;
      const smooth = (a, b, x) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      // Near: fade out as it passes the camera. Far: fade into the haze.
      const fog = (rel) => (1 - smooth(-200, 200, rel)) * (1 - smooth(1800, 3400, -rel));
      const show = (node, o) => {
        node.style.opacity = o;
        node.style.visibility = o < 0.01 ? "hidden" : "visible";
      };
      const cam = { u: 0 };
      const render = () => {
        const { u } = cam;
        const camZ = -u * GAP + CAM_BACK;
        // Face along the path (its direction across a short window around the camera), so every
        // turn, climb and dip steers the view; centred so each card stop is seen square-on.
        const dx = (routeX(u + LOOK / 2) - routeX(u - LOOK / 2)) * 0.5;
        const dy = (routeY(u + LOOK / 2) - routeY(u - LOOK / 2)) * 0.5;
        const yaw = Math.atan2(dx, LOOK * GAP) * (180 / Math.PI);
        const pitch = -Math.atan2(dy, LOOK * GAP) * (180 / Math.PI);
        // rotate about the eye (P in front of the screen plane), not the screen centre
        world.style.transform = `translateZ(${P}px) rotateX(${pitch}deg) rotateY(${yaw}deg) translateZ(${-P}px) translate3d(${-routeX(u) * 0.5}px, ${-routeY(u) * 0.5}px, ${-camZ}px)`;
        cards.forEach((c, i) => {
          show(c, fog(-i * GAP - camZ));
          c.firstChild.style.transform = `scale(${1.25 + 0.2 * (1 - smooth(0.1, 0.7, Math.abs(u - i)))})`;
        });
        dots.forEach((d) => show(d, 0.4 * fog(-Number(d.dataset.dot) * GAP + CAM_BACK - camZ)));
        copies.forEach((c, i) => {
          const o = 1 - smooth(0.1, 0.5, Math.abs(u - i));
          show(c, o);
          c.style.transform = `translateY(${(u < i ? 1 : -1) * 24 * (1 - o)}px)`;
        });
        ticks.forEach((t, i) => {
          const on = Math.round(u) === i;
          t.style.background = on ? C.amber : "#fff";
          t.style.transform = on ? "scale(1.5)" : "";
        });
        fill.style.transform = `scaleY(${u / last})`;
      };
      gsap.to(cam, {
        u: last,
        ease: "none",
        onUpdate: render,
        // refreshPriority: this pin adds scroll length, so it must be measured before the reveals below it
        scrollTrigger: { trigger: route, pin: true, start: "top top", end: `+=${last * 90}%`, scrub: 0.8, refreshPriority: 1 },
      });
      render();
    });

    return () => mm.revert();
  }, [root]);
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
// The tapping-cut motif marks each phase seam (predawn, dawn, day).
function Herringbone({ from, to, stroke = C.amber }) {
  const id = `herr-${from.replace("#", "")}-${to.replace("#", "")}`;
  return (
    <div aria-hidden="true" className="relative h-14 w-full overflow-hidden" style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}>
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

function Figure({ src, alt, ratio, className = "", ...rest }) {
  return (
    <div className={`relative overflow-hidden rounded-sm ${ratio} ${className}`} {...rest}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

function PrimaryCta({ user, dashboardHref, ...rest }) {
  return (
    <Link
      to={user ? dashboardHref : "/apply"}
      className="btn-press inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-sm px-6 py-3 text-sm font-medium"
      style={{ background: C.amber, color: C.canopy }}
      {...rest}
    >
      {user ? "Open your dashboard" : "Become a member"}
      <ArrowRight size={16} strokeWidth={1.75} />
    </Link>
  );
}

const H2 = ({ children, dark, className = "" }) => (
  <h2 className={`font-tap-display text-4xl font-light leading-[1.1] md:text-5xl ${className}`} style={{ color: dark ? C.latex : C.ink }}>
    {children}
  </h2>
);

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default function Landing() {
  const { user } = useAuth();
  const dashboardHref = user?.role === "MEMBER" ? "/me" : user?.role === "MAO" ? "/mao" : "/members";
  const root = useRef(null);
  useLandingMotion(root);

  return (
    <div ref={root} className="font-tap-body antialiased" style={{ color: C.ink, background: C.latex }}>
      <Nav user={user} dashboardHref={dashboardHref} />
      <main>
        <Hero user={user} dashboardHref={dashboardHref} />
        <Herringbone from={C.canopy} to={C.bark} />
        <Rhythm />
        <Herringbone from={C.bark} to={C.latex} stroke={C.inkMuted} />
        <Value />
        <Features />
        <Incentives />
        <About />
        <FAQ />
        <Herringbone from={C.latex} to={C.canopy} stroke={C.inkMuted} />
        <Contact user={user} dashboardHref={dashboardHref} />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NAV                                                                */
/* ------------------------------------------------------------------ */
function Nav({ user, dashboardHref }) {
  const links = [["Rhythm", "#cut"], ["Features", "#features"], ["Incentives", "#incentives"], ["About", "#about"], ["FAQ", "#faq"]];
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(16,23,15,0.94)", borderBottom: `1px solid ${C.canopyLine}` }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <img src="/smartcoop-mark.png" alt="" className="h-8 w-8" />
          <span className="font-tap-display text-[15px] font-medium tracking-tight" style={{ color: C.latex }}>SMARTCOOP</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-[#F2ECDA]/65 transition-colors duration-150 hover:text-[#F2ECDA]">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {!user && (
            <Link to="/login" className="hidden text-sm font-medium text-[#F2ECDA]/65 transition-colors duration-150 hover:text-[#F2ECDA] sm:inline">
              Sign in
            </Link>
          )}
          <Link
            to={user ? dashboardHref : "/apply"}
            className="btn-press inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium"
            style={{ background: C.amber, color: C.canopy }}
          >
            {user ? "Go to dashboard" : "Become a member"}
            <ArrowRight size={15} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO: asymmetric split, predawn                                    */
/* ------------------------------------------------------------------ */
function Hero({ user, dashboardHref }) {
  const lines = ["Tapped before sunrise.", "Counted to the peso."];
  // Phones never mount the video (no 12 MB download); the CSS breakpoint on its wrapper also hides it
  // if a desktop window is narrowed after load. shortcut: widening a phone-sized window won't add it until reload.
  const showVideo = matchMedia("(min-width: 1024px)").matches;
  // Reduced motion: no autoplay, one frame stays as a still.
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <section id="top" className="relative isolate overflow-hidden px-6" style={{ background: C.canopy }}>
      <div data-hero="photo" aria-hidden="true" className="absolute inset-0 -z-10">
        <img src={heroBandPhoto} alt="" fetchPriority="high" className="h-full w-full object-cover" />
        {/* scrims keep the copy at AA contrast: flat on phones, left-weighted where the copy sits on desktop */}
        <div className="absolute inset-0 bg-[#10170F]/70 md:bg-[#10170F]/25" />
        <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(90deg, rgba(16,23,15,0.94) 0%, rgba(16,23,15,0.75) 45%, rgba(16,23,15,0) 85%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: `linear-gradient(180deg, rgba(16,23,15,0), ${C.canopy})` }} />
      </div>
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-10 py-20 lg:grid-cols-2">
        <div className="max-w-2xl">
          <p data-hero="eyebrow" className="font-tap-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: C.amberSoft }}>
            San Luis Rubber Producer&apos;s Cooperative
          </p>
          <h1 className="font-tap-display mt-6 text-[2.75rem] font-light leading-[1.1] md:text-6xl" style={{ color: C.latex }}>
            {lines.map((l, i) => (
              // pb keeps the italic "p" descender inside the mask
              <span key={l} className="block overflow-hidden pb-[0.1em]">
                <span data-hero="line" className="block" style={i ? { color: C.amberSoft, fontStyle: "italic" } : undefined}>{l}</span>
              </span>
            ))}
          </h1>
          <p data-hero="fade" className="mt-6 max-w-xl text-[17px] leading-[1.65]" style={{ color: latexA(0.82) }}>
            SMARTCOOP is the ledger for what comes after: deliveries, receipts, loans and payouts, computed the same way for every member.
          </p>
          <div data-hero="fade" className="mt-9 flex flex-col gap-3 sm:flex-row">
            <PrimaryCta user={user} dashboardHref={dashboardHref} />
            <a
              href="#cut"
              className="btn-press inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm px-6 py-3 text-sm font-medium"
              style={{ border: `1px solid ${latexA(0.35)}`, color: C.latex }}
            >
              See how it works
            </a>
          </div>
        </div>
        {showVideo && (
          <div data-hero="fade" className="hidden lg:block">
            {/* Decorative loop: no controls, no PiP, and pointer-events-none so hover and right-click
                never surface the browser's video UI. Muted + playsInline are required for autoplay. */}
            <video
              // the loop opens on an empty frame (the bowl drops in), so the reduced-motion still starts at 3s
              src={reduceMotion ? `${heroLoop}#t=3` : heroLoop}
              autoPlay={!reduceMotion}
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none aspect-square w-full select-none rounded-sm object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  RHYTHM: the two cycles, and a receipt that prints as you scroll    */
/* ------------------------------------------------------------------ */
const EXAMPLE = { kg: 86.5, price: 52, cbu: 50, supplies: 35, dayong: 20 }; // illustrative figures only

function Rhythm() {
  const cycles = [
    { k: "Kinsina", freq: "Every 15 days", body: "The short cycle. Latex is weighed and priced per kilo at the collection point." },
    { k: "Katapusan", freq: "Once a month", body: "The long cycle. Deliveries are reconciled into one net figure per member." },
  ];
  const gross = EXAMPLE.kg * EXAMPLE.price;
  const deductions = [
    ["Less: CBU (Capital Build-Up)", EXAMPLE.cbu],
    ["Less: Acid / tapping knife", EXAMPLE.supplies],
    ["Less: Dayong", EXAMPLE.dayong],
  ];
  const net = gross - EXAMPLE.cbu - EXAMPLE.supplies - EXAMPLE.dayong;

  return (
    <section id="cut" className="px-6 py-24 md:py-32" style={{ background: C.bark }}>
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <div data-reveal>
            <H2 dark>Two collections. One clear rule.</H2>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-[1.65]" style={{ color: latexA(0.68) }}>
              Whichever cycle a delivery lands in, the same deductions apply and the member gets the same receipt.
            </p>
          </div>
          <dl className="mt-12 grid gap-8 sm:grid-cols-2">
            {cycles.map((c) => (
              <div key={c.k} data-reveal className="pt-5" style={{ borderTop: `1px solid ${C.barkLine}` }}>
                <dt>
                  <span className="font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: C.amberSoft }}>{c.freq}</span>
                  <span className="font-tap-display mt-2 block text-3xl font-light" style={{ color: C.latex }}>{c.k}</span>
                </dt>
                <dd className="mt-3 text-[15px] leading-[1.6]" style={{ color: latexA(0.68) }}>{c.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure data-receipt className="rounded-sm p-7 shadow-[0_24px_60px_-20px_rgba(10,8,4,0.55)] md:p-9" style={{ background: C.latex, color: C.ink }}>
          <figcaption className="flex items-baseline justify-between gap-4">
            <span className="font-tap-display text-2xl">Delivery receipt</span>
            <span className="font-tap-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: C.inkMuted }}>Example</span>
          </figcaption>
          <p className="font-tap-mono mt-2 text-sm" style={{ color: C.inkMuted }}>
            {EXAMPLE.kg} kg × {peso(EXAMPLE.price)} per kg
          </p>
          <dl className="font-tap-mono mt-7 space-y-3 text-[13px] sm:text-[14px]">
            <div data-row className="flex justify-between gap-4 font-medium">
              <dt>Gross income</dt>
              <dd>{peso(gross)}</dd>
            </div>
            {deductions.map(([label, amt]) => (
              <div key={label} data-row className="flex justify-between gap-4" style={{ color: C.inkMuted }}>
                <dt>{label}</dt>
                <dd className="whitespace-nowrap">−{peso(amt)}</dd>
              </div>
            ))}
          </dl>
          <div data-rule className="mt-6 h-px" style={{ background: C.ink }} />
          <div className="mt-5 flex items-end justify-between gap-4">
            <span className="text-sm font-medium">Net income</span>
            <span data-net={net} className="font-tap-mono text-3xl font-medium md:text-4xl" style={{ color: C.moss }}>{peso(net)}</span>
          </div>
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  VALUE: by hand vs. with SMARTCOOP                                  */
/* ------------------------------------------------------------------ */
function Value() {
  const rows = [
    ["Recording", "Re-keyed from tally sheets", "Recorded once and reconciled automatically"],
    ["Members", "Find out on the next office visit", "See deliveries, receipts and loans as soon as they are entered"],
    ["The MAO", "A spreadsheet updated once a month", "Live production and membership figures by barangay"],
  ];
  return (
    <section className="px-6 pt-24 md:pt-32" style={{ background: C.latex }}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="max-w-2xl">
          <H2>Daylight on the whole cycle.</H2>
          <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: C.inkMuted }}>
            For years the cooperative kept its records by hand. That is slow, easy to miscalculate, and hard to audit.
          </p>
        </div>
        <div data-compare className="mt-14">
          <div className="hidden gap-8 pb-3 text-sm font-medium md:grid md:grid-cols-[9rem_1fr_1fr]" style={{ color: C.inkMuted }}>
            <span />
            <span>By hand</span>
            <span style={{ color: C.moss }}>With SMARTCOOP</span>
          </div>
          {rows.map(([label, before, after]) => (
            <div key={label} data-reveal className="grid gap-2 py-6 md:grid-cols-[9rem_1fr_1fr] md:gap-8" style={{ borderTop: `1px solid ${C.latexLine}` }}>
              <span className="font-tap-mono text-[11px] uppercase tracking-[0.18em] md:pt-1.5" style={{ color: C.inkMuted }}>{label}</span>
              <span className="text-[16px]" style={{ color: C.inkMuted }}>
                {/* the strike is a background line, so it follows the text onto every wrapped line */}
                <span
                  data-strike
                  style={{
                    backgroundImage: `linear-gradient(${C.amber}, ${C.amber})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "0 58%",
                    backgroundSize: "100% 1.5px",
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone",
                  }}
                >
                  {before}
                </span>
              </span>
              <span className="text-[17px] font-medium" style={{ color: C.ink }}>{after}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES: a camera flies along a route past one screen per feature */
/* ------------------------------------------------------------------ */
// Small, illustrative mock screens of the app. Figures are made up.
function MockFrame({ children }) {
  return (
    <div
      className="rounded-[14px] p-5 text-[13px] tabular-nums"
      style={{ background: "#FFFDF7", border: `1px solid ${C.latexLine}`, color: C.ink, boxShadow: "0 1px 2px rgba(32,26,18,.06), 0 24px 50px rgba(32,26,18,.14)" }}
    >
      {children}
    </div>
  );
}
const Pill = ({ children, amber }) => (
  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={amber ? { background: C.cured, color: "#8A5216" } : { background: "#E2EADB", color: C.moss }}>
    {children}
  </span>
);
const Meter = ({ value, color = C.moss }) => (
  <div className="mt-1.5 h-1.5 rounded-full" style={{ background: C.latexLine }}>
    <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
  </div>
);
const Line = ({ l, r, muted, strong }) => (
  <div className={`flex justify-between py-1 ${strong ? "text-[15px] font-semibold" : ""}`} style={{ color: muted ? C.inkMuted : C.ink }}>
    <span>{l}</span>
    <span>{r}</span>
  </div>
);

function MockMember() {
  return (
    <MockFrame>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-semibold" style={{ background: C.moss, color: C.latex }}>JD</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Juan Dela Cruz</p>
          <p style={{ color: C.inkMuted }}>M-0001 · Regular member</p>
        </div>
        <Pill>Active</Pill>
      </div>
      <div className="mt-5 flex justify-between" style={{ color: C.inkMuted }}><span>Capital build-up</span><span>Regular at ₱10,000</span></div>
      <p className="font-tap-display mt-1 text-3xl">₱10,450.00</p>
      <Meter value={100} />
      <div className="mt-4 flex gap-2">
        <Pill>Active</Pill>
        <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: C.inkMuted, border: `1px solid ${C.latexLine}` }}>Moderate</span>
        <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: C.inkMuted, border: `1px solid ${C.latexLine}` }}>Inactive</span>
      </div>
    </MockFrame>
  );
}

function MockDelivery() {
  return (
    <MockFrame>
      <div className="flex items-center justify-between">
        <p className="font-semibold">Kinsina · Batch B-0412</p>
        <Pill amber>Open</Pill>
      </div>
      <p className="font-tap-display mt-4 text-4xl">86.5 kg</p>
      <p className="mt-1" style={{ color: C.inkMuted }}>× ₱52.00 per kilo = <b style={{ color: C.ink }}>₱4,498.00</b></p>
      <div className="mt-4 border-t pt-2" style={{ borderColor: C.latexLine }}>
        <Line l="Juan Dela Cruz" r="86.5 kg" />
        <Line l="Jose Garcia" r="112.0 kg" muted />
        <Line l="Maria Santos" r="64.25 kg" muted />
      </div>
    </MockFrame>
  );
}

function MockReceipt() {
  const gross = EXAMPLE.kg * EXAMPLE.price;
  return (
    <MockFrame>
      <div className="flex items-center justify-between">
        <p className="font-semibold">Delivery receipt</p>
        <span className="font-tap-mono text-[11px]" style={{ color: C.inkMuted }}>R-0918</span>
      </div>
      <div className="mt-3">
        <Line l={`Gross · ${EXAMPLE.kg} kg × ₱${EXAMPLE.price}`} r={peso(gross)} />
        <Line l="Less: CBU" r={peso(EXAMPLE.cbu)} muted />
        <Line l="Less: Acid / tapping knife" r={peso(EXAMPLE.supplies)} muted />
        <Line l="Less: Dayong" r={peso(EXAMPLE.dayong)} muted />
      </div>
      <div className="mt-2 border-t pt-2" style={{ borderColor: C.ink }}>
        <Line strong l="Net income" r={peso(gross - EXAMPLE.cbu - EXAMPLE.supplies - EXAMPLE.dayong)} />
      </div>
    </MockFrame>
  );
}

function MockLoan() {
  return (
    <MockFrame>
      <div className="flex items-center justify-between">
        <p className="font-semibold">Loan L-0032 · 12 months</p>
        <Pill>On schedule</Pill>
      </div>
      <p className="mt-4" style={{ color: C.inkMuted }}>Outstanding balance</p>
      <p className="font-tap-display text-3xl">₱18,400.00</p>
      <div className="mt-3 border-t pt-2" style={{ borderColor: C.latexLine }}>
        <Line l="Nov 30 · Paid" r="₱1,733.33" muted />
        <Line l="Dec 31 · Due" r="₱1,716.67" />
        <Line l="Jan 31" r="₱1,700.00" muted />
      </div>
      <p className="mt-2 text-[11px]" style={{ color: C.inkMuted }}>Minimum payment ₱200.00 · extra carries forward</p>
    </MockFrame>
  );
}

function MockCredit() {
  const parts = [["Repayment history", 90], ["Production consistency", 76], ["Cooperative standing", 80]];
  return (
    <MockFrame>
      <div className="flex items-end justify-between">
        <p className="font-tap-display text-5xl">82<span className="text-lg" style={{ color: C.inkMuted }}> / 100</span></p>
        <Pill>Low risk</Pill>
      </div>
      <div className="mt-4 space-y-2.5">
        {parts.map(([l, v]) => (
          <div key={l}>
            <div className="flex justify-between"><span style={{ color: C.inkMuted }}>{l}</span><span>{v}</span></div>
            <Meter value={v} color={C.amber} />
          </div>
        ))}
      </div>
      <p className="mt-4 font-semibold">Suggested limit ₱25,000.00</p>
    </MockFrame>
  );
}

function MockMao() {
  const bars = [["Poblacion", 92], ["Bacong", 64], ["Lumbia", 78], ["Mabini", 41], ["San Isidro", 55]];
  return (
    <MockFrame>
      <p className="font-semibold">Production by barangay (kg)</p>
      <div className="mt-4 flex h-32 items-end gap-3">
        {bars.map(([b, v], i) => (
          <div key={b} className="flex h-full flex-1 flex-col justify-end">
            <div className="rounded-t-[4px]" style={{ height: `${v}%`, background: i ? C.moss : C.amber, opacity: i ? 0.75 : 1 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-3 text-[10px]" style={{ color: C.inkMuted }}>
        {bars.map(([b]) => <span key={b} className="flex-1 truncate text-center">{b}</span>)}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: C.inkMuted }}>Aggregates only · no individual finances</p>
    </MockFrame>
  );
}

const FEATURES = [
  { k: "Members", Mock: MockMember, title: "Membership and categorization", body: "Regular and associate records, ranked by an algorithm that reads delivery and repayment behaviour." },
  { k: "Deliveries", Mock: MockDelivery, title: "Weighed deliveries", body: "Per-kilo pricing and running totals for every Kinsina and Katapusan batch." },
  { k: "Receipts", Mock: MockReceipt, title: "Automated receipts", body: "Gross less CBU, acid or tapping knife, and dayong. Net income printed per delivery." },
  { k: "Loans", Mock: MockLoan, title: "Diminishing-interest loans", body: "Payments are recorded at the office, with a ₱200 minimum. Anything extra carries into the next periods." },
  { k: "Credit", Mock: MockCredit, title: "Agricultural credit scoring", body: "Creditworthiness from repayment history, production consistency, and farm characteristics." },
  { k: "MAO", Mock: MockMao, title: "MAO analytics", body: "Production and membership by barangay for the Municipal Agriculture Office. Aggregates only, never an individual member's finances." },
];

// The route, in CSS px. Card i sits at depth -i*GAP, alternating sides; the camera
// stays CAM_BACK in front of the card in focus. Driven by step 6 of useLandingMotion.
// LOOK: the stretch of path (in cards) the camera's heading is taken from.
const ROUTE = { PERSPECTIVE: 900, GAP: 1000, SWAY: 300, LIFT: 130, CAM_BACK: 260, LOOK: 0.3 };
const routeX = (u) => -Math.cos(u * Math.PI) * ROUTE.SWAY;
// a different period from the sway, so the climbs and dips don't just mirror the turns
const routeY = (u) => Math.sin(u * Math.PI * 0.7) * ROUTE.LIFT;
const ROUTE_DOTS = Array.from({ length: 110 }, (_, i) => i * 0.05 - 0.2);

const kicker = (i, k) => `${String(i + 1).padStart(2, "0")} / ${k}`;

function Features() {
  return (
    <section id="features" style={{ background: C.latex }}>
      <div className="mx-auto max-w-6xl px-6 pt-24 md:pt-32">
        <div data-reveal className="max-w-2xl">
          <H2>Built around how the cooperative actually works.</H2>
        </div>
      </div>

      {/* Desktop with motion allowed: pinned while you scroll, the camera flies past one screen per feature. */}
      <div
        data-route
        className="relative mt-10 hidden h-[100dvh] overflow-hidden lg:block motion-reduce:hidden"
        style={{ perspective: ROUTE.PERSPECTIVE, background: `linear-gradient(180deg, ${C.latex} 0%, #FBF6E8 100%)` }}
      >
        <div data-world aria-hidden="true" className="absolute left-1/2 top-[44%]" style={{ transformStyle: "preserve-3d" }}>
          {ROUTE_DOTS.map((t) => (
            <span
              key={t}
              data-dot={t}
              className="absolute -left-1 -top-1 h-2 w-2 rounded-full"
              style={{ background: C.amber, transform: `translate3d(${routeX(t) * 0.5}px, ${230 + routeY(t) * 0.5}px,${-t * ROUTE.GAP + ROUTE.CAM_BACK}px)` }}
            />
          ))}
          {FEATURES.map(({ k, Mock }, i) => (
            <div
              key={k}
              data-card
              className="absolute -left-[200px] -top-[140px] w-[400px]"
              style={{ transform: `translate3d(${routeX(i)}px, ${routeY(i)}px,${-i * ROUTE.GAP}px) rotateY(${(-routeX(i) / ROUTE.SWAY) * 12}deg)` }}
            >
              <div data-card-scale><Mock /></div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[9%] mx-auto max-w-6xl px-6">
          <div className="relative h-44">
            {FEATURES.map(({ k, title, body }, i) => (
              <div
                key={k}
                data-copy
                className="absolute bottom-0 left-0 max-w-md rounded-2xl"
                style={{ opacity: i ? 0 : 1, background: "rgba(242,236,218,.85)", boxShadow: "0 0 24px 16px rgba(242,236,218,.85)" }}
              >
                <p className="font-tap-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: C.amber }}>{kicker(i, k)}</p>
                <h3 className="font-tap-display mt-3 text-3xl font-light" style={{ color: C.ink }}>{title}</h3>
                <p className="mt-2 text-[15px] leading-[1.6]" style={{ color: C.inkMuted }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div aria-hidden="true" className="absolute right-8 top-1/2 h-[32%] w-0.5 -translate-y-1/2 rounded-full" style={{ background: C.latexLine }}>
          <span data-fill className="absolute inset-0 origin-top scale-y-0 rounded-full" style={{ background: C.amber }} />
          {FEATURES.map(({ k }, i) => (
            <span
              key={k}
              data-tick
              className="absolute left-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full transition-transform duration-300"
              style={{ top: `${(i / (FEATURES.length - 1)) * 100}%`, background: "#fff", boxShadow: `0 0 0 1.5px ${C.latexLine}` }}
            />
          ))}
        </div>
      </div>

      {/* Phones, tablets and reduced motion: the same screens as a plain grid. */}
      <div className="mx-auto grid max-w-6xl gap-x-6 gap-y-12 px-6 pb-24 pt-14 md:grid-cols-2 md:pb-32 lg:hidden motion-reduce:lg:grid">
        {FEATURES.map(({ k, Mock, title, body }, i) => (
          <div key={k} data-reveal>
            <Mock />
            <p className="font-tap-mono mt-6 text-[11px] uppercase tracking-[0.2em]" style={{ color: C.amber }}>{kicker(i, k)}</p>
            <h3 className="mt-2 text-lg font-semibold" style={{ color: C.ink }}>{title}</h3>
            <p className="mt-2 max-w-[48ch] text-[15px] leading-[1.6]" style={{ color: C.inkMuted }}>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  INCENTIVES: photo band over a 2x2 of rewards                       */
/* ------------------------------------------------------------------ */
function Incentives() {
  const items = [
    ["Dividends on share capital", "A yearly dividend in proportion to the capital each member holds in the cooperative."],
    ["Patronage refunds", "A share of the surplus returned in proportion to the rubber each member delivered."],
    ["Affordable credit", "Diminishing-interest loans for members, paid at the cooperative office."],
    ["Fair credit standing", "Consistent delivery and on-time repayment build a stronger credit score."],
  ];
  return (
    <section id="incentives" className="px-6 py-24 md:py-32" style={{ background: C.cured }}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="max-w-2xl">
          <H2>Rewards for delivering and staying active.</H2>
        </div>
        <Figure data-clip src={incentivesPhoto} ratio="aspect-[4/3] md:aspect-[16/6]" alt="Rows of rubber trees on a cooperative member's farm" className="mt-12" />
        <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {items.map(([title, body]) => (
            <div key={title} data-reveal className="pt-5" style={{ borderTop: `1px solid ${C.curedLine}` }}>
              <dt className="font-tap-display text-2xl" style={{ color: C.ink }}>{title}</dt>
              <dd className="mt-2 max-w-[44ch] text-[15px] leading-[1.6]" style={{ color: C.inkMuted }}>{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  ABOUT                                                              */
/* ------------------------------------------------------------------ */
function About() {
  const facts = [
    ["Serving", "Rubber-farming barangays of San Luis"],
    ["Covers", "Membership, production, finance, analytics"],
    ["Built for", "Staff, members, and the MAO"],
  ];
  return (
    <section id="about" className="px-6 py-24 md:py-32" style={{ background: C.latex }}>
      <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2 md:gap-20">
        <Figure data-clip src={aboutPhoto} ratio="aspect-[3/2] md:aspect-[4/5]" alt="Members bringing rubber to a cooperative collection point" />
        <div>
          <div data-reveal>
            <H2>A cooperative-first tool, not another ledger.</H2>
            <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: C.inkMuted }}>
              The San Luis Rubber Producer&apos;s Cooperative brings smallholder tappers together to sell rubber, share surplus,
              and access credit. SMARTCOOP was built for that model: the Kinsina and Katapusan rhythm, the deductions taken at
              the collection point, and the yearly split of dividends and patronage.
            </p>
          </div>
          <dl className="mt-10 space-y-5">
            {facts.map(([k, v]) => (
              <div key={k} data-reveal className="grid grid-cols-[7rem_1fr] gap-4">
                <dt className="font-tap-mono pt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: C.inkMuted }}>{k}</dt>
                <dd className="text-[15px] font-medium" style={{ color: C.ink }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ: CSS transitions, not GSAP; it is user-triggered and must stay */
/*  interruptible.                                                     */
/* ------------------------------------------------------------------ */
function FAQ() {
  const faqs = [
    { q: "Who can use SMARTCOOP?", a: "Cooperative staff and administrators manage members, deliveries, and finances. Members log in to a personal view of their own deliveries, receipts, and loans. The Municipal Agriculture Office has its own analytics dashboard." },
    { q: "How is a member's net income per delivery calculated?", a: "Gross is the price per kilo times the total kilos. From that the system subtracts CBU, acid or tapping-knife supplies, and dayong. What remains is the net income printed on the receipt. Loan payments are made separately at the office." },
    { q: "What decides whether a member is Active, Moderate, or Inactive?", a: "A categorization algorithm scores recent delivery volume and loan-repayment rate, combines them into an activity score, and assigns a category. Members with no loans are handled separately rather than penalized." },
    { q: "How are dividends and patronage refunds different?", a: "Dividends are paid in proportion to each member's share capital. Patronage refunds are paid in proportion to the rubber each member delivered during the year." },
    { q: "Is member data kept private?", a: "Access is role-based. Members see only their own records. Staff and the MAO see only what their role permits, and the MAO never sees an individual member's finances." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="px-6 pb-24 md:pb-32" style={{ background: C.latex }}>
      <div className="mx-auto max-w-3xl">
        <div data-reveal>
          <H2>Answered plainly.</H2>
        </div>
        <div className="mt-12" style={{ borderTop: `1px solid ${C.latexLine}` }}>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} data-reveal style={{ borderBottom: `1px solid ${C.latexLine}` }}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  className="group flex min-h-11 w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="text-[16px] font-medium" style={{ color: C.ink }}>{f.q}</span>
                  <Plus
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="flex-none transition-transform duration-200 ease-[var(--ease-out)]"
                    style={{ color: C.amber, transform: isOpen ? "rotate(45deg)" : "none" }}
                  />
                </button>
                <div
                  id={`faq-${i}`}
                  className="grid transition-[grid-template-rows] duration-250 ease-[var(--ease-out)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-[15px] leading-[1.7]" style={{ color: C.inkMuted }}>{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CONTACT + closing CTA: night again, full circle                    */
/* ------------------------------------------------------------------ */
function Contact({ user, dashboardHref }) {
  const details = [
    { icon: MapPin, label: "Office", value: "San Luis Rubber Producer's Cooperative" },
    { icon: Mail, label: "Email", value: "smartcoop.sanluis@coop.ph" },
    { icon: Phone, label: "Phone", value: "+63 (000) 000 0000" },
  ];
  return (
    <section id="contact" className="px-6 py-24 md:py-32" style={{ background: C.canopy }}>
      <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-[1.3fr_1fr] md:items-end md:gap-20">
        <div data-reveal>
          <H2 dark className="max-w-xl">Bring every delivery and payout into one clear record.</H2>
          <p className="mt-5 max-w-lg text-[16px] leading-[1.65]" style={{ color: latexA(0.68) }}>
            {user
              ? "Manage membership, record deliveries, and compute settlements, with the math on display."
              : "Apply to join the cooperative, then track your deliveries, receipts, and payouts in one place."}
          </p>
          <div className="mt-9">
            <PrimaryCta user={user} dashboardHref={dashboardHref} />
          </div>
        </div>
        <dl className="space-y-6">
          {details.map((d) => (
            <div key={d.label} data-reveal className="flex items-center gap-4">
              <d.icon size={20} strokeWidth={1.6} aria-hidden="true" style={{ color: C.amberSoft }} />
              <div>
                <dt className="font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: latexA(0.6) }}>{d.label}</dt>
                <dd className="text-[15px] font-medium" style={{ color: C.latex }}>{d.value}</dd>
              </div>
            </div>
          ))}
        </dl>
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
  const linkCls = "text-sm text-[#F2ECDA]/65 transition-colors duration-150 hover:text-[#F2ECDA]";
  return (
    <footer className="px-6" style={{ background: C.canopy, borderTop: `1px solid ${C.canopyLine}` }}>
      <div className="mx-auto max-w-6xl py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/smartcoop-mark.png" alt="" className="h-8 w-8" />
              <span className="font-tap-display text-[15px] font-medium tracking-tight" style={{ color: C.latex }}>SMARTCOOP</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-[1.6]" style={{ color: latexA(0.6) }}>
              A web-based rubber farming and cooperative management system with integrated data analytics for the San Luis
              Rubber Producer&apos;s Cooperative.
            </p>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <p className="font-tap-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: latexA(0.55) }}>{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("#") ? <a href={href} className={linkCls}>{label}</a> : <Link to={href} className={linkCls}>{label}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6" style={{ borderTop: `1px solid ${C.canopyLine}` }}>
          <p className="text-xs" style={{ color: latexA(0.55) }}>
            © {new Date().getFullYear()} San Luis Rubber Producer&apos;s Cooperative. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
