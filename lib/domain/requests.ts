export const REQUEST_STATUSES = [
  'NEW',
  'ACCEPTED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'PUBLISHED',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestType = 'Song' | 'Landing Page' | 'Other';

const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  NEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS', 'REJECTED'],
  REJECTED: ['NEW'],
  IN_PROGRESS: ['COMPLETED', 'REJECTED'],
  COMPLETED: ['PUBLISHED', 'IN_PROGRESS'],
  PUBLISHED: ['COMPLETED'],
};

export function canTransitionRequest(from: RequestStatus, to: RequestStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export type PrivateRequestSummary = {
  id: string;
  publicId: string;
  requestType: RequestType;
  status: RequestStatus;
  createdAt: string;
};

export type StatusTransitionRpcError = {
  code: 'ILLEGAL_TRANSITION' | 'NO_SPOTS_AVAILABLE' | 'PROJECT_NOT_FOUND' | 'STATUS_UPDATE_FAILED';
  status: 404 | 409 | 500;
};

export function mapStatusTransitionRpcError(message: string): StatusTransitionRpcError {
  if (message.includes('no_spots_available')) return { code: 'NO_SPOTS_AVAILABLE', status: 409 };
  if (message.includes('invalid_status_transition')) return { code: 'ILLEGAL_TRANSITION', status: 409 };
  if (message.includes('request_not_found')) return { code: 'PROJECT_NOT_FOUND', status: 404 };
  return { code: 'STATUS_UPDATE_FAILED', status: 500 };
}
