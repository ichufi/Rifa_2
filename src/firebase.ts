import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, memoryLocalCache, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence Firestore network and connection warnings to prevent cosmetic circular structure logs
setLogLevel('silent');

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings for better connectivity in iframe environments
// We use memoryLocalCache() to avoid common iframe issues with blocked IndexedDB
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(),
  ignoreUndefinedProperties: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function safeJsonStringify(obj: any): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    });
  } catch (err) {
    return `[Serialization Error: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.warn('Firestore Error Handled: ', safeJsonStringify(errInfo));
  // We explicitly do not throw here because uncaught errors in async/subscription contexts
  // can trigger sandbox environment global handlers that crash when serializing circular dependencies.
}

export async function testConnection() {
  try {
    // Attempting to read a non-existent test document to verify connectivity
    await getDocFromServer(doc(db, 'artifacts', 'test-connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: client is offline.");
    }
  }
}
