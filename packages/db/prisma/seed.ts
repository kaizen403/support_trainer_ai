import { PrismaClient, SessionStatus } from '@prisma/client';

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

  // 2. Create Users
  const usersData = [
    { email: 'owner@acme.com', name: 'Alice Owner', role: 'owner' },
    { email: 'admin@acme.com', name: 'Bob Admin', role: 'admin' },
    { email: 'member@acme.com', name: 'Charlie Member', role: 'member' },
  ];

  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        emailVerified: true,
      },
    });

    await prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
      update: {
        role: userData.role,
      },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: userData.role,
      },
    });

    console.log(`Created user: ${user.name} with role ${userData.role}`);
  }

  // 3. Create Training
  const training = await prisma.training.create({
    data: {
      organizationId: org.id,
      name: 'Enterprise Sales Basics',
      description: 'Learn the fundamentals of selling to large enterprises.',
      systemPrompt: 'You are a skeptical procurement officer at a Fortune 500 company. You are looking for value, reliability, and long-term partnership. You are not easily impressed by buzzwords.',
    },
  });

  console.log(`Created training: ${training.name}`);

  // 4. Create Knowledge Document
  await prisma.knowledgeDocument.create({
    data: {
      trainingId: training.id,
      filename: 'enterprise-sales-handbook.txt',
      content: 'Enterprise sales involves long cycles, multiple stakeholders, and complex decision-making processes. Key strategies include relationship building, value-based selling, and understanding the buyer\'s organizational structure.',
    },
  });

  console.log('Created knowledge document');

  console.log('Seeding completed successfully!');
  console.log('\nDemo Credentials:');
  console.log(' - Owner: owner@acme.com');
  console.log(' - Admin: admin@acme.com');
  console.log(' - Member: member@acme.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
