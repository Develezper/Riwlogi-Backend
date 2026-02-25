import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const jsonContent = (schema) => ({
  "application/json": {
    schema,
  },
});

const errorMessageSchema = registry.register(
  "ErrorMessage",
  z.object({
    message: z.string().openapi({ example: "Debes iniciar sesión para continuar." }),
    detail: z.string().optional(),
  }),
);

const okSchema = registry.register(
  "OkResponse",
  z.object({
    ok: z.literal(true),
  }),
);

const loginBodySchema = registry.register(
  "LoginBody",
  z
    .object({
      identifier: z.string().min(1).optional().openapi({ example: "demo@riwlogi.dev" }),
      email: z.string().optional().openapi({ example: "demo@riwlogi.dev" }),
      password: z.string().min(1).openapi({ example: "123456" }),
    })
    .openapi("LoginBody"),
);

const registerBodySchema = registry.register(
  "RegisterBody",
  z.object({
    username: z.string().min(3).openapi({ example: "new_user" }),
    email: z.string().email().openapi({ example: "new.user@example.com" }),
    password: z.string().min(6).openapi({ example: "123456" }),
  }),
);

const authUserSchema = registry.register(
  "AuthUser",
  z.object({
    id: z.string().openapi({ example: "user_demo" }),
    username: z.string().openapi({ example: "demo" }),
    email: z.string().email().openapi({ example: "demo@riwlogi.dev" }),
    role: z.enum(["user", "admin"]).openapi({ example: "user" }),
    display_name: z.string().openapi({ example: "demo" }),
    created_at: z.string().datetime().openapi({ example: "2026-01-01T00:00:00.000Z" }),
  }),
);

const authSuccessSchema = registry.register(
  "AuthSuccess",
  z.object({
    access_token: z.string().openapi({ example: "token" }),
    expires_at: z.string().datetime().openapi({ example: "2026-02-25T20:00:00.000Z" }),
    user: authUserSchema,
  }),
);

const healthRootSchema = registry.register(
  "HealthRoot",
  z.object({
    ok: z.literal(true),
    service: z.string().openapi({ example: "riwlogi-backend" }),
    docs: z.string().openapi({ example: "/api/health" }),
  }),
);

const healthApiRootSchema = registry.register(
  "HealthApiRoot",
  z.object({
    ok: z.literal(true),
    status: z.literal("ok"),
    service: z.string().openapi({ example: "riwlogi-backend" }),
    health: z.object({
      method: z.literal("GET"),
      path: z.literal("/health"),
    }),
  }),
);

const healthSchema = registry.register(
  "Health",
  z.object({
    ok: z.literal(true),
    status: z.literal("ok"),
  }),
);

const healthLiveSchema = registry.register(
  "HealthLive",
  z.object({
    ok: z.literal(true),
    status: z.literal("alive"),
    service: z.string(),
    environment: z.string(),
    timestamp: z.string().datetime(),
    uptime_s: z.number().int().min(0),
    checks: z.object({
      process: z.literal("up"),
      event_loop: z.literal("up"),
    }),
  }),
);

const storeReadinessSchema = registry.register(
  "StoreReadiness",
  z.object({
    ok: z.boolean(),
    provider: z.enum(["memory", "postgres"]),
    latency_ms: z.number().int().min(0).optional(),
    checks: z.record(z.string(), z.any()).optional(),
    error: z.string().optional(),
  }),
);

const healthReadySchema = registry.register(
  "HealthReady",
  z.object({
    ok: z.literal(true),
    status: z.literal("ready"),
    service: z.string(),
    environment: z.string(),
    timestamp: z.string().datetime(),
    uptime_s: z.number().int().min(0),
    checks: z.object({
      store: storeReadinessSchema,
    }),
  }),
);

const healthNotReadySchema = registry.register(
  "HealthNotReady",
  z.object({
    ok: z.literal(false),
    status: z.literal("not_ready"),
    service: z.string(),
    environment: z.string(),
    timestamp: z.string().datetime(),
    uptime_s: z.number().int().min(0),
    checks: z.object({
      store: storeReadinessSchema,
    }),
  }),
);

