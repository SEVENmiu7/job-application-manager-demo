import { Module } from '@nestjs/common';
import { ScrapingController } from './scraping.controller';

@Module({
  controllers: [ScrapingController],
})
export class ScrapingModule {}
