-- PCBDukaan update 015: security tightening from the site security check.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- Internal helper (used by the review trigger) – not callable from the website API.
revoke all on function public.review_display_name(uuid) from public, anon, authenticated;

-- Size and file-type limits on upload areas that had none (the website already checks
-- these; the database now enforces them too, so nobody can bypass the website to upload
-- huge or unexpected files).
update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
  where id = 'pcb-repairs';      -- repair photos: 10 MB, images only
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  where id = 'resumes';          -- CVs: 5 MB, PDF / Word only
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','video/mp4','video/webm','video/quicktime']
  where id = 'product-images';   -- product/banner photos and videos (admin only): 50 MB
