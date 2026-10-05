export default function MessageInput({ input, onChange, onSubmit, inputRef }) {
  return (
    <form className="input-bar" onSubmit={onSubmit}>
      <textarea
        ref={inputRef}
        className="message-input"
        value={input}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e);
          }
        }}
        placeholder="Type a message"
        rows={1}
      />
      <button type="submit" disabled={!input.trim()}>Send</button>
    </form>
  );
}