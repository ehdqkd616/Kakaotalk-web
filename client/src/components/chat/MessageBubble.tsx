import type { Message } from '@/types';

interface Props {
  message: Message;
  showSender: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function resolveImageUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export default function MessageBubble({ message, showSender }: Props) {
  const isSent = message.direction === 'sent';

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  if (isSent) {
    return (
      <div className="msg-appear flex items-end justify-end gap-1.5">
        <span className="mb-0.5 flex-shrink-0 self-end text-[10px] text-gray-500">
          {formatTime(message.created_at)}
        </span>
        <div className="max-w-[65%]">
          <div className="bubble-sent rounded-2xl rounded-br-sm bg-kakao-my-bubble px-3.5 py-2 shadow-sm">
            {message.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageUrl(message.image_url)}
                alt="이미지"
                className="mb-1 max-h-64 w-full rounded-lg object-cover"
              />
            )}
            {message.content && message.content !== '[이미지]' && (
              <p className="whitespace-pre-wrap break-words text-sm text-gray-900">
                {message.content}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-appear flex items-end gap-2">
      <div className="flex-shrink-0 self-end">
        {message.senderProfile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.senderProfile}
            alt={message.sender_name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-700">
            {message.sender_name[0] ?? '?'}
          </div>
        )}
      </div>

      <div className="flex max-w-[65%] flex-col gap-0.5">
        {showSender && (
          <p className="ml-1 text-xs font-medium text-gray-600">{message.sender_name}</p>
        )}
        <div className="flex items-end gap-1.5">
          <div className="bubble-received rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 shadow-sm">
            {message.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageUrl(message.image_url)}
                alt="이미지"
                className="mb-1 max-h-64 w-full rounded-lg object-cover"
              />
            )}
            {message.content && message.content !== '[이미지]' && (
              <p className="whitespace-pre-wrap break-words text-sm text-gray-900">
                {message.content}
              </p>
            )}
          </div>
          <span className="mb-0.5 flex-shrink-0 text-[10px] text-gray-500">
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
