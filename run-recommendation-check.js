require('dotenv').config();
const { PrismaClient, Prisma } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const emailA = 'test_a@inje.ac.kr';
  const emailB = 'test_b@inje.ac.kr';

  const userA = await prisma.user.findUnique({ where: { email: emailA } });
  const userB = await prisma.user.findUnique({ where: { email: emailB } });
  if (!userA || !userB) {
    console.error('Test users not found');
    process.exit(1);
  }
  console.log(`UserA id=${userA.id}, gender=${userA.gender}`);
  console.log(`UserB id=${userB.id}, gender=${userB.gender}`);

  // get deal_breakers selected by A, only mapped labels
  const dealBreakers = await prisma.$queryRaw`
    SELECT k.keyword_id, k.label
    FROM user_keyword_selections uks
    JOIN keywords k ON uks.keyword_id = k.keyword_id
    JOIN categories c ON k.category_id = c.category_id
    WHERE uks.user_id = ${userA.id} AND c.category_code = 'deal_breakers'
  `;
  console.log('A dealbreakers:', dealBreakers.map(d=>d.label));
  const mappedLabels = ['Smoking','Heavy Drinking'];
  const mapped = dealBreakers.filter(d=> mappedLabels.includes(d.label));

  // get keyword ids for mapped labels (dealbreaker keyword ids)
  const dispreferredIds = mapped.map(d=>d.keyword_id);

  // map to about-me keyword ids
  const additional = [];
  if (mapped.some(d=>d.label==='Smoking')) {
    const res = await prisma.$queryRaw`
      SELECT k.keyword_id FROM keywords k
      JOIN categories c ON k.category_id = c.category_id
      WHERE c.category_code = 'smoking' AND k.label = 'Smoker' LIMIT 1
    `;
    if (res.length>0) additional.push(res[0].keyword_id);
  }
  if (mapped.some(d=>d.label==='Heavy Drinking')) {
    const res = await prisma.$queryRaw`
      SELECT k.keyword_id FROM keywords k
      JOIN categories c ON k.category_id = c.category_id
      WHERE c.category_code = 'drinking' AND k.label = 'Social'
    `;
    for(const r of res) additional.push(r.keyword_id);
  }

  const excludeKeywordIds = [...dispreferredIds, ...additional];
  console.log('excludeKeywordIds:', excludeKeywordIds);

  // query candidate users matching basic filters and NOT EXISTS bad keywords
  const candidates = await prisma.$queryRawUnsafe(`
    SELECT u.id FROM users u
    WHERE u.status='active' AND u.onboarding_completed = true
      AND u.gender != $1
      AND u.id != $2
      AND NOT EXISTS (
        SELECT 1 FROM user_keyword_selections bad_uks
        WHERE bad_uks.user_id = u.id AND bad_uks.keyword_id IN (${excludeKeywordIds.length>0?excludeKeywordIds.join(','):'-1'})
      )
    LIMIT 100
  `, userA.gender, userA.id);

  const candidateIds = candidates.map(r=>r.id);
  console.log('Candidate IDs sample:', candidateIds.slice(0,20));
  console.log('Is B included?', candidateIds.includes(userB.id));

  await prisma.$disconnect();
}

main().catch(e=>{console.error(e);process.exit(1)});
