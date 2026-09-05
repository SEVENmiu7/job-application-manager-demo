import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';

import { InterviewReviewService } from './interview-review.service';
import type {
  InterviewReview,
  InterviewReviewSavePayload,
} from '@shared/api.interface';
import { parseReviewCountApplicationIds } from './interview-review-count-query';

@Controller('api/interview-reviews')
export class InterviewReviewController {
  constructor(
    private readonly interviewReviewService: InterviewReviewService,
  ) {}

  @NeedLogin()
  @Get('count')
  async count(
    @Req() req: Request,
    @Query('applicationIds') applicationIds?: string,
  ) {
    const userId: string = req.userContext.userId;
    const ids: string[] = parseReviewCountApplicationIds(applicationIds);
    return this.interviewReviewService.countByApplications(userId, ids);
  }

  @NeedLogin()
  @Get()
  async list(
    @Req() req: Request,
    @Query('applicationId') applicationId?: string,
  ) {
    const userId: string = req.userContext.userId;
    return this.interviewReviewService.listByApplication(
      userId,
      applicationId || '',
    );
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: { applicationId?: string; review?: InterviewReviewSavePayload },
  ) {
    const userId: string = req.userContext.userId;
    const review: InterviewReview = await this.interviewReviewService.create(
      userId,
      body.applicationId || '',
      body.review || emptyPayload(),
    );
    return { review };
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { review?: InterviewReviewSavePayload },
  ) {
    const userId: string = req.userContext.userId;
    const review: InterviewReview = await this.interviewReviewService.update(
      userId,
      id,
      body.review || emptyPayload(),
    );
    return { review };
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId: string = req.userContext.userId;
    return this.interviewReviewService.remove(userId, id);
  }
}

function emptyPayload(): InterviewReviewSavePayload {
  return { stage: '', questions: [], nextActions: [] };
}


