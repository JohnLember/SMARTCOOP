import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { HerringboneRule, Button } from "./ui";
import {
  Users,
  MapPin,
  LayoutDashboard,
  Bell,
  LogOut,
  Leaf,
  UserCircle,
  Truck,
  Wallet,
  ShieldCheck,
  ReceiptText,
  UserCog,
  UserPlus,
  FileCheck,
} from "lucide-react";

// Navigation items per role, grouped into sections so a long flat list
// reads as an organized menu rather than nine equal-weight links.
const NAV = {
  ADMIN: [
    { section: null, items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ] },
    { section: "Membership", items: [
      { to: "/members", label: "Members", icon: Users },
      { to: "/applications", label: "Membership Applications", icon: UserPlus },
      { to: "/barangays", label: "Barangays", icon: MapPin },
    ] },
    { section: "Production", items: [
      { to: "/batches", label: "Loading & Deliveries", icon: Truck },
    ] },
    { section: "Finance", items: [
      { to: "/loans", label: "Loans", icon: Wallet },
      { to: "/loan-applications", label: "Loan Applications", icon: FileCheck },
      { to: "/credit", label: "Credit Scoring", icon: ShieldCheck },
    ] },
    { section: "System", items: [
      { to: "/users", label: "User Management", icon: UserCog },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ] },
  ],
  STAFF: [
    { section: null, items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ] },
    { section: "Membership", items: [
      { to: "/members", label: "Members", icon: Users },
      { to: "/applications", label: "Membership Applications", icon: UserPlus },
      { to: "/barangays", label: "Barangays", icon: MapPin },
    ] },
    { section: "Production", items: [
      { to: "/batches", label: "Loading & Deliveries", icon: Truck },
    ] },
    { section: "Finance", items: [
      { to: "/loans", label: "Loans", icon: Wallet },
      { to: "/loan-applications", label: "Loan Applications", icon: FileCheck },
      { to: "/credit", label: "Credit Scoring", icon: ShieldCheck },
    ] },
    { section: "System", items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
    ] },
  ],
  MAO: [
    { section: null, items: [
      { to: "/mao", label: "MAO Dashboard", icon: LayoutDashboard, end: true },
      { to: "/mao/members-by-barangay", label: "Members by Barangay", icon: MapPin },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ] },
  ],
  MEMBER: [
    { section: null, items: [
      { to: "/my-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/me", label: "My Profile", icon: UserCircle },
      { to: "/my-deliveries", label: "My Deliveries", icon: Truck },
      { to: "/my-receipts", label: "My Receipts", icon: ReceiptText },
      { to: "/my-loans", label: "My Loans", icon: Wallet },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ] },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const groups = NAV[user?.role] ?? [];

  // Unread-notification count for the sidebar badge. Refetched on route change
  // and whenever a page fires "notifications:changed" (e.g. marking one read),
  // so the badge clears immediately without a navigation.
  // ponytail: no polling — a notice that arrives while idle shows on next nav.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      api
        .get("/notifications")
        .then((res) => {
          if (!cancelled) setUnread(res.data.filter((n) => n.status === "UNREAD").length);
        })
        .catch(() => {});
    refresh();
    window.addEventListener("notifications:changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("notifications:changed", refresh);
    };
  }, [location.pathname]);

  function handleLogout() {
    // Confirm first, and keep it to a single prompt — repeat presses reuse the
    // same toast instead of stacking new ones.
    if (toast.isActive("logout-confirm")) return;
    toast(
      ({ closeToast }) => (
        <LogoutConfirm
          onCancel={closeToast}
          onConfirm={() => {
            closeToast();
            logout();
            navigate("/login");
          }}
        />
      ),
      {
        toastId: "logout-confirm",
        icon: false,
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
      }
    );
  }

  const displayName = user?.member
    ? `${user.member.firstName} ${user.member.lastName}`
    : user?.username;

  return (
    <div className="flex min-h-[100dvh] bg-[#FBFBFA]">
      <aside className="sticky top-0 flex h-[100dvh] w-64 flex-col border-r border-[#EAEAEA] bg-white">
        <NavLink to="/" className="flex items-center gap-2.5 px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111111] text-white">
            <Leaf size={18} />
          </span>
          <div>
            <p className="font-serif-display text-[17px] font-light tracking-tight text-[#111111]">SMARTCOOP</p>
            <p className="text-xs text-[#787774]">Rubber Cooperative</p>
          </div>
        </NavLink>
        <HerringboneRule height={8} className="border-b border-[#EAEAEA]" />

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
          {groups.map((group, gi) => (
            <div key={group.section ?? gi}>
              {group.section && (
                <p className="mb-1.5 px-3 font-mono-meta text-[10px] uppercase tracking-[0.16em] text-[#B0AFAB]">
                  {group.section}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `btn-press relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-[#EDF3EC] text-[#346538]"
                          : "text-[#787774] hover:bg-[#F2F1ED] hover:text-[#111111]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full"
                            style={{ background: "#B9701F" }}
                          />
                        )}
                        <item.icon size={18} />
                        {item.label}
                        {item.to === "/notifications" && unread > 0 && (
                          <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#9F2F2D] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#EAEAEA] p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-[#2F3437]">{displayName}</p>
            <p className="font-mono-meta text-[11px] uppercase tracking-[0.12em] text-[#B0AFAB]">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-press flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#787774] hover:bg-[#FDEBEC] hover:text-[#9F2F2D]"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Confirmation shown inside the sign-out toast. Reuses the app's Button variants
// so it reads as part of the same system; the action verb matches its trigger.
// A portaled scrim makes it behave like a dialog: the app dims and stops
// responding until a choice is made (clicking the scrim, or Escape, cancels).
function LogoutConfirm({ onConfirm, onCancel }) {
  // Once a choice is made, drop the scrim in the same render — before the toast
  // plays its own exit — so the blur never lingers over the page behind it
  // (notably the login screen the moment you sign out).
  const [closed, setClosed] = useState(false);
  const cancel = () => {
    setClosed(true);
    onCancel();
  };
  const confirm = () => {
    setClosed(true);
    onConfirm();
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && cancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Portaled to body so it escapes the toast's transformed box and covers
          the whole viewport — below the toast (z-70), above everything else. */}
      {!closed &&
        createPortal(
          <div
            className="logout-scrim fixed inset-0 z-[65] bg-black/40 backdrop-blur-[2px]"
            onClick={cancel}
            aria-hidden="true"
          />,
          document.body
        )}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start gap-3">
          <span className="mt-px flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#FDEBEC] text-[#9F2F2D]">
            <LogOut size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#111111]">Sign out?</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#787774]">
              You&apos;ll need to sign in again to get back in.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm}>
            Sign out
          </Button>
        </div>
      </div>
    </>
  );
}
