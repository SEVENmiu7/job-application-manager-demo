import { Controller, Get, Query } from '@nestjs/common';

@Controller('api/scraping')
export class ScrapingController {
  /**
   * 获取支持的招聘平台列表
   */
  @Get('platforms')
  getPlatforms() {
    return {
      ok: true,
      data: [
        {
          id: 'boss',
          name: 'Boss直聘',
          url: 'https://www.zhipin.com',
          description: '输入公司名或职位关键词搜索',
          fields: ['关键词', '城市'],
        },
        {
          id: 'liepin',
          name: '猎聘',
          url: 'https://www.liepin.com',
          description: '输入公司名或职位关键词搜索',
          fields: ['关键词', '城市'],
        },
        {
          id: 'niukewang',
          name: '牛客',
          url: 'https://www.nowcoder.com',
          description: '搜索校招/实习岗位',
          fields: ['关键词'],
        },
        {
          id: '官网',
          name: '公司官网',
          url: '',
          description: '直接输入公司招聘页面URL，我会读取岗位信息',
          fields: ['招聘页面URL'],
        },
      ],
    };
  }
}
