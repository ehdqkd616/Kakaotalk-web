declare global {
  interface Window {
    Kakao: {
      isInitialized(): boolean;
      init(key: string): void;
      Share: {
        sendDefault(opts: KakaoShareOpts): void;
      };
      Link: {
        sendDefault(opts: KakaoShareOpts): void;
      };
    };
  }
}

interface KakaoShareOpts {
  objectType: string;
  text: string;
  link: { mobileWebUrl: string; webUrl: string };
  buttonTitle?: string;
}

function init(): boolean {
  if (typeof window === 'undefined' || !window.Kakao) return false;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
  return true;
}

export function shareViaKakao(text: string): void {
  if (!init()) {
    alert('카카오 SDK가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  const shareApi = window.Kakao.Share ?? window.Kakao.Link;
  shareApi.sendDefault({
    objectType: 'text',
    text: text.slice(0, 200),
    link: {
      mobileWebUrl: window.location.origin,
      webUrl: window.location.origin,
    },
    buttonTitle: '카카오톡 웹 열기',
  });
}
