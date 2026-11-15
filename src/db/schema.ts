import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, numeric } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('Submitter'), // 'Evaluator' | 'Adjudicator' | 'Administrator' | 'Submitter' | 'Agent'
  department: text('department').default('General'),
  status: text('status').notNull().default('active'), // 'active' | 'suspended'
  sessionVersion: integer('session_version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 1b. Workspaces Table (Stores collaborative canvas & pipeline state per workspace)
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  stateJson: text('state_json').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 1c. Workspace Collaborators Table
export const workspaceMembers = pgTable('workspace_members', {
  id: serial('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  email: text('email').notNull(),
  role: text('role').notNull().default('collaborator'), // 'owner' | 'collaborator'
  status: text('status').notNull().default('active'), // 'active' | 'invited'
  inviteToken: text('invite_token'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 1d. User Account Invitations Table
export const userInvitations = pgTable('user_invitations', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull().default(''),
  role: text('role').notNull().default('Evaluator'),
  department: text('department').default('General'),
  token: text('token').notNull().unique(),
  workspaceId: text('workspace_id'),
  invitedBy: integer('invited_by').references(() => users.id),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted'
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Categories Table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  categoryName: text('category_name').notNull().unique(),
  description: text('description').notNull(),
});

// 3. Innovations Table
export const innovations = pgTable('innovations', {
  id: serial('id').primaryKey(),
  innovationNumber: text('innovation_number').notNull().unique(), // e.g. "CEDA-INV-2026-0101"
  title: text('title').notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  submitterId: integer('submitter_id').references(() => users.id),
  currentStage: text('current_stage').notNull().default('submission'),
  // 'submission' | 'screening' | 'evaluation' | 'expert_review' | 'adjudication' | 'pilot' | 'implementation' | 'impact_measurement' | 'archive'
  status: text('status').notNull().default('pending'), // 'pending' | 'in_review' | 'approved' | 'rejected' | 'deferred'
  priority: text('priority').notNull().default('MEDIUM'), // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  fundingRequested: integer('funding_requested').default(0),
  projectedJobs: integer('projected_jobs').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 4. Evaluations Table
export const evaluations = pgTable('evaluations', {
  id: serial('id').primaryKey(),
  innovationId: integer('innovation_id').references(() => innovations.id).notNull(),
  evaluatorId: integer('evaluator_id').references(() => users.id).notNull(),
  innovationScore: integer('innovation_score').notNull(), // 1-10
  feasibilityScore: integer('feasibility_score').notNull(), // 1-10
  impactScore: integer('impact_score').notNull(), // 1-10
  scalabilityScore: integer('scalability_score').notNull(), // 1-10
  comments: text('comments').notNull(),
  recommendation: text('recommendation').notNull(), // 'Proceed to Expert Review' | 'Request Information' | 'Do Not Proceed'
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Adjudications Table
export const adjudications = pgTable('adjudications', {
  id: serial('id').primaryKey(),
  innovationId: integer('innovation_id').references(() => innovations.id).notNull(),
  adjudicatorId: integer('adjudicator_id').references(() => users.id).notNull(),
  decision: text('decision').notNull(), // 'Approved for Pilot Phase' | 'Deferred' | 'Rejected' | 'Approved with Conditions'
  remarks: text('remarks').notNull(),
  decisionDate: timestamp('decision_date').defaultNow(),
});

// 6. Innovation Comments Table
export const innovationComments = pgTable('innovation_comments', {
  id: serial('id').primaryKey(),
  innovationId: integer('innovation_id').references(() => innovations.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Innovation History Table
export const innovationHistory = pgTable('innovation_history', {
  id: serial('id').primaryKey(),
  innovationId: integer('innovation_id').references(() => innovations.id).notNull(),
  action: text('action').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  changedBy: integer('changed_by').references(() => users.id),
  timestamp: timestamp('timestamp').defaultNow(),
});

// 8. Documents Table
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  innovationId: integer('innovation_id').references(() => innovations.id).notNull(),
  filename: text('filename').notNull(),
  fileUrl: text('file_url').notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  uploadDate: timestamp('upload_date').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submittedInnovations: many(innovations, { relationName: 'submitter' }),
  evaluations: many(evaluations),
  adjudications: many(adjudications),
  comments: many(innovationComments),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  innovations: many(innovations),
}));

export const innovationsRelations = relations(innovations, ({ one, many }) => ({
  category: one(categories, {
    fields: [innovations.categoryId],
    references: [categories.id],
  }),
  submitter: one(users, {
    fields: [innovations.submitterId],
    references: [users.id],
    relationName: 'submitter',
  }),
  evaluations: many(evaluations),
  adjudications: many(adjudications),
  comments: many(innovationComments),
  history: many(innovationHistory),
  documents: many(documents),
}));

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
  innovation: one(innovations, {
    fields: [evaluations.innovationId],
    references: [innovations.id],
  }),
  evaluator: one(users, {
    fields: [evaluations.evaluatorId],
    references: [users.id],
  }),
}));

export const adjudicationsRelations = relations(adjudications, ({ one }) => ({
  innovation: one(innovations, {
    fields: [adjudications.innovationId],
    references: [innovations.id],
  }),
  adjudicator: one(users, {
    fields: [adjudications.adjudicatorId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(innovationComments, ({ one }) => ({
  innovation: one(innovations, {
    fields: [innovationComments.innovationId],
    references: [innovations.id],
  }),
  user: one(users, {
    fields: [innovationComments.userId],
    references: [users.id],
  }),
}));

export const historyRelations = relations(innovationHistory, ({ one }) => ({
  innovation: one(innovations, {
    fields: [innovationHistory.innovationId],
    references: [innovations.id],
  }),
  changer: one(users, {
    fields: [innovationHistory.changedBy],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  innovation: one(innovations, {
    fields: [documents.innovationId],
    references: [innovations.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));
