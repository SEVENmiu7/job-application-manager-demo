import { Module } from '@nestjs/common';

import { InterviewReviewController } from './interview-review.controller';
import { InterviewReviewService } from './interview-review.service';

@Module({
  controllers: [InterviewReviewController],
  providers: [InterviewReviewService],
})
export class InterviewReviewModule {}