const paginationQuerySchema = registry.register(
  "PaginationQuery",
  z.object({
    page: z.number().int().min(1).optional().openapi({ example: 1 }),
    limit: z.number().int().min(1).max(100).optional().openapi({ example: 20 }),
  }),
);

const paginationMetaSchema = registry.register(
  "PaginationMeta",
  z.object({
    page: z.number().int().min(1).openapi({ example: 1 }),
    limit: z.number().int().min(1).openapi({ example: 20 }),
    total: z.number().int().min(0).openapi({ example: 1 }),
    total_pages: z.number().int().min(0).openapi({ example: 1 }),
    has_prev: z.boolean().openapi({ example: false }),
    has_next: z.boolean().openapi({ example: false }),
  }),
);

const problemSummarySchema = registry.register(
  "ProblemSummary",
  z.object({
    id: z.string().openapi({ example: "two-sum" }),
    slug: z.string().openapi({ example: "two-sum" }),
    title: z.string().openapi({ example: "Two Sum" }),
    difficulty: z.number().int().min(1).max(3).openapi({ example: 1 }),
    tags: z.array(z.string()).openapi({ example: ["arrays"] }),
    acceptance: z.number().openapi({ example: 49.2 }),
    submissions: z.number().openapi({ example: 14523 }),
    stages_count: z.number().int().min(1).openapi({ example: 3 }),
  }),
);

const visibleTestSchema = registry.register(
  "VisibleTest",
  z.object({
    input_text: z.string(),
    expected_text: z.string(),
  }),
);

const stageTestSchema = registry.register(
  "StageTest",
  z.object({
    input_text: z.string(),
    expected_text: z.string(),
    is_hidden: z.boolean(),
  }),
);

const problemStageSchema = registry.register(
  "ProblemStage",
  z.object({
    id: z.string(),
    stage_index: z.number().int().min(1),
    prompt_md: z.string(),
    time_limit_ms: z.number().int().min(0),
    hidden_count: z.number().int().min(0),
    visible_tests: z.array(visibleTestSchema),
  }),
);

const starterCodeSchema = registry.register(
  "StarterCode",
  z.object({
    python: z.string().optional(),
    javascript: z.string().optional(),
    typescript: z.string().optional(),
  }),
);

const problemDetailSchema = registry.register(
  "ProblemDetail",
  problemSummarySchema.extend({
    description: z.string().optional(),
    examples: z.array(z.any()).optional(),
    constraints: z.array(z.any()).optional(),
    statement_md: z.string(),
    starter_code: starterCodeSchema,
    stages: z.array(problemStageSchema),
  }),
);

const listProblemsQuerySchema = registry.register(
  "ListProblemsQuery",
  paginationQuerySchema.extend({
    difficulty: z.number().int().min(1).max(3).optional(),
    search: z.string().optional(),
    tag: z.string().optional(),
  }),
);

const listProblemsResponseSchema = registry.register(
  "ListProblemsResponse",
  paginationMetaSchema.extend({
    items: z.array(problemSummarySchema),
  }),
);

const getProblemParamsSchema = registry.register(
  "GetProblemParams",
  z.object({
    slug: z.string(),
  }),
);

const getProblemResponseSchema = registry.register(
  "GetProblemResponse",
  z.object({
    item: problemDetailSchema,
  }),
);

const tagsResponseSchema = registry.register(
  "TagsResponse",
  z.object({
    items: z.array(z.string()),
  }),
);

const submissionEventSchema = registry.register(
  "SubmissionEvent",
  z.object({
    type: z.string().openapi({ example: "key" }),
    char_count: z.number().int().min(0).openapi({ example: 5 }),
    timestamp: z.string().datetime().optional().openapi({ example: "2026-02-25T12:00:00.000Z" }),
  }),
);

const startSubmissionBodySchema = registry.register(
  "StartSubmissionBody",
  z.object({
    problem_id: z.string().openapi({ example: "two-sum" }),
    language: z.enum(["python", "javascript", "typescript"]).optional().openapi({ example: "python" }),
  }),
);

