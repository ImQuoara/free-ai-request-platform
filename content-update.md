# Content & Gallery Updates

There are two intentionally separate public-content paths.

## 1. Static owner-created showcase content

`data/works.json` is the simple manual content source. It is useful for your own finished work, examples, or launch placeholders that are not tied to a requester record.

Supported item shape:

```json
{
  "id": "unique-public-id",
  "kind": "audio",
  "title": "Public title",
  "description": "Public-safe description",
  "date": "2026-10-17",
  "demo": false,
  "previewUrl": "https://public.example/media.mp3",
  "thumbnailUrl": "https://public.example/cover.jpg",
  "publicUrl": "https://public.example/result"
}
```

`kind` must be one of: `audio`, `video`, `image`, `website`, `other`.

Rules:

1. Use only intentionally public URLs.
2. Never paste requester email, Discord, full prompt, private references, private messages, delivery links, risk flags, or owner notes into this file.
3. Keep `demo: true` for placeholder/example cards that are not actual finished work.
4. Use unique stable IDs because public-link analytics use the work ID.
5. Review the diff before committing and redeploying.

The home page uses owner-published database showcase items when at least one exists. `data/works.json` is the fallback gallery when no database showcase item is published.

## 2. Requester work — owner dashboard only

Requester work must **not** be published by copying the private request into `works.json`.

Use the private owner project page instead:

1. Open the request in `/admin/requests/[requestId]`.
2. Confirm the work is complete and the requester supplied the required showcase/credit consent at submission.
3. Decide separately whether anonymous request activity should be public.
4. Decide separately whether the finished work should be added to the public gallery.
5. Write a new **public-safe** title and description. Do not reuse a private prompt blindly.
6. Add only intentionally public HTTPS asset/result URLs.
7. Save publication controls.
8. Visit the public page logged out and verify only the intended safe fields are visible.

Publishing a finished work item does not make the private request, private thread, requester contact information, or owner notes public.

## Safe public request activity

If enabled by the owner, the public activity projection can contain only:

- anonymous public request ID;
- request type;
- safe public status;
- date;
- optional owner-written safe title.

The requester-facing form merely grants the owner permission to **consider** showcase use. Submission itself never automatically publishes anything.

## Daily operating loop

1. Set available spots/open state in `/admin/settings`.
2. Review new private submissions in `/admin`.
3. Accept only the projects you want; an accepted request consumes a configured spot atomically.
4. Work and communicate in the private one-to-one thread.
5. Add approved public delivery/result links only when ready.
6. Mark complete.
7. Make a separate publication decision.
8. Reuse the approved finished result in TikTok/Shorts/X, linking back to the site.
9. Update static `works.json` only for content that is not better represented by the owner-controlled requester publication path.
