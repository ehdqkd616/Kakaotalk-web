import type { Message } from '@/types';

interface Props {
  message: Message;
  showSender: boolean;
}

export default function MessageBubble({ message, showSender }: Props) {
  const isSent = message.direction === 'sent';

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isSent) {
    return (
      <div className="msg-appear flex items-end justify-end gap-1.5">
        <span className="mb-0.5 flex-shrink-0 self-end text-[10px] text-gray-500">
          {formatTime(message.created_at)}
        </span>
        <div className="relative max-w-[65%]">
          <div className="bubble-sent relative rounded-2xl rounded-br-sm bg-kakao-my-bubble px-3.5 py-2 shadow-sm">
            <p className="whitespace-pre-wrap break-words text-sm text-gray-900">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-appear flex items-end gap-2">
      {/* 발신자 아바타 */}
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
          <p className="ml-1 text-xs font-medium text-gray-600">
            {message.sender_name}
          </p>
        )}
        <div className="flex items-end gap-1.5">
          <div className="relative">
            <div className="bubble-received relative rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 shadow-sm">
              <p className="whitespace-pre-wrap break-words text-sm text-gray-900">
                {message.content}
              </p>
            </div>
          </div>
          <span className="mb-0.5 flex-shrink-0 text-[10px] text-gray-500">
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
