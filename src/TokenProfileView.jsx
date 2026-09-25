import { useCallback, useEffect, useRef, useState } from "react";
import { getPublicProfileByToken } from "./api";
import "./tokenProfile.css";

const THEME = {
  bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  text: "#ffffff",
  linkBg: "rgba(255,255,255,0.08)",
  glassBg: "rgba(255,255,255,0.12)",
  glassBorder: "rgba(255,255,255,0.22)"
};

function telHref(phone) {
  if (!phone) return null;
  const raw = String(phone).trim();
  if (raw.startsWith("+")) return `tel:${raw.replace(/\s/g, "")}`;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return `tel:${raw}`;
  return `tel:+${digits}`;
}

function PhoneGlyph({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function SchoolDetailGlyph({ kind, className }) {
  const c = className || "";
  const p = { className: c, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  switch (kind) {
    case "school":
      return (
        <svg {...p}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "user":
      return (
        <svg {...p}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "phone":
      return <PhoneGlyph className={c} />;
    case "mail":
      return (
        <svg {...p}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case "map":
      return (
        <svg {...p}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "home":
      return (
        <svg {...p}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    default:
      return null;
  }
}

function parentInitial(name, fallbackLetter) {
  const t = name != null ? String(name).trim() : "";
  if (t.length > 0) return t.charAt(0).toUpperCase();
  return fallbackLetter;
}

function LinkIcon({ id }) {
  if (id === "website") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }
  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  if (id === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (id === "twitter") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  return null;
}

function displayNickname(profile) {
  const raw = profile?.nickname;
  if (raw == null) return "";
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim();
  return s;
}

function StudentProfileCard({ profile }) {
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);

  const closePhotoLightbox = useCallback(() => {
    setPhotoLightboxOpen(false);
  }, []);

  useEffect(() => {
    if (!photoLightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closePhotoLightbox();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [photoLightboxOpen, closePhotoLightbox]);

  const nickname = displayNickname(profile);
  const school = profile.school;
  const schoolName = school && typeof school === "object" ? school.name : school;
  const classLabel = profile.class ? `Class ${profile.class}` : null;
  const rollLeftParts = [
    profile.rollNumber ? `Roll ${profile.rollNumber}` : null,
    profile.studentId ? `ID ${profile.studentId}` : null
  ].filter(Boolean);
  const rollLeftText = rollLeftParts.join(" · ");
  const hasSchoolClassRow = Boolean(schoolName || classLabel);
  const hasRollBloodRow = Boolean(rollLeftText || profile.bloodGroup);

  const addressLines = [
    profile.address,
    [profile.city, profile.state].filter(Boolean).join(", "),
    profile.pincode
  ].filter(Boolean);

  const hasParents =
    profile.motherName ||
    profile.fatherName ||
    profile.motherPhone ||
    profile.fatherPhone;

  const [profileCardFlipped, setProfileCardFlipped] = useState(false);
  const flipSceneRef = useRef(null);
  const flipBackFaceRef = useRef(null);

  const scrollFlipCardToViewportTop = useCallback(() => {
    const back = flipBackFaceRef.current;
    const scene = flipSceneRef.current;
    if (back) back.scrollTop = 0;
    if (!scene) return;

    scene.scrollIntoView({ block: "start", behavior: "auto" });

    const y = scene.getBoundingClientRect().top + window.scrollY;
    const top = Math.max(0, y - 16);
    window.scrollTo({ top, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;
  }, []);

  useEffect(() => {
    scrollFlipCardToViewportTop();
    const t0 = window.setTimeout(scrollFlipCardToViewportTop, 0);
    const t1 = window.setTimeout(scrollFlipCardToViewportTop, 100);
    const t2 = window.setTimeout(scrollFlipCardToViewportTop, 700);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [profileCardFlipped, scrollFlipCardToViewportTop]);

  const schoolObj = school && typeof school === "object" ? school : null;
  const hasSchoolFlip =
    schoolObj &&
    (schoolObj.name ||
      schoolObj.phone ||
      schoolObj.address ||
      schoolObj.email ||
      schoolObj.principalName);

  const style = {
    "--nfc-p-bg": THEME.bg,
    "--nfc-p-text": THEME.text,
    "--nfc-p-glass-bg": THEME.glassBg,
    "--nfc-p-glass-border": THEME.glassBorder
  };

  const cardStyle = {
    background: THEME.bg,
    color: THEME.text
  };

  function renderStudentProfileFrontBody() {
    return (
      <>
          <div className="nfc-p-student-photo-wrap">
            {profile.photo ? (
              <button
                type="button"
                className="nfc-p-student-photo-btn"
                onClick={() => setPhotoLightboxOpen(true)}
                aria-label={profile.name ? `Enlarge ${profile.name} photo` : "Enlarge photo"}
              >
                <img
                  src={profile.photo}
                  alt=""
                  className="nfc-p-student-photo"
                />
              </button>
            ) : (
              <div className="nfc-p-student-photo-fallback" aria-hidden>
                {profile.name?.charAt(0) || "S"}
              </div>
            )}
          </div>

          <div className="nfc-p-student-head">
            {profile.name ? (
              <h1 className="nfc-p-student-name">
                <span className="nfc-p-student-name-main">{profile.name}</span>
                {nickname ? (
                  <span className="nfc-p-student-name-nick">({nickname})</span>
                ) : null}
              </h1>
            ) : null}
          </div>

          {profile.age != null && profile.age !== "" ? (
            <div className="nfc-p-age-top">
              <span className="nfc-p-age-top-label">Age</span>
              <span className="nfc-p-age-top-value">{profile.age}</span>
            </div>
          ) : null}

          {hasSchoolClassRow ? (
            <div className="nfc-p-student-info-row nfc-p-student-info-row--school">
              <span className="nfc-p-student-info-left">{schoolName || "\u00a0"}</span>
              <span className="nfc-p-student-info-right">{classLabel || "\u00a0"}</span>
            </div>
          ) : null}
          {hasRollBloodRow ? (
            <div className="nfc-p-student-info-row nfc-p-student-info-row--roll-blood">
              <span className="nfc-p-student-info-left">{rollLeftText || "\u00a0"}</span>
              <span className="nfc-p-student-info-right">
                {profile.bloodGroup ? (
                  <>
                    Blood <span className="nfc-p-blood-inline-val">{profile.bloodGroup}</span>
                  </>
                ) : (
                  "\u00a0"
                )}
              </span>
            </div>
          ) : null}

          {hasParents ? (
            <div className="nfc-p-parents-box">
              <div className="nfc-p-parents-header">
                <span className="nfc-p-parents-icon-wrap" aria-hidden>
                  <svg className="nfc-p-parents-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <h2 className="nfc-p-parents-title">Parents / guardians</h2>
              </div>
              <div className="nfc-p-parents-list">
                {(profile.fatherName || profile.fatherPhone) && (
                  <article className="nfc-p-parent-card nfc-p-parent-card--father">
                    <div className="nfc-p-parent-card-head">
                      <div className="nfc-p-parent-card-avatar">{parentInitial(profile.fatherName, "F")}</div>
                      <div className="nfc-p-parent-card-identity">
                        <h3 className="nfc-p-parent-card-role">Father</h3>
                        <p className="nfc-p-parent-card-name">{profile.fatherName || "—"}</p>
                      </div>
                    </div>
                    <div className="nfc-p-parent-card-phone-wrap">
                      {profile.fatherPhone ? (
                        <a href={telHref(profile.fatherPhone)} className="nfc-p-parent-card-phone-btn">
                          <PhoneGlyph className="nfc-p-parent-card-phone-glyph" />
                          <span className="nfc-p-parent-card-phone-line">
                            <span className="nfc-p-parent-card-phone-text">{profile.fatherPhone}</span>
                            <span className="nfc-p-parent-card-phone-hint">Tap to call</span>
                          </span>
                        </a>
                      ) : (
                        <span className="nfc-p-parent-card-phone-missing">No phone number</span>
                      )}
                    </div>
                  </article>
                )}
                {(profile.motherName || profile.motherPhone) && (
                  <article className="nfc-p-parent-card nfc-p-parent-card--mother">
                    <div className="nfc-p-parent-card-head">
                      <div className="nfc-p-parent-card-avatar">{parentInitial(profile.motherName, "M")}</div>
                      <div className="nfc-p-parent-card-identity">
                        <h3 className="nfc-p-parent-card-role">Mother</h3>
                        <p className="nfc-p-parent-card-name">{profile.motherName || "—"}</p>
                      </div>
                    </div>
                    <div className="nfc-p-parent-card-phone-wrap">
                      {profile.motherPhone ? (
                        <a href={telHref(profile.motherPhone)} className="nfc-p-parent-card-phone-btn">
                          <PhoneGlyph className="nfc-p-parent-card-phone-glyph" />
                          <span className="nfc-p-parent-card-phone-line">
                            <span className="nfc-p-parent-card-phone-text">{profile.motherPhone}</span>
                            <span className="nfc-p-parent-card-phone-hint">Tap to call</span>
                          </span>
                        </a>
                      ) : (
                        <span className="nfc-p-parent-card-phone-missing">No phone number</span>
                      )}
                    </div>
                  </article>
                )}
              </div>
            </div>
          ) : null}

          {addressLines.length > 0 && !hasSchoolFlip ? (
            <div className="nfc-p-student-address-box">
              <h2 className="nfc-p-student-address-title">Student address</h2>
              <p className="nfc-p-student-address-text">{addressLines.join("\n")}</p>
            </div>
          ) : null}

          {hasSchoolFlip ? (
            <button
              type="button"
              className="nfc-p-profile-flip-cta"
              onClick={(e) => {
                e.currentTarget.blur();
                setProfileCardFlipped(true);
              }}
            >
              <span className="nfc-p-profile-flip-cta-text">
                <span className="nfc-p-profile-flip-cta-title">School details</span>
                <span className="nfc-p-profile-flip-cta-sub">Tap to flip the card</span>
              </span>
            </button>
          ) : null}
      </>
    );
  }

  return (
    <div className="nfc-p-root" style={style}>
      <div className="nfc-p-view">
        {hasSchoolFlip ? (
          <div ref={flipSceneRef} className="nfc-p-profile-flip-scene">
            <div
              className={`nfc-p-profile-flip-inner ${profileCardFlipped ? "nfc-p-profile-flip-inner--flipped" : ""}`}
            >
              <div className="nfc-p-profile-flip-face nfc-p-profile-flip-face--front">
                <div className="nfc-p-card nfc-p-card--student" style={cardStyle}>
                  {renderStudentProfileFrontBody()}
                </div>
              </div>
              <div ref={flipBackFaceRef} className="nfc-p-profile-flip-face nfc-p-profile-flip-face--back">
                <div className="nfc-p-card nfc-p-card--student nfc-p-card--school-back" style={cardStyle}>
                  {addressLines.length > 0 ? (
                    <div className="nfc-p-student-address-box nfc-p-student-address-box--back">
                      <div className="nfc-p-student-address-back-head">
                        <span className="nfc-p-student-address-back-icon" aria-hidden>
                          <SchoolDetailGlyph kind="home" className="nfc-p-school-detail-icon" />
                        </span>
                        <h2 className="nfc-p-student-address-title">Student address</h2>
                      </div>
                      <p className="nfc-p-student-address-text nfc-p-student-address-text--back">{addressLines.join("\n")}</p>
                    </div>
                  ) : null}
                  <header className="nfc-p-school-back-intro">
                    <p className="nfc-p-school-back-eyebrow">School</p>
                    <h2 className="nfc-p-school-back-heading">Details</h2>
                    <p className="nfc-p-school-back-sub">Contact and location for this institution.</p>
                  </header>
                  <div className="nfc-p-school-panel">
                    <dl className="nfc-p-school-detail-dl">
                      {schoolObj.name ? (
                        <div className="nfc-p-school-detail-item">
                          <span className="nfc-p-school-detail-icon-wrap">
                            <SchoolDetailGlyph kind="school" className="nfc-p-school-detail-icon" />
                          </span>
                          <div className="nfc-p-school-detail-copy">
                            <dt>Name</dt>
                            <dd>{schoolObj.name}</dd>
                          </div>
                        </div>
                      ) : null}
                      {schoolObj.principalName ? (
                        <div className="nfc-p-school-detail-item">
                          <span className="nfc-p-school-detail-icon-wrap">
                            <SchoolDetailGlyph kind="user" className="nfc-p-school-detail-icon" />
                          </span>
                          <div className="nfc-p-school-detail-copy">
                            <dt>Principal</dt>
                            <dd>{schoolObj.principalName}</dd>
                          </div>
                        </div>
                      ) : null}
                      {schoolObj.phone ? (
                        <div className="nfc-p-school-detail-item">
                          <span className="nfc-p-school-detail-icon-wrap">
                            <SchoolDetailGlyph kind="phone" className="nfc-p-school-detail-icon" />
                          </span>
                          <div className="nfc-p-school-detail-copy">
                            <dt>Phone</dt>
                            <dd>
                              <a href={telHref(schoolObj.phone)} className="nfc-p-school-detail-link">
                                {schoolObj.phone}
                              </a>
                            </dd>
                          </div>
                        </div>
                      ) : null}
                      {schoolObj.email ? (
                        <div className="nfc-p-school-detail-item">
                          <span className="nfc-p-school-detail-icon-wrap">
                            <SchoolDetailGlyph kind="mail" className="nfc-p-school-detail-icon" />
                          </span>
                          <div className="nfc-p-school-detail-copy">
                            <dt>Email</dt>
                            <dd>
                              <a href={`mailto:${schoolObj.email}`} className="nfc-p-school-detail-link">
                                {schoolObj.email}
                              </a>
                            </dd>
                          </div>
                        </div>
                      ) : null}
                      {schoolObj.address ? (
                        <div className="nfc-p-school-detail-item nfc-p-school-detail-item--stack">
                          <span className="nfc-p-school-detail-icon-wrap">
                            <SchoolDetailGlyph kind="map" className="nfc-p-school-detail-icon" />
                          </span>
                          <div className="nfc-p-school-detail-copy">
                            <dt>Address</dt>
                            <dd className="nfc-p-school-detail-dd--multiline">{schoolObj.address}</dd>
                          </div>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                  <button
                    type="button"
                    className="nfc-p-profile-flip-back-cta"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setProfileCardFlipped(false);
                    }}
                    aria-label="Flip to main profile"
                  >
                    <span className="nfc-p-profile-flip-back-cta-title">Flip to main profile</span>
                    <span className="nfc-p-profile-flip-back-cta-sub">Tap to return</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="nfc-p-card nfc-p-card--student" style={cardStyle}>
            {renderStudentProfileFrontBody()}
          </div>
        )}

        {profile.photo && photoLightboxOpen ? (
          <div
            className="nfc-p-photo-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged photo"
            onClick={closePhotoLightbox}
          >
            <button
              type="button"
              className="nfc-p-photo-lightbox-close"
              onClick={(e) => {
                e.stopPropagation();
                closePhotoLightbox();
              }}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <img
              src={profile.photo}
              alt={profile.name ? `${profile.name} photo` : ""}
              className="nfc-p-photo-lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ArtistProfileCard({ profile }) {
  const links = [];
  const add = (id, title, url) => {
    if (url) links.push({ id, title, url });
  };
  add("website", "Website", profile.website);
  if (profile.instagram) {
    const v = profile.instagram;
    add("instagram", "Instagram", v.startsWith("http") ? v : `https://instagram.com/${String(v).replace("@", "")}`);
  }
  if (profile.facebook) {
    const v = profile.facebook;
    add("facebook", "Facebook", v.startsWith("http") ? v : `https://facebook.com/${v}`);
  }
  if (profile.twitter) {
    const v = profile.twitter;
    add("twitter", "X", v.startsWith("http") ? v : `https://x.com/${String(v).replace("@", "")}`);
  }

  const hasContact = profile.email || profile.phone;

  const style = {
    "--nfc-p-bg": THEME.bg,
    "--nfc-p-text": THEME.text,
    "--nfc-p-glass-bg": THEME.glassBg,
    "--nfc-p-glass-border": THEME.glassBorder
  };

  return (
    <div className="nfc-p-root" style={style}>
      <div className="nfc-p-view">
        <div className="nfc-p-card" style={{ background: THEME.bg, color: THEME.text }}>
          <div className="nfc-p-cover">
            {profile.photo ? (
              <img src={profile.photo} alt="" className="nfc-p-cover-img" />
            ) : (
              <div className="nfc-p-cover-fallback nfc-p-cover-fallback--artist" aria-hidden />
            )}
          </div>

          <div className="nfc-p-avatar-row">
            <div className="nfc-p-avatar" style={{ border: `3px solid ${THEME.linkBg}` }}>
              {profile.photo ? (
                <img src={profile.photo} alt={profile.name || "Artist"} />
              ) : (
                <div className="nfc-p-avatar-fallback">{profile.name?.charAt(0) || "A"}</div>
              )}
            </div>
            <div className="nfc-p-avatar-text">
              {profile.name && <h1 className="nfc-p-name">{profile.name}</h1>}
              {profile.specialization ? <p className="nfc-p-subtitle">{profile.specialization}</p> : null}
            </div>
          </div>

          {profile.bio ? (
            <div className="nfc-p-section">
              <h2 className="nfc-p-section-title">About</h2>
              <p className="nfc-p-bio">{profile.bio}</p>
            </div>
          ) : null}

          {hasContact ? (
            <div className="nfc-p-section">
              <h2 className="nfc-p-section-title">Get in touch</h2>
              <div className="nfc-p-contact-stack">
                {profile.email ? (
                  <div className="nfc-p-contact-item">
                    <span className="nfc-p-label">Email</span>
                    <a href={`mailto:${profile.email}`} className="nfc-p-value">
                      {profile.email}
                    </a>
                  </div>
                ) : null}
                {profile.phone ? (
                  <div className="nfc-p-contact-item">
                    <span className="nfc-p-label">Phone</span>
                    <a href={telHref(profile.phone)} className="nfc-p-value">
                      {profile.phone}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {links.length > 0 ? (
            <div className="nfc-p-section">
              <h2 className="nfc-p-section-title">Links</h2>
              <div className="nfc-p-links">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nfc-p-link-icon"
                    title={link.title}
                    style={{
                      borderColor: THEME.text,
                      color: THEME.text,
                      background: THEME.linkBg
                    }}
                  >
                    <LinkIcon id={link.id} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TokenProfileView({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("This profile link is invalid.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicProfileByToken(token)
      .then((res) => {
        if (cancelled) return;
        const p = res?.data ?? res;
        if (!p || !p.type) {
          setError("Profile data is missing.");
          return;
        }
        setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (profile?.name) {
      const kind = profile.type === "student" ? "Student" : "Artist";
      document.title = `${profile.name} | ${kind}`;
    } else {
      document.title = "Profile";
    }
    return () => {
      document.title = "NFC Admin Panel";
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="nfc-p-loading">
        <div className="nfc-p-spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="nfc-p-error">
        <h1>Profile unavailable</h1>
        <p>{error || "This link may be invalid or expired."}</p>
      </div>
    );
  }

  return profile.type === "student" ? (
    <StudentProfileCard profile={profile} />
  ) : (
    <ArtistProfileCard profile={profile} />
  );
}
