import { test, expect } from '@playwright/test';

test.describe('Task 18 E2E Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/**', async (route) => {
      const url = route.request().url();
      if (url.includes('session') || url.includes('get-session')) {
        const role = (page.url().includes('trainings') || url.includes('admin')) ? 'admin' : 'member';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            user: { id: '1', email: 'test@example.com', name: 'Test User' },
            session: { id: 's1', userId: '1', expiresAt: new Date(Date.now() + 3600000).toISOString() },
            member: { role }
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: '1', email: 'test@example.com', name: 'Test User' },
            session: { id: 's1', userId: '1', expiresAt: new Date(Date.now() + 3600000).toISOString() }
          }),
        });
      }
    });

    await page.addInitScript(() => {
      const mockStream = {
        getTracks: () => [{ stop: () => {} }],
        active: true,
        id: 'mock-stream',
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        addTrack: () => {},
        removeTrack: () => {},
        clone: () => ({}),
      };
      
      const mockMediaDevices = {
        getUserMedia: async () => mockStream,
        enumerateDevices: async () => [],
      };

      // @ts-ignore
      navigator.mediaDevices = navigator.mediaDevices || {};
      // @ts-ignore
      navigator.mediaDevices.getUserMedia = mockMediaDevices.getUserMedia;

      const MockAudioContext = function() {
        return {
          createAnalyser: () => ({
            fftSize: 0,
            frequencyBinCount: 1,
            getByteFrequencyData: () => {},
            connect: () => {},
          }),
          createMediaStreamSource: () => ({
            connect: () => {},
          }),
          close: async () => {},
        };
      };

      // @ts-ignore
      window.AudioContext = MockAudioContext;
      // @ts-ignore
      window.webkitAudioContext = MockAudioContext;
    });

    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: 'mock-token',
      url: 'http://localhost:3000',
    }]);
  });

  test('register flow', async ({ page }) => {
    await page.route('**/api/organization/create', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'org-123', name: 'Acme Inc' }),
      });
    });

    await page.goto('/register');
    await page.getByLabel('Full Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Company Name').fill('Acme Inc');
    await page.getByLabel('Password').fill('password123');

    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('login flow', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');

    const authPromise = page.waitForResponse('**/api/auth/**');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await authPromise;
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 15000 });
  });

  test('training create flow', async ({ page }) => {
    let trainings: any[] = [];
    
    await page.route('**/api/trainings', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        const newTraining = { 
          id: `training-${Date.now()}`, 
          ...payload, 
          createdAt: new Date().toISOString() 
        };
        trainings.push(newTraining);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newTraining),
        });
      } else {
        await route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify(trainings) 
        });
      }
    });

    await page.goto('/trainings');
    await page.getByRole('main').getByRole('button', { name: 'New Training' }).click();
    
    await page.getByLabel('Name').fill('Sales Objection Handling');
    await page.getByLabel('Description').fill('Learn how to handle common sales objections.');
    await page.getByLabel('AI System Prompt').fill('You are a skeptical customer...');
    
    await page.getByRole('button', { name: 'Create Training' }).click();
    
    await expect(page.getByText('Sales Objection Handling')).toBeVisible();
  });

  test('training edit flow', async ({ page }) => {
    const existingTraining = {
      id: 'training-123',
      name: 'Original Training',
      description: 'Original description',
      systemPrompt: 'Original prompt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([existingTraining]),
      });
    });

    await page.route('**/api/trainings/training-123', async (route) => {
      if (route.request().method() === 'PUT') {
        const payload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...existingTraining, ...payload, updatedAt: new Date().toISOString() }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(existingTraining),
        });
      }
    });

    await page.goto('/trainings');
    await expect(page.getByText('Original Training')).toBeVisible({ timeout: 10000 });
    
    await page.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).first().click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Edit Training')).toBeVisible();
    
    await page.locator('#edit-name').fill('Updated Training Name');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });
  });

  test('training delete flow', async ({ page }) => {
    const existingTraining = {
      id: 'training-456',
      name: 'Training to Delete',
      description: 'This will be deleted',
      systemPrompt: 'Some prompt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let trainings = [existingTraining];

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(trainings),
      });
    });

    await page.route('**/api/trainings/training-456', async (route) => {
      if (route.request().method() === 'DELETE') {
        trainings = [];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
    });

    await page.goto('/trainings');
    await expect(page.getByText('Training to Delete')).toBeVisible({ timeout: 10000 });
    
    await page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first().click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Delete Training')).toBeVisible();
    
    await page.getByRole('button', { name: 'Delete' }).click();
    
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });
  });

  test('assessment view', async ({ page }) => {
    const sessionId = 'session-456';
    
    await page.route(`**/api/sessions/${sessionId}/assessment`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'assessment-1',
          score: 85,
          feedback: 'Great job handling the objections!',
          strengths: ['Active listening', 'Clear explanations'],
          improvements: ['Closing the deal'],
          categories: {
            'Empathy': { score: 90, notes: 'Very empathetic' },
            'Clarity': { score: 80, notes: 'Good clarity' }
          },
          highlights: [
            { quote: 'I understand your concern', type: 'positive', note: 'Good empathy' }
          ],
          createdAt: new Date().toISOString()
        }),
      });
    });

    await page.goto(`/employee/session/${sessionId}/assessment`);
    await expect(page.getByText('Session Assessment')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Overall Score')).toBeVisible();
    await expect(page.getByText('out of 100')).toBeVisible();
    await expect(page.getByText('85')).toBeVisible();
    await expect(page.getByText('Great job handling the objections!')).toBeVisible();
  });

  test('assessment displays category breakdown', async ({ page }) => {
    const sessionId = 'session-cat-test';
    
    await page.route(`**/api/sessions/${sessionId}/assessment`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'assessment-cat',
          score: 75,
          feedback: 'Good effort overall.',
          strengths: ['Persistence'],
          improvements: ['Product knowledge'],
          categories: {
            'Communication': { score: 80, notes: 'Clear and concise' },
            'Empathy': { score: 70, notes: 'Shows understanding' },
            'Problem Solving': { score: 75, notes: 'Creative solutions' }
          },
          highlights: [],
          createdAt: new Date().toISOString()
        }),
      });
    });

    await page.goto(`/employee/session/${sessionId}/assessment`);
    await expect(page.getByText('Category Breakdown')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Communication')).toBeVisible();
    await expect(page.getByText('80/100')).toBeVisible();
    await expect(page.getByText('Empathy')).toBeVisible();
    await expect(page.getByText('70/100')).toBeVisible();
  });

  test('assessment displays conversation highlights', async ({ page }) => {
    const sessionId = 'session-highlights';
    
    await page.route(`**/api/sessions/${sessionId}/assessment`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'assessment-hl',
          score: 82,
          feedback: 'Well done!',
          strengths: ['Tone'],
          improvements: ['Speed'],
          categories: {},
          highlights: [
            { quote: 'Let me help you with that', type: 'positive', note: 'Great customer service tone' },
            { quote: 'I do not know', type: 'negative', note: 'Could provide more information' }
          ],
          createdAt: new Date().toISOString()
        }),
      });
    });

    await page.goto(`/employee/session/${sessionId}/assessment`);
    await expect(page.getByText('Conversation Highlights')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Good')).toBeVisible();
    await expect(page.getByText('Needs Work')).toBeVisible();
    await expect(page.getByText('Let me help you with that')).toBeVisible();
  });

  test('session prepare mic check', async ({ page }) => {
    const sessionId = 'session-789';
    
    await page.route('**/api/sessions/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: sessionId, trainingId: 't1' }),
      });
    });

    await page.goto(`/employee/session/${sessionId}/prepare`);
    await page.getByRole('button', { name: 'Enable Microphone' }).click();
    
    await expect(page.getByText('Microphone Active')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeEnabled();
  });

  test('session prepare shows denied state on permission failure', async ({ page }) => {
    const sessionId = 'session-denied';
    
    await page.addInitScript(() => {
      // @ts-ignore
      navigator.mediaDevices.getUserMedia = async () => {
        throw new Error('Permission denied');
      };
    });

    await page.route('**/api/sessions/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: sessionId, trainingId: 't1' }),
      });
    });

    await page.goto(`/employee/session/${sessionId}/prepare`);
    await page.getByRole('button', { name: 'Enable Microphone' }).click();
    
    await expect(page.getByText('Microphone access was denied')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
  });

  test('session prepare to session navigation flow', async ({ page }) => {
    const sessionId = 'session-nav-test';
    
    await page.route('**/api/sessions/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: sessionId, trainingId: 't1' }),
      });
    });

    await page.route('**/api/tokens/livekit**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-livekit-token' }),
      });
    });

    await page.goto(`/employee/session/${sessionId}/prepare`);
    
    await page.getByRole('button', { name: 'Enable Microphone' }).click();
    await expect(page.getByText('Microphone Active')).toBeVisible({ timeout: 15000 });
    
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    await expect(page).toHaveURL(new RegExp(`/employee/session/${sessionId}`), { timeout: 10000 });
  });

  test('employee dashboard displays available trainings', async ({ page }) => {
    await page.route('**/api/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 't1', name: 'Customer Complaints', description: 'Handle angry customers' },
          { id: 't2', name: 'Upselling Techniques', description: 'Learn to upsell products' }
        ]),
      });
    });

    await page.goto('/employee');
    await expect(page.getByText('Employee Dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Available Training')).toBeVisible();
    await expect(page.getByText('Customer Complaints')).toBeVisible();
    await expect(page.getByText('Upselling Techniques')).toBeVisible();
  });

  test('employee dashboard displays session history', async ({ page }) => {
    await page.route('**/api/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 's1',
            trainingId: 't1',
            status: 'COMPLETED',
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            training: { name: 'Customer Complaints' },
            assessment: { score: 85, feedback: 'Great job!' }
          }
        ]),
      });
    });

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/employee');
    await expect(page.getByText('Recent History')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Customer Complaints')).toBeVisible();
    await expect(page.getByText('85%').first()).toBeVisible();
    await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible();
  });

  test('employee dashboard shows session stats', async ({ page }) => {
    await page.route('**/api/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 's1',
            trainingId: 't1',
            status: 'COMPLETED',
            startedAt: '2024-01-15T10:00:00Z',
            endedAt: '2024-01-15T10:30:00Z',
            training: { name: 'Training 1' },
            assessment: { score: 90, feedback: 'Excellent!' }
          },
          {
            id: 's2',
            trainingId: 't2',
            status: 'COMPLETED',
            startedAt: '2024-01-14T10:00:00Z',
            endedAt: '2024-01-14T10:30:00Z',
            training: { name: 'Training 2' },
            assessment: { score: 80, feedback: 'Good!' }
          }
        ]),
      });
    });

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/employee');
    await expect(page.getByText('Sessions Completed', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Average Score', { exact: true })).toBeVisible();
    await expect(page.getByText('Latest Session')).toBeVisible();
  });

  test('trainings page shows empty state for non-admin', async ({ page }) => {
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', email: 'member@example.com', name: 'Member User' },
          session: { id: 's1', userId: '1', expiresAt: new Date(Date.now() + 3600000).toISOString() },
          member: { role: 'member' }
        }),
      });
    });

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/trainings');
    await expect(page.getByText('No training scenarios have been created yet.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('main').getByRole('button', { name: 'New Training' })).toBeHidden();
  });

  test('training detail page loads knowledge base', async ({ page }) => {
    const trainingId = 'training-kb-test';

    await page.route(`**/api/trainings/${trainingId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: trainingId,
          name: 'Product Knowledge',
          description: 'Learn about our products',
          systemPrompt: 'You are a product expert...',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route(`**/api/documents/${trainingId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'd1', filename: 'product-guide.pdf', createdAt: new Date().toISOString() },
          { id: 'd2', filename: 'faq.txt', createdAt: new Date().toISOString() }
        ]),
      });
    });

    await page.goto(`/trainings/${trainingId}`);
    await expect(page.getByText('Product Knowledge')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Knowledge Base', { exact: true })).toBeVisible();
    await expect(page.getByText('product-guide.pdf')).toBeVisible();
    await expect(page.getByText('faq.txt')).toBeVisible();
  });

  test('session end flow navigates back to employee dashboard', async ({ page }) => {
    const sessionId = 'session-end-test';
    
    await page.addInitScript(() => {
      // @ts-ignore
      window.__LIVEKIT_MOCK__ = true;
    });

    await page.route('**/api/sessions/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/end') && route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, sessionId }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: sessionId, trainingId: 't1', status: 'ACTIVE' }),
        });
      }
    });

    await page.route('**/api/tokens/livekit**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-livekit-token' }),
      });
    });

    await page.goto(`/employee/session/${sessionId}`);
    
    await expect(page.getByRole('button', { name: 'End Session' })).toBeVisible({ timeout: 15000 });
    
    await page.getByRole('button', { name: 'End Session' }).click();
    
    await expect(page).toHaveURL(/\/employee/, { timeout: 15000 });
  });

  test('admin analytics dashboard displays metrics', async ({ page }) => {
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
          session: { id: 's1', userId: '1', expiresAt: new Date(Date.now() + 3600000).toISOString() },
          member: { role: 'admin' }
        }),
      });
    });

    await page.route('**/api/sessions/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          overview: {
            totalSessions: 150,
            activeMembers: 25,
            averageScore: 78,
            completionRate: 92
          },
          recentSessions: [
            {
              id: 's1',
              user: 'John Doe',
              training: 'Customer Service',
              score: 85,
              date: new Date().toISOString(),
              status: 'COMPLETED'
            },
            {
              id: 's2',
              user: 'Jane Smith',
              training: 'Sales Objections',
              score: 72,
              date: new Date().toISOString(),
              status: 'COMPLETED'
            }
          ],
          trainingPerformance: [
            { name: 'Customer Service', avgScore: 82, sessions: 45 },
            { name: 'Sales Objections', avgScore: 75, sessions: 38 },
            { name: 'Product Knowledge', avgScore: 88, sessions: 67 }
          ]
        }),
      });
    });

    await page.goto('/admin/analytics');
    
    await expect(page.getByText('Analytics Dashboard')).toBeVisible({ timeout: 15000 });
    
    await expect(page.getByText('Total Sessions')).toBeVisible();
    await expect(page.getByText('150')).toBeVisible();
    await expect(page.getByText('Active Members')).toBeVisible();
    await expect(page.getByText('25')).toBeVisible();
    await expect(page.getByText('Average Score', { exact: true })).toBeVisible();
    await expect(page.getByText('78%')).toBeVisible();
    await expect(page.getByText('Completion Rate')).toBeVisible();
    await expect(page.getByText('92%')).toBeVisible();
    
    await expect(page.getByText('Recent Sessions')).toBeVisible();
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Customer Service' })).toBeVisible();
    
    await expect(page.getByText('Training Performance')).toBeVisible();
    await expect(page.getByText('Product Knowledge')).toBeVisible();
    await expect(page.getByText('88% avg')).toBeVisible();
  });

  test('sidebar shows training modules', async ({ page }) => {
    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/trainings');

    await expect(page.getByText('Training Command Center')).toBeVisible();
    await expect(page.getByText('Scenario Configuration')).toBeVisible();
    await expect(page.getByText('Active Training')).toBeVisible();
    await expect(page.getByText('Performance Analytics')).toBeVisible();
    await expect(page.getByText('Team Management')).toBeVisible();
  });

  test('logout flow redirects to login', async ({ page }) => {
    let loggedOut = false;

    await page.route('**/api/auth/**', async (route) => {
      const url = route.request().url();
      if (url.includes('sign-out') || url.includes('signout') || url.includes('logout')) {
        loggedOut = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (loggedOut) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: null, session: null }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: '1', email: 'test@example.com', name: 'Test User' },
            session: { id: 's1', userId: '1', expiresAt: new Date(Date.now() + 3600000).toISOString() },
            member: { role: 'member' }
          }),
        });
      }
    });

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/employee');
    await expect(page.getByText('Employee Dashboard')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Logout' }).click();
    
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('session page displays LiveKit connection UI', async ({ page }) => {
    const sessionId = 'session-ui-test';
    
    await page.route('**/api/sessions/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: sessionId, trainingId: 't1', status: 'ACTIVE' }),
      });
    });

    await page.route('**/api/tokens/livekit**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-livekit-token' }),
      });
    });

    await page.goto(`/employee/session/${sessionId}`);
    
    await expect(page.getByRole('button', { name: 'End Session' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('AI Trainer')).toBeVisible();
  });

  test('employee can start training from dashboard', async ({ page }) => {
    await page.route('**/api/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/trainings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 't1', name: 'Customer Support', description: 'Handle support calls' }
        ]),
      });
    });

    await page.goto('/employee');
    await expect(page.getByText('Customer Support')).toBeVisible({ timeout: 15000 });
    
    await page.getByRole('link', { name: 'Start', exact: true }).click();
    
    await expect(page).toHaveURL(/\/employee\/session\/.*\/prepare/, { timeout: 15000 });
  });
});
