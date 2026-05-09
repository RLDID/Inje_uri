const normalizeComparableDepartment = (value: string) => (
  value
    .trim()
    .replace(/[·ㆍ・∙]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
);

export const INJE_DEPARTMENTS = [
  '의예과ㆍ의학과',
  '간호학과',
  '경찰ㆍ행정학과',
  '법학과',
  '보건행정학과',
  '사회복지학과',
  '상담심리치료학과',
  '유아교육과',
  '특수교육과',
  '사회과학계열',
  '공공인재학부',
  '소비자ㆍ가족학과',
  '경영학부',
  '글로벌경영학과',
  '경영계열',
  '국제경상학부',
  '글로컬리더스학부',
  '자유전공학부',
  '멀티미디어학과',
  '문화콘텐츠학과',
  '미디어커뮤니케이션학과',
  '웹툰영상학과',
  '음악학과',
  '미디어ㆍ콘텐츠계열',
  '건축학과',
  '기계ㆍ전기차공학과',
  '반도체ㆍ전자공학부',
  '소방방재학과',
  '실내건축학과',
  '전기ㆍ배터리공학과',
  '융합기술공학과',
  '공학계열',
  '건설환경공학부',
  '나노융합공학부',
  '미래에너지공학과',
  '산업경영공학과',
  '전자IT기계자동차공학부',
  '컴퓨터디자인과',
  'AI소프트웨어학과',
  '게임학과',
  '스마트물류학과',
  '컴퓨터공학과',
  '컴퓨터ㆍAI계열',
  '드론IoT시뮬레이션학부',
  '통계학과',
  '물리치료학과',
  '반려동물보건학과',
  '방사선학과',
  '보건안전공학과',
  '스포츠헬스케어학부',
  '식품영양ㆍ식품공학부',
  '응급구조학과',
  '의공학과',
  '의료IT학과',
  '의생명공학과',
  '임상병리학과',
  '작업치료학과',
  '의생명보건계열',
  '방사선화학과',
  '약학과',
  '혁신신약ㆍ제약공학부',
  '혁신신약ㆍ제약공학계열',
  'AI컴퓨터학과',
  '국제경영학과',
  '글로벌자유전공학과',
  '기계융합공학과',
  '뷰티산업융합학과',
  '한국어교육학과',
  '국제어문학부',
  '인문문화학부',
  '글로벌스포츠코칭전공',
  '한국어교육학전공',
  '건강처방학전공',
  '경찰행정학전공',
  '원자력응용공학전공',
  '마케팅전략기획전공',
  '소방재난관리전공',
  '인당글로벌리더스전공',
  '펫푸드전공',
  '보조공학전공',
  '임상시험연구전공',
  'AI반도체융합전공',
] as const;

const DEPARTMENT_ALIASES: Record<string, string> = {
  의예: '의예과ㆍ의학과',
  의예과: '의예과ㆍ의학과',
  의학: '의예과ㆍ의학과',
  의학과: '의예과ㆍ의학과',
  간호: '간호학과',
  경찰행정: '경찰ㆍ행정학과',
  경찰: '경찰ㆍ행정학과',
  행정: '경찰ㆍ행정학과',
  법학: '법학과',
  보건행정: '보건행정학과',
  사회복지: '사회복지학과',
  상담심리: '상담심리치료학과',
  심리: '상담심리치료학과',
  유교: '유아교육과',
  유아교육: '유아교육과',
  특수교육: '특수교육과',
  사회과학: '사회과학계열',
  공공인재: '공공인재학부',
  소비자가족: '소비자ㆍ가족학과',
  경영: '경영학부',
  글로벌경영: '글로벌경영학과',
  국제경상: '국제경상학부',
  글로컬리더스: '글로컬리더스학부',
  자유전공: '자유전공학부',
  멀티미디어: '멀티미디어학과',
  문화콘텐츠: '문화콘텐츠학과',
  미컴: '미디어커뮤니케이션학과',
  미디어커뮤니케이션: '미디어커뮤니케이션학과',
  웹툰영상: '웹툰영상학과',
  음악: '음악학과',
  미디어콘텐츠: '미디어ㆍ콘텐츠계열',
  건축: '건축학과',
  기계전기차: '기계ㆍ전기차공학과',
  반도체전자: '반도체ㆍ전자공학부',
  소방방재: '소방방재학과',
  실내건축: '실내건축학과',
  전기배터리: '전기ㆍ배터리공학과',
  융합기술: '융합기술공학과',
  공학: '공학계열',
  건설환경: '건설환경공학부',
  나노융합: '나노융합공학부',
  미래에너지: '미래에너지공학과',
  산업경영: '산업경영공학과',
  전자it기계자동차: '전자IT기계자동차공학부',
  컴퓨터디자인: '컴퓨터디자인과',
  소프트웨어: 'AI소프트웨어학과',
  소웨: 'AI소프트웨어학과',
  ai소프트웨어: 'AI소프트웨어학과',
  게임: '게임학과',
  스마트물류: '스마트물류학과',
  컴공: '컴퓨터공학과',
  컴퓨터공학: '컴퓨터공학과',
  컴퓨터ai: '컴퓨터ㆍAI계열',
  드론iot시뮬레이션: '드론IoT시뮬레이션학부',
  통계: '통계학과',
  물치: '물리치료학과',
  물리치료: '물리치료학과',
  반려동물보건: '반려동물보건학과',
  방사선: '방사선학과',
  보건안전: '보건안전공학과',
  스포츠헬스케어: '스포츠헬스케어학부',
  식품영양: '식품영양ㆍ식품공학부',
  식품공학: '식품영양ㆍ식품공학부',
  응급구조: '응급구조학과',
  의공: '의공학과',
  의료it: '의료IT학과',
  의생명: '의생명공학과',
  임상병리: '임상병리학과',
  작업치료: '작업치료학과',
  의생명보건: '의생명보건계열',
  방사선화학: '방사선화학과',
  약학: '약학과',
  제약공학: '혁신신약ㆍ제약공학부',
  혁신신약제약공학: '혁신신약ㆍ제약공학부',
  ai컴퓨터: 'AI컴퓨터학과',
  글로벌자유전공: '글로벌자유전공학과',
  기계융합: '기계융합공학과',
  뷰티산업융합: '뷰티산업융합학과',
  한국어교육: '한국어교육학과',
  국제어문: '국제어문학부',
  인문문화: '인문문화학부',
} as const;

export function findCanonicalDepartment(value: string): string {
  const normalizedValue = normalizeComparableDepartment(value);
  if (!normalizedValue) {
    return '';
  }

  const exactDepartment = INJE_DEPARTMENTS.find((department) => (
    normalizeComparableDepartment(department) === normalizedValue
  ));

  if (exactDepartment) {
    return exactDepartment;
  }

  return DEPARTMENT_ALIASES[normalizedValue] ?? '';
}

export function getDepartmentSuggestions(query: string, limit = 8): string[] {
  const normalizedQuery = normalizeComparableDepartment(query);

  if (!normalizedQuery) {
    return INJE_DEPARTMENTS.slice(0, limit);
  }

  const aliasMatches = Object.entries(DEPARTMENT_ALIASES)
    .filter(([alias]) => alias.includes(normalizedQuery) || normalizedQuery.includes(alias))
    .map(([, department]) => department);
  const exactAndPrefixMatches = INJE_DEPARTMENTS.filter((department) => {
    const normalizedDepartment = normalizeComparableDepartment(department);
    return normalizedDepartment === normalizedQuery || normalizedDepartment.startsWith(normalizedQuery);
  });
  const includeMatches = INJE_DEPARTMENTS.filter((department) => (
    normalizeComparableDepartment(department).includes(normalizedQuery)
  ));

  return [...new Set([
    ...aliasMatches,
    ...exactAndPrefixMatches,
    ...includeMatches,
  ])].slice(0, limit);
}
