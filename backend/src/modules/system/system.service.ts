import { Injectable } from '@nestjs/common';
import { SystemRepository } from './system.repository';

@Injectable()
export class SystemService {
  constructor(private readonly systemRepository: SystemRepository) {}

  settings() {
    return this.systemRepository.settings();
  }

  health() {
    return this.systemRepository.health();
  }
}
