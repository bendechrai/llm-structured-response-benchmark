import {
  ModelTypeSchema,
  ActorSchema,
  ResponseSchema,
  SequentialPart1Schema,
  SequentialPart2Schema,
  SequentialPart3Schema,
  mergeSequentialParts,
} from '../lib/schemas';

describe('Schema Validation', () => {
  describe('ModelTypeSchema', () => {
    it('should accept valid model types', () => {
      expect(ModelTypeSchema.parse('reasoning')).toBe('reasoning');
      expect(ModelTypeSchema.parse('semantic')).toBe('semantic');
    });

    it('should reject invalid model types', () => {
      expect(() => ModelTypeSchema.parse('invalid')).toThrow();
      expect(() => ModelTypeSchema.parse('')).toThrow();
    });
  });

  describe('ActorSchema', () => {
    const validActor = {
      title: 'Database Administrator',
      reason: 'The team needs someone who can optimize database performance and schema design',
      skills: ['PostgreSQL', 'Query Optimization', 'Database Design'],
      prompt: 'You are a database expert with deep knowledge of PostgreSQL optimization',
      model: 'reasoning',
    };

    it('should accept valid actor data', () => {
      expect(() => ActorSchema.parse(validActor)).not.toThrow();
    });

    it('should require minimum field lengths', () => {
      expect(() =>
        ActorSchema.parse({ ...validActor, title: 'A' })
      ).toThrow();
      expect(() =>
        ActorSchema.parse({ ...validActor, reason: 'Short' })
      ).toThrow();
      expect(() =>
        ActorSchema.parse({ ...validActor, prompt: 'Short' })
      ).toThrow();
    });

    it('should accept skills array', () => {
      expect(() =>
        ActorSchema.parse({ ...validActor, skills: ['One', 'Two'] })
      ).not.toThrow();
      expect(() =>
        ActorSchema.parse({
          ...validActor,
          skills: Array(8).fill('skill'),
        })
      ).not.toThrow();
    });
  });

  describe('ResponseSchema', () => {
    const validResponse = {
      recommendation: 'I think you need to hire a Database Administrator to solve your performance issues',
      action: {
        type: 'create_actor',
        actor: {
          title: 'Database Administrator',
          reason: 'The team needs someone who can optimize database performance',
          skills: ['PostgreSQL', 'Query Optimization', 'Database Design'],
          prompt: 'You are a database expert with deep knowledge of PostgreSQL',
          model: 'reasoning',
        },
      },
    };

    it('should accept valid response data', () => {
      expect(() => ResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('should accept null action', () => {
      const responseWithNullAction = {
        ...validResponse,
        action: null,
      };
      expect(() => ResponseSchema.parse(responseWithNullAction)).not.toThrow();
    });

    it('should require minimum recommendation length', () => {
      expect(() =>
        ResponseSchema.parse({ ...validResponse, recommendation: 'Short' })
      ).toThrow();
    });
  });

  describe('Sequential Schema Parts', () => {
    const part1 = {
      recommendation: 'I think you need to hire a Database Administrator',
      action: 'create_actor' as const,
    };

    const part2 = {
      title: 'Database Administrator',
      reason: 'The team needs database performance expertise',
      skills: ['PostgreSQL', 'Query Optimization', 'Database Design'],
    };

    const part3 = {
      prompt: 'You are a database expert with deep knowledge of PostgreSQL',
      model: 'reasoning' as const,
    };

    it('should validate sequential parts', () => {
      expect(() => SequentialPart1Schema.parse(part1)).not.toThrow();
      expect(() => SequentialPart2Schema.parse(part2)).not.toThrow();
      expect(() => SequentialPart3Schema.parse(part3)).not.toThrow();
    });

    it('should merge sequential parts correctly', () => {
      const merged = mergeSequentialParts(part1, part2, part3);

      expect(merged.recommendation).toBe(part1.recommendation);
      expect(merged.action).not.toBeNull();
      expect(merged.action?.type).toBe('create_actor');
      expect(merged.action?.actor.title).toBe(part2.title);
      expect(merged.action?.actor.reason).toBe(part2.reason);
      expect(merged.action?.actor.skills).toEqual(part2.skills);
      expect(merged.action?.actor.prompt).toBe(part3.prompt);
      expect(merged.action?.actor.model).toBe(part3.model);
    });

    it('should handle null action in sequential merge', () => {
      const part1WithNullAction = { ...part1, action: null };
      const merged = mergeSequentialParts(part1WithNullAction, part2, part3);

      expect(merged.action).toBeNull();
    });
  });
});