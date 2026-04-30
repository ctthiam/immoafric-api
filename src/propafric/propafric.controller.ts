import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BulkImportDto, RegisterAgencyDto, SyncPropertyDto } from './dto/sync-property.dto';
import { PropafricService } from './propafric.service';

@Controller('propafric')
export class PropafricController {
  constructor(private readonly propafricService: PropafricService) {}

  /**
   * Webhook: PropAfric pushes a single property update.
   * Verified via HMAC-SHA256 on the raw body (X-PropAfric-Signature: sha256=...).
   */
  @Post('sync')
  @Public()
  async syncWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() dto: SyncPropertyDto,
    @Headers('x-propafric-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(dto);
    return this.propafricService.syncWebhook(rawBody, signature ?? '', dto);
  }

  /**
   * Bulk import: PropAfric pushes all properties for an agency.
   * Authenticated via X-PropAfric-Api-Key header.
   */
  @Post('bulk-import')
  @Public()
  async bulkImport(
    @Body() dto: BulkImportDto,
    @Headers('x-propafric-api-key') apiKey: string,
  ) {
    return this.propafricService.bulkImport(dto, apiKey ?? '');
  }

  /**
   * Get sync status for an agency (admin only).
   */
  @Get('status/:agencyId')
  @Roles('admin')
  async getStatus(@Param('agencyId') agencyId: string) {
    return this.propafricService.getStatus(agencyId);
  }

  /**
   * Register an ImmoAfric agency for PropAfric sync (admin only).
   * Returns the generated API key and HMAC secret — show once, store safely.
   */
  @Post('register')
  @Roles('admin')
  async register(@Body() dto: RegisterAgencyDto) {
    return this.propafricService.registerAgency(dto);
  }
}
