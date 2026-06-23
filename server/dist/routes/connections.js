"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Send connection request
router.post('/request', auth_1.requireAuth, async (req, res) => {
    try {
        const requesterId = req.user.id;
        const { recipientId } = req.body;
        if (requesterId === recipientId) {
            return res.status(400).json({ error: 'Cannot connect with yourself' });
        }
        const { data, error } = await db_1.supabase
            .from('connections')
            .insert([{ requester_id: requesterId, recipient_id: recipientId }])
            .select()
            .single();
        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Connection already exists' });
            }
            throw error;
        }
        // Fetch requester info to send along with real-time socket event
        const { data: requester } = await db_1.supabase
            .from('users')
            .select('id, names, country, profiles(images)')
            .eq('id', requesterId)
            .single();
        const requesterProfile = Array.isArray(requester?.profiles) ? requester.profiles[0] : requester?.profiles;
        // Emit Socket.io event for real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${recipientId}`).emit('new_connection_request', {
                id: data.id,
                requester: {
                    id: requester?.id,
                    names: requester?.names,
                    country: requester?.country,
                    profile_picture: requesterProfile?.images?.[0] || null
                }
            });
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Connection request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Respond to connection request
router.put('/:id/respond', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const connectionId = req.params.id;
        const { status } = req.body; // 'accepted' or 'rejected'
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        // Verify user is recipient
        const { data: connection } = await db_1.supabase
            .from('connections')
            .select('*')
            .eq('id', connectionId)
            .single();
        if (!connection || connection.recipient_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { data, error } = await db_1.supabase
            .from('connections')
            .update({ status })
            .eq('id', connectionId)
            .select()
            .single();
        if (error)
            throw error;
        // Fetch responder (recipient) info
        const { data: recipient } = await db_1.supabase
            .from('users')
            .select('id, names')
            .eq('id', userId)
            .single();
        // Emit Socket.io event to requester if accepted
        const io = req.app.get('io');
        if (io && status === 'accepted') {
            io.to(`user_${connection.requester_id}`).emit('connection_accepted', {
                id: connectionId,
                recipient: {
                    id: recipient?.id,
                    names: recipient?.names
                }
            });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Connection response error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get pending connections (incoming)
router.get('/pending', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await db_1.supabase
            .from('connections')
            .select(`
        id, 
        created_at, 
        requester:users!requester_id(
          id, 
          names, 
          country,
          profiles(images)
        )
      `)
            .eq('recipient_id', userId)
            .eq('status', 'pending');
        if (error)
            throw error;
        // Format response to resolve profile picture structure cleanly
        const formattedData = data.map((d) => {
            const reqProfile = Array.isArray(d.requester?.profiles) ? d.requester.profiles[0] : d.requester?.profiles;
            return {
                id: d.id,
                created_at: d.created_at,
                requester: {
                    id: d.requester.id,
                    names: d.requester.names,
                    country: d.requester.country,
                    profile_picture: reqProfile?.images?.[0] || null
                }
            };
        });
        res.json(formattedData);
    }
    catch (error) {
        console.error('Fetch pending connections error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