const startSubmissionResponseSchema = registry.register(
  "StartSubmissionResponse",
  z.object({
    submission_id: z.string().openapi({ example: "sub_123" }),
  }),
);

const runSubmissionBodySchema = registry.register(
  "RunSubmissionBody",
  z.object({
    submission_id: z.string().openapi({ example: "sub_123" }),
    stage_id: z.string().openapi({ example: "two-sum-stage-1" }),
    code: z.string().openapi({ example: "def solve():\n  pass" }),
    events: z.array(submissionEventSchema).optional(),
  }),
);

const runVisibleResultSchema = registry.register(
  "RunVisibleResult",
  z.object({
    input_text: z.string(),
    expected_text: z.string(),
    passed: z.boolean(),
    error: z.string().nullable(),
  }),
);

const classificationSchema = registry.register(
  "SubmissionClassification",
  z.object({
    label: z.enum(["human", "assisted", "ai_generated"]).openapi({ example: "human" }),
    confidence: z.number().min(0).max(1).openapi({ example: 0.91 }),
  }),
);

const runSubmissionResponseSchema = registry.register(
  "RunSubmissionResponse",
  z.object({
    result: z.object({
      passed: z.boolean(),
      stage_index: z.number().int().min(1),
      stage_score: z.number(),
      runtime_ms: z.number(),
      visible_results: z.array(runVisibleResultSchema),
      classification: classificationSchema,
    }),
  }),
);

const submitSubmissionParamsSchema = registry.register(
  "SubmitSubmissionParams",
  z.object({
    id: z.string(),
  }),
);

const submitSubmissionResponseSchema = registry.register(
  "SubmitSubmissionResponse",
  z.object({
    verdict: z.enum(["accepted", "wrong_answer"]),
    final_score: z.number(),
  }),
);

const sendEventsBodySchema = registry.register(
  "SendEventsBody",
  z.object({
    events: z.array(submissionEventSchema),
  }),
);

const leaderboardQuerySchema = registry.register(
  "LeaderboardQuery",
  paginationQuerySchema.extend({
    timeframe: z.enum(["today", "week", "all"]).optional(),
  }),
);

const leaderboardItemSchema = registry.register(
  "LeaderboardItem",
  z.object({
    rank: z.number().int().min(1),
    username: z.string(),
    avatar: z.string(),
    score: z.number(),
    total_score: z.number(),
    solved: z.number().int().min(0),
    streak: z.number().int().min(0),
  }),
);

const leaderboardResponseSchema = registry.register(
  "LeaderboardResponse",
  paginationMetaSchema.extend({
    items: z.array(leaderboardItemSchema),
  }),
);

const profileUserSchema = registry.register(
  "ProfileUser",
  z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    display_name: z.string(),
    created_at: z.string().datetime(),
  }),
);

const profileResponseSchema = registry.register(
  "ProfileResponse",
  z.object({
    user: profileUserSchema,
    stats: z.object({
      total_score: z.number(),
      solved: z.number().int().min(0),
      by_difficulty: z.object({
        easy: z.number().int().min(0),
        medium: z.number().int().min(0),
        hard: z.number().int().min(0),
      }),
    }),
    streak: z.number().int().min(0),
    rank: z.number().int().min(1),
    badges: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        icon: z.string(),
      }),
    ),
  }),
);

const profileSubmissionItemSchema = registry.register(
  "ProfileSubmissionItem",
  z.object({
    id: z.string(),
    problem_id: z.string(),
    problem_title: z.string(),
    verdict: z.string(),
    language: z.string(),
    final_score: z.number(),
    runtime_ms: z.number(),
    submitted_at: z.string().datetime(),
    stage_results: z.record(z.string(), z.any()),
  }),
);

const profileSubmissionsResponseSchema = registry.register(
  "ProfileSubmissionsResponse",
  paginationMetaSchema.extend({
    items: z.array(profileSubmissionItemSchema),
  }),
);

