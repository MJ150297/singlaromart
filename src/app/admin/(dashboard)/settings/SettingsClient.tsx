"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Profile = { name: string; email: string | null; phone: string | null; role: string };

export default function SettingsClient({ initialProfile }: { initialProfile: Profile }) {
  const { update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email || "");
  const [profileState, setProfileState] = useState({ loading: false, message: "", error: "" });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [securityState, setSecurityState] = useState({ loading: false, message: "", error: "" });

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileState({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/api/admin/settings/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) });
      const body = await response.json() as { success: boolean; data?: Profile; error?: string };
      if (!response.ok || !body.success || !body.data) throw new Error(body.error || "Failed to update profile");
      setProfile(body.data);
      await update({ name: body.data.name, email: body.data.email || undefined, displayEmail: body.data.email || undefined });
      router.refresh();
      setProfileState({ loading: false, message: "Profile updated successfully.", error: "" });
    } catch (error) {
      setProfileState({ loading: false, message: "", error: error instanceof Error ? error.message : "Failed to update profile" });
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setSecurityState({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/api/admin/settings/security", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(password) });
      const body = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !body.success) throw new Error(body.error || "Failed to update password");
      setSecurityState({ loading: false, message: "Password updated. Please sign in again.", error: "" });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      await signOut({ callbackUrl: "/admin/login" });
    } catch (error) {
      setSecurityState({ loading: false, message: "", error: error instanceof Error ? error.message : "Failed to update password" });
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage your admin account settings.</p></div>
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="profile-heading">
      <div className="mb-5"><h2 id="profile-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Profile</h2><p className="mt-1 text-sm text-slate-500">Update the account information used in the admin area.</p></div>
      <form onSubmit={saveProfile} className="space-y-4">
        <label className={labelClass}>Name<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} minLength={3} required /></label>
        <label className={labelClass}>Email<input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className={labelClass}>Phone<input className={`${inputClass} cursor-not-allowed opacity-70`} value={profile.phone || "Not available"} readOnly /></label>
        <label className={labelClass}>Role<input className={`${inputClass} cursor-not-allowed opacity-70`} value={profile.role === "owner" ? "Owner" : profile.role} readOnly /></label>
        {profileState.error && <p className="text-sm text-rose-600" role="alert">{profileState.error}</p>}
        {profileState.message && <p className="text-sm text-emerald-600" role="status">{profileState.message}</p>}
        <button disabled={profileState.loading} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{profileState.loading ? "Saving…" : "Save profile"}</button>
      </form>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="security-heading">
      <div className="mb-5"><h2 id="security-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Security</h2><p className="mt-1 text-sm text-slate-500">Change the password used to sign in to the admin area.</p></div>
      <form onSubmit={changePassword} className="space-y-4">
        <label className={labelClass}>Current password<input className={inputClass} type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required /></label>
        <label className={labelClass}>New password<input className={inputClass} type="password" minLength={8} value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} required /></label>
        <label className={labelClass}>Confirm new password<input className={inputClass} type="password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} required /></label>
        {securityState.error && <p className="text-sm text-rose-600" role="alert">{securityState.error}</p>}
        <button disabled={securityState.loading} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">{securityState.loading ? "Updating…" : "Update password"}</button>
      </form>
    </section>
  </div>;
}
