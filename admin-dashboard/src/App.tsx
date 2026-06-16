import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  API_BASE_STORAGE_KEY,
  DEFAULT_API_BASE,
  EMAIL_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  getHealth,
  getMe,
  login
} from './api';
import type { EventLine, HealthResponse, PublicUser, RouteKey } from './types';

const initialEvents: EventLine[] = [
  {
    id: 'boot',
    tone: 'idle',
    label: 'console boot',
    detail: 'OCT / map v1 / graph sparse'
  },
  {
    id: 'origin',
    tone: 'warn',
    label: 'coord provisional',
    detail: 'lat 23.2462927 / lng 77.5019383'
  }
];

const routeLabels: Record<RouteKey, string> = {
  signal: 'Signal',
  review: 'Review',
  operators: 'Operators'
};

const navItems: RouteKey[] = ['signal', 'review', 'operators'];

const statusTone = (value?: string): 'ok' | 'warn' | 'idle' | 'error' => {
  if (!value) {
    return 'idle';
  }

  if (['ok', 'verified', 'active', 'not_required'].includes(value)) {
    return 'ok';
  }

  if (['otp_pending', 'provisional', 'pending_admin_review'].includes(value)) {
    return 'warn';
  }

  if (['rejected', 'deleted', 'error'].includes(value)) {
    return 'error';
  }

  return 'idle';
};

const shortToken = (token: string | null): string => {
  if (!token) {
    return 'token none';
  }

  return `jwt ${token.slice(0, 10)}...${token.slice(-8)}`;
};

const stamp = (): string => new Date().toLocaleTimeString('en-IN', { hour12: false });

