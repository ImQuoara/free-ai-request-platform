export const NOTIFICATION_TYPES = [
  'NEW_REQUEST',
  'REQUESTER_REPLY',
  'ACCEPTED_ACTION',
  'COMPLETED_UNPUBLISHED',
  'ABUSE_FLAG',
  'ACCESS_ISSUE',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationRow = {
  type: NotificationType;
  read_at: string | null;
};

export type NotificationCounts = {
  unread: number;
  newRequests: number;
  replies: number;
  acceptedAction: number;
  completedUnpublished: number;
  abuseFlags: number;
};

export function notificationCounts(rows: NotificationRow[]): NotificationCounts {
  const unreadRows = rows.filter((row) => !row.read_at);
  const count = (type: NotificationType) => unreadRows.filter((row) => row.type === type).length;
  return {
    unread: unreadRows.length,
    newRequests: count('NEW_REQUEST'),
    replies: count('REQUESTER_REPLY'),
    acceptedAction: count('ACCEPTED_ACTION'),
    completedUnpublished: count('COMPLETED_UNPUBLISHED'),
    abuseFlags: count('ABUSE_FLAG'),
  };
}
