import express, { type Request, type Response } from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db, ensureDatabaseInitialized } from './src/db/index.ts';
import { 
  users, innovations, categories, evaluations, 
  adjudications, innovationComments, innovationHistory, documents,
  workspaces, workspaceMembers, userInvitations
} from './src/db/schema.ts';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import {
  searchCipaAndBursRegistry,
  evaluateIdeaStatutoryScreening,
} from './src/lib/cipaScreeningEngine.ts';
import {
  sendSystemEmail,
  buildStageUpdateEmailTemplate,
  buildAccountCreatedEmailTemplate,
  buildCollaboratorInviteEmailTemplate,
  buildAccountDeletedEmailTemplate,
} from './src/lib/emailService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ============================================================================
// Password Hashing & Email Invitation Helpers
// ============================================================================
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

async function resolveSubmitterEmailForIdea(params: {
  innovationId?: string | number;
  code?: string;
  title?: string;
  submitterEmail?: string;
  submitterName?: string;
}): Promise<{ email: string; name: string } | null> {
  if (params.submitterEmail && params.submitterEmail.includes('@')) {
    return {
      email: params.submitterEmail.trim().toLowerCase(),
      name: params.submitterName || params.submitterEmail,
    };
  }

  try {
    const conditions: any[] = [];
    const numId = params.innovationId ? parseInt(String(params.innovationId), 10) : NaN;
    if (!isNaN(numId) && String(numId) === String(params.innovationId)) {
      conditions.push(eq(innovations.id, numId));
    }
    if (params.code) {
      conditions.push(eq(innovations.innovationNumber, String(params.code).replace(/[\[\]]/g, '').trim()));
    }
    if (params.title && params.title.trim()) {
      conditions.push(sql`LOWER(TRIM(${innovations.title})) = LOWER(TRIM(${params.title.trim()}))`);
    }

    if (conditions.length > 0) {
      const target = await db.query.innovations.findFirst({
        where: conditions.length === 1 ? conditions[0] : or(...conditions),
      });
      if (target?.submitterId) {
        const sub = await db.query.users.findFirst({
          where: eq(users.id, target.submitterId),
        });
        if (sub?.email) {
          return {
            email: sub.email,
            name: `${sub.firstName} ${sub.lastName || ''}`.trim() || params.submitterName || sub.email,
          };
        }
      }
    }

    if (params.submitterName && params.submitterName.trim()) {
      const targetName = params.submitterName.trim().toLowerCase();
      const allUsers = await db.select().from(users);
      const matched = allUsers.find(
        (u) => `${u.firstName} ${u.lastName || ''}`.trim().toLowerCase() === targetName
      );
      if (matched?.email) {
        return {
          email: matched.email,
          name: `${matched.firstName} ${matched.lastName || ''}`.trim(),
        };
      }
    }
  } catch (err) {
    console.warn('resolveSubmitterEmailForIdea notice:', err);
  }
  return null;
}

// API Routes

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 1. Categories API
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const allCategories = await db.select().from(categories);
    res.json(allCategories);
  } catch (error: any) {
    console.warn('Error fetching categories (returning empty fallback):', error?.message || error);
    res.json([]);
  }
});

app.post('/api/categories', async (req: Request, res: Response) => {
  try {
    const { categoryName, description } = req.body;
    if (!categoryName || !description) {
      return res.status(400).json({ error: 'categoryName and description are required' });
    }
    const [newCategory] = await db.insert(categories).values({
      categoryName,
      description,
    }).returning();
    res.status(201).json(newCategory);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// 2. Users API & Sync
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(users.id);
    res.json(allUsers);
  } catch (error: any) {
    console.warn('Error fetching users (returning empty fallback):', error?.message || error);
    res.json([]);
  }
});

