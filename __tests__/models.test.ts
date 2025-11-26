import {
  models,
  getModel,
  getModelsByProvider,
  getEnabledModels,
  providers,
} from '../lib/models';

describe('Model Configuration', () => {
  describe('models array', () => {
    it('should contain expected number of models', () => {
      expect(models).toHaveLength(6);
    });

    it('should have models from all providers', () => {
      const providerCounts = models.reduce((acc, model) => {
        acc[model.provider] = (acc[model.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(providerCounts.openai).toBe(2);
      expect(providerCounts.anthropic).toBe(2);
      expect(providerCounts.google).toBe(2);
    });

    it('should have all models supporting strict mode', () => {
      models.forEach((model) => {
        expect(model.supportsStrictMode).toBe(true);
      });
    });

    it('should have unique model IDs', () => {
      const ids = models.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid model structure', () => {
      models.forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('model');
        expect(model).toHaveProperty('supportsStrictMode');

        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(['openai', 'anthropic', 'google']).toContain(model.provider);
        expect(typeof model.supportsStrictMode).toBe('boolean');
      });
    });
  });

  describe('getModel', () => {
    it('should return model by ID', () => {
      const model = getModel('openai-gpt4o');
      expect(model).toBeDefined();
      expect(model?.id).toBe('openai-gpt4o');
      expect(model?.name).toBe('GPT-4o');
      expect(model?.provider).toBe('openai');
    });

    it('should return undefined for invalid ID', () => {
      const model = getModel('invalid-model');
      expect(model).toBeUndefined();
    });
  });

  describe('getModelsByProvider', () => {
    it('should return models for OpenAI', () => {
      const openaiModels = getModelsByProvider('openai');
      expect(openaiModels).toHaveLength(2);
      openaiModels.forEach((model) => {
        expect(model.provider).toBe('openai');
      });
    });

    it('should return models for Anthropic', () => {
      const anthropicModels = getModelsByProvider('anthropic');
      expect(anthropicModels).toHaveLength(2);
      anthropicModels.forEach((model) => {
        expect(model.provider).toBe('anthropic');
      });
    });

    it('should return models for Google', () => {
      const googleModels = getModelsByProvider('google');
      expect(googleModels).toHaveLength(2);
      googleModels.forEach((model) => {
        expect(model.provider).toBe('google');
      });
    });
  });

  describe('getEnabledModels', () => {
    it('should return all models (all enabled)', () => {
      const enabledModels = getEnabledModels();
      expect(enabledModels).toHaveLength(models.length);
      expect(enabledModels).toEqual(models);
    });
  });

  describe('providers', () => {
    it('should have correct provider metadata', () => {
      expect(providers.openai).toEqual({
        name: 'OpenAI',
        color: '#10a37f',
      });
      expect(providers.anthropic).toEqual({
        name: 'Anthropic',
        color: '#d97706',
      });
      expect(providers.google).toEqual({
        name: 'Google',
        color: '#4285f4',
      });
    });
  });

  describe('Expected Models', () => {
    it('should include expected OpenAI models', () => {
      const gpt5 = getModel('openai-gpt5');
      const gpt4o = getModel('openai-gpt4o');

      expect(gpt5?.name).toBe('GPT-5');
      expect(gpt4o?.name).toBe('GPT-4o');
    });

    it('should include expected Anthropic models', () => {
      const sonnet = getModel('anthropic-sonnet');
      const opus = getModel('anthropic-opus');

      expect(sonnet?.name).toBe('Claude Sonnet 4.5');
      expect(opus?.name).toBe('Claude Opus 4.5');
    });

    it('should include expected Google models', () => {
      const flash = getModel('google-flash');
      const pro = getModel('google-pro');

      expect(flash?.name).toBe('Gemini 2.5 Flash');
      expect(pro?.name).toBe('Gemini 3 Pro');
    });
  });
});