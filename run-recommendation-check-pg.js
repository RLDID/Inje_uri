require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const emailA = 'test_a@inje.ac.kr';
  const emailB = 'test_b@inje.ac.kr';

  const ua = await client.query('SELECT id, gender FROM users WHERE email=$1', [emailA]);
  const ub = await client.query('SELECT id, gender FROM users WHERE email=$1', [emailB]);
  if (ua.rowCount === 0 || ub.rowCount === 0) {
    console.error('users not found');
    process.exit(1);
  }
  const userA = ua.rows[0];
  const userB = ub.rows[0];
  console.log('UserA', userA);
  console.log('UserB', userB);

  const dbDeal = await client.query(`
    SELECT k.keyword_id, k.label
    FROM user_keyword_selections uks
    JOIN keyword k ON uks.keyword_id = k.keyword_id
    JOIN categories c ON k.category_id = c.category_id
    WHERE uks.user_id = $1 AND c.category_code = 'deal_breakers'
  `, [userA.id]);
  console.log('A dealbreakers:', dbDeal.rows.map(r=>r.label));

  const mappedLabels = ['Smoking','Heavy Drinking'];
  const mapped = dbDeal.rows.filter(r => mappedLabels.includes(r.label));

  const dispreferredIds = mapped.map(r=>r.keyword_id);
  const additional = [];
  if (mapped.some(r=>r.label==='Smoking')) {
    const res = await client.query(`SELECT k.keyword_id FROM keyword k JOIN categories c ON k.category_id=c.category_id WHERE c.category_code='smoking' AND k.label='Smoker' LIMIT 1`);
    if (res.rowCount>0) additional.push(res.rows[0].keyword_id);
  }
  if (mapped.some(r=>r.label==='Heavy Drinking')) {
    const res = await client.query(`SELECT k.keyword_id FROM keyword k JOIN categories c ON k.category_id=c.category_id WHERE c.category_code='drinking' AND k.label='Social'`);
    for(const row of res.rows) additional.push(row.keyword_id);
  }

  const excludeKeywordIds = [...dispreferredIds, ...additional];
  console.log('excludeKeywordIds', excludeKeywordIds);

  const candidates = await client.query(`
    SELECT u.id FROM users u
    WHERE u.status='active' AND u.onboarding_completed = true
      AND u.gender != $1
      AND u.id != $2
      AND NOT EXISTS (
        SELECT 1 FROM user_keyword_selections bad_uks
        WHERE bad_uks.user_id = u.id AND bad_uks.keyword_id = ANY($3::int[])
      )
    LIMIT 100
  `, [userA.gender, userA.id, excludeKeywordIds.length>0?excludeKeywordIds:[-1]]);

  const candidateIds = candidates.rows.map(r=>r.id);
  console.log('candidateIds sample:', candidateIds.slice(0,20));
  console.log('Is B included?', candidateIds.includes(userB.id));

  await client.end();
}

main().catch(e=>{console.error(e);process.exit(1)});
