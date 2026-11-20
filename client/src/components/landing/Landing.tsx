// @ts-nocheck
'use client';
// 로그인하지 않은 방문자에게 보여 주는 서비스 소개 홈 화면.
// 내용은 아래 LANDING 객체만 고치면 된다. 스타일은 landing.css(.lp- 접두사)에만 있다.
import './landing.css';

export const LANDING = {
  "icon": "💬",
  "name": "KakaoTalk Web",
  "tagline": "앱 없이 브라우저에서 쓰는 카카오톡 웹 클라이언트",
  "intro": "카카오톡을 설치할 수 없는 PC에서도, 카카오 계정으로 로그인하면 웹 브라우저로 메시지를 보내고 받을 수 있어요.",
  "access": "카카오 계정으로 로그인해요. 받은 메시지를 보려면 안드로이드 릴레이 앱 연결이 필요해요.",
  "features": [
    {
      "icon": "🔑",
      "title": "카카오 계정 로그인",
      "desc": "따로 가입할 필요 없이 카카오 계정으로 바로 들어가요."
    },
    {
      "icon": "✉️",
      "title": "메시지 보내기",
      "desc": "나에게, 또는 동의한 카카오 친구에게 메시지를 보내요."
    },
    {
      "icon": "⚡",
      "title": "실시간 수신",
      "desc": "릴레이 앱이 받은 카카오톡 메시지를 웹에서 실시간으로 보여 줘요."
    },
    {
      "icon": "🗂️",
      "title": "대화 기록",
      "desc": "채팅방별 대화 기록이 남아서 언제든 다시 볼 수 있어요."
    }
  ],
  "steps": [
    "카카오 계정으로 로그인해요.",
    "받은 메시지를 보려면 안드로이드 기기에 릴레이 앱을 연결해요.",
    "채팅방을 골라 메시지를 주고받아요."
  ]
};

export default function Landing({ LinkComponent, loginHref = '/login', signupHref = '/signup', className = '', accent }: { LinkComponent?: any; loginHref?: string; signupHref?: string; className?: string; accent?: string }) {
  const L = LinkComponent ?? ((p) => <a href={p.to} className={p.className}>{p.children}</a>);
  const d = LANDING;
  return (
    <div className={`lp ${className}`} style={accent ? { '--lp-accent': accent, '--lp-accent-text': '#0f0f14' } : undefined}>
      <section className="lp-hero">
        <div className="lp-icon" aria-hidden="true">{d.icon}</div>
        <h1 className="lp-title">{d.name}</h1>
        <p className="lp-tagline">{d.tagline}</p>
        {d.intro && <p className="lp-intro">{d.intro}</p>}
        <div className="lp-cta">
          <L to={loginHref} className="lp-btn lp-btn-primary">로그인</L>
          {signupHref && <L to={signupHref} className="lp-btn">{d.signupLabel ?? '회원가입'}</L>}
        </div>
        {d.access && <p className="lp-access">{d.access}</p>}
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">이런 걸 할 수 있어요</h2>
        <ul className="lp-features">
          {d.features.map((f) => (
            <li key={f.title} className="lp-feature">
              <span className="lp-feature-icon" aria-hidden="true">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {d.steps?.length > 0 && (
        <section className="lp-section">
          <h2 className="lp-h2">사용 방법</h2>
          <ol className="lp-steps">
            {d.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </section>
      )}

      <footer className="lp-footer">
        <a href="https://multi-tools.hotgarlic.dedyn.io">다른 프로젝트 둘러보기 →</a>
      </footer>
    </div>
  );
}
