"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import styles from "./ManagePrograms.module.css";

export default function ManagePrograms() {
  // State for Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isScratch, setIsScratch] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [location, setLocation] = useState("");
  const [minMembers, setMinMembers] = useState("");
  const [maxMembers, setMaxMembers] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dateError, setDateError] = useState(false);

  // 1. Fetch available templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
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

  // 2. Auto-populate fields when a template is selected
  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    setError("");
    setDateError(false);

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
    setDateError(false);
  };

  // 4. Main Submission Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setDateError(false);

    // Validation: Ensure Year and Month are selected
    if (!year || !month) {
      setError("Please select both a Year and a Month.");
      setDateError(true);
      return;
    }

    setLoading(true);

    try {
      let finalTemplateId = selectedTemplate;

      // Logic: Alternate Flow - Save new template to Firestore FIRST
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
      }

      // Logic: Convert Year/Month to Firestore Timestamps
      const yearInt = parseInt(year, 10);
      const monthInt = parseInt(month, 10);
      
      // Start date: 1st of the selected month
      const startDate = new Date(yearInt, monthInt - 1, 1);
      // End date: Last day of the selected month (0th day of next month)
      const endDate = new Date(yearInt, monthInt, 0);

      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      // Logic: Generate Unique Program ID [template_id]_[YYYY_MM]
      const formattedMonth = month.padStart(2, '0');
      const programId = `${finalTemplateId}_${year}_${formattedMonth}`;

      // Build the final program payload
      const programData = {
        template_id: finalTemplateId,
        name: name,
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

        <form onSubmit={handleSubmit}>
          
          {/* Template Selection */}
          <div className={styles.field}>
            <label className={styles.label}>Template</label>
            <select 
              className={styles.input} 
              value={selectedTemplate} 
              onChange={handleTemplateChange}
              disabled={isScratch}
              required={!isScratch}
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
              className={styles.input}
              placeholder="e.g. Summer Camp 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.input}
              placeholder="Program details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Location */}
          <div className={styles.field}>
            <label className={styles.label}>Location</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Main Campus"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          {/* Dates (Year / Month) */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Year</label>
              <select 
                className={`${styles.input} ${dateError ? styles.inputError : ''}`}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Year...</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Month</label>
              <select 
                className={`${styles.input} ${dateError ? styles.inputError : ''}`}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Month...</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>

          {/* Capacity */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Min Members</label>
              <input
                type="number"
                min="0"
                className={styles.input}
                placeholder="0"
                value={minMembers}
                onChange={(e) => setMinMembers(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Max Members</label>
              <input
                type="number"
                min="1"
                className={styles.input}
                placeholder="10"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                required
              />
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
