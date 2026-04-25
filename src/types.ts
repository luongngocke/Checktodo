export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface LocationData {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  lastSeen?: string;
  isOnline?: boolean;
  currentLocation?: LocationData;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  createdAt: string;
  createdBy: string; // admin userId
}

export interface LocationHistory {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

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
