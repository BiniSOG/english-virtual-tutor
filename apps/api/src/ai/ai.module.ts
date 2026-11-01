import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { QuotaService } from './quota.service';

@Module({ controllers: [AiController], providers: [AiService, GeminiService, QuotaService] })
export class AiModule {}
