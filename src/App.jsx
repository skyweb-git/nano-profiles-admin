import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi, themeOptions } from "./api";
import PhoneINInput from "./components/PhoneINInput";
import TokenProfileView from "./TokenProfileView";
import NfcPaymentPanel from "./components/NfcPaymentPanel";

const initialEdit = {
  _id: "",
  name: "",
  username: "",
  ownerEmail: "",
  title: "",
  bio: "",
  theme: "mint",
  profileType: "general",
  companyName: "",
  companyWebsite: "",
  foundingYear: "",
  fundingStage: "",
  teamSize: "",
  pitchDeckPdf: "",
  ctaLabel: "Book a Call",
  ctaUrl: ""
};

const initialArtistEdit = {
  _id: "",
  artistId: "",
  name: "",
  bio: "",
  specialization: "",
  isActive: true,
  isSetup: true
};

const initialCreateProfile = {
  username: "",
  ownerEmail: "",
  name: "",
  title: "",
  bio: "",
  theme: "mint",
  profileType: "general",
  companyName: "",
  companyWebsite: "",
  foundingYear: "",
  fundingStage: "",
  teamSize: "",
  pitchDeckPdf: "",
  ctaLabel: "Book a Call",
  ctaUrl: ""
};

const initialCreateArtist = {
  username: "",
  email: "",
  name: "",
  bio: "",
  specialization: "",
  isActive: true
};


const initialSchoolForm = {
  name: "",
  address: "",
  phone: "",
  email: "",
  principalName: ""
};

const initialStudentForm = {
  school: "",
  schoolCode: "",
  schoolClass: "",
  name: "",
  nickname: "",
  rollNumber: "",
  class: "",
  age: "",
  bloodGroup: "",
  photo: "",
  motherName: "",
  fatherName: "",
  motherPhone: "",
  fatherPhone: "",
  address: "",
  city: "",
  state: "",
  pincode: ""
};

