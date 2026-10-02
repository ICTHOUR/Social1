import { BulkSmsBdProvider } from './BulkSmsBdProvider.js';
import { ISmsProvider } from './types.js';

export class SmsGatewayRegistry {
  private static instance: SmsGatewayRegistry;
  private providers: Map<string, ISmsProvider> = new Map();
  private defaultProviderId: string = 'bulksmsbd';

  private constructor() {
    this.registerProvider(new BulkSmsBdProvider());
  }

  public static getInstance(): SmsGatewayRegistry {
    if (!SmsGatewayRegistry.instance) {
      SmsGatewayRegistry.instance = new SmsGatewayRegistry();
    }
    return SmsGatewayRegistry.instance;
  }

  public registerProvider(provider: ISmsProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id?: string): ISmsProvider {
    const targetId = id || this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      throw new Error(`SMS Provider with ID "${targetId}" is not registered.`);
    }
    return provider;
  }

  public getAllProviders(): ISmsProvider[] {
    return Array.from(this.providers.values());
  }

  public setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot set unknown provider "${id}" as default.`);
    }
    this.defaultProviderId = id;
  }

  public getDefaultProviderId(): string {
    return this.defaultProviderId;
  }
}
