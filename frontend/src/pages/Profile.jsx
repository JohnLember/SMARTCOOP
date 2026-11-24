import { useState } from "react";
import { toast } from "react-toastify";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmDialog";
import { Badge, Button, Card, Field, Input, PageHeader } from "../components/ui";
import { formatDate } from "../lib/format";

const ROLE_COLOR = { ADMIN: "red", STAFF: "blue", MAO: "amber" };

// Self-service profile for office accounts. Everyone edits their own name; only the
// admin changes passwords, usernames, roles and status. The API enforces the same.
export default function Profile() {
  const { user, setUser } = useAuth();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" subtitle={isAdmin ? "Your name and password" : "Your name"} />
      <div className="space-y-6">
        <NameForm user={user} onSaved={setUser} />
        <Card>
          <SectionTitle>Account</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" value={user.username} />
            <div>
              <p className="text-xs text-[#5F5E5A]">Role</p>
              <Badge color={ROLE_COLOR[user.role]}>{user.role}</Badge>
            </div>
            <Field label="Status" value={user.status} />
            <Field label="Member since" value={formatDate(user.createdAt)} />
          </div>
          <p className="mt-4 text-xs text-[#5F5E5A]">
            {isAdmin
              ? "Your own role and status can't be changed, so you can't lock yourself out."
              : "Only an admin can change your username, password, role or status."}
          </p>
        </Card>
        {isAdmin && <PasswordForm />}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-4 font-semibold text-[var(--ink)]">{children}</h2>;
}

function NameForm({ user, onSaved }) {
  const initial = {
    firstName: user.firstName ?? "",
    middleName: user.middleName ?? "",
    lastName: user.lastName ?? "",
  };
  const confirm = useConfirm();
  const [form, setForm] = useState(initial);
  const dirty = Object.keys(initial).some((k) => form[k].trim() !== initial[k]);
  const fullName = (n) => [n.firstName, n.middleName, n.lastName].map((s) => s.trim()).filter(Boolean).join(" ");

  async function submit(e) {
    e.preventDefault();
    // Same pattern as the password form: the dialog runs the save, shows progress,
    // and keeps a server error in view. Cancel leaves the name unchanged.
    let saved;
    const ok = await confirm({
      title: "Save changes to your name?",
      details: [
        { label: "Current", value: fullName(initial) || "—" },
        { label: "New", value: fullName(form) },
      ],
      tone: "default",
      confirmLabel: "Save changes",
      busyLabel: "Saving…",
      onConfirm: async () => {
        saved = (await api.patch("/auth/me", form)).data;
      },
    });
    if (!ok) return;
    onSaved(saved);
    toast.success("Profile updated");
  }

  const field = (key, label, required) => (
    <Input
      label={label}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      required={required}
      autoComplete={key === "firstName" ? "given-name" : key === "lastName" ? "family-name" : "additional-name"}
    />
  );

  return (
    <Card>
      <form onSubmit={submit}>
        <SectionTitle>Personal information</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {field("firstName", "First name", true)}
          {field("middleName", "Middle name (optional)", false)}
          {field("lastName", "Last name", true)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setForm(initial)} disabled={!dirty}>
            Cancel
          </Button>
          <Button type="submit" disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const confirm = useConfirm();
  const empty = { currentPassword: "", newPassword: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const mismatch = form.confirm !== "" && form.confirm !== form.newPassword;

  async function submit(e) {
    e.preventDefault();
    if (mismatch) return;
    // The dialog runs the update itself: it shows progress, and a wrong current
    // password appears inside it. Cancel leaves the password unchanged.
    const ok = await confirm({
      title: "Change your password?",
      description: "You will use the new password the next time you sign in.",
      tone: "default",
      confirmLabel: "Confirm",
      busyLabel: "Updating…",
      onConfirm: () =>
        api.patch("/auth/me/password", {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
    });
    if (!ok) return;
    setForm(empty);
    toast.success("Password changed");
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <Card>
      <form onSubmit={submit}>
        <SectionTitle>Change password</SectionTitle>
        <div className="space-y-3">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set("currentPassword")}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="At least 10 characters"
              minLength={10}
              value={form.newPassword}
              onChange={set("newPassword")}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={mismatch ? "Passwords don't match" : undefined}
              value={form.confirm}
              onChange={set("confirm")}
              required
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setForm(empty)}
            disabled={!Object.values(form).some(Boolean)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mismatch}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