function App() {
  if (typeof window !== "undefined") {
    const m = window.location.pathname.match(/^\/p\/([^/]+)\/?$/);
    if (m) {
      return <TokenProfileView token={decodeURIComponent(m[1])} />;
    }
    const payMatch = window.location.pathname.match(/^\/pay\/([^/]+)\/?$/);
    if (payMatch) {
      return <NfcPaymentPanel tagCode={decodeURIComponent(payMatch[1])} />;
    }
  }

  const [email, setEmail] = useState("skywebdevelopers123@gmail.com");
  const [otp, setOtp] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(Boolean(adminApi.getToken()));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  /** general | restaurant | artist | schools — drives which admin panel is visible */
  const [activeSection, setActiveSection] = useState("schools");
  const [typeFilter, setTypeFilter] = useState("all");
  const [profiles, setProfiles] = useState([]);
  const [artists, setArtists] = useState([]);
  const [profileStats, setProfileStats] = useState({ totalProfiles: 0, recentProfiles: [] });
  const [globalStats, setGlobalStats] = useState(null);
  const [editing, setEditing] = useState(initialEdit);
  const [editingArtist, setEditingArtist] = useState(initialArtistEdit);
  const [creatingProfile, setCreatingProfile] = useState(initialCreateProfile);
  const [creatingArtist, setCreatingArtist] = useState(initialCreateArtist);
  const [schools, setSchools] = useState([]);
  const [schoolForm, setSchoolForm] = useState(initialSchoolForm);
  const schoolCreateFormRef = useRef(null);
  const [viewSchoolId, setViewSchoolId] = useState(null);
  const [viewSchool, setViewSchool] = useState(null);
  const [schoolStudents, setSchoolStudents] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [newClassName, setNewClassName] = useState("");
  /** When set, user is inside a class — show students + add form for this class only */
  const [viewClassId, setViewClassId] = useState(null);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [studentSearch, setStudentSearch] = useState("");
  const studentCreateFormRef = useRef(null);
  const bulkStudentsFileRef = useRef(null);
  const studentPhotoInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  /** Profile URL returned by API after creating a student (for NFC / sharing) */
  const [lastCreatedStudentUrl, setLastCreatedStudentUrl] = useState("");
  const [lastCreatedProfileUrl, setLastCreatedProfileUrl] = useState("");
  const [profileUrlCopied, setProfileUrlCopied] = useState(false);
  const [tableCopiedStudentId, setTableCopiedStudentId] = useState("");
  const [availabilityConflicts, setAvailabilityConflicts] = useState({ username: null, email: null });
  const [availabilitySuggestions, setAvailabilitySuggestions] = useState([]);


  const lastChecked = useRef({ username: "", email: "" });
  const lastSuggestionsUsername = useRef("");

  useEffect(() => {
    let cancelled = false;
    const token = adminApi.getToken();
    if (!token) {
      setAuthed(false);
      setCheckingSession(false);
      return;
    }
    setCheckingSession(true);
    adminApi.checkSession()
      .then(() => {
        if (!cancelled) setAuthed(true);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err?.status === 401 || !adminApi.getToken()) {
            setAuthed(false);
          } else {
            setMessage(err.message || "Failed to verify session. Please check connection.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time availability check for creating profiles
  useEffect(() => {
    if (!authed) return;
    const u = (activeSection === "artist" ? creatingArtist.username : creatingProfile.username) || "";
    const e = (activeSection === "artist" ? creatingArtist.email : creatingProfile.ownerEmail) || "";

    if (u === lastChecked.current.username && e === lastChecked.current.email) return;

    const timer = setTimeout(async () => {
      // Clear suggestions only if username changed
      if (u !== lastChecked.current.username) {
        setAvailabilitySuggestions([]);
      }
      
      lastChecked.current = { username: u, email: e };

      if (!u && !e) {
        setAvailabilityConflicts({ username: null, email: null });
        return;
      }

      try {
        const res = await adminApi.checkAvailability({ username: u, email: e });
        setAvailabilityConflicts(res.conflicts || { username: null, email: null });
        
        // Only update suggestions if the username has changed since last time we got suggestions
        if (res.suggestions && u !== lastSuggestionsUsername.current) {
          setAvailabilitySuggestions(res.suggestions);
          lastSuggestionsUsername.current = u;
        }

      } catch (err) {
        console.warn("Availability check failed", err);
      }
    }, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [
    creatingProfile.username, 
    creatingProfile.ownerEmail, 
    creatingArtist.username, 
    creatingArtist.email, 
    activeSection,
    authed
  ]);


  const counts = useMemo(() => {
    const total = profiles.length;
    const restaurant = profiles.filter((p) => p.profileType === "restaurant").length;
    const founder = profiles.filter((p) => p.profileType === "founder").length;
    const other = total - restaurant - founder;
    return { total, restaurant, founder, other };
  }, [profiles]);

  const displayedProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const pType = (p.profileType || "general").toLowerCase();
      if (activeSection === "restaurant") return pType === "restaurant";
      if (activeSection === "founder") return pType === "founder";
      if (activeSection === "general") return pType === "general";
      return true;
    });
  }, [profiles, activeSection]);

  const selectedClassName = useMemo(() => {
    if (!viewClassId) return "";
    const c = schoolClasses.find((x) => String(x._id) === String(viewClassId));
    return c?.name || "";
  }, [schoolClasses, viewClassId]);

  const filteredSchoolStudents = useMemo(() => {
    const list = schoolStudents;
    const q = studentSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const hay = `${s.name || ""} ${s.rollNumber || ""} ${s.studentId || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [schoolStudents, studentSearch]);

  async function loadDashboard() {
    const schoolsQuery =
      activeSection === "schools" && search.trim()
        ? { search: search.trim() }
        : {};
    const [profilesRes, artistsRes, profileStatsRes, globalStatsRes, schoolsRes] =
      await Promise.all([
      adminApi.getProfiles({ search }),
      adminApi.getArtists(search),
      adminApi.getProfileStats(),
      adminApi.getGlobalStats(),
      adminApi.getSchools(schoolsQuery)
    ]);
    setProfiles(profilesRes.data || []);
    setArtists(artistsRes.data || []);
    setProfileStats(profileStatsRes.data || { totalProfiles: 0, recentProfiles: [] });
    setGlobalStats(globalStatsRes.data || null);
    setSchools(schoolsRes.data || []);
  }

  function goToSection(section) {
    setActiveSection(section);
    if (section !== "schools") {
      setViewSchoolId(null);
      setViewSchool(null);
      setSchoolStudents([]);
      setSchoolClasses([]);
      setNewClassName("");
      setViewClassId(null);
      setStudentForm(initialStudentForm);
      setStudentSearch("");
      setLastCreatedStudentUrl("");
      setProfileUrlCopied(false);
      setTableCopiedStudentId("");
    }
    if (section === "schools" && !viewSchoolId) {
      setStudentForm(initialStudentForm);
      setStudentSearch("");
      setLastCreatedStudentUrl("");
      setLastCreatedProfileUrl("");
      setProfileUrlCopied(false);
      setTableCopiedStudentId("");
    }
    if (section === "general") setTypeFilter("general");
    else if (section === "restaurant") setTypeFilter("restaurant");
    else if (section === "founder") setTypeFilter("founder");
    else setTypeFilter("all");
    
    setLastCreatedProfileUrl("");
    setSearch("");
    setCreatingProfile({
      ...initialCreateProfile,
      profileType: section === "restaurant" ? "restaurant" : section === "founder" ? "founder" : "general"
    });
    setCreatingArtist(initialCreateArtist);
  }

  async function loadSchoolStudents(schoolId, classId) {
    if (!schoolId) return;
    setLoading(true);
    setMessage("");
    try {
      const res = classId
        ? await adminApi.getSchoolStudents(schoolId, { schoolClass: classId })
        : await adminApi.getSchoolStudents(schoolId);
      const inner = res.data || {};
      setSchoolStudents(inner.students || []);
      if (inner.school) setViewSchool(inner.school);
    } catch (err) {
      setMessage(err.message || "Failed to load students");
      setSchoolStudents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSchoolClasses(schoolId) {
    if (!schoolId) return;
    try {
      const res = await adminApi.getSchoolClasses(schoolId);
      setSchoolClasses(res.data || []);
    } catch {
      setSchoolClasses([]);
    }
  }

  function openSchoolDetail(school) {
    if (!school?._id) return;
    setViewSchool(school);
    setViewSchoolId(school._id);
    setStudentSearch("");
    setNewClassName("");
    setViewClassId(null);
    setStudentForm({
      ...initialStudentForm,
      school: school._id,
      schoolCode: school.code || ""
    });
    setLastCreatedStudentUrl("");
    setProfileUrlCopied(false);
    setTableCopiedStudentId("");
  }

  function closeSchoolDetail() {
    setViewSchoolId(null);
    setViewSchool(null);
    setSchoolStudents([]);
    setSchoolClasses([]);
    setNewClassName("");
    setViewClassId(null);
    setStudentForm(initialStudentForm);
    setStudentSearch("");
    setLastCreatedStudentUrl("");
    setProfileUrlCopied(false);
    setTableCopiedStudentId("");
  }

  function leaveClass() {
    setViewClassId(null);
    setSchoolStudents([]);
    setStudentSearch("");
    setLastCreatedStudentUrl("");
    setProfileUrlCopied(false);
    setTableCopiedStudentId("");
    setStudentForm((p) => ({
      ...initialStudentForm,
      school: p.school,
      schoolCode: p.schoolCode
    }));
  }

  function enterClass(classDoc) {
    if (!classDoc?._id || !viewSchoolId) return;
    setViewClassId(classDoc._id);
    setStudentSearch("");
    setLastCreatedStudentUrl("");
    setProfileUrlCopied(false);
    setTableCopiedStudentId("");
    setStudentForm({
      ...initialStudentForm,
      school: viewSchoolId,
      schoolCode: viewSchool?.code || "",
      schoolClass: classDoc._id,
      class: classDoc.name || ""
    });
  }

  function scrollToAddStudent() {
    const el = studentCreateFormRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const first = el.querySelector("select, input, textarea, button");
      if (first && typeof first.focus === "function") first.focus();
    }, 300);
  }

  function profileBaseUrlFromEnv() {
    const u = import.meta.env.VITE_PUBLIC_PROFILE_URL || import.meta.env.VITE_FRONTEND_URL || (typeof window !== "undefined" ? window.location.origin : "");
    return String(u).replace(/\/$/, "");
  }

  function resolveStudentProfileUrl(apiRes) {
    if (apiRes?.nfcUrl) return String(apiRes.nfcUrl).trim();
    const token = apiRes?.data?.accessToken;
    const base = profileBaseUrlFromEnv();
    if (token && base) return `${base}/p/${token}`;
    return "";
  }

  async function copyLastStudentProfileUrl() {
    if (!lastCreatedStudentUrl) return;
    try {
      await navigator.clipboard.writeText(lastCreatedStudentUrl);
      setProfileUrlCopied(true);
      window.setTimeout(() => setProfileUrlCopied(false), 2000);
    } catch {
      setMessage("Could not copy automatically — select the link and copy it.");
    }
  }

  function rowStudentProfileUrl(student) {
    if (student?.profileUrl) return String(student.profileUrl).trim();
    const token = student?.accessToken;
    const base = profileBaseUrlFromEnv();
    if (token && base) return `${base}/p/${token}`;
    return "";
  }

  async function copyStudentRowUrl(student) {
    const url = rowStudentProfileUrl(student);
    if (!url) {
      setMessage("No profile link for this student — refresh the page or re-save the student.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setTableCopiedStudentId(String(student._id));
      window.setTimeout(() => setTableCopiedStudentId(""), 2000);
      setMessage("");
    } catch {
      setMessage("Could not copy — allow clipboard access or open the link and copy from the bar.");
    }
  }

  async function onDeleteStudent(student) {
    const studentId = student.studentId;
    if (!studentId) {
      setMessage("Cannot delete — this row has no student ID.");
      return;
    }
    const label = student.name?.trim() || studentId;
    if (!window.confirm(`Delete student "${label}" (${studentId})? This cannot be undone.`)) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await adminApi.deleteStudent(studentId);
      setMessage("Student deleted.");
      await loadSchoolStudents(viewSchoolId, viewClassId);
      await loadDashboard();
    } catch (err) {
      setMessage(err.message || "Could not delete student.");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateClass(e) {
    e.preventDefault();
    if (!viewSchoolId || !newClassName.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      await adminApi.createSchoolClass(viewSchoolId, { name: newClassName.trim() });
      setNewClassName("");
      setMessage("Class added.");
      await loadSchoolClasses(viewSchoolId);
    } catch (err) {
      setMessage(err.message || "Could not create class");
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteSchoolClass(classId) {
    if (!viewSchoolId || !classId) return;
    const wasViewingThisClass = String(viewClassId) === String(classId);
    setLoading(true);
    setMessage("");
    try {
      await adminApi.deleteSchoolClass(viewSchoolId, classId);
      setMessage("Class removed.");
      if (wasViewingThisClass) {
        leaveClass();
      }
      await loadSchoolClasses(viewSchoolId);
      if (!wasViewingThisClass && viewClassId) {
        await loadSchoolStudents(viewSchoolId, viewClassId);
      }
    } catch (err) {
      setMessage(err.message || "Could not delete class");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateStudent(e) {
    e.preventDefault();
    if (!studentForm.school || !studentForm.schoolCode) {
      setMessage("School is missing — go back and open the school again.");
      return;
    }
    if (!viewClassId) {
      setMessage("Open a class from the list first, then add students there.");
      return;
    }
    if (!studentForm.schoolClass) {
      setMessage("Class is missing — go back to classes and open this class again.");
      return;
    }
    setLoading(true);
    setMessage("");
    setLastCreatedStudentUrl("");
    setProfileUrlCopied(false);
    try {
      const payload = {
        school: studentForm.school,
        schoolCode: studentForm.schoolCode,
        name: studentForm.name.trim(),
        nickname: studentForm.nickname.trim() || undefined,
        rollNumber: studentForm.rollNumber.trim(),
        class: studentForm.class.trim(),
        age: studentForm.age ? Number(studentForm.age) : undefined,
        bloodGroup: studentForm.bloodGroup.trim() || undefined,
        photo: studentForm.photo.trim(),
        motherName: studentForm.motherName.trim(),
        fatherName: studentForm.fatherName.trim(),
        motherPhone: studentForm.motherPhone.trim(),
        fatherPhone: studentForm.fatherPhone.trim(),
        address: studentForm.address.trim(),
        city: studentForm.city.trim(),
        state: studentForm.state.trim(),
        pincode: studentForm.pincode.trim()
      };
      if (studentForm.schoolClass) {
        payload.schoolClass = studentForm.schoolClass;
      }
      const res = await adminApi.createStudent(payload);
      const profileUrl = resolveStudentProfileUrl(res);
      setLastCreatedStudentUrl(profileUrl);
      setStudentForm((prev) => ({
        ...initialStudentForm,
        school: prev.school,
        schoolCode: prev.schoolCode,
        schoolClass: prev.schoolClass,
        class: prev.class
      }));
      setMessage(
        profileUrl
          ? "Student added successfully. Use the profile link below for the NFC tag or sharing."
          : "Student added successfully. (Profile URL was not returned — check FRONTEND_URL on the server or set VITE_PUBLIC_PROFILE_URL in admin.)"
      );
      await loadSchoolStudents(viewSchoolId, viewClassId);
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onStudentPhotoFromDevice(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file (photo).");
      return;
    }
    setPhotoUploading(true);
    setMessage("");
    try {
      const res = await adminApi.uploadStudentPhoto(file);
      const url = res.url || "";
      if (!url) throw new Error("No image URL returned from server");
      setStudentForm((p) => ({ ...p, photo: url }));
      setMessage("Photo uploaded — save the student when ready.");
    } catch (err) {
      setMessage(err.message || "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function onBulkStudentsFileChange(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file || !viewSchoolId || !viewSchool?.code) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await adminApi.bulkUploadStudents(file, viewSchoolId, viewSchool.code);
      const d = res.data;
      const summary =
        d != null
          ? `Bulk: ${d.successful ?? 0} added, ${d.duplicates ?? 0} duplicates, ${d.failed ?? 0} failed (total rows ${d.total ?? "?"})`
          : res.message || "Upload finished";
      setMessage(summary);
      if (viewClassId) {
        await loadSchoolStudents(viewSchoolId, viewClassId);
      }
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  function onAddSchoolScroll() {
    const el = schoolCreateFormRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const first = el.querySelector("select, input, textarea, button");
      if (first && typeof first.focus === "function") first.focus();
    }, 300);
  }

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    loadDashboard()
      .catch((err) => {
        if (err?.status === 401 || !adminApi.getToken()) {
          adminApi.logout();
          setAuthed(false);
          setMessage("Session expired. Please login again.");
        } else {
          setMessage(err.message || "Failed to load dashboard");
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, search, typeFilter, activeSection]);

  useEffect(() => {
    if (!authed || !viewSchoolId) return;
    loadSchoolClasses(viewSchoolId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, viewSchoolId]);

  useEffect(() => {
    if (!authed || !viewSchoolId) return;
    if (viewClassId) {
      loadSchoolStudents(viewSchoolId, viewClassId);
    } else {
      setSchoolStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, viewSchoolId, viewClassId]);

  async function onSendOtp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await adminApi.sendOtp(email);
      setMessage(res.message || "OTP sent");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await adminApi.verifyOtp(email, otp);
      setAuthed(true);
      setOtp("");
      setMessage("Login successful");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveProfile(e) {
    e.preventDefault();
    if (!editing._id) return;
    setLoading(true);
    setMessage("");
    try {
      await adminApi.updateProfile(editing._id, {
        name: editing.name,
        username: editing.username,
        title: editing.title,
        bio: editing.bio,
        theme: editing.theme,
        profileType: editing.profileType,
        companyName: editing.companyName,
        companyWebsite: editing.companyWebsite,
        foundingYear: editing.foundingYear,
        fundingStage: editing.fundingStage,
        teamSize: editing.teamSize,
        pitchDeckPdf: editing.pitchDeckPdf,
        ctaLabel: editing.ctaLabel,
        ctaUrl: editing.ctaUrl
      });
      setMessage("Profile updated successfully");
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateProfile(e) {
    e.preventDefault();
    if (!creatingProfile.username || !creatingProfile.ownerEmail) {
      setMessage("Username and Owner Email are mandatory.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await adminApi.createProfile(creatingProfile);
      setMessage("Profile created successfully");
      
      const username = res.data?.username;
      if (username) {
        const base = profileBaseUrlFromEnv();
        const type = res.data?.profileType === "restaurant" ? "restaurant" : res.data?.profileType === "founder" ? "founder" : "link";
        setLastCreatedProfileUrl(`${base}/${type}/${username}`);
      }

      setCreatingProfile({
        ...initialCreateProfile,
        profileType: activeSection === "restaurant" ? "restaurant" : activeSection === "founder" ? "founder" : "general"
      });
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteProfile(profileId) {
    const ok = window.confirm("Delete this profile?");
    if (!ok) return;
    setLoading(true);
    setMessage("");
    try {
      await adminApi.deleteProfile(profileId);
      if (editing._id === profileId) setEditing(initialEdit);
      setMessage("Profile deleted");
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveArtist(e) {
    e.preventDefault();
    if (!editingArtist._id) return;
    setLoading(true);
    setMessage("");
    try {
      await adminApi.updateArtist(editingArtist._id, {
        artistId: editingArtist.artistId,
        name: editingArtist.name,
        bio: editingArtist.bio,
        specialization: editingArtist.specialization,
        isActive: editingArtist.isActive,
        isSetup: editingArtist.isSetup
      });
      setMessage("Artist updated successfully");
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateArtist(e) {
    e.preventDefault();
    if (!creatingArtist.username || !creatingArtist.email) {
      setMessage("Username and Email are mandatory.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await adminApi.createArtist({
        artistId: creatingArtist.username,
        email: creatingArtist.email,
        name: creatingArtist.name,
        bio: creatingArtist.bio,
        specialization: creatingArtist.specialization,
        isActive: creatingArtist.isActive
      });
      setMessage("Artist profile created successfully");

      const artistId = res.data?.artistId;
      if (artistId) {
        setLastCreatedProfileUrl(`${profileBaseUrlFromEnv()}/artist/${artistId}`);
      }

      setCreatingArtist(initialCreateArtist);
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteArtist(artistId) {
    const id =
      artistId != null && artistId !== ""
        ? String(artistId).trim()
        : "";
    if (!id) {
      setMessage("Missing artist id — refresh the page and try again.");
      return;
    }
    const ok = window.confirm(
      "Delete this artist profile permanently? The email can be used again for a new account."
    );
    if (!ok) return;
    setLoading(true);
    setMessage("");
    try {
      await adminApi.deleteArtist(id);
      if (String(editingArtist._id || "") === id) setEditingArtist(initialArtistEdit);
      setMessage("Artist deleted");
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateSchool(e) {
    e.preventDefault();
    if (!schoolForm.name.trim()) {
      setMessage("School name is required.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await adminApi.createSchool({
        name: schoolForm.name.trim(),
        address: schoolForm.address.trim(),
        phone: schoolForm.phone.trim(),
        email: schoolForm.email.trim(),
        principalName: schoolForm.principalName.trim()
      });
      setSchoolForm(initialSchoolForm);
      setMessage("School created successfully");
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteSchool(school) {
    const id = school?._id != null ? String(school._id) : "";
    if (!id) {
      setMessage("Missing school id — refresh the page and try again.");
      return;
    }
    const label = school?.name?.trim() || "this school";
    const ok1 = window.confirm(
      `Delete "${label}"?\n\nThis will permanently remove the school, all classes, all students, NFC profile links, and related data. There is no undo.`
    );
    if (!ok1) return;
    const ok2 = window.confirm(`Are you sure you want to delete "${label}"? All information will be gone.`);
    if (!ok2) return;

    setLoading(true);
    setMessage("");
    try {
      await adminApi.deleteSchool(id);
      if (String(viewSchoolId || "") === id) closeSchoolDetail();
      setMessage("School deleted");
      await loadDashboard();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    adminApi.logout();
    setAuthed(false);
    setProfiles([]);
    setArtists([]);
    setEditing(initialEdit);
    setEditingArtist(initialArtistEdit);
    setSchoolForm(initialSchoolForm);
    setSchools([]);
    setViewSchoolId(null);
    setViewSchool(null);
    setSchoolStudents([]);
    setStudentForm(initialStudentForm);
    setStudentSearch("");
    setLastCreatedStudentUrl("");
    setProfileUrlCopied(false);
    setTableCopiedStudentId("");
    setMessage("Logged out");
  }

  if (checkingSession) {
    return (
      <div className="wrap" style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <h2>Restoring admin session...</h2>
        <p style={{ opacity: 0.75, marginTop: "0.5rem" }}>Verifying your active login credentials, please wait.</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="wrap">
        <h1>NFC Admin Login</h1>
        <p>Use OTP login with admin email to access profile management.</p>
        <form className="card" onSubmit={onSendOtp}>
          <label>
            Admin Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin email"
              required
            />
          </label>
          <button disabled={loading} type="submit">
            Send OTP
          </button>
        </form>
        <form className="card" onSubmit={onVerifyOtp}>
          <label>
            OTP
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6 digit code"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button disabled={loading} type="submit">
            Verify & Login
          </button>
        </form>
        {message ? <p className="msg">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="headerRow">
        <h1>Admin Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="statsGrid">
        <div className="stat">
          <small>Total Profiles</small>
          <strong>{counts.total}</strong>
        </div>
        <div className="stat">
          <small>Founder Profiles</small>
          <strong>{counts.founder}</strong>
        </div>
        <div className="stat">
          <small>Restaurant Profiles</small>
          <strong>{counts.restaurant}</strong>
        </div>
        <div className="stat">
          <small>General Profiles</small>
          <strong>{counts.other}</strong>
        </div>
        <div className="stat">
          <small>Total Artists</small>
          <strong>{artists.length}</strong>
        </div>
        <div className="stat">
          <small>All Profiles (DB)</small>
          <strong>{profileStats.totalProfiles || 0}</strong>
        </div>
      </div>

      {globalStats ? (
        <div className="statsGrid">
          <div className="stat">
            <small>Total Schools</small>
            <strong>{globalStats.totalSchools}</strong>
          </div>
          <div className="stat">
            <small>Total Students</small>
            <strong>{globalStats.totalStudents}</strong>
          </div>
          <div className="stat">
            <small>Active Students</small>
            <strong>{globalStats.activeStudents}</strong>
          </div>
          <div className="stat">
            <small>Total Scans</small>
            <strong>{globalStats.totalScans}</strong>
          </div>
        </div>
      ) : null}

      <div className="adminTabs" role="tablist" aria-label="Admin sections">
        {[
          { id: "schools", label: "Schools" },
          { id: "artist", label: "Artist" },
          { id: "general", label: "General" },
          { id: "restaurant", label: "Restaurant" },
          { id: "founder", label: "Founder" }
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            className={`adminTab ${activeSection === id ? "adminTabActive" : ""}`}
            onClick={() => goToSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {!(activeSection === "schools" && viewSchoolId) ? (
      <div className="filters card">
        {activeSection === "schools" ? (
          <div className="filtersRowWithActions">
            <label className="filtersSearchGrow">
              Search schools
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="school name"
              />
            </label>
            <div className="filtersPanelActions">
              <button type="button" className="btnSecondary" onClick={onAddSchoolScroll}>
                Add school
              </button>
            </div>
          </div>
        ) : (
          <label>
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="name, username, title, owner email"
            />
          </label>
        )}
      </div>
      ) : null}

      {activeSection === "general" || activeSection === "restaurant" || activeSection === "founder" ? (
      <div className="grid2">
        <div className="card tableCard">
          <h2>
            {activeSection === "restaurant"
              ? "Restaurant profiles"
              : activeSection === "founder"
              ? "Founder profiles"
              : "General profiles"}
          </h2>
          {loading ? <p>Loading...</p> : null}
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Type</th>
                <th>Theme</th>
                {activeSection === "founder" ? <th>Company</th> : null}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedProfiles.map((profile) => (
                <tr key={profile._id}>
                  <td>{profile.name || "-"}</td>
                  <td>{profile.username}</td>
                  <td>{profile.ownerEmail || "-"}</td>
                  <td>{profile.profileType || "general"}</td>
                  <td>{profile.theme || "mint"}</td>
                  {activeSection === "founder" ? <td>{profile.companyName || "-"}</td> : null}
                  <td className="actions">
                    <button onClick={() => setEditing({ ...initialEdit, ...profile })}>Edit</button>
                    <button className="danger" onClick={() => onDeleteProfile(profile._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {displayedProfiles.length === 0 && !loading ? (
                <tr>
                  <td colSpan={activeSection === "founder" ? 7 : 6}>
                    No {activeSection === "founder" ? "founder" : activeSection === "restaurant" ? "restaurant" : "general"} profiles found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        
        <div className="adminFormsColumn">
          <form className="card" onSubmit={onCreateProfile}>
            <h2>
              Create{" "}
              {activeSection === "restaurant"
                ? "Restaurant"
                : activeSection === "founder"
                ? "Founder"
                : "General"}{" "}
              Profile
            </h2>
            <label>
              Username (mandatory)
              <input
                value={creatingProfile.username || ""}
                onChange={(e) => setCreatingProfile((p) => ({ ...p, username: e.target.value }))}
                placeholder="unique_username"
                required
              />
              {availabilityConflicts.username && (
                <>
                  <p className="fieldErrorMsg">{availabilityConflicts.username}</p>
                  {availabilitySuggestions.length > 0 && (
                    <div className="suggestionsBox">
                      <span>Try:</span>
                      {availabilitySuggestions.map(s => (
                        <button 
                          key={s} 
                          type="button" 
                          className="suggestionBtn"
                          onClick={() => setCreatingProfile(p => ({ ...p, username: s }))}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

            </label>
            <label>
              Owner Email (mandatory)
              <input
                type="email"
                value={creatingProfile.ownerEmail || ""}
                onChange={(e) => setCreatingProfile((p) => ({ ...p, ownerEmail: e.target.value }))}
                placeholder="user@example.com"
                required
              />
              {availabilityConflicts.email && <p className="fieldErrorMsg">{availabilityConflicts.email}</p>}
            </label>

            <label>
              Full Name
              <input
                value={creatingProfile.name || ""}
                onChange={(e) => setCreatingProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label>
              Title
              <input
                value={creatingProfile.title || ""}
                onChange={(e) => setCreatingProfile((p) => ({ ...p, title: e.target.value }))}
                placeholder={activeSection === "founder" ? "e.g. Founder & CEO" : "e.g. Software Engineer"}
              />
            </label>
            <label>
              Bio
              <textarea
                value={creatingProfile.bio || ""}
                onChange={(e) => setCreatingProfile((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
              />
            </label>

            {activeSection === "founder" ? (
              <>
                <label>
                  Company Name
                  <input
                    value={creatingProfile.companyName || ""}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="e.g. Acme AI"
                  />
                </label>
                <label>
                  Company Website
                  <input
                    type="url"
                    value={creatingProfile.companyWebsite || ""}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, companyWebsite: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </label>
                <label>
                  Founding Year
                  <input
                    value={creatingProfile.foundingYear || ""}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, foundingYear: e.target.value }))}
                    placeholder="e.g. 2024"
                  />
                </label>
                <label>
                  Funding Stage
                  <select
                    value={creatingProfile.fundingStage || "Bootstrapped"}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, fundingStage: e.target.value }))}
                  >
                    <option value="Bootstrapped">Bootstrapped</option>
                    <option value="Pre-seed">Pre-seed</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series B+">Series B+</option>
                  </select>
                </label>
                <label>
                  Team Size
                  <input
                    value={creatingProfile.teamSize || ""}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, teamSize: e.target.value }))}
                    placeholder="e.g. 1-10, 15+ employees"
                  />
                </label>
                <label>
                  Pitch Deck PDF URL
                  <input
                    type="url"
                    value={creatingProfile.pitchDeckPdf || ""}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, pitchDeckPdf: e.target.value }))}
                    placeholder="https://.../deck.pdf"
                  />
                </label>
                <label>
                  Call to Action (CTA) Button Label
                  <input
                    value={creatingProfile.ctaLabel || ""}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, ctaLabel: e.target.value }))}
                    placeholder="Book a Call, Schedule Demo"
                  />
                </label>
                <label>
                  CTA Link / URL
                  <input
                    type="url"
                    value={creatingProfile.ctaUrl || ""}
                    onChange={(e) => setCreatingProfile((p) => ({ ...p, ctaUrl: e.target.value }))}
                    placeholder="https://calendly.com/your-meeting"
                  />
                </label>
              </>
            ) : null}

            <button disabled={loading || !!(availabilityConflicts.username || availabilityConflicts.email)} type="submit" className="btnPrimary">
              Create Profile
            </button>
            {lastCreatedProfileUrl && (activeSection === "general" || activeSection === "restaurant" || activeSection === "founder") ? (
              <div className="studentProfileUrlBox" style={{ marginTop: 20 }}>
                <span className="studentProfileUrlLabel">Profile URL</span>
                <div className="studentProfileUrlRow">
                  <input readOnly className="studentProfileUrlInput" value={lastCreatedProfileUrl} />
                  <a
                    className="studentProfileUrlOpen"
                    href={lastCreatedProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </a>
                </div>
              </div>
            ) : null}
          </form>

          <form className="card" onSubmit={onSaveProfile}>
            <h2>Edit Profile</h2>
            <p>Select a profile from the table to edit.</p>
            <label>
              Name
              <input
                value={editing.name || ""}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label>
              Username
              <input
                value={editing.username || ""}
                onChange={(e) => setEditing((p) => ({ ...p, username: e.target.value }))}
              />
            </label>
            <label>
              Title
              <input
                value={editing.title || ""}
                onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
              />
            </label>
            <label>
              Bio
              <textarea
                value={editing.bio || ""}
                onChange={(e) => setEditing((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
              />
            </label>
            <label>
              Profile Type
              <select
                value={editing.profileType || "general"}
                onChange={(e) => setEditing((p) => ({ ...p, profileType: e.target.value }))}
              >
                <option value="general">Other / General</option>
                <option value="restaurant">Restaurant</option>
                <option value="founder">Founder</option>
              </select>
            </label>
            {editing.profileType === "founder" ? (
              <>
                <label>
                  Company / Project Name
                  <input
                    value={editing.companyName || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="e.g. Acme AI"
                  />
                </label>
                <label>
                  Company Website
                  <input
                    type="url"
                    value={editing.companyWebsite || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, companyWebsite: e.target.value }))}
                    placeholder="https://acme.com"
                  />
                </label>
                <label>
                  Founding Year
                  <input
                    value={editing.foundingYear || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, foundingYear: e.target.value }))}
                    placeholder="e.g. 2024"
                  />
                </label>
                <label>
                  Funding Stage
                  <select
                    value={editing.fundingStage || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, fundingStage: e.target.value }))}
                  >
                    <option value="">Select funding stage</option>
                    <option value="Bootstrapped">Bootstrapped</option>
                    <option value="Pre-Seed">Pre-Seed</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series B+">Series B+</option>
                  </select>
                </label>
                <label>
                  Team Size
                  <input
                    value={editing.teamSize || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, teamSize: e.target.value }))}
                    placeholder="e.g. 1-10, 15+ employees"
                  />
                </label>
                <label>
                  Pitch Deck PDF URL
                  <input
                    type="url"
                    value={editing.pitchDeckPdf || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, pitchDeckPdf: e.target.value }))}
                    placeholder="https://.../deck.pdf"
                  />
                </label>
                <label>
                  Call to Action (CTA) Button Label
                  <input
                    value={editing.ctaLabel || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, ctaLabel: e.target.value }))}
                    placeholder="Book a Call, Schedule Demo"
                  />
                </label>
                <label>
                  CTA Link / URL
                  <input
                    type="url"
                    value={editing.ctaUrl || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, ctaUrl: e.target.value }))}
                    placeholder="https://calendly.com/your-meeting"
                  />
                </label>
              </>
            ) : null}
            <label>
              Theme
              <select
                value={editing.theme || "mint"}
                onChange={(e) => setEditing((p) => ({ ...p, theme: e.target.value }))}
              >
                {themeOptions.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={!editing._id || loading} type="submit">
              Save Changes
            </button>
            {message ? <p className="msg">{message}</p> : null}
          </form>
        </div>
      </div>
      ) : null}

      {activeSection === "artist" ? (
      <div className="grid2 artistGrid">
        <div className="card tableCard">
          <h2>Artist Profiles</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Links</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist) => (
                <tr key={artist._id}>
                  <td>{artist.name || "-"}</td>
                  <td>{artist.artistId || "-"}</td>
                  <td>{artist.email || "-"}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <a 
                        href={`${profileBaseUrlFromEnv()}/artist/${artist.artistId}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: '11px', color: '#6366f1', textDecoration: 'none', fontWeight: 700, background: 'rgba(99, 102, 241, 0.1)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block' }}
                      >
                        👤 Profile
                      </a>
                      <a 
                        href={`${profileBaseUrlFromEnv()}/a/${artist.artistId}/art`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-block' }}
                      >
                        🎨 Master Art
                      </a>
                    </div>
                  </td>
                  <td className="actions">
                    <button onClick={() => setEditingArtist({ ...initialArtistEdit, ...artist })}>
                      Edit
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={() => onDeleteArtist(artist._id ?? artist.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {artists.length === 0 ? (
                <tr>
                  <td colSpan={5}>No artists found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="adminFormsColumn">
          <form className="card" onSubmit={onCreateArtist}>
            <h2>Create Artist Profile</h2>
            <label>
              Username (mandatory)
              <input
                value={creatingArtist.username || ""}
                onChange={(e) => setCreatingArtist((p) => ({ ...p, username: e.target.value }))}
                placeholder="unique_username"
                required
              />
              {availabilityConflicts.username && (
                <>
                  <p className="fieldErrorMsg">{availabilityConflicts.username}</p>
                  {availabilitySuggestions.length > 0 && (
                    <div className="suggestionsBox">
                      <span>Try:</span>
                      {availabilitySuggestions.map(s => (
                        <button 
                          key={s} 
                          type="button" 
                          className="suggestionBtn"
                          onClick={() => setCreatingArtist(p => ({ ...p, username: s }))}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

            </label>
            <label>
              Email (mandatory)
              <input
                type="email"
                value={creatingArtist.email || ""}
                onChange={(e) => setCreatingArtist((p) => ({ ...p, email: e.target.value }))}
                placeholder="artist@example.com"
                required
              />
              {availabilityConflicts.email && <p className="fieldErrorMsg">{availabilityConflicts.email}</p>}
            </label>

            <label>
              Full Name
              <input
                value={creatingArtist.name || ""}
                onChange={(e) => setCreatingArtist((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label>
              Specialization
              <input
                value={creatingArtist.specialization || ""}
                onChange={(e) => setCreatingArtist((p) => ({ ...p, specialization: e.target.value }))}
              />
            </label>
            <label>
              Bio
              <textarea
                rows={3}
                value={creatingArtist.bio || ""}
                onChange={(e) => setCreatingArtist((p) => ({ ...p, bio: e.target.value }))}
              />
            </label>
            {/* Availability error block removed in favor of field-specific errors */}
            <button disabled={loading || !!(availabilityConflicts.username || availabilityConflicts.email)} type="submit" className="btnPrimary">

              Create Artist
            </button>
            {lastCreatedProfileUrl && activeSection === "artist" ? (
              <div className="studentProfileUrlBox" style={{ marginTop: 20 }}>
                <span className="studentProfileUrlLabel">Artist Profile URL</span>
                <div className="studentProfileUrlRow">
                  <input readOnly className="studentProfileUrlInput" value={lastCreatedProfileUrl} />
                  <a
                    className="studentProfileUrlOpen"
                    href={lastCreatedProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </a>
                </div>
              </div>
            ) : null}
          </form>

          <form className="card" onSubmit={onSaveArtist}>
            <h2>Edit Artist</h2>
            <p>Select an artist from table to edit.</p>
            <label>
              Username (URL slug)
              <input
                value={editingArtist.artistId || ""}
                onChange={(e) => setEditingArtist((p) => ({ ...p, artistId: e.target.value }))}
              />
            </label>
            <label>
              Name
              <input
                value={editingArtist.name || ""}
                onChange={(e) => setEditingArtist((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label>
              Specialization
              <input
                value={editingArtist.specialization || ""}
                onChange={(e) => setEditingArtist((p) => ({ ...p, specialization: e.target.value }))}
              />
            </label>
            <label>
              Bio
              <textarea
                rows={4}
                value={editingArtist.bio || ""}
                onChange={(e) => setEditingArtist((p) => ({ ...p, bio: e.target.value }))}
              />
            </label>
            <label>
              Active
              <select
                value={String(Boolean(editingArtist.isActive))}
                onChange={(e) =>
                  setEditingArtist((p) => ({ ...p, isActive: e.target.value === "true" }))
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label>
              Setup Complete (Skips onboarding)
              <select
                value={String(Boolean(editingArtist.isSetup))}
                onChange={(e) =>
                  setEditingArtist((p) => ({ ...p, isSetup: e.target.value === "true" }))
                }
              >
                <option value="true">Yes (Direct to Dashboard)</option>
                <option value="false">No (Show Onboarding)</option>
              </select>
            </label>
            <button disabled={!editingArtist._id || loading} type="submit">
              Save Artist
            </button>
            {message ? <p className="msg">{message}</p> : null}
          </form>
        </div>
      </div>
      ) : null}

      {activeSection === "schools" && viewSchoolId && viewSchool ? (
      <div className="schoolDetail">
        <div className="schoolDetailHeader card">
          {viewClassId ? (
            <button type="button" className="linkBack" onClick={leaveClass}>
              ← Classes
            </button>
          ) : (
            <button type="button" className="linkBack" onClick={closeSchoolDetail}>
              ← School profiles
            </button>
          )}
          <h2 className="schoolDetailTitle">
            {viewClassId ? (
              <>
                <span className="schoolDetailCrumb">{viewSchool.name || "School"}</span>
                <span className="schoolDetailSep" aria-hidden>
                  {" "}
                  /{" "}
                </span>
                <span>{selectedClassName || "Class"}</span>
              </>
            ) : (
              viewSchool.name || "School"
            )}
          </h2>
          <p className="schoolDetailMeta">
            Code <strong>{viewSchool.code || "—"}</strong> · School ID <strong>{viewSchool.schoolId || "—"}</strong>
            {viewSchool.principalName ? (
              <>
                {" "}
                · Principal <strong>{viewSchool.principalName}</strong>
              </>
            ) : null}
          </p>
        </div>

        {!viewClassId ? (
        <div className="card schoolClassesCard schoolClassesMain">
          <h2>Classes</h2>
          <p className="schoolPanelHint" style={{ marginTop: 0 }}>
            Add grades or sections (for example <strong>10th</strong>, <strong>Nursery</strong>). Open a class to manage
            students inside it.
          </p>
          <table className="schoolClassTable schoolClassPickTable">
            <thead>
              <tr>
                <th>Class name</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {schoolClasses.map((c) => (
                <tr key={c._id} className="schoolClassPickRow">
                  <td>
                    <button
                      type="button"
                      className="schoolClassOpenMain"
                      onClick={() => enterClass(c)}
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="actions schoolClassRowActions">
                    <button
                      type="button"
                      className="btnSecondary btnTableCompact"
                      disabled={loading}
                      onClick={() => enterClass(c)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="btnSecondary btnTableCompact"
                      disabled={loading}
                      onClick={() => onDeleteSchoolClass(c._id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {schoolClasses.length === 0 ? (
                <tr>
                  <td colSpan={2}>No classes yet — add one below.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <form className="schoolClassAddRow" onSubmit={onCreateClass}>
            <label className="schoolClassAddLabel">
              New class name
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. 10th, Nursery"
                maxLength={80}
              />
            </label>
            <button type="submit" className="btnPrimary schoolClassAddSubmit" disabled={loading || !newClassName.trim()}>
              Add class
            </button>
          </form>
        </div>
        ) : null}

        {viewClassId ? (
        <>
        <div className="filters card schoolDetailToolbar">
          <div className="filtersRowWithActions">
            <label className="filtersSearchGrow">
              Search students
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="name, roll no, student id"
              />
            </label>
            <div className="filtersPanelActions">
              <button type="button" className="btnSecondary" onClick={() => bulkStudentsFileRef.current?.click()}>
                Add bulk
              </button>
              <button type="button" className="btnSecondary" onClick={scrollToAddStudent}>
                + Add
              </button>
            </div>
            <input
              ref={bulkStudentsFileRef}
              type="file"
              className="srOnlyFile"
              accept=".csv,.txt,text/csv,text/plain"
              aria-hidden
              tabIndex={-1}
              onChange={onBulkStudentsFileChange}
            />
          </div>
          <p className="schoolPanelHint" style={{ marginTop: 10, marginBottom: 0 }}>
            Students below are only for <strong>{selectedClassName}</strong>. Use <strong>+ Add</strong> for one student,
            or <strong>Add bulk</strong> with a CSV/TXT (rows can include other classes; this list refreshes for this
            class).
          </p>
        </div>

        <div className="grid2">
          <div className="card tableCard">
            <h2>Students in {selectedClassName || "this class"}</h2>
            {loading ? <p>Loading...</p> : null}
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Roll No</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchoolStudents.map((student) => {
                  const profileUrl = rowStudentProfileUrl(student);
                  return (
                  <tr key={student._id}>
                    <td>{student.name || "-"}</td>
                    <td>{student.studentId || "-"}</td>
                    <td>{student.rollNumber || "-"}</td>
                    <td>{student.isActive ? "Active" : "Inactive"}</td>
                    <td className="actions studentProfileActions">
                      {profileUrl ? (
                        <>
                          <button
                            type="button"
                            className="btnSecondary btnTableCompact"
                            onClick={() => copyStudentRowUrl(student)}
                          >
                            {tableCopiedStudentId === String(student._id) ? "Copied!" : "Copy URL"}
                          </button>
                          <a
                            className="tableProfileOpen"
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                        </>
                      ) : (
                        <span className="noProfileUrl">—</span>
                      )}
                      <button
                        type="button"
                        className="btnTableCompact danger"
                        disabled={loading}
                        onClick={() => onDeleteStudent(student)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {filteredSchoolStudents.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5}>No students in this class yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <form ref={studentCreateFormRef} className="card" onSubmit={onCreateStudent}>
            <h2>Add student</h2>
            <p className="schoolPanelHint" style={{ marginTop: 0 }}>
              New students are added to <strong>{selectedClassName || "this class"}</strong>.
            </p>
            <label>
              School code
              <input value={studentForm.schoolCode} readOnly />
            </label>
            <div className="classReadOnlyField">
              <span className="classReadOnlyLabel">Class</span>
              <p className="classReadOnlyValue">{selectedClassName || "—"}</p>
            </div>
            <label>
              Student name
              <input
                value={studentForm.name}
                onChange={(e) => setStudentForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Nickname (optional)
              <input
                value={studentForm.nickname}
                onChange={(e) => setStudentForm((p) => ({ ...p, nickname: e.target.value }))}
                maxLength={100}
                placeholder="e.g. Chintu"
              />
            </label>
            <label>
              Roll number
              <input
                value={studentForm.rollNumber}
                onChange={(e) => setStudentForm((p) => ({ ...p, rollNumber: e.target.value }))}
                required
              />
            </label>
            <label>
              Age
              <input
                type="number"
                min="1"
                max="120"
                value={studentForm.age}
                onChange={(e) => setStudentForm((p) => ({ ...p, age: e.target.value }))}
              />
            </label>
            <label>
              Blood group (optional)
              <select
                value={studentForm.bloodGroup}
                onChange={(e) => setStudentForm((p) => ({ ...p, bloodGroup: e.target.value }))}
              >
                <option value="">— Select —</option>
                <option value="A+">A+</option>
                <option value="A-">A−</option>
                <option value="B+">B+</option>
                <option value="B-">B−</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB−</option>
                <option value="O+">O+</option>
                <option value="O-">O−</option>
              </select>
            </label>
            <div className="studentPhotoField">
              <span className="studentPhotoLabel">Student photo (optional)</span>
              <p className="studentPhotoHint">Choose a photo from this device — it uploads to the server and attaches to the student.</p>
              <input
                ref={studentPhotoInputRef}
                type="file"
                accept="image/*"
                className="studentPhotoFileInput"
                disabled={photoUploading || loading}
                onChange={onStudentPhotoFromDevice}
              />
              {photoUploading ? <p className="studentPhotoStatus">Uploading photo…</p> : null}
              {studentForm.photo ? (
                <div className="studentPhotoPreviewWrap">
                  <img src={studentForm.photo} alt="" className="studentPhotoPreview" />
                  <button
                    type="button"
                    className="btnSecondary studentPhotoRemove"
                    disabled={loading || photoUploading}
                    onClick={() => setStudentForm((p) => ({ ...p, photo: "" }))}
                  >
                    Remove photo
                  </button>
                </div>
              ) : null}
            </div>
            <label>
              Mother name
              <input
                value={studentForm.motherName}
                onChange={(e) => setStudentForm((p) => ({ ...p, motherName: e.target.value }))}
              />
            </label>
            <label>
              Father name
              <input
                value={studentForm.fatherName}
                onChange={(e) => setStudentForm((p) => ({ ...p, fatherName: e.target.value }))}
              />
            </label>
            <label>
              Mother phone
              <PhoneINInput
                value={studentForm.motherPhone}
                onChange={(v) => setStudentForm((p) => ({ ...p, motherPhone: v }))}
              />
            </label>
            <label>
              Father phone
              <PhoneINInput
                value={studentForm.fatherPhone}
                onChange={(v) => setStudentForm((p) => ({ ...p, fatherPhone: v }))}
              />
            </label>
            <label>
              Address
              <input
                value={studentForm.address}
                onChange={(e) => setStudentForm((p) => ({ ...p, address: e.target.value }))}
              />
            </label>
            <label>
              City
              <input
                value={studentForm.city}
                onChange={(e) => setStudentForm((p) => ({ ...p, city: e.target.value }))}
              />
            </label>
            <label>
              State
              <input
                value={studentForm.state}
                onChange={(e) => setStudentForm((p) => ({ ...p, state: e.target.value }))}
              />
            </label>
            <label>
              Pincode
              <input
                value={studentForm.pincode}
                onChange={(e) => setStudentForm((p) => ({ ...p, pincode: e.target.value }))}
              />
            </label>
            <button disabled={loading || !viewClassId} type="submit">
              Create student
            </button>
            {message ? <p className="msg">{message}</p> : null}
            {lastCreatedStudentUrl ? (
              <div className="studentProfileUrlBox">
                <span className="studentProfileUrlLabel">Student profile URL</span>
                <p className="studentProfileUrlHint">
                  Auto-generated when the student is saved. Program your NFC tag to open this link, or share it with parents.
                </p>
                <div className="studentProfileUrlRow">
                  <input readOnly className="studentProfileUrlInput" value={lastCreatedStudentUrl} />
                  <button
                    type="button"
                    className="btnSecondary"
                    onClick={copyLastStudentProfileUrl}
                  >
                    {profileUrlCopied ? "Copied!" : "Copy"}
                  </button>
                  <a
                    className="studentProfileUrlOpen"
                    href={lastCreatedStudentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </a>
                </div>
              </div>
            ) : null}
          </form>
        </div>
        </>
        ) : null}
      </div>
      ) : activeSection === "schools" ? (
      <div className="grid2">
        <div className="card tableCard">
          <h2>School profiles</h2>
          <p className="schoolPanelHint">
            Schools in your system. Codes are generated automatically. Click a school name to add
            classes and students. Use Add school to create a school.
          </p>
          {loading ? <p>Loading...</p> : null}
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>School ID</th>
                <th>Contact number</th>
                <th>Principal</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school._id}>
                  <td>
                    <button type="button" className="schoolNameLink" onClick={() => openSchoolDetail(school)}>
                      {school.name || "—"}
                    </button>
                  </td>
                  <td>{school.code || "-"}</td>
                  <td>{school.schoolId || "-"}</td>
                  <td>{school.phone || "-"}</td>
                  <td>{school.principalName || "-"}</td>
                  <td>{school.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button
                      type="button"
                      className="btnTableCompact danger"
                      disabled={loading}
                      onClick={() => onDeleteSchool(school)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7}>No schools found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <form ref={schoolCreateFormRef} className="card" onSubmit={onCreateSchool}>
          <h2>Add school</h2>
          <p>
            Create a new school profile. Name is required; code and ID are assigned by the server. Add the
            school&apos;s address and main contact number so staff and parents can reach the office.
          </p>
          <label>
            School name
            <input
              value={schoolForm.name}
              onChange={(e) => setSchoolForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Address
            <textarea
              rows={3}
              value={schoolForm.address}
              onChange={(e) => setSchoolForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Street, area, city, district…"
              autoComplete="street-address"
            />
          </label>
          <label>
            School contact number
            <PhoneINInput
              value={schoolForm.phone}
              onChange={(v) => setSchoolForm((p) => ({ ...p, phone: v }))}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={schoolForm.email}
              onChange={(e) => setSchoolForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>
          <label>
            Principal name
            <input
              value={schoolForm.principalName}
              onChange={(e) => setSchoolForm((p) => ({ ...p, principalName: e.target.value }))}
            />
          </label>
          <button disabled={loading} type="submit">
            Create school
          </button>
          {message ? <p className="msg">{message}</p> : null}
        </form>
      </div>
      ) : null}

      {activeSection === "general" || activeSection === "restaurant" || activeSection === "founder" ? (
      <div className="card">
        <h2>Recently Created (Top 5)</h2>
        <ul>
          {(profileStats.recentProfiles || []).map((item) => (
            <li key={item._id || item.username}>
              {item.username} - {item.name || "No name"}
            </li>
          ))}
        </ul>
      </div>
      ) : null}
    </div>
  );
}

export default App;
