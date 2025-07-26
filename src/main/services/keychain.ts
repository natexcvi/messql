import * as keytar from 'keytar';

export class KeychainService {
  private readonly serviceName = 'mesSQL';

  async setPassword(service: string, account: string, password: string): Promise<void> {
    try {
      await keytar.setPassword(this.serviceName, `${service}:${account}`, password);
    } catch (error) {
      throw new Error(`Failed to save password to keychain: ${error}`);
    }
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      return await keytar.getPassword(this.serviceName, `${service}:${account}`);
    } catch (error) {
      console.error('Failed to retrieve password from keychain:', error);
      return null;
    }
  }

  async deletePassword(service: string, account: string): Promise<void> {
    try {
      await keytar.deletePassword(this.serviceName, `${service}:${account}`);
    } catch (error) {
      throw new Error(`Failed to delete password from keychain: ${error}`);
    }
  }

  // AI credentials methods
  async setAICredentials(provider: string, credentials: string): Promise<void> {
    return this.setPassword('ai', provider, credentials);
  }

  async getAICredentials(provider: string): Promise<string | null> {
    return this.getPassword('ai', provider);
  }

  async deleteAICredentials(provider: string): Promise<void> {
    return this.deletePassword('ai', provider);
  }
}