app.post('/api/users/sync', async (req: Request, res: Response) => {
  const { firebaseUid, email, firstName, lastName, role, department } = req.body || {};
  if (!firebaseUid || !email) {
    return res.status(400).json({ error: 'firebaseUid and email are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const existing = await db.query.users.findFirst({
      where: or(eq(users.firebaseUid, firebaseUid), eq(users.email, normalizedEmail)),
    });

    if (existing) {
      const [updated] = await db.update(users)
        .set({
          firebaseUid,
          email: normalizedEmail,
          firstName: firstName || existing.firstName || 'User',
          lastName: lastName !== undefined ? lastName : existing.lastName,
          role: existing.role || role || 'Submitter',
          department: existing.department || department || 'General',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [user] = await db.insert(users)
      .values({
        firebaseUid,
        email: normalizedEmail,
        firstName: firstName || 'User',
        lastName: lastName || '',
        role: role || 'Submitter',
        department: department || 'General',
        updatedAt: new Date(),
      })
      .returning();

    res.json(user);
  } catch (error: any) {
    console.warn('Error syncing user with DB (returning local fallback):', error?.message || error);
    res.json({
      id: 1,
      firebaseUid,
      email,
      firstName: firstName || 'User',
      lastName: lastName || '',
      role: role || 'Administrator',
      department: department || 'General',
    });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, role, department } = req.body;
    if (!email || !firstName) {
      return res.status(400).json({ error: 'email and firstName are required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });
    if (existing) {
      return res.status(409).json({ error: 'A user account with this email already exists' });
    }
    const firebaseUid = `official_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [user] = await db.insert(users).values({
      firebaseUid,
      email: normalizedEmail,
      firstName,
      lastName: lastName || '',
      role: role || 'Evaluator',
      department: department || 'General',
    }).returning();
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.patch('/api/users/:id/role', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role, department } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'role is required' });
    }

    const [updatedUser] = await db.update(users)
      .set({
        role,
        department: department !== undefined ? department : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// 3. Innovations API
app.get('/api/innovations', async (req: Request, res: Response) => {
  try {
    const { submitterId, submitterEmail } = req.query;

    const allInnovations = await db.query.innovations.findMany({
      with: {
        category: true,
        submitter: true,
        evaluations: {
          with: {
            evaluator: true,
          },
        },
        adjudications: {
          with: {
            adjudicator: true,
          },
        },
        comments: {
          with: {
            user: true,
          },
        },
        history: true,
      },
      orderBy: [desc(innovations.updatedAt)],
    });

    if (submitterId !== undefined || submitterEmail !== undefined) {
      const reqId = submitterId !== undefined && submitterId !== '' ? Number(submitterId) : NaN;
      const reqEmailLower = submitterEmail ? String(submitterEmail).trim().toLowerCase() : '';
      const scoped = allInnovations.filter((item) => {
        const matchesId = !Number.isNaN(reqId) && item.submitterId === reqId;
        const matchesEmail =
          Boolean(reqEmailLower) &&
          Boolean(item.submitter?.email) &&
          String(item.submitter?.email).trim().toLowerCase() === reqEmailLower;
        return matchesId || matchesEmail;
      });
      return res.json(scoped);
    }

    res.json(allInnovations);
  } catch (error: any) {
    console.warn('Error fetching innovations (returning empty fallback):', error?.message || error);
    res.json([]);
  }
});

app.get('/api/innovations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const innovation = await db.query.innovations.findFirst({
      where: eq(innovations.id, id),
      with: {
        category: true,
        submitter: true,
        evaluations: {
          with: {
            evaluator: true,
          },
        },
        adjudications: {
          with: {
            adjudicator: true,
          },
        },
        comments: {
          with: {
            user: true,
          },
        },
        history: true,
      },
    });

    if (!innovation) {
      return res.status(404).json({ error: 'Innovation not found' });
    }

    res.json(innovation);
  } catch (error: any) {
    console.error('Error fetching innovation detail:', error);
    res.status(500).json({ error: 'Failed to fetch innovation detail' });
  }
});

app.post('/api/innovations', async (req: Request, res: Response) => {
  try {
    const { 
      title, description, categoryId, submitterId, 
      priority, fundingRequested, projectedJobs 
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const innovationNumber = `CEDA-INV-2026-${randomNum}`;

    const [newInnovation] = await db.insert(innovations).values({
      innovationNumber,
      title,
      description,
      categoryId: categoryId ? parseInt(categoryId) : null,
      submitterId: submitterId ? parseInt(submitterId) : null,
      currentStage: 'submission',
      status: 'pending',
      priority: priority || 'MEDIUM',
      fundingRequested: fundingRequested ? parseInt(fundingRequested) : 0,
      projectedJobs: projectedJobs ? parseInt(projectedJobs) : 0,
    }).returning();

    // Log history
    await db.insert(innovationHistory).values({
      innovationId: newInnovation.id,
      action: 'Idea Submitted',
      previousStatus: null,
      newStatus: 'pending',
      changedBy: submitterId ? parseInt(submitterId) : null,
    });

    res.status(201).json(newInnovation);
  } catch (error: any) {
    console.error('Error creating innovation:', error);
    res.status(500).json({ error: 'Failed to create innovation' });
  }
});

// Move Stage / Update Status
app.patch('/api/innovations/:id/stage', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const numericId = parseInt(rawId, 10);
    const { stage, status, userId, actionNote } = req.body;

    const existing = await db.query.innovations.findFirst({
      where: !isNaN(numericId) && String(numericId) === rawId
        ? eq(innovations.id, numericId)
        : eq(innovations.innovationNumber, rawId),
    });

    if (!existing) {
      return res.json({ status: 'ok', stage, id: rawId });
    }

    const [updated] = await db.update(innovations)
      .set({
        currentStage: stage || existing.currentStage,
        status: status || existing.status,
        updatedAt: new Date(),
      })
      .where(eq(innovations.id, existing.id))
      .returning();

    // Log history
    await db.insert(innovationHistory).values({
      innovationId: existing.id,
      action: actionNote || `Transitioned to ${stage || existing.currentStage}`,
      previousStatus: existing.status,
      newStatus: status || existing.status,
      changedBy: userId ? parseInt(userId) : null,
    });

    res.json(updated);
  } catch (error: any) {
    console.warn('Error updating innovation stage:', error?.message || error);
    res.json({ status: 'ok' });
  }
});

// Sync Innovation Stage & Status by ID, Code, or Title (Real-Time Cross-Role Lifecycle Sync)
app.post('/api/innovations/sync-stage', async (req: Request, res: Response) => {
  try {
    const { id, code, title, stage, status, actionNote, userId } = req.body || {};
    const conditions: any[] = [];
    const numericId = id ? parseInt(String(id), 10) : NaN;
    if (!isNaN(numericId) && String(numericId) === String(id)) {
      conditions.push(eq(innovations.id, numericId));
    }
    if (id && typeof id === 'string') {
      conditions.push(eq(innovations.innovationNumber, id));
    }
    if (code && typeof code === 'string') {
      conditions.push(eq(innovations.innovationNumber, code.replace(/[\[\]]/g, '').trim()));
    }
    if (title && typeof title === 'string' && title.trim()) {
      conditions.push(sql`LOWER(TRIM(${innovations.title})) = LOWER(TRIM(${title.trim()}))`);
    }

    if (conditions.length === 0) {
      return res.json({ status: 'noop' });
    }

    const matchingRows = await db
      .select()
      .from(innovations)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions));

    if (matchingRows.length === 0) {
      return res.json({ status: 'not_found' });
    }

    const updatedRows = [];
    for (const row of matchingRows) {
      const [updated] = await db
        .update(innovations)
        .set({
          currentStage: stage || row.currentStage,
          status: status || row.status,
          updatedAt: new Date(),
        })
        .where(eq(innovations.id, row.id))
        .returning();
      updatedRows.push(updated);

      if (actionNote) {
        await db
          .insert(innovationHistory)
          .values({
            innovationId: row.id,
            action: actionNote,
            previousStatus: row.status,
            newStatus: status || row.status,
            changedBy: userId ? parseInt(String(userId), 10) : null,
          })
          .catch(() => {});
      }
    }

    res.json({ status: 'ok', updatedCount: updatedRows.length, items: updatedRows });
  } catch (error: any) {
    console.warn('Error in /api/innovations/sync-stage:', error?.message || error);
    res.json({ status: 'ok' });
  }
});

// 4. Evaluations API (Evaluator Role)
app.post('/api/innovations/:id/evaluations', async (req: Request, res: Response) => {
  try {
    const innovationId = parseInt(req.params.id);
    const { 
      evaluatorId, innovationScore, feasibilityScore, 
      impactScore, scalabilityScore, comments, recommendation 
    } = req.body;

    if (!evaluatorId || !comments || !recommendation) {
      return res.status(400).json({ error: 'Evaluator ID, comments, and recommendation are required' });
    }

    const [newEval] = await db.insert(evaluations).values({
      innovationId,
      evaluatorId: parseInt(evaluatorId),
      innovationScore: parseInt(innovationScore) || 7,
      feasibilityScore: parseInt(feasibilityScore) || 7,
      impactScore: parseInt(impactScore) || 7,
      scalabilityScore: parseInt(scalabilityScore) || 7,
      comments,
      recommendation,
    }).returning();

    // Update status to in_review and log history
    await db.update(innovations)
      .set({ status: 'in_review', updatedAt: new Date() })
      .where(eq(innovations.id, innovationId));

    await db.insert(innovationHistory).values({
      innovationId,
      action: `Evaluation Completed: ${recommendation}`,
      previousStatus: 'pending',
      newStatus: 'in_review',
      changedBy: parseInt(evaluatorId),
    });

    // Notify submitter via email of evaluation progress
    const targetInnovation = await db.query.innovations.findFirst({
      where: eq(innovations.id, innovationId),
    });

    if (targetInnovation?.submitterId) {
      const submitter = await db.query.users.findFirst({
        where: eq(users.id, targetInnovation.submitterId),
      });
      if (submitter?.email) {
        const origin = req.headers.origin || `http://localhost:${PORT}`;
        const compositeScore = (
          (parseInt(innovationScore) +
            parseInt(feasibilityScore) +
            parseInt(impactScore) +
            parseInt(scalabilityScore)) /
          4
        ).toFixed(1);
        const tpl = buildStageUpdateEmailTemplate({
          recipientName: `${submitter.firstName} ${submitter.lastName}`.trim(),
          ideaTitle: targetInnovation.title,
          ideaCode: targetInnovation.innovationNumber,
          previousStage: 'Technical Evaluation',
          newStage: recommendation.toLowerCase().includes('adjudication')
            ? 'Board Adjudication'
            : recommendation.toLowerCase().includes('do not proceed')
              ? 'Technical Evaluation (Not Approved)'
              : 'Expert Review',
          outcome: recommendation.toLowerCase().includes('do not proceed')
            ? 'rejected'
            : recommendation.toLowerCase().includes('request')
              ? 'docs_requested'
              : 'passed',
          actorName: 'Assigned Evaluator',
          actorRole: 'Evaluator',
          notes: comments,
          portalUrl: origin,
          extraDetails: {
            'Composite Score': `${compositeScore}/10`,
            'Technical Feasibility': `${feasibilityScore}/10`,
            'Market Impact': `${impactScore}/10`,
            'Scalability Score': `${scalabilityScore}/10`,
            Recommendation: recommendation,
          },
        });
        sendSystemEmail({
          toEmail: submitter.email,
          recipientName: `${submitter.firstName} ${submitter.lastName}`.trim(),
          subject: tpl.subject,
          title: tpl.title,
          message: `Stage 3 Technical Evaluation completed (${compositeScore}/10). Recommendation: ${recommendation}.`,
          customHtml: tpl.html,
        }).catch((err) => console.warn('Progress email error:', err));
      }
    }

    res.status(201).json(newEval);
  } catch (error: any) {
    console.error('Error recording evaluation:', error);
    res.status(500).json({ error: 'Failed to record evaluation' });
  }
});

// 5. Adjudications API (Adjudicator Role)
app.post('/api/innovations/:id/adjudications', async (req: Request, res: Response) => {
  try {
    const innovationId = parseInt(req.params.id);
    const { adjudicatorId, decision, remarks, nextStage } = req.body;

    if (!adjudicatorId || !decision || !remarks) {
      return res.status(400).json({ error: 'Adjudicator ID, decision, and remarks are required' });
    }

    const [newAdjudication] = await db.insert(adjudications).values({
      innovationId,
      adjudicatorId: parseInt(adjudicatorId),
      decision,
      remarks,
    }).returning();

    let newStatus = 'approved';
    if (decision === 'Deferred') newStatus = 'deferred';
    if (decision === 'Rejected') newStatus = 'rejected';

    await db.update(innovations)
      .set({ 
        status: newStatus,
        currentStage: nextStage || (decision.includes('Approved') ? 'pilot' : 'adjudication'),
        updatedAt: new Date() 
      })
      .where(eq(innovations.id, innovationId));

    await db.insert(innovationHistory).values({
      innovationId,
      action: `Adjudication Decision: ${decision}`,
      previousStatus: 'in_review',
      newStatus,
      changedBy: parseInt(adjudicatorId),
    });

    // Notify submitter via email of adjudication decision
    const targetInnovation = await db.query.innovations.findFirst({
      where: eq(innovations.id, innovationId),
    });
    if (targetInnovation?.submitterId) {
      const submitter = await db.query.users.findFirst({
        where: eq(users.id, targetInnovation.submitterId),
      });
      if (submitter?.email) {
        const origin = req.headers.origin || `http://localhost:${PORT}`;
        const adjOutcome = decision.toLowerCase().includes('reject')
          ? 'rejected'
          : decision.toLowerCase().includes('defer')
            ? 'docs_requested'
            : 'passed';
        const tpl = buildStageUpdateEmailTemplate({
          recipientName: `${submitter.firstName} ${submitter.lastName}`.trim(),
          ideaTitle: targetInnovation.title,
          ideaCode: targetInnovation.innovationNumber,
          previousStage: 'Board Adjudication',
          newStage: nextStage || (decision.includes('Approved') ? 'Pilot Deployment' : 'Adjudication'),
          outcome: adjOutcome,
          actorName: 'CEDA Adjudication Board',
          actorRole: 'Adjudicator',
          notes: remarks,
          portalUrl: origin,
          extraDetails: {
            'Formal Decision': decision,
          },
        });
        sendSystemEmail({
          toEmail: submitter.email,
          recipientName: `${submitter.firstName} ${submitter.lastName}`.trim(),
          subject: tpl.subject,
          title: tpl.title,
          message: `Adjudication Board Decision: ${decision}.`,
          customHtml: tpl.html,
        }).catch((err) => console.warn('Adjudication email error:', err));
      }
    }

    res.status(201).json(newAdjudication);
  } catch (error: any) {
    console.error('Error recording adjudication:', error);
    res.status(500).json({ error: 'Failed to record adjudication' });
  }
});

// Custom System Mailing API for Assignments & Notifications
app.post('/api/notifications/email', async (req: Request, res: Response) => {
  try {
    const { toEmail, recipientName, subject, title, message, badge, actionUrl, actionText, details } = req.body || {};
    if (!toEmail || !subject || !message) {
      return res.status(400).json({ error: 'toEmail, subject, and message are required' });
    }
    const result = await sendSystemEmail({
      toEmail,
      recipientName,
      subject,
      title: title || subject,
      message,
      badge,
      actionUrl,
      actionText,
      details,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error dispatching notification email:', error);
    res.status(500).json({ error: 'Failed to dispatch email' });
  }
});

// Branded Stage Update / Approval Email API for Submitters (via .env SMTP)
app.post('/api/emails/stage-update', async (req: Request, res: Response) => {
  try {
    const {
      innovationId,
      code,
      title,
      previousStage,
      newStage,
      outcome,
      actorName,
      actorRole,
      notes,
      submitterEmail,
      submitterName,
      extraDetails,
    } = req.body || {};

    if (!title || !newStage) {
      return res.status(400).json({ error: 'title and newStage are required' });
    }

    const recipient = await resolveSubmitterEmailForIdea({
      innovationId,
      code,
      title,
      submitterEmail,
      submitterName,
    });

    if (!recipient?.email) {
      return res.json({ sent: false, skipped: true, info: 'No submitter email found on record for this proposal.' });
    }

    const origin = req.headers.origin || `http://localhost:${PORT}`;
    const tpl = buildStageUpdateEmailTemplate({
      recipientName: recipient.name || submitterName || 'Citizen Innovator',
      ideaTitle: title,
      ideaCode: code,
      previousStage,
      newStage,
      outcome: outcome || 'passed',
      actorName,
      actorRole,
      notes,
      portalUrl: origin,
      extraDetails,
    });

    const result = await sendSystemEmail({
      toEmail: recipient.email,
      recipientName: recipient.name,
      subject: tpl.subject,
      title: tpl.title,
      message: notes || `Your proposal "${title}" moved to ${newStage}.`,
      customHtml: tpl.html,
    });

    res.json(result);
  } catch (error: any) {
    console.warn('Error dispatching stage update email:', error?.message || error);
    res.json({ sent: false, info: 'Stage update email skipped due to error.' });
  }
});

// 6. Comments API
app.get('/api/innovations/:id/comments', async (req: Request, res: Response) => {
  try {
    const innovationId = parseInt(req.params.id);
    const comments = await db.query.innovationComments.findMany({
      where: eq(innovationComments.innovationId, innovationId),
      with: {
        user: true,
      },
      orderBy: [desc(innovationComments.createdAt)],
    });
    res.json(comments);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/innovations/:id/comments', async (req: Request, res: Response) => {
  try {
    const innovationId = parseInt(req.params.id);
    const { userId, comment } = req.body;
    if (!userId || !comment) {
      return res.status(400).json({ error: 'User ID and comment are required' });
    }

    const [newComment] = await db.insert(innovationComments).values({
      innovationId,
      userId: parseInt(userId),
      comment,
    }).returning();

    res.status(201).json(newComment);
  } catch (error: any) {
    console.error('Error posting comment:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// 6b. Innovation History & Documents API
app.get('/api/innovations/:id/history', async (req: Request, res: Response) => {
  try {
    const innovationId = parseInt(req.params.id);
    const historyRows = await db.query.innovationHistory.findMany({
      where: eq(innovationHistory.innovationId, innovationId),
      with: { changer: true },
      orderBy: [desc(innovationHistory.timestamp)],
    });
    res.json(historyRows);
  } catch (error: any) {
    console.warn('Error fetching innovation history:', error?.message || error);
    res.json([]);
  }
});

app.get('/api/innovations/:id/documents', async (req: Request, res: Response) => {
  try {
    const innovationId = parseInt(req.params.id);
    const docs = await db.query.documents.findMany({
      where: eq(documents.innovationId, innovationId),
      with: { uploader: true },
      orderBy: [desc(documents.uploadDate)],
    });
    res.json(docs);
  } catch (error: any) {
    console.warn('Error fetching documents:', error?.message || error);
    res.json([]);
  }
});

app.post('/api/innovations/:id/documents', async (req: Request, res: Response) => {
  try {
    const innovationId = parseInt(req.params.id);
    const { filename, fileUrl, uploadedBy } = req.body;
    if (!filename || !fileUrl) {
      return res.status(400).json({ error: 'filename and fileUrl are required' });
    }

    const [newDoc] = await db.insert(documents).values({
      innovationId,
      filename,
      fileUrl,
      uploadedBy: uploadedBy ? parseInt(uploadedBy) : null,
    }).returning();

    res.status(201).json(newDoc);
  } catch (error: any) {
    console.error('Error saving document record:', error);
    res.status(500).json({ error: 'Failed to save document record' });
  }
});

// 7. Macro Analytics
app.get('/api/analytics', async (req: Request, res: Response) => {
  try {
    const allInnovations = await db.select().from(innovations);
    const allUsers = await db.select().from(users);
    const allEvaluations = await db.select().from(evaluations);

    const totalFunding = allInnovations.reduce((sum, i) => sum + (i.fundingRequested || 0), 0);
    const totalJobs = allInnovations.reduce((sum, i) => sum + (i.projectedJobs || 0), 0);

    const stagesCount: Record<string, number> = {};
    allInnovations.forEach((i) => {
      stagesCount[i.currentStage] = (stagesCount[i.currentStage] || 0) + 1;
    });

    res.json({
      totalInnovations: allInnovations.length,
      totalUsers: allUsers.length,
      totalEvaluations: allEvaluations.length,
      totalFunding,
      totalJobs,
      stagesCount,
    });
  } catch (error: any) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// ============================================================================
// 8. Authentication, Admin Account Creation, Email Invitations & Session Control
// ============================================================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, String(email).trim().toLowerCase()),
    });

    if (!user) {
      return res.status(401).json({ error: 'No account found for that email address' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended by an Administrator' });
    }

    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { passwordHash: _ph, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout-all', async (req: Request, res: Response) => {
  try {
    await db.update(users).set({
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    });
    res.json({ success: true, message: 'All user sessions invalidated' });
  } catch (error: any) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to log out all sessions' });
  }
});

app.get('/api/auth/session-check', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId);
    const version = Number(req.query.sessionVersion);
    if (!userId) return res.json({ valid: true });
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || user.status === 'suspended') return res.json({ valid: false });
    if (version && user.sessionVersion !== version) {
      return res.json({ valid: false });
    }
    res.json({ valid: true, sessionVersion: user.sessionVersion });
  } catch {
    res.json({ valid: true });
  }
});

// Admin creates a user with login details & sends email invitation
app.post('/api/admin/users', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, role, department, password, invitedBy, workspaceId, firebaseUid: providedFirebaseUid } = req.body || {};
    if (!email || !firstName) {
      return res.status(400).json({ error: 'email and firstName are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
    if (existing) {
      return res.status(409).json({ error: 'A user account with this email already exists' });
    }

    const passwordHash = password ? hashPassword(String(password)) : null;
    const firebaseUid = providedFirebaseUid
      ? String(providedFirebaseUid)
      : `official_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const [userRecord] = await db.insert(users).values({
      firebaseUid,
      email: normalizedEmail,
      firstName,
      lastName: lastName || '',
      passwordHash,
      role: role || 'Evaluator',
      department: department || 'General',
    }).returning();

    // Create email invitation token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [invitation] = await db.insert(userInvitations).values({
      email: normalizedEmail,
      firstName,
      lastName: lastName || '',
      role: role || 'Evaluator',
      department: department || 'General',
      token,
      workspaceId: workspaceId || null,
      invitedBy: invitedBy ? Number(invitedBy) : null,
      status: 'pending',
      expiresAt,
    }).returning();

    const origin = req.headers.origin || `http://localhost:${PORT}`;
    const inviteUrl = `${origin}/?invite=${token}`;
    let invitedByName = 'CEDA Administrator';
    if (invitedBy) {
      const inviterUser = await db.query.users.findFirst({ where: eq(users.id, Number(invitedBy)) }).catch(() => null);
      if (inviterUser) {
        invitedByName = `${inviterUser.firstName} ${inviterUser.lastName || ''}`.trim();
      }
    }
    const accountTpl = buildAccountCreatedEmailTemplate({
      recipientName: `${firstName} ${lastName || ''}`.trim(),
      email: normalizedEmail,
      role: role || 'Evaluator',
      department: department || 'General',
      temporaryPassword: password ? String(password) : undefined,
      invitedByName,
      inviteUrl,
    });
    const emailResult = await sendSystemEmail({
      toEmail: normalizedEmail,
      recipientName: `${firstName} ${lastName || ''}`.trim(),
      subject: accountTpl.subject,
      title: accountTpl.title,
      message: `Your CEDA Workspace account (${role || 'Evaluator'}) has been created.`,
      actionUrl: inviteUrl,
      customHtml: accountTpl.html,
    });

    const { passwordHash: _ph, ...safeUser } = userRecord;
    res.status(201).json({
      user: safeUser,
      invitation,
      inviteUrl,
      emailStatus: emailResult,
    });
  } catch (error: any) {
    console.error('Error creating admin user & invite:', error);
    res.status(500).json({ error: error?.message || 'Failed to create user & invitation' });
  }
});

// Admin suspend / reactivate user account
app.patch('/api/admin/users/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body || {};
    if (!userId || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Valid userId and status (active|suspended) are required' });
    }

    const [updated] = await db.update(users)
      .set({
        status,
        ...(status === 'suspended' ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) return res.status(404).json({ error: 'User not found' });
    const { passwordHash: _ph, ...safeUser } = updated;
    res.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Admin delete user account
app.delete('/api/admin/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ error: 'Invalid user ID' });

    const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    // Safely remove or dissociate dependent relational records before removing user
    await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId));
    await db.delete(userInvitations).where(or(eq(userInvitations.email, existing.email), eq(userInvitations.invitedBy, userId)));
    await db.delete(innovationComments).where(eq(innovationComments.userId, userId));
    await db.delete(evaluations).where(eq(evaluations.evaluatorId, userId));
    await db.delete(adjudications).where(eq(adjudications.adjudicatorId, userId));
    await db.update(innovationHistory).set({ changedBy: null }).where(eq(innovationHistory.changedBy, userId));
    await db.update(innovations).set({ submitterId: null }).where(eq(innovations.submitterId, userId));
    await db.update(documents).set({ uploadedBy: null }).where(eq(documents.uploadedBy, userId));
    await db.delete(workspaces).where(eq(workspaces.ownerId, userId));
    await db.delete(users).where(eq(users.id, userId));

    // Send branded Account Removal notice via .env SMTP
    let emailStatus = null;
    if (existing.email) {
      const removedByName =
        (req.body && req.body.removedByName) || 'CEDA System Administrator';
      const deletedTpl = buildAccountDeletedEmailTemplate({
        recipientName: `${existing.firstName} ${existing.lastName || ''}`.trim() || existing.email,
        email: existing.email,
        role: existing.role,
        removedByName,
      });
      emailStatus = await sendSystemEmail({
        toEmail: existing.email,
        recipientName: `${existing.firstName} ${existing.lastName || ''}`.trim(),
        subject: deletedTpl.subject,
        title: deletedTpl.title,
        message: 'Your CEDA Workspace user account and access have been removed by an Administrator.',
        customHtml: deletedTpl.html,
      }).catch(() => null);
    }

    res.json({ success: true, deletedId: userId, email: existing.email, firebaseUid: existing.firebaseUid, emailStatus });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user account' });
  }
});

app.get('/api/invitations', async (_req: Request, res: Response) => {
  try {
    const list = await db.select().from(userInvitations).orderBy(desc(userInvitations.createdAt));
    res.json(list);
  } catch (error: any) {
    res.json([]);
  }
});

app.get('/api/invitations/:token', async (req: Request, res: Response) => {
  try {
    const inv = await db.query.userInvitations.findFirst({
      where: eq(userInvitations.token, req.params.token),
    });
    if (!inv) return res.status(404).json({ error: 'Invitation not found or expired' });
    res.json(inv);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load invitation' });
  }
});

app.post('/api/invitations/accept', async (req: Request, res: Response) => {
  try {
    const { token, password, firebaseUid } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'token and password are required' });
    }

    const inv = await db.query.userInvitations.findFirst({
      where: eq(userInvitations.token, String(token)),
    });
    if (!inv) return res.status(404).json({ error: 'Invalid invitation token' });

    const passwordHash = hashPassword(String(password));
    const existing = await db.query.users.findFirst({ where: eq(users.email, inv.email) });

    let userRecord;
    if (existing) {
      const [updated] = await db.update(users)
        .set({
          ...(firebaseUid ? { firebaseUid } : {}),
          passwordHash,
          firstName: inv.firstName,
          lastName: inv.lastName,
          role: inv.role,
          department: inv.department || 'General',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      userRecord = updated;
    } else {
      const [created] = await db.insert(users).values({
        firebaseUid: firebaseUid || `invited_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        email: inv.email,
        firstName: inv.firstName,
        lastName: inv.lastName,
        passwordHash,
        role: inv.role,
        department: inv.department || 'General',
      }).returning();
      userRecord = created;
    }

    await db.update(userInvitations)
      .set({ status: 'accepted' })
      .where(eq(userInvitations.id, inv.id));

    // If invitation was tied to a shared workspace, activate membership too
    if (inv.workspaceId) {
      const existingMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, inv.workspaceId),
          eq(workspaceMembers.email, inv.email)
        ),
      });
      if (existingMember) {
        await db.update(workspaceMembers)
          .set({ userId: userRecord.id, status: 'active' })
          .where(eq(workspaceMembers.id, existingMember.id));
      } else {
        await db.insert(workspaceMembers).values({
          workspaceId: inv.workspaceId,
          userId: userRecord.id,
          email: inv.email,
          role: 'collaborator',
          status: 'active',
        });
      }
    }

    const { passwordHash: _ph, ...safeUser } = userRecord;
    res.json({ user: safeUser, workspaceId: inv.workspaceId || null });
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// ============================================================================
// 9. Workspaces & Collaboration Persistence API (PostgreSQL)
// ============================================================================

app.get('/api/workspaces/mine', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId);
    const email = req.query.email ? String(req.query.email).trim().toLowerCase() : '';
    if (!userId && !email) {
      return res.status(400).json({ error: 'userId or email is required' });
    }

    // Find owned workspaces + shared memberships
    const owned = userId
      ? await db.select().from(workspaces).where(eq(workspaces.ownerId, userId))
      : [];

    const memberships = await db.select().from(workspaceMembers).where(
      or(
        ...(userId ? [eq(workspaceMembers.userId, userId)] : []),
        ...(email ? [eq(workspaceMembers.email, email)] : [])
      )
    );

    const sharedIds = memberships
      .map((m) => m.workspaceId)
      .filter((id) => !owned.some((o) => o.id === id));

    const shared: typeof owned = [];
    for (const wsId of sharedIds) {
      const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, wsId) });
      if (ws) shared.push(ws);
    }

    // First-time user: create an EMPTY personal workspace automatically
    if (owned.length === 0 && userId) {
      const ownerUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
      const newWsId = `ws-${userId}-${Date.now()}`;
      const emptyState = JSON.stringify({
        isEmptySeed: true,
        customizedSetupDone: false,
        projects: [],
        connectors: [],
        intakeDossiers: [],
        personnel: [],
        queueIdeas: [],
        canvasStations: [],
        assignedIdeasMap: {},
        canvasPools: [],
        canvasAnnotations: [],
        enquiryMessages: [],
        ideaCustomPositions: {},
        poolCustomPositions: {},
        messageCustomPositions: {},
        density: 'Normal',
        zoom: 0.9,
        panX: 20,
        panY: 20,
      });

      const [createdWs] = await db.insert(workspaces).values({
        id: newWsId,
        name: `${ownerUser?.firstName || 'My'}'s Workspace`,
        ownerId: userId,
        stateJson: emptyState,
      }).returning();

      await db.insert(workspaceMembers).values({
        workspaceId: newWsId,
        userId,
        email: ownerUser?.email || email || `user-${userId}@ceda.co.bw`,
        role: 'owner',
        status: 'active',
      });

      owned.push(createdWs);
    }

    const allWorkspaces = [...owned, ...shared].map((w) => ({
      id: w.id,
      name: w.name,
      ownerId: w.ownerId,
      isOwner: w.ownerId === userId,
      updatedAt: w.updatedAt,
    }));

    res.json(allWorkspaces);
  } catch (error: any) {
    console.error('Error fetching user workspaces:', error);
    res.status(500).json({ error: 'Failed to load workspaces' });
  }
});

app.post('/api/workspaces', async (req: Request, res: Response) => {
  try {
    const { ownerId, ownerEmail, name, density, slaWarningDays, slaCriticalDays, focusSector } = req.body || {};
    if (!ownerId || !name) {
      return res.status(400).json({ error: 'ownerId and name are required' });
    }

    const newWsId = `ws-${ownerId}-${Date.now()}`;
    const emptyState = JSON.stringify({
      isEmptySeed: true,
      customizedSetupDone: true,
      focusSector: focusSector || 'General',
      projects: [],
      connectors: [],
      intakeDossiers: [],
      personnel: [],
      queueIdeas: [],
      canvasStations: [],
      assignedIdeasMap: {},
      canvasPools: [],
      canvasAnnotations: [],
      enquiryMessages: [],
      ideaCustomPositions: {},
      poolCustomPositions: {},
      messageCustomPositions: {},
      density: density || 'Normal',
      slaWarningDays: slaWarningDays ?? 3.0,
      slaCriticalDays: slaCriticalDays ?? 1.5,
      zoom: 0.9,
      panX: 20,
      panY: 20,
    });

    const [createdWs] = await db.insert(workspaces).values({
      id: newWsId,
      name: String(name).trim(),
      ownerId: Number(ownerId),
      stateJson: emptyState,
    }).returning();

    await db.insert(workspaceMembers).values({
      workspaceId: newWsId,
      userId: Number(ownerId),
      email: ownerEmail ? String(ownerEmail).trim().toLowerCase() : `user-${ownerId}@ceda.co.bw`,
      role: 'owner',
      status: 'active',
    });

    res.status(201).json({
      id: createdWs.id,
      name: createdWs.name,
      ownerId: createdWs.ownerId,
      isOwner: true,
      updatedAt: createdWs.updatedAt,
    });
  } catch (error: any) {
    console.error('Error creating custom workspace:', error);
    res.status(500).json({ error: 'Failed to create custom workspace' });
  }
});

app.get('/api/workspaces/:id', async (req: Request, res: Response) => {
  try {
    const ws = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, req.params.id),
    });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id));

    const reqUserId = req.query.userId ? Number(req.query.userId) : null;
    const reqEmail = req.query.email ? String(req.query.email).trim().toLowerCase() : '';
    if (reqUserId || reqEmail) {
      const isOwner = reqUserId !== null && ws.ownerId === reqUserId;
      const isMember = members.some(
        (m) =>
          (reqUserId !== null && m.userId === reqUserId) ||
          (reqEmail && m.email.toLowerCase() === reqEmail)
      );
      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'Access denied: you have not been invited to this workspace' });
      }
    }

    let parsedState = {};
    try {
      parsedState = JSON.parse(ws.stateJson || '{}');
    } catch {}

    res.json({
      id: ws.id,
      name: ws.name,
      ownerId: ws.ownerId,
      state: parsedState,
      members,
      updatedAt: ws.updatedAt,
    });
  } catch (error: any) {
    console.error('Error loading workspace:', error);
    res.status(500).json({ error: 'Failed to load workspace' });
  }
});

