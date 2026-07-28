-- ============================================================
-- מרקוס וורד · סכמת Supabase ל-QA של MyWord v2
-- הרץ קובץ זה ב-Supabase → SQL Editor → New query → Run
-- ============================================================

-- ריצת בדיקה אחת (כל הרצה של marcus.mjs)
create table if not exists qa_runs (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  app_version   text,                       -- hash/תאריך של MyWord-v2.html
  total_tests   int    not null default 0,
  passed        int    not null default 0,
  failed        int    not null default 0,
  px_per_cm     numeric,                    -- כיול הדפדפן בעת הריצה
  console_errors int   not null default 0,
  summary       text,
  meta          jsonb  not null default '{}'::jsonb
);

-- באג / ממצא בודד (חוצה ריצות — מרקוס "זוכר" ומשתפר)
create table if not exists qa_bugs (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references qa_runs(id) on delete cascade,
  fingerprint   text not null,              -- מזהה יציב לאותו באג בין ריצות
  scenario      text not null,              -- שם התרחיש שחשף את הבאג
  severity      text not null default 'medium', -- critical|high|medium|low
  rule          text,                       -- חוק הדף שהופר (PAGE_RULES §)
  title         text not null,
  detail        text,
  element_info  jsonb,                      -- top/bottom בס"מ, page band, overlap
  word_compare  text,                       -- "איך Word פותר את זה" — לקח להשתפרות
  status        text not null default 'open',   -- open|fixed|known|wontfix
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

-- צילום מסך לכל תרחיש
create table if not exists qa_screenshots (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references qa_runs(id) on delete cascade,
  scenario      text not null,
  local_path    text,                       -- נתיב בדיסק (qa/screenshots/...)
  storage_path  text,                       -- נתיב ב-Supabase Storage (אם הועלה)
  public_url    text,
  passed        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists qa_bugs_fingerprint_idx on qa_bugs (fingerprint);
create index if not exists qa_bugs_run_idx on qa_bugs (run_id);
create index if not exists qa_screens_run_idx on qa_screenshots (run_id);

-- ============================================================
-- (אופציונלי) Storage bucket לצילומי מסך:
-- Supabase → Storage → New bucket → name: "qa-screenshots" → Public
-- ============================================================
