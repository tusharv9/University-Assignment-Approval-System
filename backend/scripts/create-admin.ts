require('dotenv').config();
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in environment variables');
  console.error('Make sure .env file exists in the backend directory');
  process.exit(1);
}

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@university.edu';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      console.log('Admin with this email already exists:', email);
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword
      }
    });

    console.log('Admin created successfully!');
    console.log('Email:', admin.email);
    console.log('ID:', admin.id);
    console.log('Created at:', admin.createdAt);
    console.log('\n  Default credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n Please change the default password after first login!');
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