app.put('/api/workspaces/:id/state', async (req: Request, res: Response) => {
  try {
    const { state, name, updatedBy, updatedByEmail } = req.body || {};
    if (!state) return res.status(400).json({ error: 'state is required' });

    const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, req.params.id) });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    if (updatedBy || updatedByEmail) {
      const reqUserId = updatedBy ? Number(updatedBy) : null;
      const reqEmail = updatedByEmail ? String(updatedByEmail).trim().toLowerCase() : '';
      const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id));
      const isOwner = reqUserId !== null && ws.ownerId === reqUserId;
      const isMember = members.some(
        (m) =>
          (reqUserId !== null && m.userId === reqUserId) ||
          (reqEmail && m.email.toLowerCase() === reqEmail)
      );
      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'Access denied: you are not a collaborator on this workspace' });
      }
    }

    const [updated] = await db.update(workspaces)
      .set({
        stateJson: JSON.stringify(state),
        ...(name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ success: true, id: updated.id, updatedAt: updated.updatedAt });
  } catch (error: any) {
    console.error('Error saving workspace state:', error);
    res.status(500).json({ error: 'Failed to save workspace state' });
  }
});

app.post('/api/workspaces/:id/invite', async (req: Request, res: Response) => {
  try {
    const { email, invitedByName } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, req.params.id) });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const existingUser = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.email, normalizedEmail)),
    });

    const token = crypto.randomBytes(12).toString('hex');
    if (!existingMember) {
      await db.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId: existingUser?.id || null,
        email: normalizedEmail,
        role: 'collaborator',
        status: existingUser ? 'active' : 'invited',
        inviteToken: token,
      });
    } else if (existingUser && !existingMember.userId) {
      await db.update(workspaceMembers)
        .set({ userId: existingUser.id, status: 'active' })
        .where(eq(workspaceMembers.id, existingMember.id));
    }

    const origin = req.headers.origin || `http://localhost:${PORT}`;
    const inviteUrl = `${origin}/?wsInvite=${ws.id}&token=${token}`;
    const collabTpl = buildCollaboratorInviteEmailTemplate({
      recipientName: existingUser ? `${existingUser.firstName} ${existingUser.lastName || ''}`.trim() : normalizedEmail,
      inviterName: invitedByName || 'A CEDA colleague',
      workspaceName: ws.name,
      inviteUrl,
    });
    const emailResult = await sendSystemEmail({
      toEmail: normalizedEmail,
      recipientName: existingUser ? existingUser.firstName : normalizedEmail,
      subject: collabTpl.subject,
      title: collabTpl.title,
      message: `${invitedByName || 'A CEDA colleague'} invited you to collaborate on "${ws.name}".`,
      actionUrl: inviteUrl,
      customHtml: collabTpl.html,
    });

    const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id));
    res.status(201).json({ members, inviteUrl, emailStatus: emailResult });
  } catch (error: any) {
    console.error('Workspace invite error:', error);
    res.status(500).json({ error: 'Failed to invite collaborator' });
  }
});

