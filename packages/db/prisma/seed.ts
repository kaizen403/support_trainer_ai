import { PrismaClient, ScenarioPersonaPreset } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
    },
  });

  console.log(`Created organization: ${org.name}`);

  // 2. Link admin@admin.com to organization if exists
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@admin.com' },
  });

  if (adminUser) {
    await prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: adminUser.id,
          organizationId: org.id,
        },
      },
      update: { role: 'owner' },
      create: {
        userId: adminUser.id,
        organizationId: org.id,
        role: 'owner',
      },
    });
    console.log(`Linked admin@admin.com as owner of ${org.name}`);
  }

  // 3. Create Demo Scenarios
  const scenarios = [
    {
      name: 'Angry Customer - Billing Issue',
      description: 'Customer is frustrated about unexpected charges on their bill',
      personaPreset: ScenarioPersonaPreset.RUDE,
      temperament: 'Angry and confrontational, uses aggressive language',
      expertise: 'Knows their billing history well, references specific dates and amounts',
      complexity: 'Medium - requires de-escalation skills and billing knowledge',
    },
    {
      name: 'Confused Senior - Tech Support',
      description: 'Elderly customer needs help setting up their new device',
      personaPreset: ScenarioPersonaPreset.CHILL,
      temperament: 'Patient but easily confused, asks many clarifying questions',
      expertise: 'Low technical knowledge, needs step-by-step guidance',
      complexity: 'Low - requires patience and clear communication',
    },
    {
      name: 'Demanding Executive - Enterprise Deal',
      description: 'C-level executive evaluating a major purchase decision',
      personaPreset: ScenarioPersonaPreset.DEMANDING,
      temperament: 'Time-pressed, expects quick answers and expert knowledge',
      expertise: 'High business acumen, asks about ROI, integrations, SLAs',
      complexity: 'High - requires deep product knowledge and business sense',
    },
    {
      name: 'Curious Prospect - Product Demo',
      description: 'Interested prospect exploring your product features',
      personaPreset: ScenarioPersonaPreset.NEUTRAL,
      temperament: 'Open-minded, asks thoughtful questions about features',
      expertise: 'Moderate, has done some research before the call',
      complexity: 'Medium - requires product knowledge and sales skills',
    },
    {
      name: 'Surprise Complaint - Wrong Product',
      description: 'Customer received completely wrong order and is upset',
      personaPreset: ScenarioPersonaPreset.UNEXPECTED,
      temperament: 'Initially calm but patience wearing thin, expects resolution',
      expertise: 'Has order number and tracking info ready',
      complexity: 'Medium - requires problem-solving and empathy',
    },
  ];

  for (const scenarioData of scenarios) {
    const existing = await prisma.scenario.findFirst({
      where: { organizationId: org.id, name: scenarioData.name },
    });
    if (existing) {
      await prisma.scenario.update({ where: { id: existing.id }, data: scenarioData });
    } else {
      await prisma.scenario.create({ data: { ...scenarioData, organizationId: org.id } });
    }
    console.log(`Created scenario: ${scenarioData.name}`);
  }

  // 4. Create Demo Training with a scenario and share token
  const angryScenario = await prisma.scenario.findFirst({
    where: {
      organizationId: org.id,
      personaPreset: ScenarioPersonaPreset.RUDE,
    },
  });

  const training = await prisma.training.upsert({
    where: {
      id: 'demo-training-001',
    },
    update: {
      scenarioId: angryScenario?.id,
      shareToken: 'demo-token-123',
    },
    create: {
      id: 'demo-training-001',
      organizationId: org.id,
      name: 'Call Center De-escalation Training',
      description: 'Practice handling difficult customer calls with AI-powered simulations.',
      systemPrompt: `You are an angry customer calling about a billing issue. You were charged $150 extra on your last bill and you want it refunded immediately. 

Your behavior:
- Start frustrated but give the agent a chance to help
- If they are empathetic and take ownership, gradually calm down
- If they are dismissive or make excuses, escalate your anger
- You want: 1) An apology, 2) An explanation, 3) A refund
- You have been a customer for 5 years and mention this

Remember: You are testing the trainee's de-escalation skills. Be challenging but fair.`,
      scenarioId: angryScenario?.id,
      shareToken: 'demo-token-123',
    },
  });

  console.log(`Created training: ${training.name}`);
  console.log(`  Share URL: /train/demo-token-123`);

  // 5. Create Knowledge Document
  await prisma.knowledgeDocument.upsert({
    where: {
      id: 'demo-knowledge-001',
    },
    update: {},
    create: {
      id: 'demo-knowledge-001',
      trainingId: training.id,
      filename: 'de-escalation-guide.txt',
      content: `De-escalation Best Practices:

1. LISTEN FIRST - Let the customer vent without interrupting
2. ACKNOWLEDGE - Validate their feelings ("I understand this is frustrating")
3. APOLOGIZE - Even if it's not your fault ("I'm sorry you're experiencing this")
4. TAKE OWNERSHIP - "Let me personally help you resolve this"
5. SOLVE - Offer concrete solutions and next steps
6. FOLLOW UP - Confirm the customer is satisfied before ending

Common Billing Issues:
- Double charges: Refund immediately, explain cause
- Unexpected fees: Explain fee structure, offer one-time courtesy credit
- Price increases: Explain advance notice policy, offer retention deals

Remember: A customer who complains is giving you a chance to fix it. Most unhappy customers just leave.`,
    },
  });

  console.log('Created knowledge document');

  console.log('\n========================================');
  console.log('Seeding completed successfully!');
  console.log('========================================\n');
  console.log('Demo Credentials:');
  console.log('  Email: admin@admin.com');
  console.log('  Password: admin123456');
  console.log('\nDemo Training Share Link:');
  console.log('  http://localhost:3000/train/demo-token-123');
  console.log('\nScenarios created: 5');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
