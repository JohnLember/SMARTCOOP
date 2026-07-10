import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
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
  Coins,
  ShieldCheck,
  ReceiptText,
  UserCog,
  UserPlus,
} from "lucide-react";

// Navigation items per role.
const NAV = {
  ADMIN: [
    { to: "/members", label: "Members", icon: Users },
    { to: "/applications", label: "Applications", icon: UserPlus },
    { to: "/batches", label: "Loading & Deliveries", icon: Truck },
    { to: "/loans", label: "Loans", icon: Wallet },
    { to: "/credit", label: "Credit Scoring", icon: ShieldCheck },
    { to: "/settlements", label: "Settlements", icon: Coins },
    { to: "/barangays", label: "Barangays", icon: MapPin },
    { to: "/users", label: "User Management", icon: UserCog },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ],
  STAFF: [
    { to: "/members", label: "Members", icon: Users },
    { to: "/applications", label: "Applications", icon: UserPlus },
    { to: "/batches", label: "Loading & Deliveries", icon: Truck },
    { to: "/loans", label: "Loans", icon: Wallet },
    { to: "/credit", label: "Credit Scoring", icon: ShieldCheck },
    { to: "/settlements", label: "Settlements", icon: Coins },
    { to: "/barangays", label: "Barangays", icon: MapPin },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ],
  MAO: [
    { to: "/mao", label: "MAO Dashboard", icon: LayoutDashboard },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ],
  MEMBER: [
    { to: "/me", label: "My Profile", icon: UserCircle },
    { to: "/my-deliveries", label: "My Deliveries", icon: Truck },
    { to: "/my-receipts", label: "My Receipts", icon: ReceiptText },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV[user?.role] ?? [];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const displayName = user?.member
    ? `${user.member.firstName} ${user.member.lastName}`
    : user?.username;

  return (
    <div className="flex min-h-[100dvh] bg-[#FBFBFA]">
      <aside className="sticky top-0 flex h-[100dvh] w-64 flex-col border-r border-[#EAEAEA] bg-white">
        <NavLink to="/" className="flex items-center gap-2.5 border-b border-[#EAEAEA] px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111111] text-white">
            <Leaf size={18} />
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-[#111111]">SMARTCOOP</p>
            <p className="text-xs text-[#787774]">Rubber Cooperative</p>
          </div>
        </NavLink>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `btn-press flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-[#EDF3EC] text-[#346538]"
                    : "text-[#787774] hover:bg-[#F2F1ED] hover:text-[#111111]"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
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