const adminOverviewSchema = registry.register(
  "AdminOverview",
  z.object({
    item: z.object({
      kpis: z.object({
        total_users: z.number().int().min(0),
        active_users_7d: z.number().int().min(0),
        total_problems: z.number().int().min(0),
        published_problems: z.number().int().min(0),
        draft_problems: z.number().int().min(0),
        total_submissions: z.number().int().min(0),
        accepted_submissions: z.number().int().min(0),
        acceptance_rate: z.number(),
        ai_generated_problems: z.number().int().min(0),
      }),
      top_tags: z.array(
        z.object({
          tag: z.string(),
          count: z.number().int().min(0),
        }),
      ),
      recent_activity: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          label: z.string(),
          created_at: z.string().datetime(),
        }),
      ),
      updated_at: z.string().datetime(),
    }),
  }),
);

const adminUserSchema = registry.register(
  "AdminUser",
  z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    role: z.string(),
    is_admin: z.boolean(),
    display_name: z.string(),
    created_at: z.string().datetime(),
    submissions_count: z.number().int().min(0),
    solved_count: z.number().int().min(0),
    last_active_at: z.string().datetime().nullable(),
  }),
);

const adminUsersResponseSchema = registry.register(
  "AdminUsersResponse",
  paginationMetaSchema.extend({
    items: z.array(adminUserSchema),
  }),
);

const adminDeleteUserResponseSchema = registry.register(
  "AdminDeleteUserResponse",
  z.object({
    ok: z.literal(true),
    deleted_user_id: z.string(),
  }),
);

const adminProblemStageSchema = registry.register(
  "AdminProblemStage",
  problemStageSchema.extend({
    tests: z.array(stageTestSchema).optional(),
  }),
);

const adminProblemSchema = registry.register(
  "AdminProblem",
  z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    difficulty: z.number(),
    tags: z.array(z.string()),
    acceptance: z.number(),
    submissions: z.number(),
    stages_count: z.number(),
    description: z.string().optional(),
    examples: z.array(z.any()).optional(),
    constraints: z.array(z.any()).optional(),
    statement_md: z.string(),
    starter_code: starterCodeSchema,
    stages: z.array(adminProblemStageSchema),
    status: z.string(),
    source: z.string(),
    ai_generated: z.boolean(),
    last_generated_prompt: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
);

const adminProblemsResponseSchema = registry.register(
  "AdminProblemsResponse",
  paginationMetaSchema.extend({
    items: z.array(adminProblemSchema),
  }),
);

const adminGenerateProblemBodySchema = registry.register(
  "AdminGenerateProblemBody",
  z.object({
    prompt: z.string().min(10).openapi({ example: "Create a beginner-friendly array problem" }),
  }),
);

const adminProblemItemResponseSchema = registry.register(
  "AdminProblemItemResponse",
  z.object({
    item: adminProblemSchema,
  }),
);

const adminPatchProblemParamsSchema = registry.register(
  "AdminPatchProblemParams",
  z.object({
    id: z.string(),
  }),
);

const adminPatchProblemBodySchema = registry.register(
  "AdminPatchProblemBody",
  z
    .object({
      slug: z.string().optional(),
      title: z.string().optional(),
      difficulty: z.number().optional(),
      tags: z.array(z.string()).optional(),
      acceptance: z.number().optional(),
      submissions: z.number().optional(),
      description: z.string().optional(),
      examples: z.array(z.any()).optional(),
      constraints: z.array(z.any()).optional(),
      statement_md: z.string().optional(),
      starter_code: starterCodeSchema.optional(),
      stages: z.array(adminProblemStageSchema).optional(),
      stages_count: z.number().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      last_generated_prompt: z.string().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required.",
    }),
);

const adminDeleteProblemParamsSchema = registry.register(
  "AdminDeleteProblemParams",
  z.object({
    id: z.string(),
  }),
);

const adminDeleteProblemResponseSchema = registry.register(
  "AdminDeleteProblemResponse",
  z.object({
    ok: z.literal(true),
    deleted_problem_id: z.string(),
  }),
);

