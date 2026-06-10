import { NextResponse } from 'next/server';
import { UserRepository, ReflectionRepository } from '@/lib/repository';
import { MemoryService } from '@/lib/memoryService';

export async function GET() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const reflections = await ReflectionRepository.list(user.id);
    return NextResponse.json({ reflections });
  } catch (err) {
    console.error('API Error in GET /api/reflections:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    
    // Trigger the reflection engine to analyze stored memories and create a new reflection
    const reflection = await MemoryService.generateReflection(user.id);

    if (!reflection) {
      return NextResponse.json({ 
        error: 'Could not generate reflection. Make sure you have at least 3 memories stored in the system first!' 
      }, { status: 400 });
    }

    return NextResponse.json({ reflection });
  } catch (err) {
    console.error('API Error in POST /api/reflections:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
