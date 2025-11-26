export interface Message {
  participant: string;
  message: string;
}

export const participants = [
  { name: 'Alex', role: 'Tech Lead', expertise: 'Full-stack, React, Node.js' },
  { name: 'Jordan', role: 'Backend Developer', expertise: 'Python, APIs, microservices' },
  { name: 'Sam', role: 'Frontend Developer', expertise: 'React, TypeScript, UI/UX' },
  { name: 'Casey', role: 'Product Manager', expertise: 'Requirements, roadmap, customer feedback' },
  { name: 'Morgan', role: 'DevOps Engineer', expertise: 'CI/CD, Docker, basic AWS' },
] as const;

export const conversation: Message[] = [
  {
    participant: 'Casey',
    message: "Hey team, we've got a problem. Three enterprise customers are complaining about slow load times on the dashboard. One of them is threatening to churn if we don't fix it by end of month.",
  },
  {
    participant: 'Alex',
    message: "I've been looking into it. The main dashboard query is taking 8-12 seconds on accounts with more than 50k records. It's definitely a database issue.",
  },
  {
    participant: 'Jordan',
    message: "I added some basic indexes last week but it didn't help much. The query is joining across 4 tables and aggregating a lot of data.",
  },
  {
    participant: 'Sam',
    message: "From the frontend side, I can add loading skeletons and pagination, but that's just masking the problem. Users are going to notice the wait regardless.",
  },
  {
    participant: 'Morgan',
    message: "I checked the database server metrics. CPU and memory look fine, but I'm seeing a lot of disk I/O. Not sure what that means for query performance though.",
  },
  {
    participant: 'Alex',
    message: "I tried rewriting the query to use subqueries instead of joins, but it actually made it slower. I'm kind of out of ideas here.",
  },
  {
    participant: 'Jordan',
    message: 'Should we look at caching? We could cache the dashboard data in Redis and refresh it every few minutes.',
  },
  {
    participant: 'Casey',
    message: "The customers want real-time data, or at least near real-time. A few minutes delay isn't going to work for their use case.",
  },
  {
    participant: 'Sam',
    message: "What about lazy loading sections of the dashboard? We could load the critical metrics first and the rest async.",
  },
  {
    participant: 'Alex',
    message: "That helps with perceived performance, but the underlying query is still slow. And some customers have dashboards with all sections visible - they'd still see the delay.",
  },
  {
    participant: 'Morgan',
    message: 'I could spin up a read replica to offload the dashboard queries from the primary database. Would that help?',
  },
  {
    participant: 'Jordan',
    message: "It might reduce load on the primary, but the query itself would still be slow. We need to optimise the actual query execution.",
  },
  {
    participant: 'Casey',
    message: "What about the table structure itself? Maybe we need to redesign how we're storing this data?",
  },
  {
    participant: 'Alex',
    message: "That's crossed my mind. But honestly, I'm not confident about making schema changes without knowing exactly what's causing the bottleneck. We could make it worse.",
  },
  {
    participant: 'Jordan',
    message: "I looked at EXPLAIN ANALYZE on the query. There's a sequential scan on the events table that takes most of the time. But I'm not sure how to fix it without breaking other queries that depend on that table.",
  },
  {
    participant: 'Morgan',
    message: "Should we consider moving to a different database? I've heard TimescaleDB is good for time-series data, and a lot of our data is event-based.",
  },
  {
    participant: 'Alex',
    message: "That's a huge migration. We'd need someone who really knows what they're doing to evaluate whether it's worth it and plan the migration properly.",
  },
  {
    participant: 'Sam',
    message: "It feels like we're all guessing at this point. None of us are database experts. We know enough to be dangerous but not enough to fix this properly.",
  },
  {
    participant: 'Casey',
    message: "I agree. We've been circling on this for two weeks now. Maybe we need to bring in someone who specialises in this stuff?",
  },
  {
    participant: 'Alex',
    message: "Yeah, I think that's the right call. We need someone who can analyse the query plans, optimise the schema, set up proper indexing strategies, and maybe advise on whether we need a different database architecture altogether.",
  },
];

/**
 * Format conversation for LLM context
 */
export function formatConversation(): string {
  return conversation
    .map((msg) => `${msg.participant}: ${msg.message}`)
    .join('\n\n');
}

/**
 * Format conversation as chat messages for AI SDK
 */
export function getConversationMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
  // We'll present the conversation as a single user message with context
  return [
    {
      role: 'user' as const,
      content: `Here is a conversation between team members discussing a problem:\n\n${formatConversation()}`,
    },
  ];
}
