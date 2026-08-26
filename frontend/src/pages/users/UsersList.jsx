import { useEffect, useState } from "react";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  PageHeader,
  Badge,
  Modal, DataTable
} from "../../components/ui";
import { useConfirm } from "../../components/ConfirmDialog";
import { formatDate } from "../../lib/format";
import { Plus, KeyRound, Pencil, Trash2, ShieldCheck } from "lucide-react";

const ROLE_COLOR = { ADMIN: "red", STAFF: "blue", MAO: "amber", MEMBER: "green" };
const ROLES = ["ADMIN", "STAFF", "MAO", "MEMBER"];

export default function UsersList() {
  const { user: me } = useAuth();
  const confirm = useConfirm();
  const [users, setUsers] = useState(null);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");

  // Modal state: { mode: "create" | "edit" | "password", user? }
  const [modal, setModal] = useState(null);

  async function load() {
    const params = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    const res = await api.get("/users", { params });
    setUsers(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  useEffect(() => {
    // Members without a login, for linking new MEMBER accounts.
    api.get("/members", { params: { all: 1 } }).then((res) => setMembers(res.data.items));
  }, []);

  async function toggleStatus(u) {
    const next = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    // Reactivating is harmless and stays a single click. Deactivating locks
    // someone out of the system mid-shift, so it asks first.
    if (next === "INACTIVE") {
      const ok = await confirm({
        title: `Deactivate ${u.username}?`,
        description:
          "They will be signed out on their next request and cannot sign in again until the account is reactivated. Their records stay untouched.",
        details: [
          { label: "Account", value: u.username },
          { label: "Role", value: u.role },
        ],
        confirmLabel: "Deactivate",
        busyLabel: "Deactivating…",
      });
      if (!ok) return;
    }

    setError("");
    try {
      await api.put(`/users/${u.id}`, { status: next });
      await load();
      toast.success(`Account ${next === "ACTIVE" ? "activated" : "deactivated"}`);
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function remove(u) {
    await confirm({
      title: `Delete the account "${u.username}"?`,
      description:
        "The login is removed permanently. If this account belongs to a member, their member record and history are kept — only the ability to sign in goes.",
      details: [
        { label: "Username", value: u.username },
        { label: "Role", value: u.role },
        u.member && { label: "Member", value: u.member.memberNo },
      ].filter(Boolean),
      confirmLabel: "Delete account",
      busyLabel: "Deleting…",
      onConfirm: async () => {
        setError("");
        await api.delete(`/users/${u.id}`);
        await load();
        toast.success("Account deleted");
      },
    });
  }

  const membersWithoutAccount = members.filter((m) => !m.user);

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="System accounts and access roles (admin only)"
        actions={
          <Button onClick={() => setModal({ mode: "create" })}>
            <Plus size={16} />
            New account
          </Button>
        }
      />

      <Card className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1">
            <Input
              label="Search username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
            />
          </div>
          <div className="w-48">
            <Select label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        {error && <p className="mt-2 text-sm text-[#9F2F2D]">{error}</p>}
      </Card>

      {!users ? (
        <Spinner />
      ) : (
        <Card className="p-0">
          <DataTable>
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Linked member</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id} className="hover:bg-[#F7F6F3]">
                    <td className="px-4 py-3 font-medium text-[#2F3437]">
                      {u.username}
                      {isMe && <span className="ml-2 text-xs text-[#5F5E5A]">(you)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={ROLE_COLOR[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#787774]">
                      {u.member
                        ? `${u.member.memberNo} — ${u.member.firstName} ${u.member.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.status === "ACTIVE" ? "green" : "slate"}>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#787774]">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => setModal({ mode: "edit", user: u })}
                          disabled={isMe}
                          title={isMe ? "You cannot edit your own role or status" : "Edit role/status"}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button variant="ghost" onClick={() => setModal({ mode: "password", user: u })} title="Reset password">
                          <KeyRound size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => toggleStatus(u)}
                          disabled={isMe}
                          title={u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        >
                          <ShieldCheck size={15} className={u.status === "ACTIVE" ? "text-[#346538]" : "text-[#5F5E5A]"} />
                        </Button>
                        <Button variant="ghost" onClick={() => remove(u)} disabled={isMe} title="Delete">
                          <Trash2 size={15} className="text-[#9F2F2D]" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#5F5E5A]">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </Card>
      )}

      <UserModal
        modal={modal}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          load();
        }}
        membersWithoutAccount={membersWithoutAccount}
      />
    </div>
  );
}

function UserModal({ modal, onClose, onSaved, membersWithoutAccount }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mode = modal?.mode;
  const user = modal?.user;

  useEffect(() => {
    if (mode === "create") {
      setForm({ username: "", password: "", role: "STAFF", memberId: "" });
    } else if (mode === "edit") {
      setForm({ role: user.role, status: user.status });
    } else if (mode === "password") {
      setForm({ password: "" });
    }
    setError("");
  }, [mode, user]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "create") {
        const body = {
          username: form.username,
          password: form.password,
          role: form.role,
        };
        if (form.role === "MEMBER") body.memberId = Number(form.memberId);
        await api.post("/users", body);
      } else if (mode === "edit") {
        await api.put(`/users/${user.id}`, { role: form.role, status: form.status });
      } else if (mode === "password") {
        await api.patch(`/users/${user.id}/password`, { password: form.password });
      }
      toast.success(
        mode === "create" ? "Account created" : mode === "password" ? "Password reset" : "Account updated"
      );
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "create"
      ? "New account"
      : mode === "edit"
        ? `Edit ${user?.username}`
        : `Reset password — ${user?.username}`;

  return (
    <Modal open={!!modal} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-sm text-[#9F2F2D]">{error}</p>}

        {mode === "create" && (
          <>
            <Input
              label="Username"
              value={form.username ?? ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password ?? ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <Select
              label="Role"
              value={form.role ?? "STAFF"}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
            {form.role === "MEMBER" && (
              <Select
                label="Link to member"
                value={form.memberId ?? ""}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                required
              >
                <option value="">Select member…</option>
                {membersWithoutAccount.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberNo} — {m.firstName} {m.lastName}
                  </option>
                ))}
              </Select>
            )}
            {form.role === "MEMBER" && membersWithoutAccount.length === 0 && (
              <p className="text-xs text-amber-600">
                All members already have accounts. Create the member first, or pick another role.
              </p>
            )}
          </>
        )}

        {mode === "edit" && (
          <>
            <Select
              label="Role"
              value={form.role ?? ""}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              disabled={!!user?.memberId}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
            {user?.memberId && (
              <p className="-mt-2 text-xs text-[#5F5E5A]">
                Member-linked accounts stay as MEMBER.
              </p>
            )}
            <Select
              label="Status"
              value={form.status ?? ""}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </>
        )}

        {mode === "password" && (
          <Input
            label="New password"
            type="password"
            value={form.password ?? ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {mode === "create" ? "Create account" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
