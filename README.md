# 📊 시각화 가계부 (Visual Household Accounts)

React와 Supabase를 연동하여 실시간으로 수입/지출 내역을 관리하고, 자산 수단별 구성비 및 수입/지출 총량 규모를 아름답게 시각화해 주는 가계부 대시보드 애플리케이션입니다.

---

## 🚀 기술 스택 (Tech Stack)

* **프레임워크 및 빌드**: React 18, Vite, TypeScript
* **데이터베이스 및 백엔드**: Supabase (PostgreSQL, Row Level Security, Supabase Auth)
* **시각화 라이브러리**: Recharts
* **스타일링 및 UI**: Tailwind CSS, PostCSS, Autoprefixer

---

## ✨ 주요 핵심 기능 (Key Features)

1. **실시간 가계부 내역 CRUD**:
   * 수입(Income)과 지출(Expense) 내역을 날짜, 금액, 결제 수단, 카테고리, 메모와 함께 입력하고 저장합니다.
   * 천 단위 콤마 자동 입력 및 중복 제출 방지 기능을 포함합니다.
   * 저장된 내역을 실시간으로 최신순 조회하고, 즉시 삭제할 수 있습니다.
2. **다차원 통계 시각화 (Recharts)**:
   * **상단 요약 카드**: 총 수입, 총 지출, 잔액의 실시간 연산 및 동적 색상 표현 (잔액 0원 미만 시 경고 색상 표시).
   * **자산 구성비 (도넛 차트)**: 현금, 계좌, 카드 수단별 점유 비율을 수입/지출로 각각 분리해 시각화합니다.
   * **총량 규모 비교 (바 차트)**: 수입과 지출의 크기를 직관적으로 대조합니다.
3. **사용자별 행 수준 보안 (Row Level Security - RLS)**:
   * PostgreSQL RLS를 적용하여 다중 사용자 환경에서도 오직 본인이 작성한 데이터만 안전하게 조회/삭제가 가능합니다.
4. **유연한 카테고리 확장 구조**:
   * 기본 시스템 공용 카테고리(식비, 쇼핑, 급여 등) 외에, 사용자가 직접 본인 계정 전용 커스텀 카테고리를 무한히 확장할 수 있는 하이브리드 카테고리 테이블을 설계했습니다.
5. **월별 정산 기준 설정 및 계산**:
   * 가계부 정산 범위(`1일 ~ 말일` / `25일 ~ 24일(급여일 정산)` / `사용자 지정`)를 동적으로 선택하여 대시보드와 가계부 목록을 1개월 단위로 즉시 필터링합니다.
   * 실데이터 기반의 정산 월을 자동 추출하여 선택할 수 있도록 월 리스트를 제공합니다.
6. **가계부 결산 마크다운 보고서**:
   * 선택된 정산 범위에 대해 요약 통계와 카테고리별 합계/비중, 상세 내역이 포함된 고품질의 마크다운 보고서를 자동 빌드합니다.
   * `마크다운 복사` 버튼으로 쉽고 빠르게 클립보드로 보고서 원문을 복사할 수 있습니다.
7. **가계부 내역 상세 수정/삭제 연동**:
   * 내역 리스트 테이블의 특정 행을 클릭하면 좌측 폼에 기존 정보가 연동(수정 모드)되어 내용 수정과 삭제를 직관적으로 수행할 수 있습니다.

---

## 📂 폴더 및 아키텍처 구조

```text
household-accounts/
├── docs/
│   └── schema.md           # DB 스키마 설계 및 DDL SQL, TS 타입 명세서
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # Recharts 차트 시각화 및 요약 카드
│   │   ├── TransactionForm.tsx # 수입/지출 내역 입력 폼 (React.memo 최적화)
│   │   └── TransactionList.tsx # 내역 테이블 리스트 및 삭제 액션 (React.memo 최적화)
│   ├── services/
│   │   └── transactionService.ts # Supabase CRUD API 및 통계 가공 서비스 로직
│   ├── types/
│   │   └── household.ts        # 프로젝트 내 전역 TypeScript 인터페이스 및 DB 타입
│   ├── supabaseClient.ts   # Database 타입 세이프티가 적용된 Supabase Client
│   ├── App.tsx             # 메인 앱 진입점 및 통합 상태 관리 (useCallback 최적화)
│   ├── index.css           # Tailwind CSS 지시어 파일
│   └── main.tsx            # React DOM 마운트 스크립트
├── index.html              # HTML 진입점
├── tailwind.config.js      # Tailwind CSS 세부 설정
├── postcss.config.js       # PostCSS 빌드 설정
├── tsconfig.json           # TypeScript 컴파일러 구성
├── package.json            # 의존성 패키지 명세
└── .env.example            # 환경 변수 템플릿 예시
```

