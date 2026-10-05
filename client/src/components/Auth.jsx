import { useState } from 'react';

const API = `${import.meta.env.VITE_API_URL}/api/auth`;

export default function Auth({ onAuth }) {
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <div className="join-screen">
      <form className="join-card" onSubmit={handleSubmit}>
        <div className="join-logo">💬</div>
        <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
        <p>{isLogin ? 'Log in to join the chat' : 'Pick a username and password'}</p>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          maxLength={20}
          autoFocus
        />
        <div className="password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="Password"
          />
          {(password || passwordFocused) && (
            <button
              type="button"
              className="toggle-password"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading || !username.trim() || !password}>
          {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
        </button>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setMode(isLogin ? 'signup' : 'login');
            setError('');
          }}
        >
          {isLogin ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  );
}