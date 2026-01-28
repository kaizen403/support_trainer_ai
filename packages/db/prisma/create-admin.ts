import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@admin.com';
    const password = 'admin123456';
    const name = 'Admin';

    console.log('Setting up admin user...');

    // First, delete the existing user if they exist
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log('Deleting existing user...');
        await prisma.member.deleteMany({
            where: { userId: existingUser.id },
        });
        await prisma.account.deleteMany({
            where: { userId: existingUser.id },
        });
        await prisma.session.deleteMany({
            where: { userId: existingUser.id },
        });
        await prisma.user.delete({
            where: { id: existingUser.id },
        });
    }

    // Call the Better Auth sign-up API
    const response = await fetch('http://localhost:4000/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
            email,
            password,
            name,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Failed to create user:', data);
        process.exit(1);
    }

    console.log('User created via API:', data);

    // Now update the user to be email verified and add to organization
    const user = await prisma.user.update({
        where: { email },
        data: {
            emailVerified: true,
        },
    });

    // Get or create the organization
    const org = await prisma.organization.upsert({
        where: { slug: 'admin-org' },
        update: {},
        create: {
            name: 'Admin Organization',
            slug: 'admin-org',
        },
    });

    // Add user as owner of the organization
    await prisma.member.upsert({
        where: {
            userId_organizationId: {
                userId: user.id,
                organizationId: org.id,
            },
        },
        update: {
            role: 'owner',
        },
        create: {
            userId: user.id,
            organizationId: org.id,
            role: 'owner',
        },
    });

    console.log('Admin user setup complete!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
