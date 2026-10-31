// Runs only against ephemeral local Postgres with synthetic records.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_TEST_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
const student = '20000000-0000-4000-8000-000000000001';
const fields = ['school', 'traits', 'parent_requirements', 'school_context'];
const notes = '原有备注\n保留第二行。';
const content = { state: '课堂观察。', level: '学习记录。', guidance: '复习基础。', supplement: '', plan: '继续练习。' };
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
async function role(name, id = '') { await db.exec(`reset role; set role ${name};`); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]); }
async function rejects(fn, code) { await assert.rejects(fn, error => error.code === code); checks++; }
try {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid; $$;
    grant usage on schema auth to authenticated, anon, service_role;
    grant execute on function auth.uid() to authenticated, anon, service_role;`);
  await db.exec(await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
  await db.exec(await fs.readFile(new URL('../lesson-deletion.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users values ($1::uuid), ($2::uuid)', [owner, other]);
  await db.query('insert into public.app_owner values (true, $1::uuid)', [owner]);
  await role('authenticated', owner);
  await db.query("insert into public.students(id, name, grade, notes) values ($1::uuid, '测试学生', '七年级', $2)", [student, notes]);
  const before = await one('select * from public.students where id=$1::uuid', [student]);
  const lesson = (await one('select to_jsonb(public.save_lesson($1::jsonb,null,\'{}\')) as value', [JSON.stringify({ student_id: student, lesson_date: '2026-10-01', content: '测试课堂', knowledge_updates: [] })])).value;
  const report = (await one('select to_jsonb(public.save_monthly_report($1::uuid,\'2026-10-01\',\'2026-10-31\',$2::jsonb)) as value', [student, JSON.stringify(content)])).value;
  await db.exec('reset role');
  const migrationNames = (await fs.readdir(new URL('../migrations/', import.meta.url))).filter(name => name.endsWith('_student_profile_details.sql'));
  assert.equal(migrationNames.length, 1);
  const migration = await fs.readFile(new URL('../migrations/' + migrationNames[0], import.meta.url), 'utf8');
  await db.exec(migration); await db.exec(migration);
  await role('authenticated', owner);
  const after = await one('select * from public.students where id=$1::uuid', [student]);
  for (const field of fields) check(after[field] === '', `${field} defaults to empty on old rows`);
  assert.deepEqual(Object.fromEntries(Object.entries(after).filter(([key]) => !fields.includes(key))), before); checks++;
  check((await one('select to_jsonb(r) as value from public.monthly_reports r where id=$1::uuid', [report.id])).value.snapshot.student.school === undefined, 'old report snapshot is not backfilled');
  await db.query('update public.students set school=$2,traits=$3,parent_requirements=$4,school_context=$5 where id=$1::uuid', [student, '测试学校', '慢热，愿意提问。', '关注学习习惯。', '校内正在复习。']);
  const saved = await one('select * from public.students where id=$1::uuid', [student]);
  check(saved.school === '测试学校' && saved.traits === '慢热，愿意提问。' && saved.parent_requirements === '关注学习习惯。' && saved.school_context === '校内正在复习。', 'four fields save independently');
  check(saved.notes === notes, 'profile update preserves notes exactly');
  for (const field of fields) await rejects(() => db.query(`update public.students set ${field}=$2 where id=$1::uuid`, [student, '字'.repeat(field === 'school' ? 121 : 2001)]), '23514');
  await db.query("update public.students set goal='旧客户端保存目标' where id=$1::uuid", [student]);
  check((await one('select traits from public.students where id=$1::uuid', [student])).traits === saved.traits, 'old client updates do not clear profile details');
  const newReport = (await one('select to_jsonb(public.save_monthly_report($1::uuid,\'2026-10-01\',\'2026-10-15\',$2::jsonb)) as value', [student, JSON.stringify(content)])).value;
  check(newReport.snapshot.student.school === saved.school, 'new snapshot records the current profile');
  assert.deepEqual((await one('select to_jsonb(r) as value from public.monthly_reports r where id=$1::uuid', [report.id])).value, report); checks++;
  await db.query('update public.students set archived=true where id=$1::uuid', [student]);
  await rejects(() => db.query('select public.save_lesson($1::jsonb,$2::timestamptz,\'{}\')', [JSON.stringify({ ...lesson, feedback: '修改反馈', knowledge_updates: [] }), lesson.updated_at]), '22023');
  check((await one('select count(*)::int as n from public.lessons where id=$1::uuid', [lesson.id])).n === 1, 'archived history remains readable');
  await role('authenticated', other);
  check((await db.query('select school,traits,parent_requirements,school_context from public.students')).rows.length === 0, 'other account cannot read new fields');
  check((await db.query("update public.students set traits='无权改动' returning id")).rows.length === 0, 'other account cannot update new fields');
  await role('anon'); await rejects(() => db.query('select school from public.students'), '42501');
  console.log(`Student profile migration/compatibility/RLS checks passed: ${checks}`);
} finally { await db.close(); }
