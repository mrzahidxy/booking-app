// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Define permissions
  const permissions = [
    { name: 'CREATE_MENU' },
    { name: 'CREATE_ROLE' },
    { name: 'CREATE_PERMISSION' },
    { name: 'CREATE_ROLEASSIGNMENT' },
  ];

  // Upsert Permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: { name: perm.name },
    });
  }

  // Fetch all permissions
  const allPermissions = await prisma.permission.findMany();

  // Upsert Admin Role
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin' },
  });

  // Assign all permissions to Admin
  const adminRolePermissions = allPermissions.map((perm) => ({
    roleId: adminRole.id,
    permissionId: perm.id,
  }));

  // Delete existing RolePermissions for Admin to prevent duplicates
  await prisma.rolePermission.deleteMany({
    where: { roleId: adminRole.id },
  });

  // Create RolePermissions
  await prisma.rolePermission.createMany({
    data: adminRolePermissions,
  });

  // Optionally, create an Admin User
  const adminEmail = 'admin@example.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        UserRoles: { create: { role: { connect: { name: 'Admin' } } },
      },
    }});

    console.log('Admin user created:', newAdmin.email);
  } else {
    console.log('Admin user already exists.');
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
