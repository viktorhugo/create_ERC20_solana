import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SolanaService } from './solana.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({ isGlobal: true })
  ],
  controllers: [],
  providers: [ SolanaService],
})
export class AppModule {}
