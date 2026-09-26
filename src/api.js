const rawApiUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : 'https://api.nanoprofiles.com');
const API_URL = rawApiUrl.replace(/\/health\/?$/, '').replace(/\/+$/, '');
let adminToken = "";

export const themeOptions = [
  "mint",
  "mono",
  "gradient",
  "brown",
  "beige",
  "green",
  "grey",
  "wood",
  "purple",
  "midnight",
  "emerald",
  "sunset",
  "royal",
  "ocean",
  "aurora",
  "galaxy",
  "glass",
  "cyber"
];

const TOKEN_KEY = "nano_admin_token";

function getToken() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && stored !== "null" && stored !== "undefined") {
      return stored;
    }
    return adminToken;
  }
  return adminToken;
}

function setToken(token) {
  adminToken = token || "";
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      setToken("");
    }
    const err = new Error(data.message || `Request failed: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

export const adminApi = {
  getToken,
  checkHealth: () => fetch(`${API_URL}/health`).then(res => res.json()),
  checkSession: async () => {
    const data = await request("/api/admin/session");
    if (data?.token) {
      setToken(data.token);
    }
    return data;
  },
  logout: async () => {
    setToken("");
    try {
      await request("/api/admin/logout", { method: "POST" });
    } catch {
      // Local logout should still complete if the server is unreachable.
    }
  },
  sendOtp: (email) =>
    request("/api/admin/send-otp", {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  verifyOtp: async (email, otp) => {
    const data = await request("/api/admin/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp })
    });
    setToken(data.token || "");
    return data;
  },
  getProfiles: (query = {}) => {
    const searchParams = new URLSearchParams();
    if (query.search) searchParams.set("search", query.search);
    if (query.type && query.type !== "all") searchParams.set("type", query.type);
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request(`/api/admin/general-profiles${suffix}`);
  },
  getProfileStats: () => request("/api/admin/general-profiles/stats"),
  getGlobalStats: () => request("/api/admin/stats"),
  getSchools: (query = {}) => {
    const searchParams = new URLSearchParams();
    if (query.search) searchParams.set("search", query.search);
    if (query.status && query.status !== "all") searchParams.set("status", query.status);
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request(`/api/school${suffix}`);
  },
  createSchool: (body) =>
    request("/api/school", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  deleteSchool: (schoolId) =>
    request(`/api/school/${encodeURIComponent(schoolId)}`, {
      method: "DELETE"
    }),
  getSchoolStudents: (schoolId, query = {}) => {
    const searchParams = new URLSearchParams();
    if (query.schoolClass) searchParams.set("schoolClass", query.schoolClass);
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request(`/api/school/${encodeURIComponent(schoolId)}/students${suffix}`);
  },
  getSchoolClasses: (schoolId) =>
    request(`/api/school/${encodeURIComponent(schoolId)}/classes`),
  createSchoolClass: (schoolId, body) =>
    request(`/api/school/${encodeURIComponent(schoolId)}/classes`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  deleteSchoolClass: (schoolId, classId) =>
    request(
      `/api/school/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(classId)}`,
      { method: "DELETE" }
    ),
  createStudent: (body) =>
    request("/api/admin/students", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  /** `studentId` is the human-readable id (e.g. VS1-01), same as in the table */
  deleteStudent: (studentId) =>
    request(`/api/admin/students/${encodeURIComponent(studentId)}`, {
      method: "DELETE"
    }),
  /** CSV/TXT bulk upload — multipart form */
  bulkUploadStudents: async (file, schoolId, schoolCode) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("schoolId", schoolId);
    formData.append("schoolCode", schoolCode);
    const response = await fetch(`${API_URL}/api/upload/students`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      credentials: "include"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        setToken("");
      }
      const err = new Error(data.message || `Upload failed: ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return data;
  },
  /** Single image → Cloudinary; returns { url } */
  uploadStudentPhoto: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("photo", file);
    const response = await fetch(`${API_URL}/api/upload/photo`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      credentials: "include"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        setToken("");
      }
      const err = new Error(data.message || `Photo upload failed: ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return data;
  },
  getArtists: (search = "") => {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
    return request(`/api/admin/artists${suffix}`);
  },
  createProfile: (body) =>
    request("/api/admin/general-profiles", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  createArtist: (body) =>
    request("/api/admin/artists", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  updateProfile: (id, body) =>
    request(`/api/admin/general-profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  updateArtist: (id, body) =>
    request(`/api/admin/artists/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  deleteProfile: (id) =>
    request(`/api/admin/general-profiles/${id}`, {
      method: "DELETE"
    }),
  deleteArtist: (id) =>
    request(`/api/admin/artists/${encodeURIComponent(id)}/delete`, {
      method: "POST"
    }),
  checkAvailability: (query = {}) => {
    const searchParams = new URLSearchParams();
    if (query.username) searchParams.set("username", query.username);
    if (query.email) searchParams.set("email", query.email);
    if (query.excludeId) searchParams.set("excludeId", query.excludeId);
    return request(`/api/admin/check-availability?${searchParams.toString()}`);
  },
  getPaymentTags: (search = "") => {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
    return request(`/api/admin/payment-tags${suffix}`);
  },
  createPaymentTag: (body) =>
    request("/api/admin/payment-tags", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  updatePaymentTag: (id, body) =>
    request(`/api/admin/payment-tags/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  updatePaymentTagAmount: (id, amount) =>
    request(`/api/admin/payment-tags/${encodeURIComponent(id)}/amount`, {
      method: "PATCH",
      body: JSON.stringify({ amount })
    }),
  deletePaymentTag: (id) =>
    request(`/api/admin/payment-tags/${encodeURIComponent(id)}`, {
      method: "DELETE"
    })
};

/** Public GET /api/p/:token — no JWT (NFC / student profile links). Uses same API as admin app origin. */
export async function getPublicProfileByToken(token) {
  const res = await fetch(`${API_URL}/api/p/${encodeURIComponent(token)}`, {
    credentials: "include"
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  // Support both `{ success, data: profile }` and a plain profile payload
  const profile = body?.data ?? body;
  return { ...body, data: profile };
}
