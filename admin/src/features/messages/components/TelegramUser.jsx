/** Name and @username when the bot has seen them, falling back to the numeric Telegram id. */
export function TelegramUser({ id, name, username }) {
  return (
    <span className="telegram-user">
      <span>{name || <span className="mono">{id}</span>}</span>
      {username
        ? <a href={`https://t.me/${username}`} target="_blank" rel="noreferrer">@{username}</a>
        : name && <span className="record-id">{id}</span>}
    </span>
  );
}
