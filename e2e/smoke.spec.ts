import { type Page, type Route } from '@playwright/test';
import { expect, test as base } from './setup/warning-gate';

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const ACCESS_TOKEN = 'local-smoke-access-token';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const LANDING_RENDERER_READY_TIMEOUT = 12_000;

type JsonObject = Record<string, unknown>;

interface FixtureGoal {
  id: string;
  title: string;
  description: string | null;
  target_hours: number;
  status: 'Active';
  target_date: string | null;
  created_at: string;
  updated_at: string;
  logged_minutes: number;
  subjects: string[];
}

type RouteHandler = (route: Route) => Promise<void>;

type EasterEgg =
  | 'week-circuit'
  | 'full-charge'
  | 'duration-sequence'
  | 'overcharge'
  | 'week-and-charge';

function easterEgg(page: Page, name: EasterEgg) {
  return page.locator(`.ss-easter-egg[data-easter-egg="${name}"]`);
}

async function seedGuestStudy(
  page: Page,
  options: { totalMinutes: number; currentWeekDays?: number[] },
): Promise<void> {
  await page.evaluate(({ totalMinutes, currentWeekDays }) => {
    const goalId = 'easter-egg-focus-goal';
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const sessions = (currentWeekDays ?? []).map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + day);
      return {
        id: `easter-week-${index}`,
        goalId,
        minutes: 1,
        endedAt: date.toISOString(),
      };
    });
    const remainingMinutes = totalMinutes - sessions.reduce((sum, item) => sum + item.minutes, 0);
    if (remainingMinutes > 0) {
      const oldDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8, 12);
      sessions.push({
        id: 'easter-charge-history',
        goalId,
        minutes: remainingMinutes,
        endedAt: oldDate.toISOString(),
      });
    }
    localStorage.setItem(
      'studysprint:guest-study:v1',
      JSON.stringify({
        goals: [{ id: goalId, title: 'Focus session' }],
        activeGoalId: goalId,
        sessions,
      }),
    );
  }, options);
}

function asObject(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as JsonObject;
}

function stringValue(body: JsonObject, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value : '';
}

function numberValue(body: JsonObject, key: string, fallback: number): number {
  const value = Number(body[key]);
  return Number.isFinite(value) ? value : fallback;
}

class LocalSupabaseBackend {
  private readonly users = new Map<string, string>();
  private readonly goals = new Map<string, FixtureGoal>();
  private readonly sessions: JsonObject[] = [];
  private nextGoalNumber = 1;
  private routeHandler: RouteHandler | null = null;
  private currentEmail = '';

  get goalCount(): number {
    return this.goals.size;
  }

  get sessionCount(): number {
    return this.sessions.length;
  }

  async install(page: Page): Promise<void> {
    const handler: RouteHandler = async (route) => {
      try {
        await this.handle(route);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fixture request failed';
        await this.json(route, 500, { message });
      }
    };
    this.routeHandler = handler;
    await page.route(`${LOCAL_SUPABASE_URL}/**`, handler);
  }

