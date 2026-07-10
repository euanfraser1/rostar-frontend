import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet, apiPatch } from "../api/http";

export type ArtistProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  photoUrl1: string | null;
  photoUrl2: string | null;
  photoUrl3: string | null;
  videoUrl: string | null;
  bankAccountName: string | null;
  bankSortCode: string | null;
  bankAccountNumber: string | null;
};

type FormState = {
  name: string;
  phone: string;
  bio: string;
  photoUrl1: string;
  photoUrl2: string;
  photoUrl3: string;
  videoUrl: string;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  bio: "",
  photoUrl1: "",
  photoUrl2: "",
  photoUrl3: "",
  videoUrl: "",
  bankAccountName: "",
  bankSortCode: "",
  bankAccountNumber: "",
};

function profileToForm(p: ArtistProfile): FormState {
  return {
    name: p.name ?? "",
    phone: p.phone ?? "",
    bio: p.bio ?? "",
    photoUrl1: p.photoUrl1 ?? "",
    photoUrl2: p.photoUrl2 ?? "",
    photoUrl3: p.photoUrl3 ?? "",
    videoUrl: p.videoUrl ?? "",
    bankAccountName: p.bankAccountName ?? "",
    bankSortCode: p.bankSortCode ?? "",
    bankAccountNumber: p.bankAccountNumber ?? "",
  };
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 14,
  boxSizing: "border-box",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 15,
  fontWeight: 600,
};

type Props = {
  /** When true, load/save via /artists/me. When false, use /artists/:artistId from the route. */
  self: boolean;
};

export default function ArtistProfilePage({ self }: Props) {
  const { artistId } = useParams<{ artistId: string }>();
  const apiPath = self ? "/artists/me" : `/artists/${artistId}`;

  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    apiGet<ArtistProfile>(apiPath)
      .then((data) => {
        if (!mounted) return;
        setEmail(data.email);
        setForm(profileToForm(data));
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e));
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiPath]);

  function patchField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    if (!form.name.trim()) {
      setSaveError("Artist name is required.");
      return;
    }

    setSaving(true);
    const result = await apiPatch<ArtistProfile, Record<string, string | null>>(apiPath, {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      bio: form.bio.trim() || null,
      photoUrl1: form.photoUrl1.trim() || null,
      photoUrl2: form.photoUrl2.trim() || null,
      photoUrl3: form.photoUrl3.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
      bankAccountName: form.bankAccountName.trim() || null,
      bankSortCode: form.bankSortCode.trim() || null,
      bankAccountNumber: form.bankAccountNumber.trim() || null,
    });
    setSaving(false);

    if (!result.ok) {
      setSaveError(result.message);
      return;
    }

    setEmail(result.data.email);
    setForm(profileToForm(result.data));
    setSaveSuccess("Profile saved.");
  }

  if (loading) return <p style={{ color: "#666" }}>Loading profile…</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      {!self && (
        <p style={{ margin: "0 0 16px 0" }}>
          <Link to="/artists" style={{ color: "#c41e3a", textDecoration: "none", fontSize: 14 }}>
            ← Back to artists
          </Link>
        </p>
      )}

      <h1 style={{ margin: "0 0 6px 0", fontSize: 22 }}>
        {self ? "My profile" : `Profile: ${form.name || "Artist"}`}
      </h1>
      <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#6b7280" }}>
        Promo assets use URLs for now. File upload comes later.
      </p>

      <form onSubmit={handleSave}>
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Contact</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="artist-name">
              Artist name
            </label>
            <input
              id="artist-name"
              value={form.name}
              onChange={(e) => patchField("name", e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="artist-email">
              Email (login)
            </label>
            <input
              id="artist-email"
              value={email ?? ""}
              readOnly
              disabled
              style={{ ...inputStyle, background: "#f3f4f6", color: "#6b7280" }}
              placeholder={email ? undefined : "No login set up yet"}
            />
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
              Same as the login email. Contact Rostar to change it.
            </p>
          </div>
          <div>
            <label style={labelStyle} htmlFor="artist-phone">
              Phone
            </label>
            <input
              id="artist-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => patchField("phone", e.target.value)}
              style={inputStyle}
              placeholder="e.g. 07700 900123"
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Bio</h2>
          <label style={labelStyle} htmlFor="artist-bio">
            Brief bio
          </label>
          <textarea
            id="artist-bio"
            value={form.bio}
            onChange={(e) => patchField("bio", e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            placeholder="Short description used on confirmed gigs"
          />
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Promo assets</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="photo1">
              Photo 1 URL
            </label>
            <input
              id="photo1"
              type="text"
              value={form.photoUrl1}
              onChange={(e) => patchField("photoUrl1", e.target.value)}
              style={inputStyle}
              placeholder="https://…"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="photo2">
              Photo 2 URL
            </label>
            <input
              id="photo2"
              type="text"
              value={form.photoUrl2}
              onChange={(e) => patchField("photoUrl2", e.target.value)}
              style={inputStyle}
              placeholder="https://…"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="photo3">
              Photo 3 URL
            </label>
            <input
              id="photo3"
              type="text"
              value={form.photoUrl3}
              onChange={(e) => patchField("photoUrl3", e.target.value)}
              style={inputStyle}
              placeholder="https://…"
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="video">
              Video URL
            </label>
            <input
              id="video"
              type="text"
              value={form.videoUrl}
              onChange={(e) => patchField("videoUrl", e.target.value)}
              style={inputStyle}
              placeholder="https://…"
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Bank details</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="bank-name">
              Account name
            </label>
            <input
              id="bank-name"
              value={form.bankAccountName}
              onChange={(e) => patchField("bankAccountName", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="sort-code">
              Sort code
            </label>
            <input
              id="sort-code"
              value={form.bankSortCode}
              onChange={(e) => patchField("bankSortCode", e.target.value)}
              style={inputStyle}
              placeholder="XX-XX-XX"
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="account-number">
              Account number
            </label>
            <input
              id="account-number"
              value={form.bankAccountNumber}
              onChange={(e) => patchField("bankAccountNumber", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {saveError && (
          <p style={{ color: "crimson", margin: "0 0 12px 0", fontSize: 14 }}>{saveError}</p>
        )}
        {saveSuccess && (
          <p style={{ color: "green", margin: "0 0 12px 0", fontSize: 14 }}>{saveSuccess}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 20px",
            background: saving ? "#9ca3af" : "#c41e3a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
