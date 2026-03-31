import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST - Initialize first admin user (only if no users exist)
export async function POST(request: NextRequest) {
  try {
    // Check if any users exist
    const existingUsers = await db.user.count();

    if (existingUsers > 0) {
      return NextResponse.json({ 
        error: 'Des utilisateurs existent déjà. Initialisation impossible.' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email et mot de passe requis' 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create first admin user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || 'Administrateur',
        role: 'ADMIN'
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
      message: 'Administrateur créé avec succès',
      user 
    }, { status: 201 });
  } catch (error) {
    console.error('Error initializing admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET - Check if initialization is needed
export async function GET() {
  try {
    const userCount = await db.user.count();
    
    return NextResponse.json({ 
      needsInit: userCount === 0,
      userCount 
    });
  } catch (error) {
    console.error('Error checking initialization:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