  async dispose(page: Page): Promise<void> {
    if (this.routeHandler) {
      await page.unroute(`${LOCAL_SUPABASE_URL}/**`, this.routeHandler);
      this.routeHandler = null;
    }
    this.users.clear();
    this.goals.clear();
    this.sessions.length = 0;
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: this.corsHeaders() });
      return;
    }

    if (url.pathname.startsWith('/auth/v1/')) {
      await this.handleAuth(route, url);
      return;
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      await this.handleRest(route, url);
      return;
    }
    if (url.pathname.startsWith('/functions/v1/')) {
      await this.handleFunctions(route, url);
      return;
    }

    await this.json(route, 404, { message: `Unhandled fixture path: ${url.pathname}` });
  }

  private async handleAuth(route: Route, url: URL): Promise<void> {
    const request = route.request();

    if (url.pathname.endsWith('/settings')) {
      await this.json(route, 200, { disable_signup: false, mailer_autoconfirm: true });
      return;
    }

    if (url.pathname.endsWith('/signup') && request.method() === 'POST') {
      const body = asObject(request.postDataJSON());
      const email = stringValue(body, 'email').toLowerCase();
      const password = stringValue(body, 'password');
      this.users.set(email, password);
      this.currentEmail = email;
      await this.json(route, 200, this.session(email));
      return;
    }

    if (url.pathname.endsWith('/token') && request.method() === 'POST') {
      const body = asObject(request.postDataJSON());
      const email = stringValue(body, 'email').toLowerCase();
      const password = stringValue(body, 'password');
      if (!this.users.has(email) || this.users.get(email) !== password) {
        await this.json(route, 400, {
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
          msg: 'Invalid login credentials',
        });
        return;
      }
      this.currentEmail = email;
      await this.json(route, 200, this.session(email));
      return;
    }

    if (url.pathname.endsWith('/user') && request.method() === 'PUT') {
      await this.json(route, 200, { user: this.user(this.currentEmail) });
      return;
    }

    if (url.pathname.endsWith('/logout') && request.method() === 'POST') {
      await route.fulfill({ status: 204, headers: this.corsHeaders() });
      return;
    }

    await this.json(route, 404, { message: `Unhandled auth path: ${url.pathname}` });
  }

  private async handleRest(route: Route, url: URL): Promise<void> {
    const request = route.request();
    if (request.headers().authorization !== `Bearer ${ACCESS_TOKEN}`) {
      await this.json(route, 401, { message: 'Not authenticated' });
      return;
    }

    if (url.pathname === '/rest/v1/goals_with_stats' && request.method() === 'GET') {
      const filter = url.searchParams.get('id');
      if (filter?.startsWith('eq.')) {
        const goal = this.goals.get(filter.slice(3));
        if (!goal) {
          await this.json(route, 406, { message: 'Goal not found' });
          return;
        }
        await this.json(route, 200, goal);
        return;
      }
      await this.json(route, 200, [...this.goals.values()]);
      return;
    }

    if (url.pathname === '/rest/v1/study_goals' && request.method() === 'POST') {
      const body = asObject(request.postDataJSON());
      const id = `smoke-goal-${this.nextGoalNumber++}`;
      const goal: FixtureGoal = {
        id,
        title: stringValue(body, 'title'),
        description: typeof body.description === 'string' ? body.description : null,
        target_hours: numberValue(body, 'target_hours', 1),
        status: 'Active',
        target_date: typeof body.target_date === 'string' ? body.target_date : null,
        created_at: FIXTURE_TIMESTAMP,
        updated_at: FIXTURE_TIMESTAMP,
        logged_minutes: 0,
        subjects: [],
      };
      this.goals.set(id, goal);
      await this.json(route, 201, { id });
      return;
    }

    if (url.pathname === '/rest/v1/study_sessions' && request.method() === 'GET') {
      await this.json(route, 200, this.sessions);
      return;
    }

    if (url.pathname === '/rest/v1/study_sessions' && request.method() === 'POST') {
      const body = asObject(request.postDataJSON());
      const goalId = stringValue(body, 'goal_id');
      const minutes = numberValue(body, 'duration_minutes', 0);
      const goal = this.goals.get(goalId);
      if (!goal || minutes < 1) {
        await this.json(route, 400, { message: 'Invalid study session' });
        return;
      }
      goal.logged_minutes += minutes;
      const session = {
        id: `smoke-session-${this.sessions.length + 1}`,
        goal_id: goalId,
        duration_minutes: minutes,
        notes: null,
        logged_at: FIXTURE_TIMESTAMP,
        quality: null,
        next_review_at: null,
        gcal_event_id: null,
      };
      this.sessions.push(session);
      await this.json(route, 201, session);
      return;
    }

    await this.json(route, 404, { message: `Unhandled REST path: ${url.pathname}` });
  }

  private async handleFunctions(route: Route, url: URL): Promise<void> {
    if (url.pathname.endsWith('/google-calendar/status')) {
      await this.json(route, 200, { configured: false, connected: false });
      return;
    }
    await this.json(route, 404, { message: `Unhandled function path: ${url.pathname}` });
  }

  private user(email: string): JsonObject {
    return {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: FIXTURE_TIMESTAMP,
      phone: '',
      confirmation_sent_at: null,
      confirmed_at: FIXTURE_TIMESTAMP,
      last_sign_in_at: FIXTURE_TIMESTAMP,
      created_at: FIXTURE_TIMESTAMP,
      updated_at: FIXTURE_TIMESTAMP,
      identities: [
        {
          identity_id: USER_ID,
          id: USER_ID,
          user_id: USER_ID,
          identity_data: { email },
          provider: 'email',
          created_at: FIXTURE_TIMESTAMP,
          updated_at: FIXTURE_TIMESTAMP,
        },
      ],
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
    };
  }

  private session(email: string): JsonObject {
    return {
      access_token: ACCESS_TOKEN,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'local-smoke-refresh-token',
      user: this.user(email),
    };
  }

  private corsHeaders(): Record<string, string> {
    return {
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-origin': '*',
    };
  }

  private async json(route: Route, status: number, body: unknown): Promise<void> {
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: this.corsHeaders(),
      body: JSON.stringify(body),
    });
  }
}

