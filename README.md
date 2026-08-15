# BLACKBOX 33기 모집 웹사이트

서강대학교 중앙창업동아리 BLACKBOX 33기 모집을 위한 정적 웹사이트입니다. 메인 소개 페이지, 지원서 제출 페이지, 제출 완료 페이지, 운영자 지원자 대시보드로 구성되어 있으며 Vercel 정적 호스팅과 Serverless Functions를 사용합니다.

## 배포 URL

- Main: https://blackbox-theta.vercel.app
- Application: https://blackbox-theta.vercel.app/application.html
- Admin Dashboard: https://blackbox-theta.vercel.app/admin.html

## 기술 스택

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Responsive layout
- Scroll reveal animation
- Hover reveal card
- Horizontal scroll cards
- Glassmorphism-style cards
- 3D flip/rotation icon animation

별도 프레임워크 없이 정적 파일 기반으로 구성되어 있습니다. `index.html`, `styles.css`, `script.js`가 메인 화면을 담당하고, `application.html`과 `admin.html`은 각 페이지 내부에 필요한 CSS/JS를 포함합니다.

### Backend

- Vercel Serverless Functions
- Node.js CommonJS API handlers
- Notion API

지원서 제출 및 운영자 대시보드는 브라우저에서 Notion API를 직접 호출하지 않습니다. Notion 토큰은 Vercel 환경변수로만 관리하고, 서버리스 함수가 Notion API와 통신합니다.

## 프로젝트 구조

```txt
blackbox/
├─ index.html                  # 메인 랜딩 페이지
├─ styles.css                  # 메인 페이지 스타일
├─ script.js                   # 메인 페이지 인터랙션
├─ application.html            # 33기 지원서 페이지
├─ application-thanks.html     # 지원서 제출 완료 페이지
├─ admin.html                  # 운영자 지원자 대시보드
├─ recruit-closed.html         # 모집 마감/비활성 안내 페이지
├─ google-apps-script.js       # 이전 Google Apps Script 연동 실험 코드
├─ api/
│  ├─ apply.js                 # 지원서 제출 -> Notion 페이지 생성 API
│  └─ admin-applications.js    # Notion 지원서 목록/상세 조회 API
├─ assets/
│  ├─ brand/                   # 로고, 인스타그램 아이콘
│  ├─ journal/                 # JOURNAL 활동 이미지
│  ├─ members/                 # 운영진 이미지
│  └─ projects/                # 프로젝트 카드 이미지
├─ .gitignore
└─ .vercelignore
```

## 로컬 실행

정적 페이지 확인만 필요하면 로컬 서버를 띄우면 됩니다.

```bash
python -m http.server 5173
```

브라우저에서 아래 주소로 확인합니다.

```txt
http://localhost:5173
```

단, `/api/apply`, `/api/admin-applications` 같은 Vercel Serverless Functions는 일반 Python 서버에서는 동작하지 않습니다. API까지 로컬에서 확인하려면 Vercel CLI를 사용합니다.

```bash
vercel dev
```

## 주요 화면

### `index.html`

메인 모집 사이트입니다.

- Hero
- About
- Project Archive
- Members
- Journal
- Join Us
- Footer

프로젝트 탭은 `script.js`에서 `data-generation` 값을 기준으로 필터링합니다.

```html
<article class="image-card reveal-card project-card" data-generation="32">
```

기수 버튼은 아래처럼 연결됩니다.

```html
<button class="is-active" data-generation="32" type="button">32기</button>
```

### `application.html`

지원자가 직접 작성하는 지원서 페이지입니다.

폼 제출 방식:

```js
fetch(form.action, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
  },
  body: new URLSearchParams(new FormData(form))
});
```

성공 시:

```js
window.location.href = 'application-thanks.html';
```

지원서 필드명은 `api/apply.js`의 `FIELD_LABELS`와 맞아야 합니다. 프론트의 `name` 속성을 바꿀 경우 백엔드의 필드 목록도 같이 수정해야 합니다.

### `admin.html`

운영진이 지원서를 확인하는 대시보드입니다.

- 운영자 비밀번호 입력
- 지원자 목록 조회
- 지원자별 기본 정보 확인
- 문항별 답변 확인

대시보드는 `/api/admin-applications`에 비밀번호를 POST로 전달합니다.

```js
fetch('/api/admin-applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ password: adminPassword })
});
```

브라우저에는 Notion 토큰이 노출되지 않습니다.

## API

### `POST /api/apply`

지원서 제출 API입니다. `application.html`에서 전달한 form-urlencoded 데이터를 받아 Notion 하위 페이지로 생성합니다.

#### 환경변수

- `NOTION_TOKEN`: Notion Integration Secret

#### 주요 동작

1. 요청 body를 `URLSearchParams`로 파싱
2. 지원자 이름과 학번으로 Notion 페이지 제목 생성
3. 기본 정보와 지원서 답변을 Notion block으로 변환
4. Notion parent page 아래에 지원자별 child page 생성
5. 성공 시 `{ ok: true, pageId }` 반환

#### Notion 저장 구조

현재 parent page ID는 `api/apply.js`와 `api/admin-applications.js`에 상수로 들어가 있습니다.

```js
const NOTION_PARENT_PAGE_ID = '3b759fed505280eebfe7c00313423a48';
```

지원자 1명이 제출할 때마다 parent page 아래에 child page가 1개 생성됩니다.

페이지 제목 형식:

```txt
이름 (학번) - 제출시각
```

### `POST /api/admin-applications`

운영자 대시보드 조회 API입니다. Notion parent page 아래의 child page를 읽고, 각 페이지의 block을 파싱해서 프론트에서 쓰기 쉬운 JSON으로 반환합니다.

