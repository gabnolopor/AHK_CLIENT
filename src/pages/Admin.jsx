import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiTrash2,
  FiLogOut,
  FiMusic,
  FiFile,
  FiChevronDown,
  FiChevronRight,
  FiBarChart2,
} from "react-icons/fi";
import "../styles/admin.css";
import { apiService } from "../services/api";
import { useApi } from "../hooks/useApi";
import { Link } from "react-router-dom";
import LoadingFallback from "../components/LoadingFallback";

// Constants
const WRITING_GENRES = [
  "Scripts",
  "Poems",
  "Lyrics",
  "Philosophy",
  "Treatments"
];
const MUSIC_GENRES = ["Film-TV", "Pop", "Rock", "Electro", "Experimental"];
const REMEMBERED_USERNAME_KEY = "adminRememberedUsername";
const ANALYTICS_PERIODS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

function validateLoginForm({ username, password }) {
  const errors = {};
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    errors.username = "El usuario es obligatorio.";
  } else if (trimmedUsername.length < 2) {
    errors.username = "El usuario debe tener al menos 2 caracteres.";
  }

  if (!password) {
    errors.password = "La contraseña es obligatoria.";
  }

  return errors;
}

function Admin() {
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedFile, setSelectedFile] = useState({ id: null, type: null });
  const [filePreview, setFilePreview] = useState(null);

  // New state for change password modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  });

  // Add these state variables at the top with other state declarations
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Database content states
  const [dbContent, setDbContent] = useState({
    photo: [],
    artwork: [],
    music: [],
    writing: [],
    biography: [],
    design: [],
    digitalArt: []
  });

  const [formData, setFormData] = useState({
    artwork: { title: "", description: "" },
    music: { title: "", description: "", genre: "" },
    photo: { title: "", description: "" },
    writing: { title: "", description: "", genre: "" },
    biography: { id: "", title: "", text: "" },
    design: { title: "", description: "" },
    digitalArt: { title: "", description: "" }
  });

  const [expandedSections, setExpandedSections] = useState({
    artwork: false,
    music: false,
    photo: false,
    writing: false,
    design: false,
    digitalArt: false,
    biography: false,
    analytics: true,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { loading: apiLoading, error: apiError, handleRequest } = useApi();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("week");

  // Photos + paintings share a fixed total; photos are 2/3, paintings 1/3
  const VISUAL_ART_TOTAL = 30;
  const CONTENT_LIMITS = {
    photo: Math.floor(VISUAL_ART_TOTAL * 2 / 3),
    artwork: Math.floor(VISUAL_ART_TOTAL / 3),
    writing: 50,
    music: 30,
    design: 15,
    digitalArt: 15
  };

  // Fetch all content from database
  useEffect(() => {
    const fetchAllContent = async () => {
      if (isAuthenticated) {
        // Only fetch if authenticated
        try {
          const [artwork, music, photos, writings, design, digitalArt] = await Promise.all([
            handleRequest(() => apiService.getAllPaintings()),
            handleRequest(() => apiService.getAllMusic()),
            handleRequest(() => apiService.getAllPhotography()),
            handleRequest(() => apiService.getAllWritings()),
            handleRequest(() => apiService.getAllDesigns()),
            handleRequest(() => apiService.getAllDigitalArt())
          ]);

          setDbContent({
            artwork: artwork || [],
            music: music || [],
            photo: photos || [],
            writing: writings || [],
            design: design || [],
            digitalArt: digitalArt || []
          });
        } catch (error) {
          console.error("Error fetching content:", error);
          toast.error("Failed to load content");
        }
      }
    };

    fetchAllContent();
  }, [isAuthenticated, handleRequest]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isAuthenticated) return;

      setAnalyticsLoading(true);
      try {
        const data = await apiService.getAnalyticsStats(analyticsPeriod);
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast.error("Failed to load visit analytics");
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAuthenticated, analyticsPeriod]);

  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (savedUsername) {
      setLoginData((prev) => ({ ...prev, username: savedUsername }));
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isValid = await apiService.verifyAdminToken();
        setIsAuthenticated(isValid);
        if (!isValid) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("isAdminAuthenticated");
        }
      } catch (error) {
        setIsAuthenticated(false);
        localStorage.removeItem("adminToken");
        localStorage.removeItem("isAdminAuthenticated");
      }
    };

    checkAuth();
  }, []);

  // Fetch biography data from the database
  useEffect(() => {
    const fetchBiographyData = async () => {
      try {
        const biographyData = await handleRequest(() =>
          apiService.getAllBiography()
        );
        if (biographyData) {
          setFormData((prev) => ({
            ...prev,
            biography: {
              id: biographyData._id,
              title: biographyData.title || "",
              text: biographyData.text || "",
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching biography data:", error);
        toast.error("Failed to load biography data");
      }
    };

    fetchBiographyData();
  }, [handleRequest]);

  const contentTypes = {
    artwork: { accepts: ".png,.jpg,.jpeg" },
    music: { accepts: ".mp3" },
    photo: { accepts: ".png,.jpg,.jpeg" },
    writing: { accepts: ".txt, .pdf" },
    design: { accepts: ".png,.jpg,.jpeg" },
    digitalArt: { accepts: ".png,.jpg,.jpeg" }
  };

  const handleInputChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB in bytes

      if (file.size > maxSizeInBytes) {
        alert("File size exceeds 10 MB. Please select a smaller file.");
        return;
      }

      setFilePreview({
        url: URL.createObjectURL(file),
        filename: file.name,
      });
      toast.success(`${file.name} selected successfully!`, { icon: "📁" });
    }
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      const title = formData[type].title;
      formDataToSend.append("name", title);
      
      // Handle different content types
      if (type === "writing" || type === "music") {
        // Append genre for both writing and music types
        formDataToSend.append("genre", formData[type].genre);
      } else if (type === "photo" || type === "artwork" || type === "design" || type === "digitalArt") {
        formDataToSend.append("description", formData[type].description || "");
      }

      const file = fileInputRef.current?.files[0];
      if (file) {
        const fileExtension = file.name.split(".").pop();
        const newFileName = `${title
          .toLowerCase()
          .replace(/\s+/g, "-")}.${fileExtension}`;
        const renamedFile = new File([file], newFileName, { type: file.type });
        formDataToSend.append("file", renamedFile);
      }

      if (selectedFile.id) {
        await handleRequest(() =>
          apiService.updateContent(type, selectedFile.id, formDataToSend)
        );
        toast.success("Item updated successfully!");
      } else {
        await handleRequest(() =>
          apiService.uploadContent(type, formDataToSend)
        );
        toast.success("Item added successfully!");
      }

      window.location.reload();
    } catch (error) {
      console.error("Error:", error);
      toast.error(`Failed to ${selectedFile.id ? "update" : "add"} ${type}`);
      setIsLoading(false);
    }
  };

  const handleAddNew = (type) => {
    // Check if we've reached the limit for this content type
    if (CONTENT_LIMITS[type] && dbContent[type].length >= CONTENT_LIMITS[type]) {
      toast.error(`Maximum limit of ${CONTENT_LIMITS[type]} ${type} files reached. Please delete some existing files first.`);
      return;
    }
    
    setModalType(type);
    setSelectedFile({ id: null, type });
    setFormData({
      ...formData,
      [type]: {
        title: "",
        genre: type === "writing" ? "" : undefined,
      },
    });
    setShowModal(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const errors = validateLoginForm(loginData);
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await handleRequest(() => 
        apiService.loginAdmin({
          username: loginData.username.trim(),
          password: loginData.password,
          rememberMe,
        })
      );
      
      if (response && response.token) {
        localStorage.setItem('isAdminAuthenticated', 'true');
        localStorage.setItem(REMEMBERED_USERNAME_KEY, loginData.username.trim());
        setLoginErrors({});
        setLoginData((prev) => ({ ...prev, password: "" }));
        setIsAuthenticated(true);
        toast.success('Login successful!');
        
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Detectar errores de CORS
      if (error.message && (
          error.message.includes('NetworkError') || 
          error.message.includes('CORS') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('Network request failed')
        )) {
        toast.error('Network error: CORS policy might be blocking the request. Please check your connection or contact support.');
      } else {
        toast.error('Login failed: ' + (error.message || 'Invalid username or password'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdminAuthenticated");
    setIsAuthenticated(false);
    toast.info("Logged out successfully");
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    setIsLoading(true);
    try {
      await handleRequest(() => apiService.deleteContent(type, id));

      setDbContent((prev) => ({
        ...prev,
        [type]: prev[type].filter((item) => item._id !== id),
      }));

      toast.success("Item deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = async (file, type) => {
    setSelectedFile({ id: file._id, type });
    setModalType(type);

    // Set the form data with existing values
    setFormData((prev) => ({
      ...prev,
      [type]: {
        title: file.name || "",
        description: file.description || "",
        genre: file.genre || "",
      },
    }));

    // Set file preview with filename and URL
    setFilePreview({
      url: file.imageUrl || "", // Use the existing URL
      filename: file.filename, // Set the filename
    });

    setShowModal(true);
  };

  const renderFilePreview = () => {
    console.log(filePreview);
    if (!filePreview) return null;

    if (filePreview.filename.includes("writings/")) {
      return (
        <div className="file-previewText">
          <FiFile size={24} />
          <p>{filePreview.filename.split("/").pop() || "Text Document"}</p>
        </div>
      );
    }

    if (filePreview.filename.includes("music/")) {
      return (
        <div className="file-previewAudio">
          <FiMusic size={24} />
          <p>{filePreview.filename.split("/").pop() || "Audio File"}</p>
        </div>
      );
    }

    return (
      <div className="file-previewImage">
        <img src={filePreview.url} alt="Preview" />
        <p>{filePreview.filename.split("/").pop() || "Image"}</p>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    const { accepts } = contentTypes[modalType];
    const isEditing = selectedFile.id !== null;
    const isWriting = modalType === "writing";
    const isMusic = modalType === "music";
    const showDescription =
      modalType === "photo" ||
      modalType === "artwork" ||
      modalType === "design" ||
      modalType === "digitalArt";

    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">
              {isEditing ? `Edit ${modalType}` : `Add New ${modalType}`}
            </h3>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ×
            </button>
          </div>

          <form
            className="modal-form"
            onSubmit={(e) => handleSubmit(e, modalType)}
          >
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                value={formData[modalType].title}
                onChange={(e) =>
                  handleInputChange(modalType, "title", e.target.value)
                }
                required
                placeholder="Enter title"
              />
            </div>

            {(isWriting || isMusic) && (
              <div className="form-group">
                <label className="form-label">Genre</label>
                <select
                  className="form-select"
                  value={formData[modalType].genre}
                  onChange={(e) =>
                    handleInputChange(modalType, "genre", e.target.value)
                  }
                  required
                >
                  <option value="">Select a genre</option>
                  {(isWriting ? WRITING_GENRES : MUSIC_GENRES).map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showDescription && (
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData[modalType].description}
                  onChange={(e) =>
                    handleInputChange(modalType, "description", e.target.value)
                  }
                  placeholder="Enter description"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">File {!isEditing && "*"}</label>
              <div className="file-input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accepts}
                  className="file-input"
                  onChange={(e) => handleFileChange(e, modalType)}
                  required={!isEditing}
                />
                <span className="file-input-text">
                  {isEditing
                    ? "Choose new file to replace existing"
                    : "Click to select or drag a file here"}
                </span>
                {renderFilePreview()}
              </div>
            </div>

            <button
              type="submit"
              className="action-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  ⭕
                </motion.div>
              ) : isEditing ? (
                "Update"
              ) : (
                "Upload"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const getSectionLabel = (type) => {
    const labels = { artwork: "Artwork", digitalArt: "Digital Art" };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatVisitDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const truncateText = (value, max = 60) => {
    if (!value) return "—";
    return value.length > max ? `${value.slice(0, max)}…` : value;
  };

  const formatLocation = (visit) => {
    const parts = [visit.city, visit.region, visit.country].filter(Boolean);
    if (parts.length === 0 && visit.timezone) {
      return visit.timezone;
    }
    if (parts.length === 0) {
      return "—";
    }
    const location = parts.join(", ");
    return visit.timezone ? `${location} · ${visit.timezone}` : location;
  };

  const getBreakdownTitle = (unit) => {
    if (unit === "hour") return "Visits by hour";
    if (unit === "month") return "Visits by month";
    return "Visits by day";
  };

  const renderAnalytics = () => {
    const summary = analytics?.summary;
    const breakdownItems = analytics?.breakdown?.items ?? [];
    const topCountries = analytics?.topCountries ?? [];
    const visitList = analytics?.visits ?? [];

    return (
      <div className={`analytics-panel${analyticsLoading ? " analytics-panel--loading" : ""}`}>
        <div className="analytics-period-filters" role="tablist" aria-label="Visit period">
          {ANALYTICS_PERIODS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={analyticsPeriod === id}
              className={`analytics-period-button${analyticsPeriod === id ? " analytics-period-button--active" : ""}`}
              onClick={() => setAnalyticsPeriod(id)}
              disabled={analyticsLoading}
            >
              {label}
            </button>
          ))}
        </div>

        {analyticsLoading && !analytics ? (
          <p className="analytics-loading">Loading visit stats…</p>
        ) : (
          <>
            <div className="analytics-summary-grid">
              <div className="analytics-stat-card">
                <span className="analytics-stat-label">Visits</span>
                <strong className="analytics-stat-value">{summary?.visits ?? 0}</strong>
              </div>
              <div className="analytics-stat-card">
                <span className="analytics-stat-label">Unique IPs</span>
                <strong className="analytics-stat-value">{summary?.uniqueIps ?? 0}</strong>
              </div>
            </div>

            <p className="analytics-retention-note">
              Records are automatically deleted after {analytics?.retentionDays ?? 30} days (MongoDB TTL).
            </p>

            {breakdownItems.length > 0 && (
              <div className="analytics-breakdown-section">
                <h3 className="analytics-subtitle">
                  {getBreakdownTitle(analytics?.breakdown?.unit)}
                </h3>
                <div className="analytics-breakdown-list">
                  {breakdownItems.map((item) => (
                    <div key={item.label} className="analytics-breakdown-row">
                      <span>{item.label}</span>
                      <span>{item.visits} visits</span>
                      <span>{item.uniqueIps} IPs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topCountries.length > 0 && (
              <div className="analytics-breakdown-section">
                <h3 className="analytics-subtitle">Top countries</h3>
                <div className="analytics-breakdown-list">
                  {topCountries.map((item) => (
                    <div key={item.country} className="analytics-breakdown-row analytics-breakdown-row--two-cols">
                      <span>{item.country}</span>
                      <span>{item.visits} visits</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="analytics-visits-section">
              <h3 className="analytics-subtitle">
                Visit log ({visitList.length})
              </h3>
              {visitList.length > 0 ? (
                <div className="analytics-table-scroll">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>IP</th>
                        <th>Location</th>
                        <th>Referer</th>
                        <th>User-Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitList.map((visit, index) => (
                        <tr key={`${visit.visitedAt}-${visit.ip}-${index}`}>
                          <td>{formatVisitDate(visit.visitedAt)}</td>
                          <td>{visit.ip}</td>
                          <td title={formatLocation(visit)}>{truncateText(formatLocation(visit), 36)}</td>
                          <td title={visit.referer}>{truncateText(visit.referer, 32)}</td>
                          <td title={visit.userAgent}>{truncateText(visit.userAgent, 40)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="analytics-empty">No visits in this period.</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFileList = (type, options = {}) => {
    const { showHeaderTitle = true } = options;
    if (!dbContent[type]) {
      console.error(`Type "${type}" is not defined in dbContent.`);
      return null;
    }

    const hasReachedLimit = CONTENT_LIMITS[type] && dbContent[type].length >= CONTENT_LIMITS[type];

    return (
      <>
        <div className={`section-header${!showHeaderTitle ? " section-header--add-only" : ""}`}>
          {showHeaderTitle && (
            <h2 className="section-title">
              {getSectionLabel(type)}
              {CONTENT_LIMITS[type] && (
                <span className="file-count">
                  {dbContent[type].length}/{CONTENT_LIMITS[type]}
                </span>
              )}
            </h2>
          )}
          <button
            className="add-new-button"
            onClick={() => handleAddNew(type)}
            disabled={isLoading || hasReachedLimit}
            title={hasReachedLimit ? `Maximum limit of ${CONTENT_LIMITS[type]} files reached` : ""}
          >
            <FiPlus /> Add New
          </button>
        </div>

        <div className="file-list-container">
          <div className="file-list">
            {dbContent[type].map((item) => (
              <div key={item._id} className="file-list-item">
                <div
                  className="file-details"
                  onClick={() => handleEditClick(item, type)}
                >
                  {type === "music" ? (
                    <FiMusic className="file-icon" />
                  ) : type === "writing" ? (
                    <FiFile className="file-icon" />
                  ) : item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="file-preview"
                    />
                  ) : null}
                  <span className="file-title">{item.name}</span>
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item._id, type);
                  }}
                  disabled={isLoading}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderBiography = (options = {}) => {
    const { showHeaderTitle = true } = options;
    return (
      <div className="section-header" style={{ display: "block" }}>
        {showHeaderTitle && <h2 className="section-title">Biography</h2>}
        <form
          className="biography-form"
          onSubmit={(e) => handleSubmit(e, "biography")}
        >
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.biography.title}
              onChange={(e) =>
                handleInputChange("biography", "title", e.target.value)
              }
              required
              placeholder="Enter title"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Text *</label>
            <textarea
              className="form-textarea"
              value={formData.biography.text}
              onChange={(e) =>
                handleInputChange("biography", "text", e.target.value)
              }
              required
              placeholder="Enter biography text"
            />
          </div>
          <button type="submit" className="action-button" disabled={isLoading}>
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                ⭕
              </motion.div>
            ) : (
              "Save"
            )}
          </button>
        </form>
      </div>
    );
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await handleRequest(() =>
        apiService.changePassword(passwordData.currentPassword, passwordData.newPassword)
      );
      toast.success("Password changed successfully!");
      setShowChangePasswordModal(false);
    } catch (error) {
      console.error("Change password error:", error);
      toast.error("Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const renderChangePasswordModal = () => {
    if (!showChangePasswordModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h1 className="login-title">Change Password</h1>
          <form onSubmit={handleChangePassword} className="login-form">
            <div className="login-input-group">
              <FiLock className="login-form-icon" />
              <input
                type={showCurrentPassword ? "text" : "password"}
                className="login-form-input"
                placeholder="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <div className="login-input-group">
              <FiLock className="login-form-icon" />
              <input
                type={showNewPassword ? "text" : "password"}
                className="login-form-input"
                placeholder="New Password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  ⭕
                </motion.div>
              ) : (
                "Change Password"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Add this for loading state when fetching content
  if (isAuthenticated && apiLoading) {
    return <LoadingFallback />;
  }

  if (isAuthenticated) {
    return (
      <div className="dashboard-container">
        <Toaster position="top-right" />
        <div className="dashboard-header">
          <h1 className="dashboard-title">AHK</h1>
          <div className="dashboard-controls">
            <button onClick={handleLogout} className="logout-button">
              <FiLogOut /> Logout
            </button>
            <button onClick={() => setShowChangePasswordModal(true)} className="change-password-button">
              Change Password
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="content-section content-section--collapsible content-section--analytics">
            <button
              type="button"
              className="collapsible-header"
              onClick={() => toggleSection("analytics")}
              aria-expanded={expandedSections.analytics}
            >
              <span className="collapsible-header-title">
                <FiBarChart2 className="collapsible-title-icon" /> Visits
              </span>
              {expandedSections.analytics ? (
                <FiChevronDown className="collapsible-icon" />
              ) : (
                <FiChevronRight className="collapsible-icon" />
              )}
            </button>
            {expandedSections.analytics && (
              <div className="collapsible-body">
                {renderAnalytics()}
              </div>
            )}
          </div>

          {[
            "artwork",
            "music",
            "photo",
            "writing",
            "design",
            "digitalArt"
          ].map((key) => (
            <div key={key} className="content-section content-section--collapsible">
              <button
                type="button"
                className="collapsible-header"
                onClick={() => toggleSection(key)}
                aria-expanded={expandedSections[key]}
              >
                <span className="collapsible-header-title">
                  {getSectionLabel(key)}
                  {CONTENT_LIMITS[key] && (
                    <span className="file-count">
                      {" "}{dbContent[key].length}/{CONTENT_LIMITS[key]}
                    </span>
                  )}
                </span>
                {expandedSections[key] ? (
                  <FiChevronDown className="collapsible-icon" />
                ) : (
                  <FiChevronRight className="collapsible-icon" />
                )}
              </button>
              {expandedSections[key] && (
                <div className="collapsible-body">
                  {renderFileList(key, { showHeaderTitle: false })}
                </div>
              )}
            </div>
          ))}
          <div className="content-section content-section--collapsible">
            <button
              type="button"
              className="collapsible-header"
              onClick={() => toggleSection("biography")}
              aria-expanded={expandedSections.biography}
            >
              <span className="collapsible-header-title">Biography</span>
              {expandedSections.biography ? (
                <FiChevronDown className="collapsible-icon" />
              ) : (
                <FiChevronRight className="collapsible-icon" />
              )}
            </button>
            {expandedSections.biography && (
              <div className="collapsible-body">
                {renderBiography({ showHeaderTitle: false })}
              </div>
            )}
          </div>
        </div>

        {showModal && renderModal()}
        {renderChangePasswordModal()}

        <Link to="/" className="logo-link">
          <img src="/black-logo.png" className="logo" alt="logo" />
        </Link>

      </div>
    );
  }

  return (
    <div className="login-container">
      <Toaster position="top-right" />
      <div className="login-card">
        <h1 className="login-title">Admin Login</h1>
        <form onSubmit={handleLogin} className="login-form" autoComplete="on">
          <div>
            <div className="login-input-group">
              <FiUser className="login-form-icon" />
              <input
                id="admin-username"
                name="username"
                type="text"
                className={`login-form-input${loginErrors.username ? " input-error" : ""}`}
                placeholder="Username"
                autoComplete="username"
                value={loginData.username}
                onChange={(e) => {
                  setLoginData({ ...loginData, username: e.target.value });
                  if (loginErrors.username) {
                    setLoginErrors({ ...loginErrors, username: undefined });
                  }
                }}
              />
            </div>
            {loginErrors.username && (
              <p className="login-field-error">{loginErrors.username}</p>
            )}
          </div>
          <div>
            <div className="login-input-group">
              <FiLock className="login-form-icon" />
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={`login-form-input${loginErrors.password ? " input-error" : ""}`}
                placeholder="Password"
                autoComplete="current-password"
                value={loginData.password}
                onChange={(e) => {
                  setLoginData({ ...loginData, password: e.target.value });
                  if (loginErrors.password) {
                    setLoginErrors({ ...loginErrors, password: undefined });
                  }
                }}
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {loginErrors.password && (
              <p className="login-field-error">{loginErrors.password}</p>
            )}
          </div>
          <label className="login-remember-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me (30-day session)
          </label>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                ⭕
              </motion.div>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Admin;
