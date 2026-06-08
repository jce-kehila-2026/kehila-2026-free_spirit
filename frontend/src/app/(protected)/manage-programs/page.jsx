"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db, isFirebaseInitialized } from "@/firebase/firebase";
import styles from "./ManagePrograms.module.css";

export default function ManagePrograms() {
  const DEFAULT_BATCH = 1;

  // UI State
  const [templates, setTemplates] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isScratch, setIsScratch] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minMembers, setMinMembers] = useState("");
  const [maxMembers, setMaxMembers] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // GeoDB config read from env (paste your RapidAPI key into .env.local)
  const GEODB_API_KEY = process.env.NEXT_PUBLIC_GEODB_API_KEY;
  const GEODB_API_HOST = process.env.NEXT_PUBLIC_GEODB_API_HOST || 'wft-geo-db.p.rapidapi.com';

 
  // 1. Fetch available templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        if (!isFirebaseInitialized || !db) {
          setTemplates([]);
          setError("Firebase is not initialized (missing API key). Templates unavailable.");
          return;
        }
        // READ: Fetching documents from 'program_templates' collection
        const templatesCol = collection(db, "program_templates");
        const templateSnapshot = await getDocs(templatesCol);
        const templateList = templateSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTemplates(templateList);
      } catch (err) {
        console.error("Error fetching templates:", err);
        setError("Failed to load program templates.");
      }
    };

    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchSavedLocations = async () => {
      try {
        if (!isFirebaseInitialized || !db) {
          setSavedLocations([]);
          return;
        }
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const locationList = locationSnapshot.docs
          .map((doc) => doc.data().name)
          .filter(Boolean)
          .sort();
        setSavedLocations(locationList);
      } catch (err) {
        console.error("Error fetching saved locations:", err);
      }
    };

    fetchSavedLocations();
  }, []);

  // Autocomplete: fetch city suggestions from GeoDB as the user types (debounced)
  useEffect(() => {
    if (!location || location.trim().length < 2) {
      return;
    }

    if (!GEODB_API_KEY) {
      // No key configured — skip external autocomplete
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsSuggestLoading(true);
        const url = `https://${GEODB_API_HOST}/v1/geo/cities?limit=8&namePrefix=${encodeURIComponent(location)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': GEODB_API_KEY,
            'X-RapidAPI-Host': GEODB_API_HOST,
          },
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          setIsSuggestLoading(false);
          return;
        }
        const json = await res.json();
        const list = (json.data || []).map(c => `${c.city}${c.region ? ', ' + c.region : ''}${c.country ? ', ' + c.country : ''}`);
        setSuggestions(list);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('GeoDB autocomplete error:', err);
      } finally {
        setIsSuggestLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [location, GEODB_API_KEY, GEODB_API_HOST]);

  // 2. Auto-populate fields when a template is selected
  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    setError("");

    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setName(template.template_name || "");
        setDescription(template.base_description || "");
      }
    } else {
      setName("");
      setDescription("");
    }
  };

  // 3. Handle Alternate Flow (Create from Scratch)
  const toggleScratchMode = () => {
    setIsScratch(!isScratch);
    setSelectedTemplate("");
    setName("");
    setDescription("");
    setError("");
  };

  // 4. Main Submission Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate fields
    const errors = {};

    if (!name.trim()) errors.name = "Please enter a program name.";
    if (!description.trim()) errors.description = "Please enter a program description.";
    if (!startDate) errors.startDate = "Please select a start date.";
    if (!endDate) errors.endDate = "Please select an end date.";
    if (!location.trim()) errors.location = "Please enter a location.";
    if (!minMembers && minMembers !== 0) errors.minMembers = "Please enter minimum members.";
    if (!maxMembers && maxMembers !== 0) errors.maxMembers = "Please enter maximum members.";

    // Date-specific validations
    const parseDate = (d) => (d ? new Date(d) : null);
    const sDate = parseDate(startDate);
    const eDate = parseDate(endDate);
    if (sDate && eDate && sDate > eDate) {
      errors.startDate = "Start date cannot be after end date.";
      errors.endDate = "End date cannot be before start date.";
    }
    if (sDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const sOnly = new Date(sDate);
      sOnly.setHours(0,0,0,0);
      if (sOnly < today) {
        errors.startDate = errors.startDate ? errors.startDate + " Also, start date is in the past." : "Start date cannot be in the past.";
      }
    }

    // Capacity checks
    const minNum = parseInt(minMembers, 10);
    const maxNum = parseInt(maxMembers, 10);
    if (!isNaN(minNum) && minNum < 0) {
      errors.minMembers = "Min members cannot be negative.";
    }
    if (!isNaN(maxNum) && maxNum < 0) {
      errors.maxMembers = "Max members cannot be negative.";
    }
    if (!isNaN(minNum) && !isNaN(maxNum) && minNum > maxNum) {
      errors.minMembers = "Min members cannot be greater than max members.";
      errors.maxMembers = "Max members cannot be less than min members.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      let finalTemplateId = selectedTemplate;

      // Logic: Handle cases where no template is selected
      if (!finalTemplateId) {
        if (isScratch) {
          // Generate a safe template ID based on the typed name
          finalTemplateId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          
          // WRITE: Save new document to 'program_templates'
          const newTemplateRef = doc(db, "program_templates", finalTemplateId);
          await setDoc(newTemplateRef, {
            template_name: name,
            category: "Custom",
            base_description: description
          });
        } else {
          // No template selected and not in scratch mode - create a custom template
          finalTemplateId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          
          // WRITE: Save new document to 'program_templates'
          const newTemplateRef = doc(db, "program_templates", finalTemplateId);
          await setDoc(newTemplateRef, {
            template_name: name,
            category: "Custom",
            base_description: description
          });
        }
      }

          // המרה לפורמט של פיירבייס
          const startTimestamp = Timestamp.fromDate(new Date(startDate));
          const endTimestamp = Timestamp.fromDate(new Date(endDate));

          // יצירת מזהה תוכנית: [template]_[YYYY]_[MM]_[batch]
          const dateObj = new Date(startDate);
          const yearVal = dateObj.getFullYear();
          const monthVal = String(dateObj.getMonth() + 1).padStart(2, '0');
          const programId = `${finalTemplateId}_${yearVal}_${monthVal}_${DEFAULT_BATCH}`;
        // Build the final program payload
      const programData = {
        template_id: finalTemplateId,
        name: name,
        batch: DEFAULT_BATCH,
        description: description, // Storing edited description specific to this instance
        start_date: startTimestamp,
        end_date: endTimestamp,
        location: location,
        min_members: parseInt(minMembers, 10) || 0,
        max_members: parseInt(maxMembers, 10) || 0,
        participant_count: 0,
        participant_ids: [],
        status: "Upcoming"
      };

      // WRITE: Save specific instance to 'programs' collection
      const programRef = doc(db, "programs", programId);
      await setDoc(programRef, programData);

      const trimmedLocation = location.trim();
      if (trimmedLocation) {
        const locationExists = savedLocations.some(
          (existing) => existing.toLowerCase() === trimmedLocation.toLowerCase(),
        );

        if (!locationExists) {
          const locationId = trimmedLocation.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          const locationRef = doc(db, "locations", locationId);
          await setDoc(locationRef, { name: trimmedLocation });
          setSavedLocations((prev) => [...prev, trimmedLocation]);
        }
      }

      setSuccess(true);

      

      // Optional: Reset form fields here if desired

    } catch (err) {
      console.error("Error creating program:", err);
      setError("An error occurred while creating the program.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.form}>
        <div className={styles.header}>
          <h1 className={styles.title}>Manage Programs</h1>
          <p className={styles.subtitle}>Create and schedule a new program instance</p>
        </div>

        {error && <p className={styles.authError}>{error}</p>}
        {success && <p className={styles.authError} style={{ color: '#16a34a' }}>Program successfully created!</p>}

        <form onSubmit={handleSubmit} noValidate>
          
          {/* Template Selection */}
          <div className={styles.field}>
            <label className={styles.label}>Template</label>
            <select 
              className={styles.input} 
              value={selectedTemplate} 
              onChange={handleTemplateChange}
              disabled={isScratch}
            >
              <option value="">Select a template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>OR</span>
            <div className={styles.dividerLine}></div>
          </div>

          <button 
            type="button" 
            className={styles.secondaryButton} 
            onClick={toggleScratchMode}
            style={{ marginBottom: '24px' }}
          >
            {isScratch ? "Cancel Create from Scratch" : "Create New Program from Scratch"}
          </button>

          {/* Program Details */}
          <div className={styles.field}>
            <label className={styles.label}>Program Name</label>
            <input
              type="text"
              className={`${styles.input} ${fieldErrors.name ? styles.inputError : ''}`}
              placeholder="e.g. Summer Camp"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors(prev => { const c = { ...prev }; delete c.name; return c; }); }}
              onBlur={() => { if (!name.trim()) setFieldErrors(prev => ({ ...prev, name: 'Please enter a program name.' })); }}
              required
            />
            {fieldErrors.name && <p className={styles.error}>{fieldErrors.name}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={`${styles.input} ${fieldErrors.description ? styles.inputError : ''}`}
              placeholder="Program details..."
              value={description}
              onChange={(e) => { setDescription(e.target.value); setFieldErrors(prev => { const c = { ...prev }; delete c.description; return c; }); }}
              onBlur={() => { if (!description.trim()) setFieldErrors(prev => ({ ...prev, description: 'Please enter a program description.' })); }}
              required
            />
            {fieldErrors.description && <p className={styles.error}>{fieldErrors.description}</p>}
          </div>

          {/* Location */}
          <div className={styles.field}>
            <label className={styles.label}>Location</label>
            <input
              type="text"
              className={`${styles.input} ${fieldErrors.location ? styles.inputError : ''}`}
              placeholder="e.g. Israel, New York..."
              value={location}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocation(newValue);
                if (newValue.trim().length < 2) {
                  setSuggestions([]);
                }
                setFieldErrors(prev => {
                  const c = { ...prev };
                  delete c.location;
                  return c;
                });
              }}
              onBlur={() => { if (!location.trim()) setFieldErrors(prev => ({ ...prev, location: 'Please enter a location.' })); }}
              required
            />
            {fieldErrors.location && <p className={styles.error}>{fieldErrors.location}</p>}

            {/* Autocomplete suggestions (GeoDB) */}
            { (suggestions.length > 0 || isSuggestLoading) && (
              <div className={styles.suggestions}>
                {isSuggestLoading && <div className={styles.suggestionLoading}>Loading...</div>}
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={styles.suggestionItem}
                    onClick={() => { setLocation(s); setSuggestions([]); setFieldErrors(prev => { const c = { ...prev }; delete c.location; return c; }); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates (Year / Month) */}
          <div className={styles.row}>
            <div className={styles.field} style={{ flex: '2' }}>
              <label className={styles.label}>Start Date</label>
              <input
                type="date"
                  className={`${styles.input} ${fieldErrors.startDate ? styles.inputError : ''}`}
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setFieldErrors(prev => { const c = { ...prev }; delete c.startDate; delete c.endDate; return c; }); }}
                  onBlur={() => { if (!startDate) setFieldErrors(prev => ({ ...prev, startDate: 'Please select a start date.' })); }}
                  required
              />
              {fieldErrors.startDate && <p className={styles.error}>{fieldErrors.startDate}</p>}
            </div>
            <div className={styles.field} style={{ flex: '2' }}>
              <label className={styles.label}>End Date</label>
              <input
                type="date"
                  className={`${styles.input} ${fieldErrors.endDate ? styles.inputError : ''}`}
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setFieldErrors(prev => { const c = { ...prev }; delete c.endDate; delete c.startDate; return c; }); }}
                  onBlur={() => { if (!endDate) setFieldErrors(prev => ({ ...prev, endDate: 'Please select an end date.' })); }}
                  required
              />
              {fieldErrors.endDate && <p className={styles.error}>{fieldErrors.endDate}</p>}
            </div>
            
        
            </div>

          {/* Capacity */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Min Members</label>
              <input
                type="number"
                min="0"
                className={`${styles.input} ${fieldErrors.minMembers ? styles.inputError : ''}`}
                placeholder="0"
                value={minMembers}
                onChange={(e) => { let v = e.target.value; if (v && v.startsWith('-')) v = v.replace(/-/g, ''); setMinMembers(v); setFieldErrors(prev => { const c = { ...prev }; delete c.minMembers; delete c.maxMembers; return c; }); }}
                onBlur={() => { if (minMembers === "" || minMembers === null) setFieldErrors(prev => ({ ...prev, minMembers: 'Please enter minimum members.' })); }}
                required
              />
              {fieldErrors.minMembers && <p className={styles.error}>{fieldErrors.minMembers}</p>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Max Members</label>
              <input
                type="number"
                min="0"
                className={`${styles.input} ${fieldErrors.maxMembers ? styles.inputError : ''}`}
                placeholder="0"
                value={maxMembers}
                onChange={(e) => { let v = e.target.value; if (v && v.startsWith('-')) v = v.replace(/-/g, ''); setMaxMembers(v); setFieldErrors(prev => { const c = { ...prev }; delete c.maxMembers; delete c.minMembers; return c; }); }}
                onBlur={() => { if (maxMembers === "" || maxMembers === null) setFieldErrors(prev => ({ ...prev, maxMembers: 'Please enter maximum members.' })); }}
                required
              />
              {fieldErrors.maxMembers && <p className={styles.error}>{fieldErrors.maxMembers}</p>}
            </div>
          </div>
          <button
            type="submit" 
            className={styles.button} 
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Program"}
          </button>
        </form>
      </div>
    </div>
  );
}