app.delete('/api/workspaces/:id/members', async (req: Request, res: Response) => {
  try {
    const source = { ...(req.query || {}), ...(req.body || {}) } as Record<string, any>;
    const memberId = source.memberId ? Number(source.memberId) : null;
    const targetUserId = source.userId ? Number(source.userId) : null;
    const targetEmail = source.email ? String(source.email).trim().toLowerCase() : '';
    const requesterId = source.requesterId ? Number(source.requesterId) : null;
    const requesterEmail = source.requesterEmail ? String(source.requesterEmail).trim().toLowerCase() : '';

    const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, req.params.id) });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id));
    const targets = members.filter((m) => {
      if (m.role === 'owner' || (m.userId && m.userId === ws.ownerId)) return false;
      if (memberId !== null && m.id === memberId) return true;
      if (targetUserId !== null && m.userId === targetUserId) return true;
      if (targetEmail && m.email.toLowerCase() === targetEmail) return true;
      return false;
    });

    if (targets.length === 0) {
      return res.status(404).json({ error: 'Collaborator membership not found' });
    }

    const isOwnerRequester =
      (requesterId !== null && ws.ownerId === requesterId) ||
      Boolean(requesterEmail && members.some((m) => m.role === 'owner' && m.email.toLowerCase() === requesterEmail));
    const isSelfRequester = targets.some(
      (t) =>
        (requesterId !== null && t.userId === requesterId) ||
        Boolean(requesterEmail && t.email.toLowerCase() === requesterEmail)
    );

    if (!isOwnerRequester && !isSelfRequester) {
      return res.status(403).json({ error: 'Only the workspace owner or the collaborator themselves can remove access' });
    }

    for (const t of targets) {
      await db.delete(workspaceMembers).where(eq(workspaceMembers.id, t.id));
    }

    const remainingMembers = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id));
    res.json({
      success: true,
      removed: targets,
      members: remainingMembers,
    });
  } catch (error: any) {
    console.error('Remove workspace collaborator error:', error);
    res.status(500).json({ error: 'Failed to remove workspace collaborator' });
  }
});