const commonErrorResponses = {
  400: {
    description: "Bad Request",
    content: jsonContent(errorMessageSchema),
  },
  401: {
    description: "Unauthorized",
    content: jsonContent(errorMessageSchema),
  },
  403: {
    description: "Forbidden",
    content: jsonContent(errorMessageSchema),
  },
  404: {
    description: "Not Found",
    content: jsonContent(errorMessageSchema),
  },
  409: {
    description: "Conflict",
    content: jsonContent(errorMessageSchema),
  },
  429: {
    description: "Too Many Requests",
    content: jsonContent(errorMessageSchema),
  },
  500: {
    description: "Internal Server Error",
    content: jsonContent(errorMessageSchema),
  },
};

registry.registerPath({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Service root health",
  responses: {
    200: {
      description: "OK",
      content: jsonContent(healthRootSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api",
  tags: ["Health"],
  summary: "API root health",
  responses: {
    200: {
      description: "OK",
      content: jsonContent(healthApiRootSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/health",
  tags: ["Health"],
  summary: "API health endpoint",
  responses: {
    200: {
      description: "OK",
      content: jsonContent(healthSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/health/live",
  tags: ["Health"],
  summary: "Liveness check",
  responses: {
    200: {
      description: "Process is alive",
      content: jsonContent(healthLiveSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/health/ready",
  tags: ["Health"],
  summary: "Readiness check",
  responses: {
    200: {
      description: "Service is ready",
      content: jsonContent(healthReadySchema),
    },
    503: {
      description: "Service is not ready",
      content: jsonContent(healthNotReadySchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/openapi.json",
  tags: ["Docs"],
  summary: "OpenAPI JSON document",
  responses: {
    200: {
      description: "OpenAPI specification",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Auth"],
  summary: "Login with email or username",
  request: {
    body: {
      required: true,
      content: jsonContent(loginBodySchema),
    },
  },
  responses: {
    200: {
      description: "Authenticated",
      content: jsonContent(authSuccessSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    429: commonErrorResponses[429],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Auth"],
  summary: "Register user",
  request: {
    body: {
      required: true,
      content: jsonContent(registerBodySchema),
    },
  },
  responses: {
    201: {
      description: "Created",
      content: jsonContent(authSuccessSchema),
    },
    400: commonErrorResponses[400],
    409: commonErrorResponses[409],
    429: commonErrorResponses[429],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Auth"],
  summary: "Logout current session",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Logged out",
      content: jsonContent(okSchema),
    },
    401: commonErrorResponses[401],
    429: commonErrorResponses[429],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/problems",
  tags: ["Problems"],
  summary: "List problems",
  request: {
    query: listProblemsQuerySchema,
  },
  responses: {
    200: {
      description: "Problems list",
      content: jsonContent(listProblemsResponseSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/problems/{slug}",
  tags: ["Problems"],
  summary: "Get problem by slug",
  request: {
    params: getProblemParamsSchema,
  },
  responses: {
    200: {
      description: "Problem details",
      content: jsonContent(getProblemResponseSchema),
    },
    404: commonErrorResponses[404],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/problems/tags",
  tags: ["Problems"],
  summary: "List available tags",
  responses: {
    200: {
      description: "Tags list",
      content: jsonContent(tagsResponseSchema),
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/submissions/start",
  tags: ["Submissions"],
  summary: "Start submission",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: jsonContent(startSubmissionBodySchema),
    },
  },
  responses: {
    201: {
      description: "Submission created",
      content: jsonContent(startSubmissionResponseSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    429: commonErrorResponses[429],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/submissions/run",
  tags: ["Submissions"],
  summary: "Run stage for submission",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: jsonContent(runSubmissionBodySchema),
    },
  },
  responses: {
    200: {
      description: "Stage result",
      content: jsonContent(runSubmissionResponseSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    404: commonErrorResponses[404],
    429: commonErrorResponses[429],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/submissions/{id}/submit",
  tags: ["Submissions"],
  summary: "Finalize submission",
  security: [{ bearerAuth: [] }],
  request: {
    params: submitSubmissionParamsSchema,
  },
  responses: {
    200: {
      description: "Submission verdict",
      content: jsonContent(submitSubmissionResponseSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    404: commonErrorResponses[404],
    429: commonErrorResponses[429],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/submissions/{id}/events",
  tags: ["Submissions"],
  summary: "Append interaction events",
  security: [{ bearerAuth: [] }],
  request: {
    params: submitSubmissionParamsSchema,
    body: {
      required: true,
      content: jsonContent(sendEventsBodySchema),
    },
  },
  responses: {
    200: {
      description: "Events accepted",
      content: jsonContent(okSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    404: commonErrorResponses[404],
    429: commonErrorResponses[429],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/leaderboard",
  tags: ["Leaderboard"],
  summary: "Get leaderboard",
  request: {
    query: leaderboardQuerySchema,
  },
  responses: {
    200: {
      description: "Leaderboard list",
      content: jsonContent(leaderboardResponseSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/profile/me",
  tags: ["Profile"],
  summary: "Get profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: jsonContent(profileResponseSchema),
    },
    401: commonErrorResponses[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/profile/submissions",
  tags: ["Profile"],
  summary: "Get profile submissions",
  security: [{ bearerAuth: [] }],
  request: {
    query: paginationQuerySchema,
  },
  responses: {
    200: {
      description: "Submissions list",
      content: jsonContent(profileSubmissionsResponseSchema),
    },
    401: commonErrorResponses[401],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/overview",
  tags: ["Admin"],
  summary: "Get admin overview",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Overview payload",
      content: jsonContent(adminOverviewSchema),
    },
    401: commonErrorResponses[401],
    403: commonErrorResponses[403],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users",
  tags: ["Admin"],
  summary: "List users for admin",
  security: [{ bearerAuth: [] }],
  request: {
    query: paginationQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated users",
      content: jsonContent(adminUsersResponseSchema),
    },
    401: commonErrorResponses[401],
    403: commonErrorResponses[403],
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/users/{id}",
  tags: ["Admin"],
  summary: "Delete user",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "User deleted",
      content: jsonContent(adminDeleteUserResponseSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    403: commonErrorResponses[403],
    404: commonErrorResponses[404],
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/problems",
  tags: ["Admin"],
  summary: "List admin problems",
  security: [{ bearerAuth: [] }],
  request: {
    query: paginationQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated problems",
      content: jsonContent(adminProblemsResponseSchema),
    },
    401: commonErrorResponses[401],
    403: commonErrorResponses[403],
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/problems/generate",
  tags: ["Admin"],
  summary: "Generate AI problem draft",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: jsonContent(adminGenerateProblemBodySchema),
    },
  },
  responses: {
    201: {
      description: "Problem generated",
      content: jsonContent(adminProblemItemResponseSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    403: commonErrorResponses[403],
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/problems/{id}",
  tags: ["Admin"],
  summary: "Update problem",
  security: [{ bearerAuth: [] }],
  request: {
    params: adminPatchProblemParamsSchema,
    body: {
      required: true,
      content: jsonContent(adminPatchProblemBodySchema),
    },
  },
  responses: {
    200: {
      description: "Problem updated",
      content: jsonContent(adminProblemItemResponseSchema),
    },
    400: commonErrorResponses[400],
    401: commonErrorResponses[401],
    403: commonErrorResponses[403],
    404: commonErrorResponses[404],
    409: commonErrorResponses[409],
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/problems/{id}",
  tags: ["Admin"],
  summary: "Delete problem",
  security: [{ bearerAuth: [] }],
  request: {
    params: adminDeleteProblemParamsSchema,
  },
  responses: {
    200: {
      description: "Problem deleted",
      content: jsonContent(adminDeleteProblemResponseSchema),
    },
    401: commonErrorResponses[401],
    403: commonErrorResponses[403],
    404: commonErrorResponses[404],
  },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Riwlogi Backend API",
      version: "1.0.0",
      description: "OpenAPI generado desde schemas Zod con @asteasolutions/zod-to-openapi.",
    },
    servers: [
      { url: "/", description: "Relative to current host" },
      { url: "http://localhost:8000", description: "Local development default" },
    ],
    tags: [
      { name: "Health" },
      { name: "Docs" },
      { name: "Auth" },
      { name: "Problems" },
      { name: "Submissions" },
      { name: "Leaderboard" },
      { name: "Profile" },
      { name: "Admin" },
    ],
  });
}
