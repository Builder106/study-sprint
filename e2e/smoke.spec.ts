import { expect, type Page, type Route, test as base } from '@playwright/test';

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const ACCESS_TOKEN = 'local-smoke-access-token';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00.000Z';

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
  private nextGoalNumber = 1;
  private routeHandler: RouteHandler | null = null;
  private currentEmail = '';

  get goalCount(): number {
    return this.goals.size;
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
      await this.json(route, 200, []);
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
    await expect(
      page.getByRole('heading', { name: 'StudySprint is getting a new look.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();
  });

  test('registers a student and creates a goal', async ({ page, localBackend }) => {
    await page.goto('/register');
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