const test = base.extend<{ localBackend: LocalSupabaseBackend }>({
  localBackend: async ({ page }, use) => {
    const backend = new LocalSupabaseBackend();
    await backend.install(page);
    try {
      await use(backend);
    } finally {
      await backend.dispose(page);
    }
  },
});

test.describe('PR smoke suite', () => {
  test('renders the public landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ss-experience')).toHaveCSS('--ss-entry-duration', '5000ms');
    await expect(
      page.getByRole('heading', { name: /Focus in\.\s*Charge up\./ }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create an account' }).first()).toBeVisible();
  });

  test('starts, pauses and saves a guest session on the landing page', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.ss-charge-number')).toHaveText('0%');
    await page.getByRole('radio', { name: '30 min', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: '60 min', exact: true })).toBeChecked();
    const bolt = page.getByRole('button', { name: 'Start a 60 minute focus timer' });
    await bolt.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
    await page.getByRole('button', { name: 'Pause focus timer' }).click();
    await expect(page.getByRole('button', { name: 'Resume focus timer' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume focus timer' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
    await page.clock.fastForward(6 * 60 * 1000);
    await page.getByRole('button', { name: 'Finish and save' }).click();
    await expect(page.getByRole('status').first()).toHaveText('6 minutes saved on this device.');
    await expect(page.locator('.ss-charge-number')).toHaveText('1%');
    await page.reload();
    await expect(page.locator('.ss-charge-number')).toHaveText('1%');
    await expect(page.getByText('Focus session — 6 min')).toBeVisible();
    await page.getByRole('button', { name: 'Clear guest data' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear data' }).click();
    await expect(page.locator('.ss-charge-number')).toHaveText('0%');
    expect(writes).toEqual([]);
  });

  test('saves a focus session once when the selected duration ends', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await page.clock.fastForward(30 * 60 * 1000);
    await expect(page.locator('.ss-result')).toHaveText('30 minutes saved on this device.');
    await expect(page.locator('.ss-charge-number')).toHaveText('5%');
    const saved = await page.evaluate(() => localStorage.getItem('studysprint:guest-study:v1'));
    expect(JSON.parse(saved ?? '{}').sessions).toHaveLength(1);
  });

  test('runs the duration sequence egg for 30, 60, then 90 minutes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });

    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '30 min', exact: true }).check();
    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '90 min', exact: true }).check();

    await expect(easterEgg(page, 'duration-sequence')).toBeVisible();
    await expect(page.getByRole('radio', { name: '90 min', exact: true })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Start a 90 minute focus timer' })).toBeVisible();
  });

  test('shows the egg preview only after local opt-in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('egg-preview-panel')).toHaveCount(0);

    await page.goto('/?easter-eggs=1');
    const panel = page.getByTestId('egg-preview-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Play all' })).toBeHidden();
    await panel.locator('summary').click();
    await expect(panel.getByRole('button', { name: 'Play all' })).toBeVisible();
  });

  test('preview buttons play their matching effects without changing guest state', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    await page.goto('/?easter-eggs=1');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    const panel = page.getByTestId('egg-preview-panel');
    await panel.locator('summary').click();
    const before = await page.evaluate(() =>
      JSON.stringify(
        Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
      )
    );

    for (
      const name of [
        'week-circuit',
        'full-charge',
        'duration-sequence',
        'overcharge',
        'week-and-charge',
      ] as const
    ) {
      await panel.getByTestId(`preview-${name}`).click();
      await expect(easterEgg(page, name)).toBeVisible();
      await expect(easterEgg(page, name)).toHaveCount(0, { timeout: 2_000 });
    }

    await expect(page.locator('.ss-object')).toHaveAttribute('data-phase', 'idle');
    expect(
      await page.evaluate(() =>
        JSON.stringify(
          Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
        )
      ),
    ).toBe(before);
    expect(writes).toEqual([]);
  });

  test('Play all serializes the four eggs and combined flourish without saving data', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    await page.goto('/?easter-eggs=1');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    const panel = page.getByTestId('egg-preview-panel');
    await panel.locator('summary').click();
    const before = await page.evaluate(() =>
      JSON.stringify(
        Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
      )
    );
    await panel.getByTestId('preview-play-all').click();

    for (
      const name of [
        'week-circuit',
        'full-charge',
        'duration-sequence',
        'overcharge',
        'week-and-charge',
      ] as const
    ) {
      await expect(easterEgg(page, name)).toHaveAttribute('data-easter-egg', name, {
        timeout: 3_000,
      });
    }
    await expect(page.locator('.ss-easter-egg')).toHaveCount(0, { timeout: 2_000 });
    await expect(page.locator('.ss-object')).toHaveAttribute('data-phase', 'idle');
    expect(
      await page.evaluate(() =>
        JSON.stringify(
          Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
        )
      ),
    ).toBe(before);
    expect(writes).toEqual([]);
  });

  test('preview playback leaves signed-in timer and Supabase data unchanged', async ({ page, localBackend }) => {
    await page.goto('/register');
    await page.getByPlaceholder('name@example.com').fill('egg-preview@example.com');
    await page.locator('input[type="password"]').fill('Sprint-42-go');
    await page.getByRole('button', { name: /Create account/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const writes: string[] = [];
    page.on('request', (request) => {
      if (
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) &&
        new URL(request.url()).pathname.startsWith('/rest/v1/') &&
        new URL(request.url()).pathname !== '/rest/v1/rpc/analytics_summary'
      ) writes.push(request.url());
    });
    await page.goto('/?easter-eggs=1');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    const panel = page.getByTestId('egg-preview-panel');
    await panel.locator('summary').click();
    const before = await page.evaluate(() =>
      JSON.stringify(
        Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
      )
    );
    await panel.getByTestId('preview-play-all').click();

    for (
      const name of [
        'week-circuit',
        'full-charge',
        'duration-sequence',
        'overcharge',
        'week-and-charge',
      ] as const
    ) {
      await expect(easterEgg(page, name)).toHaveAttribute('data-easter-egg', name, {
        timeout: 3_000,
      });
    }
    await expect(page.locator('.ss-easter-egg')).toHaveCount(0, { timeout: 2_000 });
    await expect(page.locator('.ss-object')).toHaveAttribute('data-phase', 'idle');
    expect(
      await page.evaluate(() =>
        JSON.stringify(
          Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
        )
      ),
    ).toBe(before);
    expect(writes).toEqual([]);
    expect(localBackend.goalCount).toBe(0);
    expect(localBackend.sessionCount).toBe(0);
  });

  test('does not play previews while motion is paused or reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?easter-eggs=1');
    const panel = page.getByTestId('egg-preview-panel');
    await panel.locator('summary').click();
    await page.getByRole('button', { name: 'Pause animations' }).click();
    await expect(panel.getByTestId('preview-play-all')).toBeDisabled();
    await expect(panel.getByRole('status')).toContainText('Resume animations');
    await expect(page.locator('.ss-easter-egg')).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    const reducedPanel = page.getByTestId('egg-preview-panel');
    await reducedPanel.locator('summary').click();
    await expect(reducedPanel.getByTestId('preview-play-all')).toBeDisabled();
    await expect(reducedPanel.getByRole('status')).toContainText('reduced motion');
    await expect(page.locator('.ss-easter-egg')).toHaveCount(0);
  });

  test('consumes an egg trigger without replay when reduced motion is enabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '30 min', exact: true }).check();
    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '90 min', exact: true }).check();
    await expect(easterEgg(page, 'duration-sequence')).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(easterEgg(page, 'duration-sequence')).toHaveCount(0);
  });

  test('consumes an egg trigger without replay when visual motion is paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Pause animations' }).click();

    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '30 min', exact: true }).check();
    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '90 min', exact: true }).check();
    await expect(easterEgg(page, 'duration-sequence')).toHaveCount(0);

    await page.getByRole('button', { name: 'Resume animations' }).click();
    await expect(easterEgg(page, 'duration-sequence')).toHaveCount(0);
  });

  test('plays overcharge on the tenth bolt activation without changing timer actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });

    for (let activation = 1; activation <= 10; activation++) {
      await page.getByRole('button', {
        name: activation === 1
          ? 'Start a 30 minute focus timer'
          : activation % 2 === 0
          ? 'Pause focus timer'
          : 'Resume focus timer',
      }).click();
    }

    await expect(easterEgg(page, 'overcharge')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume focus timer' })).toBeVisible();
    await expect(page.locator('.ss-charge-number')).toHaveText('0%');
  });

  test('plays queued effects one at a time in trigger order', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });

    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '30 min', exact: true }).check();
    await page.getByRole('radio', { name: '60 min', exact: true }).check();
    await page.getByRole('radio', { name: '90 min', exact: true }).check();
    const sequenceEffect = easterEgg(page, 'duration-sequence');
    const overchargeEffect = easterEgg(page, 'overcharge');
    await expect(sequenceEffect).toBeVisible();
    await page.locator('[data-testid="landing-bolt"]').evaluate((button: HTMLButtonElement) => {
      for (let activation = 0; activation < 10; activation++) button.click();
    });
    await expect(overchargeEffect).toHaveCount(0);
    await expect(overchargeEffect).toBeVisible({ timeout: 5000 });
    await expect(sequenceEffect).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
  });

  test('plays the week circuit only after a guest save fills the last day', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    const today = await page.evaluate(() => (new Date().getDay() + 6) % 7);
    const otherDays = Array.from({ length: 7 }, (_, index) => index).filter((day) => day !== today);
    await seedGuestStudy(page, { totalMinutes: 6, currentWeekDays: otherDays });
    await page.reload();
    await expect(page.locator('.ss-charge-number')).toHaveText('1%');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    await expect(easterEgg(page, 'week-circuit')).toHaveCount(0);

    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await page.clock.fastForward(60_000);
    const effectVisible = expect(easterEgg(page, 'week-circuit')).toBeVisible();
    await page.getByRole('button', { name: 'Finish and save' }).click();
    await Promise.all([
      effectVisible,
      expect(page.locator('.ss-result')).toHaveText('1 minute saved on this device.'),
      expect(page.locator('.ss-charge-number')).toHaveText('1%'),
    ]);
  });

  test('plays full charge on a successful guest save and not on preloaded progress', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await seedGuestStudy(page, { totalMinutes: 594, currentWeekDays: [0, 1, 2, 3, 4, 5, 6] });
    await page.reload();
    await expect(page.locator('.ss-charge-number')).toHaveText('99%');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    await expect(easterEgg(page, 'full-charge')).toHaveCount(0);

    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await page.clock.fastForward(6 * 60_000);
    const effectVisible = expect(easterEgg(page, 'full-charge')).toBeVisible();
    await page.getByRole('button', { name: 'Finish and save' }).click();
    await Promise.all([
      effectVisible,
      expect(page.locator('.ss-result')).toHaveText('6 minutes saved on this device.'),
      expect(page.locator('.ss-charge-number')).toHaveText('100%'),
    ]);
  });

  test('combines the final day and full-charge milestones from one guest save', async ({ page }) => {
    await page.goto('/');
    const startButton = page.getByRole('button', { name: 'Start a 30 minute focus timer' });
    await expect(startButton).toHaveAttribute('aria-disabled', 'false');
    const today = await page.evaluate(() => (new Date().getDay() + 6) % 7);
    const otherDays = Array.from({ length: 7 }, (_, index) => index).filter((day) => day !== today);
    await seedGuestStudy(page, { totalMinutes: 594, currentWeekDays: otherDays });
    await page.reload();
    await expect(startButton).toHaveAttribute('aria-disabled', 'false');
    await expect(page.locator('.ss-charge-number')).toHaveText('99%');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    await expect(easterEgg(page, 'week-and-charge')).toHaveCount(0);

    await page.clock.install();
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await page.clock.fastForward(6 * 60_000);
    const effectVisible = expect(easterEgg(page, 'week-and-charge')).toBeVisible();
    await page.getByRole('button', { name: 'Finish and save' }).click();
    await Promise.all([
      effectVisible,
      expect(page.locator('.ss-result')).toHaveText('6 minutes saved on this device.'),
      expect(page.locator('.ss-charge-number')).toHaveText('100%'),
    ]);
    await expect(easterEgg(page, 'week-circuit')).toHaveCount(0);
    await expect(easterEgg(page, 'full-charge')).toHaveCount(0);
  });

  test('does not credit an immediate tap as study time', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await page.getByRole('button', { name: 'Finish and save' }).click();
    await expect(page.locator('.ss-result')).toHaveText(
      'Study for at least one minute before saving a session.',
    );
    await expect(page.locator('.ss-charge-number')).toHaveText('0%');
    await page.getByRole('button', { name: 'Cancel session' }).click();
    await expect(page.getByRole('button', { name: 'Start a 30 minute focus timer' })).toBeVisible();
  });

  test('renders the model and keeps the focus timer running when visual motion is paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
    await page.getByRole('button', { name: 'Pause animations' }).click();
    await expect(page.locator('.ss-object')).toHaveAttribute('data-phase', 'running');
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
    await expect(page.locator('.ss-charge-number')).toHaveText('0%');
    await expect.poll(() =>
      page.evaluate(() =>
        document.getAnimations().filter((animation) => animation.playState === 'running').length
      )
    ).toBe(0);
  });

  test('retains usable controls when the model fails to load', async ({ page }) => {
    await page.route('**/landing/charge-sculpture.glb', (route) => route.abort());
    await page.goto('/');
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'fallback');
    const poster = page.locator('.ss-sculpture:visible');
    await expect(poster).toBeVisible();
    await expect(poster).toHaveAttribute(
      'src',
      /\/landing\/charge-sculpture-(light|dark)\.webp$/,
    );
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
  });

  test('keeps the fallback functional without WebGL', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
          if (kind.includes('webgl')) return null;
          return Reflect.apply(original, this, [kind, ...args]);
        },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await expect(page.locator('.ss-sculpture:visible')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
  });

  test('falls back after context loss and preserves the result', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready', {
      timeout: LANDING_RENDERER_READY_TIMEOUT,
    });
    await page.locator('.ss-canvas canvas').evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    );
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'fallback');
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
  });

  test('selects a goal, restores focus and shows one annotation at a time', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ss-goal-label')).toContainText('Focus session');
    await expect(page.locator('.ss-goal-trigger')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'New goal' }).fill('Review vector spaces');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('.ss-goal-label')).toContainText('Review vector spaces');
    await expect(page.locator('.ss-goal-trigger')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'New goal' }).fill('Practice eigenvectors');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const selected = page.getByRole('button', { name: 'Your next step Review vector spaces' });
    await selected.click();
    await page.locator('#study-goals').getByRole('button', {
      name: 'Review vector spaces',
      exact: true,
    }).click();
    await expect(selected).toBeFocused();
    await selected.click();
    await page.locator('#study-goals').getByRole('button', {
      name: 'Review vector spaces',
      exact: true,
    }).focus();
    await page.keyboard.press('Escape');
    await expect(selected).toBeFocused();
    await selected.click();
    await page.getByRole('button', { name: 'Monday: 0 minutes' }).click();
    await expect(page.locator('#study-goals')).toHaveCount(0);
    await expect(page.locator('#sample-day')).toHaveText('Monday: 0 minutes');
    await page.keyboard.press('Escape');
    await expect(page.locator('#sample-day')).toHaveText('Select a day to see study minutes.');
  });

  test('dragging the bolt does not start a session', async ({ page }) => {
    await page.goto('/');
    const bolt = page.getByRole('button', { name: 'Start a 30 minute focus timer' });
    const box = await bolt.boundingBox();
    if (!box) throw new Error('Bolt hit target missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 15, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('.ss-charge-number')).toHaveText('0%');
    await expect(page.getByRole('button', { name: 'Start a 30 minute focus timer' })).toBeVisible();
    await bolt.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
  });

  test('cancelled touch gestures preserve charge and allow vertical scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto('/');
    const bolt = page.getByRole('button', { name: 'Start a 30 minute focus timer' });
    expect(await bolt.evaluate((element) => getComputedStyle(element).touchAction)).toBe('pan-y');
    const box = await bolt.boundingBox();
    if (!box) throw new Error('Bolt hit target missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await bolt.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
    await page.mouse.up();
    await expect(page.locator('.ss-charge-number')).toHaveText('0%');
    await page.getByRole('link', { name: 'Create an account' }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  });

  for (const width of [320, 390, 621, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      test(`bolt layout at ${width}px in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
        await page.goto('/');
        await expect(page.locator('.ss-object')).toHaveAttribute('data-renderer', 'ready');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        for (
          const selector of [
            '.ss-goal-anchor',
            '.ss-charge-anchor',
            '.ss-history',
            '.ss-durations',
          ]
        ) {
          const box = await page.locator(selector).boundingBox();
          expect(box).not.toBeNull();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        }
        const stemError = await page.evaluate(() => {
          const svg = document.querySelector<SVGSVGElement>('.ss-orbit');
          const ellipse = svg?.querySelector('ellipse');
          const matrix = svg?.getScreenCTM();
          if (!svg || !ellipse || !matrix) return Number.POSITIVE_INFINITY;
          const cx = Number(ellipse.getAttribute('cx'));
          const cy = Number(ellipse.getAttribute('cy'));
          const rx = Number(ellipse.getAttribute('rx'));
          const ry = Number(ellipse.getAttribute('ry'));
          return Math.max(...Array.from(
            document.querySelectorAll<HTMLLabelElement>('.ss-durations label'),
            (label) => {
              const stem = label.querySelector<HTMLElement>('.ss-duration-stem');
              const angle = Number(label.dataset.orbitAngle) * Math.PI / 180;
              if (!stem || !Number.isFinite(angle)) return Number.POSITIVE_INFINITY;
              const point = svg.createSVGPoint();
              point.x = cx + rx * Math.cos(angle);
              point.y = cy + ry * Math.sin(angle);
              const anchor = point.matrixTransform(matrix);
              const line = stem.getBoundingClientRect();
              const below = matchMedia('(max-width: 699px)').matches &&
                label.dataset.duration === '60';
              const endpointY = below ? line.top : line.bottom;
              return Math.hypot(line.left + line.width / 2 - anchor.x, endpointY - anchor.y);
            },
          ));
        });
        expect(stemError).toBeLessThan(1);
        const durationBubble = await page.locator('.ss-durations label[data-duration="90"]')
          .boundingBox();
        const chargeAnchor = await page.locator('.ss-charge-anchor').boundingBox();
        expect(durationBubble).not.toBeNull();
        expect(chargeAnchor).not.toBeNull();
        expect(
          durationBubble!.x + durationBubble!.width <= chargeAnchor!.x ||
            chargeAnchor!.x + chargeAnchor!.width <= durationBubble!.x ||
            durationBubble!.y + durationBubble!.height <= chargeAnchor!.y ||
            chargeAnchor!.y + chargeAnchor!.height <= durationBubble!.y,
        ).toBe(true);
        await page.getByRole('radio', { name: '90 min', exact: true }).check();
        await page.getByRole('button', { name: 'Start a 90 minute focus timer' }).click();
        await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
        await expect(page.locator('.ss-object')).toHaveAttribute('data-phase', 'running');
        await page.screenshot({ path: `test-results/bolt-${width}-${theme}.png`, fullPage: true });
      });
    }
  }

  test('registers a student and creates a goal', async ({ page, localBackend }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Create an account' }).first().click();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByPlaceholder('name@example.com').fill('smoke@example.com');
    await page.locator('input[type="password"]').fill('Sprint-42-go');
    await page.getByRole('button', { name: /Create account/ }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Your sprints.' })).toBeVisible();
    await expect(page.getByText('No goals yet.')).toBeVisible();

    await page.getByRole('link', { name: 'New goal' }).click();
    await expect(page.getByRole('heading', { name: 'New sprint.' })).toBeVisible();
    await page.getByPlaceholder('Finish calculus review').fill('Linear algebra review');
    await page.getByRole('spinbutton').fill('4');
    await page.getByRole('button', { name: /Create goal/ }).click();

    await expect(page).toHaveURL(/\/goal\/smoke-goal-1$/);
    await expect(page.getByRole('heading', { name: 'Linear algebra review' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Sessions' })).toBeVisible();
    expect(localBackend.goalCount).toBe(1);
    await page.clock.install();
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.ss-goal-label')).toContainText('Linear algebra review');
    await page.getByRole('button', { name: 'Start a 30 minute focus timer' }).click();
    await page.clock.fastForward(60 * 1000);
    await page.getByRole('button', { name: 'Finish and save' }).click();
    await expect(page.locator('.ss-result')).toHaveText('1 minute saved to your account.');
    expect(localBackend.sessionCount).toBe(1);
  });

  test('selects a theme by keyboard and restores trigger focus', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Theme settings' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitemradio', { name: 'System', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitemradio', { name: 'Light', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveClass('light');
    await expect(trigger).toBeFocused();
    await page.reload();
    await expect(page.locator('html')).toHaveClass('light');
  });

  test('keeps password validation on the registration page', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('name@example.com').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('abc');
    await page.getByRole('button', { name: /Create account/ }).click();

    await expect(page.getByRole('alert')).toHaveText('Password must be at least 8 characters.');
    await expect(page).toHaveURL(/\/register$/);
  });
});