function StatusPill({ label, value, tone }: { label: string; value: string; tone: EventLine['tone'] }) {
  return (
    <div className={`status-pill status-pill--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoginPanel({
  apiBase,
  email,
  loading,
  error,
  token,
  onApiBaseChange,
  onEmailChange,
  onSubmit,
  onLogout
}: {
  apiBase: string;
  email: string;
  loading: boolean;
  error: string | null;
  token: string | null;
  onApiBaseChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
}) {
  return (
    <form className="login-panel" onSubmit={onSubmit}>
      <div className="section-kicker">admin auth uplink</div>
      <h2>Login</h2>
      <label htmlFor="apiBase">API base</label>
      <input
        id="apiBase"
        spellCheck={false}
        value={apiBase}
        onChange={(event) => onApiBaseChange(event.target.value)}
      />
      <label htmlFor="adminEmail">Admin email</label>
      <input
        id="adminEmail"
        type="email"
        autoComplete="email"
        spellCheck={false}
        placeholder="vg8904937@gmail.com"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Authenticating' : 'Authenticate'}
      </button>
      {token ? (
        <button className="button-secondary" type="button" onClick={onLogout}>
          Clear session
        </button>
      ) : null}
      <p className="mono-readout">{shortToken(token)}</p>
      {error ? <p className="error-line">{error}</p> : null}
    </form>
  );
}

function TopStrip({
  health,
  user,
  token
}: {
  health: HealthResponse | null;
  user: PublicUser | null;
  token: string | null;
}) {
  return (
    <header className="top-strip">
      <div>
        <p className="eyebrow">CampusAR / admin console</p>
        <h1>OCT signal desk</h1>
      </div>
      <div className="top-status">
        <StatusPill label="health" value={health?.status ?? 'unknown'} tone={statusTone(health?.status)} />
        <StatusPill label="role" value={user?.primaryRole ?? 'none'} tone={user ? 'ok' : 'idle'} />
        <StatusPill label="verify" value={user?.verificationStatus ?? 'none'} tone={statusTone(user?.verificationStatus)} />
        <StatusPill label="auth" value={token ? 'bearer set' : 'offline'} tone={token ? 'ok' : 'idle'} />
      </div>
    </header>
  );
}

function LeftRail({ activeRoute, onRouteChange, health }: {
  activeRoute: RouteKey;
  onRouteChange: (route: RouteKey) => void;
  health: HealthResponse | null;
}) {
  return (
    <aside className="left-rail" aria-label="Console navigation">
      <div className="brand-mark">
        <span>CAR</span>
      </div>
      <nav className="nav-stack">
        {navItems.map((item) => (
          <button
            key={item}
            className={item === activeRoute ? 'nav-button nav-button--active' : 'nav-button'}
            type="button"
            onClick={() => onRouteChange(item)}
          >
            <span>{routeLabels[item]}</span>
          </button>
        ))}
      </nav>
      <div className="rail-metrics">
        <span>map v1</span>
        <strong>draft</strong>
        <span>graph sparse</span>
        <strong>{health?.status ?? 'no ping'}</strong>
      </div>
    </aside>
  );
}

function MapSurface({ activeRoute, user }: { activeRoute: RouteKey; user: PublicUser | null }) {
  return (
    <main className="map-stage" aria-label={`${routeLabels[activeRoute]} route`}>
      <div className="map-grid" aria-hidden="true" />
      <div className="scanline scanline-one" aria-hidden="true" />
      <div className="scanline scanline-two" aria-hidden="true" />
      <div className="coord-label coord-label--a">lat 23.2462927</div>
      <div className="coord-label coord-label--b">lng 77.5019383</div>
      <div className="campus-node campus-node--primary">
        <span />
        OCT
      </div>
      <div className="campus-node campus-node--secondary">
        <span />
        pin b
      </div>
      <div className="edge-line edge-line--one" aria-hidden="true" />
      <div className="edge-line edge-line--two" aria-hidden="true" />
      <section className="map-legend" aria-label="Map signal state">
        <p>{routeLabels[activeRoute]} route</p>
        <h2>{activeRoute === 'signal' ? 'campus signal surface' : activeRoute === 'review' ? 'pending geometry review' : 'operator watch'}</h2>
        <dl>
          <div>
            <dt>coord</dt>
            <dd>provisional</dd>
          </div>
          <div>
            <dt>mapper</dt>
            <dd>{user?.fullName ?? 'not authenticated'}</dd>
          </div>
          <div>
            <dt>queue</dt>
            <dd>pending_admin_review</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

function Inspector({
  health,
  user,
  lastSync,
  token
}: {
  health: HealthResponse | null;
  user: PublicUser | null;
  lastSync: string | null;
  token: string | null;
}) {
  return (
    <aside className="inspector" aria-label="Status inspector">
      <section>
        <div className="section-kicker">status bar feed</div>
        <div className="readout-list">
          <div>
            <span>GET /health</span>
            <strong>{health?.status ?? 'waiting'}</strong>
          </div>
          <div>
            <span>GET /api/v1/me</span>
            <strong>{user ? 'rendered' : 'no profile'}</strong>
          </div>
          <div>
            <span>role</span>
            <strong>{user?.primaryRole ?? 'none'}</strong>
          </div>
          <div>
            <span>verification</span>
            <strong>{user?.verificationStatus ?? 'none'}</strong>
          </div>
          <div>
            <span>last sync</span>
            <strong>{lastSync ?? 'never'}</strong>
          </div>
        </div>
      </section>

      <section>
        <div className="section-kicker">operator profile</div>
        <div className="profile-block">
          <h2>{user?.fullName ?? 'No active admin'}</h2>
          <p>{user?.email ?? 'Authenticate to bind the console to a backend identity.'}</p>
          <p className="mono-readout">{shortToken(token)}</p>
        </div>
      </section>
    </aside>
  );
}

function EventStrip({ events }: { events: EventLine[] }) {
  return (
    <footer className="event-strip" aria-label="Event strip">
      {events.map((event) => (
        <div className={`event-line event-line--${event.tone}`} key={event.id}>
          <span>{event.label}</span>
          <strong>{event.detail}</strong>
        </div>
      ))}
    </footer>
  );
}

export function App() {
  const [apiBase, setApiBase] = useState(() => localStorage.getItem(API_BASE_STORAGE_KEY) ?? DEFAULT_API_BASE);
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_STORAGE_KEY) ?? 'vg8904937@gmail.com');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<PublicUser | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteKey>('signal');
  const [events, setEvents] = useState<EventLine[]>(initialEvents);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const pushEvent = useCallback((event: Omit<EventLine, 'id'>) => {
    setEvents((current) => [
      { ...event, id: `${Date.now()}-${event.label}` },
      ...current
    ].slice(0, 8));
  }, []);

  const syncStatus = useCallback(async (nextToken = token) => {
    try {
      const healthPayload = await getHealth(apiBase);
      setHealth(healthPayload);
      pushEvent({ tone: statusTone(healthPayload.status), label: 'GET /health', detail: `${healthPayload.status} @ ${stamp()}` });

      if (nextToken) {
        const mePayload = await getMe(apiBase, nextToken);
        setUser(mePayload.user);
        pushEvent({
          tone: statusTone(mePayload.user.verificationStatus),
          label: 'GET /api/v1/me',
          detail: `${mePayload.user.primaryRole} / ${mePayload.user.verificationStatus}`
        });
      }

      setLastSync(stamp());
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to reach CampusAR backend';
      setError(message);
      pushEvent({ tone: 'error', label: 'api fault', detail: message });
    }
  }, [apiBase, pushEvent, token]);

  useEffect(() => {
    localStorage.setItem(API_BASE_STORAGE_KEY, apiBase);
  }, [apiBase]);

  useEffect(() => {
    if (email.trim()) {
      localStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
    }
  }, [email]);

  useEffect(() => {
    void syncStatus(token);
  }, [syncStatus, token]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await login(apiBase, email.trim());
      setToken(session.tokens.accessToken);
      setUser(session.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, session.tokens.accessToken);
      pushEvent({
        tone: 'ok',
        label: 'POST /auth/login',
        detail: `${session.user.primaryRole} authenticated`
      });
      await syncStatus(session.tokens.accessToken);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Login failed';
      setError(message);
      pushEvent({ tone: 'error', label: 'login denied', detail: message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    pushEvent({ tone: 'idle', label: 'session cleared', detail: 'jwt removed from local storage' });
  };

  const shellClass = useMemo(() => `app-shell app-shell--${activeRoute}`, [activeRoute]);

  return (
    <div className={shellClass}>
      <TopStrip health={health} user={user} token={token} />
      <div className="workspace">
        <LeftRail activeRoute={activeRoute} onRouteChange={setActiveRoute} health={health} />
        <MapSurface activeRoute={activeRoute} user={user} />
        <div className="right-stack">
          <LoginPanel
            apiBase={apiBase}
            email={email}
            loading={loading}
            error={error}
            token={token}
            onApiBaseChange={setApiBase}
            onEmailChange={setEmail}
            onSubmit={handleLogin}
            onLogout={handleLogout}
          />
          <Inspector health={health} user={user} lastSync={lastSync} token={token} />
        </div>
      </div>
      <EventStrip events={events} />
    </div>
  );
}
