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

import { ApplicationService } from './application.service';

interface ApplicationFieldsBody {
  fields: Record<string, unknown>;
}

@Controller('api/applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @NeedLogin()
  @Get()
  async list(
    @Req() req: Request,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('industry') industry?: string,
    @Query('function') functionDirection?: string,
    @Query('location') location?: string,
  ) {
    const userId: string = req.userContext.userId;
    return this.applicationService.list(userId, {
      keyword,
      status,
      industry,
      functionDirection,
      location,
    });
  }

  @NeedLogin()
  @Get('stats')
  async stats(@Req() req: Request) {
    const userId: string = req.userContext.userId;
    return this.applicationService.stats(userId);
  }

  @NeedLogin()
  @Get('board')
  async board(@Req() req: Request) {
    const userId: string = req.userContext.userId;
    return this.applicationService.listBoard(userId);
  }

  @NeedLogin()
  @Get(':id')
  async get(@Req() req: Request, @Param('id') id: string) {
    const userId: string = req.userContext.userId;
    return this.applicationService.get(userId, id);
  }

  @NeedLogin()
  @Post()
  async create(@Req() req: Request, @Body() body: ApplicationFieldsBody) {
    const userId: string = req.userContext.userId;
    return this.applicationService.create(userId, body.fields);
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ApplicationFieldsBody,
  ) {
    const userId: string = req.userContext.userId;
    return this.applicationService.update(userId, id, body.fields);
  }

  @NeedLogin()
  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const userId: string = req.userContext.userId;
    return this.applicationService.delete(userId, id);
  }
}
