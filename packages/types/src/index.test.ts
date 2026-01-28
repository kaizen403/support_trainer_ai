import { describe, it, expect } from 'vitest';
import type { User, Training, TrainingSession, Assessment, Organization, Member } from './index';

describe('@repo/types', () => {
  it('User type has required fields', () => {
    const user: User = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(user.id).toBe('user-1');
    expect(user.email).toBe('test@example.com');
  });

  it('Member type has role for organization membership', () => {
    const member: Member = {
      id: 'member-1',
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(member.role).toBe('member');
  });

  it('Training type has required fields', () => {
    const training: Training = {
      id: 'training-1',
      organizationId: 'org-1',
      name: 'Sales Training',
      description: 'Learn sales techniques',
      systemPrompt: 'You are a frustrated customer calling about a billing issue.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(training.name).toBe('Sales Training');
    expect(training.systemPrompt).toContain('frustrated customer');
  });

  it('TrainingSession type has avatar fields', () => {
    const session: TrainingSession = {
      id: 'session-1',
      trainingId: 'training-1',
      userId: 'user-1',
      avatarName: 'Alex',
      avatarPersona: 'A frustrated customer who is confused about their bill.',
      status: 'active',
      startedAt: new Date(),
    };
    expect(session.status).toBe('active');
    expect(session.avatarName).toBe('Alex');
  });

  it('Assessment type has score and feedback arrays', () => {
    const assessment: Assessment = {
      id: 'assessment-1',
      sessionId: 'session-1',
      score: 85,
      feedback: 'Good performance overall with room for improvement in empathy.',
      strengths: ['Clear communication', 'Problem resolution'],
      improvements: ['Show more empathy', 'Faster response time'],
      createdAt: new Date(),
    };
    expect(assessment.score).toBe(85);
    expect(assessment.strengths).toHaveLength(2);
    expect(assessment.improvements).toHaveLength(2);
  });

  it('Organization type has required fields', () => {
    const org: Organization = {
      id: 'org-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      settings: {
        maxTrainees: 100,
        features: ['voice', 'analytics'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(org.slug).toBe('acme-corp');
  });
});
