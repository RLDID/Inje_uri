'use client';

import type { ReactNode, UIEvent } from 'react';
import { FormEvent, startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';
import { findCanonicalDepartment, getDepartmentSuggestions } from '@/lib/departments';
import { PROFILE_CATEGORIES, type KeywordSelectionPayload, type ProfileCategoryCode } from '@/lib/types';

type RegisterStep = 'consent' | 'verify' | 'account' | 'nickname' | 'academic' | 'private' | 'categories';
type Gender = 'male' | 'female';
type ConsentKey = 'terms' | 'privacy' | 'thirdParty' | 'profileDisclosure' | 'adult';
type AgreementKey = Exclude<ConsentKey, 'adult'>;

interface InjeCheckResponse {
  success?: boolean;
  data?: {
    nextStep?: 'login' | 'register';
  };
  error?: {
    message?: string;
  };
}

interface RegisterApiResponse {
  success?: boolean;
  data?: {
    nextPath?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

interface RegisterFormState {
  loginId: string;
  password: string;
  nickname: string;
  birth: string;
  age: string;
  studentYear: string;
  department: string;
  gender: Gender;
  realName: string;
  email: string;
  university: string;
}

const INITIAL_FORM_STATE: RegisterFormState = {
  loginId: '',
  password: '',
  nickname: '',
  birth: '',
  age: '',
  studentYear: '',
  department: '',
  gender: 'male',
  realName: '',
  email: '',
  university: '인제대학교',
};

const PASSWORD_SPECIAL_CHARACTER_PATTERN = /[^\p{L}\p{N}\s]/u;
const AGE_OPTIONS = Array.from({ length: 11 }, (_, index) => String(index + 20));
const STUDENT_YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => String(index + 1));
const WHEEL_ITEM_HEIGHT = 48;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_SETTLE_TIMEOUT_MS = 850;
const REGISTER_REQUIRED_CONSENT_STORAGE_KEY = 'injeuri:register-required-consent';
const REQUIRED_CONSENT_KEYS: ConsentKey[] = ['terms', 'privacy', 'thirdParty', 'profileDisclosure', 'adult'];
const AGREEMENT_KEYS: AgreementKey[] = ['terms', 'privacy', 'thirdParty', 'profileDisclosure'];
const EMPTY_CONSENTS: Record<ConsentKey, boolean> = {
  terms: false,
  privacy: false,
  thirdParty: false,
  profileDisclosure: false,
  adult: false,
};

const ALL_CONSENTS: Record<ConsentKey, boolean> = {
  terms: true,
  privacy: true,
  thirdParty: true,
  profileDisclosure: true,
  adult: true,
};

const AGREEMENT_DOCUMENTS: Record<AgreementKey, { title: string; label: string; summary: string; body: string }> = {
  terms: {
    title: '서비스 이용약관',
    label: '서비스 이용약관 동의',
    summary: '인제우리 서비스 이용 조건을 확인합니다.',
    body: `서비스 이용약관

제1조 목적

본 약관은 인제우리(이하 “서비스”)가 제공하는 본교 구성원 인증, 프로필, 추천, 호감, 매칭, 채팅, 피드, 댓글, 신고 및 차단 기능의 이용 조건과 이용자 및 서비스의 권리·의무를 정하는 것을 목적으로 합니다.

제2조 서비스의 내용

서비스는 인제대학교 구성원을 대상으로 다음 기능을 제공합니다.

1. 본교 구성원 인증
2. 회원가입 및 계정 관리
3. 프로필 작성 및 공개
4. 이용자 추천 기능
5. 호감 보내기 및 매칭 기능
6. 매칭된 이용자 간 채팅 기능
7. 피드 및 댓글 기능
8. 신고, 차단 및 이용 제한 기능
9. 기타 서비스 운영자가 정하는 기능

제3조 회원가입 및 계정 관리

1. 이용자는 서비스가 정한 절차에 따라 회원가입을 신청할 수 있습니다.
2. 이용자는 회원가입 시 정확한 정보를 입력해야 하며, 타인의 이름, 학번, 생년월일, 이메일 등 개인정보를 이용하여 가입할 수 없습니다.
3. 이용자는 자신의 계정 정보를 안전하게 관리해야 하며, 계정 도용 또는 무단 사용이 의심되는 경우 즉시 서비스에 알려야 합니다.
4. 허위 정보, 타인 명의, 도용 정보로 가입한 경우 서비스 이용이 제한될 수 있습니다.

제4조 프로필 및 게시물

1. 이용자는 서비스 이용을 위해 닉네임, 성별, 학과, 학년, 학번 일부, 자기소개, 프로필 이미지 등 프로필 정보를 등록할 수 있습니다.
2. 이용자가 작성한 프로필, 피드, 댓글, 채팅 메시지 등은 서비스 기능 제공을 위해 필요한 범위에서 다른 이용자에게 표시될 수 있습니다.
3. 이용자는 타인의 권리, 명예, 사생활을 침해하거나 불쾌감을 줄 수 있는 내용을 작성해서는 안 됩니다.
4. 서비스는 신고, 법령 위반, 약관 위반, 운영정책 위반이 확인되는 경우 해당 콘텐츠를 숨김, 삭제 또는 제한할 수 있습니다.

제5조 금지행위

이용자는 다음 행위를 해서는 안 됩니다.

1. 타인의 개인정보 또는 계정을 도용하는 행위
2. 허위 정보로 가입하거나 프로필을 작성하는 행위
3. 타인에게 불쾌감, 모욕감, 성적 수치심, 위협을 주는 행위
4. 욕설, 비방, 명예훼손, 차별, 혐오 표현을 게시하는 행위
5. 타인의 개인정보를 무단으로 수집, 저장, 공개 또는 유포하는 행위
6. 스토킹, 지속적 연락, 괴롭힘 등 타인의 평온한 서비스 이용을 방해하는 행위
7. 음란물, 불법 촬영물, 폭력적 콘텐츠, 불법 정보 등을 게시하거나 전송하는 행위
8. 영리 목적의 광고, 홍보, 스팸, 사기성 메시지를 발송하는 행위
9. 서비스의 정상적인 운영을 방해하는 행위
10. 기타 법령, 본 약관 또는 운영정책에 위반되는 행위

제6조 신고, 차단 및 이용 제한

1. 이용자는 부적절한 프로필, 게시물, 댓글, 채팅 메시지 또는 이용자를 신고하거나 차단할 수 있습니다.
2. 서비스는 신고 내용을 검토한 후 필요한 경우 게시물 삭제, 경고, 일시 정지, 영구 이용 제한 등의 조치를 할 수 있습니다.
3. 서비스는 부정 가입, 계정 도용, 반복 신고, 악성 이용, 타인에게 피해를 주는 행위가 확인되는 경우 사전 통지 없이 이용을 제한할 수 있습니다.
4. 이용 제한 조치에 이의가 있는 이용자는 서비스가 정한 절차에 따라 이의를 제기할 수 있습니다.

제7조 서비스의 변경 및 중단

1. 서비스는 운영상, 기술상 필요에 따라 서비스의 일부 또는 전부를 변경하거나 중단할 수 있습니다.
2. 서비스는 중요한 변경 또는 중단이 있는 경우 가능한 범위에서 사전에 공지합니다.
3. 긴급한 보안 문제, 시스템 장애, 법령상 필요가 있는 경우 사전 공지 없이 서비스가 일시 중단될 수 있습니다.

제8조 개인정보 보호

서비스는 이용자의 개인정보를 관련 법령 및 개인정보 처리방침에 따라 처리합니다. 개인정보의 수집, 이용, 보관, 파기, 제3자 제공 등에 관한 사항은 개인정보 수집·이용 동의 및 개인정보 처리방침에서 정합니다.

제9조 책임 제한

1. 서비스는 천재지변, 시스템 장애, 통신망 장애, 이용자의 귀책사유 등 서비스의 책임 없는 사유로 발생한 손해에 대해 책임을 지지 않습니다.
2. 이용자 간 발생한 분쟁은 당사자 간 해결을 원칙으로 하며, 서비스는 신고 처리, 이용 제한 등 운영상 필요한 조치를 할 수 있습니다.
3. 서비스는 이용자가 작성한 프로필, 게시물, 댓글, 채팅 내용의 정확성이나 신뢰성을 보증하지 않습니다.

제10조 회원 탈퇴

1. 이용자는 언제든지 회원 탈퇴를 요청할 수 있습니다.
2. 회원 탈퇴 시 서비스는 관련 법령 및 개인정보 처리방침에 따라 개인정보를 삭제 또는 보관합니다.
3. 신고, 제재, 분쟁 대응, 부정 이용 방지를 위해 필요한 정보는 정해진 기간 동안 보관될 수 있습니다.

제11조 약관의 변경

1. 서비스는 필요한 경우 본 약관을 변경할 수 있습니다.
2. 변경된 약관은 서비스 내 공지 또는 별도 안내를 통해 고지합니다.
3. 변경 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.

본인은 위 서비스 이용약관을 확인하였으며 이에 동의합니다.`,
  },
  privacy: {
    title: '개인정보 수집·이용 동의',
    label: '개인정보 수집·이용 동의',
    summary: '회원가입, 본교 인증, 계정 관리, 프로필 표시, 매칭·채팅 제공을 위한 개인정보 수집·이용 내용을 확인합니다.',
    body: `개인정보 수집·이용 동의

인제우리 운영팀(이하 “서비스”)은 회원가입, 본교 구성원 인증, 계정 관리, 프로필 표시, 추천·매칭·채팅 기능 제공, 신고·차단 및 부정 이용 방지를 위하여 아래와 같이 개인정보를 수집·이용합니다.

1. 본교 구성원 인증 및 중복 가입 방지

수집 항목:
- 학번
- 생년월일 6자리
- 생년월일 해시값
- 본교 인증 여부

이용 목적:
- 인제대학교 구성원 여부 확인
- 회원가입 자격 확인
- 중복 가입 방지
- 타인 학번을 이용한 부정 가입 방지
- 계정 복구 또는 본인 확인이 필요한 경우의 인증 보조

보유 및 이용 기간:
- 회원 탈퇴 시까지
- 단, 부정 가입 및 재가입 방지를 위한 최소 식별 정보는 회원 탈퇴 후 1년간 보관할 수 있습니다.

공개 여부:
- 전체 학번과 생년월일은 다른 이용자에게 공개되지 않습니다.
- 프로필에는 전체 학번이 아닌 학번 일부 또는 입학연도 형태의 정보만 표시될 수 있습니다.

2. 계정 생성 및 로그인 관리

수집 항목:
- 아이디
- 비밀번호 해시값
- 이메일
- 이름
- 계정 상태
- 가입 일시
- 마지막 활동 일시

이용 목적:
- 회원 계정 생성
- 로그인 및 인증
- 비밀번호 재설정
- 계정 관련 중요 안내
- 계정 도용 및 타인 명의 가입 방지
- 회원 식별 및 계정 관리

보유 및 이용 기간:
- 회원 탈퇴 시까지
- 단, 부정 이용, 신고 처리, 분쟁 대응이 필요한 경우 관련 기록은 회원 탈퇴 후 1년간 보관할 수 있습니다.

공개 여부:
- 이름, 이메일, 비밀번호 및 비밀번호 해시값은 다른 이용자에게 공개되지 않습니다.

3. 프로필 표시 및 이용자 간 매칭

수집 항목:
- 닉네임
- 나이
- 성별
- 학교
- 학과
- 학년
- 학번 일부 또는 입학연도
- 자기소개
- 프로필 이미지
- 성향 및 선호 키워드

성향 및 선호 키워드에는 다음 항목이 포함될 수 있습니다.
- 라이프스타일
- 음주 여부
- 흡연 여부
- MBTI
- 성격 키워드
- 대화 스타일
- 관심사
- 원하는 만남 분위기
- 선호하는 데이트 스타일
- 피하고 싶은 조건

이용 목적:
- 프로필 생성 및 표시
- 이용자 간 구분
- 추천 상대 제공
- 호감 보내기 및 매칭 기능 제공
- 채팅 기능 제공
- 피드 및 댓글 기능 제공

보유 및 이용 기간:
- 회원 탈퇴 시까지
- 이용자가 직접 수정 또는 삭제한 정보는 수정·삭제 시점 이후 서비스 화면에서 더 이상 표시되지 않습니다.
- 단, 신고·분쟁 처리와 관련된 정보는 처리 완료 후 1년간 보관할 수 있습니다.

공개 여부:
- 닉네임, 나이, 성별, 학교, 학과, 학년, 학번 일부 또는 입학연도, 자기소개, 프로필 이미지, 성향 및 선호 키워드는 다른 이용자에게 표시될 수 있습니다.
- 이름, 전체 학번, 생년월일, 이메일은 프로필에 표시되지 않습니다.

4. 추천, 호감, 매칭 및 채팅 기능 제공

수집 항목:
- 추천 상대 생성 기록
- 추천 상대 확인 기록
- 호감 전송 기록
- 호감 수신 기록
- 매칭 성사 여부
- 매칭 일시
- 채팅방 참여 정보
- 메시지 내용
- 메시지 작성 일시
- 메시지 읽음 정보
- 채팅방 퇴장 또는 만료 정보

이용 목적:
- 추천 기능 제공
- 호감 보내기 및 수신 확인
- 매칭 성사 처리
- 채팅방 생성 및 메시지 전달
- 채팅방 상태 관리
- 서비스 이용 내역 확인
- 신고 및 분쟁 대응

보유 및 이용 기간:
- 회원 탈퇴 시까지
- 단, 신고·분쟁 처리와 관련된 대화 또는 기록은 처리 완료 후 1년간 보관할 수 있습니다.

공개 여부:
- 채팅 메시지는 해당 채팅방 참여자에게 표시됩니다.
- 호감 및 매칭 정보는 관련 이용자에게 표시될 수 있습니다.

5. 피드, 댓글 및 이미지 기능 제공

수집 항목:
- 피드 작성 내용
- 피드 이미지
- 피드 키워드
- 댓글 내용
- 작성자 정보
- 작성 일시
- 피드 조회 기록

이용 목적:
- 피드 작성 및 표시
- 댓글 작성 및 표시
- 이미지 표시
- 피드 조회수 관리
- 신고 및 분쟁 대응
- 부정 이용 방지

보유 및 이용 기간:
- 회원 탈퇴 시까지
- 이용자가 직접 삭제한 피드, 댓글, 이미지는 삭제 시점 이후 서비스 화면에서 더 이상 표시되지 않습니다.
- 단, 신고·분쟁 처리와 관련된 정보는 처리 완료 후 1년간 보관할 수 있습니다.

공개 여부:
- 피드, 댓글, 피드 이미지, 작성자의 닉네임, 성별, 프로필 이미지, 학과, 학년 등 일부 프로필 정보는 다른 이용자에게 표시될 수 있습니다.

6. 신고, 차단 및 안전 관리

수집 항목:
- 신고한 이용자 정보
- 신고 대상 정보
- 신고 유형
- 신고 상세 내용
- 신고 처리 상태
- 차단한 이용자 정보
- 차단 대상 이용자 정보
- 차단 사유
- 전화번호 기반 차단 기능 사용 시 전화번호 해시값

이용 목적:
- 신고 접수 및 처리
- 차단 기능 제공
- 부정 이용 방지
- 이용자 보호
- 서비스 이용 제한 및 제재
- 분쟁 대응

보유 및 이용 기간:
- 신고, 차단 및 제재 기록은 처리 완료일 또는 회원 탈퇴일 중 늦은 날로부터 1년간 보관할 수 있습니다.
- 전화번호 기반 차단 정보는 이용자가 차단을 해제하거나 회원 탈퇴 시 삭제합니다.

공개 여부:
- 신고자 정보는 신고 대상자에게 공개되지 않습니다.
- 차단 여부는 서비스 기능 작동을 위해 필요한 범위에서만 처리됩니다.

7. 서비스 운영 및 보안 관리

수집 항목:
- 접속 기록
- 세션 토큰 해시값
- 인증 쿠키 정보
- 서비스 이용 기록
- 화면 방문 및 주요 버튼 클릭 등 서비스 이용 이벤트
- 기기 및 브라우저 정보
- 서비스 분석 도구가 생성하는 익명 기기 식별자
- 세션 재생, 히트맵 등 사용성 분석 정보
- 오류 기록
- 계정 상태
- 탈퇴 일시

이용 목적:
- 로그인 상태 유지
- 비정상 접근 탐지
- 서비스 이용 통계 분석
- 기능 개선 및 사용성 확인
- 화면 흐름 및 사용 불편 지점 확인
- 서비스 오류 확인
- 보안 관리
- 부정 이용 방지
- 서비스 안정성 확보

보유 및 이용 기간:
- 접속 기록 및 보안 관련 기록은 수집일로부터 3개월간 보관할 수 있습니다.
- 서비스 이용 통계 분석 기록은 서비스 분석 도구의 설정 및 운영 기준에 따라 보관될 수 있습니다.
- 계정 상태 및 탈퇴 기록은 부정 이용 방지를 위하여 회원 탈퇴 후 1년간 보관할 수 있습니다.

공개 여부:
- 인제우리는 서비스 이용 통계 분석 이벤트에 이름, 이메일, 전체 학번, 생년월일, 비밀번호 등 직접 식별정보를 포함하지 않습니다.
- 채팅 내용, 피드 내용, 자기소개, 인증·로그인 입력값 등 민감하거나 사적인 내용은 분석 도구에서 마스킹 처리합니다.

8. 개인정보의 보유 및 이용 기간

서비스는 원칙적으로 회원 탈퇴 시 개인정보를 지체 없이 파기합니다. 다만, 다음 정보는 서비스 운영 안정성, 부정 이용 방지, 신고 처리 및 분쟁 대응을 위하여 아래 기간 동안 보관할 수 있습니다.

가. 회원 기본 정보: 회원 탈퇴 시까지
나. 본교 인증 정보: 회원 탈퇴 시까지
다. 부정 가입 및 재가입 방지를 위한 최소 식별 정보: 회원 탈퇴 후 1년
라. 신고, 차단 및 제재 기록: 처리 완료일 또는 회원 탈퇴일 중 늦은 날로부터 1년
마. 채팅, 피드, 댓글 등 신고·분쟁 관련 기록: 처리 완료 후 1년
바. 접속 기록 및 보안 로그: 수집일로부터 3개월

보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 복구 또는 재생되지 않도록 파기합니다.

9. 동의 거부권 및 거부 시 불이익

이용자는 개인정보 수집·이용에 대한 동의를 거부할 수 있습니다. 다만, 위 개인정보는 인제우리 회원가입, 본교 구성원 인증, 계정 관리, 프로필 표시, 추천·매칭·채팅 기능 제공에 필요한 정보이므로 동의를 거부할 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.

본인은 위 개인정보 수집·이용 내용을 확인하였으며 이에 동의합니다.`,
  },
  thirdParty: {
    title: '본교 구성원 인증을 위한 개인정보 제3자 제공 동의',
    label: '본교 구성원 인증을 위한 개인정보 제3자 제공 동의',
    summary: '학번과 생년월일을 본교 구성원 인증 시스템에 제공하는 내용을 확인합니다.',
    body: `본교 구성원 인증을 위한 개인정보 제3자 제공 동의

인제우리 운영팀은 회원가입 과정에서 이용자가 인제대학교 구성원인지 확인하기 위하여 학번과 생년월일을 본교 통학버스 인증 시스템에 전송하여 인증 결과를 확인합니다.

1. 개인정보를 제공하는 자

- 인제우리 운영팀

2. 개인정보를 제공받는 자

- 인제대학교 통학버스 인증 시스템
- 위 시스템의 실제 운영 주체가 별도로 확인되는 경우 해당 운영 주체 또는 수탁 운영기관

3. 제공 목적

- 인제대학교 구성원 여부 확인
- 학번 및 생년월일 기반 본교 인증
- 인제우리 회원가입 자격 확인
- 타인 학번을 이용한 부정 가입 방지

4. 제공하는 개인정보 항목

- 학번
- 생년월일 6자리

5. 제공받는 자의 개인정보 보유 및 이용 기간

- 본교 구성원 인증 처리 완료 시까지
- 단, 제공받는 자의 시스템 정책 또는 관계 법령에 따라 별도 보관이 필요한 경우 해당 기간 동안 보관될 수 있습니다.

6. 동의 거부권 및 거부 시 불이익

이용자는 본교 구성원 인증을 위한 개인정보 제3자 제공에 동의하지 않을 수 있습니다. 다만, 동의하지 않을 경우 본교 구성원 인증이 불가능하여 인제우리 회원가입 및 서비스 이용이 제한될 수 있습니다.

본인은 위 개인정보 제3자 제공 내용을 확인하였으며, 본교 구성원 인증을 위한 개인정보 제공에 동의합니다.`,
  },
  profileDisclosure: {
    title: '공개 프로필 정보 표시 안내',
    label: '공개 프로필 정보 표시 안내 확인',
    summary: '닉네임, 나이, 성별, 학과, 학년, 학번 일부 등이 다른 이용자에게 표시될 수 있음을 확인합니다.',
    body: `공개 프로필 정보 표시 안내

인제우리는 추천, 호감, 매칭, 채팅, 피드 및 댓글 기능 제공을 위하여 일부 프로필 정보를 다른 이용자에게 표시합니다.

1. 다른 이용자에게 표시될 수 있는 정보

서비스 이용 과정에서 다음 정보는 다른 이용자에게 표시될 수 있습니다.

- 닉네임
- 나이
- 성별
- 학교
- 학과
- 학년
- 학번 일부 또는 입학연도
- 자기소개
- 프로필 이미지
- 성향 및 선호 키워드
- 피드 작성 내용
- 피드 이미지
- 댓글 작성 내용
- 채팅방 내 메시지 내용
- 마지막 활동 시각

2. 프로필 표시 목적

위 정보는 다음 목적을 위해 다른 이용자에게 표시됩니다.

- 이용자 간 구분
- 추천 상대 확인
- 호감 보내기 및 매칭 기능 제공
- 매칭 후 채팅 기능 제공
- 피드 및 댓글 기능 제공
- 부정 이용 방지 및 신고 대응

3. 공개되지 않는 정보

다음 정보는 다른 이용자에게 공개되지 않습니다.

- 이름
- 전체 학번
- 생년월일
- 이메일
- 비밀번호
- 비밀번호 해시값
- 본교 인증 원본 정보

4. 학번 일부 표시 안내

서비스는 전체 학번을 다른 이용자에게 공개하지 않습니다.
다만, 프로필에서 이용자 구분 및 매칭 기능 제공을 위하여 학번 일부 또는 입학연도 형태의 정보가 표시될 수 있습니다.

예시:
- 22학번
- 23학번
- 24학번

5. 이용자 주의사항

이용자는 자기소개, 피드, 댓글, 채팅 메시지 등에 본인의 전화번호, 주소, 주민등록번호, 계좌번호, 타인의 개인정보 등 민감하거나 사적인 정보를 직접 공개하지 않도록 주의해야 합니다.

서비스는 이용자가 직접 공개한 정보로 인해 발생하는 문제를 방지하기 위해 신고, 삭제, 차단, 이용 제한 등의 조치를 할 수 있습니다.

본인은 위 공개 프로필 정보 표시 내용을 확인하였으며, 서비스 이용 과정에서 위 정보가 다른 이용자에게 표시될 수 있음을 이해했습니다.`,
  },
};

function hasStoredRequiredConsent(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(REGISTER_REQUIRED_CONSENT_STORAGE_KEY) === 'true';
}

function resolveInitialStep(step: string | null, hasConsent = false): RegisterStep {
  if (!hasConsent && step !== 'consent') {
    return 'consent';
  }

  if (step === 'consent' || step === 'verify' || step === 'account' || step === 'nickname' || step === 'academic' || step === 'private' || step === 'categories') {
    return step;
  }

  return hasConsent ? 'verify' : 'consent';
}

function resolveNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/match';
  }

  return nextPath;
}

function toSelectionArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function toKeywordCode(categoryCode: ProfileCategoryCode, optionId: string): string {
  if (categoryCode === 'mbti') {
    return optionId.toLowerCase();
  }

  return optionId;
}

function findMissingPreferenceCategory(selectedPreferences: Record<string, string | string[]>) {
  return PROFILE_CATEGORIES.find((category) => (
    toSelectionArray(selectedPreferences[category.id]).length === 0
  ));
}

function buildKeywordSelections(selectedPreferences: Record<string, string | string[]>): KeywordSelectionPayload[] {
  return PROFILE_CATEGORIES.map((profileCategory) => {
    const categoryCode = profileCategory.id;
    const selectedOptionIds = toSelectionArray(selectedPreferences[profileCategory.id]);

    return {
      categoryCode,
      keywordCodes: selectedOptionIds.map((optionId) => toKeywordCode(categoryCode, optionId)),
    };
  });
}

function hasPasswordSpecialCharacter(password: string): boolean {
  return PASSWORD_SPECIAL_CHARACTER_PATTERN.test(password);
}

function validateRegisterProfile(form: RegisterFormState): string | null {
  const loginId = form.loginId.trim();
  const password = form.password.trim();
  const nickname = form.nickname.trim();
  const birth = form.birth.trim();
  const age = Number(form.age);
  const studentYear = Number(form.studentYear);
  const department = form.department.trim();
  const realName = form.realName.trim();
  const email = form.email.trim();
  const university = form.university.trim();

  if (!loginId || !password || !nickname || !birth || !form.age.trim() || !form.studentYear.trim() || !department || !realName || !email || !university) {
    return '회원가입 필드를 모두 입력해주세요.';
  }

  if (!findCanonicalDepartment(department)) {
    return '학과는 목록에서 선택해주세요.';
  }

  if (loginId.length < 4 || loginId.length > 100) {
    return '아이디는 4자 이상 100자 이하로 입력해주세요.';
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.';
  }

  if (!hasPasswordSpecialCharacter(password)) {
    return '비밀번호에는 특수문자를 1개 이상 포함해주세요.';
  }

  if (!/^\d{6}$/.test(birth)) {
    return '생년월일 6자리를 입력해주세요.';
  }

  if (!Number.isInteger(age) || age < 1 || age > 100) {
    return '나이 범위를 확인해주세요.';
  }

  if (!Number.isInteger(studentYear) || studentYear < 1 || studentYear > 8) {
    return '학년 범위를 확인해주세요.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return '이메일 형식을 확인해주세요.';
  }

  return null;
}

