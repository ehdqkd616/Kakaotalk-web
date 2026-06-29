# KakaoTalk Web Client

카카오톡 앱을 설치할 수 없는 PC 환경에서 웹 브라우저로 카카오톡 메시지를 송수신할 수 있는 웹 클라이언트입니다.

## 프로젝트 구조

```
kakaotalk-web/
├── server/           # Node.js + Express + TypeScript 백엔드
├── client/           # Next.js 15 + React 19 + TailwindCSS 프론트엔드
├── android-relay/    # Android 릴레이 앱 (Kotlin) – 메시지 수신용
└── docker-compose.yml
```

## 시작하기

### 1단계 – Kakao 앱 등록

1. [Kakao Developers](https://developers.kakao.com) 접속 후 새 앱 생성
2. **카카오 로그인** 활성화
3. **Redirect URI** 등록: `http://localhost:4000/api/auth/kakao/callback`
4. **동의 항목** 설정:
   - `profile_nickname`, `profile_image` (필수)
   - `friends`, `talk_message` (선택 – 친구에게 메시지 전송 시 필요)
5. REST API 키 복사

### 2단계 – 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 아래 값을 채우세요:

```env
KAKAO_REST_API_KEY=발급받은_REST_API_키
KAKAO_CLIENT_SECRET=앱_시크릿_키 (선택)
JWT_SECRET=랜덤_비밀_문자열_여기에
```

### 3단계 – 패키지 설치 및 실행

```bash
# 의존성 설치
npm run install:all

# 개발 서버 실행 (서버 + 클라이언트 동시)
npm run dev
```

- 클라이언트: http://localhost:3000
- 서버 API: http://localhost:4000

### Docker로 실행

```bash
docker-compose up --build
```

---

## 기능

| 기능 | 상태 |
|------|------|
| 카카오 계정 로그인 (OAuth 2.0) | ✅ 구현 |
| 나에게 메시지 보내기 | ✅ 구현 |
| 친구에게 메시지 보내기 | ✅ 구현 (친구 동의 필요) |
| 카카오 친구 목록 동기화 | ✅ 구현 |
| 실시간 메시지 수신 (WebSocket) | ✅ 구현 |
| Android 릴레이 수신 | ✅ 구현 |
| 타이핑 인디케이터 | ✅ 구현 |
| 메시지 히스토리 (SQLite) | ✅ 구현 |
| 이미지 전송 | 🚧 Phase 2 |
| PWA 지원 | 🚧 Phase 2 |

---

## Android 릴레이 앱 설정

카카오톡 수신 메시지를 웹에서 보려면 Android 기기에 릴레이 앱을 설치해야 합니다.

1. `android-relay/` 를 Android Studio로 열기
2. 빌드 후 기기에 설치
3. 앱 실행 → 서버 URL 입력 (예: `http://192.168.0.100:4000`)
4. 카카오 사용자 ID 입력 (로그인 후 `/api/auth/me` 에서 확인)
5. **설정 > 알림 접근** 에서 KakaoTalk Relay 허용

---

## API 문서

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/auth/kakao` | 카카오 로그인 시작 |
| GET | `/api/auth/kakao/callback` | OAuth 콜백 |
| GET | `/api/auth/me` | 현재 사용자 정보 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/messages/rooms` | 채팅방 목록 |
| GET | `/api/messages/:roomId` | 메시지 목록 |
| POST | `/api/messages/send` | 메시지 발송 |
| POST | `/api/relay/register` | 릴레이 기기 등록 |
| POST | `/api/relay/message` | 릴레이 메시지 수신 |
| POST | `/api/relay/ping` | 기기 생존 신호 |
| GET | `/api/relay/status` | 릴레이 상태 확인 |

---

## 기술 스택

- **Frontend**: Next.js 15, React 19, TailwindCSS 3, Zustand, Socket.IO Client
- **Backend**: Node.js 20, Express 4, TypeScript, Socket.IO, better-sqlite3
- **Auth**: Kakao OAuth 2.0 + JWT (httpOnly Cookie)
- **Android**: Kotlin, NotificationListenerService, OkHttp
- **DevOps**: Docker, docker-compose
