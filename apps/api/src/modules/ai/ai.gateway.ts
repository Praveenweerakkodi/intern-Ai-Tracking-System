import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { AnalyzeRequest } from '@internai/shared';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const frontendUrl = process.env.FRONTEND_URL;
      if (!origin || origin === 'http://localhost:3000' || (frontendUrl && origin === frontendUrl) || (origin && origin.endsWith('.vercel.app'))) {
        return callback(null, true);
      }
      return callback(new Error(`WS CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
  },
  namespace: '/ai',
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AiGateway.name);

  constructor(private readonly aiService: AiService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ---- Stream CV Improvement ----
  @SubscribeMessage('improve-cv')
  async handleImproveCV(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { cvText: string; jobDescription: string; analysis: any },
  ) {
    try {
      client.emit('stream:start', { type: 'improve-cv' });
      let fullContent = '';

      for await (const chunk of this.aiService.improveCV(
        payload.cvText,
        payload.jobDescription,
        payload.analysis,
      )) {
        fullContent += chunk;
        client.emit('stream:token', { content: chunk });
      }

      client.emit('stream:done', { fullContent });
    } catch (error) {
      client.emit('stream:error', { error: (error as Error).message });
    }
  }

  // ---- Stream AI Coach Chat ----
  @SubscribeMessage('coach-chat')
  async handleCoachChat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
      systemPrompt: string;
      conversationId: string;
    },
  ) {
    try {
      client.emit('stream:start', { type: 'coach-chat', conversationId: payload.conversationId });
      let fullContent = '';

      for await (const chunk of this.aiService.chatStream(
        payload.messages,
        payload.systemPrompt,
      )) {
        fullContent += chunk;
        client.emit('stream:token', { content: chunk, conversationId: payload.conversationId });
      }

      client.emit('stream:done', { fullContent, conversationId: payload.conversationId });
    } catch (error) {
      client.emit('stream:error', { error: (error as Error).message });
    }
  }

  // ---- Stream Rejection Analysis ----
  @SubscribeMessage('rejection-analysis')
  async handleRejectionAnalysis(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      jobTitle: string;
      company: string;
      atsScore: number;
      matchScore: number;
      missingSkills: string[];
      weakAreas: string[];
    },
  ) {
    try {
      client.emit('stream:start', { type: 'rejection-analysis' });
      const result = await this.aiService.analyzeRejection(
        payload.jobTitle,
        payload.company,
        payload.atsScore,
        payload.matchScore,
        payload.missingSkills,
        payload.weakAreas,
      );
      client.emit('stream:done', { fullContent: result });
    } catch (error) {
      client.emit('stream:error', { error: (error as Error).message });
    }
  }
}
