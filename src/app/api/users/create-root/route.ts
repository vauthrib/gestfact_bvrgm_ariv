import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST - Create ROOT user (can be called once)
export async function POST() {
  try {
    // Check if root user already exists
    const existingRoot = await db.user.findUnique({
      where: { email: 'root@gagnebin.ma' }
    });

    if (existingRoot) {
      return NextResponse.json({
        message: 'ROOT user already exists',
        user: { email: existingRoot.email, name: existingRoot.name, role: existingRoot.role }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('root@25803314', 10);

    // All permissions
    const allPermissions = {
      dashboard: { view: true, edit: true },
      tiers: { view: true, edit: true, create: true },
      articles: { view: true, edit: true, create: true },
      bonsLivraison: { view: true, edit: true, create: true },
      facturesClients: { view: true, edit: true, create: true },
      avoirsClients: { view: true, edit: true, create: true },
      reglementsClients: { view: true, edit: true, create: true },
      facturesFournisseurs: { view: true, edit: true, create: true },
      reglementsFournisseurs: { view: true, edit: true, create: true }
    };

    // Create ROOT user
    const user = await db.user.create({
      data: {
        id: 'root_user_001',
        name: 'root',
        email: 'root@gagnebin.ma',
        password: hashedPassword,
        role: 'ADMIN',
        permissions: JSON.stringify(allPermissions),
        actif: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      message: 'ROOT user created successfully',
      user
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ROOT user:', error);
    return NextResponse.json({
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
}
