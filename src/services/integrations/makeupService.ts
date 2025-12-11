/**
 * Makeup Artist Service
 * Client-side service for interacting with Makeup Artist Agent API
 */

import api from '@/lib/api';
import type { MakeupLook, SkinAnalysis, CreateLookParams } from '@/types/makeup';

class MakeupService {
  /**
   * Create a complete makeup look
   */
  async createLook(params: CreateLookParams): Promise<MakeupLook> {
    const response = await api.post('/api/agents/makeup-artist/create-look', params);
    return response.data;
  }

  /**
   * Analyze selfie only (for preview)
   */
  async analyzeSelfie(selfieUrl: string): Promise<SkinAnalysis> {
    const response = await api.post('/api/agents/makeup-artist/analyze', {
      selfieUrl,
    });
    return response.data;
  }
}

export const makeupService = new MakeupService();
