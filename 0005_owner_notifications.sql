create or replace function public.owner_notify_request_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (type, request_public_id, title, detail)
    values ('NEW_REQUEST', new.public_id, 'New request', new.request_type || ' request ' || new.public_id);
    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'ACCEPTED' then
      insert into public.notifications (type, request_public_id, title, detail)
      values ('ACCEPTED_ACTION', new.public_id, 'Accepted project needs action', new.request_type || ' · ' || new.public_id);
    elsif new.status = 'COMPLETED' then
      insert into public.notifications (type, request_public_id, title, detail)
      values ('COMPLETED_UNPUBLISHED', new.public_id, 'Completed project awaiting publish decision', new.request_type || ' · ' || new.public_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists owner_notify_request_events_trigger on public.requests;
create trigger owner_notify_request_events_trigger
after insert or update of status on public.requests
for each row execute function public.owner_notify_request_events();

create or replace function public.owner_notify_requester_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public_id text;
begin
  if new.sender_role <> 'requester' then
    return new;
  end if;

  select public_id into v_public_id from public.requests where id = new.request_id;
  insert into public.notifications (type, request_public_id, title, detail)
  values ('REQUESTER_REPLY', v_public_id, 'Requester reply', 'New private reply on ' || coalesce(v_public_id, 'project'));
  return new;
end;
$$;

drop trigger if exists owner_notify_requester_reply_trigger on public.request_messages;
create trigger owner_notify_requester_reply_trigger
after insert on public.request_messages
for each row execute function public.owner_notify_requester_reply();

create or replace function public.owner_notify_abuse_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.outcome in ('flagged', 'verification_failed') then
    insert into public.notifications (type, title, detail)
    values ('ABUSE_FLAG', 'Submission protection flag', left(coalesce(new.reason, new.outcome), 1000));
  end if;
  return new;
end;
$$;

drop trigger if exists owner_notify_abuse_attempt_trigger on public.submission_attempts;
create trigger owner_notify_abuse_attempt_trigger
after insert on public.submission_attempts
for each row execute function public.owner_notify_abuse_attempt();
