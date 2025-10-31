import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CalendarModule } from './calendar/calendar.module';
import { EventModule } from './event/event.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingModule } from './booking/booking.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CalendarModule,
    EventModule,
    AvailabilityModule,
    BookingModule,
    UserModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}