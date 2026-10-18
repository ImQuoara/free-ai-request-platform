-- Trigger-only SECURITY DEFINER functions must never be exposed as RPC endpoints.
revoke execute on function public.owner_notify_request_events() from public, anon, authenticated;
revoke execute on function public.owner_notify_requester_reply() from public, anon, authenticated;
revoke execute on function public.owner_notify_abuse_attempt() from public, anon, authenticated;
revoke execute on function public.sync_public_activity_status() from public, anon, authenticated;
