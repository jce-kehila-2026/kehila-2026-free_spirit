#!/usr/bin/env node

/*
 * Local demo data preparation script.
 *
 * This script is intentionally separate from the Next.js app. It does not
 * import app services, does not change auth/routing/rules, and never deletes
 * Firebase Auth users. Firestore writes happen only when --apply is passed.
 */

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const path = require("path");

const DEMO_BATCH_ID = "live-demo-2026-06-30";
const DEMO_MARKER = Object.freeze({
  demo_seed: true,
  demo_batch_id: DEMO_BATCH_ID,
});

const DEVELOPER_EMAIL_ALLOWLIST = [
  "noalela4@gmail.com",
  "leebaf1234@gmail.com",
  "dvirhadad61@gmail.com",
  "danielohana47@gmail.com",
];

const DEMO_COLLECTIONS_TO_DELETE = [
  "automatic_notifications",
  "client_field_definitions",
  "clients",
  "events",
  "notifications",
  "todos",
];

const FULL_DEMO_RESET_COLLECTIONS_TO_DELETE = [
  "automatic_notifications",
  "clients",
  "events",
  "notifications",
  "todos",
];

const CLEANUP_COLLECTIONS_TO_SCAN = [
  "accounts",
  "clients",
  "programs",
  "client_field_definitions",
  ...Array.from(
    new Set([
      ...DEMO_COLLECTIONS_TO_DELETE.filter((name) => name !== "clients"),
      ...FULL_DEMO_RESET_COLLECTIONS_TO_DELETE.filter((name) => name !== "clients"),
    ]),
  ),
];

const args = new Set(process.argv.slice(2));
const mode = {
  apply: args.has("--apply"),
  dryRun: args.has("--dry-run") || !args.has("--apply"),
  cleanup: args.has("--cleanup"),
  seed: args.has("--seed"),
  fullDemoReset: args.has("--full-demo-reset"),
  help: args.has("--help") || args.has("-h"),
};

function printHelp() {
  console.log(`
Usage:
  node scripts/seedDemoData.js --dry-run --cleanup --seed
  node scripts/seedDemoData.js --apply --cleanup --seed
  node scripts/seedDemoData.js --dry-run --cleanup --seed --full-demo-reset
  node scripts/seedDemoData.js --apply --cleanup --seed --full-demo-reset

Flags:
  --dry-run   Print the plan only. This is the default.
  --apply     Apply the printed plan. Required for any write/delete/archive.
  --cleanup   Plan cleanup of non-allowlisted Firestore accounts, old demo docs,
              and soft-archive existing non-demo clients.
  --seed      Plan creation of deterministic demo data.
  --full-demo-reset
              Requires --cleanup. Treat existing Firestore client/event/todo/
              notification docs as test/demo data and plan hard deletion before
              seeding. Programs, templates, and locations are preserved.
              Firebase Auth users and allowlisted accounts are never touched.

Credentials:
  Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service-account JSON file.
  Alternatively set FIREBASE_SERVICE_ACCOUNT_JSON to raw JSON or a JSON file path.

Safety:
  Firebase Auth users are never deleted.
  Allowlisted developer/admin account docs are never modified.
  Existing clients are soft-archived, not hard-deleted.
  With --full-demo-reset, existing clients are hard-deleted because the operator
  has explicitly confirmed the environment contains only test client data.
  Programs, program_templates, and locations are preserved in --full-demo-reset.
  Existing programs may only be updated to clear deleted participant references.
  Hard deletes are limited to docs marked:
    demo_seed: true
    demo_batch_id: "${DEMO_BATCH_ID}"
  except in --full-demo-reset, where every document in the client/event/todo/
  notification reset collections is printed and then deleted only when --apply
  is also present. Custom field definitions are still hard-deleted only when
  they carry the exact demo marker above.
`);
}

function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  const markdownMatch = value.match(/\[([^\]]+)\]\(mailto:[^)]+\)/i);
  const email = markdownMatch ? markdownMatch[1] : value.replace(/^mailto:/i, "");
  return email.trim().toLowerCase();
}

function assertSafeAllowlist() {
  const normalized = DEVELOPER_EMAIL_ALLOWLIST.map(normalizeEmail).filter(Boolean);
  const unique = new Set(normalized);

  if (normalized.length === 0 || unique.size !== 4) {
    throw new Error(
      "Refusing to run cleanup: developer email allowlist must contain exactly four unique emails.",
    );
  }

  for (const email of normalized) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Refusing to run cleanup: invalid allowlist email "${email}".`);
    }
  }

  return unique;
}

function readDotEnvProjectId() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return "";

  const text = fs.readFileSync(envPath, "utf8");
  const match = text.match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)$/m);
  return match ? match[1].trim() : "";
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (raw) {
    const maybePath = path.resolve(raw);
    const json = fs.existsSync(maybePath) ? fs.readFileSync(maybePath, "utf8") : raw;
    return JSON.parse(json);
  }

  if (credentialsPath) {
    return JSON.parse(fs.readFileSync(path.resolve(credentialsPath), "utf8"));
  }

  return null;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function postForm(url, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Token request failed (${res.statusCode}): ${data}`));
            return;
          }
          resolve(JSON.parse(data));
        });
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Request failed (${res.statusCode}): ${data}`));
            return;
          }
          resolve(data ? JSON.parse(data) : {});
        });
      },
    );

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${unsigned}.${signature}`;
  const token = await postForm(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  );

  return token.access_token;
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]),
  );
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}

function encodeFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)]),
  );
}

class FirestoreRest {
  constructor(projectId, accessToken) {
    this.projectId = projectId;
    this.accessToken = accessToken;
    this.root = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  docName(collectionName, docId) {
    return `projects/${this.projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  }

  async list(collectionName) {
    const docs = [];
    let pageToken = "";

    do {
      const url = new URL(`${this.root}/${collectionName}`);
      url.searchParams.set("pageSize", "300");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await requestJson(url, { headers: this.headers });
      for (const doc of response.documents || []) {
        docs.push({
          id: doc.name.split("/").pop(),
          name: doc.name,
          data: decodeFields(doc.fields || {}),
        });
      }
      pageToken = response.nextPageToken || "";
    } while (pageToken);

    return docs;
  }

  async commit(writes) {
    if (writes.length === 0) return;

    for (let i = 0; i < writes.length; i += 400) {
      const chunk = writes.slice(i, i + 400);
      await requestJson(
        `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:commit`,
        { method: "POST", headers: this.headers },
        { writes: chunk },
      );
    }
  }
}

function timestampDaysFromNow(days, hour = 10) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function dateDaysFromNow(days) {
  return timestampDaysFromNow(days).slice(0, 10);
}

function demoProgramData() {
  const programs = [
    {
      id: "demo_program_summer_journey",
      name: "Free Spirit Summer Journey",
      location: "Haifa, Israel",
      startOffset: -20,
      endOffset: 35,
      min_members: 6,
      max_members: 12,
      status: "Active",
    },
    {
      id: "demo_program_coastal_skills",
      name: "Coastal Skills Intensive",
      location: "Acre, Israel",
      startOffset: 10,
      endOffset: 42,
      min_members: 5,
      max_members: 10,
      status: "Upcoming",
    },
    {
      id: "demo_program_community_track",
      name: "Community Integration Track",
      location: "Jerusalem, Israel",
      startOffset: -8,
      endOffset: 60,
      min_members: 4,
      max_members: 8,
      status: "Active",
    },
    {
      id: "demo_program_winter_prep",
      name: "Winter Preparation Cohort",
      location: "Tel Aviv, Israel",
      startOffset: 80,
      endOffset: 125,
      min_members: 6,
      max_members: 15,
      status: "Upcoming",
    },
  ];

  return programs.map((program) => ({
    id: program.id,
    data: {
      ...DEMO_MARKER,
      template_id: `template_${program.id}`,
      name: program.name,
      batch: 1,
      description:
        "Demo program record for presentation: structured schedule, support goals, and participant progress.",
      start_date: timestampDaysFromNow(program.startOffset),
      end_date: timestampDaysFromNow(program.endOffset),
      location: program.location,
      min_members: program.min_members,
      max_members: program.max_members,
      participant_count: 0,
      participant_ids: [],
      status: program.status,
      created_at: timestampDaysFromNow(-45),
      updated_at: new Date().toISOString(),
    },
  }));
}

const CLIENT_FIXTURES = [
  ["maya", "Maya", "Levi", "registered", "female", "2002-04-12", "Jerusalem, Israel", ["demo_program_summer_journey", "demo_program_community_track"], true],
  ["jonah", "Jonah", "Cohen", "registered", "male", "1999-11-03", "Haifa, Israel", ["demo_program_summer_journey"], true],
  ["noa", "Noa", "Ben-Ami", "registered", "female", "2005-07-21", "Tel Aviv, Israel", ["demo_program_coastal_skills"], false],
  ["sam", "Sam", "Rosen", "registered", "other", "1997-02-18", "Beersheba, Israel", ["demo_program_summer_journey", "demo_program_coastal_skills", "demo_program_winter_prep"], true],
  ["elie", "Elie", "Mizrahi", "registered", "male", "2001-09-30", "Acre, Israel", ["demo_program_community_track"], true],
  ["rachel", "Rachel", "Gold", "registered", "female", "1995-06-14", "Netanya, Israel", ["demo_program_summer_journey"], false],
  ["tamar", "Tamar", "Shalev", "registered", "female", "2003-12-08", "Safed, Israel", ["demo_program_community_track"], true],
  ["avi", "Avi", "Mor", "invited", "male", "2000-03-25", "Ashdod, Israel", ["demo_program_coastal_skills"], false],
  ["lina", "Lina", "Katz", "invited", "female", "1998-08-10", "Jerusalem, Israel", ["demo_program_winter_prep"], true],
  ["or", "Or", "David", "invited", "other", "", "Haifa, Israel", [], false],
  ["yair", "Yair", "Peretz", "invited", "male", "2004-05-19", "Tiberias, Israel", ["demo_program_coastal_skills"], false],
  ["eden", "Eden", "Barak", "interested", "female", "2006-01-07", "Ramat Gan, Israel", [], false],
  ["liam", "Liam", "Stone", "interested", "male", "", "Eilat, Israel", [], false],
  ["shira", "Shira", "Harel", "interested", "female", "2002-10-28", "Jerusalem, Israel", ["demo_program_winter_prep"], true],
  ["adam", "Adam", "Naveh", "draft", "male", "", "Haifa, Israel", [], false],
  ["yael", "Yael", "Friedman", "draft", "female", "2001-01-23", "Rehovot, Israel", [], false],
];

function buildMedicalProfile(complete, firstName) {
  if (!complete) return {};

  return {
    allergies: [{ allergen: "Peanuts", reaction_severity: "Mild rash; carries antihistamine" }],
    medications: [{ name: "Vitamin D", dose: "1000 IU", frequency: "Daily", route: "Oral", condition: "Supplement" }],
    healthcare_providers: [
      {
        name: "Dr. Amir Kaplan",
        specialty: "Family Medicine",
        phone: "+972 50-123-4500",
        email: "clinic@example.org",
        facility: "Community Health Center",
        last_appt: dateDaysFromNow(-32),
      },
    ],
    dietary_restrictions: firstName === "Sam" ? "Vegetarian meals preferred." : "No special restrictions.",
    psychiatric_history: "Stable; no current restrictions noted for demo profile.",
    treatment_history_details: "Routine support check-ins recommended.",
    physical_accommodations: "None required.",
    general_accommodations: "Benefits from clear schedules and reminders.",
  };
}

function demoClientData() {
  return CLIENT_FIXTURES.map((fixture, index) => {
    const [slug, firstName, lastName, status, gender, dob, address, programIds, complete] = fixture;
    const clientId = `demo_client_${slug}`;
    const fullName = `${firstName} ${lastName}`;
    const createdOffset = -150 + index * 8;
    const phoneSuffix = String(1200 + index).padStart(4, "0");

    return {
      id: clientId,
      data: {
        ...DEMO_MARKER,
        first_name: firstName,
        last_name: lastName,
        email: `${slug}.${lastName.toLowerCase()}@demo.free-spirit.test`,
        phone: `+972 50-555-${phoneSuffix}`,
        status,
        passport_id: complete || status === "registered" ? `D${String(index + 10001)}` : "",
        gender,
        address,
        dob,
        referrer: ["Family referral", "Partner organization", "Social worker", "School counselor"][index % 4],
        education_status: ["high_school", "bachelor", "none", "master"][index % 4],
        program_ids: programIds,
        diagnosis: complete ? "Demo profile notes: support needs reviewed by intake team." : "",
        personal_notes:
          status === "interested"
            ? "Interested prospect. Needs follow-up call before invitation."
            : "Demo participant profile for presentation flow.",
        passport_country: "Israel",
        citizenship: "Israeli",
        date_of_entry: dateDaysFromNow(-18 + index),
        purpose_of_visit: "Program participation and community integration.",
        home_address: `${12 + index} Demo Street, ${address}`,
        household_members: complete ? "Lives with family; primary contact available by phone." : "",
        dependents: index % 5 === 0 ? [{ name: "Younger sibling", relationship: "sibling", dob: "2012-02-14" }] : [],
        medical_profile: buildMedicalProfile(complete, firstName),
        contacts: complete
          ? [
              {
                contact_name: `${lastName} Family Contact`,
                relationship: "parent",
                phone: `+972 52-555-${phoneSuffix}`,
                email: `family.${slug}@demo.free-spirit.test`,
                is_emergency_contact: true,
              },
            ]
          : [],
        questionnaire: complete
          ? {
              talents_and_skills: "Organized, thoughtful, and enjoys practical teamwork.",
              community_contribution: `${firstName} would like to help with shared meals and welcoming new participants.`,
              ideal_roommate: "Calm, respectful, and communicative.",
              favorite_foods: "Fresh salads, pasta, and fruit.",
              desired_activities: "Sailing, group cooking, city orientation, and skills workshops.",
              program_worries: "Adjusting to a new routine and meeting many people at once.",
              main_goals: "Build confidence, independence, and stronger community habits.",
              personal_challenge: "Asking for help early instead of waiting.",
              staff_assistance: "Clear schedules and brief check-ins after transitions.",
              main_strengths: "Warm communication and persistence.",
              passions: "Music, outdoor time, and helping others.",
              dream_jobs: "Community educator or support specialist.",
            }
          : {},
        legal_consents: complete
          ? {
              release_authorizing_person: `${firstName} ${lastName}`,
              authorized_agencies: ["Free Spirit demo staff", "Partner clinic"],
              info_to_disclose: "Attendance, emergency contact, and relevant support information.",
              release_reason: "Program coordination and participant care.",
              release_expiration_date: dateDaysFromNow(180),
              release_expiration_event: "End of demo program participation.",
              visit_waiver_child_name: fullName,
              visit_waiver_signatures: [`${firstName} ${lastName}`],
            }
          : {},
        client_documents: complete
          ? [
              {
                document_type: "passport",
                file_name: `${slug}-passport-demo.pdf`,
                file_url: "https://example.com/demo/passport-placeholder.pdf",
                uploaded_at: dateDaysFromNow(-20),
                manager_notes: "Demo metadata only; no real document.",
              },
            ]
          : [],
        custom_fields: {
          demo_preferred_language: index % 3 === 0 ? "Hebrew" : "English",
          demo_tshirt_size: ["S", "M", "L", "XL"][index % 4],
          demo_scholarship_approved: index % 4 === 0,
          demo_arrival_window: index % 2 === 0 ? "Morning" : "Afternoon",
        },
        stays:
          status === "registered"
            ? [
                {
                  arrivedAt: timestampDaysFromNow(-70 + index * 2),
                  departedAt: index % 3 === 0 ? timestampDaysFromNow(-15 + index) : null,
                },
              ]
            : [],
        is_archived: false,
        created_at: timestampDaysFromNow(createdOffset),
        updated_at: new Date().toISOString(),
      },
    };
  });
}

function demoCustomFieldDefinitions() {
  return [
    ["demo_cf_preferred_language", "Preferred language", "select", "profile", ["English", "Hebrew", "Spanish", "French"]],
    ["demo_cf_tshirt_size", "T-shirt size", "select", "profile", ["S", "M", "L", "XL"]],
    ["demo_cf_scholarship_approved", "Scholarship approved", "checkbox", "legal_consents", []],
    ["demo_cf_arrival_window", "Arrival window", "select", "questionnaire", ["Morning", "Afternoon", "Evening"]],
  ].map(([id, label, type, tab, options], index) => ({
    id,
    data: {
      ...DEMO_MARKER,
      id,
      label,
      type,
      tab,
      options,
      isCustom: true,
      active: true,
      hiddenFromManager: false,
      createdBy: "demo-seed-script",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedBy: null,
      order: Date.now() + index,
    },
  }));
}

function demoEventsAndNotifications(clients) {
  const eventFixtures = [
    ["demo_event_maya_intake", "demo_client_maya", "Maya Levi", "Intake follow-up", 1, "09:30", "scheduled"],
    ["demo_event_jonah_medical", "demo_client_jonah", "Jonah Cohen", "Medical review", 2, "11:00", "scheduled"],
    ["demo_event_noa_logistics", "demo_client_noa", "Noa Ben-Ami", "Travel logistics call", 4, "14:00", "scheduled"],
    ["demo_event_sam_readiness", "demo_client_sam", "Sam Rosen", "Program readiness check", 7, "10:15", "scheduled"],
    ["demo_event_elie_completed", "demo_client_elie", "Elie Mizrahi", "Completed intake meeting", -8, "13:00", "completed"],
    ["demo_event_rachel_cancelled", "demo_client_rachel", "Rachel Gold", "Rescheduled family call", -3, "16:30", "cancelled"],
  ];

  const events = eventFixtures.map(([id, clientId, clientName, title, offset, time, status]) => ({
    id,
    data: {
      ...DEMO_MARKER,
      type: "meeting",
      clientId,
      clientName,
      title,
      notes: "Demo meeting record for calendar, dashboard, and timeline views.",
      date: dateDaysFromNow(offset),
      time,
      status,
      priority: status === "scheduled" ? "high" : "normal",
      reminderMode: status === "scheduled" ? "preset" : null,
      reminderOption: status === "scheduled" ? "one_day_before" : null,
      meetingSummary: status === "completed" ? "Participant goals reviewed and next steps assigned." : "",
      createdAt: timestampDaysFromNow(offset - 6),
      updatedAt: new Date().toISOString(),
      authorName: "Demo Coordinator",
    },
  }));

  const notes = clients.slice(0, 10).map((client, index) => ({
    id: `demo_note_${client.id.replace("demo_client_", "")}`,
    data: {
      ...DEMO_MARKER,
      type: index % 3 === 0 ? "system" : "note",
      clientId: client.id,
      clientName: `${client.data.first_name} ${client.data.last_name}`,
      title: index % 3 === 0 ? "Client profile milestone" : "Coordinator note",
      content:
        index % 3 === 0
          ? "Demo milestone: profile reviewed and program next step recorded."
          : "Demo note: participant preferences and support plan discussed.",
      date: dateDaysFromNow(-12 + index),
      time: `${String(9 + (index % 7)).padStart(2, "0")}:00`,
      status: "note",
      priority: "normal",
      createdAt: timestampDaysFromNow(-12 + index),
      authorName: "Demo Coordinator",
    },
  }));

  const notifications = events
    .filter((event) => event.data.status === "scheduled")
    .map((event) => ({
      id: `${event.id}_reminder`,
      data: {
        ...DEMO_MARKER,
        eventId: event.id,
        clientId: event.data.clientId,
        clientName: event.data.clientName,
        title: event.data.title,
        type: "event_reminder",
        priority: event.data.priority,
        reminderMode: "preset",
        reminderOption: "one_day_before",
        reminderLabel: "1 day before",
        scheduledFor: timestampDaysFromNow(0, 8),
        message: `Reminder: ${event.data.title}`,
        status: "pending",
        statusLabel: "Waiting to be sent",
        channel: "system",
        channelLabel: "System reminder",
        createdAt: new Date().toISOString(),
      },
    }));

  return { events: [...events, ...notes], notifications };
}

function demoTodos(clients) {
  const todoFixtures = [
    ["Confirm passport upload", "demo_client_noa"],
    ["Review medication list", "demo_client_jonah"],
    ["Call emergency contact", "demo_client_or"],
    ["Finalize travel plan", "demo_client_avi"],
    ["Prepare welcome packet", null],
  ];

  return todoFixtures.map(([text, clientId], index) => ({
    id: `demo_todo_${index + 1}`,
    data: {
      ...DEMO_MARKER,
      text,
      title: text,
      completed: index === 1,
      clientId,
      createdAt: timestampDaysFromNow(-5 + index),
      updatedAt: new Date().toISOString(),
    },
  }));
}

function demoLocations() {
  return ["Haifa, Israel", "Acre, Israel", "Jerusalem, Israel", "Tel Aviv, Israel"].map(
    (name) => ({
      id: `demo_location_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_$/, "")}`,
      data: {
        ...DEMO_MARKER,
        name,
        createdAt: new Date().toISOString(),
      },
    }),
  );
}

function buildSeedPlan(existingPrograms = []) {
  const programs = [];
  const clients = demoClientData();
  const existingProgramIds = existingPrograms.map((program) => program.id).filter(Boolean);

  if (existingProgramIds.length > 0) {
    clients.forEach((client, index) => {
      const intendedProgramCount = Math.min(client.data.program_ids.length, existingProgramIds.length);
      client.data.program_ids = Array.from({ length: intendedProgramCount }, (_, offset) => {
        return existingProgramIds[(index + offset) % existingProgramIds.length];
      });
    });
  } else {
    clients.forEach((client) => {
      client.data.program_ids = [];
    });
  }

  const { events, notifications } = demoEventsAndNotifications(clients);

  return {
    programs,
    clients,
    events,
    notifications,
    todos: demoTodos(clients),
    customFields: demoCustomFieldDefinitions(),
  };
}

function getSeededParticipantIdsByProgram(seedPlan) {
  const participantIdsByProgram = new Map();

  if (!seedPlan) {
    return participantIdsByProgram;
  }

  for (const client of seedPlan.clients || []) {
    for (const programId of client.data.program_ids || []) {
      if (!participantIdsByProgram.has(programId)) {
        participantIdsByProgram.set(programId, []);
      }
      participantIdsByProgram.get(programId).push(client.id);
    }
  }

  return participantIdsByProgram;
}

function setFullResetProgramParticipantUpdates(cleanupPlan, seedPlan = null) {
  if (!cleanupPlan || !mode.fullDemoReset) return;

  const participantIdsByProgram = getSeededParticipantIdsByProgram(seedPlan);

  cleanupPlan.programUpdates = cleanupPlan.programKeeps.map((program) => {
    const participantIds = participantIdsByProgram.get(program.id) || [];

    return {
      program,
      data: {
        participant_ids: participantIds,
        participant_count: participantIds.length,
      },
    };
  });
}

function isDemoBatchDoc(doc) {
  return doc.data.demo_seed === true && doc.data.demo_batch_id === DEMO_BATCH_ID;
}

function collectEmails(value, emails = []) {
  if (typeof value === "string") {
    const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    matches.forEach((email) => emails.push(normalizeEmail(email)));
    return emails;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectEmails(item, emails));
    return emails;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectEmails(item, emails));
  }

  return emails;
}

function hasAllowlistedEmail(data, allowlist) {
  return collectEmails(data).some((email) => allowlist.has(email));
}

function isRelatedToDeletedClientOrEvent(doc, deletedClientIds, deletedEventIds) {
  const data = doc.data || {};
  const possibleClientIds = [data.clientId, data.client_id, data.clientID].filter(Boolean);
  const possibleEventIds = [data.eventId, data.event_id, data.eventID].filter(Boolean);

  return (
    possibleClientIds.some((clientId) => deletedClientIds.has(String(clientId))) ||
    possibleEventIds.some((eventId) => deletedEventIds.has(String(eventId)))
  );
}

async function buildCleanupPlan(firestore, allowlist) {
  const collections = {};
  for (const collectionName of CLEANUP_COLLECTIONS_TO_SCAN) {
    collections[collectionName] = await firestore.list(collectionName);
  }

  const accountDeletes = [];
  const protectedAccounts = [];
  for (const account of collections.accounts || []) {
    const email = normalizeEmail(account.data.email);
    if (allowlist.has(email)) {
      protectedAccounts.push(account);
    } else {
      accountDeletes.push(account);
    }
  }

  const clientArchives = mode.fullDemoReset
    ? []
    : (collections.clients || []).filter(
        (client) => !isDemoBatchDoc(client) && client.data.is_archived !== true,
      );

  const demoDeletes = [];
  const deletedClientIds = new Set();
  const deletedEventIds = new Set();

  if (mode.fullDemoReset) {
    for (const client of collections.clients || []) {
      deletedClientIds.add(client.id);
      demoDeletes.push({ collectionName: "clients", doc: client });
    }

    for (const event of collections.events || []) {
      deletedEventIds.add(event.id);
      demoDeletes.push({ collectionName: "events", doc: event });
    }

    for (const collectionName of ["automatic_notifications", "notifications", "todos"]) {
      for (const doc of collections[collectionName] || []) {
        if (isRelatedToDeletedClientOrEvent(doc, deletedClientIds, deletedEventIds)) {
          demoDeletes.push({ collectionName, doc });
        }
      }
    }

    for (const fieldDefinition of collections.client_field_definitions || []) {
      if (isDemoBatchDoc(fieldDefinition)) {
        demoDeletes.push({ collectionName: "client_field_definitions", doc: fieldDefinition });
      }
    }
  } else {
    for (const collectionName of DEMO_COLLECTIONS_TO_DELETE) {
      for (const doc of collections[collectionName] || []) {
        if (isDemoBatchDoc(doc)) {
          demoDeletes.push({ collectionName, doc });
        }
      }
    }
  }

  const programKeeps = collections.programs || [];
  const programUpdates = [];

  return {
    protectedAccounts,
    accountDeletes,
    clientArchives,
    demoDeletes,
    programKeeps,
    programUpdates,
  };
}

function assertSafeMutationPlan(cleanupPlan, allowlist) {
  if (!cleanupPlan) return;

  const protectedDeletes = cleanupPlan.accountDeletes.filter((account) =>
    allowlist.has(normalizeEmail(account.data.email)),
  );

  if (protectedDeletes.length > 0) {
    const refs = protectedDeletes
      .map((account) => `accounts/${account.id} ${account.data.email || "(no email)"}`)
      .join(", ");
    throw new Error(`Refusing to apply: allowlisted account appeared in delete plan: ${refs}`);
  }

  const mutationDocs = [
    ...cleanupPlan.accountDeletes.map((doc) => ({ action: "DELETE", ref: `accounts/${doc.id}`, data: doc.data })),
    ...cleanupPlan.clientArchives.map((doc) => ({ action: "ARCHIVE", ref: `clients/${doc.id}`, data: doc.data })),
    ...cleanupPlan.demoDeletes.map(({ collectionName, doc }) => ({
      action: "DELETE",
      ref: `${collectionName}/${doc.id}`,
      data: doc.data,
    })),
    ...cleanupPlan.programUpdates.map(({ program, data }) => ({
      action: "UPDATE",
      ref: `programs/${program.id}`,
      data,
    })),
  ];

  for (const mutation of mutationDocs) {
    if (hasAllowlistedEmail(mutation.data, allowlist)) {
      throw new Error(
        `Refusing to continue: allowlisted developer email appears in ${mutation.action} plan for ${mutation.ref}.`,
      );
    }
  }

  const forbiddenDeletes = cleanupPlan.demoDeletes.filter(({ collectionName }) =>
    ["programs", "program_templates", "locations"].includes(collectionName),
  );

  if (forbiddenDeletes.length > 0) {
    const refs = forbiddenDeletes
      .map(({ collectionName, doc }) => `${collectionName}/${doc.id}`)
      .join(", ");
    throw new Error(`Refusing to apply: forbidden delete plan includes preserved collection docs: ${refs}`);
  }

  if (mode.fullDemoReset) {
    const staleParticipantUpdates = cleanupPlan.programUpdates.filter(({ data }) => {
      return (data.participant_ids || []).some((clientId) => !String(clientId).startsWith("demo_client_"));
    });

    if (staleParticipantUpdates.length > 0) {
      const refs = staleParticipantUpdates
        .map(({ program, data }) => `programs/${program.id}: ${JSON.stringify(data.participant_ids)}`)
        .join(", ");
      throw new Error(
        `Refusing to continue: full-demo-reset program participant updates contain non-demo client IDs: ${refs}`,
      );
    }
  }
}

function printPlan({ projectId, credentialStatus, cleanupPlan, seedPlan }) {
  console.log("Demo data preparation plan");
  console.log("==========================");
  console.log(`Mode: ${mode.apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Project: ${projectId || "unknown"}`);
  console.log(`Credential status: ${credentialStatus}`);
  console.log(`Demo batch: ${DEMO_BATCH_ID}`);
  console.log(`Full demo reset: ${mode.fullDemoReset ? "yes" : "no"}`);
  console.log("");

  console.log("Developer/admin allowlist");
  for (const email of DEVELOPER_EMAIL_ALLOWLIST) {
    console.log(`  KEEP account email: ${normalizeEmail(email)}`);
  }
  console.log("  Firebase Auth users: never deleted by this script");
  console.log("");

  if (mode.cleanup) {
    console.log(mode.fullDemoReset ? "Full demo reset cleanup plan" : "Cleanup plan");
    if (mode.fullDemoReset) {
      console.log("  Delete-from collections:");
      FULL_DEMO_RESET_COLLECTIONS_TO_DELETE.forEach((collectionName) => {
        console.log(`    ${collectionName}`);
      });
      console.log("  Preserved collections:");
      ["programs", "program_templates", "locations"].forEach((collectionName) => {
        console.log(`    ${collectionName}`);
      });
      console.log("  client_field_definitions are preserved unless marked with the exact demo batch marker.");
      console.log("  Existing clients and events will be hard-deleted in this mode.");
      console.log("  Existing programs will be kept; participant references may be updated.");
      console.log("  Firebase Auth users will not be deleted.");
    }
    if (!cleanupPlan) {
      console.log("  Live Firestore inventory not available. No cleanup writes can be planned.");
    } else {
      if (mode.fullDemoReset) {
        console.log(`  Programs to keep: ${cleanupPlan.programKeeps.length}`);
        cleanupPlan.programKeeps.forEach((program) => {
          console.log(`    KEEP programs/${program.id} "${program.data.name || "Unnamed Program"}"`);
        });
      }

      console.log(`  Protected allowlisted account docs: ${cleanupPlan.protectedAccounts.length}`);
      cleanupPlan.protectedAccounts.forEach((account) => {
        console.log(`    KEEP accounts/${account.id} ${account.data.email || "(no email)"}`);
      });

      console.log(`  Firestore account docs to delete: ${cleanupPlan.accountDeletes.length}`);
      cleanupPlan.accountDeletes.forEach((account) => {
        console.log(`    DELETE accounts/${account.id} ${account.data.email || "(no email)"}`);
      });

      if (mode.fullDemoReset) {
        console.log("  Existing clients to soft archive: 0 (full reset hard-deletes clients instead)");
      } else {
        console.log(`  Existing non-demo clients to soft archive: ${cleanupPlan.clientArchives.length}`);
        cleanupPlan.clientArchives.forEach((client) => {
          const name = [client.data.first_name, client.data.last_name].filter(Boolean).join(" ");
          console.log(`    ARCHIVE clients/${client.id} ${name || "(unnamed client)"}`);
        });
      }

      console.log(
        mode.fullDemoReset
          ? `  Existing reset-collection docs to hard delete: ${cleanupPlan.demoDeletes.length}`
          : `  Existing demo-batch docs to hard delete: ${cleanupPlan.demoDeletes.length}`,
      );
      cleanupPlan.demoDeletes.forEach(({ collectionName, doc }) => {
        console.log(`    DELETE ${collectionName}/${doc.id}`);
      });

      if (mode.fullDemoReset) {
        console.log(`  Program participant reference updates: ${cleanupPlan.programUpdates.length}`);
        cleanupPlan.programUpdates.forEach(({ program, data }) => {
          console.log(
            `    UPDATE programs/${program.id} participant_ids=${JSON.stringify(
              data.participant_ids,
            )} participant_count=${data.participant_count}`,
          );
        });
      }
    }
    console.log("");
  }

  if (mode.seed && seedPlan) {
    console.log("Seed plan");
    console.log(`  Programs to create/update: ${seedPlan.programs.length}`);
    seedPlan.programs.forEach((program) => {
      console.log(
        `    UPSERT programs/${program.id} "${program.data.name}" (${program.data.participant_count} participants)`,
      );
    });

    console.log(`  Clients to create/update: ${seedPlan.clients.length}`);
    seedPlan.clients.forEach((client) => {
      console.log(
        `    UPSERT clients/${client.id} ${client.data.first_name} ${client.data.last_name} ` +
          `[${client.data.status}] programs=${client.data.program_ids.length}`,
      );
    });

    console.log(`  Client field definitions to create/update: ${seedPlan.customFields.length}`);
    seedPlan.customFields.forEach((field) => {
      console.log(`    UPSERT client_field_definitions/${field.id} "${field.data.label}"`);
    });

    console.log(`  Events/timeline records to create/update: ${seedPlan.events.length}`);
    seedPlan.events.forEach((event) => {
      console.log(`    UPSERT events/${event.id} "${event.data.title}" [${event.data.status}]`);
    });

    console.log(`  Reminder/invite notification docs to create/update: ${seedPlan.notifications.length}`);
    seedPlan.notifications.forEach((notification) => {
      console.log(`    UPSERT automatic_notifications/${notification.id} "${notification.data.title}"`);
    });

    console.log(`  Todos to create/update: ${seedPlan.todos.length}`);
    seedPlan.todos.forEach((todo) => {
      console.log(`    UPSERT todos/${todo.id} "${todo.data.title}"`);
    });

    console.log("");
  }

  if (!mode.apply) {
    console.log("No changes were made. Re-run with --apply to perform the exact printed plan.");
  }
}

function upsertWrite(firestore, collectionName, item) {
  return {
    update: {
      name: firestore.docName(collectionName, item.id),
      fields: encodeFields(item.data),
    },
  };
}

function updateMaskWrite(doc, data) {
  return {
    update: {
      name: doc.name,
      fields: encodeFields(data),
    },
    updateMask: {
      fieldPaths: Object.keys(data),
    },
  };
}

async function applyPlan(firestore, cleanupPlan, seedPlan) {
  const writes = [];

  if (mode.cleanup && cleanupPlan) {
    for (const account of cleanupPlan.accountDeletes) {
      writes.push({ delete: account.name });
    }

    for (const client of cleanupPlan.clientArchives) {
      writes.push(
        updateMaskWrite(client, {
          is_archived: true,
          archived_by_demo_cleanup: true,
          demo_cleanup_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      );
    }

    for (const { doc } of cleanupPlan.demoDeletes) {
      writes.push({ delete: doc.name });
    }

    for (const { program, data } of cleanupPlan.programUpdates) {
      writes.push(updateMaskWrite(program, data));
    }
  }

  if (mode.seed && seedPlan) {
    seedPlan.programs.forEach((item) => writes.push(upsertWrite(firestore, "programs", item)));
    seedPlan.clients.forEach((item) => writes.push(upsertWrite(firestore, "clients", item)));
    seedPlan.customFields.forEach((item) =>
      writes.push(upsertWrite(firestore, "client_field_definitions", item)),
    );
    seedPlan.events.forEach((item) => writes.push(upsertWrite(firestore, "events", item)));
    seedPlan.notifications.forEach((item) =>
      writes.push(upsertWrite(firestore, "automatic_notifications", item)),
    );
    seedPlan.todos.forEach((item) => writes.push(upsertWrite(firestore, "todos", item)));
  }

  console.log(`Applying ${writes.length} Firestore writes/deletes...`);
  await firestore.commit(writes);
  console.log("Apply complete. Firebase Auth users were not touched.");
}

async function main() {
  if (mode.help) {
    printHelp();
    return;
  }

  if (!mode.cleanup && !mode.seed) {
    printHelp();
    throw new Error("Choose at least one of --cleanup or --seed.");
  }

  if (mode.fullDemoReset && !mode.cleanup) {
    throw new Error("--full-demo-reset requires --cleanup.");
  }

  if (mode.fullDemoReset && mode.apply && !mode.seed) {
    throw new Error("--full-demo-reset with --apply requires --seed.");
  }

  const allowlist = assertSafeAllowlist();
  const serviceAccount = loadServiceAccount();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    serviceAccount?.project_id ||
    readDotEnvProjectId() ||
    "";

  if (!projectId) {
    throw new Error("Could not determine Firebase project ID.");
  }

  let seedPlan = null;
  let cleanupPlan = null;
  let firestore = null;
  let credentialStatus = serviceAccount
    ? "service account configured"
    : "missing service account; live Firestore inventory skipped";

  if (serviceAccount) {
    const accessToken = await getAccessToken(serviceAccount);
    firestore = new FirestoreRest(projectId, accessToken);
    cleanupPlan = mode.cleanup ? await buildCleanupPlan(firestore, allowlist) : null;
  }

  if (mode.seed) {
    const existingPrograms = cleanupPlan?.programKeeps || (firestore ? await firestore.list("programs") : []);
    seedPlan = buildSeedPlan(existingPrograms);
  }

  setFullResetProgramParticipantUpdates(cleanupPlan, seedPlan);
  assertSafeMutationPlan(cleanupPlan, allowlist);
  printPlan({ projectId, credentialStatus, cleanupPlan, seedPlan });

  if (mode.apply) {
    if (!serviceAccount || !firestore) {
      throw new Error("Refusing --apply without service account credentials.");
    }
    assertSafeMutationPlan(cleanupPlan, allowlist);
    await applyPlan(firestore, cleanupPlan, seedPlan);
  }
}

main().catch((error) => {
  console.error("");
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
