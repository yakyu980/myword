-- ============================================================
-- סאמר תיקונים · סכמת Supabase למתקנת של MyWord v2
-- משלים את schema.sql (qa_runs / qa_bugs / qa_screenshots) — לא נוגע בו.
-- הרץ קובץ זה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================

-- דיאלוג סאמר ↔ מרקוס (תיעוד "השיחה" שבה סאמר שואלת איך לתקן נכון)
create table if not exists summer_marcus_chat (
  id              uuid primary key default gen_random_uuid(),
  bug_fingerprint text,                       -- הבאג שעליו השיחה (null = כללי)
  run_id          uuid,                        -- ריצת מרקוס הרלוונטית (אם יש)
  sender          text not null,               -- summer | marcus
  kind            text not null default 'note',-- question | answer | note | handoff
  message         text not null,
  created_at      timestamptz not null default now()
);

-- תיקון בודד שסאמר ביצעה (חוצה ריצות — מקושר ל-qa_bugs דרך fingerprint)
create table if not exists summer_fixes (
  id                uuid primary key default gen_random_uuid(),
  fingerprint       text not null,             -- אותו מזהה יציב כמו ב-qa_bugs
  bug_id            uuid references qa_bugs(id) on delete set null,
  scenario          text,
  severity          text,                      -- critical|high|medium|low
  what_broke        text,                      -- תקציר מה היה שבור
  root_cause        text,                      -- למה זה קרה
  fix_summary       text,                      -- מה סאמר שינתה
  code_location     text,                      -- פונקציה / סלקטור שנגעו בו
  verified_by_marcus boolean not null default false,
  marcus_run_id     uuid,                      -- ריצת מרקוס שהוכיחה ירוק
  status            text not null default 'applied', -- proposed|applied|verified|reverted
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- לקח כללי שסאמר למדה ("כדי שהקוד הבא לא יחזור על הטעות")
create table if not exists summer_lessons (
  id                  uuid primary key default gen_random_uuid(),
  fingerprint         text not null,           -- slug ייחודי ללקח (דה-דופ בין ריצות)
  category            text,                    -- pagination|free-obj|a11y|ux|paste|table|...
  lesson              text not null,           -- הלקח עצמו
  future_rule         text,                    -- הכלל לעתיד (איך למנוע מראש)
  source_bug          text,                    -- fingerprint של הבאג שלימד
  applied_to_agent_md boolean not null default false, -- האם נכתב לסעיף "כללים שלמדתי"
  created_at          timestamptz not null default now()
);

create index if not exists summer_chat_fp_idx     on summer_marcus_chat (bug_fingerprint);
create index if not exists summer_fixes_fp_idx    on summer_fixes (fingerprint);
create index if not exists summer_lessons_fp_idx  on summer_lessons (fingerprint);
