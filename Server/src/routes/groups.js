import express from 'express';
import { db } from '../db/index.js';
import { groups, groupMemberships, users } from '../db/schema.js';
import { eq, inArray, and } from 'drizzle-orm';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all groups the logged-in user belongs to
router.get('/', verifyToken, async (req, res) => {
  try {
    // 1. Find all memberships for this user
    const userMems = await db
      .select({
        groupId: groupMemberships.groupId,
        groupName: groups.name,
        groupCreatedAt: groups.createdAt
      })
      .from(groupMemberships)
      .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
      .where(eq(groupMemberships.userId, req.user.id));

    if (userMems.length === 0) {
      return res.json([]);
    }

    const groupIds = userMems.map(m => m.groupId);

    // 2. Fetch all memberships for these groups in a single query
    const allMems = await db
      .select({
        groupId: groupMemberships.groupId,
        userId: groupMemberships.userId,
        username: users.username,
        joinedAt: groupMemberships.joinedAt,
        leftAt: groupMemberships.leftAt
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(inArray(groupMemberships.groupId, groupIds));

    // 3. Construct response
    const response = userMems.map(g => {
      const memberships = allMems.filter(m => m.groupId === g.groupId);
      return {
        id: g.groupId,
        name: g.groupName,
        createdAt: g.groupCreatedAt,
        memberships: memberships.map(mem => ({
          userId: mem.userId,
          username: mem.username,
          joinedAt: mem.joinedAt,
          leftAt: mem.leftAt
        }))
      };
    });

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error listing groups' });
  }
});

// Create a new group
router.post('/', verifyToken, async (req, res) => {
  const { name, members } = req.body; // members is optional array of { userId, joinedAt }
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Group name is required' });
  }

  try {
    const newGroup = await db.transaction(async (tx) => {
      const [g] = await tx
        .insert(groups)
        .values({ name: name.trim() })
        .returning();

      // Always add the creator
      await tx.insert(groupMemberships).values({
        groupId: g.id,
        userId: req.user.id,
        joinedAt: new Date()
      });

      // Add other selected members
      if (members && Array.isArray(members)) {
        for (const m of members) {
          if (m.userId === req.user.id) continue; // creator already added
          
          await tx.insert(groupMemberships).values({
            groupId: g.id,
            userId: m.userId,
            joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date()
          });
        }
      }

      return g;
    });

    // Fetch full memberships details for the new group
    const mems = await db
      .select({
        userId: groupMemberships.userId,
        username: users.username,
        joinedAt: groupMemberships.joinedAt,
        leftAt: groupMemberships.leftAt
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, newGroup.id));

    res.status(201).json({
      id: newGroup.id,
      name: newGroup.name,
      createdAt: newGroup.createdAt,
      memberships: mems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating group' });
  }
});

// Get detailed timeline of single group
router.get('/:id', verifyToken, async (req, res) => {
  const groupId = parseInt(req.params.id);
  if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid Group ID' });

  try {
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) return res.status(404).json({ error: 'Group not found' });

    const mems = await db
      .select({
        userId: groupMemberships.userId,
        username: users.username,
        joinedAt: groupMemberships.joinedAt,
        leftAt: groupMemberships.leftAt
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, groupId));

    res.json({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      memberships: mems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving group timeline' });
  }
});

// Add member to group
router.post('/:id/members', verifyToken, async (req, res) => {
  const groupId = parseInt(req.params.id);
  const { userId, joinedAt } = req.body;

  if (isNaN(groupId) || !userId) {
    return res.status(400).json({ error: 'Group ID and User ID are required' });
  }

  try {
    // Check if membership already exists (active or inactive)
    const existing = await db
      .select()
      .from(groupMemberships)
      .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
      .limit(1);

    let resultMembership;

    if (existing.length > 0) {
      // Re-activate if they had left
      const [updated] = await db
        .update(groupMemberships)
        .set({
          joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
          leftAt: null
        })
        .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
        .returning();
      
      resultMembership = updated;
    } else {
      // Create new membership
      const [inserted] = await db
        .insert(groupMemberships)
        .values({
          groupId,
          userId,
          joinedAt: joinedAt ? new Date(joinedAt) : new Date()
        })
        .returning();

      resultMembership = inserted;
    }

    const [memberUser] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, resultMembership.userId))
      .limit(1);

    res.status(existing.length > 0 ? 200 : 201).json({
      groupId: resultMembership.groupId,
      userId: resultMembership.userId,
      username: memberUser.username,
      joinedAt: resultMembership.joinedAt,
      leftAt: resultMembership.leftAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding group member' });
  }
});

// Soft remove member (set leftAt date)
router.patch('/:id/members/:userId', verifyToken, async (req, res) => {
  const groupId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  const { leftAt } = req.body; // Must specify date when they left

  if (isNaN(groupId) || isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const [updated] = await db
      .update(groupMemberships)
      .set({
        leftAt: leftAt ? new Date(leftAt) : new Date()
      })
      .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
      .returning();

    const [memberUser] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, updated.userId))
      .limit(1);

    res.json({
      groupId: updated.groupId,
      userId: updated.userId,
      username: memberUser.username,
      joinedAt: updated.joinedAt,
      leftAt: updated.leftAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating membership timeline' });
  }
});

export default router;