---

## ⚙️ 환경 변수 설정 방법

로컬에서 구동하기 전, 프로젝트 루트 경로에 `.env` 파일을 생성하고 Supabase 프로젝트의 API 정보를 추가해야 합니다.

```env
# Vite 프로젝트 환경 변수 규칙 (.env)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_api_key
```

> [!WARNING]
> `VITE_SUPABASE_URL` 설정 시 주소 끝에 `/rest/v1/` 경로를 붙이지 마십시오. Supabase Client SDK가 내부적으로 REST 경로를 자동으로 결합하므로, 중복 기재할 경우 `404 Not Found` 혹은 `Invalid path specified in request URL` 오류가 발생합니다.

* **참고**: API 정보가 정의되지 않은 경우, 애플리케이션의 초기화 크래시를 방지하기 위해 플레이스홀더 주소(`https://placeholder.supabase.co`)로 임시 구동되며, 브라우저 화면 상단에 환경 변수 및 DB RLS 설정을 점검하도록 안내해 주는 에러 피드백 알림이 나타납니다.

---

## 🏃 로컬 실행 방법

### 1. 패키지 설치
프로젝트 루트에서 아래 명령을 실행하여 모든 의존성 패키지를 설치합니다.
```bash
npm install
```

### 2. 로컬 개발 서버 실행
Vite 기반의 개발 서버를 구동합니다.
```bash
npm run dev
```

서버가 켜지면 브라우저를 통해 **`http://localhost:5173`** 주소로 접속해 가계부를 확인할 수 있습니다.

### 3. 프로덕션 빌드
```bash
npm run build
```

---

## 🛠️ Vercel 배포 및 빌드 문제 해결 기록

Vercel에 배포하여 빌드를 수행할 때 발생했던 TypeScript 컴파일 오류들과 해결 방식에 대한 기록입니다.

### 1. `React` 미사용 경고 오류 (`App.tsx`)
* **오류 메시지**: `error TS6133: 'React' is declared but its value is never read.`
* **원인**: 최신 Vite + React 18 템플릿 환경에서는 JSX 컴파일러가 자동 변환되므로 명시적인 `import React`가 필요하지 않습니다. 사용하지 않는 React 임포트 선언이 남아 컴파일러 경고(에러)가 되었습니다.
* **해결 방법**: `src/App.tsx` 파일 최상단의 `import React`를 제거하고 필요한 훅들만 구조분해할당으로 가져오도록 수정했습니다.

### 2. Vite 환경 변수 타입 선언 누락 (`supabaseClient.ts`)
* **오류 메시지**: `error TS2339: Property 'env' does not exist on type 'ImportMeta'.`
* **원인**: TypeScript 컴파일러가 Vite 전역 객체인 `import.meta.env`를 인식하지 못하여 발생한 에러입니다.
* **해결 방법**: `src/vite-env.d.ts` 파일을 신규 생성하고 `/// <reference types="vite/client" />`를 작성하여 Vite의 타입 정의를 TypeScript 컴파일러에 전달했습니다.

### 3. Node.js `process` 미정의 오류 (`supabaseClient.ts`)
* **오류 메시지**: `error TS2580: Cannot find name 'process'.`
* **원인**: 브라우저 런타임 및 Vite 빌드 빌더 환경에서는 Node.js의 글로벌 객체인 `process`가 존재하지 않습니다. 기존 크래시 디버깅 용도로 포함되었던 `process.env` 우회 체크 코드가 컴파일 오류를 야기했습니다.
* **해결 방법**: `process.env` 관련 조건문과 함수 로직을 걷어내고, Vite의 표준 환경 변수 인터페이스인 `import.meta.env`로 통합하여 코드를 단순화했습니다.

### 4. Supabase DB 스키마 Generic 타입 충돌 (`transactionService.ts`)
* **오류 메시지**: `error TS2322: Type '...' is not assignable to type 'never'.`
* **원인**: `supabaseClient`를 생성할 때 임의로 선언된 `Database` 제네릭 스키마를 전달하였으나, 실제 소스 코드에서 API 파라미터로 넘기는 타입 구조와 DB 명세 정의 사이에 미세한 속성 불일치가 발생해 Supabase SDK 내부적으로 해당 테이블의 CRUD 작업을 `never` 타입으로 판정했습니다.
* **해결 방법**: 서비스 레이어의 CRUD 함수들이 이미 결과 데이터를 원하는 인터페이스 타입으로 개별 캐스팅(`as Transaction`, `as Category[]` 등)하고 있으므로, 불필요한 스키마 정의 마찰을 피하기 위해 `createClient<Database>`에서 제네릭 `<Database>`를 걷어내어 컴파일을 정상화시켰습니다.