function validateRegisterAccount(form: RegisterFormState): string | null {
  const loginId = form.loginId.trim();
  const password = form.password.trim();

  if (!loginId || !password) {
    return '아이디와 비밀번호를 모두 입력해주세요.';
  }

  if (loginId.length < 4 || loginId.length > 100) {
    return '아이디는 4자 이상 100자 이하로 입력해주세요.';
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.';
  }

  if (!hasPasswordSpecialCharacter(password)) {
    return '비밀번호에는 특수문자를 1개 이상 포함해주세요.';
  }

  return null;
}

function resolveRegisterErrorStep(code: string | undefined, message: string): RegisterStep | null {
  if (code === 'UNAUTHORIZED' || code === 'INVALID_VERIFICATION') {
    return 'verify';
  }

  if (code === 'NICKNAME_ALREADY_EXISTS') {
    return 'nickname';
  }

  if (code === 'CONFLICT') {
    if (message.includes('아이디')) {
      return 'account';
    }

    if (message.includes('학번')) {
      return 'verify';
    }

    if (message.includes('이메일')) {
      return 'private';
    }

    if (message.includes('닉네임')) {
      return 'nickname';
    }

    return 'private';
  }

  if (code === 'VALIDATION_ERROR') {
    const isPreferenceError = message.includes('성향') || message.includes('카테고리') || message.includes('키워드') || message.includes('단일 선택');
    if (message.includes('아이디') || message.includes('비밀번호')) {
      return 'account';
    }

    if (message.includes('닉네임')) {
      return 'nickname';
    }

    if (message.includes('나이') || message.includes('학년') || message.includes('학과')) {
      return 'academic';
    }

    if (message.includes('이름') || message.includes('이메일')) {
      return 'private';
    }

    return isPreferenceError ? null : 'private';
  }

  return null;
}
export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const stepParam = searchParams.get('step');

  const [step, setStep] = useState<RegisterStep>(() => resolveInitialStep(stepParam));
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>(EMPTY_CONSENTS);
  const [hasLoadedStoredConsent, setHasLoadedStoredConsent] = useState(false);
  const [activeAgreementKey, setActiveAgreementKey] = useState<AgreementKey | null>(null);
  const [studentNumber, setStudentNumber] = useState('');
  const [verifyBirth, setVerifyBirth] = useState('');
  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM_STATE);
  const [selectedPreferences, setSelectedPreferences] = useState<Record<string, string | string[]>>({});
  const [keywordCategoryIndex, setKeywordCategoryIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);
  const [hasRequestedTaxonomy, setHasRequestedTaxonomy] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isDepartmentListOpen, setIsDepartmentListOpen] = useState(false);
  const hasRequiredConsent = REQUIRED_CONSENT_KEYS.every((key) => consents[key]);
  const moveToStep = useCallback((nextStep: RegisterStep, mode: 'push' | 'replace' = 'push') => {
    setStep(nextStep);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set('step', nextStep);
    const nextPath = `/register?${nextSearchParams.toString()}`;

    if (mode === 'replace') {
      router.replace(nextPath, { scroll: false });
      return;
    }

    router.push(nextPath, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (hasLoadedStoredConsent) {
      return;
    }

    if (hasStoredRequiredConsent()) {
      setConsents(ALL_CONSENTS);
    }

    setHasLoadedStoredConsent(true);
  }, [hasLoadedStoredConsent]);

  useEffect(() => {
    if (!hasLoadedStoredConsent) {
      return;
    }

    if (stepParam) {
      setStep(resolveInitialStep(stepParam, hasRequiredConsent));
      return;
    }

    moveToStep(hasRequiredConsent ? 'verify' : 'consent', 'replace');
  }, [hasLoadedStoredConsent, hasRequiredConsent, moveToStep, stepParam]);

  useEffect(() => {
    if (step !== 'consent' && !hasRequiredConsent) {
      moveToStep('consent', 'replace');
      return;
    }

    if ((step === 'account' || step === 'nickname' || step === 'academic' || step === 'private' || step === 'categories') && !form.birth) {
      moveToStep('verify', 'replace');
      return;
    }

    if ((step === 'nickname' || step === 'academic' || step === 'private' || step === 'categories') && !form.loginId) {
      moveToStep('account', 'replace');
      return;
    }

    if ((step === 'academic' || step === 'private' || step === 'categories') && !form.nickname.trim()) {
      moveToStep('nickname', 'replace');
      return;
    }

    if ((step === 'private' || step === 'categories') && (!form.age.trim() || !form.studentYear.trim() || !findCanonicalDepartment(form.department))) {
      moveToStep('academic', 'replace');
      return;
    }

    if (step === 'categories' && (!form.realName.trim() || !form.email.trim())) {
      moveToStep('private', 'replace');
    }
  }, [form.age, form.birth, form.department, form.email, form.loginId, form.nickname, form.realName, form.studentYear, hasRequiredConsent, moveToStep, step]);

  useEffect(() => {
    if (step !== 'categories' || isLoadingTaxonomy || hasRequestedTaxonomy) {
      return;
    }

    let isActive = true;
    setHasRequestedTaxonomy(true);
    setIsLoadingTaxonomy(true);

    fetch('/api/profile-taxonomy', {
      credentials: 'include',
    })
      .then(() => {
        // Signup saves categoryCode/keywordCodes and does not depend on this response.
      })
      .catch(() => undefined)
      .finally(() => {
        if (isActive) {
          setIsLoadingTaxonomy(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [hasRequestedTaxonomy, isLoadingTaxonomy, step]);

  useEffect(() => {
    if (step === 'categories') {
      setKeywordCategoryIndex(0);
    }
  }, [step]);

  const isBusy = isVerifying || isSavingPreferences;
  const departmentSuggestions = getDepartmentSuggestions(form.department);
  const activeKeywordCategory = PROFILE_CATEGORIES[Math.min(keywordCategoryIndex, PROFILE_CATEGORIES.length - 1)];
  const activeKeywordSelection = activeKeywordCategory
    ? selectedPreferences[activeKeywordCategory.id] ?? (activeKeywordCategory.type === 'multi' ? [] : '')
    : '';
  const activeKeywordSelectedCount = toSelectionArray(activeKeywordSelection).length;
  const keywordProgress = (keywordCategoryIndex + 1) / PROFILE_CATEGORIES.length;
  const keywordProgressPercent = keywordProgress * 100;
  const keywordBarProgressPercent = Math.max(0, keywordProgressPercent - 5);
  const keywordPawOffsetPx = 32 * keywordProgress;
  const activeAgreementDocument = activeAgreementKey ? AGREEMENT_DOCUMENTS[activeAgreementKey] : null;

  const updateConsent = (key: ConsentKey, checked: boolean) => {
    setConsents((prev) => ({ ...prev, [key]: checked }));
  };

  const handleAllConsentChange = (checked: boolean) => {
    setConsents(checked ? ALL_CONSENTS : EMPTY_CONSENTS);
  };

  const handleConsentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasRequiredConsent) {
      showToast('필수 항목에 모두 동의해야 학번 인증을 진행할 수 있어요.', 'error');
      return;
    }

    window.sessionStorage.setItem(REGISTER_REQUIRED_CONSENT_STORAGE_KEY, 'true');
    moveToStep('verify');
  };

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedStudentNumber = studentNumber.trim();
    const normalizedBirth = verifyBirth.trim();
    if (!normalizedStudentNumber || !normalizedBirth) {
      const message = '학번과 생년월일을 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!/^\d{6}$/.test(normalizedBirth)) {
      const message = '생년월일은 6자리 숫자로 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/inje-check', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: normalizedStudentNumber,
          birth: normalizedBirth,
        }),
      });

      let payload: InjeCheckResponse = {};
      try {
        payload = await response.json() as InjeCheckResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.success) {
        const message = payload.error?.message ?? '인증에 실패했습니다. 다시 시도해주세요.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      if (payload.data?.nextStep === 'login') {
        const message = '이미 가입된 학번입니다. 로그인해주세요.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      setForm((prev) => ({
        ...prev,
        birth: normalizedBirth,
        loginId: '',
        password: '',
      }));
      moveToStep('account');
      showToast('인증되었습니다. 아이디와 비밀번호를 입력해주세요.', 'success');
    } catch {
      const message = '인증 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validateRegisterAccount(form);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      showToast(validationMessage, 'error');
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      loginId: prev.loginId.trim(),
      password: prev.password.trim(),
    }));
    moveToStep('nickname');
  };

  const handleNicknameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nickname = form.nickname.trim();
    if (!nickname) {
      const message = '닉네임을 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      nickname,
    }));
    moveToStep('academic');
  };

  const handleAcademicSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const age = Number(form.age);
    const studentYear = Number(form.studentYear);
    const canonicalDepartment = findCanonicalDepartment(form.department);

    if (!Number.isInteger(age) || age < 1 || age > 100) {
      const message = '나이를 선택해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!Number.isInteger(studentYear) || studentYear < 1 || studentYear > 8) {
      const message = '학년을 선택해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!canonicalDepartment) {
      const message = '학과는 목록에서 선택해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      setIsDepartmentListOpen(true);
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      age: prev.age.trim(),
      studentYear: prev.studentYear.trim(),
      department: canonicalDepartment,
    }));
    moveToStep('private');
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const realName = form.realName.trim();
    const email = form.email.trim();

    if (!realName || !email) {
      const message = '이름과 이메일을 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const message = '이메일 형식을 확인해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    const validationMessage = validateRegisterProfile({
      ...form,
      realName,
      email,
      university: INITIAL_FORM_STATE.university,
    });
    if (validationMessage) {
      setErrorMessage(validationMessage);
      showToast(validationMessage, 'error');
      if (validationMessage.includes('학과')) {
        setIsDepartmentListOpen(true);
        moveToStep('academic', 'replace');
      }
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      loginId: prev.loginId.trim(),
      password: prev.password.trim(),
      nickname: prev.nickname.trim(),
      birth: prev.birth.trim(),
      realName,
      email,
      university: INITIAL_FORM_STATE.university,
    }));
    moveToStep('categories');
    showToast('가입 정보를 확인했습니다. 성향을 선택해주세요.', 'success');
  };

  const submitPreferences = async (preferences: Record<string, string | string[]> = selectedPreferences) => {
    const missingCategory = findMissingPreferenceCategory(preferences);
    if (missingCategory) {
      const message = `${missingCategory.label} 항목을 선택해주세요.`;
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsSavingPreferences(true);
    setErrorMessage('');

    try {
      const keywordSelections = buildKeywordSelections(preferences);
      const canonicalDepartment = findCanonicalDepartment(form.department);
      if (!canonicalDepartment) {
        throw new Error('학과는 목록에서 선택해주세요.');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          department: canonicalDepartment,
          age: Number(form.age),
          studentYear: Number(form.studentYear),
          birth: form.birth.trim(),
          keywordSelections,
        }),
      });

      let payload: RegisterApiResponse = {};
      try {
        payload = await response.json() as RegisterApiResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.success) {
        const message = payload.error?.message ?? '회원가입에 실패했습니다.';
        const nextErrorStep = resolveRegisterErrorStep(payload.error?.code, message);
        setErrorMessage(message);
        showToast(message, 'error');
        if (nextErrorStep) {
          moveToStep(nextErrorStep, 'replace');
        }
        return;
      }

      showToast('회원가입이 완료되었습니다.', 'success');
      const nextPath = resolveNextPath(searchParams.get('next') ?? payload.data?.nextPath ?? null);
      startTransition(() => {
        router.replace(nextPath);
      });
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        showToast(error.message, 'error');
        return;
      }
      const message = '성향 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handlePreferenceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPreferences();
  };

  const updateField = <K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDepartmentChange = (value: string) => {
    updateField('department', value);
    setIsDepartmentListOpen(true);
  };

  const handleDepartmentSelect = (department: string) => {
    updateField('department', department);
    setIsDepartmentListOpen(false);
    setErrorMessage('');
  };

  const moveToNextKeywordCategory = async (preferences: Record<string, string | string[]> = selectedPreferences) => {
    setErrorMessage('');

    if (keywordCategoryIndex < PROFILE_CATEGORIES.length - 1) {
      setKeywordCategoryIndex((prev) => Math.min(prev + 1, PROFILE_CATEGORIES.length - 1));
      return;
    }

    await submitPreferences(preferences);
  };

  const handleKeywordOptionSelect = async (optionId: string) => {
    if (!activeKeywordCategory || isBusy) {
      return;
    }

    if (activeKeywordCategory.type === 'single') {
      const nextPreferences = {
        ...selectedPreferences,
        [activeKeywordCategory.id]: optionId,
      };
      setSelectedPreferences(nextPreferences);
      return;
    }

    const currentValues = toSelectionArray(selectedPreferences[activeKeywordCategory.id]);
    const isSelected = currentValues.includes(optionId);
    const nextValues = isSelected
      ? currentValues.filter((value) => value !== optionId)
      : activeKeywordCategory.maxSelections && currentValues.length >= activeKeywordCategory.maxSelections
        ? currentValues
        : [...currentValues, optionId];

    setSelectedPreferences((prev) => ({
      ...prev,
      [activeKeywordCategory.id]: nextValues,
    }));
  };

  const handleKeywordNext = async () => {
    if (!activeKeywordCategory) {
      return;
    }

    if (activeKeywordSelectedCount === 0) {
      const message = `${activeKeywordCategory.label} 항목을 선택해주세요.`;
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    await moveToNextKeywordCategory();
  };

  const handleKeywordBack = () => {
    if (keywordCategoryIndex > 0) {
      setKeywordCategoryIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    moveToStep('private', 'replace');
  };

  return (
    <PageContainer
      withBottomNav={false}
      data-clarity-mask
      className={`auth-background-page relative flex flex-col overflow-hidden bg-white ${step === 'categories' ? 'h-dvh max-h-dvh' : 'min-h-dvh'}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44dvh] min-h-[300px] bg-contain bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/brand/signup.png')" }}
      />

      <main className={`relative z-10 flex min-h-0 flex-1 flex-col px-[var(--page-padding-x)] ${step === 'categories' ? 'h-full overflow-hidden pb-0 pt-4' : step === 'consent' ? 'pb-8 pt-6' : 'pb-8 pt-10'}`}>
        <div className={step === 'categories' ? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden p-5' : step === 'consent' ? 'flex flex-1 items-start p-2 pb-8' : 'flex flex-1 items-center p-5 pb-[14vh]'}>
          <div className={step === 'categories' ? 'contents' : step === 'consent' ? 'mx-auto w-full max-w-[370px]' : 'mx-auto w-full max-w-[350px]'}>
          <div className={step === 'categories' ? 'mb-4' : step === 'consent' ? 'mb-5 text-left' : 'mb-8 text-center'}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[28px] font-semibold text-[var(--color-text-primary)]">
              {step === 'consent' ? '인제우리 시작 전 확인이 필요합니다.' : step === 'verify' ? '학번 인증' : '회원가입'}
            </h1>
            {step !== 'verify' && (
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {step === 'consent' && '필수 약관과 개인정보 처리 내용을 확인해주세요.'}
                {step === 'account' && '로그인에 사용할 아이디와 비밀번호를 입력해주세요.'}
                {step === 'nickname' && '프로필에 표시될 닉네임을 입력해주세요.'}
                {step === 'academic' && '추천에 사용할 기본 정보를 선택해주세요.'}
                {step === 'private' && '프로필에 표기되지 않는 정보를 입력해주세요.'}
                {step === 'categories' && '성향까지 저장하면 계정 생성이 완료됩니다.'}
              </p>
            )}
          </div>

          {step === 'consent' && (
            <form className="w-full" onSubmit={handleConsentSubmit}>
              <div className="rounded-[22px] border border-[var(--color-border-light)] bg-white/90 px-4 py-4 shadow-[0_8px_24px_rgba(34,34,34,0.08)]">
                <label className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-[var(--color-surface-secondary)] px-3.5 py-4">
                  <input
                    type="checkbox"
                    checked={hasRequiredConsent}
                    onChange={(event) => handleAllConsentChange(event.target.checked)}
                    className="h-5 w-5 rounded border-[var(--color-border)] accent-[var(--color-pink-cta)]"
                  />
                  <span className="text-[16px] font-bold text-[var(--color-text-primary)]">필수 항목 전체 동의</span>
                </label>

                <div className="mt-4 divide-y divide-[var(--color-border-light)]">
                  {AGREEMENT_KEYS.map((key) => {
                    const document = AGREEMENT_DOCUMENTS[key];

                    return (
                      <div key={key} className="py-4">
                        <div className="flex items-start gap-3">
                          <input
                            id={`register-consent-${key}`}
                            type="checkbox"
                            checked={consents[key]}
                            onChange={(event) => updateConsent(key, event.target.checked)}
                            className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--color-border)] accent-[var(--color-pink-cta)]"
                          />
                          <label htmlFor={`register-consent-${key}`} className="min-w-0 flex-1 cursor-pointer">
                            <span className="block break-keep text-[15px] font-bold leading-6 text-[var(--color-text-primary)]">
                              [필수] {document.label}
                            </span>
                            <span className="mt-1 block break-keep text-[12px] leading-5 text-[var(--color-text-secondary)]">
                              {document.summary}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setActiveAgreementKey(key)}
                            className="mt-0.5 shrink-0 rounded-full px-2 py-1 text-[12px] font-bold text-[var(--color-text-secondary)] underline underline-offset-4"
                          >
                            보기 &gt;
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <label className="flex cursor-pointer items-start gap-3 py-4">
                    <input
                      type="checkbox"
                      checked={consents.adult}
                      onChange={(event) => updateConsent('adult', event.target.checked)}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--color-border)] accent-[var(--color-pink-cta)]"
                    />
                    <span className="break-keep text-[15px] font-bold leading-6 text-[var(--color-text-primary)]">
                      [필수] 만 19세 이상입니다.
                    </span>
                  </label>
                </div>
              </div>

              <Button type="submit" fullWidth size="lg" disabled={!hasRequiredConsent} className="mt-5">
                동의하고 학번 인증하기
              </Button>
            </form>
          )}

          {step === 'verify' && (
            <form key="register-verify" className="w-full" onSubmit={handleVerifySubmit} autoComplete="off">
              <div className="space-y-2">
                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="studentNumber" className="sr-only">
                    학번
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-semibold text-[var(--color-text-secondary)]">
                    ID
                  </span>
                  <input
                    id="studentNumber"
                    name="registerStudentNumber"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={studentNumber}
                    onChange={(event) => setStudentNumber(event.target.value)}
                    placeholder="학번"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>

                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="verifyBirth" className="sr-only">
                    생년월일
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                  <input
                    id="verifyBirth"
                    name="registerVerifyBirth"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={verifyBirth}
                    onChange={(event) => setVerifyBirth(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="생년월일 6자리"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => router.push('/login')}
                  className="rounded-full px-1 py-2 text-xs font-semibold text-[var(--color-text-secondary)] underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                >
                  로그인
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)]"
                  aria-label="인증"
                >
                  {isVerifying ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                    </svg>
                  ) : (
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'account' && (
            <form key="register-account" className="w-full" onSubmit={handleAccountSubmit} autoComplete="off">
              <div className="space-y-2">
                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="registerLoginId" className="sr-only">
                    아이디
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl font-semibold text-[var(--color-text-secondary)]">
                    @
                  </span>
                  <input
                    id="registerLoginId"
                    name="registerLoginId"
                    type="text"
                    autoComplete="off"
                    value={form.loginId}
                    onChange={(event) => updateField('loginId', event.target.value)}
                    placeholder="아이디"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>

                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="registerPassword" className="sr-only">
                    비밀번호
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    id="registerPassword"
                    name="registerPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="비밀번호"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => router.push('/login')}
                  className="min-h-11 rounded-full px-1 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                >
                  로그인
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)]"
                  aria-label="다음"
                >
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {step === 'nickname' && (
            <form className="w-full" onSubmit={handleNicknameSubmit}>
              <div>
                <label htmlFor="nickname" className="sr-only">
                  닉네임
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={form.nickname}
                  onChange={(event) => updateField('nickname', event.target.value)}
                  placeholder="닉네임"
                  className="w-full rounded-t-xl border-b border-[var(--color-border)] bg-white/65 px-4 py-4 text-[22px] font-semibold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:bg-white/85 focus:outline-none disabled:cursor-not-allowed"
                  disabled={isBusy}
                  autoComplete="nickname"
                />
              </div>

              <Button type="submit" fullWidth size="lg" className="mt-8">
                확인
              </Button>
            </form>
          )}

          {step === 'academic' && (
            <form className="mt-6 space-y-7" onSubmit={handleAcademicSubmit}>
              <WheelPickerField
                label="나이"
                options={AGE_OPTIONS}
                value={form.age}
                unit="살"
                placeholder="나이를 선택해주세요"
                formatValue={(age) => (age === '30' ? '30살 이상' : `${age}살`)}
                onChange={(value) => updateField('age', value)}
                disabled={isBusy}
              />

              <WheelPickerField
                label="학년"
                options={STUDENT_YEAR_OPTIONS}
                value={form.studentYear}
                unit="학년"
                placeholder="학년을 선택해주세요"
                onChange={(value) => updateField('studentYear', value)}
                disabled={isBusy}
              />

              <LabeledInput label="학과">
                <div className="relative">
                  <input
                    type="text"
                    value={form.department}
                    onChange={(event) => handleDepartmentChange(event.target.value)}
                    onFocus={() => setIsDepartmentListOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsDepartmentListOpen(false), 120);
                    }}
                    placeholder="학과를 입력하거나 선택해주세요"
                    className={inputClassName}
                    autoComplete="off"
                    disabled={isBusy}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isDepartmentListOpen}
                    aria-controls="department-options"
                  />

                  {isDepartmentListOpen && !isBusy && (
                    <div
                      id="department-options"
                      role="listbox"
                      className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-60 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                    >
                      {departmentSuggestions.length > 0 ? (
                        departmentSuggestions.map((department) => (
                          <button
                            key={department}
                            type="button"
                            role="option"
                            aria-selected={form.department === department}
                            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-primary-light)] focus:bg-[var(--color-primary-light)] focus:outline-none"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleDepartmentSelect(department);
                            }}
                          >
                            {department}
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
                          일치하는 학과가 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
                  목록에서 선택한 학과명으로 저장됩니다.
                </p>
              </LabeledInput>

              <LabeledInput label="성별">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'male', label: '남성' },
                    { value: 'female', label: '여성' },
                  ].map((option) => {
                    const isSelected = form.gender === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('gender', option.value as Gender)}
                        disabled={isBusy}
                        className={`h-12 rounded-xl border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? 'border-[var(--color-action-primary)] bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]'
                            : 'border-[var(--color-border)] bg-white/65 text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </LabeledInput>

              <Button type="submit" fullWidth size="lg">
                확인
              </Button>
            </form>
          )}

          {step === 'private' && (
            <form className="mt-6 space-y-5" onSubmit={handleRegisterSubmit}>
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)]/65 px-4 py-3 text-sm font-medium text-[var(--color-primary-dark)]">
                이름과 이메일은 프로필에 표기되지 않습니다.
              </div>

              <LabeledInput label="이름">
                <input
                  type="text"
                  value={form.realName}
                  onChange={(event) => updateField('realName', event.target.value)}
                  placeholder="이름"
                  className={inputClassName}
                  disabled={isBusy}
                  autoComplete="name"
                />
              </LabeledInput>

              <LabeledInput label="이메일">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="이메일"
                  className={inputClassName}
                  disabled={isBusy}
                  autoComplete="email"
                />
              </LabeledInput>

              <Button type="submit" fullWidth size="lg">
                확인
              </Button>
            </form>
          )}

          {step === 'categories' && (
            <form className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handlePreferenceSubmit}>
              {activeKeywordCategory && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="shrink-0">
                    <div className="mb-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleKeywordBack}
                        disabled={isBusy}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-primary)] transition active:bg-[var(--color-chip-background)] disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                        aria-label="이전"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M19 12H5" />
                          <path d="m12 19-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="relative h-8 flex-1 overflow-visible">
                        <div className="absolute left-4 right-4 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-[var(--color-border-light)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-action-primary)] transition-[width] duration-300"
                            style={{ width: `${keywordBarProgressPercent}%` }}
                          />
                        </div>
                        <span
                          className="pointer-events-none absolute top-1/2 z-10 h-8 w-8 -translate-y-1/2 bg-contain bg-center bg-no-repeat drop-shadow-[0_3px_6px_rgba(34,34,34,0.16)] transition-[left] duration-300"
                          style={{
                            backgroundImage: "url('/brand/bear-hero-paw.png')",
                            left: `calc(${keywordProgressPercent}% - ${keywordPawOffsetPx}px)`,
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      {keywordCategoryIndex + 1}/{PROFILE_CATEGORIES.length}
                    </p>
                    <h2 className="mt-1 break-keep text-[21px] font-bold leading-[1.25] tracking-normal text-[var(--color-text-primary)]">
                      {activeKeywordCategory.label}
                    </h2>
                    {activeKeywordCategory.type === 'multi' && activeKeywordCategory.maxSelections && (
                      <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                        최대 {activeKeywordCategory.maxSelections}개까지 선택할 수 있어요.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-28 scrollbar-none">
                    {activeKeywordCategory.options.map((option) => {
                      const selectedValues = toSelectionArray(activeKeywordSelection);
                      const isSelected = selectedValues.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => void handleKeywordOptionSelect(option.id)}
                          disabled={isBusy}
                          aria-pressed={isSelected}
                          className={`flex min-h-[52px] w-full items-center rounded-[16px] px-4 text-left text-[15px] font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? 'border border-[var(--color-action-primary)]/55 bg-[var(--color-brand-pink)] text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_rgba(243,167,192,0.35)]'
                              : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 bg-white px-[calc(var(--page-padding-x)+20px)] pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_28px_rgba(255,255,255,0.96)]">
                    <Button
                      type="button"
                      fullWidth
                      size="md"
                      loading={isSavingPreferences}
                      disabled={isBusy || activeKeywordSelectedCount === 0}
                      onClick={() => void handleKeywordNext()}
                    >
                      {keywordCategoryIndex === PROFILE_CATEGORIES.length - 1 ? '완료' : '확인'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-[var(--color-secondary)]/25 bg-[var(--color-secondary-light)]/70 px-3 py-2 text-sm text-[var(--color-secondary-dark)]"
            >
              {errorMessage}
            </p>
          )}
          </div>
        </div>
      </main>

      {activeAgreementDocument && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4">
          <section className="flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-[28px] bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.18)] sm:rounded-[28px]">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border-light)] px-5 py-4">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[var(--color-pink-cta)]">필수 동의</p>
                <h2 className="mt-1 break-keep text-[18px] font-bold leading-6 text-[var(--color-text-primary)]">
                  {activeAgreementDocument.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveAgreementKey(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] active:bg-[var(--color-surface-secondary)]"
                aria-label="닫기"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <pre className="whitespace-pre-wrap break-keep font-sans text-[13px] leading-6 text-[var(--color-text-secondary)]">
                {activeAgreementDocument.body}
              </pre>
            </div>

            <div className="shrink-0 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
              <Button type="button" fullWidth onClick={() => setActiveAgreementKey(null)}>
                확인
              </Button>
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  );
}

function WheelPickerField({
  label,
  options,
  value,
  unit,
  placeholder,
  formatValue,
  onChange,
  disabled,
}: {
  label: string;
  options: string[];
  value: string;
  unit: string;
  placeholder: string;
  formatValue?: (value: string) => string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const initialScrollIndexRef = useRef(0);
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getDisplayValue = (option: string) => formatValue?.(option) ?? `${option}${unit}`;
  const selectedLabel = value ? getDisplayValue(value) : placeholder;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    window.requestAnimationFrame(() => {
      scroller.scrollTop = initialScrollIndexRef.current * WHEEL_ITEM_HEIGHT;
    });
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }

      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  const syncSelectedValue = (scrollTop: number) => {
    const nextIndex = Math.min(
      options.length - 1,
      Math.max(0, Math.round(scrollTop / WHEEL_ITEM_HEIGHT)),
    );
    const nextValue = options[nextIndex];

    if (nextValue && nextValue !== value) {
      onChange(nextValue);
    }

    return nextIndex;
  };

  const handleOpen = () => {
    if (disabled) {
      return;
    }

    initialScrollIndexRef.current = Math.max(0, options.indexOf(value));
    setIsOpen(true);
  };

  const commitAndClose = () => {
    const scroller = scrollerRef.current;

    if (scroller) {
      const nextIndex = syncSelectedValue(scroller.scrollTop);
      scroller.scrollTop = nextIndex * WHEEL_ITEM_HEIGHT;
    }

    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }

    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }

    setIsOpen(false);
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    syncSelectedValue(scroller.scrollTop);

    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }

    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }

    snapTimeoutRef.current = setTimeout(() => {
      const nextIndex = syncSelectedValue(scroller.scrollTop);
      scroller.scrollTo({
        top: nextIndex * WHEEL_ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }, 90);

    settleTimeoutRef.current = setTimeout(() => {
      const nextIndex = syncSelectedValue(scroller.scrollTop);
      scroller.scrollTo({
        top: nextIndex * WHEEL_ITEM_HEIGHT,
        behavior: 'smooth',
      });
      setIsOpen(false);
    }, WHEEL_SETTLE_TIMEOUT_MS);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">{label}</label>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-base transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-secondary)] ${
          value ? 'font-semibold text-[var(--color-text-primary)]' : 'font-normal text-[var(--color-text-tertiary)]'
        }`}
      >
        <span>{selectedLabel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={commitAndClose}>
          <div
            className="w-full max-w-[430px] rounded-t-[24px] bg-[var(--color-surface)] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-16px_40px_rgba(15,23,42,0.2)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative mx-auto overflow-hidden"
              style={{ height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS }}
            >
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 h-12 -translate-y-1/2 rounded-xl border-y border-[var(--color-border)] bg-[var(--color-chip-background)]/65" />
              <div
                ref={scrollerRef}
                onScroll={handleScroll}
                className="scrollbar-none relative z-20 h-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
                style={{
                  paddingBottom: WHEEL_ITEM_HEIGHT * 2,
                  paddingTop: WHEEL_ITEM_HEIGHT * 2,
                }}
              >
                {options.map((option) => {
                  const isSelected = value === option;

                  return (
                    <div
                      key={option}
                      className={`pointer-events-none flex snap-center items-center justify-center text-xl font-semibold transition-colors ${
                        isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
                      }`}
                      style={{ height: WHEEL_ITEM_HEIGHT }}
                    >
                      {getDisplayValue(option)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">{label}</label>
      {children}
    </div>
  );
}

const inputClassName = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-secondary)] disabled:text-[var(--color-text-tertiary)]';