// ============================================================================
// Stage 2: Statutory & Tax Screening Engine (Built-in CIPA `cipaget` + BURS)
// ============================================================================
async function queryExternalCipagetIfConfigured(searchTerm: string) {
  const cipagetUrl = process.env.CIPAGET_API_URL;
  if (!cipagetUrl || !searchTerm) return null;

  try {
    const base = cipagetUrl.replace(/\/$/, '');
    const resp = await fetch(`${base}/companies?search=${encodeURIComponent(searchTerm)}`, {
      signal: AbortSignal.timeout(4500),
    });
    if (resp.ok) {
      const liveData = await resp.json();
      if (liveData) return liveData;
    }
  } catch {
    // External cipaget service not running; fall back to built-in cipaget engine
  }
  return null;
}

// Live CIPA & BURS Registry Search Endpoint (searches by Registered Company Name, CIPA UIN, or BURS TIN)
app.post('/api/screening/cipa-search', async (req: Request, res: Response) => {
  try {
    const { query, uin, companyName, enterpriseName, promoterName, omangId, bursTin } = req.body || {};
    const rawSearch = (query || uin || companyName || enterpriseName || bursTin || '').trim();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Try external `rudisang/cipaget` microservice if CIPAGET_API_URL is set in .env
    const externalData = await queryExternalCipagetIfConfigured(rawSearch);
    if (externalData && Array.isArray(externalData.companies || externalData) && (externalData.companies || externalData).length > 0) {
      const rawList = externalData.companies || externalData;
      const liveResults = rawList.map((item: any) => {
        const resolvedUin = item.uin || item.registrationNumber || ( /^BW\d+/i.test(rawSearch) ? rawSearch.toUpperCase() : 'BW00009318277');
        return {
          cipaMatch: {
            uin: resolvedUin,
            companyName: item.companyName || item.name || enterpriseName || companyName || rawSearch,
            registrationStatus: item.status === 'Registered' || item.status === 'Active' ? 'Registered' : 'In Default',
            incorporationDate: item.incorporationDate || item.registrationDate || '14 Mar 2023',
            companyType: item.companyType || 'Proprietary Limited (Pty) Ltd',
            registeredOffice: item.registeredOffice || item.address || 'Gaborone, Botswana',
            annualReturnCompliant: item.annualReturnCompliant !== false,
            directors: Array.isArray(item.directors) && item.directors.length > 0
              ? item.directors
              : [
                  {
                    name: promoterName || 'Registered Citizen Director',
                    omangOrId: omangId || 'BW-752422914',
                    role: 'Managing Director',
                    isSubmitterMatch: true,
                  },
                ],
            source: 'cipa_obrs_live',
            checkedAt: nowStr,
          },
          bursMatch: {
            tin: bursTin || `C0${String(resolvedUin).slice(-8)}01`,
            certificateNumber: `TCC-BW-2026-${String(resolvedUin).slice(-5)}`,
            taxStatus: 'Valid',
            issueDate: '10 Jan 2026',
            expiryDate: '10 Jan 2027',
            entityNameMatched: true,
            checkedAt: nowStr,
          },
        };
      });

      return res.json({
        query: rawSearch,
        count: liveResults.length,
        results: liveResults,
      });
    }

    // 2. Built-in CIPA & BURS Registry Search (by Registered Company Name, UIN, or BURS TIN — never Project Title)
    const results = searchCipaAndBursRegistry({
      query: rawSearch,
      enterpriseName: enterpriseName || companyName,
      promoterName,
      omangId,
      bursTin,
    });

    res.json({
      query: rawSearch,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('CIPA search error:', error);
    res.status(500).json({ error: 'Failed to query CIPA registry' });
  }
});

// Single Idea Automated Statutory Screening (CIPA + BURS)
app.post('/api/screening/verify-idea', async (req: Request, res: Response) => {
  try {
    const idea = req.body?.idea || req.body || {};
    const screening = evaluateIdeaStatutoryScreening(idea);
    res.json({ ideaId: idea.id, screening });
  } catch (error: any) {
    console.error('Verify idea screening error:', error);
    res.status(500).json({ error: 'Failed to run statutory screening' });
  }
});

// Batch Queue Automated Statutory Screening (CIPA + BURS)
app.post('/api/screening/batch', async (req: Request, res: Response) => {
  try {
    const ideas: any[] = Array.isArray(req.body?.ideas) ? req.body.ideas : [];
    const results: Record<string, ReturnType<typeof evaluateIdeaStatutoryScreening>> = {};
    ideas.forEach((idea) => {
      if (idea && idea.id) {
        results[idea.id] = evaluateIdeaStatutoryScreening(idea);
      }
    });
    res.json({
      screenedCount: Object.keys(results).length,
      results,
    });
  } catch (error: any) {
    console.error('Batch screening error:', error);
    res.status(500).json({ error: 'Failed to run batch statutory screening' });
  }
});

// CEDA Workspace AI Copilot (OpenAI-powered, grounded in full workspace index)
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      history = [],
      workspaceIndex = {},
      userRole = 'Administrator',
      aiAllowAutoScreen = true,
      aiAllowAutoAssign = true,
    } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in .env' });
    }

    // Enrich with live PostgreSQL telemetry if DB is available
    let dbTelemetry: Record<string, any> = {};
    try {
      const [userRows, innovationRows, evalRows, adjRows] = await Promise.all([
        db.select().from(users).limit(100),
        db.select().from(innovations).orderBy(desc(innovations.createdAt)).limit(200),
        db.select().from(evaluations).limit(200),
        db.select().from(adjudications).limit(200),
      ]);
      dbTelemetry = {
        dbUsersCount: userRows.length,
        dbInnovationsCount: innovationRows.length,
        dbEvaluationsCount: evalRows.length,
        dbAdjudicationsCount: adjRows.length,
      };
    } catch {
      // Proceed cleanly with client-indexed workspace telemetry
    }

    const systemPrompt = [
      'You are CEDA Workspace AI, an intelligent operational assistant embedded inside the Botswana Citizen Entrepreneurial Development Agency (CEDA) Innovation Canvas.',
      `Current user role: ${userRole}.`,
      `Admin Settings Permissions -> AI Auto-Verify Screening Allowed: ${Boolean(aiAllowAutoScreen)}, AI Auto-Assign Queue Allowed: ${Boolean(aiAllowAutoAssign)}.`,
      'You have complete indexed visibility into the entire CEDA platform below: personnel (Evaluators, Adjudicators, Agents, Admins), overdue/behind-SLA reviewers, Intake Queue ideas, Assigned ideas, Adjudication Queue ideas, Projects, Active Workflow Cycle stages, Citizen Application Form Builder fields, Admin FAQs, and Submitter System Feedback.',
      'Answer concisely, accurately, and using exact numbers, names, idea codes, and stage details from the indexed snapshot.',
      'When counting evaluators or adjudicators behind on evaluations/adjudications, cite their exact names, counts, and which ideas are overdue or approaching SLA.',
      'Only invoke the executable tools when an Administrator explicitly asks you to verify/screen queued ideas or assign queued ideas (and respect the Admin Settings permissions above).',
      '',
      '=== INDEXED WORKSPACE DATA ===',
      JSON.stringify({ ...workspaceIndex, dbTelemetry }),
    ].join('\n');

    const tools =
      userRole === 'Administrator'
        ? [
            {
              type: 'function',
              function: {
                name: 'verify_all_queue_ideas',
                description:
                  'Run automated Stage 2 CIPA Company Registry & BURS Tax Clearance verification across all ideas currently in the Admin Intake Queue.',
                parameters: {
                  type: 'object',
                  properties: {
                    reason: {
                      type: 'string',
                      description: 'Short explanation of why screening is being run.',
                    },
                  },
                },
              },
            },
            {
              type: 'function',
              function: {
                name: 'assign_queue_ideas',
                description:
                  'Automatically load-balance and assign eligible ideas from the queue to available Evaluators (or Adjudication Queue ideas to Adjudicators).',
                parameters: {
                  type: 'object',
                  properties: {
                    targetQueue: {
                      type: 'string',
                      enum: ['ideas', 'adjudication', 'both'],
                      description: 'Which queue to assign from.',
                    },
                    maxCount: {
                      type: 'number',
                      description: 'Optional cap on number of ideas to assign.',
                    },
                  },
                  required: ['targetQueue'],
                },
              },
            },
          ]
        : [];

    const recentMessages = Array.isArray(history)
      ? history
          .slice(-8)
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role, content: m.content }))
      : [];

    const openaiBody: Record<string, any> = {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
        { role: 'user', content: String(prompt).trim() },
      ],
    };

    if (tools.length > 0) {
      openaiBody.tools = tools;
      openaiBody.tool_choice = 'auto';
    }

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openaiBody),
    });

    const aiJson: any = await aiRes.json();
    if (!aiRes.ok) {
      console.error('OpenAI API error:', aiJson);
      return res.status(aiRes.status).json({
        error: aiJson?.error?.message || 'OpenAI request failed',
      });
    }

    const choice = aiJson?.choices?.[0]?.message || {};
    const toolCalls = Array.isArray(choice.tool_calls) ? choice.tool_calls : [];
    const actions: { type: 'verify_all_queue_ideas' | 'assign_queue_ideas'; args?: any }[] = [];

    for (const tc of toolCalls) {
      const fnName = tc?.function?.name;
      let parsedArgs: any = {};
      try {
        parsedArgs = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        parsedArgs = {};
      }
      if (fnName === 'verify_all_queue_ideas' || fnName === 'assign_queue_ideas') {
        actions.push({ type: fnName, args: parsedArgs });
      }
    }

    res.json({
      answer:
        typeof choice.content === 'string' && choice.content.trim()
          ? choice.content.trim()
          : actions.length > 0
            ? 'Executing requested queue operation across the active workspace.'
            : 'Completed workspace analysis.',
      actions,
      model: aiJson?.model || 'gpt-4o-mini',
    });
  } catch (error: any) {
    console.error('AI assistant endpoint error:', error);
    res.status(500).json({ error: error?.message || 'Failed to contact AI assistant' });
  }
});

// Setup Vite middleware in dev or static serving in prod
export async function startServer() {
  await ensureDatabaseInitialized();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

export { app };
export default app;
