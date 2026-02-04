/**
 * Secure Gemini Service - Frontend Client
 * Communicates with backend API instead of calling Gemini directly
 * NO API KEY EXPOSED! ���
 */

import { BusinessInfo } from "../types";
import { apiFetch } from "./apiClient";

const API_ENDPOINT = '/api/gemini';

export class SecureGeminiService {
  
  /**
   * Send message to secure backend API
   */
  async sendMessage(contents: any[], business: BusinessInfo) {
    try {
      const data = await apiFetch<{
        text: string;
        actions?: any[];
      }>(API_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          contents,
          mode: "standard",
        }),
      });
      return data;
      
    } catch (error: any) {
      console.error('Secure API Error:', error);
      throw new Error(error.message || 'שגיםה בשליחת הודעה ל-AI');
    }
  }

  /**
   * Send message with streaming response
   * Note: Streaming requires Server-Sent Events (SSE) setup
   * For now, falls back to regular response
   */
  async *sendMessageStream(contents: any[], business: BusinessInfo) {
    try {
      // For streaming, we need SSE endpoint (future enhancement)
      const response = await this.sendMessage(contents, business);
      
      // Simulate streaming by yielding text in chunks
      const text = response.text || '';
      const words = text.split(' ');
      
      for (const word of words) {
        yield word + ' ';
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error) {
      console.error('Streaming Error:', error);
      throw error;
    }
  }
}

export const secureGemini = new SecureGeminiService();
