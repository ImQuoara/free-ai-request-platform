import type { RequestStatus, RequestType } from './requests';

type PublicProjectionSource = {
  public_id: string;
  request_type: RequestType | string;
  status: RequestStatus | string;
  created_at: string;
};

export type PublicActivityProjection = {
  public_id: string;
  request_type: string;
  public_status: string;
  created_date: string;
  safe_title: string | null;
};

export function toPublicActivity(source: PublicProjectionSource, safeTitle: string | null): PublicActivityProjection {
  return {
    public_id: source.public_id,
    request_type: source.request_type,
    public_status: source.status,
    created_date: source.created_at.slice(0, 10),
    safe_title: safeTitle,
  };
}