#### 환경변수

- `NOTION_TOKEN`: Notion Integration Secret
- `ADMIN_PASSWORD`: 운영자 대시보드 접속 비밀번호

#### 요청 예시

```json
{
  "password": "운영자 비밀번호"
}
```

#### 응답 예시

```json
{
  "ok": true,
  "applications": [
    {
      "id": "notion-page-id",
      "title": "홍길동 (20260000) - 2026. 08. 16. 01:30",
      "name": "홍길동",
      "studentId": "20260000",
      "submittedAt": "2026. 08. 16. 01:30",
      "fields": {
        "이름": "홍길동",
        "학번": "20260000",
        "학과": "경영학과"
      }
    }
  ]
}
```

## Vercel 환경변수

Vercel Project Settings 또는 Vercel CLI에서 아래 값을 설정해야 합니다.

| Name | Required | Description |
| --- | --- | --- |
| `NOTION_TOKEN` | Yes | Notion Integration Secret |
| `ADMIN_PASSWORD` | Yes | 운영자 대시보드 접속 비밀번호 |

현재 API는 `Production` 환경 기준으로 사용됩니다. Preview 배포에서도 테스트하려면 Preview 환경에도 같은 변수를 추가해야 합니다.

CLI 예시:

```bash
vercel env add NOTION_TOKEN production
vercel env add ADMIN_PASSWORD production
```

환경변수 확인:

```bash
vercel env ls
```

## Notion 연동 설정

1. Notion Developers에서 Internal Integration 생성
2. Integration Secret을 Vercel `NOTION_TOKEN`에 등록
3. 지원서가 쌓일 Notion parent page를 생성
4. 해당 page 우측 상단 `...` 메뉴에서 Integration을 초대 또는 연결
5. parent page ID를 `api/apply.js`, `api/admin-applications.js`의 `NOTION_PARENT_PAGE_ID`에 입력

주의: Notion API는 Integration이 접근 권한을 가진 page만 읽고 쓸 수 있습니다. 권한이 없으면 지원서 제출 또는 대시보드 조회가 실패합니다.

## 프론트엔드 수정 가이드

### 색상

메인 색상은 `styles.css`의 `:root`에서 관리합니다.

```css
:root {
  --black: #050506;
  --ink: #111318;
  --blue: #20aef3;
  --orange: #ff7a1a;
}
```

### 프로젝트 카드 추가

`index.html`의 Project 섹션에 카드를 추가합니다.

```html
<article class="image-card reveal-card project-card" data-generation="32">
  <img src="assets/projects/example.png" alt="프로젝트명">
  <div>
    <span class="project-badge">32기</span>
    <h4>프로젝트명</h4>
    <p>프로젝트 설명</p>
    <strong class="sales">Demo Day</strong>
  </div>
  <aside class="reveal-panel">
    <strong>Concept</strong>
    <span>hover 시 보이는 추가 설명</span>
  </aside>
</article>
```

필터링을 위해 `data-generation` 값이 탭 버튼의 `data-generation`과 일치해야 합니다.

### 운영진 카드 수정

운영진 정보는 `index.html`의 Members 섹션에서 수정합니다.

```html
<article class="member-card">
  <img class="member-photo" src="assets/members/name.png" alt="이름">
  <span>역할</span>
  <strong>이름</strong>
  <p>학과</p>
</article>
```

사진 비율은 CSS에서 정사각형 기반으로 잘립니다.

```css
.member-photo {
  aspect-ratio: 1 / 1;
  object-fit: cover;
  object-position: center top;
}
```

개별 사진 위치를 조정하려면 전용 클래스를 추가해서 `object-position`을 조정합니다.

## 백엔드 수정 가이드

### 지원서 문항 추가/수정

문항을 바꿀 때는 아래 3곳을 함께 수정해야 합니다.

1. `application.html`의 input/textarea/radio `name`
2. `api/apply.js`의 `FIELD_LABELS`
3. `api/apply.js`의 `QUESTION_TITLES`

운영자 대시보드 표시 문항도 바뀌면 `admin.html`의 `ANSWER_FIELDS`도 같이 수정합니다.

### Notion parent page 변경

지원서를 다른 Notion page로 받고 싶다면 아래 상수를 두 파일에서 같은 값으로 변경합니다.

- `api/apply.js`
- `api/admin-applications.js`

```js
const NOTION_PARENT_PAGE_ID = '새로운 page id';
```

## 배포

프로덕션 배포:

```bash
vercel deploy --prod --yes
```

현재 production alias:

```txt
https://blackbox-theta.vercel.app
```

GitHub에 반영:

```bash
git add .
git commit -m "변경 내용"
git push
```

## 보안 주의사항

- `NOTION_TOKEN`은 절대 코드에 직접 적지 않습니다.
- `ADMIN_PASSWORD`도 코드에 직접 적지 않고 Vercel 환경변수로 관리합니다.
- `admin.html`은 비밀번호 기반의 간단한 보호만 적용되어 있습니다. 더 강한 보안이 필요하면 OAuth, 세션 쿠키, 관리자 계정 인증을 별도로 도입해야 합니다.
- Notion parent page는 운영진 외부에 공유하지 않는 것을 권장합니다.

## 유지보수 체크리스트

- 지원서 문항 변경 시 프론트 `name`과 백엔드 `FIELD_LABELS` 동기화
- Notion Integration 권한 유지 확인
- Vercel Production 환경변수 확인
- 새 프로젝트/운영진 이미지 추가 시 `assets/` 경로 확인
- 모바일 화면에서 카드 2열 배치와 텍스트 넘침 확인
- 배포 후 `/application.html`, `/application-thanks.html`, `/admin.html` 동작 확인
