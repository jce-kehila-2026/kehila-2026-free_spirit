import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/firebase/firebase";
import { getFirestoreDb } from "@/firebase/clientDbService";
import type {
  ClientFieldDefinition,
  CustomFieldTab,
  CustomFieldType,
} from "@/schema/customFieldSchema";

const COLLECTION_NAME = "client_field_definitions";

export interface CreateClientFieldDefinitionInput {
  label: string;
  type: CustomFieldType;
  tab: CustomFieldTab;
  options?: string[];
}

export interface UpdateClientFieldDefinitionInput {
  label: string;
  tab: CustomFieldTab;
  options?: string[];
}

function normalizeOptions(type: CustomFieldType, options?: string[]) {
  if (type !== "select") {
    return [];
  }

  return Array.from(
    new Set(
      (options ?? [])
        .map((option) => option.trim())
        .filter(Boolean),
    ),
  );
}

function mapDefinition(id: string, data: Record<string, unknown>): ClientFieldDefinition {
  return {
    id,
    label: typeof data.label === "string" ? data.label : "",
    type: data.type as CustomFieldType,
    tab: typeof data.tab === "string" ? (data.tab as CustomFieldTab) : "profile",
    options: Array.isArray(data.options)
      ? data.options.filter((option): option is string => typeof option === "string")
      : [],
    isCustom: true,
    active: data.active === true,
    hiddenFromManager: data.hiddenFromManager === true,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletedAt: data.deletedAt ?? null,
    deletedBy: typeof data.deletedBy === "string" ? data.deletedBy : null,
    order: typeof data.order === "number" ? data.order : 0,
  };
}

export async function getActiveClientFieldDefinitions(): Promise<ClientFieldDefinition[]> {
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), COLLECTION_NAME),
      where("active", "==", true),
    ),
  );

  return snapshot.docs
    .map((fieldDoc) => mapDefinition(fieldDoc.id, fieldDoc.data()))
    .sort((a, b) => a.order - b.order);
}

export async function getAllClientFieldDefinitionsForAdmin(): Promise<ClientFieldDefinition[]> {
  const snapshot = await getDocs(
    query(collection(getFirestoreDb(), COLLECTION_NAME), orderBy("order", "asc")),
  );

  return snapshot.docs.map((fieldDoc) => mapDefinition(fieldDoc.id, fieldDoc.data()));
}

export async function createClientFieldDefinition(
  data: CreateClientFieldDefinitionInput,
): Promise<void> {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("You must be signed in to create client fields.");
  }

  const definitionRef = doc(collection(getFirestoreDb(), COLLECTION_NAME));
  const label = data.label.trim();

  await setDoc(definitionRef, {
    id: definitionRef.id,
    label,
    type: data.type,
    tab: data.tab,
    options: normalizeOptions(data.type, data.options),
    isCustom: true,
    active: true,
    hiddenFromManager: false,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
    deletedBy: null,
    order: Date.now(),
  });
}

export async function updateClientFieldDefinition(
  fieldId: string,
  data: UpdateClientFieldDefinitionInput,
): Promise<void> {
  const label = data.label.trim();

  await updateDoc(doc(getFirestoreDb(), COLLECTION_NAME, fieldId), {
    label,
    tab: data.tab,
    options: normalizeOptions("select", data.options),
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteClientFieldDefinition(fieldId: string): Promise<void> {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("You must be signed in to deactivate client fields.");
  }

  await updateDoc(doc(getFirestoreDb(), COLLECTION_NAME, fieldId), {
    active: false,
    updatedAt: serverTimestamp(),
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
  });
}

export async function reactivateClientFieldDefinition(fieldId: string): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), COLLECTION_NAME, fieldId), {
    active: true,
    hiddenFromManager: false,
    updatedAt: serverTimestamp(),
    deletedAt: null,
    deletedBy: null,
  });
}

export async function hideClientFieldDefinition(fieldId: string): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), COLLECTION_NAME, fieldId), {
    hiddenFromManager: true,
    updatedAt: serverTimestamp(),
  });
}
